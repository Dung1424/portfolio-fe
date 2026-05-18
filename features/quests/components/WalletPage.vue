<template>
  <main class="min-h-screen bg-white">
    <section class="border-b border-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-[1200px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Rewards</p>
          <h1 class="mt-3 text-4xl font-bold tracking-tight text-zinc-950 font-[family-name:var(--font-portfolio-heading)]">Wallet</h1>
          <p class="mt-2 text-sm leading-6 text-zinc-600">Stars come from quest progress. Coins can be redeemed in the store.</p>
        </div>
        <NuxtLink to="/store" class="inline-flex h-11 w-fit items-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800">
          Store
        </NuxtLink>
      </div>
    </section>
    <section class="px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1200px]">
        <a-spin :spinning="loading">
          <div class="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="rounded-2xl bg-zinc-950 p-6 text-white">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white/65">Stars</span>
                  <i class="fa-solid fa-star text-white/70" aria-hidden="true" />
                </div>
                <div class="mt-8 text-5xl font-bold tracking-tight">{{ wallet?.stars || 0 }}</div>
              </div>
              <div class="rounded-2xl bg-[#1877f2] p-6 text-white">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-white/75">Coins</span>
                  <i class="fa-solid fa-coins text-white/75" aria-hidden="true" />
                </div>
                <div class="mt-8 text-5xl font-bold tracking-tight">{{ wallet?.coins || 0 }}</div>
              </div>
            </div>
            <div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 class="text-lg font-semibold text-zinc-950">Convert stars</h2>
              <p class="mt-1 text-sm text-zinc-500">Current rate: 1 star = 10 coins.</p>
              <a-input-number v-model:value="starsToConvert" :min="1" class="!mt-5 !w-full" size="large" />
              <a-button type="primary" block size="large" class="mt-3 !h-11 !rounded-full !font-semibold" :loading="converting" @click="convert">
                Convert
              </a-button>
            </div>
          </div>

          <div class="mt-8 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div class="border-b border-zinc-100 px-5 py-4">
              <h2 class="text-lg font-semibold text-zinc-950">Transactions</h2>
            </div>
            <a-table :columns="columns" :data-source="transactions" row-key="id" :pagination="false" :scroll="{ x: 760 }">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'amount'">
                  <span class="font-semibold" :class="Number(record.amount) < 0 ? 'text-red-600' : 'text-green-700'">{{ record.amount }}</span>
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
import { onMounted, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questApi } from '~/features/quests/services/quest.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const wallet = ref(null)
const transactions = ref([])
const loading = ref(false)
const converting = ref(false)
const starsToConvert = ref(10)
const columns = [
  { title: 'Type', dataIndex: 'type', key: 'type', width: 100 },
  { title: 'Amount', key: 'amount', dataIndex: 'amount', width: 120 },
  { title: 'Source', dataIndex: 'source', key: 'source', width: 160 },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 220 }
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
  converting.value = true
  try {
    await questApi.convertStars(starsToConvert.value)
    notification.success({ message: 'Converted successfully' })
    await fetchWallet()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to convert') })
  } finally {
    converting.value = false
  }
}

onMounted(fetchWallet)
</script>
