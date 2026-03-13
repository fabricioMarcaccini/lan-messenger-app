import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { koaBody } from 'koa-body';
import serve from 'koa-static';
import mount from 'koa-mount';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import helmet from 'koa-helmet';
import compress from 'koa-compress';
import ratelimit from 'koa-ratelimit';
import fs from 'fs';
import zlib from 'zlib';

import logger from './utils/logger.js';

import { checkDatabaseConnections } from './config/database.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import companiesRoutes from './routes/companies.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import networkRoutes from './routes/network.routes.js';
import permissionsRoutes from './routes/permissions.routes.js';
import uploadsRoutes from './routes/uploads.routes.js';
import aiRoutes from './routes/ai.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import meetingsRoutes from './routes/meetings.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import auditRoutes from './routes/audit.routes.js';
import stickersRoutes from './routes/stickers.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import wikiRoutes from './routes/wiki.routes.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { auditMiddleware } from './middlewares/audit.middleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = new Koa();
const router = new Router();
const httpServer = createServer(app.callback());

// Advanced CORS logic avoiding exact string mismatches in Vercel
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://localhost:3000',
    'https://app.lanly.com.br',
    'https://lanly.com.br'
].filter(Boolean);

const verifyOrigin = (ctx) => {
    const origin = ctx.get('Origin');
    if (!origin) return allowedOrigins[0] || '*';
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return origin;
    }
    return allowedOrigins[0];
};

// Socket.IO setup
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from './config/database.js';

const io = new SocketIO(httpServer, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for file uploads
});

// Configure Redis Adapter for Horizontal Scaling (only if Redis URL/HOST is provided)
if ((process.env.REDIS_URL || process.env.REDIS_HOST) && process.env.REDIS_HOST !== 'localhost') {
    const pubClient = redis;
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('🔗 Redis Adapter configured for Socket.IO horizontal scaling');
}

// Middleware
app.use(cors({
    origin: verifyOrigin,
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    exposeHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
}));

// 🛡️ Global Error Handler — catches unhandled errors in all routes
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        const status = err.status || err.statusCode || 500;
        const message = status === 500 ? 'Erro interno do servidor' : err.message;

        // Log full error for 500s
        if (status >= 500) {
            logger.error(`[${ctx.method}] ${ctx.url} → ${status}: ${err.message}`);
            logger.error(err.stack);
        }

        ctx.status = status;
        ctx.body = {
            success: false,
            message,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
        };
    }
});

// Serve uploaded files as static
app.use(mount('/uploads', serve(path.join(__dirname, '..', 'uploads'))));

// ⚡ CRITICAL: Raw body capture for Stripe webhook — MUST be BEFORE koaBody
// Stripe requires the raw body (Buffer) to verify webhook signatures.
// koaBody would parse it first, breaking verification on Render/production.
app.use(async (ctx, next) => {
    if (ctx.path === '/api/stripe/webhook' && ctx.method === 'POST') {
        const chunks = [];
        for await (const chunk of ctx.req) {
            chunks.push(chunk);
        }
        ctx.request.rawBody = Buffer.concat(chunks);
        // Set an empty body so koaBody skips this request
        ctx.request.body = {};
        ctx.req._stripeRawBodyRead = true;
    }
    await next();
});

// Body parser with multipart support (skips Stripe webhook due to raw body above)
app.use(koaBody({
    multipart: true,
    formidable: {
        maxFileSize: 50 * 1024 * 1024, // 50MB max file size
        keepExtensions: true,
    },
}));

// Security Headers — disable cross-origin policies that conflict with CORS for our cross-origin setup
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'unsafe-none' },
    contentSecurityPolicy: false,
}));

// Compression (gzip/deflate/brotli)
app.use(compress({
    threshold: 2048,
    gzip: { flush: zlib.constants.Z_SYNC_FLUSH },
    deflate: { flush: zlib.constants.Z_SYNC_FLUSH },
    br: false // disable if brotli is not needed
}));

// Rate Limiting
const db_rate = new Map();
app.use(ratelimit({
    driver: 'memory',
    db: db_rate,
    duration: 60000,
    errorMessage: 'Algumas vezes, devagar é melhor. Limite de requisições excedido.',
    id: (ctx) => ctx.ip,
    headers: {
        remaining: 'Rate-Limit-Remaining',
        reset: 'Rate-Limit-Reset',
        total: 'Rate-Limit-Total'
    },
    max: 200, // max 200 requests per minute per IP
    disableHeader: false
}));

app.use(async (ctx, next) => {
    const start = Date.now();
    try {
        await next();
        const ms = Date.now() - start;
        logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${ms}ms`);
    } catch (err) {
        const ms = Date.now() - start;
        logger.error(`${ctx.method} ${ctx.url} - ${err.status || 500} - ${ms}ms - ${err.message}`);
        const isDev = process.env.NODE_ENV === 'development';
        ctx.status = err.status || 500;
        ctx.body = {
            success: false,
            message: isDev ? (err.message || 'Internal Server Error') : (err.status && err.status < 500 ? err.message : 'Internal Server Error'),
            stack: isDev ? err.stack : undefined,
            detail: isDev ? (err.detail || err.hint || null) : undefined
        };
    }
});

// Inject audit helper into every request context
app.use(auditMiddleware);

// Health check route
router.get('/health', async (ctx) => {
    const dbStatus = await checkDatabaseConnections();
    ctx.body = {
        success: true,
        status: 'healthy',
        databases: dbStatus,
        timestamp: new Date().toISOString(),
    };
});

// API routes
router.use('/api/auth', authRoutes.routes());
router.use('/api/users', usersRoutes.routes());
router.use('/api/companies', companiesRoutes.routes());
router.use('/api/messages', messagesRoutes.routes());
router.use('/api/network', networkRoutes.routes());
router.use('/api/permissions', permissionsRoutes.routes());
router.use('/api/uploads', uploadsRoutes.routes());
router.use('/api/ai', aiRoutes.routes());
router.use('/api/stripe', stripeRoutes.routes());
router.use('/api/meetings', meetingsRoutes.routes());
router.use('/api/analytics', analyticsRoutes.routes());
router.use('/api/audit', auditRoutes.routes());
router.use('/api/stickers', stickersRoutes.routes());
router.use('/api/notifications', notificationsRoutes.routes());
router.use('/api/tasks', tasksRoutes.routes());
router.use('/api/wiki', wikiRoutes.routes());

app.use(router.routes());
app.use(router.allowedMethods());

// Optional: Serve frontend in production as fallback
if (process.env.NODE_ENV === 'production') {
    const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
    app.use(mount('/', serve(frontendDist)));

    // Catch-all route to serve index.html for Vue Router history mode
    app.use(async (ctx, next) => {
        if (!ctx.path.startsWith('/api') && ctx.method === 'GET') {
            const indexPath = path.join(frontendDist, 'index.html');
            if (fs.existsSync(indexPath)) {
                ctx.type = 'html';
                ctx.body = fs.createReadStream(indexPath);
            } else {
                await next();
            }
        } else {
            await next();
        }
    });
}

// Socket.IO handlers
setupSocketHandlers(io);

// Make io accessible to routes
app.context.io = io;

// Start server
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, async () => {
    const startupStr = `
╔════════════════════════════════════════════════════════════╗
║                   LANLY APP SERVER                          ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Server running on http://localhost:${PORT}               ║
║  📡 Socket.IO enabled                                        ║
║  🌍 NODE_ENV: ${process.env.NODE_ENV || 'development'}
╚════════════════════════════════════════════════════════════╝
    `;
    logger.info(startupStr);
    console.log(startupStr);

    // Check database connections
    const dbStatus = await checkDatabaseConnections();
    logger.info('Database connections:');
    logger.info(`  PostgreSQL: ${dbStatus.postgres ? '✅ Connected' : '❌ Failed'}`);
    logger.info(`  Redis:      ${dbStatus.redis ? '✅ Connected' : '❌ Failed'}`);

});

export { app, io, httpServer };
