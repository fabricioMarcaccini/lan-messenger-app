import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../config/database.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

export const authMiddleware = async (ctx, next) => {
    // Browsers don't send Authorization headers on preflight OPTIONS requests
    if (ctx.method === 'OPTIONS') {
        await next();
        return;
    }

    const authHeader = ctx.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { success: false, message: 'Token de acesso não fornecido' };
        return;
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            ctx.status = 401;
            ctx.body = { success: false, message: 'Token expirado', code: 'TOKEN_EXPIRED' };
            return;
        } else {
            ctx.status = 401;
            ctx.body = { success: false, message: 'Token inválido' };
            return;
        }
    }

    ctx.state.user = decoded;
    await next();
};

export const adminMiddleware = async (ctx, next) => {
    if (ctx.state.user?.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado. Requer privilégios de administrador.' };
        return;
    }
    await next();
};

// Middleware: Require specific plan(s) for accessing a route
// Usage: requirePlan('max') or requirePlan('medium', 'max')
export const requirePlan = (...allowedPlans) => {
    return async (ctx, next) => {
        const companyId = ctx.state.user?.companyId;

        if (!companyId) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: 'Acesso negado. Usuário não associado a nenhuma empresa.',
                code: 'NO_COMPANY',
            };
            return;
        }

        try {
            const result = await db.write(
                'SELECT plan_id, subscription_status, trial_ends_at FROM companies WHERE id = $1',
                [companyId]
            );

            const company = result.rows[0];
            const currentPlan = company?.plan_id || 'free';
            const status = company?.subscription_status || 'inactive';
            const trialEndsAt = company?.trial_ends_at ? new Date(company.trial_ends_at) : null;

            // Allow access if trial is still active
            if (currentPlan === 'trial' && trialEndsAt && trialEndsAt > new Date()) {
                await next();
                return;
            }

            // Allow access if plan matches and subscription is active (or free tier)
            if (allowedPlans.includes(currentPlan) && (status === 'active' || currentPlan === 'free')) {
                await next();
                return;
            }

            const planLabel = allowedPlans.includes('max') ? 'Max' : allowedPlans.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ou ');

            ctx.status = 403;
            ctx.body = {
                success: false,
                message: `Faça upgrade para o plano ${planLabel} para liberar a Inteligência Artificial.`,
                code: 'PLAN_UPGRADE_REQUIRED',
                currentPlan,
                requiredPlans: allowedPlans,
            };
        } catch (error) {
            console.error('requirePlan middleware error:', error.message);
            ctx.status = 500;
            ctx.body = { success: false, message: 'Erro ao verificar plano.' };
        }
    };
};

// Middleware: Check if company has available seats before creating user
export const requireMaxSeats = async (ctx, next) => {
    const companyId = ctx.state.user?.companyId || ctx.request.body?.companyId;

    if (!companyId) {
        await next();
        return;
    }

    try {
        const companyResult = await db.write(
            'SELECT max_seats FROM companies WHERE id = $1',
            [companyId]
        );
        const maxSeats = companyResult.rows[0]?.max_seats || 5;

        const usersResult = await db.write(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
            [companyId]
        );
        const activeUsers = parseInt(usersResult.rows[0].count, 10);

        if (activeUsers >= maxSeats) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: `Limite de ${maxSeats} usuários atingido. Adicione mais seats na sua assinatura para cadastrar novos membros.`,
                code: 'SEAT_LIMIT_REACHED',
                maxSeats,
                activeUsers,
            };
            return;
        }

        await next();
    } catch (error) {
        console.error('requireMaxSeats middleware error:', error.message);
        await next(); // Don't block user creation on middleware error
    }
};

export const generateTokens = (user) => {
    const accessToken = jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            companyId: user.company_id,
        },
        JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
    );

    const refreshToken = jwt.sign(
        { id: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
    );

    return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }
        return decoded;
    } catch (error) {
        return null;
    }
};
