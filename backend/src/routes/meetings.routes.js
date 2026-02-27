import Router from 'koa-router';
import { db } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();
router.use(authMiddleware);

// POST /api/meetings — criar reunião
router.post('/', async (ctx) => {
    const { conversationId, title, description = '', startAt, endAt, meetingLink = '' } = ctx.request.body;
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    if (!title || !startAt || !conversationId) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'title, startAt e conversationId são obrigatórios' };
        return;
    }

    // Verify user is in conversation
    const convCheck = await db.write(
        'SELECT participant_ids FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [conversationId, userId]
    );
    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado à conversa' };
        return;
    }

    const meetingResult = await db.write(
        `INSERT INTO meetings (company_id, conversation_id, creator_id, title, description, start_at, end_at, meeting_link)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`,
        [companyId, conversationId, userId, title, description, startAt, endAt || null, meetingLink]
    );
    const meeting = meetingResult.rows[0];

    // Creator auto-accepts
    await db.write(
        'INSERT INTO meeting_rsvps (meeting_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (meeting_id, user_id) DO UPDATE SET status = $3',
        [meeting.id, userId, 'accepted']
    );

    // Save as special message in the conversation
    const msgContent = JSON.stringify({ meetingId: meeting.id, title, description, startAt, endAt, meetingLink });
    const msgResult = await db.write(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type)
         VALUES ($1, $2, $3, 'meeting') RETURNING id, created_at`,
        [conversationId, userId, msgContent]
    );
    const msg = msgResult.rows[0];

    await db.write('UPDATE conversations SET last_message_id = $2, last_message_at = $3 WHERE id = $1',
        [conversationId, msg.id, msg.created_at]
    );

    const senderResult = await db.write('SELECT username, full_name, avatar_url FROM users WHERE id = $1', [userId]);
    const sender = senderResult.rows[0];

    const messageData = {
        id: msg.id,
        conversationId,
        senderId: userId,
        senderUsername: sender.username,
        senderName: sender.full_name,
        senderAvatar: sender.avatar_url,
        content: msgContent,
        contentType: 'meeting',
        isRead: false,
        isDeleted: false,
        editedAt: null,
        createdAt: msg.created_at,
        replyTo: null,
        reactions: {},
        expiresAt: null
    };

    const io = ctx.app.context.io;
    if (io) {
        convCheck.rows[0].participant_ids.forEach(pid => {
            if (pid !== userId) {
                io.to(`user:${pid}`).emit('message:new', messageData);
            }
        });
        // Notify meeting reminder setup
        io.to(`conversation:${conversationId}`).emit('meeting:created', {
            meetingId: meeting.id, title, startAt, conversationId
        });
    }

    if (ctx.audit) {
        await ctx.audit({
            action: 'meeting.created',
            targetType: 'meeting',
            targetId: meeting.id,
            metadata: { conversationId, title, startAt, endAt }
        });
    }

    ctx.status = 201;
    ctx.body = { success: true, data: { ...meeting, title, description, startAt, endAt, meetingLink } };
});

// GET /api/meetings — listar reuniões do usuário (próximas + últimas)
router.get('/', async (ctx) => {
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT m.id, m.conversation_id, m.creator_id, m.title, m.description,
               m.start_at, m.end_at, m.meeting_link, m.created_at,
               u.full_name as creator_name, u.avatar_url as creator_avatar,
               (SELECT status FROM meeting_rsvps WHERE meeting_id = m.id AND user_id = $1) as my_rsvp,
               (SELECT JSON_AGG(JSON_BUILD_OBJECT('userId', mr.user_id, 'status', mr.status, 'name', u2.full_name))
                FROM meeting_rsvps mr JOIN users u2 ON u2.id = mr.user_id WHERE mr.meeting_id = m.id) as rsvps
        FROM meetings m
        JOIN users u ON u.id = m.creator_id
        WHERE m.company_id = $2
          AND (m.creator_id = $1 OR m.conversation_id IN (
              SELECT id FROM conversations WHERE $1 = ANY(participant_ids)
          ))
        ORDER BY m.start_at ASC
        LIMIT 50
    `, [userId, companyId]);

    ctx.body = { success: true, data: result.rows };
});

// GET /api/meetings/:id — detalhe de uma reunião
router.get('/:id', async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT m.id, m.company_id, m.conversation_id, m.creator_id, m.title, m.description,
               m.start_at, m.end_at, m.meeting_link, m.created_at,
               u.full_name as creator_name, u.avatar_url as creator_avatar,
               c.participant_ids,
               (SELECT status FROM meeting_rsvps WHERE meeting_id = m.id AND user_id = $2) as my_rsvp,
               (SELECT JSON_AGG(JSON_BUILD_OBJECT('userId', mr.user_id, 'status', mr.status, 'name', u2.full_name))
                FROM meeting_rsvps mr JOIN users u2 ON u2.id = mr.user_id WHERE mr.meeting_id = m.id) as rsvps
        FROM meetings m
        JOIN users u ON u.id = m.creator_id
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.id = $1 AND m.company_id = $3
        LIMIT 1
    `, [id, userId, companyId]);

    if (result.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Reunião não encontrada' };
        return;
    }

    const meeting = result.rows[0];
    if (!meeting.participant_ids.includes(userId) && meeting.creator_id !== userId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    delete meeting.participant_ids;
    ctx.body = { success: true, data: meeting };
});

// PUT /api/meetings/:id/rsvp — aceitar ou recusar
router.put('/:id/rsvp', async (ctx) => {
    const { id } = ctx.params;
    const { status } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!['accepted', 'declined', 'maybe'].includes(status)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Status inválido' };
        return;
    }

    const meetingCheck = await db.write('SELECT id, conversation_id FROM meetings WHERE id = $1', [id]);
    if (meetingCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Reunião não encontrada' };
        return;
    }

    await db.write(
        'INSERT INTO meeting_rsvps (meeting_id, user_id, status) VALUES ($1, $2, $3) ON CONFLICT (meeting_id, user_id) DO UPDATE SET status = $3',
        [id, userId, status]
    );

    // Notify conversation
    const io = ctx.app.context.io;
    if (io) {
        const meeting = meetingCheck.rows[0];
        io.to(`conversation:${meeting.conversation_id}`).emit('meeting:rsvp-updated', {
            meetingId: id,
            userId,
            status
        });
    }

    if (ctx.audit) {
        await ctx.audit({
            action: 'meeting.rsvp.updated',
            targetType: 'meeting',
            targetId: id,
            metadata: { status }
        });
    }

    ctx.body = { success: true, message: 'RSVP registrado' };
});

export default router;
