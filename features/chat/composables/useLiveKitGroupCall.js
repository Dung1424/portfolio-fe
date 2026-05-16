import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { getChatSocket, onChatSocketReady } from '~/features/chat/services/chatSocket.js'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'

function safeString(v) {
  return typeof v === 'string' ? v.trim() : ''
}

export function useLiveKitGroupCall(active, myUserId, resolveUserDisplay = null) {
  const groupCallSession = ref(null)
  const incomingGroupCall = ref(null)
  const groupCallRoom = ref(null)
  const groupCallState = ref('idle')
  const groupCallError = ref('')
  const groupCallTiles = ref([])
  const participantDisplayById = ref({})
  const groupCallStartedAt = ref(null)
  const groupCallDurationSeconds = ref(0)
  const groupCallMicEnabled = ref(true)
  const groupCallCameraEnabled = ref(true)

  let RoomCtor = null
  let RoomEvent = null
  let Track = null
  let durationTimer = null
  let socketHandlersBound = false
  let unsubSocketReady = null

  const isGroupCalling = computed(() => groupCallState.value !== 'idle')
  const showIncomingGroupCall = computed(() =>
    Boolean(incomingGroupCall.value) && !isGroupCalling.value
  )

  function startDurationTimer(startedAt) {
    clearInterval(durationTimer)
    const start = startedAt ? new Date(startedAt).getTime() : Date.now()
    groupCallStartedAt.value = start
    groupCallDurationSeconds.value = 0
    durationTimer = setInterval(() => {
      groupCallDurationSeconds.value = Math.max(0, Math.floor((Date.now() - start) / 1000))
    }, 1000)
  }

  function stopDurationTimer() {
    clearInterval(durationTimer)
    durationTimer = null
    groupCallDurationSeconds.value = 0
    groupCallStartedAt.value = null
  }

  async function ensureLiveKit() {
    if (RoomCtor && RoomEvent && Track) {
      return
    }
    const mod = await import('livekit-client')
    RoomCtor = mod.Room
    RoomEvent = mod.RoomEvent
    Track = mod.Track
  }

  function getPublicationTrack(participant, kind) {
    const pubs = participant?.trackPublications?.values?.()
    if (!pubs) {
      return null
    }
    for (const pub of pubs) {
      if (pub?.kind === kind && pub.track) {
        return pub.track
      }
    }
    return null
  }

  async function hydrateParticipantDisplay(userId) {
    const id = safeString(userId)
    if (!id || participantDisplayById.value[id] || typeof resolveUserDisplay !== 'function') {
      return
    }
    participantDisplayById.value = {
      ...participantDisplayById.value,
      [id]: { name: 'Thành viên' }
    }
    try {
      const row = await resolveUserDisplay(id)
      const name = safeString(row?.name) || safeString(row?.username) || 'Thành viên'
      participantDisplayById.value = {
        ...participantDisplayById.value,
        [id]: {
          name,
          username: safeString(row?.username),
          avatarUrl: safeString(row?.avatarUrl)
        }
      }
      rebuildTiles()
    } catch (e) {
      console.error('hydrateParticipantDisplay', e)
    }
  }

  function participantDisplayName(participant) {
    const id = safeString(participant?.identity)
    if (!id) {
      return 'Thành viên'
    }
    const liveKitName = safeString(participant?.name)
    if (liveKitName && liveKitName !== id) {
      return liveKitName
    }
    const cached = participantDisplayById.value[id]
    if (cached?.name) {
      return cached.name
    }
    void hydrateParticipantDisplay(id)
    return 'Thành viên'
  }

  function rebuildTiles() {
    const room = groupCallRoom.value
    if (!room || !Track) {
      groupCallTiles.value = []
      return
    }
    const rows = []
    const local = room.localParticipant
    if (local) {
      rows.push({
        identity: local.identity,
        name: 'Bạn',
        isLocal: true,
        videoTrack: getPublicationTrack(local, Track.Kind.Video),
        audioTrack: null,
        micEnabled: groupCallMicEnabled.value,
        cameraEnabled: groupCallCameraEnabled.value
      })
    }
    for (const participant of room.remoteParticipants.values()) {
      rows.push({
        identity: participant.identity,
        name: participantDisplayName(participant),
        isLocal: false,
        videoTrack: getPublicationTrack(participant, Track.Kind.Video),
        audioTrack: getPublicationTrack(participant, Track.Kind.Audio),
        micEnabled: true,
        cameraEnabled: Boolean(getPublicationTrack(participant, Track.Kind.Video))
      })
    }
    groupCallTiles.value = rows
  }

  function bindRoomEvents(room) {
    room
      .on(RoomEvent.TrackSubscribed, rebuildTiles)
      .on(RoomEvent.TrackUnsubscribed, rebuildTiles)
      .on(RoomEvent.TrackMuted, rebuildTiles)
      .on(RoomEvent.TrackUnmuted, rebuildTiles)
      .on(RoomEvent.ParticipantConnected, rebuildTiles)
      .on(RoomEvent.ParticipantDisconnected, rebuildTiles)
      .on(RoomEvent.LocalTrackPublished, rebuildTiles)
      .on(RoomEvent.LocalTrackUnpublished, rebuildTiles)
      .on(RoomEvent.Disconnected, () => {
        if (groupCallState.value !== 'idle') {
          cleanupGroupCall(false)
        }
      })
  }

  async function connectLiveKit(livekit, session) {
    await ensureLiveKit()
    const url = safeString(livekit?.url)
    const token = safeString(livekit?.token)
    if (!url || !token) {
      throw new Error('Thiếu token LiveKit.')
    }
    const room = new RoomCtor({
      adaptiveStream: true,
      dynacast: true
    })
    bindRoomEvents(room)
    groupCallRoom.value = room
    groupCallState.value = 'connecting'
    await room.connect(url, token)
    groupCallState.value = 'connected'
    const callType = session?.callType === 'audio' ? 'audio' : 'video'
    await room.localParticipant.setMicrophoneEnabled(true)
    if (callType === 'video') {
      await room.localParticipant.setCameraEnabled(true)
      groupCallCameraEnabled.value = true
    } else {
      groupCallCameraEnabled.value = false
    }
    groupCallMicEnabled.value = true
    rebuildTiles()
    await nextTick()
  }

  async function startGroupCall(callType = 'video') {
    if (!active.value?.isGroup || isGroupCalling.value) {
      return
    }
    try {
      groupCallError.value = ''
      const res = await chatApi.startGroupCall(active.value.id, callType)
      const data = unwrapChatData(res)
      groupCallSession.value = data?.session ?? null
      incomingGroupCall.value = null
      startDurationTimer(groupCallSession.value?.startedAt)
      await connectLiveKit(data?.livekit, groupCallSession.value)
    } catch (e) {
      console.error('startGroupCall', e)
      groupCallError.value = e?.response?.data?.message || e?.message || 'Không thể bắt đầu cuộc gọi nhóm.'
      notification.error({ message: groupCallError.value })
      cleanupGroupCall(false)
    }
  }

  async function joinGroupCall(session = incomingGroupCall.value) {
    const conversationId = safeString(session?.conversationId || active.value?.id)
    const callId = safeString(session?.id)
    if (!conversationId || !callId) {
      return
    }
    try {
      groupCallError.value = ''
      const res = await chatApi.joinGroupCall(conversationId, callId)
      const data = unwrapChatData(res)
      groupCallSession.value = data?.session ?? session
      incomingGroupCall.value = null
      startDurationTimer(groupCallSession.value?.startedAt)
      await connectLiveKit(data?.livekit, groupCallSession.value)
    } catch (e) {
      console.error('joinGroupCall', e)
      groupCallError.value = e?.response?.data?.message || e?.message || 'Không thể tham gia cuộc gọi nhóm.'
      notification.error({ message: groupCallError.value })
      cleanupGroupCall(false)
    }
  }

  async function leaveGroupCall() {
    const session = groupCallSession.value
    cleanupGroupCall(false)
    if (session?.conversationId && session?.id) {
      try {
        await chatApi.leaveGroupCall(session.conversationId, session.id)
      } catch (e) {
        console.error('leaveGroupCall', e)
      }
    }
  }

  async function endGroupCall() {
    const session = groupCallSession.value
    cleanupGroupCall(false)
    if (session?.conversationId && session?.id) {
      try {
        await chatApi.endGroupCall(session.conversationId, session.id)
      } catch (e) {
        console.error('endGroupCall', e)
      }
    }
  }

  function dismissIncomingGroupCall() {
    incomingGroupCall.value = null
  }

  async function refreshActiveGroupCallForConversation(conversation) {
    if (!conversation?.isGroup || isGroupCalling.value) {
      return
    }
    try {
      const res = await chatApi.getActiveGroupCall(conversation.id)
      const data = unwrapChatData(res)
      const session = data?.session ?? null
      if (!session?.id) {
        if (incomingGroupCall.value?.conversationId === conversation.id) {
          incomingGroupCall.value = null
        }
        return
      }
      const my = safeString(myUserId.value)
      if (my && safeString(session.createdByUserId) === my) {
        return
      }
      incomingGroupCall.value = session
    } catch (e) {
      console.error('refreshActiveGroupCallForConversation', e)
    }
  }

  function cleanupGroupCall(clearIncoming = true) {
    const room = groupCallRoom.value
    if (room) {
      try {
        room.disconnect()
      } catch (e) {
        console.error('livekit disconnect', e)
      }
    }
    groupCallRoom.value = null
    groupCallSession.value = null
    groupCallState.value = 'idle'
    groupCallTiles.value = []
    groupCallMicEnabled.value = true
    groupCallCameraEnabled.value = true
    stopDurationTimer()
    if (clearIncoming) {
      incomingGroupCall.value = null
    }
  }

  async function toggleGroupCallMic() {
    const room = groupCallRoom.value
    if (!room) {
      return
    }
    const next = !groupCallMicEnabled.value
    await room.localParticipant.setMicrophoneEnabled(next)
    groupCallMicEnabled.value = next
    rebuildTiles()
  }

  async function toggleGroupCallCamera() {
    const room = groupCallRoom.value
    if (!room || groupCallSession.value?.callType === 'audio') {
      return
    }
    const next = !groupCallCameraEnabled.value
    await room.localParticipant.setCameraEnabled(next)
    groupCallCameraEnabled.value = next
    rebuildTiles()
  }

  function onGroupCallStarted(payload) {
    const session = payload?.session
    if (!session?.id) {
      return
    }
    const my = safeString(myUserId.value)
    const creator = safeString(session.createdByUserId)
    if (creator && my && creator === my) {
      return
    }
    incomingGroupCall.value = session
  }

  function onGroupCallEnded(payload) {
    const sid = safeString(payload?.session?.id)
    if (
      sid
      && (
        sid === safeString(groupCallSession.value?.id)
        || sid === safeString(incomingGroupCall.value?.id)
      )
    ) {
      cleanupGroupCall(true)
    }
  }

  function onGroupCallParticipantUpdated(payload) {
    if (payload?.session?.id && payload.session.id === groupCallSession.value?.id) {
      groupCallSession.value = payload.session
    }
  }

  function bindSocketHandlers() {
    const s = getChatSocket()
    if (!s || socketHandlersBound) {
      return
    }
    socketHandlersBound = true
    s.on('group-call:started', onGroupCallStarted)
    s.on('group-call:ended', onGroupCallEnded)
    s.on('group-call:participant-updated', onGroupCallParticipantUpdated)
  }

  function unbindSocketHandlers() {
    const s = getChatSocket()
    if (!s || !socketHandlersBound) {
      return
    }
    socketHandlersBound = false
    s.off('group-call:started', onGroupCallStarted)
    s.off('group-call:ended', onGroupCallEnded)
    s.off('group-call:participant-updated', onGroupCallParticipantUpdated)
  }

  unsubSocketReady = onChatSocketReady(bindSocketHandlers)

  watch(
    () => active.value?.id,
    () => {
      void refreshActiveGroupCallForConversation(active.value)
    },
    { immediate: true }
  )

  onUnmounted(() => {
    unbindSocketHandlers()
    unsubSocketReady?.()
    unsubSocketReady = null
    cleanupGroupCall(true)
  })

  return {
    groupCallSession,
    incomingGroupCall,
    groupCallState,
    groupCallError,
    groupCallTiles,
    groupCallDurationSeconds,
    groupCallMicEnabled,
    groupCallCameraEnabled,
    isGroupCalling,
    showIncomingGroupCall,
    startGroupCall,
    joinGroupCall,
    leaveGroupCall,
    endGroupCall,
    dismissIncomingGroupCall,
    refreshActiveGroupCallForConversation,
    toggleGroupCallMic,
    toggleGroupCallCamera
  }
}
