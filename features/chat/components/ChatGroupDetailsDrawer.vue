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
const MAX_GROUP_MEMBERS = 10
const drawerWidth = computed(() => {
  if (typeof window === 'undefined') {
    return 400
  }
  return Math.min(400, window.innerWidth)
})

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

const addMemberSlotsRemaining = computed(() =>
  Math.max(0, MAX_GROUP_MEMBERS - activeMemberCount.value),
)

const inactiveMemberCount = computed(() =>
  props.memberRows.filter(m => m.hasLeft).length,
)

const groupCapacityPercent = computed(() =>
  Math.min(100, Math.round((activeMemberCount.value / MAX_GROUP_MEMBERS) * 100)),
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

const canAddMembers = computed(() =>
  isAdmin.value && canInteract.value && addMemberSlotsRemaining.value > 0,
)

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
  if (i >= 0) {
    addSelected.value = cur.filter(x => x !== s)
    return
  }
  if (cur.length >= addMemberSlotsRemaining.value) {
    return
  }
  addSelected.value = [...cur, s]
}

function submitAddMembers() {
  if (!addSelected.value.length) {
    return
  }
  if (addSelected.value.length > addMemberSlotsRemaining.value) {
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
    :width="drawerWidth"
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

    <div v-if="conversation" class="space-y-4 pb-6">
      <div
        v-if="loading"
        class="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] text-zinc-500"
      >
        <i class="fa-solid fa-spinner fa-spin text-[12px]" />
        <span>Đang tải…</span>
      </div>

      <section class="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <div class="flex items-start gap-3">
          <button
            type="button"
            class="relative shrink-0 rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#1877f2] disabled:cursor-default"
            :disabled="!isAdmin || !canInteract"
            @click="triggerAvatarPick"
          >
            <img
              :src="heroAvatarSrc()"
              alt=""
              width="72"
              height="72"
              class="h-[72px] w-[72px] rounded-full object-cover ring-1 ring-zinc-200/90"
            >
            <span
              v-if="isAdmin && canInteract"
              class="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-zinc-200"
            >
              <i class="fa-solid fa-camera text-[11px] text-zinc-600" />
            </span>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            class="hidden"
            @change="onAvatarChange"
          >

          <div class="min-w-0 flex-1">
            <div v-if="isAdmin && canInteract" class="flex gap-2">
              <a-input
                v-model:value="editName"
                placeholder="Tên nhóm"
                max-length="120"
              />
              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1877f2] text-white transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                aria-label="Lưu tên nhóm"
                :disabled="!editName.trim() || editName.trim() === conversation.name"
                @click="saveName"
              >
                <i class="fa-solid fa-check text-[12px]" />
              </button>
            </div>
            <h2
              v-else
              class="truncate text-[18px] font-semibold leading-tight text-zinc-900"
            >
              {{ conversation.name }}
            </h2>
            <div class="mt-2 flex flex-wrap items-center gap-1.5">
              <span class="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold text-zinc-600">
                {{ activeMemberCount }}/{{ MAX_GROUP_MEMBERS }} thành viên
              </span>
              <span
                v-if="isAdmin"
                class="rounded-full bg-[#1877f2]/10 px-2 py-1 text-[11px] font-semibold text-[#1877f2]"
              >
                Bạn là admin
              </span>
              <span
                v-if="conversation.viewerHasLeft"
                class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700"
              >
                Đã rời nhóm
              </span>
            </div>
            <div class="mt-3">
              <div class="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  class="h-full rounded-full bg-[#1877f2] transition-all"
                  :style="{ width: `${groupCapacityPercent}%` }"
                />
              </div>
              <p class="mt-1 text-[12px] text-zinc-500">
                <template v-if="addMemberSlotsRemaining > 0">
                  Còn {{ addMemberSlotsRemaining }} chỗ trống.
                </template>
                <template v-else>
                  Nhóm đã đạt giới hạn thành viên.
                </template>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section v-if="canInteract" class="grid grid-cols-1 gap-2">
        <button
          v-if="isAdmin"
          type="button"
          class="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-55"
          :disabled="!canAddMembers"
          @click="addOpen = true"
        >
          <i class="fa-solid fa-user-plus text-[12px] text-[#1877f2]" />
          <span>Thêm</span>
        </button>
        <button
          v-if="!isAdmin"
          type="button"
          class="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-[13px] font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50"
          @click="emit('leave')"
        >
          <i class="fa-solid fa-arrow-right-from-bracket text-[12px] text-zinc-500" />
          <span>Rời nhóm</span>
        </button>
      </section>

      <section>
        <div class="mb-2 flex items-center justify-between px-0.5">
          <h3 class="text-[12px] font-bold uppercase text-zinc-500">
            Thành viên
          </h3>
          <span class="text-[12px] text-zinc-400">
            {{ activeMemberCount }} đang tham gia
            <template v-if="inactiveMemberCount"> · {{ inactiveMemberCount }} đã rời</template>
          </span>
        </div>
        <ul class="max-h-[320px] overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
          <li
            v-for="row in memberRows"
            :key="row.userId"
            class="flex cursor-pointer items-center gap-3 border-b border-zinc-100 px-3 py-3 transition last:border-0 hover:bg-zinc-50"
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
              <div class="flex min-w-0 items-center gap-1.5">
                <p class="truncate text-[14px] font-semibold text-zinc-900">
                  {{ row.name }}
                </p>
                <span
                  v-if="row.isSelf"
                  class="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500"
                >Bạn</span>
              </div>
              <p class="truncate text-[12px] text-zinc-500">
                <template v-if="row.username">@{{ row.username }}</template>
                <template v-else>Thành viên</template>
              </p>
            </div>
            <span
              v-if="row.isAdmin"
              class="shrink-0 rounded-full bg-[#1877f2]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#1877f2]"
            >Admin</span>
            <button
              v-else-if="isAdmin && canInteract && !row.isSelf && !row.hasLeft"
              type="button"
              class="shrink-0 rounded-lg p-2 text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
              aria-label="Xóa khỏi nhóm"
              @click.stop="emit('remove-member', row.userId)"
            >
              <i class="fa-solid fa-user-minus text-[13px]" />
            </button>
            <span
              v-else-if="row.hasLeft && row.removedByAdmin"
              class="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500"
            >Bị xóa</span>
            <span
              v-else-if="row.hasLeft"
              class="shrink-0 rounded-full bg-zinc-100 px-2 py-1 text-[11px] text-zinc-500"
            >Đã rời</span>
          </li>
        </ul>
      </section>

      <section
        v-if="isAdmin && canInteract"
        class="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
      >
        <div class="flex items-center gap-2">
          <a-select
            v-model:value="transferTarget"
            class="min-w-0 flex-1"
            placeholder="Chọn người nhận quyền admin"
            :options="transferOptions"
            allow-clear
          />
          <button
            type="button"
            class="shrink-0 rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-zinc-900 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="!transferTarget"
            @click="confirmTransfer"
          >
            Chuyển
          </button>
        </div>
      </section>

      <section v-if="isAdmin && canInteract" class="border-t border-zinc-200 pt-3">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[14px] font-semibold text-rose-600 transition hover:bg-rose-50"
          @click="emit('dissolve')"
        >
          <i class="fa-solid fa-trash-can text-[12px]" />
          Giải tán nhóm
        </button>
      </section>
    </div>

    <a-modal
      v-model:open="addOpen"
      title="Thêm thành viên"
      ok-text="Thêm"
      cancel-text="Hủy"
      :confirm-loading="addMembersLoading"
      :ok-button-props="{ disabled: addSelected.length === 0 || addSelected.length > addMemberSlotsRemaining }"
      destroy-on-close
      @ok="submitAddMembers"
    >
      <p class="mb-3 text-[13px] leading-snug text-zinc-500">
        Chỉ có thể thêm người mà bạn và họ follow lẫn nhau, và chưa tham gia nhóm. Còn {{ addMemberSlotsRemaining }} chỗ trống.
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
            :disabled="!addSelected.map(String).includes(String(row.id)) && addSelected.length >= addMemberSlotsRemaining"
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
