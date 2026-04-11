<template>
  <div
    v-if="total > 0 || lastPage > 1 || interactive"
    class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-sm"
  >
    <div v-if="interactive" class="flex flex-wrap items-center gap-3 text-slate-600">
      <label class="flex items-center gap-2 whitespace-nowrap">
        <span>Hiển thị</span>
        <select
          :value="pageSize"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-800 shadow-sm outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-admin-accent/20"
          @change="onSizeChange"
        >
          <option v-for="n in pageSizeOptions" :key="n" :value="n">
            {{ n }}
          </option>
        </select>
        <span>{{ itemLabel }} mỗi trang</span>
      </label>

      <div v-if="lastPage > 1" class="flex items-center gap-1.5">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="loading || page <= 1"
          aria-label="Previous page"
          @click="emit('update:page', page - 1)"
        >
          <i class="fa-solid fa-angle-left text-xs" aria-hidden="true" />
        </button>

        <template v-for="item in visiblePages" :key="item.key">
          <span
            v-if="item.type === 'ellipsis'"
            class="inline-flex h-9 min-w-9 items-center justify-center px-1 text-slate-400"
          >
            ...
          </span>
          <button
            v-else
            type="button"
            class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium shadow-sm transition"
            :class="item.page === page
              ? 'border-zinc-900 bg-zinc-900 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'"
            :disabled="loading || item.page === page"
            @click="emit('update:page', item.page)"
          >
            {{ item.page }}
          </button>
        </template>

        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="loading || page >= lastPage"
          aria-label="Next page"
          @click="emit('update:page', page + 1)"
        >
          <i class="fa-solid fa-angle-right text-xs" aria-hidden="true" />
        </button>
      </div>
    </div>

    <p class="text-slate-500">
      Trang <span class="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-slate-700">{{ page }}</span>
      trên {{ lastPage }}
      <span class="mx-1 text-slate-300">|</span>
      Tổng cộng {{ total }} {{ itemLabel }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

defineOptions({ name: 'AdminPager' })

const props = defineProps({
  page: { type: Number, default: 1 },
  pageSize: { type: Number, default: 15 },
  lastPage: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  itemLabel: { type: String, default: 'bản ghi' },
  loading: { type: Boolean, default: false },
  /** false: chỉ hiển thị tổng / trang (ví dụ dashboard snapshot). */
  interactive: { type: Boolean, default: true },
  pageSizeOptions: {
    type: Array,
    default: () => [10, 15, 20, 25, 50],
  },
})

const emit = defineEmits(['update:page', 'update:pageSize'])

const visiblePages = computed(() => {
  const totalPages = Math.max(1, props.lastPage)
  const current = Math.min(Math.max(1, props.page), totalPages)
  const near = 1

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({
      type: 'page',
      page: i + 1,
      key: `p-${i + 1}`
    }))
  }

  const pages = new Set([1, totalPages, current])
  for (let p = current - near; p <= current + near; p += 1) {
    if (p > 1 && p < totalPages) {
      pages.add(p)
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < sorted.length; i += 1) {
    const p = sorted[i]
    result.push({ type: 'page', page: p, key: `p-${p}` })
    const next = sorted[i + 1]
    if (next && next - p > 1) {
      result.push({ type: 'ellipsis', key: `e-${p}-${next}` })
    }
  }
  return result
})

function onSizeChange(e) {
  const v = Number(e.target?.value)
  if (!Number.isNaN(v)) {
    emit('update:pageSize', v)
  }
}
</script>
