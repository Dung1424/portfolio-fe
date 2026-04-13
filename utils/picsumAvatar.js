/** Avatar on dinh theo seed (Picsum). */
export function picsumAvatarUrl(seed) {
  const s = encodeURIComponent(String(seed ?? 'x'))
  return `https://picsum.photos/seed/${s}/96/96`
}
