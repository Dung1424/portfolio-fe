<template>
  <div class="min-h-[calc(100vh-4rem)] bg-white pb-16">
    <div class="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
      <TabBar :active-item="activeItem" :set-active="setActive" :is-logged-in="isLoggedIn" />
      <HomeFeedToolbar
        v-if="activeItem === 'forYou'"
        :layout-mode="feedLayout"
        @update:layout-mode="feedLayout = $event"
        @open-slideshow="openSlideshow"
      />
      <FeedSlideshow
        v-if="slideshowOpen && photos.length"
        :photos="photos"
        @close="slideshowOpen = false"
      />
      <Transition name="skeleton-cross" mode="out-in">
        <!-- Đang tải lần đầu: lưới skeleton — tối thiểu ~850ms + fade; không dùng cho tải thêm -->
        <FeedSkeletonGrid
          v-if="activeItem === 'forYou' && showFeedSkeleton"
          key="feed-skel"
          :layout="feedLayout"
          :count="16"
        />
        <ForYou
          v-else-if="activeItem === 'forYou' && photos.length > 0"
          key="feed-content"
          :photos="photos"
          :layout="feedLayout"
        />
        <div
          v-else-if="activeItem === 'forYou' && !loading && photos.length === 0 && feedInitialResolved"
          key="feed-empty"
          class="mx-auto max-w-lg rounded-2xl border border-zinc-100 bg-zinc-50/90 px-8 py-14 text-center shadow-sm ring-1 ring-zinc-900/5"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200/80">
            <i class="fa-regular fa-images text-2xl" aria-hidden="true" />
          </div>
          <h2 class="mt-5 text-lg font-semibold tracking-tight text-zinc-900">
            Nothing in your feed yet
          </h2>
          <p class="mt-2 text-sm leading-relaxed text-zinc-500">
            When there’s new work to show, it will appear here in a 500px-style grid. Upload your first photo to get started.
          </p>
          <NuxtLink
            :to="{ name: 'AddPhotos' }"
            class="mt-8 inline-flex items-center justify-center rounded-full bg-[#1877f2] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#166fe5]"
          >
            <i class="fa-solid fa-arrow-up-from-bracket mr-2 text-[13px]" aria-hidden="true" />
            Upload photos
          </NuxtLink>
        </div>
      </Transition>
      <!-- Sentinel: khi gần cuối viewport thì tải thêm ảnh (thay window.onscroll, ổn hơn khi có sticky tab) -->
      <div
        v-if="activeItem === 'forYou' && !noMorePhotos && photos.length > 0"
        ref="loadMoreSentinel"
        class="pointer-events-none h-1 w-full shrink-0"
        aria-hidden="true"
      />
      <FeedLoadMoreIndicator v-if="activeItem === 'forYou' && showFeedLoadMore" />
      <Following v-else-if="activeItem === 'following' && isLoggedIn" :users="followingUsers" />
      <Explore v-else-if="activeItem === 'explore'" :users="followingUsers" />
    </div>
  </div>
</template>
<script>
import { homeService } from '~/features/home/services/home.api.js'
import { useAuthStore } from '~/stores/authStore'
import {
  isPaginationLoading,
  waitRemainingSkeletonMs,
} from '~/composables/useSkeletonPlaceholder'

export default {
    name: 'HomePage',
    data() {
        return {
            activeItem: 'forYou',
            photos: [],
            followingUsers: [],
            isLoggedIn: false,
            currentPage: 1,
            lastPage: 1,
            loading: false,
            noMorePhotos: false,
            feedLayout: 'masonry',
            slideshowOpen: false,
            _feedScrollObserver: null,
            /**
             * true sau khi lần fetch feed trang 1 đầu tiên chạy xong (kể cả lỗi / rỗng).
             * Tránh flash empty state khi vừa vào Discover: lúc đó `loading` còn false (chưa vào getPhoto hoặc đang await checkLogin).
             */
            feedInitialResolved: false,
        }
    },
    computed: {
        /**
         * Skeleton For You: đang fetch trang 1 HOẶC chưa từng hoàn tất fetch đầu khi feed còn rỗng (trước getPhoto / trong checkLogin).
         */
        showFeedSkeleton() {
            if (this.activeItem !== 'forYou') {
                return false
            }
            return Boolean(
                (this.loading && this.currentPage === 1)
                || (!this.feedInitialResolved && this.photos.length === 0),
            )
        },
        /** Spinner cuối feed: tải trang tiếp theo, khác skeleton */
        showFeedLoadMore() {
            return isPaginationLoading(this.loading, this.photos.length)
        },
    },
    watch: {
        activeItem(newItem) {
            if (newItem === 'forYou') {
                this.getPhoto();
                this.$nextTick(() => this.setupInfiniteScroll())
            }
            else {
                this.teardownInfiniteScroll()
            }
            if (newItem === 'following' && this.isLoggedIn) {
                this.getFollow();
            }
        },
        noMorePhotos(val) {
            if (val) {
                this.teardownInfiniteScroll()
            }
            else if (this.activeItem === 'forYou') {
                this.$nextTick(() => this.setupInfiniteScroll())
            }
        },
    },
    beforeUnmount() {
        this.teardownInfiniteScroll()
    },
    async mounted() {
        try {
            const saved = localStorage.getItem('home-feed-layout')
            if (saved === 'grid' || saved === 'masonry') {
                this.feedLayout = saved
            }
        } catch {
            /* ignore */
        }
        await this.checkLogin();
        if (this.activeItem === 'forYou') {
            await this.getPhoto();
            this.$nextTick(() => this.setupInfiniteScroll())
        }
        if (this.activeItem === 'following' && this.isLoggedIn) {
            this.getFollow();
        }
    },
    methods: {
        openSlideshow() {
            if (!this.photos.length) {
                return
            }
            this.slideshowOpen = true
        },
        setActive(item) {
            this.activeItem = item;
        },
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            this.isLoggedIn = authStore.isLoggedIn;
            if (!this.isLoggedIn && this.activeItem === 'following') {
                this.activeItem = 'forYou';
                this.$router.push({ name: 'Login' });
            }
            return this.isLoggedIn;
        },
        async getPhoto() {
            if (this.loading || this.noMorePhotos) return;
            const wasFirstFeedRequest = this.photos.length === 0 && this.currentPage === 1;
            const isFirstPaint = wasFirstFeedRequest;
            const skeletonStartedAt = isFirstPaint ? Date.now() : 0;
            this.loading = true;

            try {
                const token = localStorage.getItem("token");
                let headers = {};
                if (token) {
                    headers = { Authorization: `Bearer ${token}` };
                }
                const response = await homeService.fetchPhotoFeed(
                    {
                        page: this.currentPage,
                        per_page: 20,
                    },
                    { headers }
                );

                if (!response.data || typeof response.data !== 'object') {
                    throw new Error('Invalid API response format');
                }

                const { data, current_page, last_page } = response.data;
                if (!Array.isArray(data)) {
                    console.error('API response "data" is not an array:', data);
                    return;
                }

                this.photos = [...this.photos, ...data];
                this.currentPage = current_page;
                this.lastPage = last_page;

                if (current_page >= last_page) {
                    this.noMorePhotos = true;
                }
            } catch (error) {
                console.error('Error fetching photos:', error);
                if (error.response) {
                    console.error('API error response:', error.response.data);
                }
            } finally {
                if (isFirstPaint && skeletonStartedAt) {
                    await waitRemainingSkeletonMs(skeletonStartedAt);
                }
                this.loading = false;
                if (wasFirstFeedRequest) {
                    this.feedInitialResolved = true;
                }
            }
        },
        teardownInfiniteScroll() {
            if (this._feedScrollObserver) {
                this._feedScrollObserver.disconnect()
                this._feedScrollObserver = null
            }
        },
        setupInfiniteScroll() {
            this.teardownInfiniteScroll()
            if (this.activeItem !== 'forYou' || this.noMorePhotos) {
                return
            }
            const run = () => {
                if (
                    this.activeItem === 'forYou'
                    && !this.loading
                    && !this.noMorePhotos
                ) {
                    this.currentPage++
                    this.getPhoto()
                }
            }
            const el = this.$refs.loadMoreSentinel
            if (el && typeof IntersectionObserver !== 'undefined') {
                this._feedScrollObserver = new IntersectionObserver(
                    (entries) => {
                        if (entries.some(e => e.isIntersecting)) {
                            run()
                        }
                    },
                    { root: null, rootMargin: '320px 0px', threshold: 0 },
                )
                this._feedScrollObserver.observe(el)
            }
            else {
                window.onscroll = () => {
                    if (
                        this.activeItem === 'forYou'
                        && window.innerHeight + window.scrollY >= document.body.offsetHeight - 120
                        && !this.loading
                        && !this.noMorePhotos
                    ) {
                        run()
                    }
                }
            }
        },
        async getFollow() {
            try {
                const token = localStorage.getItem("token");

                let headers = {};
                if (token) {
                    headers = {
                        Authorization: `Bearer ${token}`,
                    };
                }

                const response = await homeService.fetchFollowFeed({ headers });
                const fd = response.data;
                this.followingUsers = Array.isArray(fd) ? fd : (fd?.data ?? []);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách follow:", error);
            }
        }
    }
}
</script>
