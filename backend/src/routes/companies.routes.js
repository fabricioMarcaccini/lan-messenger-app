import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/companies/:id - Get company details
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;

    const result = await db.write(
        'SELECT id, name, cnpj, logo_url, address, settings, created_at FROM companies WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Empresa não encontrada' };
        return;
    }

    ctx.body = {
        success: true,
        data: result.rows[0],
    };
});

// PUT /api/companies/:id - Update company (Admin only)
router.put('/:id', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;
    const { name, cnpj, logoUrl, address, settings } = ctx.request.body;

    const result = await db.write(
        `UPDATE companies 
         SET name = COALESCE($2, name),
             cnpj = COALESCE($3, cnpj),
             logo_url = COALESCE($4, logo_url),
             address = COALESCE($5, address),
             settings = COALESCE($6, settings),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, name, cnpj, logoUrl, address, settings]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Empresa não encontrada' };
        return;
    }

    ctx.body = {
        success: true,
        message: 'Empresa atualizada com sucesso',
        data: result.rows[0],
    };
});

// GET /api/companies/:id/stats - Get company statistics
router.get('/:id/stats', async (ctx) => {
    const { id } = ctx.params;

    const [usersCount, activeCount, messagesCount, devicesCount] = await Promise.all([
        db.write('SELECT COUNT(*) as count FROM users WHERE company_id = $1', [id]),
        db.write('SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true', [id]),
        db.write(`SELECT COUNT(*) as count FROM messages m 
                  JOIN users u ON m.sender_id = u.id 
                  WHERE u.company_id = $1 AND m.created_at > NOW() - INTERVAL '24 hours'`, [id]),
        db.write('SELECT COUNT(*) as count FROM network_devices WHERE company_id = $1', [id]),
    ]);

    ctx.body = {
        success: true,
        data: {
            totalUsers: parseInt(usersCount.rows[0].count),
            activeUsers: parseInt(activeCount.rows[0].count),
            messagesToday: parseInt(messagesCount.rows[0].count),
            networkDevices: parseInt(devicesCount.rows[0].count),
        },
    };
});

export default router;
