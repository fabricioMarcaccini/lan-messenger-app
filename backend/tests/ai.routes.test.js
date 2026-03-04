import request from 'supertest';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { jest } from '@jest/globals';

// Set environment variables for tests
process.env.OPENROUTER_API_KEY = 'test_key';
process.env.GROQ_API_KEY = 'test_key';

// Mocks have to be defined before imports for ESM in jest if needed, but since it's an integration test with route, we can just mock db 

const mockAskOpenRouter = jest.fn();
jest.unstable_mockModule('../src/config/database.js', () => ({
    db: {
        write: jest.fn(),
        read: jest.fn()
    }
}));

// Mock auth middleware
jest.unstable_mockModule('../src/middlewares/auth.js', () => ({
    authMiddleware: async (ctx, next) => {
        ctx.state = { user: { id: 'test-user', company_id: 'test-company' } };
        await next();
    },
    requirePlan: () => async (ctx, next) => { await next(); },
    requireRole: () => async (ctx, next) => { await next(); },
    authConfig: { maxCompanyUsers: 10 }
}));

const aiRouter = (await import('../src/routes/ai.routes.js')).default;

describe('AI Routes Unit Tests', () => {
    let app;
    let server;

    beforeAll(() => {
        app = new Koa();
        app.use(bodyParser());
        app.use(aiRouter.routes());
        server = app.listen();
    });

    afterAll(() => {
        server.close();
    });

    it('POST /magic-text should return 400 if text is missing', async () => {
        const response = await request(server)
            .post('/magic-text')
            .send({ action: 'professional' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('POST /translate-message should return 400 if text is missing', async () => {
        const response = await request(server)
            .post('/translate-message')
            .send({ targetLanguage: 'en' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });

    it('POST /transcribe-audio should return 400 if fileId is missing', async () => {
        const response = await request(server)
            .post('/transcribe-audio')
            .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
    });
});
