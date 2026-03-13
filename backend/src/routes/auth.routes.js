import Router from 'koa-router';
import ratelimit from 'koa-ratelimit';
import { authMiddleware } from '../middlewares/auth.js';
import {
    adminResetPasswordSchema,
    forgotPasswordSchema,
    googleLoginSchema,
    inviteJoinSchema,
    loginSchema,
    refreshSchema,
    registerSchema,
    twoFactorTokenSchema,
    verifyLoginSchema,
} from '../schemas/auth.schema.js';
import {
    AuthError,
    adminResetPassword,
    disableTwoFactorAuth,
    generateTwoFactor,
    getInviteInfo,
    getMe,
    joinInvite,
    listPasswordResetRequests,
    login,
    loginWithGoogle,
    logout,
    refreshSession,
    register,
    requestPasswordReset,
    verifyLogin,
    verifyTwoFactor,
} from '../services/auth.service.js';

const router = new Router();

const loginRateLimit = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 15 * 60 * 1000,
    errorMessage: 'Muitas tentativas de login. Tente novamente mais tarde.',
    id: (ctx) => ctx.ip,
    max: 15,
    disableHeader: false
});

const strictRateLimit = ratelimit({
    driver: 'memory',
    db: new Map(),
    duration: 60 * 60 * 1000,
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

const validateBody = (schema, ctx, requiredMessage = null) => {
    const result = schema.safeParse(ctx.request.body || {});
    if (!result.success) {
        const issues = result.error?.issues || result.error?.errors || [];
        const hasMissingRequired = issues.some((issue) =>
            issue.code === 'invalid_type' && String(issue.message || '').includes('received undefined')
        );
        const message = (hasMissingRequired && requiredMessage) ? requiredMessage : (issues[0]?.message || 'Dados inválidos');
        ctx.status = 400;
        ctx.body = { success: false, message };
        return null;
    }
    return result.data;
};

const handleError = (ctx, error, fallbackMessage, fallbackStatus = 500) => {
    if (error instanceof AuthError) {
        ctx.status = error.status || fallbackStatus;
        ctx.body = {
            success: false,
            message: error.message,
            ...(error.code && { code: error.code })
        };
        return;
    }

    ctx.status = fallbackStatus;
    ctx.body = { success: false, message: fallbackMessage };
};

// POST /api/auth/register (Public) — Creates company + admin user with 7-day trial
router.post('/register', strictRateLimit, async (ctx) => {
    const body = validateBody(registerSchema, ctx, 'Nome da empresa, username, email e password são obrigatórios');
    if (!body) return;

    try {
        const result = await register(body);
        ctx.status = 201;
        ctx.body = {
            success: true,
            message: 'Empresa e conta criadas com sucesso! Você tem 7 dias de trial.',
            data: {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    fullName: result.user.full_name,
                    role: result.user.role,
                    companyId: result.company.id,
                },
                company: {
                    id: result.company.id,
                    name: result.company.name,
                    planId: result.company.planId,
                    subscriptionStatus: result.company.subscriptionStatus,
                    trialEndsAt: result.company.trialEndsAt,
                },
                ...result.tokens,
            },
        };
    } catch (error) {
        console.error('Register error:', error);
        handleError(ctx, error, 'Erro ao criar empresa e conta');
    }
});

// ==========================================
// FEATURE: ONBOARDING TURBO (Links Mágicos)
// ==========================================

router.get('/invites/:code', strictRateLimit, async (ctx) => {
    const { code } = ctx.params;

    try {
        const invite = await getInviteInfo(code);
        ctx.body = {
            success: true,
            data: invite
        };
    } catch (error) {
        handleError(ctx, error, 'Erro interno do servidor');
    }
});

router.post('/invites/:code/join', strictRateLimit, async (ctx) => {
    const { code } = ctx.params;
    const body = validateBody(inviteJoinSchema, ctx, 'Preencha todos os campos obrigatórios');
    if (!body) return;

    try {
        const io = ctx.app.context.io;
        const result = await joinInvite(code, body, { io });

        ctx.status = 201;
        ctx.body = {
            success: true,
            message: 'Conta criada com sucesso e adicionada à empresa!',
            data: { user: result.user, ...result.tokens }
        };
    } catch (error) {
        console.error('Join via Invite Error:', error);
        if (error instanceof AuthError) {
            ctx.status = error.status || 500;
            ctx.body = {
                success: false,
                message: error.message || 'Erro ao criar conta',
                code: error.code || 'INVITE_JOIN_FAILED',
            };
            return;
        }
        ctx.status = error.status || 500;
        ctx.body = {
            success: false,
            message: error.message || 'Erro ao criar conta',
            code: error.code || 'INVITE_JOIN_FAILED',
        };
    }
});

// POST /api/auth/login
router.post('/login', loginRateLimit, async (ctx) => {
    const body = validateBody(loginSchema, ctx, 'Username e password são obrigatórios');
    if (!body) return;

    try {
        const result = await login(body, {
            ipAddress: ctx.ip,
            userAgent: ctx.get('user-agent') || null,
        });

        if (result.requires2FA) {
            ctx.body = {
                success: true,
                message: '2FA necessário',
                data: {
                    requires2FA: true,
                    tempToken: result.tempToken,
                    userId: result.userId
                }
            };
            return;
        }

        const { planInfo } = result;

        ctx.body = {
            success: true,
            message: 'Login realizado com sucesso',
            data: {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    fullName: result.user.full_name,
                    avatarUrl: result.user.avatar_url,
                    role: result.user.role,
                    department: result.user.department,
                    companyId: result.user.company_id,
                    customStatusText: result.user.custom_status_text,
                    customStatusEmoji: result.user.custom_status_emoji,
                    customStatusExpiresAt: result.user.custom_status_expires_at,
                    oooUntil: result.user.ooo_until,
                    oooMessage: result.user.ooo_message,
                    planId: planInfo.planId,
                    subscriptionStatus: planInfo.subscriptionStatus,
                    trialEndsAt: planInfo.trialEndsAt,
                },
                ...result.tokens,
            },
        };
    } catch (error) {
        console.error('Login error:', error.message);
        handleError(ctx, error, 'Erro interno do servidor');
    }
});

// POST /api/auth/google
router.post('/google', loginRateLimit, async (ctx) => {
    const body = validateBody(googleLoginSchema, ctx, 'Token Google é obrigatório');
    if (!body) return;

    try {
        const result = await loginWithGoogle(body);
        if (result.requires2FA) {
            ctx.body = {
                success: true,
                message: '2FA necessário',
                data: { requires2FA: true, tempToken: result.tempToken, userId: result.userId }
            };
            return;
        }

        const { planInfo } = result;

        ctx.body = {
            success: true,
            message: 'Login com Google realizado',
            data: {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    fullName: result.user.full_name,
                    avatarUrl: result.user.avatar_url,
                    role: result.user.role,
                    companyId: result.user.company_id,
                    planId: planInfo.planId,
                    subscriptionStatus: planInfo.subscriptionStatus,
                    trialEndsAt: planInfo.trialEndsAt,
                },
                ...result.tokens,
            },
        };
    } catch (error) {
        console.error('Google Auth Error:', error.message);
        handleError(ctx, error, 'Falha na verificação com o Google.');
    }
});

// POST /api/auth/logout
router.post('/logout', async (ctx) => {
    await logout(ctx.headers.authorization);
    ctx.body = { success: true, message: 'Logout realizado com sucesso' };
});

// POST /api/auth/verify-login
router.post('/verify-login', async (ctx) => {
    const body = validateBody(verifyLoginSchema, ctx, 'Parâmetros inválidos');
    if (!body) return;

    try {
        const result = await verifyLogin(body);
        const { planInfo } = result;

        ctx.body = {
            success: true,
            data: {
                user: {
                    id: result.user.id,
                    username: result.user.username,
                    email: result.user.email,
                    fullName: result.user.full_name,
                    avatarUrl: result.user.avatar_url,
                    role: result.user.role,
                    companyId: result.user.company_id,
                    planId: planInfo.planId,
                    subscriptionStatus: planInfo.subscriptionStatus,
                },
                ...result.tokens,
            },
        };
    } catch (error) {
        console.error('2FA Login Verify Error:', error.message);
        handleError(ctx, error, 'Sessão 2FA expirada ou token inválido', 401);
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (ctx) => {
    const body = validateBody(refreshSchema, ctx, 'Refresh token é obrigatório');
    if (!body) return;

    try {
        const tokens = await refreshSession(body);
        ctx.body = {
            success: true,
            data: tokens,
        };
    } catch (error) {
        handleError(ctx, error, 'Refresh token inválido ou expirado', 401);
    }
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
        const result = await getMe(token);
        const { planInfo } = result;

        ctx.body = {
            success: true,
            data: {
                id: result.user.id,
                username: result.user.username,
                email: result.user.email,
                fullName: result.user.full_name,
                avatarUrl: result.user.avatar_url,
                role: result.user.role,
                department: result.user.department,
                companyId: result.user.company_id,
                customStatusText: result.user.custom_status_text,
                customStatusEmoji: result.user.custom_status_emoji,
                customStatusExpiresAt: result.user.custom_status_expires_at,
                is_two_factor_enabled: result.user.is_two_factor_enabled,
                oooUntil: result.user.ooo_until,
                oooMessage: result.user.ooo_message,
                planId: planInfo.planId,
                subscriptionStatus: planInfo.subscriptionStatus,
                trialEndsAt: planInfo.trialEndsAt,
            },
        };
    } catch (error) {
        if (error instanceof AuthError) {
            handleError(ctx, error, error.message, error.status || 500);
            return;
        }
        ctx.status = 401;
        ctx.body = { success: false, message: 'Token expirado ou inválido' };
    }
});

// GET /api/auth/password-reset-requests - Get pending password reset requests (Admin only)
router.get('/password-reset-requests', authMiddleware, async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Não autenticado' };
        return;
    }

    try {
        const token = authHeader.split(' ')[1];
        const requests = await listPasswordResetRequests(token);
        ctx.body = {
            success: true,
            data: requests
        };
    } catch (error) {
        console.error('Get password reset requests error:', error);
        handleError(ctx, error, 'Erro ao buscar solicitações');
    }
});

// POST /api/auth/forgot-password - Request password reset (Public)
router.post('/forgot-password', strictRateLimit, async (ctx) => {
    const body = validateBody(forgotPasswordSchema, ctx, 'Username ou email é obrigatório');
    if (!body) return;

    try {
        const io = ctx.app.context.io;
        const result = await requestPasswordReset(body, { io });

        ctx.body = {
            success: true,
            message: result.successMessage
        };
    } catch (error) {
        console.error('Forgot password error:', error);
        handleError(ctx, error, 'Erro ao processar solicitação');
    }
});

// PUT /api/auth/admin-reset-password - Admin resets user password
router.put('/admin-reset-password', authMiddleware, async (ctx) => {
    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Não autenticado' };
        return;
    }

    const body = validateBody(adminResetPasswordSchema, ctx, 'userId e newPassword são obrigatórios');
    if (!body) return;

    try {
        const token = authHeader.split(' ')[1];
        const result = await adminResetPassword(token, body);
        ctx.body = {
            success: true,
            message: result.message
        };
    } catch (error) {
        console.error('Admin reset password error:', error);
        handleError(ctx, error, 'Erro ao resetar senha');
    }
});

// ─────────────── ENTERPRISE 2FA ROUTES ───────────────

router.get('/2fa/generate', authMiddleware, async (ctx) => {
    try {
        const data = await generateTwoFactor(ctx.state.user);
        ctx.body = {
            success: true,
            data
        };
    } catch (error) {
        console.error('2FA Generate Error:', error);
        handleError(ctx, error, 'Erro ao gerar 2FA');
    }
});

router.post('/2fa/verify', authMiddleware, async (ctx) => {
    const body = validateBody(twoFactorTokenSchema, ctx, 'Código inválido');
    if (!body) return;

    try {
        const result = await verifyTwoFactor(ctx.state.user.id, body.token);
        ctx.body = { success: true, message: result.message };
    } catch (error) {
        handleError(ctx, error, error.message || 'Erro ao validar 2FA');
    }
});

router.post('/2fa/disable', authMiddleware, async (ctx) => {
    const body = validateBody(twoFactorTokenSchema, ctx, 'Código inválido');
    if (!body) return;

    try {
        const result = await disableTwoFactorAuth(ctx.state.user.id, body.token);
        ctx.body = { success: true, message: result.message };
    } catch (error) {
        handleError(ctx, error, error.message || 'Erro ao desativar 2FA');
    }
});

export default router;
