<template>
  <div
    class="photo-view-panel"
    :class="{ 'max-h-[min(84vh,900px)] overflow-y-auto pr-0.5': variant === 'modal' }"
  >
    <a-spin :spinning="loading">
      <a-card
        v-if="photo"
        :title="variant === 'page' ? (photo.title || 'Photo') : undefined"
        :bordered="variant === 'page'"
        :class="cardClass"
      >
        <div :class="variant === 'modal' ? '' : 'mx-auto max-w-5xl'">
          <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-8">
            <aside class="lg:sticky lg:top-3 lg:self-start">
              <div
                v-if="displayImageUrl"
                class="overflow-hidden rounded-2xl bg-gradient-to-b from-slate-100 to-slate-50/90 p-3 ring-1 ring-slate-200/70 sm:p-4"
              >
                <img
                  :src="displayImageUrl"
                  :alt="photo.title || 'Photo'"
                  class="mx-auto max-h-[min(68vh,480px)] w-full rounded-xl object-contain shadow-sm lg:max-h-[min(72vh,520px)]"
                >
              </div>
              <div
                v-else
                class="flex min-h-[200px] items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200/60 text-sm text-slate-400"
              >
                No preview image
              </div>
            </aside>

            <section class="min-w-0 space-y-6">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Chi tiết ảnh
                </p>
                <h2 class="mt-1.5 font-[family-name:var(--font-portfolio-heading)] text-xl font-semibold leading-snug text-portfolio-ink sm:text-[1.35rem]">
                  {{ photo.title || '—' }}
                </h2>
                <p class="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-600">
                  {{ photo.description || '—' }}
                </p>
                <div class="mt-4 flex flex-wrap gap-2">
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset"
                    :class="privacyBadgeClass(photo.privacy_status)"
                  >
                    {{ privacyLabel(photo.privacy_status) }}
                  </span>
                  <span
                    class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset"
                    :class="photoStatusBadgeClass(photo.photo_status)"
                  >
                    {{ photo.photo_status || '—' }}
                  </span>
                </div>
              </div>

              <dl class="photo-view-meta divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white px-4 py-1 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:px-5">
                <div class="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Location
                  </dt>
                  <dd class="min-w-0 text-sm font-medium text-slate-800 sm:text-right">
                    {{ photo.location || '—' }}
                  </dd>
                </div>
                <div class="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Uploaded
                  </dt>
                  <dd class="text-sm font-medium text-slate-800 sm:text-right">
                    {{ formatDetailDate(photo.upload_date) }}
                  </dd>
                </div>
                <div class="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Category
                  </dt>
                  <dd class="min-w-0 text-sm font-medium text-slate-800 sm:text-right">
                    {{ categoryDisplayLine }}
                  </dd>
                </div>
                <div class="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt class="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Views
                  </dt>
                  <dd class="text-sm font-medium text-slate-800 sm:text-right">
                    {{ photo.total_views ?? '—' }}
                  </dd>
                </div>
                <div class="flex flex-col gap-0.5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <dt class="shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Tags
                  </dt>
                  <dd class="min-w-0 text-sm font-medium leading-snug text-slate-800 sm:text-right">
                    {{ tagsDisplayLine }}
                  </dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { photosAdminApi } from '~/features/admin/photos/services/photos.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { privacyLabel, privacyBadgeClass, photoStatusBadgeClass } from '~/composables/photoAdminBadges'

const props = defineProps({
  photoId: { type: [String, Number], required: true },
  /** `page` | `modal` — giống PhotoEditPanel */
  variant: { type: String, default: 'modal' }
})

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const id = computed(() => props.photoId)

const cardClass = computed(() => {
  if (props.variant === 'modal') {
    return '!rounded-none !border-0 !shadow-none [&_.ant-card-body]:!p-0'
  }
  return ''
})

const loading = ref(true)
const photo = ref(null)

const mediaBase = computed(() =>
  String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, '')
)

const displayImageUrl = computed(() => {
  const p = photo.value
  if (!p) {
    return ''
  }
  const path = p.image_url || p.url || p.photo_url || p.path || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
})

const categoryDisplayLine = computed(() => {
  const p = photo.value
  if (!p) {
    return '—'
  }
  const c = p.category
  if (c && typeof c === 'object') {
    return c.category_name || c.name || p.category_id || '—'
  }
  return p.category_id != null ? String(p.category_id) : '—'
})

const tagsDisplayLine = computed(() => {
  const p = photo.value
  const raw = p?.tags
  if (!Array.isArray(raw) || !raw.length) {
    return '—'
  }
  const names = raw
    .map((t) => (typeof t === 'string' ? t : t?.tag_name))
    .filter(Boolean)
  return names.length ? names.join(', ') : '—'
})

function formatDetailDate(v) {
  if (!v) {
    return '—'
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

async function load() {
  loading.value = true
  try {
    const { data: d1 } = await photosAdminApi.photo(id.value)
    photo.value = d1.photo ?? d1
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

watch(id, () => load(), { immediate: true })
</script>
