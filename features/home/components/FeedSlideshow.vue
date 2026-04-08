<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[2000] flex min-h-0 flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Slideshow"
    >
      <div class="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white">
        <span class="text-sm tabular-nums text-white/80">
          {{ photos.length ? currentIndex + 1 : 0 }} / {{ photos.length }}
        </span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full px-3 py-1.5 text-sm text-white/90 transition hover:bg-white/10"
            :aria-pressed="autoplay"
            @click="autoplay = !autoplay"
          >
            {{ autoplay ? 'Pause' : 'Play' }}
          </button>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Close"
            @click="$emit('close')"
          >
            <i class="fa-solid fa-xmark text-xl" />
          </button>
        </div>
      </div>

      <div class="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-1 pb-3 pt-0 md:px-3 md:pb-6">
        <button
          type="button"
          class="absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 md:left-4 md:h-12 md:w-12 lg:left-6"
          aria-label="Previous"
          @click="prev"
        >
          <i class="fa-solid fa-chevron-left text-lg" />
        </button>

        <div class="box-border flex min-h-0 w-full min-w-0 flex-1 items-center justify-center px-2 py-1 sm:px-4 md:px-6">
          <img
            v-if="currentPhoto"
            :key="currentPhoto.id"
            :src="currentPhoto.image_url"
            class="h-auto w-auto max-h-[min(calc(100dvh-9rem),92vh)] max-w-[min(100%,min(1920px,calc(100vw-4rem)))] object-contain"
            alt=""
          >
        </div>

        <button
          type="button"
          class="absolute right-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 md:right-4 md:h-12 md:w-12 lg:right-6"
          aria-label="Next"
          @click="next"
        >
          <i class="fa-solid fa-chevron-right text-lg" />
        </button>
      </div>

      <div class="shrink-0 border-t border-white/10 px-4 py-3 text-center text-sm text-white/70">
        <span v-if="currentPhoto?.user">{{ currentPhoto.user.name }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
type FeedPhoto = {
  id: number
  image_url: string
  photo_token?: string
  user?: { name?: string; username?: string }
}

const props = defineProps<{
  photos: FeedPhoto[]
}>()

const emit = defineEmits<{
  close: []
}>()

const currentIndex = ref(0)
const autoplay = ref(false)
let autoplayTimer: ReturnType<typeof setInterval> | null = null

const currentPhoto = computed(() => props.photos[currentIndex.value])

function next() {
  if (!props.photos.length) return
  currentIndex.value = (currentIndex.value + 1) % props.photos.length
}

function prev() {
  if (!props.photos.length) return
  currentIndex.value = (currentIndex.value - 1 + props.photos.length) % props.photos.length
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('close')
  } else if (e.key === 'ArrowRight') {
    next()
  } else if (e.key === 'ArrowLeft') {
    prev()
  }
}

watch(autoplay, (on) => {
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
    autoplayTimer = null
  }
  if (on && props.photos.length > 1) {
    autoplayTimer = setInterval(next, 5000)
  }
})

watch(
  () => props.photos.length,
  (len) => {
    if (currentIndex.value >= len) {
      currentIndex.value = Math.max(0, len - 1)
    }
  }
)

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onGlobalKeydown)
  if (autoplayTimer) {
    clearInterval(autoplayTimer)
  }
})
</script>
