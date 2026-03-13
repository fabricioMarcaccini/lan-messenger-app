import { computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useSocketStore } from '@/stores/socket'
import { useChatNotifications } from '@/composables/useChatNotifications'

export function useChatSockets({ chatStore, authStore, isDeepWorkMode, onScrollToBottom }) {
  const socketStore = useSocketStore()
  const isConnected = computed(() => socketStore.connected)
  const { notifyNewMessage } = useChatNotifications()

  function joinConversation(conversationId) {
    if (!conversationId) return
    socketStore.joinConversation(conversationId)
  }

  function sendTyping(conversationId, isTyping) {
    if (!conversationId) return
    socketStore.sendTyping(conversationId, isTyping)
  }

  function getTypingUsers(conversationId) {
    if (!conversationId) return []
    return socketStore.getTypingUsers(conversationId) || []
  }

  function disconnect() {
    socketStore.disconnect()
  }

  // ===== Socket Event Handlers (Messages / Presence) =====
  let notifAudioCtx = null
  function playNotificationSound() {
    if (isDeepWorkMode?.value) return
    try {
      if (!notifAudioCtx) notifAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = notifAudioCtx
      if (ctx.state === 'suspended') ctx.resume()

      const now = ctx.currentTime
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, now + i * 0.18)
        gain.gain.setValueAtTime(0, now + i * 0.18)
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.18 + 0.04)
        gain.gain.linearRampToValueAtTime(0, now + i * 0.18 + 0.14)
        osc.start(now + i * 0.18)
        osc.stop(now + i * 0.18 + 0.15)
      }
    } catch (e) {
      // ignore audio errors
    }
  }

  function handlePresenceChange(event) {
    const { userId, status } = event.detail || {}
    if (userId && status) {
      chatStore.updatePresence(userId, status)
    }
  }

  function handleNewMessage(event) {
    const message = event.detail
    if (message && message.conversationId) {
      chatStore.addMessage(message.conversationId, message)

      if (chatStore.activeConversationId === message.conversationId) {
        nextTick(() => {
          if (onScrollToBottom) onScrollToBottom()
        })
        if (message.senderId !== authStore.user?.id) {
          chatStore.markAsRead(message.id)
        }
      }

      const isFromSelf = message.senderId === authStore.user?.id
      const isBackground = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      const isDifferentConversation = chatStore.activeConversationId !== message.conversationId

      if (!isFromSelf && (isBackground || isDifferentConversation)) {
        playNotificationSound()
        notifyNewMessage(message, message.senderName || message.senderUsername)
      }
    }
  }

  function handleMessageEdited(event) {
    const data = event.detail
    if (data?.conversationId && data?.messageId) {
      chatStore.updateMessageEdited(data.conversationId, data.messageId, data.content, data.editedAt)
    }
  }

  function handleMessageReaction(event) {
    const data = event.detail
    if (data?.conversationId && data?.messageId) {
      chatStore.updateMessageReaction(data.conversationId, data.messageId, data.reactions)
    }
  }

  function handleMessageDeleted(event) {
    const data = event.detail
    if (data?.conversationId && data?.messageId) {
      chatStore.updateMessageDeleted(data.conversationId, data.messageId)
    }
  }

  function handleMessageRead(event) {
    const data = event.detail
    if (data?.conversationId && data?.messageId) {
      chatStore.updateMessageRead(data.conversationId, data.messageId, data.readBy)
    }
  }

  function handleMessagePinned(event) {
    const data = event.detail
    if (!data?.conversationId) return

    if (data.conversationId === chatStore.activeConversationId) {
      chatStore.fetchPinnedMessage(data.conversationId)
    }
    chatStore.setPinnedMessage(data)
  }

  function handlePollUpdated(event) {
    const data = event.detail
    if (data?.conversationId && data?.messageId) {
      chatStore.updatePollResults(data.conversationId, data.messageId, data.pollResults || [])
    }
  }

  function handleMentionNew(event) {
    const data = event.detail || {}
    chatStore.unreadMentions += 1
    if (Array.isArray(chatStore.mentions)) {
      const exists = chatStore.mentions.some(m => m.messageId === data.messageId)
      if (!exists) {
        chatStore.mentions.unshift({
          id: `mention-${data.messageId}`,
          messageId: data.messageId,
          conversationId: data.conversationId,
          isRead: false,
          mentionedAt: data.createdAt || new Date().toISOString(),
          content: data.content || '',
          mentioner: {
            username: data.mentionerUsername,
            fullName: data.mentionerName,
          },
        })
      }
    }

    const mentionConversationId = data.conversationId
    const isBackground = typeof document !== 'undefined' && document.visibilityState === 'hidden'
    const isDifferentConversation =
      mentionConversationId && chatStore.activeConversationId !== mentionConversationId

    if (isBackground || isDifferentConversation) {
      playNotificationSound()
      notifyNewMessage(
        { content: data.content || '' },
        data.mentionerName || data.mentionerUsername || 'Alguém',
        {
          title: 'Você foi mencionado',
          body: `${data.mentionerName || data.mentionerUsername || 'Alguém'}: ${data.content || ''}`,
        }
      )
    }
  }

  function handleBotReply(event) {
    const message = event.detail
    if (!message?.conversationId) return
    chatStore.addMessage(message.conversationId, message)
    if (message.conversationId === chatStore.activeConversationId) {
      nextTick(() => {
        if (onScrollToBottom) onScrollToBottom()
      })
    }
  }

  function handleUserStatusChanged(event) {
    const data = event.detail || {}
    const { userId } = data
    if (!userId) return

    chatStore.conversations.forEach((conv) => {
      conv.participants?.forEach((p) => {
        if (p.id === userId) {
          p.custom_status_text = data.customStatusText || null
          p.custom_status_emoji = data.customStatusEmoji || null
          p.custom_status_expires_at = data.customStatusExpiresAt || null
          p.ooo_until = data.oooUntil || null
          p.ooo_message = data.oooMessage || null
        }
      })
    })
  }

  onMounted(() => {
    window.addEventListener('socket:message', handleNewMessage)
    window.addEventListener('socket:message:edited', handleMessageEdited)
    window.addEventListener('socket:message:deleted', handleMessageDeleted)
    window.addEventListener('socket:message:reaction', handleMessageReaction)
    window.addEventListener('socket:message:read', handleMessageRead)
    window.addEventListener('socket:message:pinned', handleMessagePinned)
    window.addEventListener('socket:poll:updated', handlePollUpdated)
    window.addEventListener('socket:mention:new', handleMentionNew)
    window.addEventListener('socket:bot:reply', handleBotReply)
    window.addEventListener('socket:user:status-changed', handleUserStatusChanged)
    window.addEventListener('socket:presence', handlePresenceChange)

  })

  onUnmounted(() => {
    window.removeEventListener('socket:message', handleNewMessage)
    window.removeEventListener('socket:message:edited', handleMessageEdited)
    window.removeEventListener('socket:message:deleted', handleMessageDeleted)
    window.removeEventListener('socket:message:reaction', handleMessageReaction)
    window.removeEventListener('socket:message:read', handleMessageRead)
    window.removeEventListener('socket:message:pinned', handleMessagePinned)
    window.removeEventListener('socket:poll:updated', handlePollUpdated)
    window.removeEventListener('socket:mention:new', handleMentionNew)
    window.removeEventListener('socket:bot:reply', handleBotReply)
    window.removeEventListener('socket:user:status-changed', handleUserStatusChanged)
    window.removeEventListener('socket:presence', handlePresenceChange)
  })

  return {
    isConnected,
    joinConversation,
    sendTyping,
    getTypingUsers,
    disconnect,
  }
}
