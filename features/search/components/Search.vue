<template>
  <section class="w-full bg-white">
    <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p class="text-sm font-medium text-zinc-700">
          Results:
          <strong class="font-semibold text-zinc-900">{{ totalResults }} {{ resultKindLabel }}</strong>
        </p>
        <div class="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
          <span
            v-if="$route.query.q"
            class="truncate"
          >
            Query: <span class="font-medium text-zinc-700">"{{ $route.query.q }}"</span>
          </span>
          <span
            v-if="$route.query.q"
            class="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
          >
            {{ searchTypeBadge }}
          </span>
        </div>
      </div>

      <SearchResultsPhotos
        v-if="isPhotoSearch && totalResults > 0"
        :images="images"
        @open-add-to-gallery="openAddToGalleryModal"
      />
      <SearchResultsGalleries
        v-else-if="isGallerySearch && totalResults > 0"
        :galleries="galleries"
        @open-report-gallery="openReportGalleryFromSearch"
      />
      <SearchResultsUsers
        v-else-if="isPhotographerSearch && totalResults > 0"
        :photographers="photographers"
      />

      <div
        v-else
        class="flex min-h-[60vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200/70">
          <i class="fas fa-search text-xl" />
        </div>
        <p class="mt-2 text-base font-semibold text-zinc-800">
          <template v-if="$route.query.q">
            No results for
            <span class="font-bold">"{{ $route.query.q }}"</span>
          </template>
          <template v-else>
            Enter a search in the bar above to see {{ searchTypeHint }}.
          </template>
        </p>
        <p class="text-sm text-zinc-500">
          Check the spelling or try modifying your search.
        </p>
      </div>
    </div>
  </section>

  <AddToGalleryModal
    :is-visible="showAddToGallery"
    :photo-id="selectedPhotoId"
    @close="closeAddToGalleryModal"
  />
  <ReportGalleryModal
    :is-visible="showReportGalleryModal"
    :gallery-id="selectedGalleryId"
    :violator-id="selectedViolatorId"
    @close="closeReportGalleryModal"
  />
</template>

<script>
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportGalleryModal from '~/features/gallery/components/ReportGalleryModal.vue'
import SearchResultsPhotos from '~/features/search/components/SearchResultsPhotos.vue'
import SearchResultsGalleries from '~/features/search/components/SearchResultsGalleries.vue'
import SearchResultsUsers from '~/features/search/components/SearchResultsUsers.vue'
import { useRequireLogin } from '~/composables/useRequireLogin'
import { useLikeStore } from '~/stores/likeStore.js'
import { useFollowStore } from '~/stores/followStore.js'
import { useUserStore } from '~/stores/userStore.js'
import { searchService } from '~/features/search/services/search.api.js'

export default {
  name: 'SearchComponent',
  components: {
    AddToGalleryModal,
    ReportGalleryModal,
    SearchResultsPhotos,
    SearchResultsGalleries,
    SearchResultsUsers,
  },
  data() {
    return {
      images: [],
      galleries: [],
      photographers: [],
      totalResults: 0,
      showAddToGallery: false,
      selectedPhotoId: null,
      showReportGalleryModal: false,
      selectedGalleryId: '',
      selectedViolatorId: '',
    }
  },
  computed: {
    isGallerySearch() {
      return this.$route.query.type === 'galleries'
    },
    isPhotographerSearch() {
      return this.$route.query.type === 'photographers'
    },
    isPhotoSearch() {
      return !this.isGallerySearch && !this.isPhotographerSearch
    },
    resultKindLabel() {
      if (this.isGallerySearch) {
        return 'galleries'
      }
      if (this.isPhotographerSearch) {
        return 'photographers'
      }
      return 'photos'
    },
    searchTypeBadge() {
      if (this.isGallerySearch) {
        return 'Galleries'
      }
      if (this.isPhotographerSearch) {
        return 'Photographers'
      }
      return 'Photos'
    },
    searchTypeHint() {
      if (this.isGallerySearch) {
        return 'galleries'
      }
      if (this.isPhotographerSearch) {
        return 'photographers'
      }
      return 'photos'
    },
  },
  watch: {
    '$route.query': {
      deep: true,
      immediate: true,
      async handler() {
        const likeStore = useLikeStore()
        await likeStore.fetchLikedPhotos()
        await this.fetchSearchResults()
        this.applyPhotoLikedState()
        this.applyGalleryLikedState()
      },
    },
  },
  methods: {
    async fetchSearchResults() {
      const searchTerm = this.$route.query.q ?? ''
      const trimmed = String(searchTerm).trim()
      /** /Search/Users và /Search/Galleries: q không được chỉ whitespace */
      if ((this.isPhotographerSearch || this.isGallerySearch) && !trimmed) {
        this.images = []
        this.galleries = []
        this.photographers = []
        this.totalResults = 0
        return
      }
      const token = localStorage.getItem('token')
      const headers = {
        Authorization: token ? `Bearer ${token}` : '',
      }

      try {
        if (this.isGallerySearch) {
          const response = await searchService.searchGalleries(searchTerm, { headers })
          const d = response.data
          this.galleries = Array.isArray(d) ? d : (d?.data ?? [])
          this.images = []
          this.photographers = []
          this.totalResults = this.galleries.length
          try {
            const likeStore = useLikeStore()
            if (token) {
              await likeStore.fetchLikedGalleries()
            }
          } catch {
            /* ignore */
          }
          this.applyGalleryLikedState()
        } else if (this.isPhotographerSearch) {
          const response = await searchService.searchUsers(searchTerm, { headers })
          const d = response.data
          this.photographers = Array.isArray(d) ? d : (d?.data ?? [])
          this.images = []
          this.galleries = []
          this.totalResults = this.photographers.length
          await this.hydratePhotographerFollowingState()
        } else {
          const response = await searchService.searchPhotos(searchTerm, { headers })
          const d = response.data
          this.images = Array.isArray(d) ? d : (d?.data ?? [])
          this.galleries = []
          this.photographers = []
          this.totalResults = this.images.length
          this.applyPhotoLikedState()
        }
      } catch (error) {
        console.error('Failed to fetch search results:', error)
        this.images = []
        this.galleries = []
        this.photographers = []
        this.totalResults = 0
      }
    },
    applyPhotoLikedState() {
      const likeStore = useLikeStore()
      this.images.forEach((image) => {
        image.liked = likeStore.likedPhotos.includes(image.id)
      })
    },
    applyGalleryLikedState() {
      const likeStore = useLikeStore()
      this.galleries.forEach((g) => {
        g.liked = likeStore.likedGalleries.includes(g.id)
      })
    },
    async hydratePhotographerFollowingState() {
      if (!this.isPhotographerSearch || !this.photographers.length) {
        return
      }
      const token = localStorage.getItem('token')
      if (!token) {
        this.photographers.forEach((u) => {
          u.following = false
        })
        return
      }
      const userStore = useUserStore()
      if (!userStore.user?.id) {
        try {
          await userStore.fetchUserData()
        } catch {
          /* ignore */
        }
      }
      const followStore = useFollowStore()
      try {
        await followStore.fetchFollowingList()
      } catch {
        /* ignore */
      }
      this.photographers.forEach((u) => {
        const uid = String(u.id)
        u.following = followStore.followingList.some((fid) => String(fid) === uid)
      })
    },
    openAddToGalleryModal(id) {
      this.selectedPhotoId = id
      this.showAddToGallery = true
    },
    closeAddToGalleryModal() {
      this.showAddToGallery = false
    },
    async openReportGalleryFromSearch(gallery) {
      if (!await useRequireLogin()) {
        return
      }
      const gid = gallery?.id
      const vid = gallery?.user?.id
      if (!gid || !vid) {
        return
      }
      this.selectedGalleryId = gid
      this.selectedViolatorId = vid
      this.showReportGalleryModal = true
    },
    closeReportGalleryModal() {
      this.showReportGalleryModal = false
      this.selectedGalleryId = ''
      this.selectedViolatorId = ''
    },
  },
}
</script>
