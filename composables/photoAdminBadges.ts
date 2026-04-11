/** Badge color classes for admin photo Privacy / Status (pair with `ring-1 ring-inset` on the span). */

function isPrivatePrivacy(v: unknown): boolean {
  return v === true || v === 1 || String(v) === '1'
}

export function privacyLabel(v: unknown): string {
  return isPrivatePrivacy(v) ? 'Private' : 'Public'
}

export function privacyBadgeClass(v: unknown): string {
  return isPrivatePrivacy(v)
    ? 'bg-amber-50 text-amber-800 ring-amber-200/80'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
}

export function photoStatusBadgeClass(status: unknown): string {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'approved') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
  }
  if (s === 'pending') {
    return 'bg-amber-50 text-amber-800 ring-amber-200/80'
  }
  if (s === 'rejected') {
    return 'bg-rose-50 text-rose-800 ring-rose-200/80'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200/80'
}
