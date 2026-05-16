<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  tile: { type: Object, required: true },
})

const videoRef = ref(null)
const audioRef = ref(null)

function detachTrack(track) {
  try {
    track?.detach?.()
  } catch {
    /* ignore */
  }
}

function attachVideo() {
  const el = videoRef.value
  const track = props.tile?.videoTrack
  if (!el || !track) {
    return
  }
  try {
    track.attach(el)
  } catch (e) {
    console.error('attach livekit video', e)
  }
}

function attachAudio() {
  const el = audioRef.value
  const track = props.tile?.audioTrack
  if (!el || !track || props.tile?.isLocal) {
    return
  }
  try {
    track.attach(el)
  } catch (e) {
    console.error('attach livekit audio', e)
  }
}

watch(
  () => props.tile?.videoTrack,
  (next, prev) => {
    detachTrack(prev)
    if (next) {
      attachVideo()
    }
  },
  { immediate: true, flush: 'post' },
)

watch(
  () => props.tile?.audioTrack,
  (next, prev) => {
    detachTrack(prev)
    if (next) {
      attachAudio()
    }
  },
  { immediate: true, flush: 'post' },
)

onBeforeUnmount(() => {
  detachTrack(props.tile?.videoTrack)
  detachTrack(props.tile?.audioTrack)
})
</script>

<template>
  <div class="relative min-h-[180px] overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10">
    <video
      v-show="tile.videoTrack && tile.cameraEnabled !== false"
      ref="videoRef"
      autoplay
      playsinline
      :muted="tile.isLocal"
      class="h-full w-full object-cover"
    />
    <audio
      v-if="!tile.isLocal"
      ref="audioRef"
      autoplay
      playsinline
      class="hidden"
    />
    <div
      v-if="!tile.videoTrack || tile.cameraEnabled === false"
      class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900 text-white"
    >
      <div class="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-[22px] font-semibold">
        {{ String(tile.name || '?').slice(0, 2).toUpperCase() }}
      </div>
      <p class="max-w-[80%] truncate text-[14px] font-semibold">
        {{ tile.name }}
      </p>
    </div>
    <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 rounded-lg bg-black/45 px-2 py-1.5 text-white backdrop-blur">
      <span class="min-w-0 truncate text-[13px] font-semibold">{{ tile.name }}</span>
      <i
        class="shrink-0 text-[12px]"
        :class="tile.micEnabled === false ? 'fa-solid fa-microphone-slash text-rose-300' : 'fa-solid fa-microphone text-emerald-300'"
      />
    </div>
  </div>
</template>
