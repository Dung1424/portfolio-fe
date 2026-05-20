<template>
  <main class="min-h-screen bg-slate-50">
    <section class="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1180px]">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Rewards wallet</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl font-[family-name:var(--font-portfolio-heading)]">Wallet</h1>
            <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600">Star là điểm nhận từ quest. Coin dùng để đổi quà trong Store.</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <NuxtLink to="/quests" class="wallet-outline-btn">
              <i class="fa-solid fa-trophy" aria-hidden="true" />
              Quests
            </NuxtLink>
            <NuxtLink to="/store" class="wallet-primary-btn">
              <i class="fa-solid fa-store" aria-hidden="true" />
              Store
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1180px]">
        <a-spin :spinning="loading">
          <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="wallet-balance-card bg-slate-950 text-white">
                <div class="flex items-center justify-between">
                  <span>Stars</span>
                  <i class="fa-solid fa-star text-amber-300" aria-hidden="true" />
                </div>
                <strong>{{ numberText(wallet?.stars || 0) }}</strong>
                <p>Dùng để đổi sang Coin hoặc theo dõi tiến độ quest.</p>
              </div>

              <div class="wallet-balance-card bg-blue-600 text-white">
                <div class="flex items-center justify-between">
                  <span>Coins</span>
                  <i class="fa-solid fa-coins text-blue-100" aria-hidden="true" />
                </div>
                <strong>{{ numberText(wallet?.coins || 0) }}</strong>
                <p>Dùng Coin để redeem item trong Store.</p>
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-semibold text-slate-950">Đổi Star sang Coin</h2>
                  <p class="mt-1 text-sm text-slate-500">Tỉ lệ hiện tại: 1 Star = 10 Coin.</p>
                </div>
                <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">1:10</span>
              </div>

              <div class="mt-5 rounded-xl bg-slate-50 p-4">
                <label class="text-sm font-semibold text-slate-700">Số Star muốn đổi</label>
                <a-input-number v-model:value="starsToConvert" :min="1" :max="wallet?.stars || undefined" class="!mt-2 !w-full" size="large" />
                <div class="mt-3 flex items-center justify-between text-sm">
                  <span class="text-slate-500">Bạn sẽ nhận</span>
                  <strong class="text-slate-950">{{ numberText((starsToConvert || 0) * 10) }} Coin</strong>
                </div>
              </div>

              <a-button type="primary" block size="large" class="mt-4 !h-12 !rounded-xl !font-semibold" :loading="converting" :disabled="!canConvert" @click="convert">
                Convert
              </a-button>
              <p v-if="!canConvert" class="mt-3 text-sm text-slate-500">Số Star cần đổi phải nhỏ hơn hoặc bằng số dư hiện tại.</p>
            </div>
          </div>

          <div class="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div class="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-slate-950">Lịch sử giao dịch</h2>
                <p class="mt-1 text-sm text-slate-500">Theo dõi Star/Coin được cộng hoặc đã sử dụng.</p>
              </div>
              <span class="text-sm font-semibold text-slate-500">{{ transactions.length }} giao dịch</span>
            </div>
            <a-table :columns="columns" :data-source="transactions" row-key="id" :pagination="{ pageSize: 10 }" :scroll="{ x: 760 }">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'type'">
                  <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">{{ record.type }}</span>
                </template>
                <template v-else-if="column.key === 'amount'">
                  <span class="font-semibold" :class="Number(record.amount) < 0 ? 'text-red-600' : 'text-emerald-700'">
                    {{ Number(record.amount) > 0 ? '+' : '' }}{{ numberText(record.amount) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'source'">
                  <span class="capitalize text-slate-700">{{ sourceLabel(record.source) }}</span>
                </template>
                <template v-else-if="column.key === 'created_at'">
                  <span class="text-slate-500">{{ formatDateTime(record.created_at) }}</span>
                </template>
              </template>
            </a-table>
          </div>
        </a-spin>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questApi } from '~/features/quests/services/quest.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const wallet = ref(null)
const transactions = ref([])
const loading = ref(false)
const converting = ref(false)
const starsToConvert = ref(10)
const canConvert = computed(() => Number(starsToConvert.value || 0) > 0 && Number(starsToConvert.value || 0) <= Number(wallet.value?.stars || 0))

const columns = [
  { title: 'Loại', key: 'type', dataIndex: 'type', width: 110 },
  { title: 'Số lượng', key: 'amount', dataIndex: 'amount', width: 130 },
  { title: 'Nguồn', dataIndex: 'source', key: 'source', width: 180 },
  { title: 'Thời gian', dataIndex: 'created_at', key: 'created_at', width: 220 }
]

async function fetchWallet() {
  loading.value = true
  try {
    const { data } = await questApi.wallet()
    wallet.value = data.wallet
    transactions.value = data.transactions || []
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load wallet') })
  } finally {
    loading.value = false
  }
}

async function convert() {
  if (!canConvert.value) {
    notification.warning({ message: 'Số Star không hợp lệ.' })
    return
  }
  converting.value = true
  try {
    await questApi.convertStars(starsToConvert.value)
    notification.success({ message: 'Đổi Coin thành công' })
    await fetchWallet()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to convert') })
  } finally {
    converting.value = false
  }
}

function numberText(value) {
  return Number(value || 0).toLocaleString()
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }
  const [date, time = ''] = String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

function sourceLabel(source) {
  return {
    participation: 'Duyệt ảnh',
    shortlist: 'Shortlist',
    winner: 'Winner',
    convert: 'Đổi Star',
    redeem: 'Redeem Store',
    manual: 'Manual'
  }[source] || source || '—'
}

onMounted(fetchWallet)
</script>

<style scoped>
.wallet-primary-btn,
.wallet-outline-btn {
  display: inline-flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 700;
}

.wallet-primary-btn {
  background: #0f172a;
  color: #ffffff;
}

.wallet-outline-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
}

.wallet-balance-card {
  min-height: 220px;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 16px 40px rgb(15 23 42 / 0.12);
}

.wallet-balance-card span {
  font-size: 14px;
  font-weight: 700;
  color: rgb(255 255 255 / 0.78);
}

.wallet-balance-card strong {
  margin-top: 42px;
  display: block;
  font-size: 52px;
  line-height: 1;
  letter-spacing: 0;
}

.wallet-balance-card p {
  margin-top: 16px;
  max-width: 260px;
  font-size: 14px;
  line-height: 1.6;
  color: rgb(255 255 255 / 0.72);
}
</style>
