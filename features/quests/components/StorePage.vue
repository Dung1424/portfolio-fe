<template>
  <main class="min-h-screen bg-slate-50">
    <section class="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1280px]">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Rewards store</p>
            <h1 class="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl font-[family-name:var(--font-portfolio-heading)]">Store</h1>
            <p class="mt-3 max-w-2xl text-base leading-7 text-slate-600">Dùng Coin để đổi boost, mã giảm giá hoặc quà vật lý.</p>
          </div>
          <NuxtLink to="/wallet" class="store-wallet-link">
            <i class="fa-solid fa-wallet" aria-hidden="true" />
            Wallet
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="px-4 py-8 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1280px]">
        <div class="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-950">Quà có thể đổi</h2>
            <p class="mt-1 text-sm text-slate-500">Kiểm tra Coin cần dùng và số lượng còn lại trước khi redeem.</p>
          </div>
          <a-button class="!h-10 !rounded-lg" :loading="loading" @click="fetchItems">
            <i class="fa-solid fa-rotate-right mr-2 text-xs" aria-hidden="true" />
            Refresh
          </a-button>
        </div>

        <a-spin :spinning="loading">
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <article
              v-for="item in items"
              :key="item.id"
              class="store-card"
            >
              <div class="flex items-start justify-between gap-3">
                <span class="store-type" :class="typeClass(item.type)">
                  <i :class="typeIcon(item.type)" aria-hidden="true" />
                  {{ typeLabel(item.type) }}
                </span>
                <span class="rounded-full px-3 py-1 text-xs font-bold" :class="item.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ item.stock > 0 ? `${item.stock} left` : 'Hết hàng' }}
                </span>
              </div>

              <div class="mt-6">
                <h2 class="line-clamp-2 text-xl font-semibold leading-snug text-slate-950">{{ item.name }}</h2>
                <div class="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <div class="text-xs font-bold uppercase tracking-wide text-slate-400">Giá đổi</div>
                    <div class="mt-1 text-2xl font-bold text-slate-950">{{ numberText(item.coin_cost) }} coin</div>
                  </div>
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <i :class="typeIcon(item.type)" aria-hidden="true" />
                  </div>
                </div>
              </div>

              <div class="mt-6 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                {{ itemHelpText(item.type) }}
              </div>

              <a-button
                type="primary"
                block
                size="large"
                class="mt-5 !h-11 !rounded-xl !font-semibold"
                :disabled="item.stock <= 0"
                :loading="redeemingId === item.id"
                @click="redeem(item)"
              >
                {{ item.stock > 0 ? 'Redeem' : 'Hết hàng' }}
              </a-button>
            </article>
          </div>
          <a-empty v-if="!loading && items.length === 0" description="Chưa có item trong store" class="rounded-2xl border border-dashed border-slate-200 bg-white py-14" />
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
  if (item.stock <= 0) {
    return
  }
  redeemingId.value = item.id
  try {
    await questApi.redeem(item.id)
    notification.success({ message: 'Đã tạo yêu cầu redeem' })
    await fetchItems()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to redeem') })
  } finally {
    redeemingId.value = null
  }
}

function numberText(value) {
  return Number(value || 0).toLocaleString()
}

function typeLabel(type) {
  return {
    in_app: 'In-app',
    discount: 'Discount',
    physical: 'Physical'
  }[type] || type
}

function typeIcon(type) {
  return {
    in_app: 'fa-solid fa-bolt',
    discount: 'fa-solid fa-ticket',
    physical: 'fa-solid fa-gift'
  }[type] || 'fa-solid fa-box'
}

function typeClass(type) {
  return {
    in_app: 'bg-blue-50 text-blue-700',
    discount: 'bg-amber-50 text-amber-700',
    physical: 'bg-emerald-50 text-emerald-700'
  }[type] || 'bg-slate-100 text-slate-600'
}

function itemHelpText(type) {
  return {
    in_app: 'Tác dụng trực tiếp trong app sau khi yêu cầu được xử lý.',
    discount: 'Mã giảm giá sẽ được gửi sau khi redemption hoàn tất.',
    physical: 'Quà vật lý cần admin xác nhận và xử lý giao nhận.'
  }[type] || 'Item sẽ được xử lý sau khi bạn redeem.'
}

onMounted(fetchItems)
</script>

<style scoped>
.store-wallet-link {
  display: inline-flex;
  width: fit-content;
  height: 44px;
  align-items: center;
  gap: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  background: #ffffff;
  padding: 0 18px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  transition: border-color 0.15s ease;
}

.store-wallet-link:hover {
  border-color: #64748b;
  color: #0f172a;
}

.store-card {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.store-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 16px 40px rgb(15 23 42 / 0.10);
  transform: translateY(-2px);
}

.store-type {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
}
</style>
