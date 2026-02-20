import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

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
