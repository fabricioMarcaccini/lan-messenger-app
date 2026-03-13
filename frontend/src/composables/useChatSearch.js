import { computed, onUnmounted, ref } from 'vue'

export function useChatSearch({ chatStore }) {
  const searchQuery = ref('')
  let searchDebounceTimer = null

  function handleSearchInput() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
    searchDebounceTimer = setTimeout(() => {
      if (searchQuery.value && searchQuery.value.trim().length >= 3) {
        chatStore.searchMessages(searchQuery.value)
      } else {
        chatStore.clearSearch()
      }
    }, 400)
  }

  function clearSearch() {
    searchQuery.value = ''
    chatStore.clearSearch()
  }

  const filteredChannels = computed(() => {
    if (!searchQuery.value) return chatStore.conversations.filter(c => c.isGroup)
    const query = searchQuery.value.toLowerCase()
    return chatStore.conversations.filter(c =>
      c.isGroup && (
        c.name?.toLowerCase().includes(query) ||
        c.participants.some(p => p.full_name?.toLowerCase().includes(query))
      )
    )
  })

  const filteredDirectMessages = computed(() => {
    if (!searchQuery.value) return chatStore.conversations.filter(c => !c.isGroup)
    const query = searchQuery.value.toLowerCase()
    return chatStore.conversations.filter(c =>
      !c.isGroup && (
        c.name?.toLowerCase().includes(query) ||
        c.participants.some(p => p.full_name?.toLowerCase().includes(query))
      )
    )
  })

  const searchResults = computed(() => chatStore.searchResults)
  const isSearching = computed(() => chatStore.isSearching)

  onUnmounted(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
      searchDebounceTimer = null
    }
  })

  return {
    searchQuery,
    handleSearchInput,
    clearSearch,
    filteredChannels,
    filteredDirectMessages,
    searchResults,
    isSearching,
  }
}
