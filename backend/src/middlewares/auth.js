import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { db } from '../config/database.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('❌ FATAL: JWT_SECRET não definido no .env. Encerrando.');
    process.exit(1);
}

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
// Uses SELECT ... FOR UPDATE to acquire a row-level lock on the company row,
// preventing race conditions where multiple concurrent requests could bypass the limit.
export const requireMaxSeats = async (ctx, next) => {
    const companyId = ctx.state.user?.companyId || ctx.request.body?.companyId;

    if (!companyId) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'company_id é obrigatório', code: 'NO_COMPANY' };
        return; // BLOCK — nunca permitir criação sem empresa
    }

    try {
        // Use a transaction with FOR UPDATE to lock the company row
        // This prevents race conditions (TOCTOU) during concurrent user creation
        const result = await db.transaction(async (client) => {
            // 1. Lock the company row — any other concurrent transaction will WAIT here
            const companyResult = await client.query(
                'SELECT max_seats FROM companies WHERE id = $1 FOR UPDATE',
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                throw Object.assign(new Error('Empresa não encontrada'), { status: 404, code: 'COMPANY_NOT_FOUND' });
            }

            const maxSeats = companyResult.rows[0].max_seats || 5;

            // 2. Count current active users (within the locked transaction)
            const usersResult = await client.query(
                'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
                [companyId]
            );
            const activeUsers = parseInt(usersResult.rows[0].count, 10);

            // 3. Block if limit reached
            if (activeUsers >= maxSeats) {
                throw Object.assign(
                    new Error(`Limite de ${maxSeats} usuários atingido. Faça upgrade do plano para adicionar mais membros.`),
                    { status: 403, code: 'SEAT_LIMIT_REACHED', maxSeats, activeUsers }
                );
            }

            return { maxSeats, activeUsers, seatsAvailable: maxSeats - activeUsers };
        });

        // Pass seat info to the route handler
        ctx.state.seatInfo = result;
        await next();
    } catch (error) {
        // NEVER allow passthrough on error — this is a security boundary
        const status = error.status || 500;
        ctx.status = status;
        ctx.body = {
            success: false,
            message: error.message,
            code: error.code || 'SEAT_CHECK_FAILED',
            ...(error.maxSeats && { maxSeats: error.maxSeats }),
            ...(error.activeUsers !== undefined && { activeUsers: error.activeUsers }),
        };
        // DO NOT call next() — block user creation
    }
};

// Helper: Create user within a seat-locked transaction (ACID-safe, race-condition proof)
// Use this for any code path that creates a user to guarantee atomicity
export const createUserWithSeatLock = async (companyId, userData) => {
    return db.transaction(async (client) => {
        // 1. Lock the company row
        const companyResult = await client.query(
            'SELECT max_seats FROM companies WHERE id = $1 FOR UPDATE',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            throw Object.assign(new Error('Empresa não encontrada'), { status: 404, code: 'COMPANY_NOT_FOUND' });
        }

        const maxSeats = companyResult.rows[0].max_seats || 5;

        // 2. Count active users (locked)
        const usersResult = await client.query(
            'SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true',
            [companyId]
        );
        const activeUsers = parseInt(usersResult.rows[0].count, 10);

        // 3. Block if at capacity
        if (activeUsers >= maxSeats) {
            throw Object.assign(
                new Error(`Limite de ${maxSeats} usuários atingido (${activeUsers}/${maxSeats}). Faça upgrade do plano.`),
                { status: 403, code: 'SEAT_LIMIT_REACHED', maxSeats, activeUsers }
            );
        }

        // 4. INSERT user within the same transaction — atomically safe
        const { username, email, passwordHash, fullName, role, department, position } = userData;
        const insertResult = await client.query(
            `INSERT INTO users (company_id, username, email, password_hash, full_name, role, department, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, username, email, full_name, role`,
            [companyId, username, email, passwordHash, fullName || username, role || 'user', department || null, position || null]
        );

        return {
            user: insertResult.rows[0],
            seatInfo: { maxSeats, activeUsers: activeUsers + 1, seatsRemaining: maxSeats - activeUsers - 1 }
        };
    });
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
