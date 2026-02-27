import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();
router.use(authMiddleware);

// Middleware: apenas admin
router.use(async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas administradores podem acessar logs de auditoria.' };
        return;
    }
    await next();
});

// Helper para inserir log de auditoria — pode ser chamado de outros arquivos
export async function insertAuditLog({ companyId, actorId, action, targetType, targetId, metadata = {} }) {
    try {
        await db.write(
            `INSERT INTO audit_logs (company_id, actor_id, action, target_type, target_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [companyId, actorId, action, targetType || null, targetId || null, JSON.stringify(metadata)]
        );
    } catch (e) {
        console.error('Audit log insert failed:', e.message);
    }
}

// GET /api/audit — listar logs com filtros
router.get('/', async (ctx) => {
    const companyId = ctx.state.user.companyId;
    const { actor, action, targetType, dateFrom, dateTo, limit = 50, offset = 0 } = ctx.query;

    let query = `
        SELECT al.id, al.actor_id, al.action, al.target_type, al.target_id,
               al.metadata, al.created_at,
               u.full_name as actor_name, u.username as actor_username, u.avatar_url as actor_avatar
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.actor_id
        WHERE al.company_id = $1
    `;
    const params = [companyId];
    let idx = 2;

    if (actor) { query += ` AND al.actor_id = $${idx++}`; params.push(actor); }
    if (action) { query += ` AND al.action ILIKE $${idx++}`; params.push(`%${action}%`); }
    if (targetType) { query += ` AND al.target_type = $${idx++}`; params.push(targetType); }
    if (dateFrom) { query += ` AND al.created_at >= $${idx++}`; params.push(dateFrom); }
    if (dateTo) { query += ` AND al.created_at <= $${idx++}`; params.push(dateTo); }

    query += ` ORDER BY al.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.write(query, params);

    const countResult = await db.write(
        'SELECT COUNT(*) as total FROM audit_logs WHERE company_id = $1',
        [companyId]
    );

    ctx.body = {
        success: true,
        data: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
    };
});

// GET /api/audit/export — exportar CSV
router.get('/export', async (ctx) => {
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT al.created_at, u.full_name as actor, u.username, al.action, al.target_type, al.target_id, al.metadata
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.actor_id
        WHERE al.company_id = $1
        ORDER BY al.created_at DESC
        LIMIT 5000
    `, [companyId]);

    const headers = ['Data/Hora', 'Ator', 'Username', 'Ação', 'Tipo Alvo', 'ID Alvo', 'Detalhes'];
    const rows = result.rows.map(r => [
        new Date(r.created_at).toLocaleString('pt-BR'),
        r.actor || 'Sistema',
        r.username || '-',
        r.action,
        r.target_type || '-',
        r.target_id || '-',
        JSON.stringify(r.metadata || {})
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');

    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="auditoria_${new Date().toISOString().slice(0, 10)}.csv"`);
    ctx.body = '\uFEFF' + csv; // BOM para Excel reconhecer UTF-8
});

export default router;
