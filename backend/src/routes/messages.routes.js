import Router from 'koa-router';
import { db, cache } from '../config/database.js';
import { authMiddleware } from '../middlewares/auth.js';

const router = new Router();

router.use(authMiddleware);

async function askLanlyBotReply(message, context = []) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null;

    const history = context
        .slice(-10)
        .map((item) => `- ${(item.sender_username || item.sender_name || 'User')}: ${item.content || ''}`)
        .join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://lan-messenger.local',
            'X-Title': 'Lanly Bot'
        },
        body: JSON.stringify({
            model: 'arcee-ai/trinity-large-preview:free',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: 'Você é o @lanly, um assistente corporativo. Responda em português-BR e de forma objetiva.'
                },
                {
                    role: 'user',
                    content: `Histórico:\n${history || '(sem histórico)'}\n\nMensagem:\n${message}\n\nResponda como @lanly em até 5 linhas.`
                }
            ]
        })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
}

// GET /api/messages/conversations
router.get('/conversations', async (ctx) => {
    const userId = ctx.state.user.id;

    const result = await db.write(`
        SELECT c.id, c.participant_ids, c.name, c.description, c.is_group, c.is_public, c.last_message_at, c.group_admins,
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
            'SELECT id, username, full_name, avatar_url, custom_status_text, custom_status_emoji, custom_status_expires_at, ooo_until, ooo_message FROM users WHERE id = ANY($1)',
            [conv.participant_ids]
        );
        return {
            id: conv.id,
            name: conv.name,
            description: conv.description,
            isGroup: conv.is_group,
            isPublic: conv.is_public,
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
    const { participantIds, name, description = '', isGroup = false, isPublic = false } = ctx.request.body;
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

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
        `INSERT INTO conversations (company_id, participant_ids, name, description, is_group, is_public, creator_id, group_admins)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [companyId, allParticipants, name, description, isGroup, isPublic, isGroup ? userId : null, groupAdmins]
    );

    ctx.status = 201;
    ctx.body = { success: true, data: { id: result.rows[0].id } };
});

// GET /api/messages/channels
// Lista todos os canais públicos da empresa do usuário
router.get('/channels', async (ctx) => {
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    const result = await db.write(`
        SELECT c.id, c.name, c.description, c.participant_ids, c.created_at,
               (SELECT COUNT(*) FROM unnest(c.participant_ids)) as member_count,
               ($1 = ANY(c.participant_ids)) as is_member
        FROM conversations c
        WHERE c.company_id = $2 AND c.is_public = true
        ORDER BY c.name ASC
    `, [userId, companyId]);

    ctx.body = { success: true, data: result.rows };
});

// POST /api/messages/channels/:id/join
// Entra em um canal público da empresa
router.post('/channels/:id/join', async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    // Verify if it's a public channel of the same company
    const channelCheck = await db.write(
        'SELECT id, participant_ids FROM conversations WHERE id = $1 AND company_id = $2 AND is_public = true',
        [id, companyId]
    );

    if (channelCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Canal não encontrado ou acesso restrito' };
        return;
    }

    const channel = channelCheck.rows[0];
    if (channel.participant_ids.includes(userId)) {
        ctx.body = { success: true, message: 'Você já participa deste canal' };
        return;
    }

    const nextParticipants = [...channel.participant_ids, userId];

    await db.write(
        'UPDATE conversations SET participant_ids = $1 WHERE id = $2',
        [nextParticipants, id]
    );

    // Notify others in the socket group that someone joined (optional, or just handle joining the room)
    const io = ctx.app.context.io;
    if (io) {
        // We emit a system message or just update member list if needed.
        // For now, the user just joins the room on the frontend when selecting the channel.
    }

    ctx.body = { success: true, message: 'Entrou no canal com sucesso' };
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
               m.is_pinned, m.pinned_at, m.pinned_by,
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
    const rows = result.rows.reverse();

    const pollMessageIds = rows.filter((m) => m.content_type === 'poll').map((m) => m.id);
    const pollResultsMap = {};
    if (pollMessageIds.length > 0) {
        const votesResult = await db.write(
            `SELECT message_id, option_index, array_agg(user_id) as users
             FROM poll_votes
             WHERE message_id = ANY($1::uuid[])
             GROUP BY message_id, option_index`,
            [pollMessageIds]
        );

        for (const voteRow of votesResult.rows) {
            if (!pollResultsMap[voteRow.message_id]) pollResultsMap[voteRow.message_id] = [];
            pollResultsMap[voteRow.message_id].push({
                optionIndex: voteRow.option_index,
                userIds: voteRow.users || []
            });
        }
    }

    ctx.body = {
        success: true,
        data: rows.map(m => ({
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
            isPinned: m.is_pinned,
            pinnedAt: m.pinned_at,
            pinnedBy: m.pinned_by,
            pollResults: pollResultsMap[m.id] || [],
        })).filter(m => !m.expiresAt || new Date(m.expiresAt) > new Date()),
    };
});

// POST /api/messages/conversations/:id - Send message
router.post('/conversations/:id', async (ctx) => {
    const { id } = ctx.params;
    const { content, contentType = 'text', fileUrl, replyTo = null, expiresIn = null } = ctx.request.body;
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

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

    // Feature: Menções (@username)
    const mentionRegex = /@([a-zA-Z0-9_\.]+)/g;
    const mentionedUsernames = typeof content === 'string'
        ? [...new Set(Array.from(content.matchAll(mentionRegex), (m) => m[1]))]
        : [];
    const io = ctx.app.context.io;

    if (mentionedUsernames.length > 0) {
        const usersResult = await db.write(
            'SELECT id, username, full_name FROM users WHERE company_id = $1 AND username = ANY($2)',
            [companyId, mentionedUsernames]
        );
        for (const u of usersResult.rows) {
            // Apenas insere se o usuário mencionado estiver na conversa
            if (convCheck.rows[0].participant_ids.includes(u.id)) {
                await db.write(
                    `INSERT INTO mentions (message_id, conversation_id, mentioned_user_id, mentioner_id)
                     VALUES ($1, $2, $3, $4)`,
                    [message.id, id, u.id, userId]
                );
                if (io) {
                    io.to(`user:${u.id}`).emit('mention:new', {
                        messageId: message.id,
                        conversationId: id,
                        mentionerUsername: sender.username,
                        mentionerName: sender.full_name,
                        content,
                        createdAt: message.created_at
                    });
                }
            }
        }
    }

    if (io) {
        convCheck.rows[0].participant_ids.forEach(participantId => {
            if (participantId !== userId) {
                io.to(`user:${participantId}`).emit('message:new', messageData);
            }
        });

        // Feature: Bot @lanly (via OpenRouter)
        if (typeof content === 'string' && /(^|\s)@lanly\b/i.test(content)) {
            try {
                const contextRows = await db.write(`
                    SELECT m.content, u.username as sender_username, u.full_name as sender_name
                    FROM messages m
                    JOIN users u ON u.id = m.sender_id
                    WHERE m.conversation_id = $1
                    ORDER BY m.created_at DESC
                    LIMIT 10
                `, [id]);

                const botReply = await askLanlyBotReply(content, contextRows.rows.reverse());
                if (botReply) {
                    const botMessage = {
                        id: `bot-${Date.now()}`,
                        conversationId: id,
                        senderId: 'lanly-bot',
                        senderUsername: 'lanly',
                        senderName: 'Lanly Bot',
                        senderAvatar: null,
                        content: botReply,
                        contentType: 'text',
                        isRead: false,
                        isDeleted: false,
                        editedAt: null,
                        createdAt: new Date().toISOString(),
                        replyTo: null,
                        reactions: {},
                        expiresAt: null
                    };

                    io.to(`conversation:${id}`).emit('bot:reply', botMessage);
                    convCheck.rows[0].participant_ids.forEach((participantId) => {
                        io.to(`user:${participantId}`).emit('bot:reply', botMessage);
                    });
                }
            } catch (error) {
                console.error('@lanly bot error:', error.message);
            }
        }
    }

    ctx.status = 201;
    ctx.body = { success: true, data: messageData };
});

// POST /api/messages/conversations/:id/call-log - Record call log as a special message
router.post('/conversations/:id/call-log', async (ctx) => {
    const { id } = ctx.params;
    const { callType = 'audio', duration = 0, status = 'completed', isGroup = false } = ctx.request.body;
    const userId = ctx.state.user.id;

    const convCheck = await db.write(
        'SELECT participant_ids FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [id, userId]
    );

    if (convCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado' };
        return;
    }

    // Encode call info as JSON string stored as content
    const callContent = JSON.stringify({ callType, duration, status, isGroup });

    const result = await db.write(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type)
         VALUES ($1, $2, $3, 'call')
         RETURNING id, created_at`,
        [id, userId, callContent]
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
        content: callContent,
        contentType: 'call',
        isRead: false,
        isDeleted: false,
        editedAt: null,
        createdAt: message.created_at,
        replyTo: null,
        reactions: {},
        expiresAt: null
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

// GET /api/messages/search?q=query - Global message search across user's conversations
router.get('/search', async (ctx) => {
    const userId = ctx.state.user.id;
    const { q, limit = 30 } = ctx.query;

    if (!q || q.trim().length < 2) {
        ctx.body = { success: true, data: [] };
        return;
    }

    const result = await db.write(`
        SELECT m.id, m.conversation_id, m.sender_id, m.content, m.content_type, m.created_at,
               u.username as sender_username, u.full_name as sender_name, u.avatar_url as sender_avatar,
               c.name as conversation_name, c.is_group
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.conversation_id IN (
            SELECT id FROM conversations WHERE $1 = ANY(participant_ids)
        )
        AND m.is_deleted = false
        AND m.content_type IN ('text', 'call')
        AND m.content ILIKE $2
        ORDER BY m.created_at DESC
        LIMIT $3
    `, [userId, `%${q.trim()}%`, parseInt(limit)]);

    ctx.body = {
        success: true,
        data: result.rows.map(m => ({
            id: m.id,
            conversationId: m.conversation_id,
            conversationName: m.conversation_name || m.sender_name,
            isGroup: m.is_group,
            senderId: m.sender_id,
            senderUsername: m.sender_username,
            senderName: m.sender_name,
            senderAvatar: m.sender_avatar,
            content: m.content,
            contentType: m.content_type,
            createdAt: m.created_at,
        }))
    };
});

// GET /api/messages/online-users - Get list of online users in same company
router.get('/online-users', async (ctx) => {
    const userId = ctx.state.user.id;
    const companyId = ctx.state.user.companyId;

    // Get all company users
    const users = await db.write(
        'SELECT id, username, full_name, avatar_url FROM users WHERE company_id = $1',
        [companyId]
    );

    // Check presence for each
    const onlineStatuses = {};
    for (const user of users.rows) {
        const status = await cache.getPresence(user.id);
        onlineStatuses[user.id] = status || 'offline';
    }

    ctx.body = { success: true, data: onlineStatuses };
});

// ==========================================
// FEATURE: ARQUIVOS INLINE
// ==========================================
// GET /api/messages/conversations/:id/files
router.get('/conversations/:id/files', async (ctx) => {
    const { id } = ctx.params;
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

    const { limit = 20, offset = 0 } = ctx.query;

    const result = await db.write(`
        SELECT m.id, m.content, m.content_type, m.file_url, m.created_at,
               u.full_name as sender_name
        FROM messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = $1
          AND m.is_deleted = false
          AND m.content_type IN ('image', 'video', 'pdf', 'file')
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
    `, [id, parseInt(limit), parseInt(offset)]);

    ctx.body = { success: true, data: result.rows };
});

// ==========================================
// FEATURE: MENSAGENS FIXADAS
// ==========================================
// GET /api/messages/conversations/:id/pinned
router.get('/conversations/:id/pinned', async (ctx) => {
    const { id } = ctx.params;
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

    const result = await db.write(`
        SELECT m.id, m.content, m.content_type, m.created_at, m.pinned_at,
               u.full_name as pinned_by_name
        FROM messages m
        LEFT JOIN users u ON u.id = m.pinned_by
        WHERE m.conversation_id = $1 AND m.is_pinned = true AND m.is_deleted = false
        ORDER BY m.pinned_at DESC LIMIT 1
    `, [id]);

    ctx.body = { success: true, data: result.rows[0] || null };
});

// PUT /api/messages/:id/pin
router.put('/:id/pin', async (ctx) => {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;

    const msgCheck = await db.write(
        'SELECT m.conversation_id, m.is_pinned, c.group_admins, c.is_group ' +
        'FROM messages m JOIN conversations c ON c.id = m.conversation_id ' +
        'WHERE m.id = $1 AND $2 = ANY(c.participant_ids)',
        [id, userId]
    );

    if (msgCheck.rows.length === 0) {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Mensagem não encontrada ou acesso negado' };
        return;
    }

    const conv = msgCheck.rows[0];
    if (conv.is_group && !(conv.group_admins || []).includes(userId)) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Apenas admins do grupo podem fixar mensagens' };
        return;
    }

    const isPinned = !conv.is_pinned; // Toggle

    if (isPinned) {
        // Desfixar todas as anteriores deste chat (apenas 1 fixada por vez via app)
        await db.write('UPDATE messages SET is_pinned = false WHERE conversation_id = $1', [conv.conversation_id]);
    }

    await db.write(
        'UPDATE messages SET is_pinned = $1, pinned_by = $2, pinned_at = $3 WHERE id = $4',
        [isPinned, isPinned ? userId : null, isPinned ? new Date() : null, id]
    );

    const io = ctx.app.context.io;
    if (io) {
        io.to(`conversation:${conv.conversation_id}`).emit('message:pinned', {
            messageId: id,
            conversationId: conv.conversation_id,
            isPinned,
            pinnedBy: isPinned ? userId : null
        });
    }

    ctx.body = { success: true, message: isPinned ? 'Mensagem fixada' : 'Mensagem desfixada' };
});

// ==========================================
// FEATURE: ENQUETES
// ==========================================
// POST /api/messages/conversations/:id/poll
router.post('/conversations/:id/poll', async (ctx) => {
    const { id } = ctx.params;
    const { question, options, multiChoice = false, expiresIn = null } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (!question || !Array.isArray(options) || options.length < 2) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Pergunta e no mínimo 2 opções são obrigatórias' };
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

    const pollData = {
        question,
        options: options.map(opt => ({ text: String(opt), votes: 0 })),
        multiChoice
    };

    const content = JSON.stringify(pollData);

    let expiresAt = null;
    if (expiresIn) expiresAt = new Date(Date.now() + expiresIn * 1000);

    const result = await db.write(
        `INSERT INTO messages (conversation_id, sender_id, content, content_type, expires_at)
         VALUES ($1, $2, $3, 'poll', $4) RETURNING id, created_at`,
        [id, userId, content, expiresAt]
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
        contentType: 'poll',
        createdAt: message.created_at,
        pollResults: [] // empty
    };

    const io = ctx.app.context.io;
    if (io) {
        (convCheck.rows[0]?.participant_ids || []).forEach(participantId => {
            if (participantId !== userId) {
                io.to(`user:${participantId}`).emit('message:new', messageData);
            }
        });
    }

    ctx.status = 201;
    ctx.body = { success: true, data: messageData };
});

// POST /api/messages/:id/vote (Enquetes)
router.post('/:id/vote', async (ctx) => {
    const { id } = ctx.params;
    const { optionIndex } = ctx.request.body;
    const userId = ctx.state.user.id;

    if (optionIndex === undefined) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Índice da opção é obrigatório' };
        return;
    }

    const msgCheck = await db.write('SELECT conversation_id, content, content_type, expires_at FROM messages WHERE id = $1', [id]);
    if (msgCheck.rows.length === 0 || msgCheck.rows[0].content_type !== 'poll') {
        ctx.status = 404;
        ctx.body = { success: false, message: 'Enquete não encontrada' };
        return;
    }

    const msg = msgCheck.rows[0];
    const accessCheck = await db.write(
        'SELECT id FROM conversations WHERE id = $1 AND $2 = ANY(participant_ids)',
        [msg.conversation_id, userId]
    );
    if (accessCheck.rows.length === 0) {
        ctx.status = 403;
        ctx.body = { success: false, message: 'Acesso negado à enquete' };
        return;
    }

    if (msg.expires_at && new Date() > new Date(msg.expires_at)) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'A enquete já expirou' };
        return;
    }

    const pollData = JSON.parse(msg.content);
    if (optionIndex < 0 || optionIndex >= pollData.options.length) {
        ctx.status = 400;
        ctx.body = { success: false, message: 'Opção inválida' };
        return;
    }

    if (!pollData.multiChoice) {
        // Remove previous vote for this user on this poll
        await db.write('DELETE FROM poll_votes WHERE message_id = $1 AND user_id = $2', [id, userId]);
    }

    // Toggle vote logic
    const existingVote = await db.write(
        'SELECT id FROM poll_votes WHERE message_id = $1 AND user_id = $2 AND option_index = $3',
        [id, userId, optionIndex]
    );

    if (existingVote.rows.length > 0) {
        await db.write('DELETE FROM poll_votes WHERE id = $1', [existingVote.rows[0].id]);
    } else {
        await db.write(
            'INSERT INTO poll_votes (message_id, user_id, option_index) VALUES ($1, $2, $3)',
            [id, userId, optionIndex]
        );
    }

    // Recalculate all votes
    const votesResult = await db.write(
        'SELECT option_index, array_agg(user_id) as users FROM poll_votes WHERE message_id = $1 GROUP BY option_index',
        [id]
    );

    const pollResults = votesResult.rows.map(r => ({
        optionIndex: r.option_index,
        userIds: r.users
    })).sort((a, b) => a.optionIndex - b.optionIndex);

    const io = ctx.app.context.io;
    if (io) {
        io.to(`conversation:${msg.conversation_id}`).emit('poll:updated', {
            messageId: id,
            conversationId: msg.conversation_id,
            pollResults
        });
    }

    ctx.body = { success: true, data: pollResults };
});

export default router;

