<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  conversation: { type: Object, default: null },
  /** { userId, name, username, avatarUrl, initials, isAdmin, hasLeft, removedByAdmin, isSelf }[] */
  memberRows: { type: Array, default: () => [] },
  myUserId: { type: [String, null], default: null },
  defaultAvatarUrl: { type: String, required: true },
  /** Thêm thành viên — { id, name, username, avatarUrl }[] */
  addMemberCandidates: { type: Array, default: () => [] },
  addMembersLoading: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:open',
  'save-name',
  'pick-avatar-file',
  'leave',
  'dissolve',
  'transfer',
  'add-members',
  'remove-member',
  'open-user',
])

const editName = ref('')

watch(
  () => props.open,
  (v) => {
    if (v && props.conversation?.name) {
      editName.value = String(props.conversation.name)
    }
    if (!v) {
      transferTarget.value = null
      addOpen.value = false
      addSelected.value = []
    }
  },
)

const isAdmin = computed(() =>
  props.conversation?.adminUserId != null
  && String(props.conversation.adminUserId) === String(props.myUserId),
)

const canInteract = computed(() =>
  props.conversation
  && !props.conversation.viewerHasLeft
  && props.conversation.canSendMessages !== false,
)

const activeMemberCount = computed(() =>
  props.memberRows.filter(m => !m.hasLeft).length,
)

const transferOptions = computed(() => {
  const my = props.myUserId != null ? String(props.myUserId) : ''
  return props.memberRows
    .filter(m => !m.hasLeft && String(m.userId) !== my)
    .map(m => ({
      value: m.userId,
      label: m.isSelf ? `${m.name} (bạn)` : m.name,
    }))
})

const transferTarget = ref(null)
const addOpen = ref(false)
const addSelected = ref([])

watch(addOpen, (v) => {
  if (v) {
    addSelected.value = []
  }
})

function onClose() {
  emit('update:open', false)
}

const fileInputRef = ref(null)
function triggerAvatarPick() {
  if (!isAdmin.value || !canInteract.value) {
    return
  }
  fileInputRef.value?.click()
}

function onAvatarChange(e) {
  const f = e.target?.files?.[0]
  e.target.value = ''
  if (f) {
    emit('pick-avatar-file', f)
  }
}

function saveName() {
  const n = editName.value.trim()
  if (!n) {
    return
  }
  emit('save-name', n)
}

function toggleAdd(id) {
  const s = String(id)
  const cur = addSelected.value.map(String)
  const i = cur.indexOf(s)
  addSelected.value = i >= 0 ? cur.filter(x => x !== s) : [...cur, s]
}

function submitAddMembers() {
  if (!addSelected.value.length) {
    return
  }
  emit('add-members', [...addSelected.value.map(String)])
}

defineExpose({
  closeAddMembersModal() {
    addOpen.value = false
    addSelected.value = []
  },
})

function confirmTransfer() {
  const t = transferTarget.value != null ? String(transferTarget.value) : ''
  if (!t) {
    return
  }
  emit('transfer', t)
  transferTarget.value = null
}

function heroAvatarSrc() {
  const c = props.conversation
  if (!c) {
    return props.defaultAvatarUrl
  }
  return c.groupAvatarUrl || c.peerAvatarUrl || props.defaultAvatarUrl
}
</script>

<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="Math.min(400, typeof window !== 'undefined' ? window.innerWidth : 400)"
    :closable="false"
    root-class-name="chat-group-details-drawer"
    @close="onClose"
  >
    <template #title>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
          aria-label="Đóng"
          @click="onClose"
        >
          <i class="fa-solid fa-arrow-left text-[16px]" />
        </button>
        <span class="text-[16px] font-semibold text-zinc-900">Thông tin nhóm</span>
      </div>
    </template>

    <div v-if="conversation" class="space-y-5 pb-6">
      <p
        v-if="loading"
        class="text-center text-[13px] text-zinc-500"
      >
        Đang tải…
      </p>

      <!-- Ảnh + tên -->
      <div class="flex flex-col items-center px-1 text-center">
        <button
          type="button"
          class="relative rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#1877f2] disabled:cursor-default"
          :disabled="!isAdmin || !canInteract"
          @click="triggerAvatarPick"
        >
          <img
            :src="heroAvatarSrc()"
            alt=""
            width="96"
            height="96"
            class="h-24 w-24 rounded-full object-cover ring-2 ring-zinc-200/80 shadow-md"
          >
          <span
            v-if="isAdmin && canInteract"
            class="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-zinc-200"
          >
            <i class="fa-solid fa-camera text-[12px] text-zinc-600" />
          </span>
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="hidden"
          @change="onAvatarChange"
        >

        <div v-if="isAdmin && canInteract" class="mt-4 w-full max-w-[280px]">
          <a-input
            v-model:value="editName"
            size="large"
            placeholder="Tên nhóm"
            class="text-center"
          />
          <button
            type="button"
            class="mt-2 text-[13px] font-semibold text-[#1877f2] hover:underline"
            @click="saveName"
          >
            Lưu tên nhóm
          </button>
        </div>
        <h2
          v-else
          class="mt-4 text-[18px] font-semibold leading-tight text-zinc-900"
        >
          {{ conversation.name }}
        </h2>
        <p class="mt-1.5 text-[13px] text-zinc-500">
          {{ activeMemberCount }} thành viên
          <template v-if="isAdmin">
            · Bạn là quản trị viên
          </template>
        </p>
      </div>

      <!-- Thành viên -->
      <div>
        <h3 class="mb-2 px-0.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          Thành viên
        </h3>
        <ul class="max-h-[220px] overflow-y-auto rounded-xl border border-zinc-200/90 bg-white shadow-sm">
          <li
            v-for="row in memberRows"
            :key="row.userId"
            class="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-2.5 transition last:border-0 hover:bg-zinc-50"
            :class="row.hasLeft ? 'opacity-55' : ''"
            role="button"
            tabindex="0"
            @click="emit('open-user', row.userId)"
            @keydown.enter="emit('open-user', row.userId)"
          >
            <img
              v-if="row.avatarUrl"
              :src="row.avatarUrl"
              alt=""
              class="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80"
            >
            <div
              v-else
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-[11px] font-bold text-white"
            >
              {{ row.initials }}
            </div>
            <div class="min-w-0 flex-1 text-left">
              <p class="truncate text-[14px] font-semibold text-zinc-900">
                {{ row.name }}
                <span v-if="row.isSelf" class="font-normal text-zinc-400"> (bạn)</span>
              </p>
              <p
                v-if="row.username"
                class="truncate text-[12px] text-zinc-500"
              >
                @{{ row.username }}
              </p>
            </div>
            <span
              v-if="row.isAdmin"
              class="shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#1877f2]"
            >Admin</span>
            <button
              v-else-if="isAdmin && canInteract && !row.isSelf && !row.hasLeft"
              type="button"
              class="shrink-0 rounded-full p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Xóa khỏi nhóm"
              @click.stop="emit('remove-member', row.userId)"
            >
              <i class="fa-solid fa-user-minus text-[13px]" />
            </button>
            <span
              v-else-if="row.hasLeft && row.removedByAdmin"
              class="shrink-0 text-[11px] text-zinc-400"
            >Bị xóa</span>
            <span
              v-else-if="row.hasLeft"
              class="shrink-0 text-[11px] text-zinc-400"
            >Đã rời</span>
          </li>
        </ul>
      </div>

      <!-- Hành động admin -->
      <div v-if="isAdmin && canInteract" class="space-y-2">
        <button
          type="button"
          class="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-zinc-50"
          @click="addOpen = true"
        >
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2]/12 text-[#1877f2]">
            <i class="fa-solid fa-user-plus text-[15px]" />
          </span>
          <span class="text-[15px] font-semibold text-zinc-900">Thêm thành viên</span>
        </button>

        <div class="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4">
          <p class="mb-2 text-[12px] font-semibold text-zinc-600">
            Chuyển quyền quản trị
          </p>
          <a-select
            v-model:value="transferTarget"
            class="w-full"
            placeholder="Chọn thành viên"
            :options="transferOptions"
            allow-clear
          />
          <button
            type="button"
            class="mt-3 w-full rounded-lg bg-white py-2.5 text-[13px] font-semibold text-zinc-900 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-45"
            :disabled="!transferTarget"
            @click="confirmTransfer"
          >
            Chuyển quyền admin
          </button>
        </div>
      </div>

      <!-- Thành viên: rời nhóm -->
      <div
        v-if="canInteract && !isAdmin"
        class="border-t border-zinc-200 pt-4"
      >
        <button
          type="button"
          class="w-full rounded-xl py-3 text-[15px] font-semibold text-zinc-700 transition hover:bg-zinc-100"
          @click="emit('leave')"
        >
          Rời nhóm
        </button>
      </div>

      <!-- Admin: giải tán -->
      <div
        v-if="isAdmin && canInteract"
        class="border-t border-zinc-200 pt-4"
      >
        <button
          type="button"
          class="w-full rounded-xl py-3 text-[15px] font-semibold text-rose-600 transition hover:bg-rose-50"
          @click="emit('dissolve')"
        >
          Giải tán nhóm
        </button>
      </div>
    </div>

    <a-modal
      v-model:open="addOpen"
      title="Thêm thành viên"
      ok-text="Thêm"
      cancel-text="Hủy"
      :confirm-loading="addMembersLoading"
      :ok-button-props="{ disabled: addSelected.length === 0 }"
      destroy-on-close
      @ok="submitAddMembers"
    >
      <p class="mb-3 text-[13px] leading-snug text-zinc-500">
        Chỉ có thể thêm người mà bạn và họ follow lẫn nhau, và chưa tham gia nhóm.
      </p>
      <ul class="max-h-64 overflow-y-auto divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        <li
          v-for="row in addMemberCandidates"
          :key="row.id"
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <input
            type="checkbox"
            class="h-4 w-4 shrink-0 rounded border-zinc-300"
            :checked="addSelected.map(String).includes(String(row.id))"
            @change="toggleAdd(row.id)"
          >
          <img
            v-if="row.avatarUrl"
            :src="row.avatarUrl"
            alt=""
            class="h-9 w-9 shrink-0 rounded-full object-cover"
          >
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-semibold text-zinc-900">
              {{ row.name }}
            </p>
            <p
              v-if="row.username"
              class="truncate text-[12px] text-zinc-500"
            >
              @{{ row.username }}
            </p>
          </div>
        </li>
        <li
          v-if="!addMemberCandidates.length"
          class="px-3 py-10 text-center text-[13px] text-zinc-500"
        >
          Không còn người để thêm.
        </li>
      </ul>
    </a-modal>
  </a-drawer>
</template>
