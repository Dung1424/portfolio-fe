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
const router = useRouter()
const searchQuery = ref('')

const userAvatarSrc = computed(() => {
  const path = user.value?.profile_picture
  if (!path) return ''
  return joinMediaUrl(mediaBase.value, path)
})
const userName = computed(() => user.value?.username || '')
const hasMoreNotifications = computed(() => currentPage.value < lastPage.value)

useLegacyVendorScripts()

onMounted(async () => {
  await authStore.checkLoginStatus()
  if (authStore.isLoggedIn) {
    await userStore.fetchUserData()
    await notificationStore.fetchNotifications(1)
  }
})

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
}

async function loadMoreNotifications() {
  await notificationStore.fetchNotifications(currentPage.value + 1)
}

function goToAddPhotos() {
  router.push({ name: 'AddPhotos' })
}

function runSearch() {
  router.push({ name: 'Search', query: { q: searchQuery.value } })
}

async function handleLogoutClick() {
  await authStore.handleLogout()
}
</script>

<template>
  <nav class="navbar">
    <div class="navbar-left">
      <NuxtLink class="navbar-brand" to="/">
        MyPortfolio
      </NuxtLink>
      <div class="nav-links">
        <NuxtLink to="/" class="nav-link" style="color: #007bff">
          Discover
        </NuxtLink>
        <NuxtLink to="/contact" class="nav-link">
          Contact
        </NuxtLink>
        <NuxtLink to="/blog" class="nav-link">
          Blog
        </NuxtLink>
        <NuxtLink :to="{ name: 'Category' }" class="nav-link">
          Category
        </NuxtLink>
      </div>
    </div>
    <div class="navbar-right">
      <div class="search-bar">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search powered by AI"
          @keyup.enter="runSearch"
        >
        <i class="fas fa-search search-icon" @click="runSearch" />
      </div>
      <div class="icon-container">
        <div v-if="isLoggedIn" class="user-dropdown">
          <img
            v-if="userAvatarSrc"
            :src="userAvatarSrc"
            alt="User"
            style="width: 30px; height: 30px; border-radius: 50%;"
            @click="toggleAppDropdown('dropdownMenu')"
          >
          <img
            v-else
            src="/images/imageUserDefault.png"
            alt="Default User"
            style="width: 30px; height: 30px; border-radius: 50%;"
            @click="toggleAppDropdown('dropdownMenu')"
          >
          <div id="dropdownMenu" class="dropdown-content">
            <NuxtLink to="/myPhotos">
              <i class="fa-solid fa-camera" />
              <span>My Photo</span>
            </NuxtLink>
            <NuxtLink to="/myGallery">
              <i class="fa-solid fa-images" />
              <span>My Gallery</span>
            </NuxtLink>
            <NuxtLink to="/login" @click.prevent="handleLogoutClick">
              <i class="fa-solid fa-sign-out-alt" />
              <span>Logout</span>
            </NuxtLink>
          </div>
        </div>
        <div v-else>
          <NuxtLink to="/login" class="btn-custom login-btn">
            Log in
          </NuxtLink>
          <NuxtLink to="/register" class="btn-custom signup-btn">
            Sign up
          </NuxtLink>
        </div>
        <NuxtLink v-if="userName" :to="{ name: 'MyProfile', params: { username: userName } }">
          <i v-if="isLoggedIn" class="fa-regular fa-user" style="font-size: 24px; color: black" />
        </NuxtLink>
        <div class="notification-wrapper">
          <i
            v-if="isLoggedIn"
            class="fa-regular fa-bell"
            style="font-size: 24px;"
            @click="toggleAppDropdown('notificationDropdown')"
          >
            <span v-if="unreadCount > 0" class="notification-dot" />
          </i>
          <div id="notificationDropdown" class="notification-dropdown">
            <div class="notification-header">
              Notifications
            </div>
            <div
              v-for="n in notifications"
              :key="n.id"
              :class="['notification-item', { unread: !n.read }]"
            >
              <img :src="n.image" alt="User" class="notification-image">
              <div class="notification-content">
                <p class="notification-message" @click="navigateToPhoto(n)">
                  {{ n.message }}
                </p>
                <small class="notification-time">{{ n.time }}</small>
              </div>
            </div>
            <div v-if="hasMoreNotifications" class="see-more" @click="loadMoreNotifications">
              View more
            </div>
          </div>
        </div>
      </div>
      <button v-if="isLoggedIn" class="upload-button" type="button" @click="goToAddPhotos">
        <i class="fa-solid fa-arrow-up" /> Upload
      </button>
      <button class="hamburger" type="button" aria-label="Toggle navigation">
        <i class="fa-solid fa-bars" />
      </button>
      <button class="close-menu" type="button" aria-label="Close menu" style="display: none;">
        <i class="fa-solid fa-xmark" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1000;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.user-dropdown img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.dropdown-content {
  top: 40px;
  right: -110px;
}

.notification-wrapper .notification-dropdown {
  display: none;
  position: absolute;
  background-color: white;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  padding: 10px 0;
  z-index: 10;
  width: 300px;
  top: 70px;
  right: 70px;
  overflow-y: auto;
  max-height: 600px;
}
.notification-header {
  text-align: center;
  font-size: 17px;
  background-color: rgb(255, 255, 255);
  padding: 13px 0px;
  height: 52px;
  color: rgb(34, 34, 34);
  font-weight: bold;
  position: sticky;
  z-index: 1;
  top: -12px;
}

.notification-dot {
  position: absolute;
  top: 38px;
  right: 153px;
  width: 8px;
  height: 8px;
  background-color: #ff0000;
  border-radius: 50%;
  z-index: 1;
}
.notification-wrapper .notification-dropdown.show {
  display: block;
}

.notification-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid #f1f1f1;
  transition: background-color 0.3s;
}
.notification-item.unread {
  background-color: #e7f3ff;
}
.notification-item:last-child {
  border-bottom: none;
}

.notification-item:hover {
  background-color: #f9f9f9;
}
.see-more {
  text-align: center;
  padding: 7px;
  cursor: pointer;
  transition: 0.5s;
  height: 40px;
  background-color: rgb(255, 255, 255);
  box-shadow: rgba(0, 0, 0, 0.16) 0px -1px 4px;
  font-size: 14px;
  margin-bottom: -8px;
  color: rgb(8, 112, 209);
}

.notification-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
}

.notification-content {
  flex: 1;
}

.notification-message {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #333;
}

.notification-time {
  font-size: 12px;
  color: #777;
}

.btn-custom {
  border: 1px solid black;
  border-radius: 30px;
  padding: 5px 15px;
  font-size: 16px;
  text-decoration: none;
  color: black;
  margin-left: 10px;
  transition: background-color 0.3s, color 0.3s;
}

.btn-custom:hover {
  background-color: black;
  color: white;
}

.login-btn {
  font-weight: bold;
  border: none;
  background-color: transparent;
}

.signup-btn {
  font-weight: bold;
}
</style>
