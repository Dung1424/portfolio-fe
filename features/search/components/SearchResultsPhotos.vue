<template>
  <div
    class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  >
    <div
      v-for="(image, index) in images"
      :key="image.id || image.photo_token || index"
      class="group relative overflow-hidden rounded-xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200/70"
    >
      <NuxtLink
        :to="{ name: 'PhotoDetail', params: { token: image.photo_token } }"
        class="block"
      >
        <img
          :src="resolveMediaUrl(image.image_url)"
          alt="Search Result"
          class="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          decoding="async"
        >
      </NuxtLink>

      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-b from-black/0 via-black/30 to-black/70 px-3 py-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
      >
        <div class="pointer-events-auto flex items-center gap-2">
          <NuxtLink
            :to="{ name: 'MyProfile', params: { username: image.user.username } }"
            class="shrink-0"
            aria-label="View profile"
          >
            <img
              :src="avatarUrl(image.user?.profile_picture)"
              alt=""
              class="h-8 w-8 rounded-full object-cover ring-2 ring-white/70"
              loading="lazy"
              decoding="async"
            >
          </NuxtLink>

          <span
            class="min-w-0 flex-1 truncate text-sm font-semibold text-white"
            :title="image.user.username"
          >
            {{ image.user.username }}
          </span>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Like"
            @click="toggleLike(image)"
          >
            <i
              class="fas fa-heart text-[16px]"
              :class="image.liked ? 'text-rose-400' : 'text-white'"
            />
          </button>

          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Add to gallery"
            @click="onAddToGallery(image.id)"
          >
            <i class="fa-regular fa-square-plus text-[16px]" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useRequireLogin } from '~/composables/useRequireLogin'
import { useLikeStore } from '~/stores/likeStore.js'

export default {
  name: 'SearchResultsPhotos',
  props: {
    images: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['open-add-to-gallery'],
  setup() {
    const { resolveMediaUrl } = useResolvePublicMediaUrl()
    return { resolveMediaUrl }
  },
  methods: {
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
    async onAddToGallery(photoId) {
      if (!await this.checkLogin()) {
        return
      }
      this.$emit('open-add-to-gallery', photoId)
    },
    async toggleLike(image) {
      if (!await this.checkLogin()) {
        return
      }

      const photo_id = image.id
      const photo_user_id = image.user.id
      const likeStore = useLikeStore()

      try {
        if (image.liked) {
          await likeStore.unlikePhoto(photo_id)
        } else {
          await likeStore.likePhoto(photo_id, photo_user_id)
        }
        image.liked = !image.liked
      } catch (error) {
        console.error('Failed to toggle like:', error)
      }
    },
  },
}
</script>
