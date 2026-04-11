<template>
  <div class="space-y-8">
    <div
      class="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-[#0d1e2d] via-[#132f4a] to-[#1877f2]/35 px-6 py-8 text-white shadow-lg sm:px-10 sm:py-10"
    >
      <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div class="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-72 rounded-full bg-[#1877f2]/25 blur-3xl" />
      <div class="relative">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/90">
          Dashboard
        </p>
        <h1 class="mt-2 font-[family-name:var(--font-portfolio-heading)] text-2xl font-bold tracking-tight sm:text-3xl">
          Overview
        </h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-200/90">
          Thống kê nhanh và biểu đồ.
        </p>
      </div>
    </div>

    <a-spin :spinning="loading">
      <section>
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Hiển thị dạng card
        </h2>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <NuxtLink
            v-for="card in metricCards"
            :key="card.key"
            :to="card.to"
            class="group flex flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-5"
          >
            <div class="flex items-center justify-between gap-2">
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition group-hover:bg-[#1877f2]/10 group-hover:text-[#1877f2]"
              >
                <i :class="['fa-solid', card.icon]" aria-hidden="true" />
              </span>
              <i class="fa-solid fa-arrow-right text-xs text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-[#1877f2]" aria-hidden="true" />
            </div>
            <p class="mt-3 text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
              {{ card.label }}
            </p>
            <p class="mt-1 text-2xl font-bold tabular-nums text-portfolio-ink font-[family-name:var(--font-portfolio-heading)] sm:text-3xl">
              {{ card.value }}
            </p>
          </NuxtLink>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Biểu đồ
        </h2>
        <div class="grid gap-6 lg:grid-cols-2">
          <a-card
            title="User đăng ký"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <a-spin :spinning="regLoading">
              <div class="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div class="min-w-[140px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Chu kỳ
                  </p>
                  <a-select
                    v-model:value="regFilters.granularity"
                    class="w-full min-w-[160px] sm:w-[180px]"
                    :options="granularityOptions"
                  />
                </div>
                <template v-if="regFilters.granularity === 'range'">
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Từ ngày
                    </p>
                    <input
                      v-model="regFilters.startDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Đến ngày
                    </p>
                    <input
                      v-model="regFilters.endDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                </template>
                <div v-else class="min-w-[120px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Năm
                  </p>
                  <a-select
                    v-model:value="regFilters.year"
                    class="w-full min-w-[100px] sm:w-[120px]"
                    :options="yearSelectOptions"
                  />
                </div>
                <a-button type="primary" class="!h-8" :loading="regLoading" @click="loadUserRegistrations">
                  Áp dụng
                </a-button>
              </div>
              <p v-if="regTotal != null" class="mb-3 text-sm text-slate-600">
                Tổng đăng ký trong phạm vi:
                <span class="font-semibold tabular-nums text-portfolio-ink">{{ formatMetric(regTotal) }}</span>
              </p>
              <ClientOnly>
                <DashboardUserRegistrationsChart
                  :labels="userRegistrationChart.labels"
                  :values="userRegistrationChart.values"
                />
                <template #fallback>
                  <div class="flex h-[280px] items-center justify-center text-sm text-slate-400">
                    Đang tải biểu đồ…
                  </div>
                </template>
              </ClientOnly>
            </a-spin>
          </a-card>
          <a-card
            title="Trạng thái ảnh"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <ClientOnly>
              <DashboardPhotoStatusPieChart
                :labels="photoStatusChart.labels"
                :values="photoStatusChart.values"
              />
              <template #fallback>
                <div class="flex h-[280px] items-center justify-center text-sm text-slate-400">
                  Đang tải biểu đồ…
                </div>
              </template>
            </ClientOnly>
          </a-card>
          <a-card
            title="Upload ảnh"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <a-spin :spinning="uploadLoading">
              <div class="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div class="min-w-[140px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Chu kỳ
                  </p>
                  <a-select
                    v-model:value="uploadFilters.granularity"
                    class="w-full min-w-[160px] sm:w-[180px]"
                    :options="granularityOptions"
                  />
                </div>
                <template v-if="uploadFilters.granularity === 'range'">
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Từ ngày
                    </p>
                    <input
                      v-model="uploadFilters.startDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Đến ngày
                    </p>
                    <input
                      v-model="uploadFilters.endDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                </template>
                <div v-else class="min-w-[120px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Năm
                  </p>
                  <a-select
                    v-model:value="uploadFilters.year"
                    class="w-full min-w-[100px] sm:w-[120px]"
                    :options="yearSelectOptions"
                  />
                </div>
                <a-button type="primary" class="!h-8" :loading="uploadLoading" @click="loadPhotoUploads">
                  Áp dụng
                </a-button>
              </div>
              <p v-if="uploadTotal != null" class="mb-3 text-sm text-slate-600">
                Tổng upload trong phạm vi:
                <span class="font-semibold tabular-nums text-portfolio-ink">{{ formatMetric(uploadTotal) }}</span>
              </p>
              <ClientOnly>
                <DashboardUserRegistrationsChart
                  series-label="Upload ảnh"
                  color="#059669"
                  :labels="photoUploadChart.labels"
                  :values="photoUploadChart.values"
                />
                <template #fallback>
                  <div class="flex h-[280px] items-center justify-center text-sm text-slate-400">
                    Đang tải biểu đồ…
                  </div>
                </template>
              </ClientOnly>
            </a-spin>
          </a-card>
          <a-card
            title="Báo cáo"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <a-spin :spinning="reportsLoading">
              <div class="mb-4 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:flex-wrap sm:items-end">
                <div class="min-w-[140px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Chu kỳ
                  </p>
                  <a-select
                    v-model:value="reportFilters.granularity"
                    class="w-full min-w-[160px] sm:w-[180px]"
                    :options="granularityOptions"
                  />
                </div>
                <template v-if="reportFilters.granularity === 'range'">
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Từ ngày
                    </p>
                    <input
                      v-model="reportFilters.startDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                  <div>
                    <p class="mb-1 text-xs font-medium text-slate-500">
                      Đến ngày
                    </p>
                    <input
                      v-model="reportFilters.endDate"
                      type="date"
                      class="h-8 w-full min-w-[140px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 sm:w-[150px]"
                    >
                  </div>
                </template>
                <div v-else class="min-w-[120px]">
                  <p class="mb-1 text-xs font-medium text-slate-500">
                    Năm
                  </p>
                  <a-select
                    v-model:value="reportFilters.year"
                    class="w-full min-w-[100px] sm:w-[120px]"
                    :options="yearSelectOptions"
                  />
                </div>
                <a-button type="primary" class="!h-8" :loading="reportsLoading" @click="loadReportsStatistics">
                  Áp dụng
                </a-button>
              </div>
              <p v-if="reportsTotal != null" class="mb-3 text-sm text-slate-600">
                Tổng báo cáo trong phạm vi:
                <span class="font-semibold tabular-nums text-portfolio-ink">{{ formatMetric(reportsTotal) }}</span>
              </p>
              <ClientOnly>
                <DashboardUserRegistrationsChart
                  series-label="Báo cáo"
                  color="#d97706"
                  :labels="reportsChart.labels"
                  :values="reportsChart.values"
                />
                <template #fallback>
                  <div class="flex h-[280px] items-center justify-center text-sm text-slate-400">
                    Đang tải biểu đồ…
                  </div>
                </template>
              </ClientOnly>
            </a-spin>
          </a-card>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Top ảnh
        </h2>
        <div class="space-y-6">
          <a-card
            title="Top 10 ảnh nhiều lượt like nhất"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <div v-if="!topPhotosList.length" class="py-8 text-center text-sm text-slate-500">
              Chưa có dữ liệu.
            </div>
            <div
              v-else
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5"
            >
              <button
                v-for="(photo, idx) in topPhotosList"
                :key="`like-${photo.id}`"
                type="button"
                class="group w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm transition hover:border-[#1877f2]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877f2]"
                @click="openTopPhotoDetail(photo.id)"
              >
                <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    v-if="photoImageUrl(photo)"
                    :src="photoImageUrl(photo)"
                    :alt="photo.title || 'Photo'"
                    class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-slate-400"
                  >
                    <i class="fa-solid fa-image text-2xl" aria-hidden="true" />
                  </div>
                  <span
                    class="absolute left-2 top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-black/55 px-1.5 text-[11px] font-bold tabular-nums text-white"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>
                <div class="p-2.5 sm:p-3">
                  <p class="line-clamp-2 text-xs font-semibold leading-snug text-portfolio-ink sm:text-sm">
                    {{ photo.title || '—' }}
                  </p>
                  <p class="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                    <i class="fa-solid fa-heart text-rose-500" aria-hidden="true" />
                    <span class="font-medium tabular-nums text-slate-700">{{ formatMetric(photo.likes_count) }}</span>
                    <span class="text-slate-400">like</span>
                  </p>
                  <p v-if="photo.user?.name || photo.user?.username" class="mt-0.5 truncate text-[10px] text-slate-400 sm:text-[11px]">
                    {{ photo.user?.name || photo.user?.username }}
                  </p>
                </div>
              </button>
            </div>
          </a-card>
          <a-card
            title="Top 10 ảnh nhiều lượt xem nhất"
            class="rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
          >
            <div v-if="!topPhotosByViewsList.length" class="py-8 text-center text-sm text-slate-500">
              Chưa có dữ liệu.
            </div>
            <div
              v-else
              class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5"
            >
              <button
                v-for="(photo, idx) in topPhotosByViewsList"
                :key="`view-${photo.id}`"
                type="button"
                class="group w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white text-left shadow-sm transition hover:border-[#1877f2]/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877f2]"
                @click="openTopPhotoDetail(photo.id)"
              >
                <div class="relative aspect-[4/3] overflow-hidden bg-slate-100">
                  <img
                    v-if="photoImageUrl(photo)"
                    :src="photoImageUrl(photo)"
                    :alt="photo.title || 'Photo'"
                    class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  >
                  <div
                    v-else
                    class="flex h-full w-full items-center justify-center text-slate-400"
                  >
                    <i class="fa-solid fa-image text-2xl" aria-hidden="true" />
                  </div>
                  <span
                    class="absolute left-2 top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-black/55 px-1.5 text-[11px] font-bold tabular-nums text-white"
                  >
                    {{ idx + 1 }}
                  </span>
                </div>
                <div class="p-2.5 sm:p-3">
                  <p class="line-clamp-2 text-xs font-semibold leading-snug text-portfolio-ink sm:text-sm">
                    {{ photo.title || '—' }}
                  </p>
                  <p class="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 sm:text-xs">
                    <i class="fa-solid fa-eye text-sky-600" aria-hidden="true" />
                    <span class="font-medium tabular-nums text-slate-700">{{ formatMetric(photo.total_views) }}</span>
                    <span class="text-slate-400">lượt xem</span>
                  </p>
                  <p v-if="photo.user?.name || photo.user?.username" class="mt-0.5 truncate text-[10px] text-slate-400 sm:text-[11px]">
                    {{ photo.user?.name || photo.user?.username }}
                  </p>
                </div>
              </button>
            </div>
          </a-card>
        </div>
      </section>

      <a-card
        title="Truy cập nhanh"
        class="mt-8 rounded-2xl border-slate-200/90 shadow-sm [&_.ant-card-head]:!min-h-[44px] [&_.ant-card-head]:!border-slate-100 [&_.ant-card-head]:!bg-slate-50/80"
      >
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/admin/photos/pending">
            <a-button size="large" class="!h-10 !rounded-lg">
              Ảnh chờ duyệt
            </a-button>
          </NuxtLink>
          <NuxtLink to="/admin/reports/photos">
            <a-button size="large" class="!h-10 !rounded-lg">
              Báo cáo ảnh
            </a-button>
          </NuxtLink>
          <NuxtLink to="/admin/reports/galleries">
            <a-button size="large" class="!h-10 !rounded-lg">
              Báo cáo gallery
            </a-button>
          </NuxtLink>
          <NuxtLink to="/admin/reports/comments">
            <a-button size="large" class="!h-10 !rounded-lg">
              Báo cáo comment
            </a-button>
          </NuxtLink>
        </div>
      </a-card>
    </a-spin>

    <AdminModal
      v-model="topPhotoDetailOpen"
      title="Chi tiết ảnh"
      size="wide"
      @close="closeTopPhotoDetail"
    >
      <PhotoViewPanel
        v-if="topPhotoDetailId"
        variant="modal"
        :photo-id="topPhotoDetailId"
      />
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { dashboardAdminApi } from '~/features/admin/dashboard/services/dashboard.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import AdminModal from '~/components/AdminModal.vue'
import DashboardUserRegistrationsChart from '~/components/admin/DashboardUserRegistrationsChart.vue'
import DashboardPhotoStatusPieChart from '~/components/admin/DashboardPhotoStatusPieChart.vue'
import PhotoViewPanel from '~/features/admin/photos/components/PhotoViewPanel.vue'

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const mediaBase = computed(() =>
  String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, '')
)

function photoImageUrl(photo) {
  const path = photo?.image_url || photo?.url || photo?.photo_url || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

const loading = ref(true)
/** Payload `/Dashboard/Get` sau unwrap envelope. */
const stats = ref({})
/** Payload `/Statistics/PhotoStatus`: pending, approved, rejected. */
const photoStatusStats = ref({})

const regLoading = ref(false)
/** `/Statistics/UserRegistrations` sau unwrap: granularity, points, total, … */
const userRegistrationsData = ref({})

const cy = new Date().getFullYear()
const regFilters = ref({
  granularity: 'range',
  startDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  endDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
  year: cy
})

const uploadLoading = ref(false)
/** `/Statistics/PhotoUploads` — cùng shape với UserRegistrations. */
const photoUploadsData = ref({})
const uploadFilters = ref({
  granularity: 'month',
  startDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  endDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
  year: cy
})

const reportsLoading = ref(false)
/** `/Statistics/Reports` — cùng shape time-series. */
const reportsStatsData = ref({})
const reportFilters = ref({
  granularity: 'month',
  startDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
  endDate: `${cy}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
  year: cy
})

/** `/Statistics/TopPhotosByLikes` → data.photos (tối đa 10). */
const topPhotosList = ref([])
/** `/Statistics/TopPhotosByViews` → data.photos (tối đa 10). */
const topPhotosByViewsList = ref([])

const topPhotoDetailOpen = ref(false)
const topPhotoDetailId = ref(null)

function openTopPhotoDetail(id) {
  topPhotoDetailId.value = id
  topPhotoDetailOpen.value = true
}

function closeTopPhotoDetail() {
  topPhotoDetailOpen.value = false
  topPhotoDetailId.value = null
}

const granularityOptions = [
  { value: 'range', label: 'Khoảng ngày' },
  { value: 'month', label: 'Theo tháng (trong năm)' },
  { value: 'year', label: 'Theo năm' }
]

const yearSelectOptions = computed(() => {
  const hi = cy + 1
  const lo = Math.min(2018, cy - 10)
  const out = []
  for (let y = hi; y >= lo; y -= 1) {
    out.push({ value: y, label: String(y) })
  }
  return out
})

function firstFiniteNumber(...candidates) {
  for (const c of candidates) {
    const n = Number(c)
    if (Number.isFinite(n)) {
      return n
    }
  }
  return null
}

function formatMetric(...candidates) {
  const n = firstFiniteNumber(...candidates)
  if (n == null) {
    return '—'
  }
  return new Intl.NumberFormat('vi-VN').format(n)
}

const metricCards = computed(() => [
  {
    key: 'users',
    label: 'Tổng Users',
    value: formatMetric(stats.value.totalUsers),
    icon: 'fa-users',
    to: '/admin/users'
  },
  {
    key: 'photos',
    label: 'Tổng Photos',
    value: formatMetric(stats.value.totalPhotos),
    icon: 'fa-images',
    to: '/admin/photos'
  },
  {
    key: 'likes',
    label: 'Tổng Likes',
    value: formatMetric(stats.value.totalLikes),
    icon: 'fa-heart',
    to: '/admin/photos'
  },
  {
    key: 'comments',
    label: 'Tổng Comments',
    value: formatMetric(stats.value.totalComments),
    icon: 'fa-comments',
    to: '/admin/reports/comments'
  },
  {
    key: 'reports',
    label: 'Tổng Reports',
    value: formatMetric(stats.value.totalReports),
    icon: 'fa-flag',
    to: '/admin/reports/photos'
  },
  {
    key: 'pending',
    label: 'Ảnh chờ duyệt (Pending)',
    value: formatMetric(stats.value.pendingPhotosCount),
    icon: 'fa-clock',
    to: '/admin/photos/pending'
  }
])

function parseYmd(s) {
  const str = String(s ?? '').slice(0, 10)
  const parts = str.split('-').map(Number)
  if (parts.length < 3 || parts.some(x => Number.isNaN(x))) {
    return null
  }
  const [y, m, d] = parts
  return new Date(y, m - 1, d)
}

function toYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Mỗi ngày từ start → end (YYYY-MM-DD), gồm cả hai đầu; tự đảo nếu start > end. */
function eachDayInclusive(startYmd, endYmd) {
  let a = parseYmd(startYmd)
  let b = parseYmd(endYmd)
  if (!a || !b) {
    return []
  }
  if (a.getTime() > b.getTime()) {
    const t = a
    a = b
    b = t
  }
  const out = []
  const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const endT = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  while (cur.getTime() <= endT) {
    out.push(toYmd(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

function pointMonthKey(dateStr) {
  return String(dateStr ?? '').slice(0, 7)
}

/**
 * API chỉ trả các mốc có count > 0 — zero-fill để line chart liên tục.
 * Dùng cho UserRegistrations, PhotoUploads, Reports (cùng contract).
 */
function buildStatisticsTimeSeries(data, filters) {
  const points = Array.isArray(data?.points) ? data.points : []
  const g = filters.granularity || 'range'

  if (g === 'range') {
    const start = filters.startDate
    const end = filters.endDate
    const dayMap = new Map()
    for (const p of points) {
      const key = String(p.date ?? '').slice(0, 10)
      if (!key) {
        continue
      }
      const c = Number(p.count)
      dayMap.set(key, Number.isFinite(c) ? c : 0)
    }
    const days = eachDayInclusive(start, end)
    const labels = days.map((ymd) => {
      const [, m, d] = ymd.split('-')
      return `${d}/${m}`
    })
    const values = days.map(d => dayMap.get(d) ?? 0)
    return { labels, values }
  }

  if (g === 'month') {
    const y = Number(filters.year)
    const monthMap = new Map()
    for (const p of points) {
      let key = pointMonthKey(p.date)
      if (!key || !/^\d{4}-\d{2}$/.test(key)) {
        const mo = Number(p.month)
        if (Number.isFinite(mo) && mo >= 1 && mo <= 12) {
          key = `${y}-${String(mo).padStart(2, '0')}`
        }
      }
      if (!key || !/^\d{4}-\d{2}$/.test(key)) {
        continue
      }
      const c = Number(p.count)
      const add = Number.isFinite(c) ? c : 0
      monthMap.set(key, (monthMap.get(key) ?? 0) + add)
    }
    const labels = []
    const values = []
    for (let m = 1; m <= 12; m += 1) {
      const key = `${y}-${String(m).padStart(2, '0')}`
      labels.push(`T${m}/${String(y).slice(2)}`)
      values.push(monthMap.get(key) ?? 0)
    }
    return { labels, values }
  }

  const ySel = Number(filters.year)
  const yearMap = new Map()
  for (const p of points) {
    const raw = String(p.date ?? '')
    const yearKey = parseInt(raw.slice(0, 4), 10)
    if (!Number.isFinite(yearKey)) {
      continue
    }
    const c = Number(p.count)
    const add = Number.isFinite(c) ? c : 0
    yearMap.set(yearKey, (yearMap.get(yearKey) ?? 0) + add)
  }
  const keys = [...yearMap.keys()].sort((a, b) => a - b)
  if (!keys.length) {
    return { labels: [String(filters.year)], values: [0] }
  }
  const lo = Math.min(...keys, ySel)
  const hi = Math.max(...keys, ySel)
  const labels = []
  const values = []
  for (let yy = lo; yy <= hi; yy += 1) {
    labels.push(String(yy))
    values.push(yearMap.get(yy) ?? 0)
  }
  return { labels, values }
}

const userRegistrationChart = computed(() =>
  buildStatisticsTimeSeries(
    userRegistrationsData.value && typeof userRegistrationsData.value === 'object'
      ? userRegistrationsData.value
      : {},
    regFilters.value
  )
)

const photoUploadChart = computed(() =>
  buildStatisticsTimeSeries(
    photoUploadsData.value && typeof photoUploadsData.value === 'object'
      ? photoUploadsData.value
      : {},
    uploadFilters.value
  )
)

const reportsChart = computed(() =>
  buildStatisticsTimeSeries(
    reportsStatsData.value && typeof reportsStatsData.value === 'object'
      ? reportsStatsData.value
      : {},
    reportFilters.value
  )
)

const regTotal = computed(() => {
  const t = userRegistrationsData.value?.total
  const n = Number(t)
  return Number.isFinite(n) ? n : null
})

const uploadTotal = computed(() => {
  const t = photoUploadsData.value?.total
  const n = Number(t)
  return Number.isFinite(n) ? n : null
})

const reportsTotal = computed(() => {
  const t = reportsStatsData.value?.total
  const n = Number(t)
  return Number.isFinite(n) ? n : null
})

async function fetchUserRegistrationsFromFilters() {
  const f = regFilters.value
  const params = { granularity: f.granularity }
  if (f.granularity === 'range') {
    params.start_date = f.startDate
    params.end_date = f.endDate
  } else {
    params.year = f.year
  }
  const { data } = await dashboardAdminApi.userRegistrations(params)
  userRegistrationsData.value = data && typeof data === 'object' ? data : {}
}

async function loadUserRegistrations() {
  regLoading.value = true
  try {
    await fetchUserRegistrationsFromFilters()
  } catch (e) {
    showFromError(e)
    userRegistrationsData.value = { points: [] }
  } finally {
    regLoading.value = false
  }
}

async function fetchPhotoUploadsFromFilters() {
  const f = uploadFilters.value
  const params = { granularity: f.granularity }
  if (f.granularity === 'range') {
    params.start_date = f.startDate
    params.end_date = f.endDate
  } else {
    params.year = f.year
  }
  const { data } = await dashboardAdminApi.photoUploads(params)
  photoUploadsData.value = data && typeof data === 'object' ? data : {}
}

async function loadPhotoUploads() {
  uploadLoading.value = true
  try {
    await fetchPhotoUploadsFromFilters()
  } catch (e) {
    showFromError(e)
    photoUploadsData.value = { points: [] }
  } finally {
    uploadLoading.value = false
  }
}

async function fetchReportsStatisticsFromFilters() {
  const f = reportFilters.value
  const params = { granularity: f.granularity }
  if (f.granularity === 'range') {
    params.start_date = f.startDate
    params.end_date = f.endDate
  } else {
    params.year = f.year
  }
  const { data } = await dashboardAdminApi.reportsStatistics(params)
  reportsStatsData.value = data && typeof data === 'object' ? data : {}
}

async function loadReportsStatistics() {
  reportsLoading.value = true
  try {
    await fetchReportsStatisticsFromFilters()
  } catch (e) {
    showFromError(e)
    reportsStatsData.value = { points: [] }
  } finally {
    reportsLoading.value = false
  }
}

async function fetchTopPhotosByLikes() {
  const { data } = await dashboardAdminApi.topPhotosByLikes()
  const raw = data && typeof data === 'object' ? data.photos : null
  const photos = Array.isArray(raw) ? raw : []
  topPhotosList.value = photos.slice(0, 10)
}

async function fetchTopPhotosByViews() {
  const { data } = await dashboardAdminApi.topPhotosByViews()
  const raw = data && typeof data === 'object' ? data.photos : null
  const photos = Array.isArray(raw) ? raw : []
  topPhotosByViewsList.value = photos.slice(0, 10)
}

const photoStatusChart = computed(() => {
  const d = photoStatusStats.value && typeof photoStatusStats.value === 'object'
    ? photoStatusStats.value
    : {}
  const pending = firstFiniteNumber(d.pending) ?? 0
  const approved = firstFiniteNumber(d.approved) ?? 0
  const rejected = firstFiniteNumber(d.rejected) ?? 0
  return {
    labels: ['Chờ duyệt', 'Đã duyệt', 'Từ chối'],
    values: [pending, approved, rejected]
  }
})

async function loadDashboard() {
  loading.value = true
  regLoading.value = true
  uploadLoading.value = true
  reportsLoading.value = true
  try {
    const [dashRes, statusRes] = await Promise.all([
      dashboardAdminApi.dashboard().catch((e) => {
        showFromError(e)
        return { data: {} }
      }),
      dashboardAdminApi.photoStatus().catch((e) => {
        showFromError(e)
        return { data: {} }
      }),
      fetchUserRegistrationsFromFilters().catch((e) => {
        showFromError(e)
        userRegistrationsData.value = { points: [] }
      }),
      fetchPhotoUploadsFromFilters().catch((e) => {
        showFromError(e)
        photoUploadsData.value = { points: [] }
      }),
      fetchReportsStatisticsFromFilters().catch((e) => {
        showFromError(e)
        reportsStatsData.value = { points: [] }
      }),
      fetchTopPhotosByLikes().catch((e) => {
        showFromError(e)
        topPhotosList.value = []
      }),
      fetchTopPhotosByViews().catch((e) => {
        showFromError(e)
        topPhotosByViewsList.value = []
      })
    ])
    stats.value = dashRes.data && typeof dashRes.data === 'object' ? dashRes.data : {}
    photoStatusStats.value
      = statusRes.data && typeof statusRes.data === 'object' ? statusRes.data : {}
  } finally {
    loading.value = false
    regLoading.value = false
    uploadLoading.value = false
    reportsLoading.value = false
  }
}

watch(
  () => regFilters.value.granularity,
  (g) => {
    if (g !== 'range') {
      regFilters.value.year = regFilters.value.year || cy
    }
  }
)

watch(
  () => uploadFilters.value.granularity,
  (g) => {
    if (g !== 'range') {
      uploadFilters.value.year = uploadFilters.value.year || cy
    }
  }
)

watch(
  () => reportFilters.value.granularity,
  (g) => {
    if (g !== 'range') {
      reportFilters.value.year = reportFilters.value.year || cy
    }
  }
)

onMounted(() => loadDashboard())
</script>
