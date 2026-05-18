<template>
  <main class="min-h-screen bg-white">
    <section class="border-b border-zinc-100 px-4 py-10 sm:px-6 lg:px-8">
      <div class="mx-auto flex max-w-[1500px] flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Rewards store</p>
          <h1 class="mt-3 text-4xl font-bold tracking-tight text-zinc-950 font-[family-name:var(--font-portfolio-heading)]">Store</h1>
          <p class="mt-2 text-sm leading-6 text-zinc-600">Redeem coins for boosts, discounts, and physical rewards.</p>
        </div>
        <NuxtLink to="/wallet" class="inline-flex h-11 w-fit items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400">
          Wallet
        </NuxtLink>
      </div>
    </section>
    <section class="px-3 py-6 sm:px-5 lg:px-8">
      <div class="mx-auto max-w-[1500px]">
        <a-spin :spinning="loading">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="(item, index) in items"
              :key="item.id"
              class="group overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div class="relative aspect-[4/3] overflow-hidden" :class="storeVisualClass(index)">
                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div class="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-zinc-950">
                  {{ item.type }}
                </div>
                <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                  <h2 class="line-clamp-2 text-xl font-semibold">{{ item.name }}</h2>
                  <div class="mt-3 flex items-center justify-between text-sm font-medium text-white/85">
                    <span>{{ item.coin_cost }} coins</span>
                    <span>{{ item.stock }} left</span>
                  </div>
                </div>
              </div>
              <div class="p-4">
                <a-button
                  type="primary"
                  block
                  size="large"
                  class="!h-11 !rounded-full !font-semibold"
                  :disabled="item.stock <= 0"
                  :loading="redeemingId === item.id"
                  @click="redeem(item)"
                >
                  Redeem
                </a-button>
              </div>
            </article>
          </div>
          <a-empty v-if="!loading && items.length === 0" description="No store items" />
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

const items = ref([])
const loading = ref(false)
const redeemingId = ref(null)
const storeVisuals = [
  'bg-[linear-gradient(135deg,#18181b_0%,#3f3f46_55%,#e4e4e7_100%)]',
  'bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#dbeafe_100%)]',
  'bg-[linear-gradient(135deg,#111827_0%,#047857_55%,#d1fae5_100%)]',
  'bg-[linear-gradient(135deg,#1c1917_0%,#9a3412_55%,#fed7aa_100%)]'
]

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await questApi.storeItems()
    items.value = data.items?.data || []
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load store') })
  } finally {
    loading.value = false
  }
}

async function redeem(item) {
  redeemingId.value = item.id
  try {
    await questApi.redeem(item.id)
    notification.success({ message: 'Redemption created' })
    await fetchItems()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to redeem') })
  } finally {
    redeemingId.value = null
  }
}

function storeVisualClass(index) {
  return storeVisuals[index % storeVisuals.length]
}

onMounted(fetchItems)
</script>
