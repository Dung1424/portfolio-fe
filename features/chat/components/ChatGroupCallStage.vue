<script setup>
import ChatLiveKitParticipantTile from '~/features/chat/components/ChatLiveKitParticipantTile.vue'

defineProps({
  session: { type: Object, default: null },
  state: { type: String, default: 'idle' },
  tiles: { type: Array, default: () => [] },
  durationLabel: { type: String, default: '00:00' },
  micEnabled: { type: Boolean, default: true },
  cameraEnabled: { type: Boolean, default: true },
})

const emit = defineEmits(['toggle-mic', 'toggle-camera', 'leave', 'end'])
</script>

<template>
  <div class="fixed inset-0 z-40 flex flex-col bg-zinc-950 text-white">
    <header class="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
      <div class="min-w-0">
        <p class="truncate text-[17px] font-semibold">
          {{ session?.callType === 'audio' ? 'Cuộc gọi thoại nhóm' : 'Cuộc gọi video nhóm' }}
        </p>
        <p class="mt-0.5 text-[12px] text-zinc-400">
          {{ state }} · {{ durationLabel }}
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg px-3 py-2 text-[13px] font-semibold text-zinc-200 transition hover:bg-white/10"
        @click="emit('leave')"
      >
        Rời
      </button>
    </header>

    <main class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5">
      <div
        class="grid h-full min-h-[360px] gap-3"
        :class="tiles.length <= 1 ? 'grid-cols-1' : tiles.length <= 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'"
      >
        <ChatLiveKitParticipantTile
          v-for="tile in tiles"
          :key="`${tile.identity}-${tile.isLocal ? 'local' : 'remote'}`"
          :tile="tile"
        />
        <div
          v-if="tiles.length === 0"
          class="flex items-center justify-center rounded-lg bg-zinc-900 text-[14px] text-zinc-400 ring-1 ring-white/10"
        >
          Đang kết nối LiveKit…
        </div>
      </div>
    </main>

    <footer class="shrink-0 border-t border-white/10 px-4 py-4">
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          :aria-label="micEnabled ? 'Tắt mic' : 'Bật mic'"
          @click="emit('toggle-mic')"
        >
          <i :class="micEnabled ? 'fa-solid fa-microphone' : 'fa-solid fa-microphone-slash'" />
        </button>
        <button
          v-if="session?.callType !== 'audio'"
          type="button"
          class="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          :aria-label="cameraEnabled ? 'Tắt camera' : 'Bật camera'"
          @click="emit('toggle-camera')"
        >
          <i :class="cameraEnabled ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'" />
        </button>
        <button
          type="button"
          class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:bg-rose-600"
          aria-label="Rời cuộc gọi"
          @click="emit('end')"
        >
          <i class="fa-solid fa-phone-slash" />
        </button>
      </div>
    </footer>
  </div>
</template>
