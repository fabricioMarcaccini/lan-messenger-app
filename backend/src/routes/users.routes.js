import Router from 'koa-router';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.js';

const router = new Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/users - List all users
router.get('/', async (ctx) => {
    const { page = 1, limit = 20, search = '' } = ctx.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT id, username, email, full_name, avatar_url, role, department, 
               position, status_message, is_active, last_seen_at, created_at
        FROM users
        WHERE company_id = $1
    `;
    const params = [ctx.state.user.companyId];

    if (search) {
        query += ` AND (username ILIKE $2 OR email ILIKE $2 OR full_name ILIKE $2)`;
        params.push(`%${search}%`);
    }

    query += ` ORDER BY full_name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.write(query, params);

    // Get total count
    const countResult = await db.write(
        'SELECT COUNT(*) as total FROM users WHERE company_id = $1',
        [ctx.state.user.companyId]
    );

    ctx.body = {
        success: true,
        data: {
            users: result.rows.map(u => ({
                id: u.id,
                username: u.username,
                email: u.email,
                fullName: u.full_name,
                avatarUrl: u.avatar_url,
                role: u.role,
                department: u.department,
                position: u.position,
                statusMessage: u.status_message,
                isActive: u.is_active,
                lastSeenAt: u.last_seen_at,
                createdAt: u.created_at,
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].total),
            },
        },
    };
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;

    const result = await db.write(
        `SELECT id, username, email, full_name, avatar_url, role, department, 
                position, status_message, is_active, last_seen_at, created_at
         FROM users WHERE id = $1`,
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuário não encontrado' };
        return;
    }

    const user = result.rows[0];
    ctx.body = {
        success: true,
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            role: user.role,
            department: user.department,
            position: user.position,
            statusMessage: user.status_message,
            isActive: user.is_active,
            lastSeenAt: user.last_seen_at,
            createdAt: user.created_at,
        },
    };
});

// POST /api/users - Create new user (Admin only)
router.post('/', adminMiddleware, async (ctx) => {
    const { username, email, password, fullName, role = 'user', department, position } = ctx.request.body;

    if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username, email e password são obrigatórios' };
        return;
    }

    // Check if user exists
    const existing = await db.write(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
    );

    if (existing.rows.length > 0) {
        ctx.status = 409;
        ctx.body = { success: false, message: 'Usuário ou email já existe' };
        return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.write(
        `INSERT INTO users (company_id, username, email, password_hash, full_name, role, department, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, username, email, full_name, role`,
        [ctx.state.user.companyId, username, email, passwordHash, fullName, role, department, position]
    );

    ctx.status = 201;
    ctx.body = {
        success: true,
        message: 'Usuário criado com sucesso',
        data: result.rows[0],
    };
});

// PUT /api/users/:id - Update user
router.put('/:id', async (ctx) => {
    const { id } = ctx.params;
    const { fullName, email, department, position, statusMessage, avatarUrl } = ctx.request.body;

    // Check if user can update (self or admin)
    if (ctx.state.user.id !== id && ctx.state.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Sem permissão para atualizar este usuário' };
        return;
    }

    const result = await db.write(
        `UPDATE users 
         SET full_name = COALESCE($2, full_name),
             email = COALESCE($3, email),
             department = COALESCE($4, department),
             position = COALESCE($5, position),
             status_message = COALESCE($6, status_message),
             avatar_url = COALESCE($7, avatar_url),
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, username, email, full_name, department, position, status_message, avatar_url, is_active, last_seen_at, created_at`,
        [id, fullName, email, department, position, statusMessage, avatarUrl]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuário não encontrado' };
        return;
    }

    const updatedUser = result.rows[0];

    ctx.body = {
        success: true,
        message: 'Usuário atualizado com sucesso',
        data: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            fullName: updatedUser.full_name,
            avatarUrl: updatedUser.avatar_url,
            department: updatedUser.department,
            position: updatedUser.position,
            statusMessage: updatedUser.status_message,
            isActive: updatedUser.is_active,
            lastSeenAt: updatedUser.last_seen_at,
            createdAt: updatedUser.created_at,
        },
    };
});

// DELETE /api/users/:id - Deactivate user (Admin only)
router.delete('/:id', adminMiddleware, async (ctx) => {
    const { id } = ctx.params;

    // Prevent self-deletion
    if (ctx.state.user.id === id) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Não é possível desativar sua própria conta' };
        return;
    }

    const result = await db.write(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuário não encontrado' };
        return;
    }

    ctx.body = {
        success: true,
        message: 'Usuário desativado com sucesso',
    };
});

// PUT /api/users/:id/password - Change password
router.put('/:id/password', async (ctx) => {
    const { id } = ctx.params;
    const { currentPassword, newPassword } = ctx.request.body;

    if (ctx.state.user.id !== id) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Sem permissão para alterar esta senha' };
        return;
    }

    if (!currentPassword || !newPassword) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Senha atual e nova são obrigatórias' };
        return;
    }

    // Verify current password
    const result = await db.write('SELECT password_hash FROM users WHERE id = $1', [id]);
    const user = result.rows[0];

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Senha atual incorreta' };
        return;
    }

    // Update password
    const newHash = await bcrypt.hash(newPassword, 12);
    await db.write('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [id, newHash]);

    ctx.body = {
        success: true,
        message: 'Senha alterada com sucesso',
    };
});

export default router;
