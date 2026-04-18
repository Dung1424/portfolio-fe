import { computed, onUnmounted, ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { getChatSocket, onChatSocketReady } from '~/features/chat/services/chatSocket.js'
import { CALL_EVENT, CALL_TYPE } from '~/features/chat/services/call.contract.js'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'

const CALL_RING_TIMEOUT_MS = 30_000
const INCOMING_RING_TIMEOUT_MS = 30_000
const INCOMING_RINGTONE_SRC = '/nhacchuong.mp3'

function nowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `call-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function safeString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function parseIceServers(raw) {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // fallback below
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }]
}

export function useChatCall(selectedId, active, myUserId) {
  const config = useRuntimeConfig()
  const iceServers = parseIceServers(config.public.webRtcIceServers)

  const callState = ref('idle')
  const currentCall = ref(null)
  const incomingCall = ref(null)
  const connectionState = ref('new')
  const isMuted = ref(false)
  const isCameraOn = ref(true)
  const isSpeakerOn = ref(true)
  const localStream = ref(null)
  const remoteStream = ref(null)
  const localVideoRef = ref(null)
  const remoteVideoRef = ref(null)
  const remoteAudioRef = ref(null)
  const callDurationSeconds = ref(0)
  const incomingRingRemainingSeconds = ref(0)

  let peerConnection = null
  let pendingIceCandidates = []
  let callRingTimer = null
  let incomingRingTimer = null
  let incomingRingCountdownTimer = null
  let durationTimer = null
  let socketHandlersBound = false
  let unsubSocketReady = null
  let terminalSignalReceived = false
  let incomingRingtoneAudio = null

  const isCalling = computed(() => callState.value !== 'idle')
  const isInCall = computed(() => callState.value === 'in_call')

  function pushNotice(type, message) {
    notification[type]?.({ message })
  }

  function ensureIncomingRingtoneAudio() {
    if (incomingRingtoneAudio || typeof Audio === 'undefined') {
      return incomingRingtoneAudio
    }
    const audio = new Audio(INCOMING_RINGTONE_SRC)
    audio.loop = true
    audio.preload = 'auto'
    incomingRingtoneAudio = audio
    return incomingRingtoneAudio
  }

  function stopIncomingRingtone(reset = true) {
    if (!incomingRingtoneAudio) {
      return
    }
    try {
      incomingRingtoneAudio.pause()
      if (reset) {
        incomingRingtoneAudio.currentTime = 0
      }
    } catch (e) {
      console.error('stopIncomingRingtone', e)
    }
  }

  async function playIncomingRingtone() {
    const audio = ensureIncomingRingtoneAudio()
    if (!audio) {
      return
    }
    try {
      audio.currentTime = 0
      await audio.play()
    } catch (e) {
      // Browser may block autoplay before first user gesture.
      console.warn('playIncomingRingtone', e?.message || e)
    }
  }

  async function pushCallHistory(call, status, extra = {}) {
    const conversationId = safeString(call?.conversationId)
    if (!conversationId) {
      return
    }
    const kind = call?.callType === CALL_TYPE.VIDEO ? 'video' : 'audio'
    const durationSeconds = Number(extra.durationSeconds || 0)
    const durationLabel = durationSeconds > 0
      ? ` (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`
      : ''
    const statusText = {
      answered: 'Connected',
      ended: 'Ended',
      rejected: 'Rejected',
      missed: 'Missed',
      canceled: 'Canceled',
      interrupted: 'Interrupted'
    }[status] || 'Ended'
    const text = `[${kind === 'video' ? 'Video' : 'Audio'} call] ${statusText}${durationLabel}`

    try {
      await chatApi.postMessage(conversationId, {
        type: 'system',
        text,
        metadata: {
          kind: 'call_log',
          callType: kind,
          status,
          durationSeconds,
          callId: safeString(call?.callId)
        }
      })
    } catch (e) {
      console.error('pushCallHistory', e)
    }
  }

  function resetTimers() {
    if (callRingTimer) {
      clearTimeout(callRingTimer)
      callRingTimer = null
    }
    if (incomingRingTimer) {
      clearTimeout(incomingRingTimer)
      incomingRingTimer = null
    }
    if (incomingRingCountdownTimer) {
      clearInterval(incomingRingCountdownTimer)
      incomingRingCountdownTimer = null
    }
    incomingRingRemainingSeconds.value = 0
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }
  }

  function startDurationTimer() {
    if (durationTimer) {
      clearInterval(durationTimer)
    }
    callDurationSeconds.value = 0
    durationTimer = setInterval(() => {
      callDurationSeconds.value += 1
    }, 1000)
  }

  async function ensureMedia(callType) {
    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error('This browser does not support media capture.')
    }
    if (localStream.value) {
      return localStream.value
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === CALL_TYPE.VIDEO
    })
    localStream.value = stream
    isMuted.value = false
    isCameraOn.value = callType === CALL_TYPE.VIDEO
    bindMediaElements()
    return stream
  }

  function cleanupMedia() {
    if (localStream.value) {
      localStream.value.getTracks().forEach(t => t.stop())
      localStream.value = null
    }
    if (remoteStream.value) {
      remoteStream.value.getTracks().forEach(t => t.stop())
      remoteStream.value = null
    }
    bindMediaElements()
  }

  function cleanupPeerConnection() {
    pendingIceCandidates = []
    if (peerConnection) {
      peerConnection.ontrack = null
      peerConnection.onicecandidate = null
      peerConnection.onconnectionstatechange = null
      peerConnection.close()
      peerConnection = null
    }
    connectionState.value = 'closed'
  }

  function fullCleanup() {
    resetTimers()
    cleanupPeerConnection()
    cleanupMedia()
    currentCall.value = null
    incomingCall.value = null
    callState.value = 'idle'
    callDurationSeconds.value = 0
    terminalSignalReceived = false
    stopIncomingRingtone()
  }

  async function emitWithAck(eventName, payload) {
    const s = getChatSocket()
    if (!s?.connected) {
      throw new Error('Socket disconnected')
    }
    await new Promise((resolve, reject) => {
      s.emit(eventName, payload, (ack) => {
        if (ack?.ok) {
          resolve()
        } else {
          reject(new Error(ack?.error || `${eventName} failed`))
        }
      })
    })
  }

  function callPayload(call, extra = {}) {
    return {
      conversationId: call.conversationId,
      callId: call.callId,
      toUserId: call.peerUserId,
      callType: call.callType,
      ...extra
    }
  }

  async function resolvePeerUserId(conversationId, fallbackPeerUserId) {
    const fallback = safeString(fallbackPeerUserId)
    const mine = safeString(myUserId.value)
    if (fallback && fallback !== mine) {
      return fallback
    }
    try {
      const res = await chatApi.getConversation(conversationId)
      const data = unwrapChatData(res)
      const raw = data?.conversation ?? data
      const participants = Array.isArray(raw?.participants) ? raw.participants : []
      const peer = participants.find((p) => {
        const pid = safeString(p?.userId)
        return pid && pid !== mine
      })
      return safeString(peer?.userId)
    } catch (e) {
      console.error('resolvePeerUserId', e)
      return ''
    }
  }

  async function createPeerConnection(call) {
    cleanupPeerConnection()
    const pc = new RTCPeerConnection({ iceServers })
    peerConnection = pc
    connectionState.value = pc.connectionState
    remoteStream.value = new MediaStream()
    bindMediaElements()

    const local = await ensureMedia(call.callType)
    local.getTracks().forEach((track) => {
      pc.addTrack(track, local)
    })

    pc.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks?.() || []) {
        remoteStream.value?.addTrack(track)
      }
      bindMediaElements()
    }
    pc.onicecandidate = (event) => {
      if (!event.candidate || !currentCall.value) {
        return
      }
      emitWithAck(CALL_EVENT.ICE_CANDIDATE, callPayload(currentCall.value, { candidate: event.candidate.toJSON() }))
        .catch((e) => {
          console.error('emit ice candidate', e)
        })
    }
    pc.onconnectionstatechange = () => {
      connectionState.value = pc.connectionState
      if (pc.connectionState === 'connected') {
        callState.value = 'in_call'
        startDurationTimer()
      }
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        if (callState.value !== 'idle' && !terminalSignalReceived) {
          pushNotice('warning', 'Call connection was interrupted.')
          if (currentCall.value) {
            void pushCallHistory(currentCall.value, 'interrupted', {
              durationSeconds: callDurationSeconds.value
            })
          }
        }
        fullCleanup()
      }
    }
    return pc
  }

  async function flushPendingIce() {
    if (!peerConnection || !peerConnection.remoteDescription) {
      return
    }
    for (const candidate of pendingIceCandidates) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {
        console.error('addIceCandidate', e)
      }
    }
    pendingIceCandidates = []
  }

  function bindMediaElements() {
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = localStream.value || null
    }
    if (remoteVideoRef.value) {
      remoteVideoRef.value.srcObject = remoteStream.value || null
    }
    if (remoteAudioRef.value) {
      remoteAudioRef.value.srcObject = remoteStream.value || null
    }
  }

  async function makeCallModel(callType) {
    const conv = active.value
    const conversationId = safeString(selectedId.value)
    if (!conversationId) {
      throw new Error('Please select a direct conversation first.')
    }
    if (!myUserId.value) {
      throw new Error('User is not authenticated.')
    }
    const peerUserId = await resolvePeerUserId(conversationId, conv?.peerUserId)
    if (!peerUserId) {
      throw new Error('Cannot resolve peer user for this conversation.')
    }
    return {
      callId: nowId(),
      conversationId,
      peerUserId,
      callType,
      direction: 'outgoing'
    }
  }

  async function startOutgoingCall(callType) {
    if (isCalling.value) {
      pushNotice('warning', 'A call is already in progress.')
      return
    }
    try {
      const call = await makeCallModel(callType)
      await ensureMedia(callType)
      currentCall.value = call
      callState.value = 'outgoing_ringing'
      await emitWithAck(CALL_EVENT.INVITE, callPayload(call))
      callRingTimer = setTimeout(() => {
        if (callState.value === 'outgoing_ringing') {
          emitWithAck(CALL_EVENT.MISSED, callPayload(call, { reason: 'timeout' })).catch(() => {})
          pushNotice('warning', 'No answer from peer.')
          void pushCallHistory(call, 'missed')
          fullCleanup()
        }
      }, CALL_RING_TIMEOUT_MS)
    } catch (e) {
      console.error('startOutgoingCall', e)
      pushNotice('error', e?.message || 'Cannot start call.')
      fullCleanup()
    }
  }

  async function acceptIncomingCall() {
    const incoming = incomingCall.value
    if (!incoming) {
      return
    }
    try {
      resetTimers()
      stopIncomingRingtone()
      currentCall.value = { ...incoming, direction: 'incoming' }
      incomingCall.value = null
      callState.value = 'connecting'
      await createPeerConnection(currentCall.value)
      await emitWithAck(CALL_EVENT.ACCEPT, callPayload(currentCall.value))
    } catch (e) {
      console.error('acceptIncomingCall', e)
      pushNotice('error', e?.message || 'Cannot accept call.')
      fullCleanup()
    }
  }

  async function rejectIncomingCall(reason = 'rejected') {
    const incoming = incomingCall.value
    if (!incoming) {
      return
    }
    try {
      resetTimers()
      stopIncomingRingtone()
      terminalSignalReceived = true
      await emitWithAck(CALL_EVENT.REJECT, callPayload(incoming, { reason }))
      void pushCallHistory(incoming, 'rejected')
    } catch (e) {
      console.error('rejectIncomingCall', e)
    } finally {
      incomingCall.value = null
      callState.value = 'idle'
    }
  }

  async function hangupActiveCall(reason = 'hangup') {
    const call = currentCall.value || incomingCall.value
    if (call) {
      try {
        stopIncomingRingtone()
        terminalSignalReceived = true
        await emitWithAck(CALL_EVENT.HANGUP, callPayload(call, { reason }))
        void pushCallHistory(call, 'ended', { durationSeconds: callDurationSeconds.value })
      } catch (e) {
        console.error('hangupActiveCall', e)
      }
    }
    fullCleanup()
  }

  async function handleIncomingInvite(payload) {
    const incomingPeer = safeString(payload?.fromUserId)
    const incomingConversationId = safeString(payload?.conversationId)
    if (
      callState.value === 'outgoing_ringing'
      && currentCall.value
      && safeString(currentCall.value.peerUserId) === incomingPeer
      && safeString(currentCall.value.conversationId) === incomingConversationId
    ) {
      // Avoid deadlock when both peers call each other around the same time.
      resetTimers()
      currentCall.value = {
        callId: safeString(payload?.callId),
        conversationId: incomingConversationId,
        peerUserId: incomingPeer,
        callType: safeString(payload?.callType) || CALL_TYPE.AUDIO,
        direction: 'incoming'
      }
      callState.value = 'connecting'
      await createPeerConnection(currentCall.value)
      await emitWithAck(CALL_EVENT.ACCEPT, callPayload(currentCall.value))
      return
    }

    if (isCalling.value) {
      await emitWithAck(CALL_EVENT.REJECT, {
        conversationId: incomingConversationId,
        callId: safeString(payload?.callId),
        toUserId: incomingPeer,
        callType: safeString(payload?.callType),
        reason: 'busy'
      }).catch(() => {})
      return
    }
    incomingCall.value = {
      callId: safeString(payload?.callId),
      conversationId: incomingConversationId,
      peerUserId: incomingPeer,
      callType: safeString(payload?.callType) || CALL_TYPE.AUDIO
    }
    callState.value = 'incoming_ringing'
    incomingRingRemainingSeconds.value = Math.ceil(INCOMING_RING_TIMEOUT_MS / 1000)
    await playIncomingRingtone()
    const ringCallId = incomingCall.value.callId
    incomingRingCountdownTimer = setInterval(() => {
      if (callState.value !== 'incoming_ringing') {
        return
      }
      incomingRingRemainingSeconds.value = Math.max(0, incomingRingRemainingSeconds.value - 1)
    }, 1000)
    incomingRingTimer = setTimeout(() => {
      const ringingCall = incomingCall.value
      if (!ringingCall || callState.value !== 'incoming_ringing' || ringingCall.callId !== ringCallId) {
        return
      }
      terminalSignalReceived = true
      stopIncomingRingtone()
      void emitWithAck(CALL_EVENT.MISSED, callPayload(ringingCall, { reason: 'timeout' })).catch((e) => {
        console.error('incoming timeout missed', e)
      })
      void pushCallHistory(ringingCall, 'missed')
      pushNotice('info', 'Missed call')
      fullCleanup()
    }, INCOMING_RING_TIMEOUT_MS)
  }

  async function handleCallAccept(payload) {
    const call = currentCall.value
    if (!call || call.direction !== 'outgoing') {
      return
    }
    if (safeString(payload?.callId) !== call.callId) {
      return
    }
    resetTimers()
    callState.value = 'connecting'
    const pc = await createPeerConnection(call)
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: call.callType === CALL_TYPE.VIDEO
    })
    await pc.setLocalDescription(offer)
    await emitWithAck(CALL_EVENT.OFFER, callPayload(call, { sdp: offer }))
  }

  async function handleCallOffer(payload) {
    const call = currentCall.value
    if (!call || call.direction !== 'incoming') {
      return
    }
    if (safeString(payload?.callId) !== call.callId || !payload?.sdp) {
      return
    }
    if (!peerConnection) {
      await createPeerConnection(call)
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
    await flushPendingIce()
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)
    await emitWithAck(CALL_EVENT.ANSWER, callPayload(call, { sdp: answer }))
  }

  async function handleCallAnswer(payload) {
    const call = currentCall.value
    if (!call || call.direction !== 'outgoing' || !peerConnection) {
      return
    }
    if (safeString(payload?.callId) !== call.callId || !payload?.sdp) {
      return
    }
    await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp))
    await flushPendingIce()
  }

  async function handleIceCandidate(payload) {
    const call = currentCall.value
    if (!call || safeString(payload?.callId) !== call.callId || !payload?.candidate) {
      return
    }
    if (!peerConnection || !peerConnection.remoteDescription) {
      pendingIceCandidates.push(payload.candidate)
      return
    }
    await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
  }

  function handlePeerEnd(payload, fallbackMessage) {
    const call = currentCall.value || incomingCall.value
    if (!call) {
      return
    }
    if (safeString(payload?.callId) !== call.callId) {
      return
    }
    stopIncomingRingtone()
    terminalSignalReceived = true
    pushNotice('info', fallbackMessage)
    if (call.direction === 'outgoing') {
      const status = fallbackMessage.includes('rejected')
        ? 'rejected'
        : fallbackMessage.includes('missed')
          ? 'missed'
          : fallbackMessage.includes('canceled')
            ? 'canceled'
            : 'ended'
      void pushCallHistory(call, status, { durationSeconds: callDurationSeconds.value })
    }
    fullCleanup()
  }

  function bindSocketHandlers() {
    const s = getChatSocket()
    if (!s || socketHandlersBound) {
      return
    }
    socketHandlersBound = true

    s.on(CALL_EVENT.INVITE, (payload) => {
      void handleIncomingInvite(payload)
    })
    s.on(CALL_EVENT.ACCEPT, (payload) => {
      void handleCallAccept(payload)
    })
    s.on(CALL_EVENT.REJECT, (payload) => {
      handlePeerEnd(payload, 'Peer rejected the call.')
    })
    s.on(CALL_EVENT.CANCEL, (payload) => {
      handlePeerEnd(payload, 'Peer canceled the call.')
    })
    s.on(CALL_EVENT.OFFER, (payload) => {
      void handleCallOffer(payload)
    })
    s.on(CALL_EVENT.ANSWER, (payload) => {
      void handleCallAnswer(payload)
    })
    s.on(CALL_EVENT.ICE_CANDIDATE, (payload) => {
      void handleIceCandidate(payload)
    })
    s.on(CALL_EVENT.HANGUP, (payload) => {
      handlePeerEnd(payload, 'Call ended.')
    })
    s.on(CALL_EVENT.MISSED, (payload) => {
      handlePeerEnd(payload, 'Call missed.')
    })
  }

  function unbindSocketHandlers() {
    const s = getChatSocket()
    if (!s || !socketHandlersBound) {
      return
    }
    socketHandlersBound = false
    s.off(CALL_EVENT.INVITE)
    s.off(CALL_EVENT.ACCEPT)
    s.off(CALL_EVENT.REJECT)
    s.off(CALL_EVENT.CANCEL)
    s.off(CALL_EVENT.OFFER)
    s.off(CALL_EVENT.ANSWER)
    s.off(CALL_EVENT.ICE_CANDIDATE)
    s.off(CALL_EVENT.HANGUP)
    s.off(CALL_EVENT.MISSED)
  }

  function toggleMute() {
    const enabled = isMuted.value
    localStream.value?.getAudioTracks?.().forEach((track) => {
      track.enabled = enabled
    })
    isMuted.value = !enabled
  }

  function toggleCamera() {
    const next = !isCameraOn.value
    localStream.value?.getVideoTracks?.().forEach((track) => {
      track.enabled = next
    })
    isCameraOn.value = next
  }

  watch(selectedId, (nextId, prevId) => {
    if (nextId && prevId && String(nextId) !== String(prevId) && isCalling.value) {
      hangupActiveCall('conversation-switch')
    }
  })

  watch([localVideoRef, remoteVideoRef, remoteAudioRef, localStream, remoteStream], () => {
    bindMediaElements()
  })

  unsubSocketReady = onChatSocketReady(() => {
    bindSocketHandlers()
  })

  onUnmounted(() => {
    unbindSocketHandlers()
    unsubSocketReady?.()
    unsubSocketReady = null
    fullCleanup()
  })

  return {
    CALL_TYPE,
    callState,
    callDurationSeconds,
    connectionState,
    currentCall,
    incomingCall,
    isCalling,
    isInCall,
    isMuted,
    isCameraOn,
    isSpeakerOn,
    incomingRingRemainingSeconds,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startOutgoingCall,
    acceptIncomingCall,
    rejectIncomingCall,
    hangupActiveCall,
    toggleMute,
    toggleCamera
  }
}
