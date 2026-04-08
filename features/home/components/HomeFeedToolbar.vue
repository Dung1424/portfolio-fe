<template>
  <div
    class="relative mb-6 flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <button
      type="button"
      class="inline-flex w-fit items-center gap-1.5 text-[15px] font-medium text-zinc-900"
    >
      Daily dose
      <i class="fa-solid fa-chevron-down text-[11px] text-zinc-400" aria-hidden="true" />
    </button>
    <div class="flex flex-wrap items-center gap-4 sm:gap-6 text-[15px] text-zinc-700">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-zinc-100 hover:text-zinc-900"
        @click="$emit('open-slideshow')"
      >
        <i class="fa-regular fa-circle-play text-lg" aria-hidden="true" />
        Slide show
      </button>
      <div ref="layoutWrap" class="relative">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-zinc-100 hover:text-zinc-900"
          :class="{ 'bg-zinc-100 text-zinc-900': layoutMenuOpen }"
          aria-haspopup="true"
          :aria-expanded="layoutMenuOpen"
          @click.stop="layoutMenuOpen = !layoutMenuOpen"
        >
          <span class="inline-grid grid-cols-2 gap-0.5 text-[10px] leading-none" aria-hidden="true">
            <span class="h-1 w-1 rounded-sm bg-current" /><span class="h-1 w-1 rounded-sm bg-current" />
            <span class="h-1 w-1 rounded-sm bg-current" /><span class="h-1 w-1 rounded-sm bg-current" />
          </span>
          Layout
          <i class="fa-solid fa-chevron-down text-[10px] text-zinc-400" />
        </button>
        <div
          v-show="layoutMenuOpen"
          class="absolute right-0 top-full z-40 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          @click.stop
        >
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            @click="selectLayout('masonry')"
          >
            Masonry
            <i v-if="layoutMode === 'masonry'" class="fa-solid fa-check text-[#1877f2]" />
          </button>
          <button
            type="button"
            class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            @click="selectLayout('grid')"
          >
            Uniform grid
            <i v-if="layoutMode === 'grid'" class="fa-solid fa-check text-[#1877f2]" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  layoutMode: 'masonry' | 'grid'
}>()

const emit = defineEmits<{
  'open-slideshow': []
  'update:layoutMode': [mode: 'masonry' | 'grid']
}>()

const layoutMenuOpen = ref(false)
const layoutWrap = ref<HTMLElement | null>(null)

function selectLayout(mode: 'masonry' | 'grid') {
  emit('update:layoutMode', mode)
  try {
    localStorage.setItem('home-feed-layout', mode)
  } catch {
    /* ignore */
  }
  layoutMenuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})

function onDocClick(e: MouseEvent) {
  const el = layoutWrap.value
  if (el && !el.contains(e.target as Node)) {
    layoutMenuOpen.value = false
  }
}
</script>
