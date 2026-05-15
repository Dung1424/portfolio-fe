<script setup>
import { ref } from 'vue'

/**
 * @typedef {Record<string, (...args: any[]) => any>} MessageListApi
 */

defineProps({
  rows: { type: Array, required: true },
  /** Cuộc trò chuyện đang mở (avatar, receipts). */
  peer: { type: Object, required: true },
  highlightedMessageId: { type: [String, null], default: null },
  messagesLoading: { type: Boolean, default: false },
  loadingOlderMessages: { type: Boolean, default: false },
  showJumpToLatest: { type: Boolean, default: false },
  defaultAvatarUrl: { type: String, required: true },
  /** Hàm UI dùng trong list tin (từ ChatPage). */
  api: { type: Object, required: true },
})

const emit = defineEmits(['jump-to-latest', 'scroll'])

const scrollRoot = ref(null)

defineExpose({ scrollRoot })
</script>

<template>
  <div
    ref="scrollRoot"
    class="chat-messages-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
    @scroll.passive="emit('scroll', $event)"
  >
    <button
      v-if="showJumpToLatest"
      type="button"
      class="fixed bottom-24 right-4 z-[35] inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-lg transition hover:bg-[#166fe5] active:scale-[0.96] md:bottom-24 md:right-6"
      aria-label="Quay lại tin nhắn mới"
      @click="emit('jump-to-latest')"
    >
      <i class="fa-solid fa-chevron-down text-[13px]" />
    </button>
    <p
      v-if="messagesLoading"
      class="absolute left-1/2 top-3 z-[1] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-zinc-500 shadow-sm"
    >
      Loading messages…
    </p>
    <div
      v-if="loadingOlderMessages"
      class="flex shrink-0 flex-col items-center pb-2 pt-0.5"
      aria-live="polite"
      aria-busy="true"
    >
      <div class="flex items-center gap-2 text-[12px] text-zinc-500">
        <i class="fa-solid fa-spinner fa-spin text-[13px] text-[#1877f2]" aria-hidden="true" />
        <span>Loading earlier messages…</span>
      </div>
    </div>
    <div class="flex w-full flex-col">
      <template v-for="row in rows" :key="row.msg.id">
        <div
          v-if="peer.isGroup && !row.msg.me && row.groupFirst && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))"
          class="w-full max-w-[85%] truncate pr-2 pl-[38px] text-left text-[13px] font-semibold text-zinc-600 sm:max-w-[70%]"
          :class="row.index > 0 ? 'mt-3' : ''"
        >
          {{ api.groupMessageSender(row.msg).name }}
        </div>
        <div
          class="flex gap-2.5"
          :data-message-id="row.msg.id"
          :class="[
            api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)
              ? 'w-full justify-center'
              : row.msg.me
                ? 'justify-end'
                : 'justify-start',
            peer.isGroup && !row.msg.me && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))
              ? (row.groupFirst ? (row.index > 0 ? 'mt-0.5' : 'mt-0') : 'mt-0.5')
              : (row.groupFirst && row.index > 0 ? 'mt-3' : row.groupFirst ? '' : 'mt-0.5'),
            !row.msg.me && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)) ? 'items-center' : '',
            highlightedMessageId === String(row.msg.id) ? 'rounded-2xl ring-2 ring-[#1877f2]/35 ring-offset-2 ring-offset-[#f0f2f5]' : ''
          ]"
        >
        <img
          v-if="
            !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))
              && !row.msg.me
              && row.groupLast
              && !api.isAvatarBroken(peer.isGroup ? api.incomingAvatarKey(row.msg) : peer.id)
          "
          :src="
            peer.isGroup
              ? (api.groupMessageSender(row.msg).avatarUrl || defaultAvatarUrl)
              : (peer.peerAvatarUrl || defaultAvatarUrl)
          "
          alt=""
          width="28"
          height="28"
          class="h-7 w-7 shrink-0 rounded-full object-cover"
          loading="lazy"
          decoding="async"
          role="button"
          tabindex="0"
          aria-label="Open profile"
          @click.stop.prevent="
            peer.isGroup
              ? api.openIncomingSenderProfile(row.msg)
              : api.openPeerProfile(peer)
          "
          @keydown.enter.stop.prevent="
            peer.isGroup
              ? api.openIncomingSenderProfile(row.msg)
              : api.openPeerProfile(peer)
          "
        >
        <div
          v-else-if="!(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)) && !row.msg.me && row.groupLast"
          class="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[10px] font-bold text-white"
          :class="api.fallbackClass(peer.isGroup ? api.incomingAvatarKey(row.msg) : peer.id)"
          role="button"
          tabindex="0"
          aria-label="Open profile"
          @click.stop.prevent="
            peer.isGroup
              ? api.openIncomingSenderProfile(row.msg)
              : api.openPeerProfile(peer)
          "
          @keydown.enter.stop.prevent="
            peer.isGroup
              ? api.openIncomingSenderProfile(row.msg)
              : api.openPeerProfile(peer)
          "
        >
          {{
            peer.isGroup
              ? api.initials(api.groupMessageSender(row.msg).name).slice(0, 1)
              : api.initials(peer.name).slice(0, 1)
          }}
        </div>
        <div
          v-else-if="!(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)) && !row.msg.me"
          class="w-7 shrink-0"
          aria-hidden="true"
        />
        <div
          class="max-w-[85%] sm:max-w-[70%]"
          :class="[
            api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)
              ? 'w-full max-w-full shrink-0 sm:max-w-full flex flex-col items-center'
              : row.msg.me
                ? 'flex flex-col items-end'
                : '',
          ]"
        >
          <div class="relative group/message">
            <div
              v-if="!api.isSystemMessage(row.msg)"
              class="absolute top-1 z-10 flex items-center gap-1 transition-opacity"
              :class="[
                row.msg.me ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]',
                api.shouldShowMessageActions(row.msg)
                  ? 'opacity-100 pointer-events-auto'
                  : 'opacity-0 pointer-events-none'
              ]"
              @mouseenter="api.onMessageActionHoverEnter(row.msg.id)"
              @mouseleave="api.onMessageActionHoverLeave(row.msg.id)"
            >
              <button
                v-if="!row.msg.recalledAt"
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-[#1877f2]"
                aria-label="Reply"
                @click.stop="api.startReplyToMessage(row.msg)"
              >
                <i class="fa-solid fa-reply text-[12px]" />
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-[#1877f2]"
                aria-label="Copy"
                @click.stop="api.copyMessageToClipboard(row.msg)"
              >
                <i class="fa-regular fa-copy text-[12px]" />
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-zinc-700"
                aria-label="More actions"
                @click.stop="api.toggleMessageActionMenu(row.msg.id)"
              >
                <i class="fa-solid fa-ellipsis text-[12px]" />
              </button>
              <div
                v-if="api.isMessageActionMenuOpen(row.msg.id)"
                class="absolute top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] text-zinc-700 shadow-xl"
                :class="row.msg.me ? 'right-0' : 'left-0'"
                @click.stop
              >
                <button
                  v-if="!row.msg.recalledAt && !api.isPinnedMessageId(row.msg.id) && api.canPinAnotherMessage()"
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                  @click="api.pinMessageRow(row.msg)"
                >
                  <i class="fa-solid fa-thumbtack text-[12px]" />
                  <span>Pin</span>
                </button>
                <button
                  v-if="!row.msg.recalledAt && api.isPinnedMessageId(row.msg.id)"
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                  @click="api.unpinMessageRow(row.msg)"
                >
                  <i class="fa-solid fa-thumbtack rotate-45 text-[12px] text-zinc-500" />
                  <span>Unpin</span>
                </button>
                <button
                  v-if="row.msg.me && !row.msg.recalledAt"
                  type="button"
                  class="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50"
                  @click="api.recallMessageForEveryone(row.msg)"
                >
                  <i class="fa-solid fa-trash-can text-[12px]" />
                  <span>Recall</span>
                </button>
              </div>
            </div>
            <div
              v-if="api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)"
              class="w-full px-2 py-1.5 sm:px-3"
            >
              <p
                class="mx-auto max-w-md whitespace-pre-wrap break-words text-center text-[12px] font-normal leading-snug text-zinc-500"
              >
                {{
                  row.msg.metadata?.kind === 'group_event'
                    ? api.groupEventLineText(row.msg)
                    : row.msg.text
                }}
              </p>
            </div>
            <div
              v-else
              class="px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              :class="
                api.isCallLogMessage(row.msg)
                  ? ['overflow-hidden rounded-[14px] border px-0 py-0 shadow-sm', row.msg.me ? 'border-[#9bdcf0] bg-[#c9f4ff] text-zinc-900' : 'border-zinc-200 bg-white text-zinc-900']
                  : row.msg.isSticker
                    ? [
                        'bg-transparent px-0 py-0 shadow-none'
                      ]
                    : row.msg.me
                      ? [
                          row.groupLast ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px]',
                          'bg-[#1877f2] text-white cursor-pointer active:opacity-95'
                        ]
                      : [
                          row.groupLast ? 'rounded-[18px] rounded-bl-[4px]' : 'rounded-[18px]',
                          'border border-zinc-200/80 bg-white text-zinc-800'
                        ]
              "
              @click.stop="row.msg.me && !api.isSystemMessage(row.msg) && api.toggleOutgoingReceiptDetail(row.msg.id)"
              @mouseenter="!api.isSystemMessage(row.msg) && api.onMessageActionHoverEnter(row.msg.id)"
              @mouseleave="!api.isSystemMessage(row.msg) && api.onMessageActionHoverLeave(row.msg.id)"
            >
              <div
                v-if="api.isCallLogMessage(row.msg)"
                class="w-[220px] max-w-full"
              >
                <div class="px-4 py-3">
                  <p class="text-[15px] font-bold leading-snug">
                    {{ api.callLogCardTitle(row.msg.metadata, row.msg.me) }}
                  </p>
                  <p class="mt-1 flex items-center gap-2 text-[14px] text-zinc-600">
                    <i :class="api.callLogIcon(row.msg.metadata)" />
                    <span>{{ api.callLogDuration(row.msg.metadata) || api.callLogTitle(row.msg.metadata) }}</span>
                  </p>
                </div>
                <button
                  type="button"
                  class="block w-full border-t border-black/10 px-4 py-2.5 text-center text-[14px] font-bold uppercase text-[#078bdc] transition hover:bg-white/35"
                >
                  Gọi lại
                </button>
              </div>
              <p
                v-else-if="row.msg.recalledAt"
                class="text-[14px] italic text-white/85"
                :class="row.msg.me ? '' : 'text-zinc-500'"
              >
                This message was recalled
              </p>
              <button
                v-else-if="row.msg.replyPreview && row.msg.replyToMessageId"
                type="button"
                class="mb-2 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-left text-[13px] leading-snug text-white/90"
                :class="row.msg.me ? '' : 'border-zinc-200 bg-zinc-50 text-zinc-600'"
                @click.stop="api.jumpToOriginalMessage(row.msg.replyToMessageId)"
              >
                <p class="truncate font-semibold">
                  Reply
                </p>
                <p class="mt-0.5 line-clamp-2">
                  {{ row.msg.replyPreview.text || '[Attachment]' }}
                </p>
              </button>
              <img
                v-if="!row.msg.recalledAt && row.msg.isSticker && row.msg.stickerUrl"
                :src="row.msg.stickerUrl"
                alt="sticker"
                class="h-auto w-full max-w-[180px] object-contain"
                loading="lazy"
                decoding="async"
              >
              <img
                v-if="!row.msg.recalledAt && row.msg.imageUrl"
                :src="row.msg.imageUrl"
                alt=""
                class="max-h-64 w-full max-w-[280px] rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              >
              <p
                v-if="!row.msg.recalledAt && !api.isCallLogMessage(row.msg) && row.msg.text && !row.msg.isSticker"
                class="whitespace-pre-wrap break-words"
                :class="row.msg.imageUrl ? 'mt-2' : ''"
              >
                {{ row.msg.text }}
              </p>
            </div>
          </div>
          <p
            v-if="row.showMeta && api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg)"
            class="mt-1 flex flex-wrap items-center justify-center gap-x-1.5 px-1.5 text-center text-[11px] text-zinc-400"
          >
            <span>{{ api.timeLabel(row.msg.at) }}</span>
          </p>
          <p
            v-else-if="row.showMeta && row.msg.me"
            class="mt-1 flex flex-wrap items-center justify-end gap-x-1.5 px-1.5 text-right text-[11px] text-zinc-400"
          >
            <span>{{ api.timeLabel(row.msg.at) }}</span>
            <span
              v-if="
                !peer.isGroup
                  && api.shouldShowOutgoingReceipt(peer.messages, row.msg.id, peer)
                  && api.receiptLabel(peer, row.msg.id)
              "
            >· {{ api.receiptLabel(peer, row.msg.id) }}</span>
          </p>
          <div
            v-if="
              row.showMeta
                && row.msg.me
                && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))
                && peer.isGroup
                && api.groupSeenDisplay(row.msg).length
            "
            class="mt-1 flex justify-end pr-1"
          >
            <div
              class="flex flex-row-reverse items-center pl-2"
              aria-label="Đã xem bởi"
            >
              <div
                v-for="(s, si) in api.groupSeenDisplay(row.msg)"
                :key="s.id"
                class="relative h-6 w-6 shrink-0 rounded-full border-2 border-[#f0f2f5] bg-zinc-200"
                :style="{ marginRight: si > 0 ? '-8px' : '0' }"
              >
                <img
                  v-if="s.url"
                  :src="s.url"
                  alt=""
                  class="h-full w-full rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                >
                <span
                  v-else
                  class="flex h-full w-full items-center justify-center text-[9px] font-bold text-white"
                  :class="api.fallbackClass(s.id)"
                >{{ s.initials.slice(0, 2) }}</span>
              </div>
            </div>
          </div>
        </div>
        </div>
        <p
          v-if="row.showMeta && !row.msg.me && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))"
          class="mt-1 pl-[38px] pr-2 text-[11px] text-zinc-400"
        >
          <span>{{ api.timeLabel(row.msg.at) }}</span>
        </p>
        <div
          v-if="
            row.showMeta
              && !row.msg.me
              && !(api.isSystemMessage(row.msg) && !api.isCallLogMessage(row.msg))
              && peer.isGroup
              && api.groupSeenDisplay(row.msg).length
          "
          class="mt-0.5 flex w-full justify-end pr-1"
        >
          <div
            class="flex flex-row-reverse items-center pl-2"
            aria-label="Đã xem bởi"
          >
            <div
              v-for="(s, si) in api.groupSeenDisplay(row.msg)"
              :key="s.id"
              class="relative h-6 w-6 shrink-0 rounded-full border-2 border-[#f0f2f5] bg-zinc-200"
              :style="{ marginRight: si > 0 ? '-8px' : '0' }"
            >
              <img
                v-if="s.url"
                :src="s.url"
                alt=""
                class="h-full w-full rounded-full object-cover"
                loading="lazy"
                decoding="async"
              >
              <span
                v-else
                class="flex h-full w-full items-center justify-center text-[9px] font-bold text-white"
                :class="api.fallbackClass(s.id)"
              >{{ s.initials.slice(0, 2) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
