import { ref } from 'vue'

export function useChatMeetings({ api, chatStore }) {
  const showMeetingModal = ref(false)
  const meetingForm = ref({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
    meetingLink: '',
  })

  function parseMeeting(content) {
    try {
      const parsed = JSON.parse(content || '{}')
      return {
        meetingId: parsed.meetingId || null,
        title: parsed.title || 'Reunião',
        description: parsed.description || '',
        startAt: parsed.startAt || null,
        endAt: parsed.endAt || null,
        meetingLink: parsed.meetingLink || '',
      }
    } catch {
      return { meetingId: null, title: 'Reunião', description: '', startAt: null, endAt: null, meetingLink: '' }
    }
  }

  function formatMeetingDate(dateStr) {
    if (!dateStr) return 'Sem horário definido'
    const dt = new Date(dateStr)
    return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  async function createMeetingMessage() {
    if (!chatStore.activeConversationId) return
    if (!meetingForm.value.title.trim() || !meetingForm.value.startAt) {
      alert('Título e início da reunião são obrigatórios.')
      return
    }

    try {
      await api.post('/meetings', {
        conversationId: chatStore.activeConversationId,
        title: meetingForm.value.title.trim(),
        description: meetingForm.value.description?.trim() || '',
        startAt: new Date(meetingForm.value.startAt).toISOString(),
        endAt: meetingForm.value.endAt ? new Date(meetingForm.value.endAt).toISOString() : null,
        meetingLink: meetingForm.value.meetingLink?.trim() || '',
      })

      showMeetingModal.value = false
      meetingForm.value = { title: '', description: '', startAt: '', endAt: '', meetingLink: '' }
    } catch (error) {
      alert(error.response?.data?.message || 'Erro ao criar reunião.')
    }
  }

  return {
    showMeetingModal,
    meetingForm,
    parseMeeting,
    formatMeetingDate,
    createMeetingMessage,
  }
}
