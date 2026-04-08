<script setup lang="ts">
const props = defineProps<{
  modelValue: 'gallery' | 'grid'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: 'gallery' | 'grid']
}>()

function toggle() {
  emit('update:modelValue', props.modelValue === 'gallery' ? 'grid' : 'gallery')
}
</script>

<template>
  <button
    type="button"
    class="inline-flex shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200/80 transition hover:border-zinc-300 hover:bg-zinc-50 active:scale-[0.98]"
    :aria-pressed="props.modelValue === 'gallery'"
    :aria-label="
      props.modelValue === 'gallery'
        ? 'Gallery view — click to switch to grid view'
        : 'Grid view — click to switch to gallery view'
    "
    @click.stop="toggle"
  >
    <template v-if="props.modelValue === 'gallery'">
      <i
        class="fa-regular fa-image text-[15px] text-[#1877f2]"
        aria-hidden="true"
      />
      Gallery view
    </template>
    <template v-else>
      <span
        class="inline-grid shrink-0 grid-cols-3 gap-0.5"
        aria-hidden="true"
      >
        <span
          v-for="i in 9"
          :key="i"
          class="h-1 w-1 rounded-full bg-[#1877f2]"
        />
      </span>
      Grid view
    </template>
  </button>
</template>
