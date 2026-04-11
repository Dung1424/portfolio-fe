<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[2050] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] transition-opacity"
        aria-hidden="true"
        @click="onBackdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgb(15_23_42/0.25),inset_0_0_0_1px_rgb(255_255_255/0.8)]"
        :class="[sizeClass, maxHeightClass]"
        @keydown.esc.stop.prevent="onEscape"
      >
        <header
          class="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4"
        >
          <h2
            :id="titleId"
            class="min-w-0 flex-1 font-[family-name:var(--font-portfolio-heading)] text-[1.0625rem] font-semibold leading-snug text-portfolio-ink"
          >
            {{ title }}
          </h2>
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-portfolio-ink"
            aria-label="Close"
            @click="close"
          >
            <i class="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </header>
        <div
          class="min-h-0 flex-1 overflow-y-auto px-5 py-5"
          :class="bodyClass"
        >
          <slot />
        </div>
        <div v-if="$slots.footer" class="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onUnmounted, useId, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    /** lg = forms; contact ≈560px; wide = photo editor (~920px); xl = wide forms */
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'wide' | 'contact'
    bodyClass?: string
    closeOnBackdrop?: boolean
  }>(),
  {
    title: '',
    size: 'lg',
    bodyClass: '',
    closeOnBackdrop: true
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const titleId = useId()

const sizeClass = computed(() => {
  const map: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    wide: 'max-w-[min(98vw,920px)]',
    contact: 'max-w-[min(560px,96vw)]'
  }
  return map[props.size] ?? map.lg
})

const maxHeightClass = computed(() =>
  props.size === 'wide' || props.size === 'xl' || props.size === '2xl'
    ? 'max-h-[min(92vh,960px)]'
    : 'max-h-[min(90vh,860px)]'
)

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) {
    close()
  }
}

function onEscape() {
  close()
}

watch(
  () => props.modelValue,
  (v) => {
    if (!import.meta.client) {
      return
    }
    document.body.style.overflow = v ? 'hidden' : ''
  }
)

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>
