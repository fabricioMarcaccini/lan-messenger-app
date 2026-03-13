import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useChatNotifications } from '@/composables/useChatNotifications'

export function useChatPresence({ chatStore, authStore }) {
  const { updateBadge } = useChatNotifications()
  const unreadCount = computed(() =>
    chatStore.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  )
  const totalUnreadCount = computed(
    () => unreadCount.value + (chatStore.unreadMentions || 0)
  )

  function getOtherUserOnline(conv) {
    const other = conv.participants?.find(p => p.id !== authStore.user?.id)
    if (!other) return false
    return chatStore.isUserOnline(other.id)
  }

  function getGroupOnlineCount(conv) {
    if (!conv.participants) return 0
    return conv.participants.filter(p => chatStore.isUserOnline(p.id)).length
  }

  let markReadTimer = null

  // Process read receipts when active conversation changes or new messages arrive
  watch(
    () => [chatStore.activeConversationId, chatStore.activeMessages.length],
    () => {
      const messages = chatStore.activeMessages
      if (!messages || messages.length === 0) return

      const unreadOwnMessages = messages.filter(m => !m.isRead && m.senderId !== authStore.user?.id)
      if (unreadOwnMessages.length > 0) {
        if (markReadTimer) clearTimeout(markReadTimer)
        markReadTimer = setTimeout(() => {
          unreadOwnMessages.forEach(m => {
            if (!m.isRead) {
              chatStore.markAsRead(m.id)
              m.isRead = true
            }
          })
        }, 500)

        const conv = chatStore.conversations.find(c => c.id === chatStore.activeConversationId)
        if (conv) conv.unreadCount = 0
      }
    },
    { deep: false }
  )

  watch(
    totalUnreadCount,
    (count) => {
      updateBadge(count)
    },
    { immediate: true }
  )

  function clearMentionsForConversation(conversationId) {
    if (!conversationId || !Array.isArray(chatStore.mentions)) return
    const unreadMentions = chatStore.mentions.filter(
      m => m.conversationId === conversationId && !m.isRead
    )
    if (unreadMentions.length === 0) return

    unreadMentions.forEach(m => {
      m.isRead = true
    })

    if (typeof chatStore.unreadMentions === 'number') {
      chatStore.unreadMentions = Math.max(0, chatStore.unreadMentions - unreadMentions.length)
    }
  }

  watch(
    () => chatStore.activeConversationId,
    (conversationId) => {
      clearMentionsForConversation(conversationId)
    }
  )

  let presenceInterval = null

  onMounted(() => {
    presenceInterval = setInterval(() => chatStore.fetchOnlineUsers(), 30000)
  })

  onUnmounted(() => {
    if (presenceInterval) clearInterval(presenceInterval)
    if (markReadTimer) clearTimeout(markReadTimer)
  })

  return {
    unreadCount,
    getOtherUserOnline,
    getGroupOnlineCount,
  }
}
