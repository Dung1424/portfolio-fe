<template>
  <div
    class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"
  >
    <article
      v-for="(gallery, index) in galleries"
      :key="gallery.id || galleryCode(gallery) || index"
      class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm ring-1 ring-zinc-900/5 transition hover:shadow-md"
    >
      <div class="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
        <NuxtLink
          :to="{ name: 'GalleryDetailsUser', params: { galleries_code: galleryCode(gallery) } }"
          class="line-clamp-2 min-w-0 flex-1 text-left text-base font-semibold leading-snug text-zinc-900 transition hover:text-[#3470d1]"
        >
          {{ gallery.galleries_name || 'Untitled' }}
        </NuxtLink>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-white"
          title="Photos in gallery"
        >
          <i
            class="fa-regular fa-image text-[11px]"
            aria-hidden="true"
          />
          {{ galleryPhotoCount(gallery) }}
        </span>
      </div>

      <NuxtLink
        :to="{ name: 'GalleryDetailsUser', params: { galleries_code: galleryCode(gallery) } }"
        class="block px-4 pb-3"
      >
        <div class="grid grid-cols-2 gap-1.5">
          <div
            v-for="(src, gi) in galleryPreviewSlots(gallery)"
            :key="gi"
            class="relative aspect-square overflow-hidden rounded-lg bg-zinc-100"
          >
            <img
              v-if="src"
              :src="src"
              alt=""
              class="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
            >
            <div
              v-else
              class="flex h-full min-h-[72px] w-full flex-col items-center justify-center gap-1 bg-zinc-100 text-zinc-400"
            >
              <i
                class="fa-regular fa-image text-lg"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>
      </NuxtLink>

      <div class="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
        <NuxtLink
          v-if="gallery.user?.username"
          :to="{ name: 'MyProfile', params: { username: gallery.user.username } }"
          class="flex min-w-0 flex-1 items-center gap-2.5"
        >
          <img
            :src="avatarUrl(gallery.user?.profile_picture)"
            alt=""
            class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
            loading="lazy"
            decoding="async"
          >
          <span class="truncate text-sm font-medium text-zinc-800">{{ gallery.user?.name || gallery.user?.username }}</span>
        </NuxtLink>
        <span
          v-else
          class="min-w-0 flex-1 truncate text-sm text-zinc-500"
        >—</span>
        <div class="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Like gallery"
            @click="toggleLikeGallery(gallery)"
          >
            <i
              class="text-[17px]"
              :class="gallery.liked ? 'fas fa-heart text-rose-500' : 'fa-regular fa-heart'"
            />
          </button>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Report gallery"
            @click="emitReportGallery(gallery)"
          >
            <i
              class="fa-regular fa-flag text-[15px]"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<script>
import { useRequireLogin } from '~/composables/useRequireLogin'
import { useLikeStore } from '~/stores/likeStore.js'

export default {
  name: 'SearchResultsGalleries',
  props: {
    galleries: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['open-report-gallery'],
  setup() {
    const { resolveMediaUrl } = useResolvePublicMediaUrl()
    return { resolveMediaUrl }
  },
  methods: {
    galleryCode(g) {
      return g?.galleries_code ?? g?.galleriesCode ?? ''
    },
    galleryPhotoCount(g) {
      const photos = g?.photo
      return Array.isArray(photos) ? photos.length : 0
    },
    galleryPreviewSlots(g) {
      const photos = Array.isArray(g?.photo) ? g.photo : []
      const slots = []
      for (let i = 0; i < 4; i++) {
        const url = photos[i]?.image_url
        slots.push(url ? this.resolveMediaUrl(url) : null)
      }
      return slots
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
    async emitReportGallery(gallery) {
      if (!await this.checkLogin()) {
        return
      }
      this.$emit('open-report-gallery', gallery)
    },
    async toggleLikeGallery(gallery) {
      if (!await this.checkLogin()) {
        return
      }
      const likeStore = useLikeStore()
      const galleryId = gallery.id
      const galleryUserId = gallery.user?.id ?? null
      try {
        if (gallery.liked) {
          await likeStore.unlikeGallery(galleryId)
        } else {
          await likeStore.likeGallery(galleryId, galleryUserId)
        }
        gallery.liked = !gallery.liked
      } catch (error) {
        console.error('Failed to toggle gallery like:', error)
      }
    },
  },
}
</script>
