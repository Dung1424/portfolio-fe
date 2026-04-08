/** Stable Picsum avatar URL from a string seed (avoids Tailwind/Vite parsing `encodeURIComponent` inside .vue SFC). */
export function picsumAvatarUrl(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/128/128`
}
