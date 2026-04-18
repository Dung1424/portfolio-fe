function escapeRegExpForHighlight(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * @param {string} text
 * @param {string} query
 * @returns {{ match: boolean, text: string }[]}
 */
export function messageSearchSegments(text, query) {
  const q = String(query ?? '').trim()
  const t = String(text ?? '')
  if (!q) {
    return [{ match: false, text: t }]
  }
  let re
  try {
    re = new RegExp(`(${escapeRegExpForHighlight(q)})`, 'gi')
  } catch {
    return [{ match: false, text: t }]
  }
  const out = []
  let last = 0
  const s = t
  let m = re.exec(s)
  while (m != null) {
    if (m.index > last) {
      out.push({ match: false, text: s.slice(last, m.index) })
    }
    out.push({ match: true, text: m[1] })
    last = m.index + m[1].length
    if (m[0].length === 0) {
      re.lastIndex++
    }
    m = re.exec(s)
  }
  if (last < s.length) {
    out.push({ match: false, text: s.slice(last) })
  }
  return out.length ? out : [{ match: false, text: t }]
}
