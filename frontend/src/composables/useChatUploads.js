import { ref } from 'vue'

const BLOCKED_EXTENSIONS = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.js', '.jar', '.scr', '.pif']
const MAX_FILE_SIZE = 50 * 1024 * 1024

export function useChatUploads({ chatStore }) {
  const isUploading = ref(false)
  const uploadError = ref(null)

  function validateFile(file) {
    if (!file) return { ok: false, message: 'Arquivo inválido' }

    const fileExt = '.' + file.name.split('.').pop().toLowerCase()
    if (BLOCKED_EXTENSIONS.includes(fileExt)) {
      return { ok: false, message: 'Tipo de arquivo não permitido por segurança' }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, message: 'Arquivo muito grande. Máximo permitido: 50MB' }
    }

    return { ok: true }
  }

  async function uploadFile(file) {
    isUploading.value = true
    uploadError.value = null
    try {
      return await chatStore.uploadFile(file)
    } catch (error) {
      uploadError.value = error
      throw error
    } finally {
      isUploading.value = false
    }
  }

  async function uploadAndSendFile(file, { conversationId, replyTo = null, expiresIn = null } = {}) {
    if (!conversationId) return false
    const validation = validateFile(file)
    if (!validation.ok) {
      alert(validation.message)
      return false
    }

    try {
      console.log('📤 Uploading file:', file.name, file.type, file.size)
      const uploadedFile = await uploadFile(file)
      console.log('✅ Upload success:', uploadedFile)
      await chatStore.sendMessage(conversationId, uploadedFile.data.url, uploadedFile.data.contentType, {
        replyTo,
        expiresIn,
      })
      return true
    } catch (error) {
      console.error('❌ Upload failed:', error)
      alert('Erro ao enviar arquivo: ' + (error.response?.data?.message || error.message || 'Erro desconhecido'))
      return false
    }
  }

  async function uploadAndSendWhiteboard(file, { conversationId, replyTo = null, expiresIn = null } = {}) {
    if (!conversationId || !file) return false
    try {
      const uploadedFile = await uploadFile(file)
      await chatStore.sendMessage(conversationId, uploadedFile.data.url, uploadedFile.data.contentType, {
        replyTo,
        expiresIn,
      })
      return true
    } catch (error) {
      console.error('❌ Upload whiteboard failed:', error)
      alert('Erro ao enviar lousa: ' + (error.response?.data?.message || error.message || 'Erro desconhecido'))
      return false
    }
  }

  async function uploadDroppedFiles(files, { conversationId } = {}) {
    if (!conversationId || !files || files.length === 0) return
    for (const file of files) {
      try {
        const uploadResult = await uploadFile(file)
        if (uploadResult?.success && uploadResult?.data?.url) {
          const url = uploadResult.data.url
          const ct = uploadResult.data.contentType || 'file'
          await chatStore.sendMessage(conversationId, url, ct)
        }
      } catch (err) {
        console.error('Drop upload failed:', err)
      }
    }
  }

  async function uploadAudioBlob(audioBlob, { conversationId } = {}) {
    if (!conversationId || !audioBlob) return false
    try {
      const actualMime = audioBlob.type || 'audio/webm'
      const ext = actualMime.includes('mp4') ? 'mp4' : 'webm'
      const file = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: actualMime })
      const uploadResult = await uploadFile(file)
      const fileUrl = uploadResult.data?.url || uploadResult.url
      if (!fileUrl) {
        console.error('Upload returned no URL:', uploadResult)
        alert('Erro ao enviar áudio: URL não retornada')
        return false
      }
      await chatStore.sendMessage(conversationId, fileUrl, 'audio')
      return true
    } catch (err) {
      console.error('Audio upload failed:', err)
      alert('Erro ao enviar áudio: ' + (err.response?.data?.message || err.message || 'Erro desconhecido'))
      return false
    }
  }

  return {
    isUploading,
    uploadError,
    uploadFile,
    uploadAndSendFile,
    uploadAndSendWhiteboard,
    uploadDroppedFiles,
    uploadAudioBlob,
    validateFile,
  }
}
