<template>
  <div
    class="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    <article
      v-for="(u, index) in photographers"
      :key="u.id || u.username || index"
      class="w-full max-w-[260px] rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 transition hover:-translate-y-1 hover:shadow-md"
    >
      <div class="flex flex-col items-center">
        <div
          class="mx-auto h-[200px] w-full max-w-[210px] overflow-hidden rounded-2xl bg-zinc-200"
          :class="photographerPreviewGridClass(u)"
        >
          <template v-if="photographerPreviewPhotos(u).length > 0">
            <img
              v-for="bg in photographerPreviewPhotos(u).slice(0, 4)"
              :key="bg.id"
              :src="bg.image_url"
              alt=""
              class="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            >
          </template>
          <div
            v-else
            class="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-500"
          >
            <i
              class="fa-regular fa-images text-4xl"
              aria-hidden="true"
            />
            <p class="text-sm font-medium">
              Content Unavailable
            </p>
          </div>
        </div>
        <NuxtLink
          v-if="profileUsername(u)"
          :to="{ name: 'MyProfile', params: { username: profileUsername(u) } }"
          class="-mt-8"
        >
          <img
            :src="avatarUrl(u.profile_picture)"
            alt=""
            class="h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-md"
            loading="lazy"
            decoding="async"
          >
        </NuxtLink>
        <img
          v-else
          :src="avatarUrl(u.profile_picture)"
          alt=""
          class="-mt-8 h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-md"
          loading="lazy"
          decoding="async"
        >
        <h4 class="mt-2 line-clamp-1 text-center text-lg font-semibold text-zinc-900">
          {{ u.name || u.username || 'User' }}
        </h4>
        <button
          v-if="profileUsername(u) && !isCurrentUser(u)"
          type="button"
          class="mt-3 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          @click="toggleFollowPhotographer(u)"
        >
          {{ u.following ? 'Unfollow' : 'Follow' }}
        </button>
      </div>
    </article>
  </div>
</template>

<script>
import { h } from 'vue'
import { Modal, notification } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { useRequireLogin } from '~/composables/useRequireLogin'
import { useFollowStore } from '~/stores/followStore.js'
import { useUserStore } from '~/stores/userStore.js'

export default {
  name: 'SearchResultsUsers',
  props: {
    photographers: {
      type: Array,
      default: () => [],
    },
  },
  setup() {
    const { resolveMediaUrl } = useResolvePublicMediaUrl()
    return { resolveMediaUrl }
  },
  methods: {
    profileUsername(u) {
      const raw = u?.username ?? u?.user_name ?? ''
      return String(raw)
    },
    /**
     * Ảnh preview — cùng logic Following (`user.photos` tối đa 4).
     */
    photographerPreviewPhotos(u) {
      const raw
        = u?.photos
          ?? u?.recent_photos
          ?? u?.public_photos
          ?? u?.portfolio_photos
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(u?.photo)
          ? u.photo
          : []
      const out = []
      for (const item of list.slice(0, 4)) {
        const url = typeof item === 'string'
          ? item
          : (item?.image_url ?? item?.imageUrl ?? item?.url)
        if (url == null || String(url).trim() === '') {
          continue
        }
        const id = item?.id ?? item?.photo_id ?? `${u?.id ?? 'u'}-pv-${out.length}`
        out.push({ id, image_url: this.avatarUrl(url) })
      }
      if (out.length > 0) {
        return out
      }
      const p = u?.profile_picture
      if (p == null || String(p).trim() === '') {
        return []
      }
      return [{ id: `${u.id}-pfp`, image_url: this.avatarUrl(p) }]
    },
    photographerPreviewGridClass(u) {
      const n = this.photographerPreviewPhotos(u).length
      if (n === 0) {
        return ''
      }
      if (n === 1) {
        return 'grid grid-cols-1 grid-rows-1'
      }
      if (n === 2) {
        return 'grid grid-cols-1 grid-rows-2 gap-2'
      }
      return 'grid grid-cols-2 grid-rows-2 gap-2'
    },
    isCurrentUser(u) {
      const me = useUserStore().user
      if (!me?.id || !u?.id) {
        return false
      }
      return String(me.id) === String(u.id)
    },
    avatarUrl(path) {
      if (!path) {
        return '/images/imageUserDefault.png'
      }
      const s = String(path)
      if (/^https?:\/\//i.test(s)) {
        return s
      }
      return this.resolveMediaUrl(s)
    },
    async checkLogin() {
      return await useRequireLogin()
    },
    async toggleFollowPhotographer(u) {
      if (!await this.checkLogin()) {
        return
      }
      const username = this.profileUsername(u)
      if (!username) {
        return
      }
      const followStore = useFollowStore()
      if (u.following) {
        Modal.confirm({
          title: 'Are you sure you want to unfollow this user?',
          icon: h(ExclamationCircleOutlined),
          content: 'You will no longer see their content in your For You feed.',
          onOk: async () => {
            try {
              await followStore.unfollowUser(u.id, username)
              u.following = false
              notification.success({
                message: 'Success',
                description: `You have unfollowed ${username}.`,
                placement: 'topRight',
                duration: 3,
              })
            } catch (error) {
              console.error('Error unfollowing user:', error)
              notification.error({
                message: 'Error',
                description: 'Failed to unfollow the user.',
                placement: 'topRight',
                duration: 3,
              })
            }
          },
        })
      } else {
        try {
          await followStore.followUser(u.id, username)
          u.following = true
          notification.success({
            message: 'Success',
            description: `You are now following ${username}.`,
            placement: 'topRight',
            duration: 3,
          })
        } catch (error) {
          console.error('Error following user:', error)
          notification.error({
            message: 'Error',
            description: `Failed to follow ${username}.`,
            placement: 'topRight',
            duration: 3,
          })
        }
      }
    },
  },
}
</script>
