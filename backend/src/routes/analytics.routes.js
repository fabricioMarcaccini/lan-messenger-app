import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();
router.use(authMiddleware);

// Middleware: apenas admin pode acessar analytics
router.use(async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas administradores podem acessar analytics.' };
        return;
    }
    await next();
});

// GET /api/analytics/overview — KPIs gerais da empresa
router.get('/overview', async (ctx) => {
    const companyId = ctx.state.user.companyId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMessages, activeUsersToday, totalUsers, totalConversations, totalCalls, newUsersThisMonth, peakUsage] = await Promise.all([
        db.write(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.company_id = $1 AND m.is_deleted = false
        `, [companyId]),
        db.write(`
            SELECT COUNT(DISTINCT m.sender_id) as count FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.company_id = $1 AND m.created_at >= $2
        `, [companyId, today]),
        db.write('SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true', [companyId]),
        db.write('SELECT COUNT(*) as count FROM conversations WHERE company_id = $1', [companyId]),
        db.write(`
            SELECT COUNT(*) as count FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.company_id = $1 AND m.content_type = 'call'
        `, [companyId]),
        db.write(`
            SELECT COUNT(*) as count FROM users
            WHERE company_id = $1 AND created_at >= date_trunc('month', NOW())
        `, [companyId]),
        db.write(`
            SELECT EXTRACT(HOUR FROM m.created_at) as hour, COUNT(*) as count
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE c.company_id = $1
              AND m.is_deleted = false
              AND m.created_at >= NOW() - INTERVAL '30 days'
            GROUP BY EXTRACT(HOUR FROM m.created_at)
            ORDER BY count DESC
            LIMIT 1
        `, [companyId])
    ]);

    const peakHour = peakUsage.rows[0]
        ? { hour: parseInt(peakUsage.rows[0].hour, 10), messages: parseInt(peakUsage.rows[0].count, 10) }
        : null;

    ctx.body = {
        success: true,
        data: {
            totalMessages: parseInt(totalMessages.rows[0].count),
            activeUsersToday: parseInt(activeUsersToday.rows[0].count),
            totalUsers: parseInt(totalUsers.rows[0].count),
            totalConversations: parseInt(totalConversations.rows[0].count),
            totalCalls: parseInt(totalCalls.rows[0].count),
            newUsersThisMonth: parseInt(newUsersThisMonth.rows[0].count),
            peakHour,
        }
    };
});

// GET /api/analytics/messages-over-time — mensagens por dia (últimos 30 dias)
router.get('/messages-over-time', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT DATE(m.created_at) as date, COUNT(*) as count
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.company_id = $1
          AND m.is_deleted = false
          AND m.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(m.created_at)
        ORDER BY date ASC
    `, [companyId]);

    ctx.body = { success: true, data: result.rows };
});

// GET /api/analytics/top-users — usuários mais ativos (top 10)
router.get('/top-users', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT u.id, u.full_name, u.username, u.avatar_url,
               COUNT(m.id) as message_count
        FROM users u
        LEFT JOIN messages m ON m.sender_id = u.id AND m.is_deleted = false
        WHERE u.company_id = $1 AND u.is_active = true
        GROUP BY u.id, u.full_name, u.username, u.avatar_url
        ORDER BY message_count DESC
        LIMIT 10
    `, [companyId]);

    ctx.body = { success: true, data: result.rows };
});

// GET /api/analytics/peak-hours — pico de uso por hora
router.get('/peak-hours', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT EXTRACT(HOUR FROM m.created_at) as hour, COUNT(*) as count
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.company_id = $1
          AND m.is_deleted = false
          AND m.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM m.created_at)
        ORDER BY hour ASC
    `, [companyId]);

    ctx.body = { success: true, data: result.rows };
});

// GET /api/analytics/conversations-stats — stats das conversas
router.get('/conversations-stats', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT
            COUNT(*) FILTER (WHERE is_group = false AND is_public = false) as direct_messages,
            COUNT(*) FILTER (WHERE is_group = true AND is_public = false) as groups,
            COUNT(*) FILTER (WHERE is_public = true) as channels
        FROM conversations
        WHERE company_id = $1
    `, [companyId]);

    ctx.body = { success: true, data: result.rows[0] };
});

export default router;
