import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';
import Joi from 'joi';

const router = new Router();
router.use(authMiddleware);

// Middleware for checking conversation access
async function checkAccess(ctx, conversationId) {
    const userId = ctx.state.user.id;
    const convCheck = await db.write(
        'SELECT id FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [conversationId, userId]
    );
    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado à conversa' };
        return false;
    }
    return true;
}

// Middleware for checking conversation admin access (to edit structures like columns)
async function checkAdminAccess(ctx, conversationId) {
    const userId = ctx.state.user.id;
    const userRole = ctx.state.user.role;

    // System admins bypass this check
    if (userRole === 'admin') return true;

    const convCheck = await db.write(
        'SELECT id, creator_id, group_admins FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [conversationId, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado à conversa' };
        return false;
    }

    const conv = convCheck.rows[0];
    const isCreator = conv.creator_id === userId;
    const isGroupAdmin = conv.group_admins && conv.group_admins.includes(userId);

    if (!isCreator && !isGroupAdmin) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Privilégios insuficientes para alterar a estrutura do Kanban' };
        return false;
    }

    return true;
}

// GET /api/tasks/:conversationId/board
// Get all columns and their tasks
router.get('/:conversationId/board', async (ctx) => {
    const { conversationId } = ctx.params;

    if (!(await checkAccess(ctx, conversationId))) return;

    // Fetch Columns
    const columnsResult = await db.write(
        'SELECT id, title, position FROM task_columns WHERE conversation_id = $1 ORDER BY position ASC, created_at ASC',
        [conversationId]
    );

    // Fetch Tasks with basic user info
    const tasksResult = await db.write(`
        SELECT t.id, t.column_id, t.title, t.description, t.position, t.source_message_id, t.created_at,
               t.assignee_id, u.username as assignee_username, u.full_name as assignee_name, u.avatar_url as assignee_avatar
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.conversation_id = $1
        ORDER BY t.position ASC, t.created_at DESC
    `, [conversationId]);

    ctx.body = {
        success: true,
        data: {
            columns: columnsResult.rows,
            tasks: tasksResult.rows
        }
    };
});

// POST /api/tasks/:conversationId/columns
// Create a new column
router.post('/:conversationId/columns', async (ctx) => {
    const { conversationId } = ctx.params;

    const schema = Joi.object({
        title: Joi.string().trim().max(100).required(),
        position: Joi.number().integer().min(0).default(0)
    });

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { title, position } = value;
    if (!(await checkAdminAccess(ctx, conversationId))) return;

    const result = await db.write(
        'INSERT INTO task_columns (conversation_id, title, position) VALUES ($1, $2, $3) RETURNING *',
        [conversationId, title, position]
    );

    // Emit event to clients via Socket.IO
    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:column:created', result.rows[0]);

    ctx.status = 201;
    ctx.body = { success: true, data: result.rows[0] };
});

// PUT /api/tasks/columns/:id
// Update a column
router.put('/columns/:id', async (ctx) => {
    const { id } = ctx.params;

    const schema = Joi.object({
        title: Joi.string().trim().max(100),
        position: Joi.number().integer().min(0)
    }).min(1);

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { title, position } = value;

    const columnCheck = await db.write('SELECT conversation_id FROM task_columns WHERE id = $1', [id]);
    if (columnCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Coluna não encontrada' };
        return;
    }
    const conversationId = columnCheck.rows[0].conversation_id;
    if (!(await checkAdminAccess(ctx, conversationId))) return;

    const updates = [];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(title);
    }
    if (position !== undefined) {
        updates.push(`position = $${idx++}`);
        values.push(position);
    }

    if (updates.length === 0) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Nenhum campo para atualizar' };
        return;
    }

    values.push(id);
    const result = await db.write(
        `UPDATE task_columns SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
        values
    );

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:column:updated', result.rows[0]);

    ctx.body = { success: true, data: result.rows[0] };
});

// DELETE /api/tasks/columns/:id
// Delete a column (and cascade tasks)
router.delete('/columns/:id', async (ctx) => {
    const { id } = ctx.params;

    const columnCheck = await db.write('SELECT conversation_id FROM task_columns WHERE id = $1', [id]);
    if (columnCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Coluna não encontrada' };
        return;
    }
    const conversationId = columnCheck.rows[0].conversation_id;
    if (!(await checkAdminAccess(ctx, conversationId))) return;

    await db.write('DELETE FROM task_columns WHERE id = $1', [id]);

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:column:deleted', { id, conversationId });

    ctx.body = { success: true, message: 'Coluna deletada com sucesso' };
});

// POST /api/tasks/:conversationId
// Create a new task in a specific column
router.post('/:conversationId', async (ctx) => {
    const { conversationId } = ctx.params;

    const schema = Joi.object({
        columnId: Joi.string().uuid().required(),
        title: Joi.string().trim().max(255).required(),
        description: Joi.string().allow('', null).max(5000).default(''),
        assigneeId: Joi.string().uuid().allow(null).default(null),
        sourceMessageId: Joi.string().uuid().allow(null).default(null),
        position: Joi.number().integer().min(0).default(0)
    });

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { columnId, title, description, assigneeId, sourceMessageId, position } = value;
    const userId = ctx.state.user.id;

    if (!(await checkAccess(ctx, conversationId))) return;

    const result = await db.write(
        `INSERT INTO tasks (column_id, conversation_id, creator_id, assignee_id, title, description, source_message_id, position) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [columnId, conversationId, userId, assigneeId, title, description, sourceMessageId, position]
    );

    const taskData = result.rows[0];

    // Add user info if assignee
    if (assigneeId) {
        const userCheck = await db.write('SELECT username, full_name, avatar_url FROM users WHERE id = $1', [assigneeId]);
        if (userCheck.rows.length > 0) {
            taskData.assignee_username = userCheck.rows[0].username;
            taskData.assignee_name = userCheck.rows[0].full_name;
            taskData.assignee_avatar = userCheck.rows[0].avatar_url;
        }
    }

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:created', taskData);

    ctx.status = 201;
    ctx.body = { success: true, data: taskData };
});

// PUT /api/tasks/:taskId
// Update task details or move it
router.put('/:taskId', async (ctx) => {
    const { taskId } = ctx.params;

    const schema = Joi.object({
        columnId: Joi.string().uuid(),
        title: Joi.string().trim().max(255),
        description: Joi.string().allow('', null).max(5000),
        assigneeId: Joi.string().uuid().allow(null),
        position: Joi.number().integer().min(0)
    }).min(1);

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { columnId, title, description, assigneeId, position } = value;

    const taskCheck = await db.write('SELECT conversation_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Tarefa não encontrada' };
        return;
    }
    const conversationId = taskCheck.rows[0].conversation_id;
    if (!(await checkAccess(ctx, conversationId))) return;

    const updates = ['updated_at = NOW()'];
    const values = [];
    let idx = 1;

    if (columnId !== undefined) {
        updates.push(`column_id = $${idx++}`);
        values.push(columnId);
    }
    if (title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(title);
    }
    if (description !== undefined) {
        updates.push(`description = $${idx++}`);
        values.push(description);
    }
    if (assigneeId !== undefined) {
        updates.push(`assignee_id = $${idx++}`);
        values.push(assigneeId);
    }
    if (position !== undefined) {
        updates.push(`position = $${idx++}`);
        values.push(position);
    }

    values.push(taskId);
    await db.write(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx}`,
        values
    );

    // Fetch updated task with assignee data
    const result = await db.write(`
        SELECT t.*, u.username as assignee_username, u.full_name as assignee_name, u.avatar_url as assignee_avatar
        FROM tasks t
        LEFT JOIN users u ON u.id = t.assignee_id
        WHERE t.id = $1
    `, [taskId]);

    const taskData = result.rows[0];

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:updated', taskData);

    ctx.body = { success: true, data: taskData };
});

// DELETE /api/tasks/:taskId
router.delete('/:taskId', async (ctx) => {
    const { taskId } = ctx.params;

    const taskCheck = await db.write('SELECT conversation_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Tarefa não encontrada' };
        return;
    }
    const conversationId = taskCheck.rows[0].conversation_id;
    if (!(await checkAccess(ctx, conversationId))) return;

    await db.write('DELETE FROM tasks WHERE id = $1', [taskId]);

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('tasks:deleted', { id: taskId, conversationId });

    ctx.body = { success: true, message: 'Tarefa deletada com sucesso' };
});

export default router;
