<template>
  <main class="min-h-screen bg-white">
    <section class="border-b border-zinc-100 bg-white px-4 py-10 sm:py-14">
      <div class="mx-auto flex max-w-[1500px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-2xl">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Photo challenges</p>
          <h1 class="mt-3 text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl font-[family-name:var(--font-portfolio-heading)]">
            Quests
          </h1>
          <p class="mt-3 text-base leading-7 text-zinc-600">
            Submit your best work, get reviewed, make the shortlist, and earn stars or coins from ranked rewards.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <NuxtLink to="/wallet" class="inline-flex h-11 items-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400">
            Wallet
          </NuxtLink>
          <NuxtLink to="/store" class="inline-flex h-11 items-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800">
            Store
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="px-3 py-6 sm:px-5 lg:px-8">
      <div class="mx-auto max-w-[1500px]">
        <a-spin :spinning="loading">
          <div class="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [column-fill:_balance]">
            <article
              v-for="(quest, index) in quests"
              :key="quest.id"
              class="mb-4 break-inside-avoid"
            >
              <NuxtLink
                :to="`/quests/${quest.id}`"
                class="group block overflow-hidden rounded-xl bg-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]"
              >
                <div
                  class="relative overflow-hidden"
                  :class="questAspectClass(index)"
                >
                  <div class="absolute inset-0" :class="questVisualClass(index)" />
                  <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.20),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.78))]" />
                  <div class="absolute left-4 top-4 flex flex-wrap gap-2">
                    <span class="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-zinc-900 shadow-sm">
                      {{ quest.status }}
                    </span>
                    <span class="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                      {{ formatReward(quest.reward_config) }}
                    </span>
                  </div>
                  <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                    <h2 class="line-clamp-2 text-xl font-semibold leading-tight drop-shadow-sm">
                      {{ quest.title }}
                    </h2>
                    <p class="mt-2 line-clamp-2 text-sm leading-6 text-white/82">
                      {{ quest.description || quest.brief || 'Open for submissions' }}
                    </p>
                    <div class="mt-4 flex items-center justify-between gap-3 text-xs font-medium text-white/80">
                      <span>{{ formatDate(quest.start_at) }}</span>
                      <span>{{ quest.max_submissions_per_user || 1 }} max</span>
                    </div>
                  </div>
                </div>
              </NuxtLink>
            </article>
          </div>
          <a-empty v-if="!loading && quests.length === 0" description="No open quests" />
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

const quests = ref([])
const loading = ref(false)
const visualClasses = [
  'bg-[linear-gradient(135deg,#0f172a_0%,#334155_48%,#e2e8f0_100%)]',
  'bg-[linear-gradient(135deg,#111827_0%,#365314_52%,#d9f99d_100%)]',
  'bg-[linear-gradient(135deg,#18181b_0%,#7f1d1d_52%,#fecaca_100%)]',
  'bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_52%,#bfdbfe_100%)]'
]
const aspectClasses = ['aspect-[4/5]', 'aspect-[3/4]', 'aspect-[4/3]', 'aspect-[5/6]']

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

function formatDate(value) {
  return value ? String(value).replace('T', ' ').slice(0, 10) : 'Any time'
}

function formatReward(config) {
  const top = config?.ranks?.[0]?.rewards
  if (!top) {
    return 'Rewards'
  }
  return `${top.coin || 0} coin + ${top.star || 0} star`
}

function questVisualClass(index) {
  return visualClasses[index % visualClasses.length]
}

function questAspectClass(index) {
  return aspectClasses[index % aspectClasses.length]
}

onMounted(fetchQuests)
</script>
