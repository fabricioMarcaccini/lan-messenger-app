import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/companies/:id - Get company details
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. ID da empresa diferente da sua.' };
        return;
    }

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

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. ID da empresa diferente da sua.' };
        return;
    }
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

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. ID da empresa diferente da sua.' };
        return;
    }

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

// GET /api/companies/:id/ai-settings - Get company AI settings (Admin only)
router.get('/:id/ai-settings', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. ID da empresa diferente da sua.' };
        return;
    }
    const result = await db.write(
        'SELECT openrouter_api_key, groq_api_key, ai_credits_balance FROM companies WHERE id = $1',
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404; ctx.body = { success: false, message: 'Empresa não encontrada' }; return;
    }

    const { openrouter_api_key, groq_api_key, ai_credits_balance } = result.rows[0];

    // Devolver chave mascarada (se existir)
    let maskedKey = null;
    let maskedGroqKey = null;
    if (openrouter_api_key && openrouter_api_key.length > 10) {
        maskedKey = openrouter_api_key.substring(0, 10) + '...' + openrouter_api_key.substring(openrouter_api_key.length - 4);
    }
    if (groq_api_key && groq_api_key.length > 10) {
        maskedGroqKey = groq_api_key.substring(0, 10) + '...' + groq_api_key.substring(groq_api_key.length - 4);
    }

    ctx.body = {
        success: true,
        data: {
            hasCustomKey: openrouter_api_key !== null && openrouter_api_key.trim().length > 0,
            maskedKey,
            hasCustomGroqKey: groq_api_key !== null && groq_api_key.trim().length > 0,
            maskedGroqKey,
            aiCreditsBalance: ai_credits_balance
        }
    };
});

// PUT /api/companies/:id/ai-settings - Update company AI key (Admin only)
router.put('/:id/ai-settings', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. ID da empresa diferente da sua.' };
        return;
    }
    const { openrouterApiKey, groqApiKey } = ctx.request.body;

    // Remove whitespace and check if removing key
    const cleanedKey = openrouterApiKey === '' ? null : (openrouterApiKey ? openrouterApiKey.trim() : null);
    const cleanedGroqKey = groqApiKey === '' ? null : (groqApiKey ? groqApiKey.trim() : null);

    // If both are undefined, do not update (wait, we want to allow updating one without affecting the other if needed, but the current UI sends the explicit fields)
    // To handle partial updates:
    let updateQuery = 'UPDATE companies SET updated_at = NOW()';
    let params = [id];
    let paramIndex = 2;

    if (openrouterApiKey !== undefined) {
        updateQuery += `, openrouter_api_key = $${paramIndex}`;
        params.push(cleanedKey);
        paramIndex++;
    }

    if (groqApiKey !== undefined) {
        updateQuery += `, groq_api_key = $${paramIndex}`;
        params.push(cleanedGroqKey);
        paramIndex++;
    }

    updateQuery += ` WHERE id = $1`;

    if (params.length > 1) {
        await db.write(updateQuery, params);
    }

    ctx.body = {
        success: true,
        message: 'Configurações de IA salvas com sucesso!'
    };
});

// ==========================================
// FEATURE: ONBOARDING TURBO (Links Mágicos)
// ==========================================

// GET /api/companies/:id/invites - List active invites
router.get('/:id/invites', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;
    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado.' };
        return;
    }

    const result = await db.query(
        `SELECT id, code, max_uses, uses, expires_at, created_at 
         FROM company_invites 
         WHERE company_id = $1 
         ORDER BY created_at DESC`,
        [id]
    );

    ctx.body = { success: true, data: result.rows };
});

// POST /api/companies/:id/invites - Create a new magic link
router.post('/:id/invites', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;
    const { maxUses = 50, expiresInDays = 7 } = ctx.request.body;

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado.' };
        return;
    }

    const { randomBytes } = await import('crypto');
    const code = randomBytes(8).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));

    const result = await db.query(
        `INSERT INTO company_invites (company_id, code, max_uses, expires_at, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, code, max_uses, uses, expires_at, created_at`,
        [id, code, parseInt(maxUses), expiresAt, ctx.state.user.id]
    );

    ctx.status = 201;
    ctx.body = { success: true, data: result.rows[0] };
});

// DELETE /api/companies/:id/invites/:code - Invalidate a magic link
router.delete('/:id/invites/:code', adminMiddleware, async (ctx) => {
    const { id, code } = ctx.params;

    if (id !== ctx.state.user.companyId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado.' };
        return;
    }

    await db.query(
        'DELETE FROM company_invites WHERE company_id = $1 AND code = $2',
        [id, code]
    );

    ctx.body = { success: true, message: 'Link de convite invalidado com sucesso.' };
});

export default router;
