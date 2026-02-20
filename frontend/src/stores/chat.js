import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from './auth'

export const useChatStore = defineStore('chat', () => {
    // State
    const conversations = ref([])
    const activeConversationId = ref(null)
    const messages = ref({}) // Map conversationId -> messages array

    // Computeds
    const activeConversation = computed(() =>
        conversations.value.find(c => c.id === activeConversationId.value)
    )

    const activeMessages = computed(() => {
        if (!activeConversationId.value) return []
        return messages.value[activeConversationId.value] || []
    })

    // Actions
    function setActiveConversation(id) {
        activeConversationId.value = id
        // Fetch messages for this conversation if not already loaded empty
        // Assuming we might want to refresh or load initial
        if (!messages.value[id]) {
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

    async function createConversation(participantIds, isGroup = false, name = '', description = '') {
        try {
            const response = await api.post('/messages/conversations', { participantIds, isGroup, name, description })
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

    async function sendMessage(conversationId, content, type = 'text') {
        try {
            const response = await api.post(`/messages/conversations/${conversationId}`, {
                content,
                contentType: type
            })
            const newMessage = response.data.data

            if (!messages.value[conversationId]) {
                messages.value[conversationId] = []
            }
            messages.value[conversationId].push(newMessage)

            // Update last message in conversation list
            if (conv) {
                if (type === 'deleted') conv.lastMessage = '🚫 Mensagem apagada';
                else if (type === 'text') conv.lastMessage = content;
                else if (type === 'audio') conv.lastMessage = '🎙️ Áudio';
                else if (type === 'image') conv.lastMessage = '📷 Imagem';
                else conv.lastMessage = '📎 Arquivo';

                conv.lastMessageAt = new Date().toISOString()
            }
        } catch (err) {
            console.error('Failed to send message:', err)
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

            const response = await api.post('/uploads', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data;
        } catch (err) {
            console.error('Failed to upload file:', err)
            throw err
        }
    }

    async function fetchMessages(conversationId) {
        try {
            const response = await api.get(`/messages/conversations/${conversationId}`)
            messages.value[conversationId] = response.data.data || []
        } catch (err) {
            console.error('Failed to fetch messages:', err)
            messages.value[conversationId] = []
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
            else if (message.contentType === 'text') conv.lastMessage = message.content;
            else if (message.contentType === 'audio') conv.lastMessage = '🎙️ Áudio';
            else if (message.contentType === 'image') conv.lastMessage = '📷 Imagem';
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
            }
        }
    }

    return {
        conversations,
        activeConversationId,
        activeConversation,
        activeMessages,
        setActiveConversation,
        fetchConversations,
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
        updateMessageRead
    }
})
