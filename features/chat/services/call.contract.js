export const CALL_EVENT = Object.freeze({
  INVITE: 'call:invite',
  ACCEPT: 'call:accept',
  REJECT: 'call:reject',
  CANCEL: 'call:cancel',
  OFFER: 'call:offer',
  ANSWER: 'call:answer',
  ICE_CANDIDATE: 'call:ice-candidate',
  HANGUP: 'call:hangup',
  MISSED: 'call:missed',
  ERROR: 'call:error'
})

export const CALL_TYPE = Object.freeze({
  AUDIO: 'audio',
  VIDEO: 'video'
})
