import { computed, onMounted, onUnmounted, watch } from 'vue'

export function useChatPresence({ chatStore, authStore }) {
  const unreadCount = computed(() =>
    chatStore.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
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
