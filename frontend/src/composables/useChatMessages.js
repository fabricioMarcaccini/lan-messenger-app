import { computed, nextTick, ref, watch } from 'vue'

const CACHE_DB_NAME = 'lanly-chat-cache'
const CACHE_STORE_NAME = 'conversation_messages'

function openCacheDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null)
      return
    }

    const request = window.indexedDB.open(CACHE_DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: 'conversationId' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function saveCachedMessages(conversationId, msgs) {
  if (!conversationId || !Array.isArray(msgs)) return
  try {
    const db = await openCacheDb()
    if (!db) return

    const plainMsgs = JSON.parse(JSON.stringify(msgs.slice(-50)))

    const tx = db.transaction(CACHE_STORE_NAME, 'readwrite')
    const store = tx.objectStore(CACHE_STORE_NAME)
    store.put({
      conversationId,
      messages: plainMsgs,
      updatedAt: Date.now(),
    })
  } catch (e) {
    console.warn('Cache save failed (non-critical):', e.message)
  }
}

async function loadCachedMessages(conversationId) {
  if (!conversationId) return []
  const db = await openCacheDb()
  if (!db) return []

  return new Promise((resolve) => {
    const tx = db.transaction(CACHE_STORE_NAME, 'readonly')
    const store = tx.objectStore(CACHE_STORE_NAME)
    const request = store.get(conversationId)
    request.onsuccess = () => resolve(request.result?.messages || [])
    request.onerror = () => resolve([])
  })
}

export function useChatMessages({ chatStore }) {
  const messagesContainer = ref(null)
  const isNearBottom = ref(true)
  const newMessagesCount = ref(0)

  const messages = computed(() => chatStore.activeMessages)
  const isLoadingOlder = computed(() => chatStore.loadingOlder)
  const hasMoreMessages = computed(() => Boolean(chatStore.hasMoreMessages?.[chatStore.activeConversationId]))

  async function handleMessagesScroll(event) {
    const el = event.target

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottom.value = distanceFromBottom < 120

    if (isNearBottom.value) {
      newMessagesCount.value = 0
    }

    if (el.scrollTop < 80 && chatStore.activeConversationId) {
      const prevHeight = el.scrollHeight
      const loaded = await chatStore.fetchOlderMessages(chatStore.activeConversationId)
      if (loaded) {
        await nextTick()
        el.scrollTop = el.scrollHeight - prevHeight
      }
    }
  }

  function scrollToBottomSmooth() {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTo({ top: messagesContainer.value.scrollHeight, behavior: 'smooth' })
      newMessagesCount.value = 0
      isNearBottom.value = true
    }
  }

  function scrollToBottom(force) {
    if (messagesContainer.value) {
      if (!force && !isNearBottom.value) {
        newMessagesCount.value += 1
        return
      }
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      newMessagesCount.value = 0
    }
  }

  async function hydrateMessagesFromCache(conversationId) {
    const cached = await loadCachedMessages(conversationId)
    if (cached.length > 0) {
      chatStore.hydrateConversationMessages(conversationId, cached)
    }
    return cached
  }

  watch(() => chatStore.activeMessages.length, () => {
    nextTick(scrollToBottom)
  })

  watch(
    () => [chatStore.activeConversationId, chatStore.activeMessages.length],
    () => {
      if (chatStore.activeConversationId) {
        saveCachedMessages(chatStore.activeConversationId, chatStore.activeMessages)
      }
    },
    { deep: false }
  )

  return {
    messages,
    isLoadingOlder,
    hasMoreMessages,
    messagesContainer,
    isNearBottom,
    newMessagesCount,
    handleMessagesScroll,
    scrollToBottomSmooth,
    scrollToBottom,
    hydrateMessagesFromCache,
  }
}
