import { nextTick, ref } from 'vue'

export function useChatAI({ api, chatStore, authStore, formatTime, newMessage, autoResize }) {
  const smartReplies = ref([])
  const isGeneratingReplies = ref(false)
  const isProcessingMagic = ref(false)
  const showInsightsModal = ref(false)
  const insightsType = ref('summarize')
  const isProcessingInsights = ref(false)
  const insightsResult = ref('')

  async function applyMagicText(action) {
    if (!newMessage?.value?.trim()) return

    isProcessingMagic.value = true
    try {
      const response = await api.post('/ai/magic-text', {
        text: newMessage.value,
        action: action,
      })

      if (response.data.success) {
        newMessage.value = response.data.data.result
      } else {
        alert(response.data.message || 'Erro ao processar texto com IA')
      }
    } catch (error) {
      console.error('Magic AI error:', error)
      alert('Ops! Houve um erro ao se comunicar com a IA. Tente novamente mais tarde.')
    } finally {
      isProcessingMagic.value = false
      nextTick(() => {
        const textarea = document.querySelector('textarea')
        if (textarea) autoResize({ target: textarea })
      })
    }
  }

  async function fetchInsights(type) {
    insightsType.value = type
    showInsightsModal.value = true
    isProcessingInsights.value = true
    insightsResult.value = ''

    const msgs = chatStore.activeMessages.slice(-60).map(m => {
      const senderName = m.senderId === authStore.user?.id ? 'Eu' : (m.sender?.fullName || m.sender?.username || 'Sistema')
      return `[${formatTime(m.createdAt)}] ${senderName}: ${m.content || '[Mídia ' + m.contentType + ']'}`
    }).join('\n')

    try {
      const response = await api.post('/ai/analyze-chat', { textLog: msgs, action: type })
      if (response.data.success) {
        insightsResult.value = response.data.result
      } else {
        insightsResult.value = '❌ Não foi possível gerar o resumo. Verifique a conexão com a API.'
      }
    } catch (e) {
      insightsResult.value = 'Houve um erro de comunicação intermitente com a Inteligência Artificial.'
    } finally {
      isProcessingInsights.value = false
    }
  }

  async function generateSmartReplies() {
    const lastOtherMsg = [...chatStore.activeMessages].reverse().find(m => m.senderId !== authStore.user?.id && m.contentType === 'text')
    if (!lastOtherMsg || !lastOtherMsg.content) {
      alert('Você precisa receber uma mensagem de texto primeiro para sugerirmos respostas!')
      return
    }

    isGeneratingReplies.value = true
    smartReplies.value = []

    try {
      const res = await api.post('/ai/smart-replies', { contextText: lastOtherMsg.content })
      if (res.data.success && res.data.replies && Array.isArray(res.data.replies)) {
        smartReplies.value = res.data.replies
      } else {
        alert('A Inteligência Artificial não retornou opções no formato esperado.')
      }
    } catch (e) {
      console.error(e)
      alert('Erro ao pedir sugestão de respostas.')
    } finally {
      isGeneratingReplies.value = false
    }
  }

  function clearSmartReplies() {
    smartReplies.value = []
  }

  function useSmartReply(replyText) {
    newMessage.value = replyText
    smartReplies.value = []
    nextTick(() => {
      const textarea = document.querySelector('textarea')
      if (textarea) autoResize({ target: textarea })
    })
  }

  async function translateMessage(msg) {
    msg.isTranslating = true
    try {
      const res = await api.post('/ai/translate-message', {
        text: msg.content,
        targetLanguage: navigator.language.startsWith('pt') ? 'pt-BR' : 'en',
      })
      if (res.data.success) {
        msg.aiTranslation = res.data.translation
      }
    } catch (e) {
      alert('Erro ao tentar traduzir a mensagem. O servidor de IA pode estar fora.')
    } finally {
      msg.isTranslating = false
    }
  }

  async function transcribeAudio(msg) {
    msg.isTranscribing = true
    let fileId = msg.content
    if (msg.content && msg.content.includes('/api/uploads/')) {
      const parts = msg.content.split('/api/uploads/')
      if (parts.length > 1) {
        fileId = parts[1].split('/')[0]
      }
    } else if (msg.content && msg.content.startsWith('/uploads/')) {
      fileId = msg.content.replace('/uploads/', '').split('.')[0]
    }

    try {
      const res = await api.post('/ai/transcribe-audio', { fileId: fileId })
      if (res.data.success) {
        msg.aiTranscription = res.data.summary || res.data.transcript
      }
    } catch (e) {
      alert('Erro ao transcrever o áudio. (Verifique as API Keys no Servidor)')
    } finally {
      msg.isTranscribing = false
    }
  }

  async function requestLanlyReply(messageText) {
    try {
      const context = chatStore.activeMessages.slice(-10).map((m) => ({
        senderUsername: m.senderUsername,
        senderName: m.senderName,
        content: m.content,
      }))
      const response = await api.post('/ai/bot-reply', {
        message: messageText,
        context,
        conversationId: chatStore.activeConversationId,
      })

      if (response.data?.success && response.data?.data?.reply) {
        chatStore.addMessage(chatStore.activeConversationId, {
          id: `bot-local-${Date.now()}`,
          conversationId: chatStore.activeConversationId,
          senderId: 'lanly-bot',
          senderUsername: 'lanly',
          senderName: 'Lanly Bot',
          senderAvatar: null,
          content: response.data.data.reply,
          contentType: 'text',
          createdAt: response.data.data.createdAt || new Date().toISOString(),
          reactions: {},
        })
      }
    } catch (error) {
      console.warn('Lanly fallback reply failed:', error.message)
    }
  }

  return {
    smartReplies,
    isGeneratingReplies,
    isProcessingMagic,
    showInsightsModal,
    insightsType,
    isProcessingInsights,
    insightsResult,
    applyMagicText,
    fetchInsights,
    generateSmartReplies,
    clearSmartReplies,
    useSmartReply,
    translateMessage,
    transcribeAudio,
    requestLanlyReply,
  }
}
