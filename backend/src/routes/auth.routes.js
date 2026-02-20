import Router from 'koa-router';
import bcrypt from 'bcrypt';
import { db, cache } from '../config/database.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';

const router = new Router();

// POST /api/auth/register (Public)
router.post('/register', async (ctx) => {
    const { username, email, password, fullName } = ctx.request.body;

    if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username, email e password são obrigatórios' };
        return;
    }

    try {
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

        // Get default company
        const defaultCompany = '00000000-0000-0000-0000-000000000001';

        // Create user
        const result = await db.write(
            `INSERT INTO users (company_id, username, email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4, $5, 'user')
             RETURNING id, username, email, full_name, role`,
            [defaultCompany, username, email, passwordHash, fullName || username]
        );

        const user = result.rows[0];

        // Generate tokens automatically
        const tokens = generateTokens(user);

        // Cache session
        await cache.set(`session:${user.id}`, {
            userId: user.id,
            loginAt: Date.now(),
        }, 86400 * 7);

        await cache.setPresence(user.id, 'online');

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: 'Cadastro realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    companyId: defaultCompany,
                },
                ...tokens,
            },
        };
    } catch (error) {
        console.error('❌ Register error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao criar usuário' };
    }
});

// POST /api/auth/login
router.post('/login', async (ctx) => {
    const { username, password } = ctx.request.body;

    console.log('🔐 Login attempt:', { username, passwordLength: password?.length });

    if (!username || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username e password são obrigatórios' };
        return;
    }

    try {
        // Find user by username or email
        const result = await db.write(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
            [username]
        );

        console.log('📊 Query result rows:', result.rows.length);

        const user = result.rows[0];

        if (!user) {
            console.log('❌ User not found');
            ctx.status = 401;
            ctx.body = { success: false, message: 'Credenciais inválidas' };
            return;
        }

        console.log('👤 User found:', user.username, 'Role:', user.role);

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        console.log('🔑 Password valid:', validPassword);

        if (!validPassword) {
            ctx.status = 401;
            ctx.body = { success: false, message: 'Credenciais inválidas' };
            return;
        }

        // Update last seen
        await db.write(
            'UPDATE users SET last_seen_at = NOW() WHERE id = $1',
            [user.id]
        );

        // Generate tokens
        const tokens = generateTokens(user);

        // Cache user session
        await cache.set(`session:${user.id}`, {
            userId: user.id,
            loginAt: Date.now(),
        }, 86400 * 7); // 7 days

        // Set user as online
        await cache.setPresence(user.id, 'online');

        ctx.body = {
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    avatarUrl: user.avatar_url,
                    role: user.role,
                    department: user.department,
                    companyId: user.company_id,
                },
                ...tokens,
            },
        };
    } catch (error) {
        console.error('❌ Login error:', error.message);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro interno do servidor' };
    }
});

// POST /api/auth/logout
router.post('/logout', async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

            // Remove from cache
            await cache.del(`session:${decoded.id}`);
            await cache.setPresence(decoded.id, 'offline');
        } catch (e) {
            // Token decode failed, but logout anyway
        }
    }

    ctx.body = { success: true, message: 'Logout realizado com sucesso' };
});

// POST /api/auth/refresh
router.post('/refresh', async (ctx) => {
    const { refreshToken } = ctx.request.body;

    if (!refreshToken) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Refresh token é obrigatório' };
        return;
    }

    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Refresh token inválido ou expirado' };
        return;
    }

    // Get user from database
    const result = await db.write(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.id]
    );

    const user = result.rows[0];

    if (!user) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Usuário não encontrado' };
        return;
    }

    // Generate new tokens
    const tokens = generateTokens(user);

    ctx.body = {
        success: true,
        data: tokens,
    };
});

// GET /api/auth/me
router.get('/me', async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Não autenticado' };
        return;
    }

    try {
        const token = authHeader.split(' ')[1];

        // Import JWT at the top to use proper verification, replacing unsafe decode
        const jwt = await import('jsonwebtoken');
        // Usar a chave secreta correta como nos middlewares
        const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

        // VERIFY SIGNATURE AND EXPIRATION!
        const decoded = jwt.default.verify(token, JWT_SECRET);

        const result = await db.write(
            'SELECT id, username, email, full_name, avatar_url, role, department, company_id FROM users WHERE id = $1',
            [decoded.id]
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
                companyId: user.company_id,
            },
        };
    } catch (e) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Token expirado ou inválido' };
    }
});

// GET /api/auth/password-reset-requests - Get pending password reset requests (Admin only)
router.get('/password-reset-requests', async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Não autenticado' };
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        // Check if admin
        if (decoded.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { success: false, message: 'Apenas administradores podem ver solicitações' };
            return;
        }

        // Get all password reset requests from Redis
        const keys = await cache.keys('password_reset:*');
        const requests = [];

        for (const key of keys) {
            const request = await cache.get(key);
            if (request) {
                requests.push(request);
            }
        }

        // Sort by requestedAt descending
        requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

        ctx.body = {
            success: true,
            data: requests
        };
    } catch (error) {
        console.error('❌ Get password reset requests error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao buscar solicitações' };
    }
});

// POST /api/auth/forgot-password - Request password reset (Public)
router.post('/forgot-password', async (ctx) => {
    const { username } = ctx.request.body;

    if (!username) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Username ou email é obrigatório' };
        return;
    }

    try {
        // Find user
        const result = await db.write(
            'SELECT id, username, email, full_name FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            // Don't reveal if user exists - security best practice
            ctx.body = {
                success: true,
                message: 'Se o usuário existir, um administrador será notificado para resetar sua senha.'
            };
            return;
        }

        const user = result.rows[0];

        // Save password reset request to cache (expires in 24h)
        const resetRequest = {
            userId: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            requestedAt: new Date().toISOString()
        };

        await cache.set(`password_reset:${user.id}`, resetRequest, 86400);

        // Notify admins via Socket.IO if available
        const io = ctx.app.context.io;
        if (io) {
            io.to('admin:all').emit('admin:password-reset-request', resetRequest);
        }

        console.log(`🔐 Password reset requested for user: ${user.username}`);

        ctx.body = {
            success: true,
            message: 'Solicitação enviada. Um administrador irá resetar sua senha em breve.'
        };
    } catch (error) {
        console.error('❌ Forgot password error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao processar solicitação' };
    }
});

// PUT /api/auth/admin-reset-password - Admin resets user password
router.put('/admin-reset-password', async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Não autenticado' };
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        // Check if admin
        if (decoded.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { success: false, message: 'Apenas administradores podem resetar senhas' };
            return;
        }

        const { userId, newPassword } = ctx.request.body;

        if (!userId || !newPassword) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'userId e newPassword são obrigatórios' };
            return;
        }

        // Hash new password
        const bcrypt = await import('bcrypt');
        const passwordHash = await bcrypt.default.hash(newPassword, 12);

        // Update password
        await db.write(
            'UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1',
            [userId, passwordHash]
        );

        // Remove reset request from cache
        await cache.del(`password_reset:${userId}`);

        console.log(`✅ Password reset by admin for user ID: ${userId}`);

        ctx.body = {
            success: true,
            message: 'Senha resetada com sucesso'
        };
    } catch (error) {
        console.error('❌ Admin reset password error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao resetar senha' };
    }
});

export default router;
