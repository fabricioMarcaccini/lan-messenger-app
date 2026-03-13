import Router from 'koa-router';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';
import { authMiddleware, adminMiddleware, createUserWithSeatLock, createBulkUsersWithSeatLock } from '../middlewares/auth.js';

const router = new Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/users/me/mentions - List mentions for current user
router.get('/me/mentions', async (ctx) => {
    const userId = ctx.state.user.id;
    const { limit = 50, offset = 0, unreadOnly = 'false', markAsRead = 'false' } = ctx.query;

    const params = [userId];
    let idx = 2;
    let unreadFilter = '';

    if (String(unreadOnly).toLowerCase() === 'true') {
        unreadFilter = ` AND mn.is_read = false`;
    }

    const result = await db.write(`
        SELECT mn.id, mn.message_id, mn.conversation_id, mn.is_read, mn.created_at,
               m.content, m.content_type, m.created_at as message_created_at,
               c.name as conversation_name, c.is_group,
               u.id as mentioner_id, u.username as mentioner_username, u.full_name as mentioner_name, u.avatar_url as mentioner_avatar
        FROM mentions mn
        JOIN messages m ON m.id = mn.message_id
        JOIN conversations c ON c.id = mn.conversation_id
        LEFT JOIN users u ON u.id = mn.mentioner_id
        WHERE mn.mentioned_user_id = $1
        ${unreadFilter}
        ORDER BY mn.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}
    `, [userId, parseInt(limit, 10), parseInt(offset, 10)]);

    if (String(markAsRead).toLowerCase() === 'true' && result.rows.length > 0) {
        const mentionIds = result.rows.map((row) => row.id);
        await db.write(
            'UPDATE mentions SET is_read = true WHERE id = ANY($1::uuid[]) AND mentioned_user_id = $2',
            [mentionIds, userId]
        );
    }

    const unreadCountResult = await db.write(
        'SELECT COUNT(*) as count FROM mentions WHERE mentioned_user_id = $1 AND is_read = false',
        [userId]
    );

    ctx.body = {
        success: true,
        data: result.rows.map((row) => ({
            id: row.id,
            messageId: row.message_id,
            conversationId: row.conversation_id,
            conversationName: row.conversation_name,
            isGroup: row.is_group,
            isRead: row.is_read,
            mentionedAt: row.created_at,
            content: row.content,
            contentType: row.content_type,
            messageCreatedAt: row.message_created_at,
            mentioner: {
                id: row.mentioner_id,
                username: row.mentioner_username,
                fullName: row.mentioner_name,
                avatarUrl: row.mentioner_avatar,
            },
        })),
        unreadCount: parseInt(unreadCountResult.rows[0]?.count || '0', 10),
    };
});

// POST /api/users/me/fcm-token - Save FCM device token
router.post('/me/fcm-token', async (ctx) => {
    const userId = ctx.state.user.id;
    const { token } = ctx.request.body || {};

    if (!token || typeof token !== 'string' || token.length < 20 || token.length > 4096) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Token FCM inválido' };
        return;
    }

    await db.write(
        'UPDATE users SET fcm_token = $2, updated_at = NOW() WHERE id = $1',
        [userId, token]
    );

    ctx.body = { success: true };
});

// PUT /api/users/me/custom-status - Custom status + OOO
router.put('/me/custom-status', async (ctx) => {
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;
    const {
        text = null,
        emoji = null,
        expiresAt = null,
        oooUntil = null,
        oooMessage = null,
    } = ctx.request.body || {};

    if (text && String(text).length > 100) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Texto de status excede 100 caracteres' };
        return;
    }

    if (oooMessage && String(oooMessage).length > 255) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Mensagem OOO excede 255 caracteres' };
        return;
    }

    const result = await db.write(
        `UPDATE users
         SET custom_status_text = $2,
             custom_status_emoji = $3,
             custom_status_expires_at = $4,
             ooo_until = $5,
             ooo_message = $6,
             updated_at = NOW()
         WHERE id = $1
         RETURNING id, custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message`,
        [
            userId,
            text ? String(text).trim() : null,
            emoji ? String(emoji).trim() : null,
            expiresAt ? new Date(expiresAt) : null,
            oooUntil ? new Date(oooUntil) : null,
            oooMessage ? String(oooMessage).trim() : null,
        ]
    );

    const updated = result.rows[0];
    if (!updated) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Usuário não encontrado' };
        return;
    }

    const io = ctx.app.context.io;
    if (io && companyId) {
        io.to(`company:${companyId}`).emit('user:status-changed', {
            userId,
            customStatusText: updated.custom_status_text,
            customStatusEmoji: updated.custom_status_emoji,
            customStatusExpiresAt: updated.custom_status_expires_at,
            oooUntil: updated.ooo_until,
            oooMessage: updated.ooo_message,
        });
    }

    if (ctx.audit) {
        await ctx.audit({
            action: 'user.custom_status.updated',
            targetType: 'user',
            targetId: userId,
            metadata: {
                hasText: !!updated.custom_status_text,
                hasEmoji: !!updated.custom_status_emoji,
                hasOoo: !!updated.ooo_until,
            },
        });
    }

    ctx.body = {
        success: true,
        message: 'Status atualizado',
        data: {
            customStatusText: updated.custom_status_text,
            customStatusEmoji: updated.custom_status_emoji,
            customStatusExpiresAt: updated.custom_status_expires_at,
            oooUntil: updated.ooo_until,
            oooMessage: updated.ooo_message,
        },
    };
});

// GET /api/users - List all users
router.get('/', async (ctx) => {
    const { page = 1, limit = 20, search = '' } = ctx.query;
    const offset = (page - 1) * limit;

    let query = `
        SELECT id, username, email, full_name, avatar_url, role, department, 
               position, status_message, is_active, last_seen_at, created_at,
               custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message
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
                customStatusText: u.custom_status_text,
                customStatusEmoji: u.custom_status_emoji,
                customStatusExpiresAt: u.custom_status_expires_at,
                oooUntil: u.ooo_until,
                oooMessage: u.ooo_message,
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
                position, status_message, is_active, last_seen_at, created_at,
                custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message
         FROM users WHERE id = $1 AND company_id = $2`,
        [id, ctx.state.user.companyId]
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
            customStatusText: user.custom_status_text,
            customStatusEmoji: user.custom_status_emoji,
            customStatusExpiresAt: user.custom_status_expires_at,
            oooUntil: user.ooo_until,
            oooMessage: user.ooo_message,
        },
    };
});

// POST /api/users - Create new user (Admin only, SEAT-LOCKED)
// Uses createUserWithSeatLock: a single PostgreSQL transaction that:
//   1. Locks the company row (FOR UPDATE)
//   2. Counts active users
//   3. Blocks if limit reached
//   4. INSERTs the user
// All within ONE atomic transaction — immune to race conditions.
router.post('/', adminMiddleware, async (ctx) => {
    const { username, email, password, fullName, role = 'user', department, position } = ctx.request.body;
    const companyId = ctx.state.user.companyId;

    if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username, email e password são obrigatórios' };
        return;
    }

    if (!companyId) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Usuário admin não está vinculado a nenhuma empresa' };
        return;
    }

    // Check if user exists (outside the transaction — this is just a UX shortcut)
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

    try {
        // 🔒 ATOMIC: Lock + Check + Insert in ONE transaction
        const result = await createUserWithSeatLock(companyId, {
            username, email, passwordHash, fullName, role, department, position
        });

        if (ctx.audit) {
            await ctx.audit({
                action: 'user.created',
                targetType: 'user',
                targetId: result.user.id,
                metadata: {
                    username: result.user.username,
                    role: result.user.role,
                    department: department || null,
                },
            });
        }

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: `Usuário criado com sucesso (${result.seatInfo.activeUsers}/${result.seatInfo.maxSeats} seats usados)`,
            data: result.user,
            seatInfo: result.seatInfo,
        };
    } catch (error) {
        const status = error.status || 500;
        ctx.status = status;
        ctx.body = {
            success: false,
            message: error.message,
            code: error.code || 'USER_CREATION_FAILED',
            ...(error.maxSeats && { maxSeats: error.maxSeats }),
            ...(error.activeUsers !== undefined && { activeUsers: error.activeUsers }),
        };
    }
});

// POST /api/users/bulk - Importação em massa de usuários (Onboarding Turbo - Smart Paste / CSV)
router.post('/bulk', adminMiddleware, async (ctx) => {
    const { users } = ctx.request.body;
    const companyId = ctx.state.user.companyId;

    if (!Array.isArray(users) || users.length === 0) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Lista de usuários inválida ou vazia.' };
        return;
    }

    // Limit to 100 users per bulk request to prevent payloads that are too large
    if (users.length > 100) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'O limite de importação por vez é de 100 usuários.' };
        return;
    }

    try {
        // Validate and hash passwords for all valid users before the transaction
        const validUsers = [];
        for (const u of users) {
            if (!u.email || !u.fullName) {
                continue; // Skip invalid entries
            }
            // Generate username from email if not provided
            const rawUsername = u.username || u.email.split('@')[0];
            const username = rawUsername.toLowerCase().replace(/[^a-z0-9_.]/g, '');

            // Base validation for length
            if (username.length < 3) continue;

            const plainPassword = u.password || 'Lanly@' + new Date().getFullYear() + '!';
            const passwordHash = await bcrypt.hash(plainPassword, 12);

            validUsers.push({
                username,
                email: u.email.toLowerCase(),
                passwordHash,
                fullName: u.fullName,
                role: u.role || 'user',
                department: u.department || null,
                position: u.position || null
            });
        }

        if (validUsers.length === 0) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Nenhum usuário válido encontrado na lista.' };
            return;
        }

        // 🔒 ATOMIC BULK INSERT: Lock + Check all seats + Insert multiple
        const result = await createBulkUsersWithSeatLock(companyId, validUsers);

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: `${result.users.length} usuários importados com sucesso!`,
            data: result.users,
            seatInfo: result.seatInfo
        };

        // Notify admins of the company that bulk creation occurred
        const io = ctx.app.context.io;
        if (io) {
            const adminResult = await db.query(
                `SELECT id FROM users WHERE company_id = $1 AND role = 'admin'`,
                [companyId]
            );
            adminResult.rows.forEach((admin) => {
                io.to(`user:${admin.id}`).emit('company:bulk_users_added', {
                    count: result.users.length,
                    seatInfo: result.seatInfo
                });
            });
        }
    } catch (error) {
        console.error('Bulk User Creation Error:', error);
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            message: error.message || 'Erro interno ao importar usuários',
            code: error.code || 'BULK_IMPORT_FAILED',
            ...(error.maxSeats && { maxSeats: error.maxSeats }),
            ...(error.activeUsers !== undefined && { activeUsers: error.activeUsers }),
            ...(error.attemptingToAdd && { attemptingToAdd: error.attemptingToAdd }),
            ...(error.conflicts && { conflicts: error.conflicts })
        };
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (ctx) => {
    const { id } = ctx.params;
    const { fullName, email, department, position, statusMessage, avatarUrl } = ctx.request.body;
    const companyId = ctx.state.user.companyId;

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
         WHERE id = $1 AND company_id = $8
         RETURNING id, username, email, full_name, department, position, status_message, avatar_url, is_active, last_seen_at, created_at`,
        [id, fullName, email, department, position, statusMessage, avatarUrl, companyId]
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
    const companyId = ctx.state.user.companyId;

    // Prevent self-deletion
    if (ctx.state.user.id === id) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Não é possível desativar sua própria conta' };
        return;
    }

    const result = await db.write(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, companyId]
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
