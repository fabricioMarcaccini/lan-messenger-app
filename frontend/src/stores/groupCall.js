import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useSocketStore } from './socket'
import { useAuthStore } from './auth'

export const useGroupCallStore = defineStore('groupCall', () => {
    const socketStore = useSocketStore()
    const authStore = useAuthStore()

    // State
    const callState = ref('idle') // 'idle', 'calling', 'receiving', 'connected'
    const isVideoCall = ref(false)
    const conversationId = ref(null)
    const localStream = shallowRef(null)
    const isMuted = ref(false)
    const isCamOff = ref(false)

    // Map of peerId -> { peerConnection, remoteStream, name, avatar }
    const peers = ref({})

    // Incoming call info
    const incomingCall = ref(null)

    // Call timer
    const callSeconds = ref(0)
    let callTimerInterval = null

    const callDuration = computed(() => {
        const m = Math.floor(callSeconds.value / 60).toString().padStart(2, '0')
        const s = (callSeconds.value % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    })

    const participantCount = computed(() => Object.keys(peers.value).length + 1) // +1 for self

    const remoteStreams = computed(() => {
        const streams = []
        for (const [id, peer] of Object.entries(peers.value)) {
            if (peer.remoteStream) {
                streams.push({
                    userId: id,
                    name: peer.name || 'Participante',
                    avatar: peer.avatar || '',
                    stream: peer.remoteStream
                })
            }
        }
        return streams
    })

    // STUN config
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }

    // Ringtone
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    let ringInterval = null

    function playRingtone() {
        stopRingtone()
        ringInterval = setInterval(() => {
            if (audioContext.state === 'suspended') audioContext.resume()
            const osc = audioContext.createOscillator()
            const gain = audioContext.createGain()
            osc.connect(gain)
            gain.connect(audioContext.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(440, audioContext.currentTime)
            osc.frequency.setValueAtTime(520, audioContext.currentTime + 0.3)
            gain.gain.setValueAtTime(0, audioContext.currentTime)
            gain.gain.linearRampToValueAtTime(0.08, audioContext.currentTime + 0.1)
            gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.8)
            osc.start(audioContext.currentTime)
            osc.stop(audioContext.currentTime + 0.8)
        }, 1500)
    }

    function stopRingtone() {
        if (ringInterval) { clearInterval(ringInterval); ringInterval = null }
    }

    // Setup local media
    async function setupLocalStream(type = 'audio') {
        if (localStream.value) {
            localStream.value.getTracks().forEach(t => t.stop())
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            video: type === 'video',
            audio: true
        })
        localStream.value = stream
        return stream
    }

    // Create a peer connection for a specific remote user
    function createPeerForUser(targetId, targetName, targetAvatar) {
        const pc = new RTCPeerConnection(rtcConfig)

        // Add local tracks
        if (localStream.value) {
            localStream.value.getTracks().forEach(track => {
                pc.addTrack(track, localStream.value)
            })
        }

        // Handle remote tracks
        const remoteStream = new MediaStream()
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => {
                remoteStream.addTrack(track)
            })
            // Force reactivity update
            peers.value = { ...peers.value, [targetId]: { ...peers.value[targetId], remoteStream } }
        }

        // ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketStore.socket?.connected) {
                socketStore.socket.emit('group-call:ice-candidate', {
                    conversationId: conversationId.value,
                    targetId,
                    candidate: event.candidate
                })
            }
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                removePeer(targetId)
            }
        }

        peers.value = {
            ...peers.value,
            [targetId]: {
                peerConnection: pc,
                remoteStream,
                name: targetName,
                avatar: targetAvatar
            }
        }

        return pc
    }

    function removePeer(userId) {
        const peer = peers.value[userId]
        if (peer) {
            if (peer.peerConnection) {
                peer.peerConnection.close()
            }
            const newPeers = { ...peers.value }
            delete newPeers[userId]
            peers.value = newPeers
        }
    }

    // ====== Actions ======

    // START a group call (host)
    async function startGroupCall(convId, type = 'audio') {
        try {
            conversationId.value = convId
            isVideoCall.value = type === 'video'
            callState.value = 'calling'

            await setupLocalStream(type)

            socketStore.socket.emit('group-call:start', {
                conversationId: convId,
                isVideo: isVideoCall.value
            })

            // Auto-transition to connected since host is always in
            callState.value = 'connected'
            startTimer()
        } catch (err) {
            console.error('Failed to start group call:', err)
            alert('Erro ao iniciar chamada em grupo: ' + err.message)
            endCall()
        }
    }

    // Handle incoming group call notification
    function handleIncomingGroupCall(data) {
        if (callState.value !== 'idle') return // busy
        incomingCall.value = data
        conversationId.value = data.conversationId
        isVideoCall.value = data.isVideo
        callState.value = 'receiving'
        playRingtone()
    }

    // ACCEPT the group call
    async function joinGroupCall() {
        try {
            stopRingtone()
            const type = isVideoCall.value ? 'video' : 'audio'
            await setupLocalStream(type)

            callState.value = 'connected'
            startTimer()

            socketStore.socket.emit('group-call:join', {
                conversationId: conversationId.value
            })
        } catch (err) {
            console.error('Failed to join group call:', err)
            alert('Erro ao entrar na chamada: ' + err.message)
            endCall()
        }
    }

    // DECLINE group call
    function declineGroupCall() {
        stopRingtone()
        incomingCall.value = null
        callState.value = 'idle'
        conversationId.value = null
    }

    // Handle server telling us who is already in the call → create offers to each
    async function handleExistingParticipants(data) {
        for (const participant of data.participants) {
            if (participant.userId === authStore.user?.id) continue
            const pc = createPeerForUser(participant.userId, participant.name, participant.avatar)
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            socketStore.socket.emit('group-call:offer', {
                conversationId: conversationId.value,
                targetId: participant.userId,
                offer
            })
        }
    }

    // New participant joined → they will send us an offer, we just wait
    function handleParticipantJoined(data) {
        console.log(`📞 ${data.name} entrou na chamada em grupo`)
    }

    // Receive an offer from another participant in the group call
    async function handleGroupOffer(data) {
        const pc = createPeerForUser(data.callerId, data.callerName, data.callerAvatar)
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        socketStore.socket.emit('group-call:answer', {
            conversationId: data.conversationId,
            targetId: data.callerId,
            answer
        })
    }

    // Receive an answer from another participant
    async function handleGroupAnswer(data) {
        const peer = peers.value[data.answererId]
        if (peer?.peerConnection) {
            await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        }
    }

    // Receive ICE candidate from another participant
    async function handleGroupIceCandidate(data) {
        const peer = peers.value[data.remoteId]
        if (peer?.peerConnection) {
            try {
                await peer.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
            } catch (e) {
                console.error('Error adding group ICE candidate', e)
            }
        }
    }

    // A participant left
    function handleParticipantLeft(data) {
        removePeer(data.userId)
    }

    // END call
    function endCall() {
        stopRingtone()

        if (conversationId.value && socketStore.socket?.connected) {
            socketStore.socket.emit('group-call:leave', {
                conversationId: conversationId.value
            })
        }

        // Close all peer connections
        for (const [id] of Object.entries(peers.value)) {
            removePeer(id)
        }
        peers.value = {}

        if (localStream.value) {
            localStream.value.getTracks().forEach(t => t.stop())
            localStream.value = null
        }

        callState.value = 'idle'
        conversationId.value = null
        incomingCall.value = null
        isMuted.value = false
        isCamOff.value = false

        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
        callSeconds.value = 0
    }

    function startTimer() {
        callSeconds.value = 0
        callTimerInterval = setInterval(() => { callSeconds.value++ }, 1000)
    }

    // Toggle mute
    function toggleMute() {
        if (localStream.value) {
            const track = localStream.value.getAudioTracks()[0]
            if (track) {
                track.enabled = !track.enabled
                isMuted.value = !track.enabled
            }
        }
        return isMuted.value
    }

    // Toggle camera
    function toggleVideo() {
        if (localStream.value) {
            const track = localStream.value.getVideoTracks()[0]
            if (track) {
                track.enabled = !track.enabled
                isCamOff.value = !track.enabled
            }
        }
        return isCamOff.value
    }

    return {
        callState,
        isVideoCall,
        conversationId,
        localStream,
        isMuted,
        isCamOff,
        peers,
        incomingCall,
        callSeconds,
        callDuration,
        participantCount,
        remoteStreams,
        startGroupCall,
        handleIncomingGroupCall,
        joinGroupCall,
        declineGroupCall,
        handleExistingParticipants,
        handleParticipantJoined,
        handleGroupOffer,
        handleGroupAnswer,
        handleGroupIceCandidate,
        handleParticipantLeft,
        endCall,
        toggleMute,
        toggleVideo
    }
})
