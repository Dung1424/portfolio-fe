<template>
  <main class="min-h-screen bg-slate-50">
    <section class="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1280px]">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-3xl">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Photo quests</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl font-[family-name:var(--font-portfolio-heading)]">
              Thử thách đang mở
            </h1>
            <p class="mt-3 text-base leading-7 text-slate-600">
              Chọn quest phù hợp, gửi ảnh của bạn, nhận Star khi được duyệt và Coin nếu đạt thứ hạng cao.
            </p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/wallet" class="quest-outline-btn">
              <i class="fa-solid fa-wallet" aria-hidden="true" />
              Wallet
            </NuxtLink>
            <NuxtLink to="/store" class="quest-primary-btn">
              <i class="fa-solid fa-store" aria-hidden="true" />
              Store
            </NuxtLink>
          </div>
        </div>

        <div class="mt-8 grid gap-3 sm:grid-cols-3">
          <div class="quest-stat-card">
            <span>Quest mở</span>
            <strong>{{ quests.length }}</strong>
          </div>
          <div class="quest-stat-card">
            <span>Thưởng cao nhất</span>
            <strong>{{ topRewardText }}</strong>
          </div>
          <div class="quest-stat-card">
            <span>Cách tham gia</span>
            <strong>Upload photo</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1280px]">
        <div v-if="isJury" class="mb-6 flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button type="button" class="quest-mode-btn" :class="{ active: activeMode === 'jury' }" @click="activeMode = 'jury'">
            <i class="fa-solid fa-clipboard-check" aria-hidden="true" />
            Cần chấm
          </button>
          <button type="button" class="quest-mode-btn" :class="{ active: activeMode === 'quests' }" @click="activeMode = 'quests'">
            <i class="fa-solid fa-trophy" aria-hidden="true" />
            Quest đang mở
          </button>
        </div>

        <JuryScoringPanel v-if="isJury && activeMode === 'jury'" />

        <template v-if="!isJury || activeMode === 'quests'">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950">Danh sách quest</h2>
            <p class="mt-1 text-sm text-slate-500">Xem deadline, số lượt gửi và thưởng trước khi tham gia.</p>
          </div>
          <a-button class="!h-10 !rounded-lg" :loading="loading" @click="fetchQuests">
            <i class="fa-solid fa-rotate-right mr-2 text-xs" aria-hidden="true" />
            Refresh
          </a-button>
        </div>

        <a-spin :spinning="loading">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NuxtLink
              v-for="quest in quests"
              :key="quest.id"
              :to="`/quests/${quest.id}`"
              class="quest-card group"
            >
              <div class="flex items-start justify-between gap-4">
                <span class="quest-status" :class="statusClass(quest.status)">{{ statusLabel(quest.status) }}</span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {{ quest.max_submissions_per_user || 1 }} ảnh tối đa
                </span>
              </div>

              <div class="mt-5">
                <h3 class="line-clamp-2 text-xl font-semibold leading-snug text-slate-950 group-hover:text-blue-600">
                  {{ quest.title }}
                </h3>
                <p class="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                  {{ quest.description || quest.brief || 'Quest đang nhận ảnh tham gia.' }}
                </p>
              </div>

              <div class="mt-5 grid gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-500">Nhận bài</span>
                  <strong class="text-right font-semibold text-slate-800">{{ formatShortDate(quest.start_at) }} - {{ formatShortDate(quest.end_at) }}</strong>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-slate-500">Chấm điểm</span>
                  <strong class="text-right font-semibold text-slate-800">{{ formatShortDate(quest.judging_start_at || quest.end_at) }} - {{ formatShortDate(quest.judging_end_at) }}</strong>
                </div>
              </div>

              <div class="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                <div>
                  <div class="text-xs font-semibold uppercase tracking-wide text-slate-400">Top reward</div>
                  <div class="mt-1 font-semibold text-slate-950">{{ formatReward(quest.reward_config) }}</div>
                </div>
                <span class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                  <i class="fa-solid fa-arrow-right text-sm" aria-hidden="true" />
                </span>
              </div>
            </NuxtLink>
          </div>

          <a-empty v-if="!loading && quests.length === 0" description="Chưa có quest đang mở" class="rounded-2xl border border-dashed border-slate-200 bg-white py-14" />
        </a-spin>
        </template>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { questApi } from '~/features/quests/services/quest.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'
import { useUserStore } from '~/stores/userStore.js'
import JuryScoringPanel from '~/features/quests/components/JuryScoringPanel.vue'

const quests = ref([])
const loading = ref(false)
const userStore = useUserStore()
const activeMode = ref('quests')
const isJury = computed(() => Array.isArray(userStore.user?.roles) && userStore.user.roles.includes('jury'))

const topRewardText = computed(() => {
  const rewards = quests.value
    .map(quest => quest.reward_config?.ranks?.[0]?.rewards?.coin || 0)
    .filter(Boolean)
  return rewards.length ? `${Math.max(...rewards).toLocaleString()} coin` : 'Đang cập nhật'
})

async function fetchQuests() {
  loading.value = true
  try {
    const { data } = await questApi.quests({ status: 'open' })
    quests.value = data.quests?.data || []
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load quests') })
  } finally {
    loading.value = false
  }
}

function formatShortDate(value) {
  if (!value) {
    return '—'
  }
  const [date, time = ''] = String(value).replace('T', ' ').split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

function formatReward(config) {
  const top = config?.ranks?.[0]?.rewards
  if (!top) {
    return 'Đang cập nhật'
  }
  return `${Number(top.coin || 0).toLocaleString()} coin + ${Number(top.star || 0).toLocaleString()} star`
}

function statusLabel(status) {
  return { open: 'Đang mở', judging: 'Đang chấm', completed: 'Hoàn thành', draft: 'Nháp' }[status] || status
}

function statusClass(status) {
  return {
    open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    judging: 'bg-blue-50 text-blue-700 ring-blue-200',
    completed: 'bg-amber-50 text-amber-700 ring-amber-200'
  }[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
}

onMounted(async () => {
  await fetchQuests()
  if (localStorage.getItem('token')) {
    await userStore.fetchUserData()
  }
})

watch(isJury, (value) => {
  if (value) {
    activeMode.value = 'jury'
  }
}, { immediate: true })
</script>

<style scoped>
.quest-primary-btn,
.quest-outline-btn {
  display: inline-flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
  transition: border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.quest-primary-btn {
  background: #0f172a;
  color: #ffffff;
}

.quest-primary-btn:hover {
  background: #1e293b;
  color: #ffffff;
}

.quest-outline-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
}

.quest-outline-btn:hover {
  border-color: #64748b;
  color: #0f172a;
}

.quest-stat-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  padding: 16px;
}

.quest-stat-card span {
  display: block;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
}

.quest-stat-card strong {
  margin-top: 8px;
  display: block;
  font-size: 22px;
  line-height: 1.15;
  color: #0f172a;
}

.quest-card {
  display: block;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.quest-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 16px 40px rgb(15 23 42 / 0.10);
  transform: translateY(-2px);
}

.quest-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px currentColor;
}

.quest-mode-btn {
  display: inline-flex;
  height: 40px;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 0 14px;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.quest-mode-btn.active {
  background: #0f172a;
  color: #ffffff;
}
</style>
