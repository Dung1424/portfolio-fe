import type { RouteLocationNormalizedLoaded } from 'vue-router'

export type AdminRecentTab = {
  fullPath: string
  title: string
}

const STORAGE_KEY = 'portfolio-admin-recent-tabs'
const MAX_TABS = 18

function readStoredTabs(): AdminRecentTab[] {
  if (!import.meta.client) {
    return []
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(
        (x): x is AdminRecentTab =>
          x &&
          typeof x === 'object' &&
          typeof (x as AdminRecentTab).fullPath === 'string' &&
          typeof (x as AdminRecentTab).title === 'string'
      )
      .slice(0, MAX_TABS)
  } catch {
    return []
  }
}

function persistTabs(list: AdminRecentTab[]) {
  if (!import.meta.client) {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_TABS)))
  } catch {
    /* ignore quota */
  }
}

function titleFromRoute(route: RouteLocationNormalizedLoaded): string {
  const m = route.meta?.title
  if (typeof m === 'string' && m.trim()) {
    return m.trim()
  }
  const parts = route.path.split('/').filter(Boolean)
  const last = parts[parts.length - 1] || 'Admin'
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, ' ')
}

function shouldTrackRoute(route: RouteLocationNormalizedLoaded): boolean {
  if (!route.path.startsWith('/admin')) {
    return false
  }
  if (route.path === '/admin/login') {
    return false
  }
  return true
}

export function useAdminRecentTabs() {
  const route = useRoute()
  const tabs = useState<AdminRecentTab[]>('admin-recent-tabs', () => [])

  function touchCurrentRoute() {
    if (!shouldTrackRoute(route)) {
      return
    }
    const entry: AdminRecentTab = {
      fullPath: route.fullPath,
      title: titleFromRoute(route)
    }
    const rest = tabs.value.filter((t) => t.fullPath !== entry.fullPath)
    tabs.value = [entry, ...rest].slice(0, MAX_TABS)
    persistTabs(tabs.value)
  }

  function removeTab(fullPath: string) {
    const wasActive = route.fullPath === fullPath
    const next = tabs.value.filter((t) => t.fullPath !== fullPath)
    tabs.value = next
    persistTabs(next)
    if (wasActive && next.length) {
      navigateTo(next[0].fullPath)
    }
  }

  function clearAll() {
    tabs.value = []
    persistTabs([])
  }

  function isActive(fullPath: string) {
    return route.fullPath === fullPath
  }

  if (import.meta.client) {
    onMounted(() => {
      const stored = readStoredTabs()
      if (stored.length) {
        tabs.value = stored
      }
      touchCurrentRoute()
    })

    watch(
      () => route.fullPath,
      () => {
        touchCurrentRoute()
      }
    )
  }

  return {
    tabs,
    removeTab,
    clearAll,
    isActive
  }
}
