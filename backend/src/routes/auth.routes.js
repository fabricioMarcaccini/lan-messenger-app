import Router from 'koa-router';
import bcrypt from 'bcrypt';
import ratelimit from 'koa-ratelimit';
import { db, cache } from '../config/database.js';
import { generateTokens, verifyRefreshToken, authMiddleware } from '../middlewares/auth.js';
import { writeAuditLog } from '../middlewares/audit.middleware.js';

const router = new Router();

// Rate Limiter for Login
const loginRateLimit = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 15 * 60 * 1000, // 15 minutes
    errorMessage: 'Muitas tentativas de login. Tente novamente mais tarde.',
    id: (ctx) => ctx.ip,
    max: 15,
    disableHeader: false
});

// Strict Rate Limiter for Registration and Forgot Password
const strictRateLimit = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60 * 60 * 1000, // 1 hour
    errorMessage: 'Muitas tentativas. Tente novamente mais tarde.',
    id: (ctx) => ctx.ip,
    headers: {
        remaining: 'RateLimit-Remaining',
        reset: 'RateLimit-Reset',
        total: 'RateLimit-Total'
    },
    max: 5,
    disableHeader: false
});

// POST /api/auth/register (Public) — Creates company + admin user with 7-day trial
router.post('/register', strictRateLimit, async (ctx) => {
    const { companyName, username, email, password, fullName } = ctx.request.body;

    if (!companyName || !username || !email || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nome da empresa, username, email e password são obrigatórios' };
        return;
    }

    if (password.trim().length < 6 || password.length > 72) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Senha deve ter entre 6 e 72 caracteres válidos' };
        return;
    }

    if (companyName.length > 100 || username.length > 50 || (fullName && fullName.length > 100)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Campos excedem o tamanho máximo permitido' };
        return;
    }

    if (/[<>]/.test(companyName) || /[<>]/.test(username) || (fullName && /[<>]/.test(fullName))) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Caracteres inválidos detectados' };
        return;
    }

    const safeCompanyName = companyName.trim();
    if (safeCompanyName.length < 2) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nome da empresa deve ter pelo menos 2 caracteres' };
        return;
    }
    const safeFullName = fullName || username;

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

        // 1) Create the company with 7-day trial
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // NOW + 7 days
        const companyResult = await db.write(
            `INSERT INTO companies (name, plan_id, subscription_status, max_seats, trial_ends_at)
             VALUES ($1, 'trial', 'trialing', 5, $2)
             RETURNING id`,
            [safeCompanyName, trialEndsAt.toISOString()]
        );

        const companyId = companyResult.rows[0].id;

        // 2) Create admin user for the new company
        const result = await db.write(
            `INSERT INTO users (company_id, username, email, password_hash, full_name, role)
             VALUES ($1, $2, $3, $4, $5, 'admin')
             RETURNING id, company_id, username, email, full_name, role`,
            [companyId, username, email, passwordHash, safeFullName]
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
            message: 'Empresa e conta criadas com sucesso! Você tem 7 dias de trial.',
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    role: user.role,
                    companyId,
                },
                company: {
                    id: companyId,
                    name: companyName.trim(),
                    planId: 'trial',
                    subscriptionStatus: 'trialing',
                    trialEndsAt: trialEndsAt.toISOString(),
                },
                ...tokens,
            },
        };
    } catch (error) {
        console.error('❌ Register error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao criar empresa e conta' };
    }
});

// ==========================================
// FEATURE: ONBOARDING TURBO (Links Mágicos)
// ==========================================

// GET /api/auth/invites/:code - Validate invite and return company info (Public)
router.get('/invites/:code', strictRateLimit, async (ctx) => {
    const { code } = ctx.params;

    const result = await db.query(
        `SELECT i.id, i.company_id, i.expires_at, i.max_uses, i.uses,
                c.name as company_name, c.logo_url
         FROM company_invites i
         JOIN companies c ON c.id = i.company_id
         WHERE i.code = $1`,
        [code]
    );

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Convite inválido ou não encontrado.' };
        return;
    }

    const invite = result.rows[0];

    // Validations
    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Este link de convite já expirou.' };
        return;
    }

    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Este link de convite atingiu o limite de usos.' };
        return;
    }

    ctx.body = {
        success: true,
        data: {
            companyId: invite.company_id,
            companyName: invite.company_name,
            logoUrl: invite.logo_url
        }
    };
});

// POST /api/auth/invites/:code/join - Register user via magic link (Public)
router.post('/invites/:code/join', strictRateLimit, async (ctx) => {
    const { code } = ctx.params;
    const { username, email, password, fullName } = ctx.request.body;

    if (!username || !email || !password) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Preencha todos os campos obrigatórios' };
        return;
    }

    try {
        // Find and validate the invite again (inside transaction context conceptually)
        const inviteResult = await db.query(
            `SELECT i.id, i.company_id, i.expires_at, i.max_uses, i.uses
             FROM company_invites i
             WHERE i.code = $1 FOR UPDATE`,
            [code]
        );

        if (inviteResult.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Convite inválido' };
            return;
        }

        const invite = inviteResult.rows[0];

        if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
            ctx.status = 400; ctx.body = { success: false, message: 'Convite expirado' }; return;
        }

        if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
            ctx.status = 400; ctx.body = { success: false, message: 'Limite de convites atingido' }; return;
        }

        // Check for existing users
        const existing = await db.query(
            'SELECT id FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        if (existing.rows.length > 0) {
            ctx.status = 409; ctx.body = { success: false, message: 'Usuário ou e-mail já existe' }; return;
        }

        const safeFullName = fullName || username;
        const passwordHash = await bcrypt.hash(password, 12);

        // Import createUserWithSeatLock dynamically to avoid circular deps if they exist 
        // We already imported it at the top of the file!
        const { createUserWithSeatLock } = await import('../middlewares/auth.js');

        // Create user with seat check
        const { user } = await createUserWithSeatLock(invite.company_id, {
            username, email, passwordHash, fullName: safeFullName, role: 'user'
        });

        // Increment invite uses
        await db.query('UPDATE company_invites SET uses = uses + 1 WHERE id = $1', [invite.id]);

        // Generate tokens
        const tokens = generateTokens(user);

        // Notify admins new user joined
        const io = ctx.app.context.io;
        if (io) {
            const adminResult = await db.query(
                `SELECT id FROM users WHERE company_id = $1 AND role = 'admin'`,
                [invite.company_id]
            );
            adminResult.rows.forEach(admin => {
                io.to(`user:${admin.id}`).emit('company:user_joined_via_invite', {
                    userId: user.id, username: user.username, fullName: user.full_name
                });
            });
        }

        // Optional log
        await db.query(`
            INSERT INTO audit_logs (company_id, action, target_type, target_id, metadata)
            VALUES ($1, $2, $3, $4, $5)`,
            [invite.company_id, 'invite.join', 'user', user.id, { username, email, inviteCode: code }]
        );

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: 'Conta criada com sucesso e adicionada à empresa!',
            data: { user, ...tokens }
        };

    } catch (error) {
        console.error('Join via Invite Error:', error);
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao criar conta',
            code: error.code || 'INVITE_JOIN_FAILED'
        };
    }
});

// POST /api/auth/login
router.post('/login', loginRateLimit, async (ctx) => {
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

        // Check if 2FA is enabled
        if (user.is_two_factor_enabled) {
            console.log('🔒 2FA required for user:', user.username);
            // Return a temporary token just for 2FA validation
            const tempToken = jwt.sign(
                { id: user.id, is2FA: true },
                process.env.JWT_SECRET || 'fallback_secret',
                { expiresIn: '5m' }
            );

            ctx.body = {
                success: true,
                message: '2FA necessário',
                data: {
                    requires2FA: true,
                    tempToken,
                    userId: user.id
                }
            };
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

        // Fetch company plan info
        let planId = 'free';
        let subscriptionStatus = 'inactive';
        let trialEndsAt = null;
        if (user.company_id) {
            const companyResult = await db.write(
                'SELECT plan_id, subscription_status, trial_ends_at FROM companies WHERE id = $1',
                [user.company_id]
            );
            if (companyResult.rows[0]) {
                planId = companyResult.rows[0].plan_id || 'free';
                subscriptionStatus = companyResult.rows[0].subscription_status || 'inactive';
                trialEndsAt = companyResult.rows[0].trial_ends_at || null;
            }
        }

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
                    customStatusText: user.custom_status_text,
                    customStatusEmoji: user.custom_status_emoji,
                    customStatusExpiresAt: user.custom_status_expires_at,
                    oooUntil: user.ooo_until,
                    oooMessage: user.ooo_message,
                    planId,
                    subscriptionStatus,
                    trialEndsAt,
                },
                ...tokens,
            },
        };

        await writeAuditLog({
            companyId: user.company_id,
            actorId: user.id,
            action: 'auth.login',
            targetType: 'user',
            targetId: user.id,
            metadata: { username: user.username },
            ipAddress: ctx.ip,
            userAgent: ctx.get('user-agent') || null,
        });
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

// POST /api/auth/verify-login
router.post('/verify-login', async (ctx) => {
    const { tempToken, token } = ctx.request.body;

    if (!tempToken || !token) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Parâmetros inválidos' };
        return;
    }

    try {
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET || 'fallback_secret');
        if (!decoded.is2FA) throw new Error('Invalid token type');

        const { verifySync } = await import('otplib');
        const userId = decoded.id;

        const result = await db.write('SELECT * FROM users WHERE id = $1', [userId]);
        const user = result.rows[0];

        if (!user || (!user.is_two_factor_enabled && !user.two_factor_secret)) {
            ctx.status = 400;
            ctx.body = { success: false, message: 'Usuário inválido ou 2FA não configurado' };
            return;
        }

        const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
        const isValid = verification?.valid;

        if (!isValid) {
            ctx.status = 401;
            ctx.body = { success: false, message: 'Código 2FA inválido' };
            return;
        }

        // --- SUCCESSFUL LOGIN PROCESS (Same as normal login) ---
        await db.write('UPDATE users SET last_seen_at = NOW() WHERE id = $1', [user.id]);
        const tokens = generateTokens(user);

        await cache.set(`session:${user.id}`, { userId: user.id, loginAt: Date.now() }, 86400 * 7);
        await cache.setPresence(user.id, 'online');

        let planId = 'free';
        let subscriptionStatus = 'inactive';
        let trialEndsAt = null;
        if (user.company_id) {
            const companyResult = await db.write('SELECT plan_id, subscription_status, trial_ends_at FROM companies WHERE id = $1', [user.company_id]);
            if (companyResult.rows[0]) {
                planId = companyResult.rows[0].plan_id || 'free';
                subscriptionStatus = companyResult.rows[0].subscription_status || 'inactive';
                trialEndsAt = companyResult.rows[0].trial_ends_at || null;
            }
        }

        ctx.body = {
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.full_name,
                    avatarUrl: user.avatar_url,
                    role: user.role,
                    companyId: user.company_id,
                    planId,
                    subscriptionStatus,
                },
                ...tokens,
            },
        };
    } catch (error) {
        console.error('❌ 2FA Login Verify Error:', error.message);
        ctx.status = 401;
        ctx.body = { success: false, message: 'Sessão 2FA expirada ou token inválido' };
    }
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
        const JWT_SECRET = process.env.JWT_SECRET;

        // VERIFY SIGNATURE AND EXPIRATION!
        const decoded = jwt.default.verify(token, JWT_SECRET);

        const result = await db.write(
            `SELECT id, username, email, full_name, avatar_url, role, department, company_id,
                    custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message, is_two_factor_enabled
             FROM users WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            ctx.status = 404;
            ctx.body = { success: false, message: 'Usuário não encontrado' };
            return;
        }

        const user = result.rows[0];

        // Fetch company plan info
        let planId = 'free';
        let subscriptionStatus = 'inactive';
        let trialEndsAt = null;
        if (user.company_id) {
            const companyResult = await db.write(
                'SELECT plan_id, subscription_status, trial_ends_at FROM companies WHERE id = $1',
                [user.company_id]
            );
            if (companyResult.rows[0]) {
                planId = companyResult.rows[0].plan_id || 'free';
                subscriptionStatus = companyResult.rows[0].subscription_status || 'inactive';
                trialEndsAt = companyResult.rows[0].trial_ends_at || null;
            }
        }

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
                customStatusText: user.custom_status_text,
                customStatusEmoji: user.custom_status_emoji,
                customStatusExpiresAt: user.custom_status_expires_at,
                is_two_factor_enabled: user.is_two_factor_enabled,
                oooUntil: user.ooo_until,
                oooMessage: user.ooo_message,
                planId,
                subscriptionStatus,
                trialEndsAt,
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
router.post('/forgot-password', strictRateLimit, async (ctx) => {
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

// ─────────────── ENTERPRISE 2FA ROUTES ───────────────

router.get('/2fa/generate', authMiddleware, async (ctx) => {
    const { generateSecret, generateURI } = await import('otplib');
    const QRCode = await import('qrcode');
    const userId = ctx.state.user.id;
    const email = ctx.state.user.email;

    try {
        const secret = generateSecret();
        const otpauthContent = generateURI({ secret, label: 'Lanly Enterprise', issuer: 'Lanly', accountName: email, type: 'totp' });
        const qrCodeUrl = await QRCode.toDataURL(otpauthContent);

        // Store secret temporarily (or update the user but keep is_two_factor_enabled false until verified)
        await db.write(
            'UPDATE users SET two_factor_secret = $2 WHERE id = $1',
            [userId, secret]
        );

        ctx.body = {
            success: true,
            data: { secret, qrCodeUrl, otpauthUrl: otpauthContent }
        };
    } catch (error) {
        console.error('2FA Generate Error:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: 'Erro ao gerar 2FA' };
    }
});

router.post('/2fa/verify', authMiddleware, async (ctx) => {
    const { verifySync } = await import('otplib');
    const { token } = ctx.request.body;
    const userId = ctx.state.user.id;

    const result = await db.write('SELECT two_factor_secret, is_two_factor_enabled FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user || !user.two_factor_secret) {
        ctx.status = 400;
        ctx.body = { success: false, message: '2FA não configurado' };
        return;
    }

    const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
    const isValid = verification?.valid;

    if (!isValid) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Código inválido' };
        return;
    }

    if (!user.is_two_factor_enabled) {
        await db.write('UPDATE users SET is_two_factor_enabled = true WHERE id = $1', [userId]);
    }

    ctx.body = { success: true, message: '2FA ativado com sucesso' };
});

router.post('/2fa/disable', authMiddleware, async (ctx) => {
    const { verifySync } = await import('otplib');
    const { token } = ctx.request.body;
    const userId = ctx.state.user.id;

    const result = await db.write('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user || !user.two_factor_secret) {
        ctx.status = 400;
        ctx.body = { success: false, message: '2FA não está ativo' };
        return;
    }

    const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
    const isValid = verification?.valid;

    if (!isValid) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Código inválido' };
        return;
    }

    await db.write('UPDATE users SET is_two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [userId]);

    ctx.body = { success: true, message: '2FA desativado' };
});

export default router;
