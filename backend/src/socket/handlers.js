import jwt from 'jsonwebtoken';
import { cache } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

// Store connected sockets by userId
const connectedUsers = new Map();

// Rate limiter: { userId: { count, resetAt } }
const messageRateLimits = new Map();
const RATE_LIMIT_MAX = 10; // max messages
const RATE_LIMIT_WINDOW = 5000; // per 5 seconds

function isRateLimited(userId) {
    const now = Date.now();
    const entry = messageRateLimits.get(userId);
    if (!entry || now > entry.resetAt) {
        messageRateLimits.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return false;
    }
    entry.count++;
    return entry.count > RATE_LIMIT_MAX;
}

export function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`🔌 New socket connection: ${socket.id}`);

        // Authentication
        socket.on('authenticate', async (token) => {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                socket.userId = decoded.id;
                socket.userData = decoded;

                // Join user-specific room
                socket.join(`user:${decoded.id}`);

                // Join company room
                if (decoded.companyId) {
                    socket.join(`company:${decoded.companyId}`);
                }

                // Join admin room if user is admin
                if (decoded.role === 'admin') {
                    socket.join('admin:all');
                    console.log(`👑 Admin joined admin:all room: ${decoded.username}`);
                }

                // Store connection
                connectedUsers.set(decoded.id, socket.id);

                // Update presence
                await cache.setPresence(decoded.id, 'online');

                // Notify others in company
                socket.to(`company:${decoded.companyId}`).emit('presence:change', {
                    userId: decoded.id,
                    status: 'online',
                    timestamp: Date.now(),
                });

                socket.emit('authenticated', { success: true, user: decoded });
                console.log(`✅ User authenticated: ${decoded.username} (${decoded.id})`);
            } catch (error) {
                socket.emit('authenticated', { success: false, error: 'Invalid token' });
            }
        });

        // Send message
        socket.on('message:send', async (data) => {
            if (!socket.userId) {
                socket.emit('error', { message: 'Not authenticated' });
                return;
            }

            if (isRateLimited(socket.userId)) {
                socket.emit('error', { message: 'Muitas mensagens. Aguarde alguns segundos.' });
                return;
            }

            const { conversationId, content, contentType = 'text' } = data;

            // Emit to all participants in conversation
            io.to(`conversation:${conversationId}`).emit('message:new', {
                conversationId,
                senderId: socket.userId,
                senderName: socket.userData.username,
                content,
                contentType,
                createdAt: new Date().toISOString(),
            });
        });

        // Join conversation room
        socket.on('conversation:join', (conversationId) => {
            if (!socket.userId) return;
            socket.join(`conversation:${conversationId}`);
            console.log(`👥 User ${socket.userId} joined conversation ${conversationId}`);

            // Notify if there's an active group call in this conversation
            if (io._groupCalls && io._groupCalls.has(conversationId)) {
                const participants = io._groupCalls.get(conversationId);
                if (participants.size > 0) {
                    socket.emit('group-call:active', {
                        conversationId,
                        participants: Array.from(participants.values()),
                        count: participants.size
                    });
                }
            }
        });

        // Leave conversation room
        socket.on('conversation:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // Typing indicator
        socket.on('typing:start', async (data) => {
            if (!socket.userId) return;

            const { conversationId } = data;
            await cache.setTyping(conversationId, socket.userId);

            socket.to(`conversation:${conversationId}`).emit('typing:update', {
                conversationId,
                userId: socket.userId,
                username: socket.userData.username,
                isTyping: true,
            });
        });

        socket.on('typing:stop', (data) => {
            if (!socket.userId) return;

            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit('typing:update', {
                conversationId,
                userId: socket.userId,
                isTyping: false,
            });
        });

        // Presence update
        socket.on('presence:update', async (status) => {
            if (!socket.userId) return;

            await cache.setPresence(socket.userId, status);

            if (socket.userData?.companyId) {
                socket.to(`company:${socket.userData.companyId}`).emit('presence:change', {
                    userId: socket.userId,
                    status,
                    timestamp: Date.now(),
                });
            }
        });

        // ====== WebRTC Signaling (1-to-1) ======
        socket.on('call:offer', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('call:offer', {
                callerId: socket.userId,
                callerName: socket.userData.full_name || socket.userData.username,
                callerAvatar: socket.userData.avatar_url,
                offer: data.offer,
                isVideo: data.isVideo
            });
        });

        socket.on('call:answer', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('call:answer', {
                answerId: socket.userId,
                answer: data.answer
            });
        });

        socket.on('call:ice-candidate', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('call:ice-candidate', {
                remoteId: socket.userId,
                candidate: data.candidate
            });
        });

        socket.on('call:end', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('call:end', {
                remoteId: socket.userId
            });
        });

        // ====== WebRTC Group Call Signaling (Mesh Topology) ======
        const MAX_GROUP_CALL_PARTICIPANTS = 25;
        if (!io._groupCalls) io._groupCalls = new Map();

        // Host starts a group call → notify all conversation participants
        socket.on('group-call:start', (data) => {
            if (!socket.userId) return;
            const { conversationId, isVideo } = data;
            const roomKey = `group-call:${conversationId}`;

            // Initialize call room
            if (!io._groupCalls.has(conversationId)) {
                io._groupCalls.set(conversationId, new Map());
            }
            const participants = io._groupCalls.get(conversationId);
            participants.set(socket.userId, {
                userId: socket.userId,
                name: socket.userData.full_name || socket.userData.username,
                avatar: socket.userData.avatar_url
            });

            socket.join(roomKey);

            // Notify everyone in the conversation that a group call started
            socket.to(`conversation:${conversationId}`).emit('group-call:incoming', {
                conversationId,
                callerId: socket.userId,
                callerName: socket.userData.full_name || socket.userData.username,
                callerAvatar: socket.userData.avatar_url,
                isVideo,
                participants: Array.from(participants.values())
            });

            console.log(`📞 Group call started in ${conversationId} by ${socket.userData.username}`);
        });

        // A participant joins the group call
        socket.on('group-call:join', (data) => {
            if (!socket.userId) return;
            const { conversationId } = data;
            const roomKey = `group-call:${conversationId}`;

            if (!io._groupCalls.has(conversationId)) {
                io._groupCalls.set(conversationId, new Map());
            }
            const participants = io._groupCalls.get(conversationId);

            // Enforce participant limit
            if (participants.size >= MAX_GROUP_CALL_PARTICIPANTS) {
                socket.emit('group-call:full', { conversationId, max: MAX_GROUP_CALL_PARTICIPANTS });
                return;
            }

            // Get existing participants BEFORE adding self (these are the ones we need to connect to)
            const existingParticipants = Array.from(participants.values());

            // Add self
            participants.set(socket.userId, {
                userId: socket.userId,
                name: socket.userData.full_name || socket.userData.username,
                avatar: socket.userData.avatar_url
            });

            socket.join(roomKey);

            // Tell the new joiner who is already in the call → they will create offers to each
            socket.emit('group-call:existing-participants', {
                conversationId,
                participants: existingParticipants
            });

            // Tell everyone already in the call that a new participant joined
            socket.to(roomKey).emit('group-call:participant-joined', {
                conversationId,
                userId: socket.userId,
                name: socket.userData.full_name || socket.userData.username,
                avatar: socket.userData.avatar_url
            });

            console.log(`📞 ${socket.userData.username} joined group call in ${conversationId} (${participants.size} participants)`);
        });

        // WebRTC offer from one participant to another within a group call
        socket.on('group-call:offer', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('group-call:offer', {
                conversationId: data.conversationId,
                callerId: socket.userId,
                callerName: socket.userData.full_name || socket.userData.username,
                callerAvatar: socket.userData.avatar_url,
                offer: data.offer
            });
        });

        // WebRTC answer within a group call
        socket.on('group-call:answer', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('group-call:answer', {
                conversationId: data.conversationId,
                answererId: socket.userId,
                answer: data.answer
            });
        });

        // ICE candidate within a group call
        socket.on('group-call:ice-candidate', (data) => {
            if (!socket.userId) return;
            socket.to(`user:${data.targetId}`).emit('group-call:ice-candidate', {
                conversationId: data.conversationId,
                remoteId: socket.userId,
                candidate: data.candidate
            });
        });

        // Participant leaves the group call
        socket.on('group-call:leave', (data) => {
            if (!socket.userId) return;
            const { conversationId } = data;
            const roomKey = `group-call:${conversationId}`;

            if (io._groupCalls.has(conversationId)) {
                const participants = io._groupCalls.get(conversationId);
                participants.delete(socket.userId);

                // Notify remaining participants
                socket.to(roomKey).emit('group-call:participant-left', {
                    conversationId,
                    userId: socket.userId
                });

                // Clean up if no one is left
                if (participants.size === 0) {
                    io._groupCalls.delete(conversationId);
                }

                console.log(`📞 ${socket.userData?.username} left group call in ${conversationId} (${participants.size} remaining)`);
            }

            socket.leave(roomKey);
        });

        // Hand raise in group call
        socket.on('group-call:hand-raise', (data) => {
            if (!socket.userId) return;
            const { conversationId, raised } = data;
            const roomKey = `group-call:${conversationId}`;
            socket.to(roomKey).emit('group-call:hand-raise', {
                userId: socket.userId,
                name: socket.userData.full_name || socket.userData.username,
                raised
            });
        });

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);

            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                await cache.clearPresence(socket.userId);

                // Auto-leave any group calls on disconnect
                if (io._groupCalls) {
                    for (const [convId, participants] of io._groupCalls) {
                        if (participants.has(socket.userId)) {
                            participants.delete(socket.userId);
                            const roomKey = `group-call:${convId}`;
                            socket.to(roomKey).emit('group-call:participant-left', {
                                conversationId: convId,
                                userId: socket.userId
                            });
                            if (participants.size === 0) {
                                io._groupCalls.delete(convId);
                            }
                        }
                    }
                }

                if (socket.userData?.companyId) {
                    socket.to(`company:${socket.userData.companyId}`).emit('presence:change', {
                        userId: socket.userId,
                        status: 'offline',
                        timestamp: Date.now(),
                    });
                }
            }
        });
    });

    // Utility function to emit to specific user
    io.emitToUser = (userId, event, data) => {
        io.to(`user:${userId}`).emit(event, data);
    };

    // Utility function to check if user is online
    io.isUserOnline = (userId) => {
        return connectedUsers.has(userId);
    };

    console.log('📡 Socket.IO handlers initialized');
}
