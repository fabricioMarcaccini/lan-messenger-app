import { nextTick, ref } from 'vue'

export function useChatPolls({ chatStore, authStore, onScrollToBottom }) {
  const showPollModal = ref(false)
  const pollForm = ref({
    question: '',
    options: ['', ''],
    multiChoice: false,
  })

  function parsePoll(content) {
    try {
      const parsed = JSON.parse(content || '{}')
      return {
        question: parsed.question || 'Enquete',
        options: Array.isArray(parsed.options) ? parsed.options : [],
        multiChoice: !!parsed.multiChoice,
      }
    } catch {
      return { question: 'Enquete', options: [], multiChoice: false }
    }
  }

  function getPollVotesCount(msg, optionIndex) {
    const results = msg.pollResults || []
    const found = results.find(r => Number(r.optionIndex) === Number(optionIndex))
    return found?.userIds?.length || 0
  }

  function isOptionSelected(msg, optionIndex) {
    const results = msg.pollResults || []
    const found = results.find(r => Number(r.optionIndex) === Number(optionIndex))
    return !!found?.userIds?.includes(authStore.user?.id)
  }

  async function voteInPoll(msg, optionIndex) {
    try {
      const pollResults = await chatStore.votePoll(msg.id, optionIndex)
      chatStore.updatePollResults(msg.conversationId || chatStore.activeConversationId, msg.id, pollResults)
    } catch (error) {
      alert(error.response?.data?.message || 'Não foi possível registrar seu voto.')
    }
  }

  async function createPollMessage() {
    if (!chatStore.activeConversationId) return

    const validOptions = pollForm.value.options.map(o => o.trim()).filter(Boolean)
    if (!pollForm.value.question.trim() || validOptions.length < 2) {
      alert('Informe uma pergunta e pelo menos 2 opções.')
      return
    }

    try {
      const created = await chatStore.createPoll(chatStore.activeConversationId, {
        question: pollForm.value.question.trim(),
        options: validOptions,
        multiChoice: pollForm.value.multiChoice,
      })
      if (created) {
        chatStore.addMessage(chatStore.activeConversationId, created)
      }
      showPollModal.value = false
      pollForm.value = { question: '', options: ['', ''], multiChoice: false }
      nextTick(() => onScrollToBottom?.())
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao criar enquete.')
    }
  }

  return {
    showPollModal,
    pollForm,
    parsePoll,
    getPollVotesCount,
    isOptionSelected,
    voteInPoll,
    createPollMessage,
  }
}
