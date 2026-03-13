import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

export function useChatWebRTC({ webrtcStore, chatStore, authStore }) {
  const isMuted = ref(false)
  const isCamOff = ref(false)
  const incomingOffer = ref(null)
  const callSeconds = ref(0)
  const callDuration = computed(() => {
    const m = Math.floor(callSeconds.value / 60).toString().padStart(2, '0')
    const s = (callSeconds.value % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  })

  let callTimerInterval = null
  let _callType = 'audio'
  let _callWasConnected = false

  function startP2PCall(type) {
    const targetUser = chatStore.activeConversation?.participants?.find(p => p.id !== authStore.user?.id)
    if (!targetUser) return
    webrtcStore.startCall(
      targetUser.id,
      targetUser.full_name || targetUser.username,
      targetUser.avatar_url,
      type
    )
  }

  function toggleMuteVideo() {
    isMuted.value = webrtcStore.toggleMute()
  }

  function toggleCamera() {
    isCamOff.value = webrtcStore.toggleVideo()
  }

  function toggleScreenShare() {
    webrtcStore.toggleScreenShare()
  }

  // Handle WebRTC Call Signaling
  function handleCallOffer(event) {
    const data = event.detail
    if (data && data.offer) {
      incomingOffer.value = data.offer
      webrtcStore.handleIncomingCall(data.callerId, data.callerName, data.callerAvatar, data.isVideo)
    }
  }

  function handleCallAnswer(event) {
    const data = event.detail
    if (data && data.answer) {
      webrtcStore.handleAnswer(data.answer)
    }
  }

  function handleIceCandidateEvent(event) {
    const data = event.detail
    if (data && data.candidate) {
      webrtcStore.handleIceCandidate(data.candidate)
    }
  }

  function handleCallEnd() {
    webrtcStore.endCallLocally()
  }

  watch(() => webrtcStore.callState, (state, oldState) => {
    if (state === 'connected') {
      _callWasConnected = true
      _callType = webrtcStore.isScreenSharing ? 'screen' : webrtcStore.isVideoCall ? 'video' : 'audio'
      callSeconds.value = 0
      callTimerInterval = setInterval(() => { callSeconds.value++ }, 1000)
    } else if (state === 'idle' && oldState !== 'idle') {
      const duration = callSeconds.value
      const convId = chatStore.activeConversationId

      if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
      callSeconds.value = 0
      isMuted.value = false
      isCamOff.value = false

      if (convId) {
        let status = 'missed'
        if (_callWasConnected) status = 'completed'
        else if (oldState === 'receiving') status = 'declined'

        chatStore.saveCallLog(convId, _callType, duration, status)
      }
      _callWasConnected = false
    } else {
      if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
      callSeconds.value = 0
      isMuted.value = false
      isCamOff.value = false
    }
  })

  onMounted(() => {
    window.addEventListener('socket:call:offer', handleCallOffer)
    window.addEventListener('socket:call:answer', handleCallAnswer)
    window.addEventListener('socket:call:ice-candidate', handleIceCandidateEvent)
    window.addEventListener('socket:call:end', handleCallEnd)
  })

  onUnmounted(() => {
    window.removeEventListener('socket:call:offer', handleCallOffer)
    window.removeEventListener('socket:call:answer', handleCallAnswer)
    window.removeEventListener('socket:call:ice-candidate', handleIceCandidateEvent)
    window.removeEventListener('socket:call:end', handleCallEnd)

    if (callTimerInterval) {
      clearInterval(callTimerInterval)
      callTimerInterval = null
    }

    if (webrtcStore.callState !== 'idle') {
      webrtcStore.endCallLocally()
    }
  })

  return {
    isMuted,
    isCamOff,
    incomingOffer,
    callDuration,
    startP2PCall,
    toggleMuteVideo,
    toggleCamera,
    toggleScreenShare,
  }
}
