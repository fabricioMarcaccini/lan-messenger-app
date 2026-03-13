// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useChatMessages } from '../useChatMessages'

function createChatStore() {
  const activeConversationId = ref('conv-1')
  const messages = ref([
    { id: 'm1', createdAt: new Date().toISOString() },
  ])
  const loadingOlder = ref(false)
  const hasMoreMessages = ref({ 'conv-1': true })

  const chatStore = {
    get activeConversationId() { return activeConversationId.value },
    set activeConversationId(v) { activeConversationId.value = v },
    get activeMessages() { return messages.value },
    get loadingOlder() { return loadingOlder.value },
    get hasMoreMessages() { return hasMoreMessages.value },
    fetchOlderMessages: vi.fn(async () => {
      messages.value = [
        { id: 'm0', createdAt: new Date(Date.now() - 60000).toISOString() },
        ...messages.value,
      ]
      return true
    }),
    hydrateConversationMessages: vi.fn((convId, cached) => {
      messages.value = cached
    }),
    _state: { messages, hasMoreMessages },
  }

  return chatStore
}

describe('useChatMessages', () => {
  it('updates reactive messages after fetching older history', async () => {
    const chatStore = createChatStore()
    const { messages, handleMessagesScroll } = useChatMessages({ chatStore })

    const el = {
      scrollHeight: 1000,
      scrollTop: 0,
      clientHeight: 600,
    }

    await handleMessagesScroll({ target: el })
    await nextTick()

    expect(chatStore.fetchOlderMessages).toHaveBeenCalledWith('conv-1')
    expect(messages.value.length).toBe(2)
    expect(messages.value[0].id).toBe('m0')
  })

  it('reflects pagination flags (hasMoreMessages)', async () => {
    const chatStore = createChatStore()
    const { hasMoreMessages } = useChatMessages({ chatStore })

    expect(hasMoreMessages.value).toBe(true)

    chatStore._state.hasMoreMessages.value = { 'conv-1': false }
    await nextTick()

    expect(hasMoreMessages.value).toBe(false)
  })
})
