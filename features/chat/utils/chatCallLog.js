export function isCallLogMessage(msg) {
  return msg?.metadata?.kind === 'call_log'
}

export function callLogIcon(meta) {
  if (meta?.callType === 'video') {
    return 'fa-solid fa-video'
  }
  return 'fa-solid fa-phone'
}

export function callLogTitle(meta) {
  const status = typeof meta?.status === 'string' ? meta.status : 'ended'
  if (status === 'missed') return 'Missed call'
  if (status === 'rejected') return 'Declined call'
  if (status === 'canceled') return 'Canceled call'
  if (status === 'interrupted') return 'Call interrupted'
  return 'Call ended'
}

export function callLogTone(meta) {
  const status = typeof meta?.status === 'string' ? meta.status : 'ended'
  if (status === 'missed' || status === 'rejected') {
    return 'text-rose-600 bg-rose-50 border-rose-200'
  }
  return 'text-zinc-600 bg-zinc-100 border-zinc-200'
}

export function callLogDuration(meta) {
  const sec = Number(meta?.durationSeconds || 0)
  if (!Number.isFinite(sec) || sec <= 0) {
    return ''
  }
  const min = Math.floor(sec / 60)
  const second = sec % 60
  return `${String(min).padStart(2, '0')}:${String(second).padStart(2, '0')}`
}
