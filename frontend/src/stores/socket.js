import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { io } from 'socket.io-client'
import { useAuthStore } from './auth'

export const useSocketStore = defineStore('socket', () => {
    const socket = ref(null)
    const connected = ref(false)
    const typingUsers = ref({}) // { conversationId: [userId, ...] }

    function connect() {
        const authStore = useAuthStore()

        if (socket.value?.connected) return

        const socketUrl = import.meta.env.PROD ? 'https://lan-messenger-backend.onrender.com' : undefined;
        socket.value = io(socketUrl, {
            transports: ['websocket', 'polling'],
        })

        socket.value.on('connect', () => {
            console.log('🔌 Socket connected')
            connected.value = true

            // Authenticate - Try store first, then localStorage
            const token = authStore.accessToken || localStorage.getItem('accessToken')

            if (token) {
                console.log('🔄 Socket attempting to authenticate...')
                socket.value.emit('authenticate', token)
            } else {
                console.warn('⚠️ Socket connected but no token found for auth')
            }
        })

        socket.value.on('authenticated', (response) => {
            if (response.success) {
                console.log('✅ Socket authenticated')
            } else {
                console.error('❌ Socket auth failed:', response.error)
            }
        })

        socket.value.on('disconnect', () => {
            console.log('🔌 Socket disconnected')
            connected.value = false
        })

        socket.value.on('message:new', (message) => {
            // Will be handled by chat store
            window.dispatchEvent(new CustomEvent('socket:message', { detail: message }))
        })

        socket.value.on('message:edited', (data) => {
            window.dispatchEvent(new CustomEvent('socket:message:edited', { detail: data }))
        })

        socket.value.on('message:deleted', (data) => {
            window.dispatchEvent(new CustomEvent('socket:message:deleted', { detail: data }))
        })

        socket.value.on('message:read', (data) => {
            window.dispatchEvent(new CustomEvent('socket:message:read', { detail: data }))
        })

        socket.value.on('call:offer', (data) => {
            window.dispatchEvent(new CustomEvent('socket:call:offer', { detail: data }))
        })

        socket.value.on('call:answer', (data) => {
            window.dispatchEvent(new CustomEvent('socket:call:answer', { detail: data }))
        })

        socket.value.on('call:ice-candidate', (data) => {
            window.dispatchEvent(new CustomEvent('socket:call:ice-candidate', { detail: data }))
        })

        socket.value.on('call:end', (data) => {
            window.dispatchEvent(new CustomEvent('socket:call:end', { detail: data }))
        })

        socket.value.on('typing:update', ({ conversationId, userId, isTyping }) => {
            if (!typingUsers.value[conversationId]) {
                typingUsers.value[conversationId] = []
            }

            if (isTyping) {
                if (!typingUsers.value[conversationId].includes(userId)) {
                    typingUsers.value[conversationId].push(userId)
                }
            } else {
                typingUsers.value[conversationId] = typingUsers.value[conversationId].filter(id => id !== userId)
            }
        })

        socket.value.on('presence:change', (data) => {
            window.dispatchEvent(new CustomEvent('socket:presence', { detail: data }))
        })
    }

    function disconnect() {
        if (socket.value) {
            socket.value.disconnect()
            socket.value = null
            connected.value = false
        }
    }

    function joinConversation(conversationId) {
        if (socket.value?.connected) {
            socket.value.emit('conversation:join', conversationId)
        }
    }

    function leaveConversation(conversationId) {
        if (socket.value?.connected) {
            socket.value.emit('conversation:leave', conversationId)
        }
    }

    function sendTyping(conversationId, isTyping) {
        if (socket.value?.connected) {
            socket.value.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId })
        }
    }

    function updatePresence(status) {
        if (socket.value?.connected) {
            socket.value.emit('presence:update', status)
        }
    }

    function getTypingUsers(conversationId) {
        return typingUsers.value[conversationId] || []
    }

    return {
        socket,
        connected,
        typingUsers,
        connect,
        disconnect,
        joinConversation,
        leaveConversation,
        sendTyping,
        updatePresence,
        getTypingUsers,
    }
})
