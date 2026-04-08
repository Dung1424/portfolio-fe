<template>
    <Transition name="skeleton-cross" mode="out-in">
        <ExploreTabSkeleton v-if="!pageReady" key="explore-skel" />
        <div v-else id="explore-feed" key="explore-main" class="flex w-full flex-col gap-16">
        <section>
            <div class="mb-8 text-center">
                <h2 class="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                    Favorite Photos
                </h2>
                <p class="mt-1 text-sm text-zinc-500">
                    Photo uploaded with most likes
                </p>
            </div>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <div v-for="photo in topLikedPhotos" :key="photo.id" class="relative">
                    <div class="group relative overflow-hidden rounded-2xl bg-zinc-100 shadow-sm ring-1 ring-zinc-900/5">
                        <NuxtLink
                            :to="{ name: 'PhotoDetail', params: { token: photo.photo_token } }"
                            class="block aspect-[4/3] overflow-hidden"
                        >
                            <img
                                class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                :src="photo.image_url"
                                :alt="photo.title"
                                loading="lazy"
                                decoding="async"
                            >
                        </NuxtLink>
                        <div class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-3 pt-12">
                            <div class="pointer-events-auto flex items-center gap-2">
                                <NuxtLink
                                    :to="{ name: 'MyProfile', params: { username: photo.user.username } }"
                                    class="shrink-0"
                                >
                                    <img
                                        class="h-8 w-8 rounded-full border border-white/30 object-cover"
                                        :src="photo.user.profile_picture"
                                        :alt="photo.user.name"
                                        loading="lazy"
                                        decoding="async"
                                    >
                                </NuxtLink>
                                <span class="min-w-0 flex-1 truncate text-sm font-medium text-white">{{ photo.user.name }}</span>
                                <button
                                    type="button"
                                    class="shrink-0 rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
                                    @click="toggleLike(photo)"
                                >
                                    <i :class="['fas', 'fa-heart', { 'text-rose-400': photo.liked }]" />
                                </button>
                                <div class="relative shrink-0">
                                    <button
                                        type="button"
                                        class="rounded-full p-1.5 text-white/90 transition hover:bg-white/15"
                                        @click.stop="toggleDropdown('dotsDropdown-' + photo.id)"
                                    >
                                        <i
                                            :class="[
                                                'fas fa-ellipsis-h text-sm',
                                                activeDropdown === 'dotsDropdown-' + photo.id ? 'rounded-full bg-blue-600 px-2 py-1' : ''
                                            ]"
                                        />
                                    </button>
                                    <div
                                        v-if="activeDropdown === 'dotsDropdown-' + photo.id"
                                        class="absolute bottom-full right-0 z-50 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
                                        @click.stop
                                    >
                                        <ul class="m-0 list-none p-0">
                                            <li
                                                class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                                @click="handleClick('addToGallery', photo.id)"
                                            >
                                                <i class="fa-regular fa-square-plus w-5 shrink-0" /> Add to Gallery
                                            </li>
                                            <li
                                                v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                                class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                                @click="toggleBlockUser(photo.user)"
                                            >
                                                <i class="fas fa-user-slash w-5 shrink-0" /> {{ photo.blocked ? 'Unblock' : 'Block' }}
                                            </li>
                                            <li
                                                v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                                class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                                @click="toggleFollow(photo)"
                                            >
                                                <i class="fas w-5 shrink-0" :class="photo.following ? 'fa-user-minus' : 'fa-user-plus'" />
                                                {{ photo.following ? 'Unfollow' : 'Follow' }}
                                            </li>
                                            <li
                                                v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                                class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-blue-600 hover:text-white"
                                                @click="handleClick('reportPhoto', photo.id, photo.user.id)"
                                            >
                                                <i class="fas fa-flag w-5 shrink-0" /> Report This Photo
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <div class="mb-8 text-center sm:text-left">
                <h2 class="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                    Featured Photographers
                </h2>
                <p class="mt-1 text-sm text-zinc-500">
                    Photographers we think you should check out
                </p>
            </div>
            <div class="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                <div
                    v-for="user in topUsers"
                    :key="user.id"
                    class="w-full max-w-[260px] rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 transition hover:-translate-y-1 hover:shadow-md"
                >
                    <div class="flex flex-col items-center">
                        <div
                            class="mx-auto h-[200px] w-full max-w-[210px] overflow-hidden rounded-2xl"
                            :class="userPreviewGridClass(user)"
                        >
                            <template v-if="user.photos.length > 0">
                                <img
                                    v-for="bg in user.photos.slice(0, 4)"
                                    :key="bg.id"
                                    :src="bg.image_url"
                                    class="h-full w-full object-cover"
                                    loading="lazy"
                                    decoding="async"
                                >
                            </template>
                            <div v-else class="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-200 text-zinc-500">
                                <i class="fa-regular fa-images text-4xl" />
                                <p class="text-sm font-medium">
                                    Content Unavailable
                                </p>
                            </div>
                        </div>
                        <NuxtLink :to="{ name: 'MyProfile', params: { username: user.username } }" class="-mt-8">
                            <img
                                :src="user.profile_picture"
                                alt=""
                                class="h-[70px] w-[70px] rounded-full border-4 border-white object-cover shadow-md"
                                loading="lazy"
                                decoding="async"
                            >
                        </NuxtLink>
                        <h4 class="mt-2 text-lg font-semibold text-zinc-900">
                            {{ user.name }}
                        </h4>
                        <button
                            type="button"
                            class="mt-3 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            @click="toggleFollowForTopUsers(user)"
                        >
                            {{ user.following ? 'Unfollow' : 'Follow' }}
                        </button>
                    </div>
                </div>
            </div>
        </section>

        <section>
            <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 class="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                        Top Categories
                    </h2>
                    <p class="mt-1 text-sm text-zinc-500">
                        Top categories most chosen by users
                    </p>
                </div>
                <NuxtLink :to="{ name: 'Category' }" class="shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700">
                    View All &gt;
                </NuxtLink>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <NuxtLink
                    v-for="category in topCategories"
                    :key="category.id"
                    :to="{ name: 'DetailsCategory', query: { slugs: category.slug } }"
                    class="group relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-zinc-900/5"
                >
                    <img
                        :src="category.image ? category.image : '/front_assets/img/default.jpg'"
                        :alt="category.category_name"
                        class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                    >
                    <div class="absolute inset-0 bg-black/45 transition group-hover:bg-black/60" />
                    <span class="absolute left-1/2 top-1/2 max-w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/55 px-3 py-1.5 text-center text-base font-semibold text-white">
                        {{ category.category_name }}
                    </span>
                </NuxtLink>
            </div>
        </section>

        <section class="pb-4">
            <div class="mb-6">
                <h2 class="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
                    Favorite Gallery
                </h2>
                <p class="mt-1 text-sm text-zinc-500">
                    Most popular photo collection by the community
                </p>
            </div>
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div
                    v-for="gallery in topLikedGalleries"
                    :key="gallery.id"
                    class="cursor-pointer overflow-hidden rounded-2xl border border-zinc-100 bg-white p-3 shadow-sm ring-1 ring-zinc-900/5 transition hover:shadow-md"
                    @click="goToGalleryDetails(gallery.galleries_code)"
                >
                    <div class="mb-2 flex items-start justify-between gap-2">
                        <h4 class="line-clamp-2 text-base font-semibold text-zinc-900">
                            {{ gallery.galleries_name }}
                        </h4>
                        <div class="flex shrink-0 items-center gap-1 rounded bg-[#45457c] px-2 py-1 text-xs text-white">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="shrink-0">
                                <path d="M15.5333 0H0.466667C0.2 0 0 0.2 0 0.466667V10.2V15.5333C0 15.8 0.2 16 0.466667 16H15.5333C15.8 16 16 15.8 16 15.5333V13.4V0.466667C16 0.2 15.8 0 15.5333 0ZM15.0667 0.933333V12.2667L10.5333 7.66667C10.4667 7.6 10.3333 7.53333 10.2 7.53333C10.0667 7.53333 9.93333 7.6 9.86667 7.66667L8.53333 9L5.8 6.2C5.6 6 5.33333 6 5.13333 6.13333L0.933333 9.26667V0.933333H15.0667ZM15.0667 15.0667H0.933333V10.4667L3.8 8.33333L5.86667 10.4C5.93333 10.4667 6.06667 10.5333 6.2 10.5333C6.33333 10.5333 6.46667 10.4667 6.53333 10.4C6.73333 10.2 6.73333 9.93333 6.53333 9.73333L4.53333 7.73333L5.4 7.06667L8.26667 9.93333L9.6 11.2667C9.66667 11.3333 9.8 11.4 9.93333 11.4C10.0667 11.4 10.2 11.3333 10.2667 11.2667C10.4667 11.0667 10.4667 10.8 10.2667 10.6L9.26667 9.6L10.2667 8.6L15.1333 13.5333V15.0667H15.0667Z" fill="white" />
                                <path d="M12.4003 5.33337C13.3337 5.33337 14.1337 4.53337 14.1337 3.60003C14.1337 2.6667 13.3337 1.8667 12.4003 1.8667C11.467 1.8667 10.667 2.6667 10.667 3.60003C10.667 4.53337 11.467 5.33337 12.4003 5.33337ZM12.4003 2.80003C12.8003 2.80003 13.2003 3.13337 13.2003 3.60003C13.2003 4.0667 12.867 4.40003 12.4003 4.40003C12.0003 4.40003 11.6003 4.0667 11.6003 3.60003C11.6003 3.13337 11.9337 2.80003 12.4003 2.80003Z" fill="white" />
                            </svg>
                            <span>{{ gallery.photo.length }}</span>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2.5 p-1">
                        <img
                            v-for="(p, index) in gallery.photo.slice(0, 4)"
                            :key="index"
                            :src="p.image_url"
                            class="h-24 w-full rounded-lg object-cover transition hover:scale-[1.02]"
                            :alt="'Gallery Image ' + (index + 1)"
                            loading="lazy"
                            decoding="async"
                        >
                    </div>
                    <div class="mt-2 flex items-center gap-3 border-t border-zinc-100 pt-3">
                        <img
                            class="h-10 w-10 shrink-0 rounded-full object-cover"
                            :src="gallery.user.profile_picture"
                            :alt="gallery.user.name"
                            loading="lazy"
                            decoding="async"
                        >
                        <h4 class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900">
                            {{ gallery.user.name }}
                        </h4>
                        <div class="flex shrink-0 gap-1">
                            <button
                                type="button"
                                class="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
                                @click.stop="toggleLikeGallery(gallery)"
                            >
                                <i :class="[gallery.liked ? 'fas' : 'fa-regular', 'fa-heart', { 'text-rose-400': gallery.liked }]" />
                            </button>
                            <button
                                v-if="gallery.user && userStore.user && gallery.user.id !== userStore.user.id"
                                type="button"
                                class="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
                                @click.stop="handleClick('reportGallery', gallery.id, gallery.user.id)"
                            >
                                <i class="fa-regular fa-flag" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
    </Transition>
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
    <ReportGalleryModal
        :is-visible="showReportGalleryModal"
        :gallery-id="selectedGalleryId"
        :violator-id="selectedViolatorId"
        @close="closeReportGalleryModal"
    />
</template>

<script>
import { waitRemainingSkeletonMs } from '~/composables/useSkeletonPlaceholder'
import { homeService } from '~/features/home/services/home.api.js'
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportPhotoModal from '~/features/photo/components/ReportPhotoModal.vue'
import ReportGalleryModal from '~/features/gallery/components/ReportGalleryModal.vue'
import { useLikeStore } from '~/stores/likeStore';
import { useAuthStore } from '~/stores/authStore';
import { useFollowStore } from '~/stores/followStore';
import { useUserStore } from '~/stores/userStore';
import { useBlockStore } from '~/stores/blockStore';
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export default {
    name: 'HomeExplore',
    props: {
        users: Array,
    },
    components: {
        AddToGalleryModal,
        ReportPhotoModal,
        ReportGalleryModal
    },
    data() {
        return {
            /** false đến khi các API explore + store xong — skeleton shimmer, không dùng cho tải thêm trang */
            pageReady: false,
            activeDropdown: null,
            topLikedPhotos: [],
            topUsers: [],
            topCategories: [],
            topLikedGalleries: [],
            showAddToGallery: false,
            showReportModal: false,
            showReportGalleryModal: false,
            selectedPhotoId: null,
            selectedViolatorId: null,
            selectedGalleryId: null,
        };
    },
    async mounted() {
        const skeletonStartedAt = Date.now();
        try {
            await this.fetchTopLikedPhotos();
            await this.fetchTopUsers();
            await this.fetchTopCategories();
            await this.fetchTopLikedGalleries();

            const userStore = useUserStore();
            await userStore.fetchUserData();

            const likeStore = useLikeStore();
            await likeStore.fetchLikedGalleries();
            this.updateLikedState();
            this.updateLikedGalleriesState();
            this.updateFollowingStateForTopUsers();

            const followStore = useFollowStore();
            await followStore.fetchFollowingList();
            this.updateFollowingState();

            const blockStore = useBlockStore();
            await blockStore.fetchBlockedUsers();
            this.updateBlockedState();

            const notifData = localStorage.getItem('blockNotification');
            if (notifData) {
                const { message, description, duration } = JSON.parse(notifData);
                notification.success({
                    message,
                    description,
                    placement: 'topRight',
                    duration,
                });
                localStorage.removeItem('blockNotification');
            }
        } finally {
            await waitRemainingSkeletonMs(skeletonStartedAt);
            this.pageReady = true;
        }
    },
    computed: {
        likeStore() {
            return useLikeStore();
        },
        userStore() {
            return useUserStore();
        }
    },
    methods: {
        async fetchTopLikedPhotos() {
            try {
                const token = localStorage.getItem("token");
                let headers = {};
                if (token) {
                    headers = { Authorization: `Bearer ${token}` };
                }
                const response = await homeService.fetchTopLikedPhotos({ headers });
                console.log('Dữ liệu từ API:', response.data);
                this.topLikedPhotos = response.data.data.map(photo => ({
                    ...photo,
                    liked: false, // Khởi tạo trạng thái liked
                    following: false, // Khởi tạo trạng thái following
                    blocked: false // Khởi tạo trạng thái blocked
                })) || [];
            } catch (error) {
                console.error("Lỗi khi lấy danh sách ảnh được thích nhiều nhất:", error);
                this.topLikedPhotos = [];
            }
        },
        async fetchTopUsers() {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const response = await homeService.fetchTopUsersWithPhotos({ headers });
                this.topUsers = response.data.top_users.map(user => ({
                    ...user,
                    following: false
                })) || [];
                console.log('Fetched Top Users:', this.topUsers);
            } catch (error) {
                console.error("Lỗi khi lấy danh sách top users:", error);
                this.topUsers = [];
            }
        },
        async fetchTopCategories() {
            try {
                const response = await homeService.fetchTopCategories();
                this.topCategories = response.data || []; // Lấy trực tiếp mảng danh mục
            } catch (error) {
                console.error("Lỗi khi lấy danh mục:", error);
            }
        },
        async fetchTopLikedGalleries() {
            try {
                const token = localStorage.getItem("token");
                let headers = {};
                if (token) {
                    headers = { Authorization: `Bearer ${token}` };
                }
                const response = await homeService.fetchTopLikedGalleries({ headers });
                this.topLikedGalleries = response.data.data.map(gallery => ({
                    ...gallery,
                    liked: false // Khởi tạo trạng thái liked
                })) || [];
            } catch (error) {
                console.error("Lỗi khi lấy danh sách gallery được thích nhiều nhất:", error);
                this.topLikedGalleries = [];
            }
        },
        async toggleLikeGallery(gallery) {
            if (!await this.checkLogin()) return;

            try {
                if (gallery.liked) {
                    await this.likeStore.unlikeGallery(gallery.id);
                    gallery.liked = false;
                } else {
                    await this.likeStore.likeGallery(gallery.id, gallery.user ? gallery.user.id : null);
                    gallery.liked = true;
                }
            } catch (error) {
                console.error('Failed to toggle like on gallery:', error);
            }
        },
        updateLikedGalleriesState() {
            this.topLikedGalleries.forEach(gallery => {
                gallery.liked = this.likeStore.likedGalleries.includes(gallery.id);
            });
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
        async handleClick(action, itemId, violatorId) {
            if (!await this.checkLogin()) return;

            switch (action) {
                case 'addToGallery':
                    this.openAddToGalleryModal(itemId);
                    break;
                case 'reportPhoto':
                    this.openReportModal(itemId, violatorId);
                    break;
                case 'reportGallery': // Thêm case cho report gallery
                    this.openReportGalleryModal(itemId, violatorId);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            this.topLikedPhotos.forEach(photo => {
                photo.liked = likeStore.likedPhotos.includes(photo.id);
            });
        },
        async toggleLike(photo) {
            if (!await this.checkLogin()) return;

            const photo_id = photo.id;
            const photo_user_id = photo.user.id;
            const likeStore = useLikeStore();

            try {
                if (photo.liked) {
                    await likeStore.unlikePhoto(photo_id);
                } else {
                    await likeStore.likePhoto(photo_id, photo_user_id);
                }
                photo.liked = !photo.liked;
            } catch (error) {
                console.error('Failed to toggle like:', error);
            }
        },
        updateFollowingState() {
            const followStore = useFollowStore();
            this.topLikedPhotos.forEach(photo => {
                photo.following = followStore.followingList.includes(photo.user.id);
            });
        },
        async toggleFollow(photo) {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            const userId = photo.user.id;
            const username = photo.user.username;

            if (photo.following) {
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(userId);
                            photo.following = false;
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
                    }
                });
            } else {
                try {
                    await followStore.followUser(userId);
                    photo.following = true;
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
        updateFollowingStateForTopUsers() {
            const followStore = useFollowStore();
            this.topUsers.forEach(user => {
                user.following = followStore.followingList.includes(user.id);
            });
        },
        async toggleFollowForTopUsers(user) {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            const username = user.username;

            if (user.following) {
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer. You will no longer see their content in your For You feed.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(user.id);
                            user.following = false;
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
                                description: `Failed to unfollow ${username}.`,
                                placement: 'topRight',
                                duration: 3,
                            });
                        }
                    }
                });
            } else {
                try {
                    await followStore.followUser(user.id);
                    user.following = true;
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
                        description: `Failed to follow ${username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                }
            }
        },
        updateBlockedState() {
            const blockStore = useBlockStore();
            this.topLikedPhotos.forEach(photo => {
                photo.blocked = blockStore.blockedUsers.includes(photo.user.id);
            });
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

                // Reload trang sau khi lưu thông báo
                window.location.reload();
            } catch (error) {
                console.error("Error toggling block:", error);
            }
        },
        toggleDropdown(id) {
            if (this.activeDropdown === id) {
                this.activeDropdown = null;
            } else {
                this.activeDropdown = id;
            }
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
        openReportGalleryModal(galleryId, violatorId) {
            this.selectedGalleryId = galleryId;
            this.selectedViolatorId = violatorId;
            this.showReportGalleryModal = true;
        },
        closeReportGalleryModal() {
            this.showReportGalleryModal = false;
            this.selectedGalleryId = null;
            this.selectedViolatorId = null;
        },
        goToGalleryDetails(galleries_code) {
            this.$router.push({ name: 'GalleryDetailsUser', params: { galleries_code } });
        },
        userPreviewGridClass(user) {
            const n = user.photos?.length ?? 0
            if (n === 0) return ''
            if (n === 1) return 'grid grid-cols-1 grid-rows-1'
            if (n === 2) return 'grid grid-cols-1 grid-rows-2 gap-2'
            return 'grid grid-cols-2 grid-rows-2 gap-2'
        },
    },
    watch: {
        topLikedPhotos: {
            handler() {
                this.updateLikedState();
                this.updateFollowingState();
                this.updateBlockedState();
            },
            deep: true,
            immediate: true
        },
        topUsers: {
            handler() {
                this.updateFollowingStateForTopUsers();
            },
            deep: true,
            immediate: true
        },
        topLikedGalleries: {
            handler() {
                this.updateLikedGalleriesState();
            },
            deep: true,
            immediate: true
        }
    },
};
</script>
