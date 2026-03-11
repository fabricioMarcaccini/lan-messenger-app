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
    crossOriginOpenerPolicy: false,
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

    // 🔥 Auto-Migration to ensure new WebRTC / Chat feature columns exist in production database
    try {
        if (dbStatus.postgres) {
            console.log('🔄 Executando sincronização de esquema segura no PostgreSQL...');
            const { db } = await import('./config/database.js');
            await db.write('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
            await db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_admins UUID[] DEFAULT '{}'");
            await db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS description TEXT");
            await db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS creator_id UUID");
            await db.write("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT false");

            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false');
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP');

            // New Enterprise Features: Replies, Reactions, and Expiring messages
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id)');
            await db.write("ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'");
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP');

            // Feature: Full-Text Search
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS search_vector tsvector');
            await db.write('CREATE INDEX IF NOT EXISTS idx_messages_search_vector ON messages USING gin(search_vector)');
            await db.write(`
                CREATE OR REPLACE FUNCTION messages_search_vector_update() RETURNS trigger AS $$
                BEGIN
                    NEW.search_vector := to_tsvector('portuguese', COALESCE(NEW.content, ''));
                    RETURN NEW;
                END
                $$ LANGUAGE plpgsql;
            `);
            await db.write('DROP TRIGGER IF EXISTS messages_search_vector_update_trigger ON messages');
            await db.write(`
                CREATE TRIGGER messages_search_vector_update_trigger
                BEFORE INSERT OR UPDATE ON messages
                FOR EACH ROW EXECUTE FUNCTION messages_search_vector_update()
            `);

            // 🚀 FEATURE: Enterprise 2FA (Two-Factor Authentication)
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255)');
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_two_factor_enabled BOOLEAN DEFAULT false');
            await db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS enforce_two_factor BOOLEAN DEFAULT false');

            // 🚀 FEATURE: Threading (Tópicos Isolados)
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES messages(id)');
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_count INT DEFAULT 0');
            await db.write('CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)');

            try { await db.write("ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_type_check"); } catch (e) { }
            await db.write("ALTER TABLE messages ADD CONSTRAINT messages_content_type_check CHECK (content_type IN ('text', 'file', 'image', 'video', 'audio', 'pdf', 'deleted', 'call', 'poll', 'meeting'))");

            // Feature: Mensagens fixadas
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false');
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_by UUID');
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP');
            await db.write('ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP');

            // Feature: Status personalizado
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_emoji VARCHAR(10)');
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_text VARCHAR(100)');
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status_expires_at TIMESTAMP');
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS ooo_until TIMESTAMP');
            await db.write('ALTER TABLE users ADD COLUMN IF NOT EXISTS ooo_message VARCHAR(255)');

            // Feature: Enquetes
            await db.write(`
                CREATE TABLE IF NOT EXISTS poll_votes (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    option_index INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(message_id, user_id, option_index)
                )
            `);
            await db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS option_index INTEGER');
            await db.write('ALTER TABLE poll_votes ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
            await db.write('CREATE INDEX IF NOT EXISTS idx_poll_votes_message ON poll_votes(message_id)');

            // Feature: Reuniões
            await db.write(`
                CREATE TABLE IF NOT EXISTS meetings (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    start_at TIMESTAMP NOT NULL,
                    end_at TIMESTAMP,
                    meeting_link TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES users(id) ON DELETE SET NULL');
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS title VARCHAR(255)');
            await db.write("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''");
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS start_at TIMESTAMP');
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS end_at TIMESTAMP');
            await db.write("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_link TEXT DEFAULT ''");
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
            await db.write('ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()');
            await db.write(`
                CREATE OR REPLACE FUNCTION sync_meetings_time_columns()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                BEGIN
                    IF NEW.start_at IS NULL AND NEW.start_time IS NOT NULL THEN
                        NEW.start_at := NEW.start_time;
                    END IF;

                    IF NEW.start_time IS NULL AND NEW.start_at IS NOT NULL THEN
                        NEW.start_time := NEW.start_at;
                    END IF;

                    IF NEW.end_at IS NULL AND NEW.end_time IS NOT NULL THEN
                        NEW.end_at := NEW.end_time;
                    END IF;

                    IF NEW.end_time IS NULL THEN
                        NEW.end_time := COALESCE(NEW.end_at, NEW.start_time, NEW.start_at);
                    END IF;

                    IF NEW.end_at IS NULL THEN
                        NEW.end_at := NEW.end_time;
                    END IF;

                    RETURN NEW;
                END;
                $$;
            `);
            await db.write('DROP TRIGGER IF EXISTS trg_sync_meetings_time_columns ON meetings');
            await db.write(`
                CREATE TRIGGER trg_sync_meetings_time_columns
                BEFORE INSERT OR UPDATE ON meetings
                FOR EACH ROW
                EXECUTE FUNCTION sync_meetings_time_columns()
            `);
            await db.write(`
                CREATE TABLE IF NOT EXISTS meeting_rsvps (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(meeting_id, user_id)
                )
            `);
            await db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE');
            await db.write("ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
            await db.write('ALTER TABLE meeting_rsvps ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
            await db.write('CREATE INDEX IF NOT EXISTS idx_meetings_company_start ON meetings(company_id, start_at)');
            await db.write('CREATE INDEX IF NOT EXISTS idx_meeting_rsvps_meeting ON meeting_rsvps(meeting_id)');

            // Feature: Auditoria
            await db.write(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    action VARCHAR(100) NOT NULL,
                    target_type VARCHAR(50),
                    target_id UUID,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100)');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_type VARCHAR(50)');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS target_id UUID');
            await db.write("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'");
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT');
            await db.write('ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
            await db.write('CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id)');
            await db.write('CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC)');

            // Feature: Menções
            await db.write(`
                CREATE TABLE IF NOT EXISTS mentions (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    is_read BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioned_user_id UUID REFERENCES users(id) ON DELETE CASCADE');
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS mentioner_id UUID REFERENCES users(id) ON DELETE SET NULL');
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false');
            await db.write('ALTER TABLE mentions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()');
            await db.write('CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id)');

            console.log('✅ Novas Funcionalidades (Bot, Fixar, Enquetes, Reuniões, Auditoria, Menções, Status) Sincronizadas!');

            // Ensure file_uploads table has the file_data column for DB-based file storage
            await db.write('ALTER TABLE file_uploads ADD COLUMN IF NOT EXISTS file_data TEXT');
            console.log('✅ Coluna file_data sincronizada na tabela file_uploads!');

            // 🔵 Stripe Billing: Colunas de assinatura na tabela companies
            await db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_id VARCHAR(20) DEFAULT 'free'");
            await db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive'");
            await db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)');
            await db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)');
            await db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS max_seats INTEGER DEFAULT 5');
            await db.write('ALTER TABLE companies ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP');
            console.log('✅ Colunas de Stripe Billing sincronizadas na tabela companies!');

            // 🔵 BYOK IA: Chave Própria OpenRouter e Créditos
            await db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS openrouter_api_key VARCHAR(255)");
            await db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS groq_api_key VARCHAR(255)");
            await db.write("ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_credits_balance INTEGER DEFAULT 50"); // 50 credits free to start
            console.log('✅ Colunas BYOK (OpenRouter/Groq) e Créditos de IA sincronizados!');

            // 🚀 FEATURE: ONBOARDING TURBO (Links Mágicos)
            await db.write(`
                CREATE TABLE IF NOT EXISTS company_invites (
                    id SERIAL PRIMARY KEY,
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    code VARCHAR(50) UNIQUE NOT NULL,
                    max_uses INTEGER DEFAULT 50,
                    uses INTEGER DEFAULT 0,
                    expires_at TIMESTAMP,
                    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await db.write('CREATE INDEX IF NOT EXISTS idx_company_invites_code ON company_invites(code)');
            console.log('✅ Tabela de Convites Inteligentes (Onboarding Turbo) sincronizada!');

            // 🚀 FEATURE: PUSH NOTIFICATIONS (Service Worker)
            await db.write(`
                CREATE TABLE IF NOT EXISTS push_subscriptions (
                    id SERIAL PRIMARY KEY,
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    endpoint TEXT NOT NULL,
                    auth_key VARCHAR(255) NOT NULL,
                    p256dh_key VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(endpoint)
                )
            `);
            await db.write('CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id)');
            console.log('✅ Tabela de Notificações Push (Web Push) sincronizada!');

            // 🚀 FEATURE: PRODUTIVIDADE (KANBAN & TAREFAS)
            await db.write(`
                CREATE TABLE IF NOT EXISTS task_columns (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    title VARCHAR(255) NOT NULL,
                    position INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('CREATE INDEX IF NOT EXISTS idx_task_columns_conversation ON task_columns(conversation_id)');

            await db.write(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    column_id UUID REFERENCES task_columns(id) ON DELETE CASCADE,
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
                    position INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('CREATE INDEX IF NOT EXISTS idx_tasks_conversation ON tasks(conversation_id)');

            // 🚀 FEATURE: WIKI DA EQUIPE (NOTION-LIKE)
            await db.write(`
                CREATE TABLE IF NOT EXISTS wiki_pages (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
                    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
                    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
                    title VARCHAR(255) NOT NULL,
                    content TEXT,
                    emoji VARCHAR(20) DEFAULT '📄',
                    parent_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);
            await db.write('CREATE INDEX IF NOT EXISTS idx_wiki_pages_conversation ON wiki_pages(conversation_id)');
            console.log('✅ Tabelas de Kanban e Wiki sincronizadas!');
        }
    } catch (err) {
        console.error('❌ Aviso: Falha ao sincronizar esquema automático:', err.message);
    }
});

export { app, io, httpServer };
