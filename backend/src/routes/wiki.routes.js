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
        'SELECT id, company_id FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [conversationId, userId]
    );
    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado à conversa' };
        return null;
    }
    return convCheck.rows[0].company_id;
}

// GET /api/wiki/:conversationId
// Get all pages in a conversation
router.get('/:conversationId', async (ctx) => {
    const { conversationId } = ctx.params;

    if (!(await checkAccess(ctx, conversationId))) return;

    const result = await db.write(`
        SELECT w.id, w.title, w.emoji, w.parent_id, w.created_at, w.updated_at,
               u.username as author_username, u.full_name as author_name, u.avatar_url as author_avatar
        FROM wiki_pages w
        LEFT JOIN users u ON u.id = w.author_id
        WHERE w.conversation_id = $1
        ORDER BY w.updated_at DESC
    `, [conversationId]);

    ctx.body = { success: true, data: result.rows };
});

// GET /api/wiki/pages/:id
// Get full content of a single page
router.get('/pages/:id', async (ctx) => {
    const { id } = ctx.params;

    const pageCheck = await db.write('SELECT conversation_id FROM wiki_pages WHERE id = $1', [id]);
    if (pageCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Página não encontrada' };
        return;
    }

    const conversationId = pageCheck.rows[0].conversation_id;
    if (!(await checkAccess(ctx, conversationId))) return;

    const result = await db.write(`
        SELECT w.id, w.title, w.content, w.emoji, w.parent_id, w.created_at, w.updated_at,
               u.username as author_username, u.full_name as author_name, u.avatar_url as author_avatar
        FROM wiki_pages w
        LEFT JOIN users u ON u.id = w.author_id
        WHERE w.id = $1
    `, [id]);

    ctx.body = { success: true, data: result.rows[0] };
});

// POST /api/wiki/:conversationId
// Create a new wiki page
router.post('/:conversationId', async (ctx) => {
    const { conversationId } = ctx.params;

    const schema = Joi.object({
        title: Joi.string().trim().max(255).required(),
        content: Joi.string().allow('', null).max(100000).default(''),
        emoji: Joi.string().max(10).default('📄'),
        parentId: Joi.string().uuid().allow(null).default(null)
    });

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { title, content, emoji, parentId } = value;
    const userId = ctx.state.user.id;

    const companyId = await checkAccess(ctx, conversationId);
    if (!companyId) return;

    const result = await db.write(`
        INSERT INTO wiki_pages (company_id, conversation_id, author_id, title, content, emoji, parent_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
    `, [companyId, conversationId, userId, title, content, emoji, parentId]);

    const pageData = result.rows[0];

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('wiki:page:created', pageData);

    ctx.status = 201;
    ctx.body = { success: true, data: pageData };
});

// PUT /api/wiki/pages/:id
// Update an existing page
router.put('/pages/:id', async (ctx) => {
    const { id } = ctx.params;

    const schema = Joi.object({
        title: Joi.string().trim().max(255),
        content: Joi.string().allow('', null).max(100000),
        emoji: Joi.string().max(10),
        parentId: Joi.string().uuid().allow(null)
    }).min(1);

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
        ctx.status = 400;
        ctx.body = { success: false, message: error.details[0].message };
        return;
    }

    const { title, content, emoji, parentId } = value;

    const pageCheck = await db.write('SELECT conversation_id FROM wiki_pages WHERE id = $1', [id]);
    if (pageCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Página não encontrada' };
        return;
    }

    const conversationId = pageCheck.rows[0].conversation_id;
    if (!(await checkAccess(ctx, conversationId))) return;

    const updates = ['updated_at = NOW()'];
    const values = [];
    let idx = 1;

    if (title !== undefined) {
        updates.push(`title = $${idx++}`);
        values.push(title);
    }
    if (content !== undefined) {
        updates.push(`content = $${idx++}`);
        values.push(content);
    }
    if (emoji !== undefined) {
        updates.push(`emoji = $${idx++}`);
        values.push(emoji);
    }
    if (parentId !== undefined) {
        updates.push(`parent_id = $${idx++}`);
        values.push(parentId);
    }

    values.push(id);
    const result = await db.write(`
        UPDATE wiki_pages
        SET ${updates.join(', ')}
        WHERE id = $${idx}
        RETURNING *
    `, values);

    const pageData = result.rows[0];

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('wiki:page:updated', pageData);

    ctx.body = { success: true, data: pageData };
});

// DELETE /api/wiki/pages/:id
router.delete('/pages/:id', async (ctx) => {
    const { id } = ctx.params;

    const pageCheck = await db.write('SELECT conversation_id FROM wiki_pages WHERE id = $1', [id]);
    if (pageCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Página não encontrada' };
        return;
    }

    const conversationId = pageCheck.rows[0].conversation_id;
    if (!(await checkAccess(ctx, conversationId))) return;

    await db.write('DELETE FROM wiki_pages WHERE id = $1', [id]);

    const io = ctx.app.context.io;
    if (io) io.to(`conversation:${conversationId}`).emit('wiki:page:deleted', { id, conversationId });

    ctx.body = { success: true, message: 'Página deletada' };
});

export default router;
