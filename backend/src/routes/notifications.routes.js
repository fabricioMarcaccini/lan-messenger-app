import Router from 'koa-router';
import webpush from 'web-push';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

// Configuração do Web Push
// Use variáveis de ambiente (VAPID) ou defina padrões apenas para fallback local. NUNCA DEIXE HARDCODED em prod.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BLkf_FNjSLRruda3LP7wuX_tOqcVg0QVX2s9RqM0eEsyc7vsalFwwLiT_T1m-4MlRXgWxUfrFY525SMvxSKirQA';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '9xL-5qQcpz7eiBbnc1R7VC5Knj4U1oG4VrH0_BLciiU';

webpush.setVapidDetails(
    'mailto:contato@lanly.com.br',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

// Helper para enviar a notificação (vamos importar nos controllers no futuro ou usar internamente aqui)
export const sendPushNotification = async (userId, payload) => {
    try {
        const subs = await db.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);

        const promises = subs.rows.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    auth: sub.auth_key,
                    p256dh: sub.p256dh_key
                }
            };

            try {
                await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    // Endpoint não é mais válido (usuário revogou a permissão no browser).
                    console.log(`🧹 Removendo push subscription antiga/inválida: ${sub.id}`);
                    await db.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
                } else {
                    console.error('❌ Erro enviando push individual:', err);
                }
            }
        });

        await Promise.all(promises);
    } catch (err) {
        console.error('Erro global enviando Web Push:', err);
    }
};

// GET /api/notifications/vapid-key - O Frontend chama essa rota para recuperar a chave PÚBLICA e montar o subscribe
router.get('/vapid-key', authMiddleware, async (ctx) => {
    ctx.body = {
        success: true,
        data: { publicKey: VAPID_PUBLIC_KEY }
    };
});

// POST /api/notifications/subscribe - Salvar a PushSubscription do Browser do Cliente 
router.post('/subscribe', authMiddleware, async (ctx) => {
    const { subscription } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Objeto de inscrição inválido' };
        return;
    }

    try {
        // Upsert no DB: Baseado no endpoint que é único.
        await db.query(`
            INSERT INTO push_subscriptions (user_id, endpoint, auth_key, p256dh_key) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (endpoint) 
            DO UPDATE SET 
                user_id = EXCLUDED.user_id,
                auth_key = EXCLUDED.auth_key,
                p256dh_key = EXCLUDED.p256dh_key,
                created_at = CURRENT_TIMESTAMP
        `, [
            userId,
            subscription.endpoint,
            subscription.keys.auth,
            subscription.keys.p256dh
        ]);

        // Disparar uma de teste/boa vindas apenas se o usuário quiser testar
        // await sendPushNotification(userId, { title: 'Notificações Ativadas!', body: 'Você receberá novas mensagens do Lanly aqui.', icon: '/lanly-logo.png' });

        ctx.status = 201;
        ctx.body = { success: true, message: 'Inscrição Push salva com sucesso' };
    } catch (err) {
        console.error('Falha ao salvar push_subscription:', err);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao assinar notificações push' };
    }
});

// DELETE /api/notifications/unsubscribe - Permite que o usuário desligue num browser específico ou apague todos
router.delete('/unsubscribe', authMiddleware, async (ctx) => {
    const { endpoint } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!endpoint) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Um endpoint é necessário' };
        return;
    }

    try {
        await db.query('DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2', [userId, endpoint]);
        ctx.body = { success: true };
    } catch (err) {
        console.error(err);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Falha ao remover inscrição' };
    }
});

// GET /api/notifications/status - Verifica se o usuário tem devices registrados
router.get('/status', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.id;
    try {
        const check = await db.query('SELECT COUNT(*) as count FROM push_subscriptions WHERE user_id = $1', [userId]);
        const activeDevices = parseInt(check.rows[0].count, 10);
        ctx.body = { success: true, data: { activeDevices } };
    } catch (err) {
        ctx.status = 500;
        ctx.body = { success: false };
    }
});

export default router;
