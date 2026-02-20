import Router from 'koa-router';
import { db, cache } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/messages/conversations
router.get('/conversations', async (ctx) => {
    const userId = ctx.state.user.id;

    const result = await db.write(`
        SELECT c.id, c.participant_ids, c.name, c.is_group, c.last_message_at, c.group_admins,
               m.content as last_message_content, m.sender_id as last_message_sender,
               m.content_type as last_message_type, m.is_deleted as last_message_deleted,
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = false AND sender_id != $1 AND is_deleted = false) as unread_count
        FROM conversations c
        LEFT JOIN messages m ON m.id = c.last_message_id
        WHERE $1 = ANY(c.participant_ids)
        ORDER BY c.last_message_at DESC NULLS LAST
    `, [userId]);

    const conversations = await Promise.all(result.rows.map(async (conv) => {
        const participantResult = await db.write(
            'SELECT id, username, full_name, avatar_url FROM users WHERE id = ANY($1)',
            [conv.participant_ids]
        );
        return {
            id: conv.id,
            name: conv.name,
            isGroup: conv.is_group,
            groupAdmins: conv.group_admins || [],
            participants: participantResult.rows,
            lastMessage: conv.last_message_deleted ? '🚫 Mensagem apagada' : conv.last_message_content,
            lastMessageType: conv.last_message_type,
            lastMessageSenderId: conv.last_message_sender,
            lastMessageAt: conv.last_message_at,
            unreadCount: parseInt(conv.unread_count),
        };
    }));

    ctx.body = { success: true, data: conversations };
});

// POST /api/messages/conversations
router.post('/conversations', async (ctx) => {
    const { participantIds, name, description = '', isGroup = false } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!participantIds || !Array.isArray(participantIds)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'participantIds é obrigatório' };
        return;
    }

    const allParticipants = [...new Set([userId, ...participantIds])];

    if (!isGroup && allParticipants.length === 2) {
        const existing = await db.write(`
            SELECT id FROM conversations
            WHERE is_group = false
            AND participant_ids @> $1::uuid[]
            AND participant_ids <@ $1::uuid[]
        `, [allParticipants]);

        if (existing.rows.length > 0) {
            ctx.body = { success: true, data: { id: existing.rows[0].id, existing: true } };
            return;
        }
    }

    const groupAdmins = isGroup ? [userId] : [];
    const result = await db.write(
        `INSERT INTO conversations (participant_ids, name, description, is_group, creator_id, group_admins)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [allParticipants, name, description, isGroup, isGroup ? userId : null, groupAdmins]
    );

    ctx.status = 201;
    ctx.body = { success: true, data: { id: result.rows[0].id } };
});

// PUT /api/messages/conversations/:id/participants
router.put('/conversations/:id/participants', async (ctx) => {
    const { id } = ctx.params;
    const { participantIds = [], action = 'add' } = ctx.request.body;
    const userId = ctx.state.user.id;

    const convCheck = await db.write(
        'SELECT is_group, participant_ids, group_admins FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [id, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    const conv = convCheck.rows[0];
    if (!conv.is_group) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Ação permitida apenas em grupos' };
        return;
    }

    const isAdmin = (conv.group_admins || []).includes(userId);
    if (action === 'remove' && !isAdmin) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas admins podem remover membros' };
        return;
    }

    const nextParticipants = new Set(conv.participant_ids);
    const nextAdmins = new Set(conv.group_admins || []);

    if (action === 'leave') {
        nextParticipants.delete(userId);
        nextAdmins.delete(userId);
    } else if (action === 'add' && Array.isArray(participantIds)) {
        participantIds.forEach(pid => nextParticipants.add(pid));
    } else if (action === 'remove' && Array.isArray(participantIds)) {
        participantIds.forEach(pid => { nextParticipants.delete(pid); nextAdmins.delete(pid); });
    } else if (action === 'promote' && isAdmin && Array.isArray(participantIds)) {
        participantIds.forEach(pid => nextAdmins.add(pid));
    } else if (action === 'demote' && isAdmin && Array.isArray(participantIds)) {
        participantIds.forEach(pid => nextAdmins.delete(pid));
    }

    const updatedParticipants = Array.from(nextParticipants);
    const updatedAdmins = Array.from(nextAdmins);

    await db.write(
        'UPDATE conversations SET participant_ids = $1, group_admins = $2 WHERE id = $3',
        [updatedParticipants, updatedAdmins, id]
    );

    ctx.body = { success: true, data: { participantIds: updatedParticipants, groupAdmins: updatedAdmins } };
});

// GET /api/messages/conversations/:id
router.get('/conversations/:id', async (ctx) => {
    const { id } = ctx.params;
    const { cursor, limit = 50 } = ctx.query;
    const userId = ctx.state.user.id;

    const convCheck = await db.write(
        'SELECT id FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [id, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    let query = `
        SELECT m.id, m.sender_id, m.content, m.content_type, m.file_url, m.is_read, m.is_deleted,
               m.edited_at, m.created_at, m.reply_to, m.reactions, m.expires_at,
               u.username as sender_username, u.full_name as sender_name, u.avatar_url as sender_avatar
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
    `;
    const params = [id];

    if (cursor) {
        query += ` AND m.created_at < $2`;
        params.push(cursor);
    }

    query += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await db.write(query, params);

    ctx.body = {
        success: true,
        data: result.rows.reverse().map(m => ({
            id: m.id,
            senderId: m.sender_id,
            senderUsername: m.sender_username,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            content: m.is_deleted ? '🚫 Mensagem apagada' : m.content,
            contentType: m.is_deleted ? 'deleted' : m.content_type,
            fileUrl: m.file_url,
            isRead: m.is_read,
            isDeleted: m.is_deleted,
            editedAt: m.edited_at,
            createdAt: m.created_at,
            replyTo: m.reply_to,
            reactions: m.reactions || {},
            expiresAt: m.expires_at,
        })).filter(m => !m.expiresAt || new Date(m.expiresAt) > new Date()),
    };
});

// POST /api/messages/conversations/:id - Send message
router.post('/conversations/:id', async (ctx) => {
    const { id } = ctx.params;
    const { content, contentType = 'text', fileUrl, replyTo = null, expiresIn = null } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!content) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Conteúdo é obrigatório' };
        return;
    }

    const convCheck = await db.write(
        'SELECT participant_ids FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [id, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    let expiresAt = null;
    if (expiresIn) {
        expiresAt = new Date(Date.now() + expiresIn * 1000); // expiresIn is in seconds
    }

    const result = await db.write(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url, reply_to, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, created_at`,
        [id, userId, content, contentType, fileUrl, replyTo, expiresAt]
    );

    const message = result.rows[0];
    await db.write(
        'UPDATE conversations SET last_message_id = $2, last_message_at = $3 WHERE id = $1',
        [id, message.id, message.created_at]
    );

    const senderResult = await db.write('SELECT username, full_name, avatar_url FROM users WHERE id = $1', [userId]);
    const sender = senderResult.rows[0];

    const messageData = {
        id: message.id,
        conversationId: id,
        senderId: userId,
        senderUsername: sender.username,
        senderName: sender.full_name,
        senderAvatar: sender.avatar_url,
        content,
        contentType,
        fileUrl,
        isRead: false,
        isDeleted: false,
        editedAt: null,
        createdAt: message.created_at,
        replyTo,
        reactions: {},
        expiresAt
    };

    const io = ctx.app.context.io;
    if (io) {
        convCheck.rows[0].participant_ids.forEach(participantId => {
            if (participantId !== userId) {
                io.to(`user:${participantId}`).emit('message:new', messageData);
            }
        });
    }

    ctx.status = 201;
    ctx.body = { success: true, data: messageData };
});

// PUT /api/messages/:id - Edit message content
router.put('/:id', async (ctx) => {
    const { id } = ctx.params;
    const { content } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!content?.trim()) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Conteúdo não pode ser vazio' };
        return;
    }

    const msgCheck = await db.write(
        'SELECT sender_id, conversation_id, is_deleted FROM messages WHERE id = $1',
        [id]
    );

    if (msgCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Mensagem não encontrada' };
        return;
    }

    const msg = msgCheck.rows[0];
    if (msg.sender_id !== userId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas o autor pode editar' };
        return;
    }
    if (msg.is_deleted) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Não é possível editar mensagem apagada' };
        return;
    }

    await db.write('UPDATE messages SET content = $2, edited_at = NOW() WHERE id = $1', [id, content]);

    const io = ctx.app.context.io;
    if (io) {
        const convResult = await db.write('SELECT participant_ids FROM conversations WHERE id = $1', [msg.conversation_id]);
        (convResult.rows[0]?.participant_ids || []).forEach(pid => {
            io.to(`user:${pid}`).emit('message:edited', {
                messageId: id,
                conversationId: msg.conversation_id,
                content,
                editedAt: new Date(),
            });
        });
    }

    ctx.body = { success: true, message: 'Mensagem editada' };
});

// DELETE /api/messages/:id - Soft-delete (auditável)
router.delete('/:id', async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;

    const msgCheck = await db.write(
        'SELECT sender_id, conversation_id FROM messages WHERE id = $1',
        [id]
    );

    if (msgCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Mensagem não encontrada' };
        return;
    }

    const msg = msgCheck.rows[0];
    if (msg.sender_id !== userId) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas o autor pode apagar' };
        return;
    }

    await db.write('UPDATE messages SET is_deleted = true WHERE id = $1', [id]);

    const io = ctx.app.context.io;
    if (io) {
        const convResult = await db.write('SELECT participant_ids FROM conversations WHERE id = $1', [msg.conversation_id]);
        (convResult.rows[0]?.participant_ids || []).forEach(pid => {
            io.to(`user:${pid}`).emit('message:deleted', {
                messageId: id,
                conversationId: msg.conversation_id,
            });
        });
    }

    ctx.body = { success: true, message: 'Mensagem apagada' };
});

// PUT /api/messages/:id/read - Marcar como lida + recibo ✔✔
router.put('/:id/read', async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;

    const msgResult = await db.write(
        'SELECT sender_id, conversation_id FROM messages WHERE id = $1',
        [id]
    );

    await db.write('UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1', [id]);

    if (msgResult.rows.length > 0) {
        const { sender_id, conversation_id } = msgResult.rows[0];
        const io = ctx.app.context.io;
        if (io && sender_id !== userId) {
            io.to(`user:${sender_id}`).emit('message:read', {
                messageId: id,
                conversationId: conversation_id,
                readBy: userId,
                readAt: new Date(),
            });
        }
    }

    ctx.body = { success: true, message: 'Mensagem marcada como lida' };
});

// POST /api/messages/:id/react - Alternar reação
router.post('/:id/react', async (ctx) => {
    const { id } = ctx.params;
    const { emoji } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!emoji) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Emoji é obrigatório' };
        return;
    }

    const msgCheck = await db.write('SELECT reactions, conversation_id FROM messages WHERE id = $1', [id]);

    if (msgCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Mensagem não encontrada' };
        return;
    }

    const msg = msgCheck.rows[0];
    let reactions = msg.reactions || {};

    // Toggle reaction pattern
    if (!reactions[emoji]) reactions[emoji] = [];

    if (reactions[emoji].includes(userId)) {
        reactions[emoji] = reactions[emoji].filter(u => u !== userId);
        if (reactions[emoji].length === 0) delete reactions[emoji];
    } else {
        reactions[emoji].push(userId);
    }

    await db.write('UPDATE messages SET reactions = $1 WHERE id = $2', [reactions, id]);

    const io = ctx.app.context.io;
    if (io) {
        const convResult = await db.write('SELECT participant_ids FROM conversations WHERE id = $1', [msg.conversation_id]);
        (convResult.rows[0]?.participant_ids || []).forEach(pid => {
            io.to(`user:${pid}`).emit('message:reaction', {
                messageId: id,
                conversationId: msg.conversation_id,
                reactions
            });
        });
    }

    ctx.body = { success: true, data: reactions };
});

export default router;
