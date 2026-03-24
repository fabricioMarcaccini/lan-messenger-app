import { vi, describe, it, expect, beforeEach } from 'vitest';
import { auditMiddleware } from '../src/middlewares/auditMiddleware.js';

// Mock DB
vi.mock('../src/config/database.js', () => ({
  db: {
    write: vi.fn(() => Promise.resolve()), // Return a promise so .catch() works
  }
}));

import { db } from '../src/config/database.js';

describe('auditMiddleware', () => {
    let ctx;
    let next;

    beforeEach(() => {
        vi.clearAllMocks();
        ctx = {
            params: { taskId: 'task-123' },
            state: { user: { id: 'user-456' } },
            request: { body: {} },
            status: 200,
            body: {}
        };
        next = vi.fn().mockResolvedValue();
    });

    it('should proceed if no taskId or user is present', async () => {
        ctx.params = {};
        const middleware = auditMiddleware('task');
        await middleware(ctx, next);
        expect(next).toHaveBeenCalled();
        expect(db.write).not.toHaveBeenCalled();
    });

    it('should identify changes and save audit log when fields differ', async () => {
        db.write.mockResolvedValueOnce({
            rows: [{ _id: 'task-123', status: 'TODO', title: 'Old Title' }]
        });

        ctx.request.body = { status: 'DONE', title: 'New Title' };
        
        ctx.body = { 
            data: { _id: 'task-123', status: 'DONE', title: 'New Title' }
        };

        const middleware = auditMiddleware('task');
        await middleware(ctx, next);

        expect(db.write).toHaveBeenCalledWith('SELECT * FROM tasks WHERE id = $1', ['task-123']);
        expect(next).toHaveBeenCalled();

        await new Promise(resolve => setTimeout(resolve, 0));

        expect(db.write).toHaveBeenCalledTimes(2);
        expect(db.write.mock.calls[1][0]).toContain('INSERT INTO task_activities');
        
        const params = db.write.mock.calls[1][1];
        expect(params[0]).toBe('task-123');
        expect(params[1]).toBe('user-456');
        expect(params[4]).toEqual(['status', 'title']);
    });

    it('should not log if nothing changed', async () => {
        db.write.mockResolvedValueOnce({
            rows: [{ status: 'TODO' }]
        });
        
        ctx.request.body = { status: 'TODO' };
        ctx.body = { data: { status: 'TODO' } };

        const middleware = auditMiddleware('task');
        await middleware(ctx, next);

        await new Promise(resolve => setTimeout(resolve, 0));
        
        expect(db.write).toHaveBeenCalledTimes(1); 
    });
});
