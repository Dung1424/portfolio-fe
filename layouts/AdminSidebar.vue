<template>
  <aside
    :class="[
      collapsed ? 'w-[72px]' : 'w-[260px]',
      'sticky top-0 flex h-screen shrink-0 flex-col border-r border-[#0d1e2d]/80 bg-[#0d1e2d] text-slate-100 shadow-[4px_0_24px_-4px_rgb(0_0_0/0.25)] transition-[width] duration-200 ease-out'
    ]"
  >
    <div class="flex shrink-0 items-center gap-1 border-b border-white/10 px-2 py-4">
      <NuxtLink
        to="/admin"
        class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-white/[0.06]"
        :title="collapsed ? 'Admin' : undefined"
      >
        <span
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#1877f2]/20 text-sm font-bold text-white"
        >
          A
        </span>
        <span v-show="!collapsed" class="min-w-0 flex-1">
          <span class="block truncate text-lg font-bold tracking-tight text-white font-[family-name:var(--font-portfolio-heading)]">
            Admin
          </span>
          <span class="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1877f2]">
            Portfolio
          </span>
        </span>
      </NuxtLink>
      <button
        type="button"
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="!collapsed"
        aria-controls="admin-sidebar-nav"
        @click="toggleCollapsed"
      >
        <i
          class="fa-solid fa-angles-left text-xs transition-transform duration-200"
          :class="{ 'rotate-180': collapsed }"
          aria-hidden="true"
        />
      </button>
    </div>

    <nav
      id="admin-sidebar-nav"
      class="flex min-h-0 flex-1 flex-col space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-4 text-[13px] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
    >
      <template v-for="entry in navEntries" :key="entryKey(entry)">
        <NuxtLink
          v-if="entry.kind === 'link'"
          :to="entry.to"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          active-class="!bg-[#1877f2]/20 !text-white"
          :title="collapsed ? entry.label : undefined"
        >
          <span
            class="admin-sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[13px] text-[#93c5fd] transition group-hover:bg-[#1877f2]/20 group-hover:text-white"
          >
            <i :class="['fa-solid', entry.icon]" aria-hidden="true" />
          </span>
          <span v-show="!collapsed" class="font-medium">{{ entry.label }}</span>
        </NuxtLink>

        <div v-else-if="entry.kind === 'expandable'" class="rounded-lg">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
            :class="{ '!bg-[#1877f2]/20 !text-white': isGroupActive(entry) }"
            :aria-expanded="groupOpen(entry.key)"
            :title="collapsed ? entry.label : undefined"
            @click="toggleGroup(entry.key)"
          >
            <span
              class="admin-sidebar-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[13px] text-[#93c5fd]"
            >
              <i :class="['fa-solid', entry.icon]" aria-hidden="true" />
            </span>
            <span v-show="!collapsed" class="min-w-0 flex-1 font-medium">{{ entry.label }}</span>
            <i
              v-show="!collapsed"
              class="fa-solid fa-chevron-down text-[10px] text-slate-500 transition-transform duration-200"
              :class="{ '-rotate-180': groupOpen(entry.key) }"
              aria-hidden="true"
            />
          </button>
          <div
            v-show="groupOpen(entry.key)"
            class="mt-0.5 space-y-0.5 border-l border-white/10 pl-2 ml-[22px]"
            :class="{ '!ml-2 !border-l-0 !pl-0': collapsed }"
          >
            <NuxtLink
              v-for="item in entry.items"
              :key="item.to"
              :to="item.to"
              class="group flex items-center gap-3 rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
              active-class="!bg-[#1877f2]/15 !text-white"
              :title="collapsed ? item.label : undefined"
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-xs text-[#93c5fd]/90 group-hover:bg-[#1877f2]/20 group-hover:text-white"
              >
                <i :class="['fa-solid', item.icon]" aria-hidden="true" />
              </span>
              <span v-show="!collapsed" class="text-[13px] font-medium">{{ item.label }}</span>
            </NuxtLink>
          </div>
        </div>
      </template>
    </nav>

    <div class="shrink-0 border-t border-white/10 px-2 py-3">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
        :title="collapsed ? 'Back to site' : undefined"
      >
        <i class="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
        <span v-show="!collapsed">Back to site</span>
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue'

defineOptions({ name: 'AdminSidebar' })

const COLLAPSED_KEY = 'admin-sidebar-collapsed'

const route = useRoute()
const collapsed = ref(false)

const navEntries = [
  {
    kind: 'link',
    to: '/admin',
    icon: 'fa-gauge-high',
    label: 'Dashboard'
  },
  {
    kind: 'expandable',
    key: 'photos',
    label: 'Photos',
    icon: 'fa-images',
    items: [
      { to: '/admin/photos', icon: 'fa-images', label: 'All photos' },
      { to: '/admin/photos/pending', icon: 'fa-clock', label: 'Pending' },
      { to: '/admin/photos/rejected', icon: 'fa-circle-xmark', label: 'Rejected' }
    ]
  },
  {
    kind: 'expandable',
    key: 'catalog',
    label: 'Catalog',
    icon: 'fa-layer-group',
    items: [
      { to: '/admin/categories', icon: 'fa-layer-group', label: 'Categories' },
      { to: '/admin/tags', icon: 'fa-tags', label: 'Tags' }
    ]
  },
  {
    kind: 'expandable',
    key: 'reports',
    label: 'Reports',
    icon: 'fa-flag',
    items: [
      { to: '/admin/reports/photos', icon: 'fa-flag', label: 'Photo reports' },
      { to: '/admin/reports/comments', icon: 'fa-comments', label: 'Comment reports' },
      { to: '/admin/reports/galleries', icon: 'fa-image', label: 'Gallery reports' }
    ]
  },
  {
    kind: 'expandable',
    key: 'users',
    label: 'Users',
    icon: 'fa-users',
    items: [
      { to: '/admin/users', icon: 'fa-users', label: 'Active users' },
      { to: '/admin/users/inactive', icon: 'fa-user-slash', label: 'Inactive users' }
    ]
  },
  {
    kind: 'expandable',
    key: 'content',
    label: 'Content',
    icon: 'fa-folder-open',
    items: [
      { to: '/admin/contacts', icon: 'fa-envelope-open-text', label: 'Contacts' },
      { to: '/admin/blogs', icon: 'fa-newspaper', label: 'Blogs' }
    ]
  },
  {
    kind: 'expandable',
    key: 'account',
    label: 'Account',
    icon: 'fa-user-gear',
    items: [
      { to: '/admin/account/profile', icon: 'fa-user-gear', label: 'Profile' },
      { to: '/admin/account/password', icon: 'fa-key', label: 'Password' }
    ]
  }
]

function entryKey(entry) {
  if (entry.kind === 'expandable') {
    return entry.key
  }
  return entry.to
}

function pathMatchesItem(path, itemPath) {
  return path === itemPath || path.startsWith(`${itemPath}/`)
}

function isGroupActive(entry) {
  if (entry.kind !== 'expandable') {
    return false
  }
  const p = route.path
  return entry.items.some(item => pathMatchesItem(p, item.to))
}

function buildOpenState() {
  const state = {}
  const p = route.path
  for (const e of navEntries) {
    if (e.kind !== 'expandable') {
      continue
    }
    state[e.key] = e.items.some(item => pathMatchesItem(p, item.to))
  }
  return state
}

const openGroups = reactive(buildOpenState())

function groupOpen(key) {
  return !!openGroups[key]
}

function toggleGroup(key) {
  openGroups[key] = !openGroups[key]
}

function syncOpenGroupsFromRoute() {
  const p = route.path
  for (const e of navEntries) {
    if (e.kind !== 'expandable') {
      continue
    }
    if (e.items.some(item => pathMatchesItem(p, item.to))) {
      openGroups[e.key] = true
    }
  }
}

watch(() => route.path, syncOpenGroupsFromRoute)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(COLLAPSED_KEY, collapsed.value ? '1' : '0')
  }
}

onMounted(() => {
  if (typeof localStorage === 'undefined') {
    return
  }
  collapsed.value = localStorage.getItem(COLLAPSED_KEY) === '1'
})
</script>
