import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { cache } from '../config/database.js';
import { generateTokens, verifyRefreshToken } from '../middlewares/auth.js';
import { writeAuditLog } from '../middlewares/audit.middleware.js';
import {
    createAdminUser,
    createUserWithSeatLock,
    findActiveBasicByUsernameOrEmail,
    findActiveByEmail,
    findActiveByUsernameOrEmail,
    findActiveById,
    findById,
    findByUsernameOrEmail,
    findProfileById,
    getTwoFactorInfo,
    listAdminsByCompany,
    setTwoFactorSecret,
    updateLastSeen,
    updatePassword,
    enableTwoFactor,
    disableTwoFactor,
} from '../repositories/user.repository.js';
import { createTrialCompany, getPlanInfo } from '../repositories/company.repository.js';
import { getInviteForJoin, getInviteWithCompanyByCode, incrementInviteUses } from '../repositories/invite.repository.js';

const TWO_FACTOR_TEMP_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class AuthError extends Error {
    constructor(message, status = 500, code = null) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const resolvePlanInfo = async (companyId) => {
    const company = await getPlanInfo(companyId);
    if (!company) {
        return {
            planId: 'free',
            subscriptionStatus: 'inactive',
            trialEndsAt: null,
        };
    }
    return {
        planId: company.plan_id || 'free',
        subscriptionStatus: company.subscription_status || 'inactive',
        trialEndsAt: company.trial_ends_at || null,
    };
};

export async function register(payload) {
    const { companyName, username, email, password, fullName } = payload;
    const safeCompanyName = companyName.trim();
    const safeFullName = fullName || username;

    const existing = await findByUsernameOrEmail(username, email);
    if (existing) {
        throw new AuthError('Usuário ou email já existe', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const company = await createTrialCompany({
        name: safeCompanyName,
        trialEndsAt,
        maxSeats: 5,
    });

    const user = await createAdminUser({
        companyId: company.id,
        username,
        email,
        passwordHash,
        fullName: safeFullName,
    });

    const tokens = generateTokens(user);

    await cache.set(`session:${user.id}`, { userId: user.id, loginAt: Date.now() }, 86400 * 7);
    await cache.setPresence(user.id, 'online');

    return {
        user,
        company: {
            id: company.id,
            name: safeCompanyName,
            planId: 'trial',
            subscriptionStatus: 'trialing',
            trialEndsAt: trialEndsAt.toISOString(),
        },
        tokens,
    };
}

export async function getInviteInfo(code) {
    const invite = await getInviteWithCompanyByCode(code);
    if (!invite) {
        throw new AuthError('Convite inválido ou não encontrado.', 404);
    }

    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
        throw new AuthError('Este link de convite já expirou.', 400);
    }

    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
        throw new AuthError('Este link de convite atingiu o limite de usos.', 400);
    }

    return {
        companyId: invite.company_id,
        companyName: invite.company_name,
        logoUrl: invite.logo_url,
    };
}

export async function joinInvite(code, payload, { io } = {}) {
    const { username, email, password, fullName } = payload;

    const invite = await getInviteForJoin(code);
    if (!invite) {
        throw new AuthError('Convite inválido', 404);
    }

    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
        throw new AuthError('Convite expirado', 400);
    }

    if (invite.max_uses > 0 && invite.uses >= invite.max_uses) {
        throw new AuthError('Limite de convites atingido', 400);
    }

    const existing = await findByUsernameOrEmail(username, email);
    if (existing) {
        throw new AuthError('Usuário ou e-mail já existe', 409);
    }

    const safeFullName = fullName || username;
    const passwordHash = await bcrypt.hash(password, 12);

    const { user } = await createUserWithSeatLock(invite.company_id, {
        username,
        email,
        passwordHash,
        fullName: safeFullName,
        role: 'user',
    });

    await incrementInviteUses(invite.id);

    const tokens = generateTokens(user);

    if (io) {
        const admins = await listAdminsByCompany(invite.company_id);
        admins.forEach((admin) => {
            io.to(`user:${admin.id}`).emit('company:user_joined_via_invite', {
                userId: user.id,
                username: user.username,
                fullName: user.full_name,
            });
        });
    }

    await writeAuditLog({
        companyId: invite.company_id,
        action: 'invite.join',
        targetType: 'user',
        targetId: user.id,
        metadata: { username, email, inviteCode: code },
    });

    return { user, tokens };
}

export async function login(payload, { ipAddress = null, userAgent = null } = {}) {
    const { username, password } = payload;

    console.log('Login attempt:', { username, passwordLength: password?.length });

    const user = await findActiveByUsernameOrEmail(username);
    if (!user) {
        throw new AuthError('Credenciais inválidas', 401);
    }

    console.log('User found:', user.username, 'Role:', user.role);

    const validPassword = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', validPassword);

    if (!validPassword) {
        throw new AuthError('Credenciais inválidas', 401);
    }

    if (user.is_two_factor_enabled) {
        const tempToken = jwt.sign({ id: user.id, is2FA: true }, TWO_FACTOR_TEMP_SECRET, { expiresIn: '5m' });
        return {
            requires2FA: true,
            tempToken,
            userId: user.id,
        };
    }

    await updateLastSeen(user.id);
    const tokens = generateTokens(user);

    await cache.set(`session:${user.id}`, { userId: user.id, loginAt: Date.now() }, 86400 * 7);
    await cache.setPresence(user.id, 'online');

    const planInfo = await resolvePlanInfo(user.company_id);

    await writeAuditLog({
        companyId: user.company_id,
        actorId: user.id,
        action: 'auth.login',
        targetType: 'user',
        targetId: user.id,
        metadata: { username: user.username },
        ipAddress,
        userAgent,
    });

    return {
        user,
        planInfo,
        tokens,
    };
}

export async function loginWithGoogle(payload) {
    const { token } = payload;
    const { OAuth2Client } = await import('google-auth-library');
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '722758149135-onjg5g352a5kdvpvq7tff145bbmvvrfs.apps.googleusercontent.com';
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payloadInfo = ticket.getPayload();

    const googleEmail = payloadInfo.email;
    const googleName = payloadInfo.name;
    const googleAvatar = payloadInfo.picture;

    let user = await findActiveByEmail(googleEmail);

    if (!user) {
        const username = googleEmail.split('@')[0];
        const passwordHash = await bcrypt.hash(Math.random().toString(36), 12);
        const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const company = await createTrialCompany({
            name: `${googleName} Workspace`,
            trialEndsAt,
            maxSeats: 5,
        });

        user = await createAdminUser({
            companyId: company.id,
            username,
            email: googleEmail,
            passwordHash,
            fullName: googleName,
            avatarUrl: googleAvatar,
        });
        console.log('Criado usuario e empresa via Google Auth para', googleEmail);
    } else {
        console.log('Usuario existente logado via Google Auth', googleEmail);
    }

    if (user.is_two_factor_enabled) {
        const tempToken = jwt.sign({ id: user.id, is2FA: true }, TWO_FACTOR_TEMP_SECRET, { expiresIn: '5m' });
        return { requires2FA: true, tempToken, userId: user.id };
    }

    await updateLastSeen(user.id);
    const tokens = generateTokens(user);
    await cache.set(`session:${user.id}`, { userId: user.id, loginAt: Date.now() }, 86400 * 7);
    await cache.setPresence(user.id, 'online');

    const planInfo = await resolvePlanInfo(user.company_id);

    return { user, planInfo, tokens };
}

export async function logout(authHeader) {
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            await cache.del(`session:${decoded.id}`);
            await cache.setPresence(decoded.id, 'offline');
        } catch (error) {
            return;
        }
    }
}

export async function verifyLogin(payload) {
    const { tempToken, token } = payload;

    let decoded;
    try {
        decoded = jwt.verify(tempToken, TWO_FACTOR_TEMP_SECRET);
        if (!decoded.is2FA) {
            throw new Error('Invalid token type');
        }
    } catch (error) {
        throw new AuthError('Sessão 2FA expirada ou token inválido', 401);
    }

    const userId = decoded.id;
    const user = await findById(userId);

    if (!user || (!user.is_two_factor_enabled && !user.two_factor_secret)) {
        throw new AuthError('Usuário inválido ou 2FA não configurado', 400);
    }

    const { verifySync } = await import('otplib');
    const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
    const isValid = verification?.valid;

    if (!isValid) {
        throw new AuthError('Código 2FA inválido', 401);
    }

    await updateLastSeen(user.id);
    const tokens = generateTokens(user);
    await cache.set(`session:${user.id}`, { userId: user.id, loginAt: Date.now() }, 86400 * 7);
    await cache.setPresence(user.id, 'online');

    const planInfo = await resolvePlanInfo(user.company_id);

    return { user, planInfo, tokens };
}

export async function refreshSession(payload) {
    const { refreshToken } = payload;
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
        throw new AuthError('Refresh token inválido ou expirado', 401);
    }

    const user = await findActiveById(decoded.id);
    if (!user) {
        throw new AuthError('Usuário não encontrado', 401);
    }

    return generateTokens(user);
}

export async function getMe(token) {
    const JWT_SECRET = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await findProfileById(decoded.id);
    if (!user) {
        throw new AuthError('Usuário não encontrado', 404);
    }
    const planInfo = await resolvePlanInfo(user.company_id);
    return { user, planInfo };
}

export async function listPasswordResetRequests(token) {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (decoded.role !== 'admin') {
        throw new AuthError('Apenas administradores podem ver solicitações', 403);
    }

    const keys = await cache.keys('password_reset:*');
    const requests = [];
    for (const key of keys) {
        const request = await cache.get(key);
        if (request) {
            requests.push(request);
        }
    }
    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
    return requests;
}

export async function requestPasswordReset(payload, { io } = {}) {
    const { username } = payload;
    const user = await findActiveBasicByUsernameOrEmail(username);
    if (!user) {
        return {
            successMessage: 'Se o usuário existir, um administrador será notificado para resetar sua senha.',
        };
    }

    const resetRequest = {
        userId: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        requestedAt: new Date().toISOString(),
    };

    await cache.set(`password_reset:${user.id}`, resetRequest, 86400);

    if (io) {
        io.to('admin:all').emit('admin:password-reset-request', resetRequest);
    }

    console.log(`Password reset requested for user: ${user.username}`);

    return {
        successMessage: 'Solicitação enviada. Um administrador irá resetar sua senha em breve.',
    };
}

export async function adminResetPassword(token, payload) {
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    if (decoded.role !== 'admin') {
        throw new AuthError('Apenas administradores podem resetar senhas', 403);
    }

    const { userId, newPassword } = payload;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await updatePassword(userId, passwordHash);
    await cache.del(`password_reset:${userId}`);
    return { message: 'Senha resetada com sucesso' };
}

export async function generateTwoFactor({ id, email }) {
    const { generateSecret, generateURI } = await import('otplib');
    const QRCode = await import('qrcode');

    const secret = generateSecret();
    const otpauthContent = generateURI({ secret, label: 'Lanly Enterprise', issuer: 'Lanly', accountName: email, type: 'totp' });
    const qrCodeUrl = await QRCode.toDataURL(otpauthContent);

    await setTwoFactorSecret(id, secret);

    return { secret, qrCodeUrl, otpauthUrl: otpauthContent };
}

export async function verifyTwoFactor(userId, token) {
    const { verifySync } = await import('otplib');

    const user = await getTwoFactorInfo(userId);
    if (!user || !user.two_factor_secret) {
        throw new AuthError('2FA não configurado', 400);
    }

    const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
    const isValid = verification?.valid;

    if (!isValid) {
        throw new AuthError('Código inválido', 400);
    }

    if (!user.is_two_factor_enabled) {
        await enableTwoFactor(userId);
    }

    return { message: '2FA ativado com sucesso' };
}

export async function disableTwoFactorAuth(userId, token) {
    const { verifySync } = await import('otplib');

    const user = await getTwoFactorInfo(userId);
    if (!user || !user.two_factor_secret) {
        throw new AuthError('2FA não está ativo', 400);
    }

    const verification = verifySync({ token, secret: user.two_factor_secret, type: 'totp' });
    const isValid = verification?.valid;

    if (!isValid) {
        throw new AuthError('Código inválido', 400);
    }

    await disableTwoFactor(userId);

    return { message: '2FA desativado' };
}
