import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useSocketStore } from './socket'
import { useAuthStore } from './auth'

export const useWebRTCStore = defineStore('webrtc', () => {
    const socketStore = useSocketStore()
    const authStore = useAuthStore()

    const localStream = shallowRef(null)
    const remoteStream = shallowRef(null)
    const peerConnection = shallowRef(null)

    const callState = ref('idle') // 'idle', 'calling', 'receiving', 'connected'
    const isVideoCall = ref(false)
    const isScreenSharing = ref(false)

    // Remote user info
    const remoteUser = ref({
        id: null,
        name: '',
        avatar: ''
    })

    // STUN servers configuration for NAT traversal
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    }

    // Play ringtones
    const audioContext = new (window.AudioContext || window.webkitAudioContext)()
    let oscillator = null
    let ringInterval = null

    function playRingtone() {
        stopRingtone()
        ringInterval = setInterval(() => {
            if (audioContext.state === 'suspended') audioContext.resume()
            oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
            oscillator.frequency.setValueAtTime(480, audioContext.currentTime + 0.5)

            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1)
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 1)
        }, 2000)
    }

    function stopRingtone() {
        if (ringInterval) clearInterval(ringInterval)
        if (oscillator) {
            try { oscillator.stop() } catch (e) { }
        }
    }

    async function setupLocalStream(video = false) {
        if (localStream.value) {
            localStream.value.getTracks().forEach(track => track.stop())
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: video,
                audio: true
            })
            localStream.value = stream
            return stream
        } catch (err) {
            console.error('Error accessing media devices:', err)
            throw new Error('Não foi possível acessar a câmera ou microfone. Verifique as permissões.')
        }
    }

    function createPeerConnection(targetId) {
        if (peerConnection.value) {
            peerConnection.value.close()
        }

        const pc = new RTCPeerConnection(rtcConfig)

        // Add local tracks
        if (localStream.value) {
            localStream.value.getTracks().forEach(track => {
                pc.addTrack(track, localStream.value)
            })
        }

        // Handle remote tracks
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                remoteStream.value = event.streams[0]
            }
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socketStore.socket?.connected) {
                socketStore.socket.emit('call:ice-candidate', {
                    targetId,
                    candidate: event.candidate
                })
            }
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCallLocally()
            }
        }

        peerConnection.value = pc
        return pc
    }

    // --- Actions ---

    async function startCall(targetId, targetName, targetAvatar, video = false) {
        try {
            isVideoCall.value = video
            remoteUser.value = { id: targetId, name: targetName, avatar: targetAvatar }
            callState.value = 'calling'
            playRingtone()

            await setupLocalStream(video)
            const pc = createPeerConnection(targetId)

            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            socketStore.socket.emit('call:offer', {
                targetId,
                offer,
                isVideo: video
            })
        } catch (err) {
            alert(err.message)
            endCallLocally()
        }
    }

    function handleIncomingCall(callerId, callerName, callerAvatar, isVideo) {
        if (callState.value !== 'idle') {
            // Se já está numa call, recusa (ocupado)
            socketStore.socket.emit('call:end', { targetId: callerId })
            return
        }

        remoteUser.value = { id: callerId, name: callerName, avatar: callerAvatar }
        isVideoCall.value = isVideo
        callState.value = 'receiving'
        playRingtone()
    }

    async function answerCall(offer) {
        try {
            stopRingtone()
            callState.value = 'connected'

            await setupLocalStream(isVideoCall.value)
            const pc = createPeerConnection(remoteUser.value.id)

            await pc.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)

            socketStore.socket.emit('call:answer', {
                targetId: remoteUser.value.id,
                answer
            })
        } catch (err) {
            console.error('Failed to answer call:', err)
            endCall()
        }
    }

    async function handleAnswer(answer) {
        stopRingtone()
        if (peerConnection.value && callState.value === 'calling') {
            callState.value = 'connected'
            await peerConnection.value.setRemoteDescription(new RTCSessionDescription(answer))
        }
    }

    async function handleIceCandidate(candidate) {
        if (peerConnection.value) {
            try {
                await peerConnection.value.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
                console.error('Error adding received ice candidate', e)
            }
        }
    }

    function endCall() {
        if (remoteUser.value.id && socketStore.socket?.connected) {
            socketStore.socket.emit('call:end', { targetId: remoteUser.value.id })
        }
        endCallLocally()
    }

    function endCallLocally() {
        stopRingtone()
        if (localStream.value) {
            localStream.value.getTracks().forEach(track => track.stop())
            localStream.value = null
        }
        if (peerConnection.value) {
            peerConnection.value.close()
            peerConnection.value = null
        }
        remoteStream.value = null
        callState.value = 'idle'
        remoteUser.value = { id: null, name: '', avatar: '' }
    }

    function toggleMute() {
        if (localStream.value) {
            const audioTrack = localStream.value.getAudioTracks()[0]
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled
                return !audioTrack.enabled // returns isMuted
            }
        }
        return false
    }

    function toggleVideo() {
        if (localStream.value) {
            const videoTrack = localStream.value.getVideoTracks()[0]
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled
                return !videoTrack.enabled // returns isVideoOff
            }
        }
        return false
    }

    async function toggleScreenShare() {
        if (!peerConnection.value) return false;

        if (isScreenSharing.value) {
            // Revert back to camera
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                const videoTrack = stream.getVideoTracks()[0]

                const sender = peerConnection.value.getSenders().find(s => s.track.kind === 'video')
                if (sender) sender.replaceTrack(videoTrack)

                localStream.value = stream
                isScreenSharing.value = false
                return false // returning state
            } catch (err) {
                console.error('Error reverting to camera:', err)
                return true
            }
        } else {
            // Switch to screen
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
                const screenTrack = screenStream.getVideoTracks()[0]

                screenTrack.onended = () => {
                    toggleScreenShare() // revert if user stops via browser UI
                }

                const sender = peerConnection.value.getSenders().find(s => s.track.kind === 'video')
                if (sender) sender.replaceTrack(screenTrack)

                // preserve audio track from previous stream
                if (localStream.value) {
                    const audioTrack = localStream.value.getAudioTracks()[0]
                    if (audioTrack) screenStream.addTrack(audioTrack)
                }

                localStream.value = screenStream
                isScreenSharing.value = true
                isVideoCall.value = true // ensure it's marked as video
                return true
            } catch (err) {
                console.error('Error sharing screen:', err)
                return false
            }
        }
    }

    return {
        localStream,
        remoteStream,
        callState,
        remoteUser,
        isVideoCall,
        isScreenSharing,
        startCall,
        handleIncomingCall,
        answerCall,
        handleAnswer,
        handleIceCandidate,
        endCall,
        endCallLocally,
        toggleMute,
        toggleVideo,
        toggleScreenShare
    }
})
