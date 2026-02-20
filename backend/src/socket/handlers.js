import jwt from 'jsonwebtoken';
import { cache } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key';

// Store connected sockets by userId
const connectedUsers = new Map();

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

        // Disconnect
        socket.on('disconnect', async () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);

            if (socket.userId) {
                connectedUsers.delete(socket.userId);
                await cache.setPresence(socket.userId, 'offline');

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
