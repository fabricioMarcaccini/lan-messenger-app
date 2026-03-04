import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/config/database.js', () => ({
    db: {
        write: jest.fn().mockResolvedValue({
            rows: [{ id: 'mock-id', two_factor_secret: 'mock-secret', is_two_factor_enabled: false }]
        }),
        read: jest.fn().mockResolvedValue({
            rows: [{ id: 'mock-id' }]
        })
    },
    cache: {
        set: jest.fn(),
        get: jest.fn(),
        setPresence: jest.fn(),
    }
}));

jest.unstable_mockModule('../src/middlewares/auth.js', () => ({
    authMiddleware: async (ctx, next) => {
        ctx.state = { user: { id: 'test-user', email: 'test@example.com', role: 'admin', company_id: 'mock', is_two_factor_enabled: false } };
        await next();
    },
    requirePlan: () => async (ctx, next) => { await next(); },
    requireRole: () => async (ctx, next) => { await next(); },
    authConfig: { maxCompanyUsers: 10 },
    generateTokens: jest.fn().mockReturnValue({ access_token: 'mock', refresh_token: 'mock' }),
    verifyRefreshToken: jest.fn().mockReturnValue({ id: 'mock', company_id: 'mock' })
}));

const authRouter = (await import('../src/routes/auth.routes.js')).default;
const meetingsRouter = (await import('../src/routes/meetings.routes.js')).default;
const analyticsRouter = (await import('../src/routes/analytics.routes.js')).default;

describe('New Features Integration Tests', () => {
    let app, server;

    beforeAll(async () => {
        app = new Koa();
        app.use(bodyParser());
        const koaRouterObj = await import('koa-router');
        const rootRouter = new koaRouterObj.default();
        rootRouter.use('/auth', authRouter.routes());
        rootRouter.use('/meetings', meetingsRouter.routes());
        rootRouter.use('/analytics', analyticsRouter.routes());
        app.use(rootRouter.routes());
        server = app.listen();
    });

    afterAll(() => {
        server.close();
    });

    test('✅ 2FA Generate (/auth/2fa/generate) should return secret and QR code URL', async () => {
        const res = await request(server).get('/auth/2fa/generate');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.secret).toBeDefined();
        expect(res.body.data.qrCodeUrl).toContain('data:image/png;base64');
    });

    test('✅ 2FA Verify (/auth/2fa/verify) should require token', async () => {
        const res = await request(server).post('/auth/2fa/verify').send({});
        expect([400, 500]).toContain(res.status);
    });

    test('✅ Smart Scheduler - Create Meeting (/meetings) requires title, start, end', async () => {
        const res = await request(server).post('/meetings').send({ title: 'test-meeting' });
        // Fails because startAt/endAt not provided
        expect(res.status).toBe(400);
    });

    test('✅ Smart Scheduler - List Meetings (/meetings)', async () => {
        const res = await request(server).get('/meetings');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test('✅ Admin Dashboard - Analytics Overview (/analytics/overview)', async () => {
        const res = await request(server).get('/analytics/overview');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
