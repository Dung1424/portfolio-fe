<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 text-left sm:px-6 lg:px-8">
            <nav class="mb-4 flex flex-wrap items-center gap-2 text-sm text-zinc-600">
                <NuxtLink
                    to="/categories"
                    class="inline-flex items-center gap-1.5 font-bold text-zinc-900 hover:text-blue-600"
                >
                    <i class="fas fa-arrow-left text-xs" />
                    Back
                </NuxtLink>
                <span class="text-zinc-300">›</span>
                <NuxtLink to="/categories" class="font-semibold text-zinc-500 hover:text-zinc-900">
                    Explore Categories
                </NuxtLink>
                <span class="text-zinc-300">›</span>
                <span class="font-bold text-zinc-900">Category Details</span>
            </nav>

            <h1 class="mb-6 text-2xl font-bold tracking-tight text-[#222] sm:text-3xl">Popular Photos</h1>

            <div class="relative mb-6 flex justify-start">
                <div class="relative">
                    <span
                        class="inline-flex cursor-pointer select-none items-center gap-2 text-base font-bold text-zinc-900"
                        @click="toggleFilterDropdown"
                    >
                        <strong>Filter ({{ selectedFilters.length }})</strong>
                        <i :class="['fas', showFilterDropdown ? 'fa-chevron-up' : 'fa-chevron-down']" />
                    </span>
                    <div
                        v-if="showFilterDropdown"
                        class="absolute left-0 top-full z-[10000] mt-1 max-h-[min(300px,50vh)] w-[min(calc(100vw-2rem),350px)] overflow-y-auto rounded-xl border border-neutral-200 bg-white py-0 shadow-xl ring-1 ring-black/5"
                    >
                        <h3 class="border-b border-neutral-100 px-4 py-3 text-base font-bold text-zinc-900">
                            Category
                        </h3>
                        <ul class="m-0 list-none p-0">
                            <li
                                v-for="categoryOption in filters"
                                :key="categoryOption.id"
                                class="cursor-pointer px-4 py-2.5 transition hover:bg-neutral-100"
                                @click="toggleFilter(categoryOption)"
                            >
                                <div class="flex w-full items-center justify-between gap-3">
                                    <span class="font-normal text-zinc-800">{{ categoryOption.category_name }}</span>
                                    <input
                                        type="checkbox"
                                        class="h-4 w-4 shrink-0 rounded border-neutral-300 text-blue-600 accent-blue-600"
                                        :checked="selectedFilters.includes(categoryOption)"
                                        @click.stop.prevent="toggleFilter(categoryOption)"
                                    />
                                </div>
                            </li>
                        </ul>
                        <div
                            class="sticky bottom-0 flex items-center justify-between border-t border-neutral-100 bg-white px-3 py-2.5"
                        >
                            <button
                                type="button"
                                class="rounded-lg border-none bg-transparent px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed"
                                :class="selectedFilters.length === 0 ? 'text-zinc-400' : 'text-blue-600 hover:underline'"
                                :disabled="selectedFilters.length === 0"
                                @click="clearFilters"
                            >
                                Clear ({{ selectedFilters.length }})
                            </button>
                            <button
                                type="button"
                                class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                                @click="applyFilters"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <Transition name="skeleton-cross" mode="out-in">
                <div
                    v-if="photosLoading"
                    key="cat-detail-skel"
                    class="my-6 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4"
                    aria-busy="true"
                    aria-label="Loading photos"
                >
                    <div
                        v-for="n in 12"
                        :key="n"
                        class="skeleton-shimmer h-[200px] w-full rounded-xl ring-1 ring-black/[0.06]"
                    />
                </div>
                <div
                    v-else-if="images.length === 0"
                    key="cat-detail-empty"
                    class="my-6 flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center text-zinc-600"
                >
                    <p class="text-lg font-medium">No photos available for the selected categories.</p>
                </div>
                <div v-else key="cat-detail-grid" class="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
                <div
                    v-for="(image, index) in images"
                    :key="index"
                    class="group relative overflow-hidden rounded-xl ring-1 ring-black/[0.06]"
                >
                    <NuxtLink :to="{ name: 'PhotoDetail', params: { token: image.photo_token } }">
                        <img
                            :src="image.image_url"
                            alt=""
                            class="h-[200px] w-full object-cover transition duration-200 group-hover:rounded-none"
                        />
                    </NuxtLink>
                    <div
                        class="pointer-events-none absolute bottom-0 left-0 w-full translate-y-1 bg-gradient-to-t from-black/60 via-black/35 to-transparent p-2.5 opacity-0 transition duration-300 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100"
                    >
                        <div class="flex items-center gap-2">
                            <NuxtLink
                                :to="{ name: 'MyProfile', params: { username: image.user.username } }"
                                class="pointer-events-auto h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30"
                            >
                                <img
                                    class="h-full w-full object-cover"
                                    :src="getProfilePicture(image.user.profile_picture)"
                                    alt=""
                                />
                            </NuxtLink>
                            <span class="min-w-0 flex-1 truncate text-sm font-medium text-white">{{
                                image.user.name
                            }}</span>
                            <span
                                class="pointer-events-auto shrink-0 cursor-pointer text-lg text-white"
                                @click.stop="toggleLike(image)"
                            >
                                <i
                                    :class="[
                                        'fas fa-heart text-sm',
                                        image.liked ? 'text-[#ff5a5f]' : 'text-white'
                                    ]"
                                />
                            </span>
                            <div class="relative shrink-0">
                                <span
                                    class="pointer-events-auto inline-flex cursor-pointer text-lg text-white"
                                    @click.stop="toggleDropdown('dotsDropdown-' + image.id)"
                                >
                                    <i
                                        :class="[
                                            'fas fa-ellipsis-h',
                                            activeDropdown === 'dotsDropdown-' + image.id
                                                ? 'rounded-full bg-blue-600 p-1.5 text-neutral-100'
                                                : 'p-1'
                                        ]"
                                    />
                                </span>
                                <div
                                    v-if="activeDropdown === 'dotsDropdown-' + image.id"
                                    class="absolute bottom-full right-0 z-[1000] mb-1 min-w-[220px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl"
                                    @click.stop
                                >
                                    <ul class="m-0 flex list-none flex-col p-0">
                                        <li
                                            class="flex cursor-pointer items-center whitespace-nowrap px-4 py-3 pl-6 text-left text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                            @click="handleClick('addToGallery', image.id)"
                                        >
                                            <i class="fa-regular fa-square-plus mr-2 w-4 shrink-0" /> Add to Gallery
                                        </li>
                                        <li
                                            v-if="image.user && userStore.user && image.user.id !== userStore.user.id"
                                            class="flex cursor-pointer items-center whitespace-nowrap px-4 py-3 pl-6 text-left text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                            @click="toggleBlockUser(image.user)"
                                        >
                                            <i class="fas fa-user-slash mr-2 w-4 shrink-0" />
                                            {{ image.blocked ? 'Unblock' : 'Block' }}
                                        </li>
                                        <li
                                            v-if="image.user && userStore.user && image.user.id !== userStore.user.id"
                                            class="flex cursor-pointer items-center whitespace-nowrap px-4 py-3 pl-6 text-left text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                            @click="toggleFollow(image)"
                                        >
                                            <i
                                                class="fas mr-2 w-4 shrink-0"
                                                :class="image.following ? 'fa-user-minus' : 'fa-user-plus'"
                                            />
                                            {{ image.following ? 'Unfollow' : 'Follow' }}
                                        </li>
                                        <li
                                            v-if="image.user && userStore.user && image.user.id !== userStore.user.id"
                                            class="flex cursor-pointer items-center whitespace-nowrap px-4 py-3 pl-6 text-left text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                            @click="handleClick('reportPhoto', image.id, image.user.id)"
                                        >
                                            <i class="fas fa-flag mr-2 w-4 shrink-0" /> Report This Photo
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </Transition>
        </div>

        <AddToGalleryModal
            :is-visible="showAddToGallery"
            :photo-id="selectedPhotoId"
            @close="closeAddToGalleryModal"
        />
        <ReportPhotoModal
            :is-visible="showReportModal"
            :photo-id="selectedPhotoId"
            :violator-id="selectedViolatorId"
            @close="closeReportModal"
        />
    </div>
</template>

<script>
import { waitRemainingSkeletonMs } from '~/composables/useSkeletonPlaceholder'
import { categoryService } from '~/features/category/services/category.api.js'
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportPhotoModal from '~/features/photo/components/ReportPhotoModal.vue'
import { useLikeStore } from '~/stores/likeStore';
import { useAuthStore } from '~/stores/authStore';
import { useBlockStore } from '~/stores/blockStore';
import { useFollowStore } from '~/stores/followStore';
import { useUserStore } from '~/stores/userStore';
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export default {
    name: "DetailsCategoryPage",
    components: {
        AddToGalleryModal,
        ReportPhotoModal,
    },
    data() {
        return {
            showFilterDropdown: false,
            showSortDropdown: false,
            selectedFilters: [],
            selectedSort: "Pulse",
            filters: [],
            activeDropdown: null,
            images: [],
            /** Lưới ảnh: skeleton + tối thiểu thời gian shimmer (tránh tắt ngay khi API trả về) */
            photosLoading: false,
            _fetchPhotosSeq: 0,
            showAddToGallery: false,
            selectedPhotoId: null,
            showReportModal: false,
            selectedViolatorId: null,
        };
    },
    async mounted() {
        await this.fetchCategories();
        await this.fetchPhotos();
        const likeStore = useLikeStore();
        await likeStore.fetchLikedPhotos();
        this.updateLikedState();

        const notifData = localStorage.getItem('blockNotification');
        if (notifData) {
            const {message, description, duration} = JSON.parse(notifData);
            notification.success({
                message,
                description,
                placement: 'topRight',
                duration,
            });
            localStorage.removeItem('blockNotification');
        }

        const userStore = useUserStore();
        await userStore.fetchUserData();

        const followStore = useFollowStore();
        await followStore.fetchFollowingList();
        this.updateFollowingState();

        const blockStore = useBlockStore();
        await blockStore.fetchBlockedUsers();
        this.updateBlockedState();
    },
    computed: {
        userStore() {
            return useUserStore();
        }
    },
    methods: {
        async fetchCategories() {
            try {
                const response = await categoryService.fetchCategories();
                this.filters = response.data;
            } catch (error) {
                console.error('Failed to fetch categories:', error);
            }
        },
        async fetchPhotos() {
            const { slugs } = this.$route.query;
            if (!slugs) {
                this.images = [];
                this.photosLoading = false;
                return;
            }
            const myId = ++this._fetchPhotosSeq;
            const startedAt = Date.now();
            this.photosLoading = true;
            const token = localStorage.getItem('token');

            try {
                const response = await categoryService.fetchPhotosByCategorySlugs(slugs, {
                    headers: token ? { 'Authorization': 'Bearer ' + token } : {}
                });
                if (myId !== this._fetchPhotosSeq) {
                    return;
                }
                this.images = response.data;
            } catch (error) {
                console.error('Failed to fetch photos:', error);
                if (myId === this._fetchPhotosSeq) {
                    this.images = [];
                }
            } finally {
                if (myId !== this._fetchPhotosSeq) {
                    return;
                }
                await waitRemainingSkeletonMs(startedAt);
                this.photosLoading = false;
            }
        },
        updateFollowingState() {
            const followStore = useFollowStore();
            this.images.forEach(image => {
                image.following = followStore.followingList.includes(image.user.id);
            });
        },
        async toggleFollow(image) {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            const userId = image.user.id;
            const username = image.user.username;

            if (image.following) {
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer. You will no longer see their content in your For You feed.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(userId);
                            image.following = false;
                            notification.success({
                                message: 'Success',
                                description: `You have unfollowed ${username}.`,
                                placement: 'topRight',
                                duration: 3,
                            });
                        } catch (error) {
                            console.error('Error unfollowing user:', error);
                            notification.error({
                                message: 'Error',
                                description: 'Failed to unfollow the user.',
                                placement: 'topRight',
                                duration: 3,
                            });
                        }
                    },
                    onCancel() {
                    },
                });
            } else {
                try {
                    await followStore.followUser(userId);
                    image.following = true;
                    notification.success({
                        message: 'Success',
                        description: `You are now following ${username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                } catch (error) {
                    console.error('Error following user:', error);
                    notification.error({
                        message: 'Error',
                        description: 'Failed to follow the user.',
                        placement: 'topRight',
                        duration: 3,
                    });
                }
            }
        },
        async toggleBlockUser(user) {
            if (!await this.checkLogin()) return;

            const blockStore = useBlockStore();
            const userId = user.id;

            try {
                if (blockStore.blockedUsers.includes(userId)) {
                    await blockStore.unblockUser(userId);
                    localStorage.setItem('blockNotification', JSON.stringify({
                        message: 'Success',
                        description: `${user.username} is unblocked.`,
                        duration: 3,
                    }));
                } else {
                    await blockStore.blockUser(userId);
                    localStorage.setItem('blockNotification', JSON.stringify({
                        message: 'Success',
                        description: `${user.username} has been blocked. All their related content will not be visible going forward.`,
                        duration: 3,
                    }));
                }

                this.updateBlockedState();

                window.location.reload();
            } catch (error) {
                console.error("Error toggling block:", error);
            }
        },
        updateBlockedState() {
            const blockStore = useBlockStore();
            this.images.forEach(image => {
                image.blocked = blockStore.blockedUsers.includes(image.user.id);
            });
        },
        getProfilePicture(profilePicture) {
            if (!profilePicture) {
                return '/images/imageUserDefault.png';
            }
            const baseUrl = `${this.apiOrigin}/images/avatars/`;
            if (profilePicture.startsWith('http')) {
                return profilePicture;
            }
            return baseUrl + profilePicture.split('/').pop();
        },
        toggleFilterDropdown() {
            this.showFilterDropdown = !this.showFilterDropdown;
            if (this.showFilterDropdown) {
                this.showSortDropdown = false;
            }
        },
        toggleSortDropdown() {
            this.showSortDropdown = !this.showSortDropdown;
            if (this.showSortDropdown) {
                this.showFilterDropdown = false;
            }
        },
        toggleFilter(categoryOption) {
            if (this.selectedFilters.includes(categoryOption)) {
                this.selectedFilters = this.selectedFilters.filter(f => f.id !== categoryOption.id);
            } else {
                this.selectedFilters.push(categoryOption);
            }
        },
        applyFilters() {
            const slugs = this.selectedFilters.map(item => item.slug).join(',');
            this.$router.push({ name: 'DetailsCategory', query: { slugs } }).then(() => {
                this.fetchPhotos();
            });
            this.showFilterDropdown = false;
        },
        toggleDropdown(id) {
            if (this.activeDropdown === id) {
                this.activeDropdown = null;
            } else {
                this.activeDropdown = id;
            }
            console.log("Active Dropdown:", this.activeDropdown);
        },
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            if (!authStore.isLoggedIn) {
                this.$router.push({ name: 'Login' });
                return false;
            }
            return true;
        },
        async toggleLike(item) {
            if (!await this.checkLogin()) {
                return;
            }

            const photo_id = item.id;
            const photo_user_id = item.user.id;
            const likeStore = useLikeStore();

            try {
                if (item.liked) {
                    await likeStore.unlikePhoto(photo_id);
                } else {
                    await likeStore.likePhoto(photo_id, photo_user_id);
                }
                item.liked = !item.liked;
            } catch (error) {
                console.error('Failed to toggle like:', error);
            }
        },
        async handleClick(action, itemId, violatorId) {
            if (!await this.checkLogin()) {
                return;
            }

            switch (action) {
                case 'addToGallery':
                    this.openAddToGalleryModal(itemId);
                    break;
                case 'blockUser':
                    this.blockUser(itemId);
                    break;
                case 'followUser':
                    this.followUser(itemId);
                    break;
                case 'reportPhoto':
                    this.openReportModal(itemId, violatorId);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            this.images.forEach(image => {
                image.liked = likeStore.likedPhotos.includes(image.id);
            });
        },
        openAddToGalleryModal(photoId) {
            this.selectedPhotoId = photoId;
            this.showAddToGallery = true;
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false;
        },
        openReportModal(photoId, violatorId) {
            this.selectedPhotoId = photoId;
            this.selectedViolatorId = violatorId;
            this.showReportModal = true;
        },
        closeReportModal() {
            this.showReportModal = false;
            this.selectedPhotoId = null;
            this.selectedViolatorId = null;
        },
        clearFilters() {
            this.selectedFilters = [];
        },
    },
    watch: {
        '$route.query.slugs': {
            handler() {
                this.fetchPhotos();
            },
            immediate: true
        },
        images: {
            handler() {
                this.updateFollowingState();
                this.updateLikedState();
            },
            deep: true,
            immediate: true
        }
    }
};
</script>
