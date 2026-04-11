<template>
  <section class="w-full bg-white">
    <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-3">
        <p class="text-sm font-medium text-zinc-700">
          Results:
          <strong class="font-semibold text-zinc-900">{{ totalResults }} photos</strong>
        </p>
        <p
          v-if="$route.query.q"
          class="truncate text-sm text-zinc-500"
        >
          Query: <span class="font-medium text-zinc-700">"{{ $route.query.q }}"</span>
        </p>
      </div>

      <!-- Hiển thị nếu có kết quả -->
      <div
        v-if="totalResults > 0"
        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        <div
          v-for="(image, index) in images"
          :key="index"
          class="group relative overflow-hidden rounded-xl bg-zinc-100 shadow-sm ring-1 ring-zinc-200/70"
        >
          <NuxtLink
            :to="{ name: 'PhotoDetail', params: { token: image.photo_token } }"
            class="block"
          >
            <img
              :src="image.image_url"
              alt="Search Result"
              class="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              loading="lazy"
              decoding="async"
            >
          </NuxtLink>

          <!-- Overlay info -->
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
                  :src="getProfilePicture(image.user.profile_picture)"
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
                @click="handleClick('addToGallery', image.id)"
              >
                <i class="fa-regular fa-square-plus text-[16px]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Hiển thị nếu không có kết quả -->
      <div
        v-else
        class="flex min-h-[60vh] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 text-center"
      >
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200/70">
          <i class="fas fa-search text-xl" />
        </div>
        <p class="mt-2 text-base font-semibold text-zinc-800">
          No results for
          <span class="font-bold">"{{ $route.query.q }}"</span>
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
</template>

<script>
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import { useRequireLogin } from '~/composables/useRequireLogin'
import { useLikeStore } from '~/stores/likeStore';
import { searchService } from '~/features/search/services/search.api.js'

export default {
    name: "SearchComponent",
    components: {
        AddToGalleryModal,
    },
    data() {
        return {
            images: [],
            totalResults: 0,
            activeDropdown: null,
            showAddToGallery: false,
            selectedPhotoId: null,
        };
    },
    async mounted() {
        const likeStore = useLikeStore();
        await likeStore.fetchLikedPhotos(); // Tải danh sách ảnh đã like trước
        await this.fetchSearchResults(); // Sau đó tải ảnh tìm kiếm
        this.updateLikedState(); // Cập nhật trạng thái like
    },

    watch: {
        '$route.query.q': {
            async handler() {
                await this.fetchSearchResults();
                this.updateLikedState(); // Đảm bảo trạng thái "liked" được cập nhật
            },
            immediate: true
        }
    },

    methods: {
        async fetchSearchResults() {
            const searchTerm = this.$route.query.q || '';
            const token = localStorage.getItem('token'); // Lấy token từ localStorage hoặc Vuex nếu bạn lưu ở đó

            try {
                const response = await searchService.search(searchTerm, {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : '', // Gửi token nếu có
                    }
                });
                const d = response.data;
                this.images = Array.isArray(d) ? d : (d?.data ?? []);
                this.totalResults = this.images.length;
            } catch (error) {
                console.error('Failed to fetch search results:', error);
                this.images = [];
                this.totalResults = 0;
            }
        },
        async checkLogin() {
            return await useRequireLogin();
        },
        async handleClick(action, itemId) {
            if (!await this.checkLogin()) {
                return; // Nếu chưa đăng nhập, dừng thực hiện các hành động khác
            }

            switch (action) {
                case 'addToGallery':
                    this.openAddToGalleryModal(itemId);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        },
        openAddToGalleryModal(id) {
            this.selectedPhotoId = id;
            this.showAddToGallery = true; // Mở modal
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false; // Đóng modal
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            this.images.forEach(image => {
                image.liked = likeStore.likedPhotos.includes(image.id);
            });
        },
        async toggleLike(image) {
            if (!await this.checkLogin()) {
                return;
            }

            const photo_id = image.id; // ID của ảnh
            const photo_user_id = image.user.id; // ID của người sở hữu ảnh
            const likeStore = useLikeStore();

            try {
                if (image.liked) {
                    await likeStore.unlikePhoto(photo_id);
                } else {
                    await likeStore.likePhoto(photo_id, photo_user_id); // Gửi thêm photo_user_id
                }
                image.liked = !image.liked; // Đảo ngược trạng thái liked
            } catch (error) {
                console.error('Failed to toggle like:', error);
            }
        },
        getProfilePicture(profilePicture) {
            const baseUrl = `${this.apiOrigin}/images/avatars/`;
            if (profilePicture.startsWith('http')) {
                return profilePicture;
            }
            return baseUrl + profilePicture.split('/').pop();
        },
        toggleDropdown(id) {
            if (this.activeDropdown === id) {
                this.activeDropdown = null;
            } else {
                this.activeDropdown = id;
            }
        }
    }
};
</script>
