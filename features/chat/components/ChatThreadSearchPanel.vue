<script setup>
import { computed } from 'vue'
import { messageSearchSegments } from '~/features/chat/utils/chatSearchHighlight.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  results: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  hasMore: { type: Boolean, default: false },
  peerDisplayName: { type: String, default: 'User' },
  /** (value: string | Date) => string */
  formatTime: { type: Function, required: true },
})

const emit = defineEmits(['update:modelValue', 'pick', 'load-more'])

const draft = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v),
})

function segmentsFor(text) {
  return messageSearchSegments(text, props.modelValue)
}

function hitAuthor(hit) {
  if (hit?.isOwn) {
    return 'You'
  }
  return props.peerDisplayName || 'User'
}
</script>

<template>
  <div class="border-b border-zinc-200 bg-white px-4 py-3 sm:px-5">
    <label class="relative block">
      <span class="sr-only">Search in conversation</span>
      <i
        class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#1877f2]/40"
      />
      <input
        v-model="draft"
        type="search"
        autocomplete="off"
        placeholder="Search in conversation"
        class="w-full rounded-full border border-zinc-200/90 bg-zinc-50 py-2 pl-10 pr-4 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#1877f2]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/12"
      >
    </label>
    <div
      v-if="loading && results.length === 0 && modelValue.trim()"
      class="mt-3 text-center text-[13px] text-zinc-500"
    >
      Searching…
    </div>
    <ul
      v-else-if="modelValue.trim() && results.length"
      class="mt-2 max-h-[min(40vh,16rem)] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200/90 bg-zinc-50/50"
    >
      <li v-for="hit in results" :key="String(hit.id)">
        <button
          type="button"
          class="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white"
          @click="emit('pick', hit)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-[12px] text-zinc-500">
              {{ hitAuthor(hit) }}
              <span class="tabular-nums text-zinc-400"> · {{ formatTime(hit.createdAt) }}</span>
            </p>
            <p class="mt-0.5 line-clamp-2 text-[14px] leading-snug text-zinc-800">
              <template
                v-for="(seg, i) in segmentsFor(hit.text)"
                :key="`${String(hit.id)}-seg-${i}`"
              >
                <mark
                  v-if="seg.match"
                  class="bg-amber-200/90 font-semibold text-inherit [box-decoration-break:clone]"
                >{{ seg.text }}</mark>
                <span v-else>{{ seg.text }}</span>
              </template>
            </p>
          </div>
          <i
            class="fa-solid fa-chevron-right mt-1 shrink-0 text-[11px] text-zinc-400"
            aria-hidden="true"
          />
        </button>
      </li>
    </ul>
    <p
      v-else-if="modelValue.trim() && !loading"
      class="mt-3 text-center text-[13px] text-zinc-500"
    >
      No messages found.
    </p>
    <p v-else class="mt-2 text-[12px] leading-snug text-zinc-400">
      Type to search this chat. Recalled messages are skipped.
    </p>
    <button
      v-if="hasMore && results.length"
      type="button"
      class="mt-2 w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
      :disabled="loading"
      @click="emit('load-more')"
    >
      {{ loading ? 'Loading…' : 'Load more results' }}
    </button>
  </div>
</template>
