import { vi, describe, it, expect, beforeEach } from 'vitest';
import { auditMiddleware } from './auditMiddleware.js';

// Mock DB
vi.mock('../config/database.js', () => ({
  db: {
    write: vi.fn(() => Promise.resolve()), // Return a promise so .catch() works
  }
}));

import { db } from '../config/database.js';

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
        // Mock DB returning a previous state
        db.write.mockResolvedValueOnce({
            rows: [{ _id: 'task-123', status: 'TODO', title: 'Old Title' }]
        });

        // Simula request payload
        ctx.request.body = { status: 'DONE', title: 'New Title', noChange: 'Keep' };
        
        // Simula response payload (newState)
        ctx.body = { 
            data: { _id: 'task-123', status: 'DONE', title: 'New Title', no_change: 'Keep' }
        };

        const middleware = auditMiddleware('task');
        await middleware(ctx, next);

        // Previous State is fetched
        expect(db.write).toHaveBeenCalledWith('SELECT * FROM tasks WHERE id = $1', ['task-123']);
        
        // Next is called
        expect(next).toHaveBeenCalled();

        // Audit Write logic (Fire and Forget)
        // Wait a tick for the loose promise to run
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(db.write).toHaveBeenCalledTimes(2);
        expect(db.write.mock.calls[1][0]).toContain('INSERT INTO task_activities');
        
        const params = db.write.mock.calls[1][1];
        expect(params[0]).toBe('task-123');
        expect(params[1]).toBe('user-456');
        
        // Changed fields should be ['status', 'title']
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
        
        // Select was called, but Insert was not
        expect(db.write).toHaveBeenCalledTimes(1); 
    });
});
