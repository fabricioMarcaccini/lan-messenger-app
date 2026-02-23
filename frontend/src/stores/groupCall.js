import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useSocketStore } from './socket'
import { useAuthStore } from './auth'

export const useGroupCallStore = defineStore('groupCall', () => {
    const socketStore = useSocketStore()
    const authStore = useAuthStore()

    // ====== Constants ======
    const MAX_PARTICIPANTS = 25

    // ====== State ======
    const callState = ref('idle') // 'idle', 'calling', 'receiving', 'connected'
    const isVideoCall = ref(false)
    const isScreenSharing = ref(false)
    const conversationId = ref(null)
    const localStream = shallowRef(null)
    const isMuted = ref(false)
    const isCamOff = ref(false)
    const callError = ref(null)
    const handRaised = ref(false)

    // Map of peerId -> { peerConnection, remoteStream, name, avatar, handRaised }
    const peers = ref({})

    // Incoming call info
    const incomingCall = ref(null)

    // Active call in a conversation (shown as banner)
    const activeCallInfo = ref(null) // { conversationId, participants, count }

    // Call timer
    const callSeconds = ref(0)
    let callTimerInterval = null

    // ====== Computed ======
    const callDuration = computed(() => {
        const m = Math.floor(callSeconds.value / 60).toString().padStart(2, '0')
        const s = (callSeconds.value % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    })

    const participantCount = computed(() => Object.keys(peers.value).length + 1)
    const isFull = computed(() => participantCount.value >= MAX_PARTICIPANTS)

    const remoteStreams = computed(() => {
        const streams = []
        for (const [id, peer] of Object.entries(peers.value)) {
            streams.push({
                userId: id,
                name: peer.name || 'Participante',
                avatar: peer.avatar || '',
                stream: peer.remoteStream || null,
                handRaised: peer.handRaised || false
            })
        }
        return streams
    })

    // STUN config
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' }
        ]
    }

    // ====== Ringtone ======
    let audioCtx = null
    let ringInterval = null

    function getAudioContext() {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        return audioCtx
    }

    function playRingtone() {
        stopRingtone()
        const ctx = getAudioContext()
        ringInterval = setInterval(() => {
            if (ctx.state === 'suspended') ctx.resume()
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.connect(gain)
            gain.connect(ctx.destination)
            osc.type = 'sine'
            osc.frequency.setValueAtTime(440, ctx.currentTime)
            osc.frequency.setValueAtTime(520, ctx.currentTime + 0.3)
            gain.gain.setValueAtTime(0, ctx.currentTime)
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1)
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8)
            osc.start(ctx.currentTime)
            osc.stop(ctx.currentTime + 0.8)
        }, 1500)
    }

    function stopRingtone() {
        if (ringInterval) { clearInterval(ringInterval); ringInterval = null }
    }

    // ====== Media Setup ======
    async function setupLocalStream(type = 'audio') {
        if (localStream.value) {
            localStream.value.getTracks().forEach(t => t.stop())
        }

        let stream
        if (type === 'screen') {
            stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
                const audioTrack = audioStream.getAudioTracks()[0]
                if (audioTrack) stream.addTrack(audioTrack)
            } catch (e) { /* mic optional */ }
            isScreenSharing.value = true
        } else {
            stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            })
            isScreenSharing.value = false
        }

        localStream.value = stream

        if (type === 'screen') {
            const videoTrack = stream.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.onended = () => revertToCamera()
            }
        }

        return stream
    }

    // ====== Peer Connection ======
    function createPeerForUser(targetId, targetName, targetAvatar) {
        if (peers.value[targetId]?.peerConnection) {
            try { peers.value[targetId].peerConnection.close() } catch (e) { }
        }

        const pc = new RTCPeerConnection(rtcConfig)

        if (localStream.value) {
            localStream.value.getTracks().forEach(track => {
                pc.addTrack(track, localStream.value)
            })
        }

        const remoteStream = new MediaStream()
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach(track => {
                const existing = remoteStream.getTracks().find(t => t.id === track.id)
                if (!existing) remoteStream.addTrack(track)
            })
            peers.value = { ...peers.value, [targetId]: { ...peers.value[targetId], remoteStream } }
        }

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
            const state = pc.connectionState
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                removePeer(targetId)
            }
        }

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
                pc.restartIce()
            }
        }

        peers.value = {
            ...peers.value,
            [targetId]: {
                peerConnection: pc,
                remoteStream,
                name: targetName,
                avatar: targetAvatar,
                handRaised: false
            }
        }

        return pc
    }

    function removePeer(userId) {
        const peer = peers.value[userId]
        if (peer) {
            if (peer.peerConnection) {
                try { peer.peerConnection.close() } catch (e) { }
            }
            const newPeers = { ...peers.value }
            delete newPeers[userId]
            peers.value = newPeers
        }
    }

    function replaceTrackOnAllPeers(oldTrack, newTrack) {
        for (const [, peer] of Object.entries(peers.value)) {
            if (!peer.peerConnection) continue
            const sender = peer.peerConnection.getSenders().find(s => s.track && s.track.kind === newTrack.kind)
            if (sender) {
                sender.replaceTrack(newTrack).catch(e => console.error('replaceTrack error:', e))
            }
        }
    }

    // ====== Actions ======

    async function startGroupCall(convId, type = 'audio') {
        try {
            callError.value = null
            conversationId.value = convId
            isVideoCall.value = (type === 'video' || type === 'screen')
            callState.value = 'calling'

            await setupLocalStream(type)

            socketStore.socket.emit('group-call:start', {
                conversationId: convId,
                isVideo: isVideoCall.value
            })

            callState.value = 'connected'
            startTimer()

            // Auto-mute if large group (> 5 people in convo)
            // Users can unmute themselves
        } catch (err) {
            console.error('Failed to start group call:', err)
            callError.value = err.message
            endCall()
        }
    }

    function handleIncomingGroupCall(data) {
        if (callState.value !== 'idle') return
        if (data.participants && data.participants.length >= MAX_PARTICIPANTS) return

        incomingCall.value = data
        conversationId.value = data.conversationId
        isVideoCall.value = data.isVideo
        callState.value = 'receiving'
        playRingtone()
    }

    // Handle active call notification (when joining a conversation room)
    function handleActiveCall(data) {
        activeCallInfo.value = data
    }

    // Join an active call from banner
    async function joinActiveCall(isVideo = false) {
        if (callState.value !== 'idle') return
        if (!activeCallInfo.value) return

        conversationId.value = activeCallInfo.value.conversationId
        isVideoCall.value = isVideo
        activeCallInfo.value = null

        try {
            callError.value = null
            const type = isVideo ? 'video' : 'audio'
            await setupLocalStream(type)
            callState.value = 'connected'
            startTimer()

            socketStore.socket.emit('group-call:join', {
                conversationId: conversationId.value
            })
        } catch (err) {
            console.error('Failed to join active call:', err)
            callError.value = err.message
            endCall()
        }
    }

    async function joinGroupCall() {
        try {
            stopRingtone()
            callError.value = null
            const type = isVideoCall.value ? 'video' : 'audio'
            await setupLocalStream(type)

            callState.value = 'connected'
            startTimer()

            socketStore.socket.emit('group-call:join', {
                conversationId: conversationId.value
            })
        } catch (err) {
            console.error('Failed to join group call:', err)
            callError.value = err.message
            endCall()
        }
    }

    function declineGroupCall() {
        stopRingtone()
        incomingCall.value = null
        callState.value = 'idle'
        conversationId.value = null
    }

    async function handleExistingParticipants(data) {
        for (const participant of data.participants) {
            if (participant.userId === authStore.user?.id) continue
            try {
                const pc = createPeerForUser(participant.userId, participant.name, participant.avatar)
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)

                socketStore.socket.emit('group-call:offer', {
                    conversationId: conversationId.value,
                    targetId: participant.userId,
                    offer
                })
            } catch (e) {
                console.error(`Failed to create offer for ${participant.name}:`, e)
            }
        }
    }

    function handleParticipantJoined(data) {
        console.log(`📞 ${data.name} entrou na chamada em grupo`)
    }

    async function handleGroupOffer(data) {
        try {
            if (isFull.value) return
            const pc = createPeerForUser(data.callerId, data.callerName, data.callerAvatar)
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            socketStore.socket.emit('group-call:answer', {
                conversationId: data.conversationId,
                targetId: data.callerId,
                answer
            })
        } catch (e) {
            console.error('Failed to handle group offer:', e)
        }
    }

    async function handleGroupAnswer(data) {
        const peer = peers.value[data.answererId]
        if (peer?.peerConnection) {
            try {
                await peer.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
            } catch (e) {
                console.error('Failed to set remote description:', e)
            }
        }
    }

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

    function handleParticipantLeft(data) {
        removePeer(data.userId)
        // If everyone left and call info was active, clear it
        if (Object.keys(peers.value).length === 0 && activeCallInfo.value?.conversationId === data.conversationId) {
            activeCallInfo.value = null
        }
    }

    // Hand raise
    function handleHandRaise(data) {
        const peer = peers.value[data.userId]
        if (peer) {
            peers.value = {
                ...peers.value,
                [data.userId]: { ...peer, handRaised: data.raised }
            }
        }
    }

    function toggleHandRaise() {
        handRaised.value = !handRaised.value
        if (socketStore.socket?.connected) {
            socketStore.socket.emit('group-call:hand-raise', {
                conversationId: conversationId.value,
                raised: handRaised.value
            })
        }
        return handRaised.value
    }

    function endCall() {
        stopRingtone()

        if (conversationId.value && socketStore.socket?.connected) {
            socketStore.socket.emit('group-call:leave', {
                conversationId: conversationId.value
            })
        }

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
        isScreenSharing.value = false
        handRaised.value = false
        callError.value = null

        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
        callSeconds.value = 0
    }

    function startTimer() {
        callSeconds.value = 0
        if (callTimerInterval) clearInterval(callTimerInterval)
        callTimerInterval = setInterval(() => { callSeconds.value++ }, 1000)
    }

    // ====== Toggle Controls ======
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

    async function toggleScreenShare() {
        if (callState.value !== 'connected') return false

        if (isScreenSharing.value) {
            return await revertToCamera()
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                const screenTrack = screenStream.getVideoTracks()[0]
                screenTrack.onended = () => revertToCamera()

                const oldVideoTrack = localStream.value?.getVideoTracks()[0]
                replaceTrackOnAllPeers(oldVideoTrack, screenTrack)

                const newStream = new MediaStream()
                newStream.addTrack(screenTrack)
                if (localStream.value) {
                    const audioTrack = localStream.value.getAudioTracks()[0]
                    if (audioTrack) newStream.addTrack(audioTrack)
                    if (oldVideoTrack) oldVideoTrack.stop()
                }

                localStream.value = newStream
                isScreenSharing.value = true
                isVideoCall.value = true
                return true
            } catch (err) {
                console.error('Error sharing screen:', err)
                return false
            }
        }
    }

    async function revertToCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            const cameraTrack = stream.getVideoTracks()[0]
            replaceTrackOnAllPeers(localStream.value?.getVideoTracks()[0], cameraTrack)

            const oldTrack = localStream.value?.getVideoTracks()[0]
            if (oldTrack) oldTrack.stop()

            const newStream = new MediaStream()
            newStream.addTrack(cameraTrack)
            const audioTrack = localStream.value?.getAudioTracks()[0]
            if (audioTrack) newStream.addTrack(audioTrack)

            localStream.value = newStream
            isScreenSharing.value = false
            return false
        } catch (err) {
            console.error('Error reverting to camera:', err)
            return true
        }
    }

    // Clear active call info
    function clearActiveCallInfo() {
        activeCallInfo.value = null
    }

    return {
        MAX_PARTICIPANTS,
        callState, isVideoCall, isScreenSharing, conversationId, localStream,
        isMuted, isCamOff, callError, handRaised, peers, incomingCall, activeCallInfo,
        callSeconds, callDuration, participantCount, isFull, remoteStreams,
        startGroupCall, handleIncomingGroupCall, handleActiveCall, joinActiveCall,
        joinGroupCall, declineGroupCall, handleExistingParticipants,
        handleParticipantJoined, handleGroupOffer, handleGroupAnswer,
        handleGroupIceCandidate, handleParticipantLeft, handleHandRaise,
        endCall, toggleMute, toggleVideo, toggleScreenShare, toggleHandRaise,
        clearActiveCallInfo
    }
})
