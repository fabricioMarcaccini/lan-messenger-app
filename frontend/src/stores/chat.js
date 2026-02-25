import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from './auth'

export const useChatStore = defineStore('chat', () => {
    // State
    const conversations = ref([])
    const activeConversationId = ref(null)
    const messages = ref({}) // Map conversationId -> messages array
    const typingUsers = ref({}) // Map conversationId -> array of {userId, username}
    const publicChannels = ref([]) // Discoverable public channels
    const onlineUsers = ref({}) // Map userId -> 'online' | 'offline' | 'away'
    const searchResults = ref([]) // Message search results
    const isSearching = ref(false)
    const hasMoreMessages = ref({}) // Map conversationId -> boolean
    const loadingOlder = ref(false)

    // Computeds
    const activeConversation = computed(() =>
        conversations.value.find(c => c.id === activeConversationId.value)
    )

    const activeMessages = computed(() => {
        if (!activeConversationId.value) return []
        return messages.value[activeConversationId.value] || []
    })

    const activeTypingUsers = computed(() => {
        if (!activeConversationId.value) return []
        return typingUsers.value[activeConversationId.value] || []
    })

    // Actions
    function setTyping(conversationId, userId, username, isTyping) {
        if (!typingUsers.value[conversationId]) {
            typingUsers.value[conversationId] = []
        }
        const currentTyping = typingUsers.value[conversationId]
        if (isTyping) {
            if (!currentTyping.find(u => u.userId === userId)) {
                currentTyping.push({ userId, username })
            }
        } else {
            typingUsers.value[conversationId] = currentTyping.filter(u => u.userId !== userId)
        }
    }

    function setActiveConversation(id) {
        activeConversationId.value = id
        // Reset unread count when user opens a conversation
        if (id) {
            const conv = conversations.value.find(c => c.id === id)
            if (conv) conv.unreadCount = 0
        }
        // Fetch messages for this conversation if not already loaded
        if (id && !messages.value[id]) {
            fetchMessages(id)
        }
    }

    async function fetchConversations() {
        try {
            const response = await api.get('/messages/conversations')
            conversations.value = response.data.data || []
        } catch (err) {
            console.error('Failed to fetch conversations:', err)
            // Mock data for dev if API fails
            if (conversations.value.length === 0) {
                conversations.value = []
            }
        }
    }

    async function fetchPublicChannels() {
        try {
            const response = await api.get('/messages/channels')
            publicChannels.value = response.data.data || []
        } catch (err) {
            console.error('Failed to fetch public channels:', err)
            publicChannels.value = []
        }
    }

    async function joinPublicChannel(channelId) {
        try {
            const response = await api.post(`/messages/channels/${channelId}/join`)
            if (response.data.success) {
                await fetchConversations() // Refresh user's joined conversations
                await fetchPublicChannels() // Refresh public list status
                return true
            }
            return false
        } catch (err) {
            console.error('Failed to join public channel:', err)
            throw err
        }
    }

    async function createConversation(participantIds, isGroup = false, name = '', description = '', isPublic = false) {
        try {
            const response = await api.post('/messages/conversations', { participantIds, isGroup, name, description, isPublic })
            const newConv = response.data.data

            // Refresh conversations list to get complete data with participants
            await fetchConversations()

            return newConv.id
        } catch (err) {
            console.error('Failed to create conversation:', err)
            return null
        }
    }

    async function manageGroupParticipants(conversationId, participantIds, action = 'add') {
        try {
            const response = await api.put(`/messages/conversations/${conversationId}/participants`, { participantIds, action })
            await fetchConversations()
            return response.data
        } catch (err) {
            console.error('Failed to manage participants:', err)
            throw err;
        }
    }

    async function sendMessage(conversationId, content, type = 'text', options = {}) {
        try {
            const { replyTo = null, expiresIn = null } = options;
            const response = await api.post(`/messages/conversations/${conversationId}`, {
                content,
                contentType: type,
                replyTo,
                expiresIn
            })
            const newMessage = response.data.data

            if (!messages.value[conversationId]) {
                messages.value[conversationId] = []
            }
            messages.value[conversationId].push(newMessage)

            // Update last message in conversation list
            const conv = conversations.value.find(c => c.id === conversationId)
            if (conv) {
                if (type === 'deleted') conv.lastMessage = '🚫 Mensagem apagada';
                else if (type === 'audio') conv.lastMessage = '🎙️ Áudio';
                else if (type === 'image') conv.lastMessage = '📷 Imagem';
                else if (type === 'call') conv.lastMessage = '📞 Chamada';
                else if (content && typeof content === 'string' && content.includes('/api/uploads/')) conv.lastMessage = '📎 Anexo de Arquivo';
                else if (type === 'text') conv.lastMessage = content;
                else conv.lastMessage = '📎 Arquivo';

                conv.lastMessageAt = new Date().toISOString()
            }
        } catch (err) {
            console.error('Failed to send message:', err)
            throw err
        }
    }

    async function editMessage(messageId, content) {
        try {
            await api.put(`/messages/${messageId}`, { content })
        } catch (err) {
            console.error('Failed to edit message', err)
        }
    }

    async function deleteMessage(messageId) {
        try {
            await api.delete(`/messages/${messageId}`)
        } catch (err) {
            console.error('Failed to delete message', err)
        }
    }

    async function toggleReaction(messageId, emoji) {
        try {
            const response = await api.post(`/messages/${messageId}/react`, { emoji })
            return response.data.data // new reactions object
        } catch (err) {
            console.error('Failed to react', err)
        }
    }

    async function markAsRead(messageId) {
        try {
            await api.put(`/messages/${messageId}/read`)
        } catch (err) {
            console.error('Failed to mark message as read', err)
        }
    }

    async function uploadFile(file) {
        try {
            const formData = new FormData()
            formData.append('file', file)

            // NOTE: Do NOT set Content-Type manually - axios must auto-set it 
            // with `multipart/form-data; boundary=...` for the server to parse correctly
            const response = await api.post('/uploads', formData)
            return response.data;
        } catch (err) {
            console.error('Failed to upload file:', err)
            throw err
        }
    }

    async function fetchMessages(conversationId) {
        try {
            const response = await api.get(`/messages/conversations/${conversationId}?limit=50`)
            messages.value[conversationId] = response.data.data || []
            // If we got exactly 50 messages, there might be more
            hasMoreMessages.value[conversationId] = (response.data.data || []).length >= 50
        } catch (err) {
            console.error('Failed to fetch messages:', err)
            messages.value[conversationId] = []
            hasMoreMessages.value[conversationId] = false
        }
    }

    async function fetchOlderMessages(conversationId) {
        if (loadingOlder.value || !hasMoreMessages.value[conversationId]) return false

        const existing = messages.value[conversationId] || []
        if (existing.length === 0) return false

        const oldestMessage = existing[0]
        loadingOlder.value = true

        try {
            const response = await api.get(`/messages/conversations/${conversationId}?limit=50&cursor=${oldestMessage.createdAt}`)
            const olderMsgs = response.data.data || []

            if (olderMsgs.length > 0) {
                // Prepend older messages (they come in ASC order from .reverse())
                messages.value[conversationId] = [...olderMsgs, ...existing]
            }

            hasMoreMessages.value[conversationId] = olderMsgs.length >= 50
            return olderMsgs.length > 0
        } catch (err) {
            console.error('Failed to fetch older messages:', err)
            return false
        } finally {
            loadingOlder.value = false
        }
    }

    function addMessage(conversationId, message) {
        if (!messages.value[conversationId]) {
            messages.value[conversationId] = []
        }

        // Avoid duplicates
        if (!messages.value[conversationId].find(m => m.id === message.id)) {
            messages.value[conversationId].push(message)
        }

        // Update conversation list preview
        const conv = conversations.value.find(c => c.id === conversationId)
        if (conv) {
            if (message.contentType === 'deleted') conv.lastMessage = '🚫 Mensagem apagada';
            else if (message.contentType === 'audio') conv.lastMessage = '🎙️ Áudio';
            else if (message.contentType === 'image') conv.lastMessage = '📷 Imagem';
            else if (message.contentType === 'call') conv.lastMessage = '📞 Chamada';
            else if (message.contentType === 'video') conv.lastMessage = '🎬 Vídeo';
            else if (message.content && typeof message.content === 'string' && message.content.includes('/api/uploads/')) conv.lastMessage = '📎 Anexo de Arquivo';
            else if (message.contentType === 'text' || !message.contentType) conv.lastMessage = message.content;
            else conv.lastMessage = '📎 Arquivo';

            conv.lastMessageAt = message.createdAt
            if (activeConversationId.value !== conversationId) {
                conv.unreadCount = (conv.unreadCount || 0) + 1
            }
        }
    }

    function updateMessageDeleted(conversationId, messageId) {
        if (messages.value[conversationId]) {
            const msg = messages.value[conversationId].find(m => m.id === messageId)
            if (msg) {
                msg.isDeleted = true
                msg.content = '🚫 Mensagem apagada'
                msg.contentType = 'deleted'
            }
        }

        // Update conv preview if it was the last message
        const conv = conversations.value.find(c => c.id === conversationId)
        if (conv) {
            // Need a reliable way to check if this was the last message, this is a quick approximation
            conv.lastMessage = '🚫 Mensagem apagada'
        }
    }

    function updateMessageEdited(conversationId, messageId, content, editedAt) {
        if (messages.value[conversationId]) {
            const msg = messages.value[conversationId].find(m => m.id === messageId)
            if (msg) {
                msg.content = content
                msg.editedAt = editedAt
            }
        }
        const conv = conversations.value.find(c => c.id === conversationId)
        if (conv) {
            conv.lastMessage = content;
        }
    }

    function updateMessageRead(conversationId, messageId, readBy) {
        if (messages.value[conversationId]) {
            const msg = messages.value[conversationId].find(m => m.id === messageId)
            if (msg) {
                msg.isRead = true
                // Track who read it (for "Seen by" feature in groups)
                if (readBy) {
                    if (!msg.readBy) msg.readBy = []
                    if (!msg.readBy.includes(readBy)) {
                        msg.readBy.push(readBy)
                    }
                }
            }
        }
    }

    function updateMessageReaction(conversationId, messageId, reactions) {
        if (messages.value[conversationId]) {
            const msg = messages.value[conversationId].find(m => m.id === messageId);
            if (msg) {
                msg.reactions = reactions;
            }
        }
    }

    async function saveCallLog(conversationId, callType, duration, status, isGroup = false) {
        try {
            const response = await api.post(`/messages/conversations/${conversationId}/call-log`, {
                callType, duration, status, isGroup
            })
            if (response.data.success) {
                addMessage(conversationId, response.data.data)
            }
        } catch (e) {
            console.error('Failed to save call log:', e)
        }
    }

    // ====== Online Presence ======
    async function fetchOnlineUsers() {
        try {
            const response = await api.get('/messages/online-users')
            onlineUsers.value = response.data.data || {}
        } catch (err) {
            console.error('Failed to fetch online users:', err)
        }
    }

    function updatePresence(userId, status) {
        onlineUsers.value = { ...onlineUsers.value, [userId]: status }
        // Also update participant status in conversations for DMs
        conversations.value.forEach(conv => {
            if (conv.participants) {
                const p = conv.participants.find(pp => pp.id === userId)
                if (p) p.status = status
            }
        })
    }

    function isUserOnline(userId) {
        return onlineUsers.value[userId] === 'online'
    }

    // ====== Message Search ======
    async function searchMessages(query) {
        if (!query || query.trim().length < 2) {
            searchResults.value = []
            isSearching.value = false
            return
        }
        isSearching.value = true
        try {
            const response = await api.get(`/messages/search?q=${encodeURIComponent(query.trim())}`)
            searchResults.value = response.data.data || []
        } catch (err) {
            console.error('Failed to search messages:', err)
            searchResults.value = []
        } finally {
            isSearching.value = false
        }
    }

    function clearSearch() {
        searchResults.value = []
        isSearching.value = false
    }

    // Clean up expired messages
    setInterval(() => {
        Object.keys(messages.value).forEach(convId => {
            messages.value[convId] = messages.value[convId].filter(m => {
                if (m.expiresAt && new Date(m.expiresAt) <= new Date()) return false;
                return true;
            });
        });
    }, 10000); // Check every 10 seconds

    return {
        conversations,
        activeConversationId,
        activeConversation,
        activeMessages,
        activeTypingUsers,
        publicChannels,
        onlineUsers,
        searchResults,
        isSearching,
        setActiveConversation,
        fetchConversations,
        fetchPublicChannels,
        joinPublicChannel,
        createConversation,
        manageGroupParticipants,
        sendMessage,
        fetchMessages,
        addMessage,
        uploadFile,
        editMessage,
        deleteMessage,
        markAsRead,
        updateMessageDeleted,
        updateMessageEdited,
        updateMessageRead,
        toggleReaction,
        updateMessageReaction,
        saveCallLog,
        setTyping,
        fetchOnlineUsers,
        updatePresence,
        isUserOnline,
        searchMessages,
        clearSearch,
        fetchOlderMessages,
        hasMoreMessages,
        loadingOlder
    }
})
