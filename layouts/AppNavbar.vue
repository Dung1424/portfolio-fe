<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'
import { useUserStore } from '~/stores/userStore'
import { useNotificationStore } from '~/stores/notificationStore'

const authStore = useAuthStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()
const { isLoggedIn } = storeToRefs(authStore)
const { user } = storeToRefs(userStore)
const { notifications: notificationsRef, unreadCount, currentPage, lastPage } = storeToRefs(notificationStore)

/** Matches formatted items from notificationStore.fetchNotifications */
type NavbarNotification = {
  id: number
  read: boolean
  image: string
  message: string
  time: string
  type?: number
  photoToken?: string | null
  galleriesCode?: string | null
  galleryId?: number | null
}

const notifications = computed(() => notificationsRef.value as NavbarNotification[])

const mediaBase = useMediaBase()
const route = useRoute()
const router = useRouter()
const searchQuery = ref('')
/** Phạm vi tìm kiếm header: ảnh, gallery hoặc photographer */
const searchScope = ref<'photos' | 'galleries' | 'photographers'>('photos')

const userMenuOpen = ref(false)
const notifOpen = ref(false)
const mobileNavOpen = ref(false)
const searchScopeOpen = ref(false)

const searchScopeLabel = computed(() => {
  if (searchScope.value === 'galleries') {
    return 'Galleries'
  }
  if (searchScope.value === 'photographers') {
    return 'Photographers'
  }
  return 'Photos'
})

function setSearchScope(scope: 'photos' | 'galleries' | 'photographers') {
  searchScope.value = scope
  searchScopeOpen.value = false
}

const navRef = ref<HTMLElement | null>(null)

const userAvatarSrc = computed(() => {
  const path = user.value?.profile_picture
  if (!path) return ''
  return joinMediaUrl(mediaBase.value, path)
})
const hasMoreNotifications = computed(() => currentPage.value < lastPage.value)

function navLinkClass(active: boolean) {
  return active
    ? 'font-semibold text-[#1877f2]'
    : 'font-medium text-zinc-700 transition-colors hover:text-zinc-900'
}

const isDiscoverActive = computed(() => route.name === 'Index')
const isChatActive = computed(() => route.name === 'Chat')
const isContactActive = computed(() => route.name === 'Contact')
const isBlogActive = computed(() => route.name === 'Blog' || route.name === 'BlogDetails')
const isCategoryActive = computed(() => route.name === 'Category' || route.name === 'DetailsCategory')

watch(
  () => route.query.type,
  (t) => {
    if (t === 'galleries') {
      searchScope.value = 'galleries'
    } else if (t === 'photographers') {
      searchScope.value = 'photographers'
    } else {
      searchScope.value = 'photos'
    }
  },
  { immediate: true },
)

onMounted(async () => {
  await authStore.checkLoginStatus()
  if (authStore.isLoggedIn) {
    await userStore.fetchUserData()
    await notificationStore.fetchNotifications(1)
  }
  document.addEventListener('click', onDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})

function onDocumentClick(e: MouseEvent) {
  const el = navRef.value
  if (el && !el.contains(e.target as Node)) {
    userMenuOpen.value = false
    notifOpen.value = false
    mobileNavOpen.value = false
    searchScopeOpen.value = false
  }
}

async function navigateToPhoto(notification: NavbarNotification) {
  if (notification.id) {
    await notificationStore.markNotificationAsRead(notification.id)
  }
  if (notification.type === 2 || notification.type === 4) {
    return
  }
  if (notification.type === 3 && notification.galleriesCode) {
    await router.push({ name: 'GalleryDetailsUser', params: { galleries_code: notification.galleriesCode } })
    return
  }
  if (notification.photoToken) {
    await router.push({ name: 'PhotoDetail', params: { token: notification.photoToken } })
  } else {
    alert('Invalid notification data.')
  }
  notifOpen.value = false
}

async function loadMoreNotifications() {
  await notificationStore.fetchNotifications(currentPage.value + 1)
}

function goToAddPhotos() {
  router.push({ name: 'AddPhotos' })
}

function runSearch() {
  const q = String(searchQuery.value ?? '').trim()
  const type
    = searchScope.value === 'galleries'
      ? 'galleries'
      : searchScope.value === 'photographers'
        ? 'photographers'
        : 'photos'
  router.push({
    name: 'Search',
    query: { q, type },
  })
}

async function handleLogoutClick() {
  userMenuOpen.value = false
  await authStore.handleLogout()
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
  if (userMenuOpen.value) {
    notifOpen.value = false
  }
}

function toggleNotif() {
  notifOpen.value = !notifOpen.value
  if (notifOpen.value) {
    userMenuOpen.value = false
  }
}
</script>

<template>
  <header
    ref="navRef"
    class="fixed top-0 z-[1000] w-full border-b border-zinc-200 bg-white"
  >
    <div class="mx-auto flex h-[52px] max-w-[1600px] flex-nowrap items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-8">
      <!-- Left: logo + nav -->
      <div class="flex min-w-0 shrink-0 items-center gap-5 lg:gap-8">
        <NuxtLink
          to="/"
          class="shrink-0 text-[18px] font-bold tracking-tight text-black"
        >
          MyPortfolio
        </NuxtLink>
        <nav class="hidden items-center gap-1 lg:flex" aria-label="Primary">
          <NuxtLink to="/" class="rounded-md px-2 py-1.5 text-[15px]" :class="navLinkClass(isDiscoverActive)">
            Discover
          </NuxtLink>
          <NuxtLink to="/contact" class="rounded-md px-2 py-1.5 text-[15px]" :class="navLinkClass(isContactActive)">
            Contact
          </NuxtLink>
          <NuxtLink to="/blog" class="rounded-md px-2 py-1.5 text-[15px]" :class="navLinkClass(isBlogActive)">
            Blog
          </NuxtLink>
          <NuxtLink :to="{ name: 'Category' }" class="rounded-md px-2 py-1.5 text-[15px]" :class="navLinkClass(isCategoryActive)">
            Category
          </NuxtLink>
        </nav>
      </div>

      <!-- Center: pill search — overflow-visible để dropdown không bị cắt (overflow-hidden trước đó chặn click) -->
      <div class="hidden min-w-0 flex-1 px-1 md:block">
        <div
          class="mx-auto flex h-10 max-w-2xl items-stretch overflow-visible rounded-full border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <div class="relative shrink-0" @mousedown.stop>
            <button
              type="button"
              class="flex h-full min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded-l-full px-2.5 text-[13px] font-medium text-zinc-800 hover:bg-zinc-50 sm:px-3"
              aria-haspopup="listbox"
              :aria-expanded="searchScopeOpen"
              @click.stop="searchScopeOpen = !searchScopeOpen"
            >
              {{ searchScopeLabel }}
              <i class="fa-solid fa-chevron-down text-[9px] text-zinc-400" />
            </button>
            <div
              v-show="searchScopeOpen"
              class="absolute left-0 top-full z-[1100] mt-1 min-w-[180px] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
              role="listbox"
              @mousedown.stop
            >
              <button
                type="button"
                role="option"
                class="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                :class="searchScope === 'photos' ? 'bg-sky-50 font-medium text-[#1877f2]' : ''"
                @click.stop="setSearchScope('photos')"
              >
                Photos
              </button>
              <button
                type="button"
                role="option"
                class="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                :class="searchScope === 'galleries' ? 'bg-sky-50 font-medium text-[#1877f2]' : ''"
                @click.stop="setSearchScope('galleries')"
              >
                Galleries
              </button>
              <button
                type="button"
                role="option"
                class="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                :class="searchScope === 'photographers' ? 'bg-sky-50 font-medium text-[#1877f2]' : ''"
                @click.stop="setSearchScope('photographers')"
              >
                Photographers
              </button>
            </div>
          </div>
          <span class="w-px shrink-0 self-stretch bg-zinc-200 my-2" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search powered by AI"
            class="min-w-0 flex-1 border-0 bg-transparent px-3 text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
            @keyup.enter="runSearch"
          >
          <button
            type="button"
            class="flex shrink-0 items-center justify-center rounded-r-full bg-[#1877f2] px-4 text-white transition hover:bg-[#166fe5] active:bg-[#1464d4]"
            aria-label="Search"
            @click="runSearch"
          >
            <i class="fas fa-search text-[13px]" />
          </button>
        </div>
      </div>

      <!-- Right: icons + Upload (500px order) -->
      <div class="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <template v-if="isLoggedIn">
          <div class="relative">
            <button
              type="button"
              class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100"
              aria-haspopup="true"
              :aria-expanded="userMenuOpen"
              @click.stop="toggleUserMenu"
            >
              <img
                v-if="userAvatarSrc"
                :src="userAvatarSrc"
                alt=""
                class="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-200"
              >
              <i v-else class="fa-regular fa-user text-[20px]" />
            </button>
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="opacity-0 scale-95"
              enter-to-class="opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-show="userMenuOpen"
                class="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
                role="menu"
                @click.stop
              >
                <NuxtLink
                  v-if="user?.username"
                  :to="{ name: 'MyProfile', params: { username: user.username } }"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-zinc-50"
                  @click="userMenuOpen = false"
                >
                  <i class="fa-regular fa-circle-user w-5 text-center text-[17px] text-zinc-500" />
                  <span>Profile</span>
                </NuxtLink>
                <NuxtLink
                  :to="{ path: '/account', query: { tab: 'photos' } }"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-zinc-50"
                  @click="userMenuOpen = false"
                >
                  <i class="fa-solid fa-camera w-5 text-zinc-500" />
                  <span>My Photo</span>
                </NuxtLink>
                <NuxtLink
                  :to="{ path: '/account', query: { tab: 'galleries' } }"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-zinc-50"
                  @click="userMenuOpen = false"
                >
                  <i class="fa-solid fa-images w-5 text-zinc-500" />
                  <span>My Gallery</span>
                </NuxtLink>
                <NuxtLink
                  to="/login"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-zinc-50"
                  @click.prevent="handleLogoutClick"
                >
                  <i class="fa-solid fa-sign-out-alt w-5 text-zinc-500" />
                  <span>Logout</span>
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <NuxtLink
            to="/chat"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors"
            :class="isChatActive ? 'bg-sky-100 text-[#1877f2]' : 'text-zinc-700 hover:bg-zinc-100'"
            title="Messages"
            aria-label="Messages"
          >
            <i class="fa-regular fa-paper-plane text-[19px]" />
          </NuxtLink>

          <div class="relative">
            <button
              type="button"
              class="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100"
              aria-label="Notifications"
              :aria-expanded="notifOpen"
              @click.stop="toggleNotif"
            >
              <i class="fa-regular fa-bell text-[21px]" />
              <span
                v-if="unreadCount > 0"
                class="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            </button>
            <Transition
              enter-active-class="transition ease-out duration-100"
              enter-from-class="opacity-0 translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition ease-in duration-75"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 translate-y-1"
            >
              <div
                v-show="notifOpen"
                class="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,600px)] w-[min(calc(100vw-2rem),320px)] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl"
                @click.stop
              >
                <div class="sticky top-0 z-[1] border-b border-zinc-100 bg-white py-3 text-center text-base font-semibold text-zinc-900">
                  Notifications
                </div>
                <div
                  v-for="n in notifications"
                  :key="n.id"
                  class="flex gap-3 border-b border-zinc-100 px-3 py-2.5 transition last:border-0 hover:bg-zinc-50"
                  :class="{ 'bg-sky-50/80': !n.read }"
                >
                  <img :src="n.image" alt="" class="h-10 w-10 shrink-0 rounded-full object-cover">
                  <div class="min-w-0 flex-1">
                    <p class="cursor-pointer text-sm font-medium text-zinc-800" @click="navigateToPhoto(n)">
                      {{ n.message }}
                    </p>
                    <small class="text-xs text-zinc-500">{{ n.time }}</small>
                  </div>
                </div>
                <button
                  v-if="hasMoreNotifications"
                  type="button"
                  class="sticky bottom-0 w-full border-t border-zinc-100 bg-white py-2.5 text-center text-sm font-medium text-[#1877f2] transition hover:bg-zinc-50"
                  @click="loadMoreNotifications"
                >
                  View more
                </button>
              </div>
            </Transition>
          </div>

          <NuxtLink
            :to="{ path: '/account', query: { tab: 'photos' } }"
            class="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-800 hover:bg-zinc-100 xl:flex"
            title="Your content"
            aria-label="Downloads"
          >
            <i class="fa-solid fa-mobile-screen-button text-[18px]" />
          </NuxtLink>

          <button
            type="button"
            class="hidden shrink-0 items-center gap-2 rounded-full border-2 border-black bg-white px-5 py-2 text-sm font-bold tracking-tight text-black shadow-none outline-none transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 sm:inline-flex"
            @click="goToAddPhotos"
          >
            <i class="fa-solid fa-arrow-up text-[15px] leading-none" aria-hidden="true" />
            <span class="select-none">Upload</span>
          </button>
        </template>

        <template v-else>
          <div class="hidden items-center gap-2 sm:flex">
            <NuxtLink
              to="/login"
              class="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Log in
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="rounded-full bg-black px-3 py-1.5 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Sign up
            </NuxtLink>
          </div>
        </template>

        <button
          type="button"
          class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-800 md:hidden"
          aria-label="Open menu"
          @click.stop="mobileNavOpen = !mobileNavOpen"
        >
          <i class="fa-solid fa-bars text-lg" />
        </button>
      </div>
    </div>

    <div
      v-show="mobileNavOpen"
      class="border-t border-zinc-100 bg-white px-4 py-4 md:hidden"
    >
      <div class="mb-4 flex h-10 items-stretch overflow-hidden rounded-full border border-zinc-200 bg-white shadow-sm">
        <label class="sr-only" for="mobile-search-scope">Search scope</label>
        <select
          id="mobile-search-scope"
          v-model="searchScope"
          class="max-w-[9.5rem] shrink-0 border-0 bg-zinc-50 px-2 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-0"
        >
          <option value="photos">
            Photos
          </option>
          <option value="galleries">
            Galleries
          </option>
          <option value="photographers">
            Photographers
          </option>
        </select>
        <span class="my-2 w-px shrink-0 bg-zinc-200" />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search powered by AI"
          class="min-w-0 flex-1 border-0 bg-transparent px-2 text-sm focus:ring-0"
          @keyup.enter="runSearch"
        >
        <button
          type="button"
          class="flex shrink-0 items-center justify-center bg-[#1877f2] px-4 text-white active:bg-[#1464d4]"
          aria-label="Search"
          @click="runSearch"
        >
          <i class="fas fa-search text-xs" />
        </button>
      </div>
      <div class="flex flex-col gap-1 text-sm">
        <NuxtLink to="/" class="rounded-lg px-3 py-2" :class="isDiscoverActive ? 'bg-sky-100 font-bold text-zinc-900' : 'text-zinc-700'" @click="mobileNavOpen = false">
          Discover
        </NuxtLink>
        <NuxtLink to="/contact" class="rounded-lg px-3 py-2" :class="isContactActive ? 'bg-sky-100 font-bold text-zinc-900' : 'text-zinc-700'" @click="mobileNavOpen = false">
          Contact
        </NuxtLink>
        <NuxtLink to="/blog" class="rounded-lg px-3 py-2" :class="isBlogActive ? 'bg-sky-100 font-bold text-zinc-900' : 'text-zinc-700'" @click="mobileNavOpen = false">
          Blog
        </NuxtLink>
        <NuxtLink :to="{ name: 'Category' }" class="rounded-lg px-3 py-2" :class="isCategoryActive ? 'bg-sky-100 font-bold text-zinc-900' : 'text-zinc-700'" @click="mobileNavOpen = false">
          Category
        </NuxtLink>
        <NuxtLink
          v-if="isLoggedIn"
          to="/chat"
          class="rounded-lg px-3 py-2"
          :class="isChatActive ? 'bg-sky-100 font-bold text-zinc-900' : 'text-zinc-700'"
          @click="mobileNavOpen = false"
        >
          Messages
        </NuxtLink>
      </div>
      <div v-if="!isLoggedIn" class="mt-4 flex gap-2 border-t border-zinc-100 pt-4">
        <NuxtLink to="/login" class="flex-1 rounded-full border border-zinc-200 py-2.5 text-center text-sm font-semibold" @click="mobileNavOpen = false">
          Log in
        </NuxtLink>
        <NuxtLink to="/register" class="flex-1 rounded-full bg-black py-2.5 text-center text-sm font-bold text-white" @click="mobileNavOpen = false">
          Sign up
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
