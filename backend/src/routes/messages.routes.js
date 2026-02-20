import Router from 'koa-router';
import { db, cache } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

// GET /api/messages/conversations - List all conversations
router.get('/conversations', async (ctx) => {
    const userId = ctx.state.user.id;

    const result = await db.write(`
        SELECT c.id, c.participant_ids, c.name, c.is_group, c.last_message_at,
               m.content as last_message_content, m.sender_id as last_message_sender,
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND is_read = false AND sender_id != $1) as unread_count
        FROM conversations c
        LEFT JOIN messages m ON m.id = c.last_message_id
        WHERE $1 = ANY(c.participant_ids)
        ORDER BY c.last_message_at DESC NULLS LAST
    `, [userId]);

    // Enrich with participant info
    const conversations = await Promise.all(result.rows.map(async (conv) => {
        const participantResult = await db.write(
            'SELECT id, username, full_name, avatar_url FROM users WHERE id = ANY($1)',
            [conv.participant_ids]
        );

        return {
            id: conv.id,
            name: conv.name,
            isGroup: conv.is_group,
            participants: participantResult.rows,
            lastMessage: conv.last_message_content,
            lastMessageSenderId: conv.last_message_sender,
            lastMessageAt: conv.last_message_at,
            unreadCount: parseInt(conv.unread_count),
        };
    }));

    ctx.body = {
        success: true,
        data: conversations,
    };
});

// POST /api/messages/conversations - Create new conversation
router.post('/conversations', async (ctx) => {
    const { participantIds, name, isGroup = false } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!participantIds || !Array.isArray(participantIds)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'participantIds é obrigatório' };
        return;
    }

    // Include current user in participants
    const allParticipants = [...new Set([userId, ...participantIds])];

    // Check if direct conversation already exists
    if (!isGroup && allParticipants.length === 2) {
        const existing = await db.write(`
            SELECT id FROM conversations 
            WHERE is_group = false 
            AND participant_ids @> $1::uuid[] 
            AND participant_ids <@ $1::uuid[]
        `, [allParticipants]);

        if (existing.rows.length > 0) {
            ctx.body = {
                success: true,
                data: { id: existing.rows[0].id, existing: true },
            };
            return;
        }
    }

    const result = await db.write(
        `INSERT INTO conversations (participant_ids, name, is_group) 
         VALUES ($1, $2, $3) RETURNING id`,
        [allParticipants, name, isGroup]
    );

    ctx.status = 201;
    ctx.body = {
        success: true,
        data: { id: result.rows[0].id },
    };
});

// GET /api/messages/conversations/:id - Get messages
router.get('/conversations/:id', async (ctx) => {
    const { id } = ctx.params;
    const { cursor, limit = 50 } = ctx.query;
    const userId = ctx.state.user.id;

    // Verify user is participant
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
        SELECT m.id, m.sender_id, m.content, m.content_type, m.file_url, m.is_read, m.created_at,
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
            content: m.content,
            contentType: m.content_type,
            fileUrl: m.file_url,
            isRead: m.is_read,
            createdAt: m.created_at,
        })),
    };
});

// POST /api/messages/conversations/:id - Send message
router.post('/conversations/:id', async (ctx) => {
    const { id } = ctx.params;
    const { content, contentType = 'text', fileUrl } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!content) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Conteúdo é obrigatório' };
        return;
    }

    // Verify user is participant
    const convCheck = await db.write(
        'SELECT participant_ids FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [id, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    // Insert message
    const result = await db.write(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type, file_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [id, userId, content, contentType, fileUrl]
    );

    const message = result.rows[0];

    // Update conversation
    await db.write(
        'UPDATE conversations SET last_message_id = $2, last_message_at = $3 WHERE id = $1',
        [id, message.id, message.created_at]
    );

    // Get sender info
    const senderResult = await db.write(
        'SELECT username, full_name, avatar_url FROM users WHERE id = $1',
        [userId]
    );
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
        createdAt: message.created_at,
    };

    // Emit to Socket.IO
    const io = ctx.app.context.io;
    if (io) {
        convCheck.rows[0].participant_ids.forEach(participantId => {
            if (participantId !== userId) {
                io.to(`user:${participantId}`).emit('message:new', messageData);
            }
        });
    }

    ctx.status = 201;
    ctx.body = {
        success: true,
        data: messageData,
    };
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', async (ctx) => {
    const { id } = ctx.params;

    await db.write(
        'UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1',
        [id]
    );

    ctx.body = {
        success: true,
        message: 'Mensagem marcada como lida',
    };
});

export default router;
