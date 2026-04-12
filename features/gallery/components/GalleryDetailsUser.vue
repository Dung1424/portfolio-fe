<template>
    <!-- API 404 (gallery/owner không tồn tại, khóa, block…) hoặc chủ gallery nằm trong danh sách chặn (JWT) -->
            <div
                v-if="showGalleryUnavailable"
                class="flex min-h-screen flex-col items-center justify-center bg-[#f7f8fa] px-6 py-16 text-center [font-family:ui-sans-serif,system-ui,sans-serif]"
            >
                <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-500">
                    <i class="fa-regular fa-images text-[2.25rem]" aria-hidden="true" />
                </div>
                <h1 class="mb-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[1.75rem]">
                    Gallery not available
                </h1>
                <p class="max-w-md text-base leading-relaxed text-zinc-600">
                    This gallery could not be found. It may have been removed, the owner’s account is unavailable, or the link is incorrect.
                </p>
                <NuxtLink
                    :to="{ name: 'Index' }"
                    class="mt-8 inline-flex items-center justify-center rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                >
                    Back to home
                </NuxtLink>
            </div>
            <div v-else class="bg-white p-5">
                <h1 class="mt-[10px] text-center text-2xl text-[#333]">{{ gallery.galleries_name || 'no title' }}</h1>
                <h1 class="mt-[10px] text-center text-2xl text-[#333]">{{ gallery.galleries_description || 'no description' }}</h1>
                <div class="mt-[10px] flex justify-center gap-[10px]">
                     <span class="cursor-pointer text-xl" @click="toggleLikeGallery">
            <i :class="[gallery.liked ? 'fas' : 'fa-regular', 'fa-heart', gallery.liked ? 'text-[#ff5a5f]' : '']"></i>
            {{ gallery.total_likes }} Likes
          </span>
                    <span class="cursor-pointer text-xl" @click="copyUrl"><i class="fa-solid fa-share-nodes"></i></span>
                    <span class="cursor-pointer text-xl" @click="openReportGalleryModal"><i class="fa-regular fa-flag"></i></span>
                </div>

                <!-- Thông tin chủ gallery -->
                <div class="mt-[10px] flex items-center" v-if="gallery.user">
                    <NuxtLink :to="{ name: 'MyProfile', params: { username: gallery.user.username } }">
                        <img
                            class="h-10 w-10 rounded-full border border-[#ccc]"
                            :src="gallery.user.profile_picture || '/images/imageUserDefault.png'"
                            alt="User Avatar"
                        />
                    </NuxtLink>
                    <span class="ml-[10px] text-base font-bold text-[#333]">{{ gallery.user.name || gallery.user.username }}</span>
                </div>

                <!-- Danh sách ảnh trong gallery -->
                <div class="mt-5 grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-4" v-if="gallery.photo && gallery.photo.length">
                    <div class="group relative h-[200px] w-full overflow-visible rounded-lg shadow-[0_2px_5px_rgba(0,0,0,0.1)]" v-for="photo in gallery.photo" :key="photo.id">
                        <img :src="photo.image_url" :alt="photo.title" class="h-full w-full rounded-lg object-cover" />
                        <div class="absolute bottom-0 left-0 right-0 flex h-[50px] items-center bg-gradient-to-b from-black/30 to-black/60 p-[10px] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <NuxtLink :to="{ name: 'MyProfile', params: { username: photo.user.username } }">
                                <img
                                    class="mr-[10px] h-[30px] w-[30px] rounded-full object-cover"
                                    :src="photo.user?.profile_picture || '/images/imageUserDefault.png'"
                                    alt="User Avatar"
                                />
                            </NuxtLink>
                            <span class="mr-auto mt-[10px] inline-block max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap text-[17px] text-white">{{ photo.user?.name || photo.user?.username || 'Unknown' }}</span>
                            <span class="ml-[15px] shrink-0 cursor-pointer text-xl text-white" @click.stop="toggleLike(photo)">
                                <i :class="['fas', 'fa-heart', photo.liked ? 'text-[#ff5a5f]' : '']"></i>
                            </span>
                            <span
                                class="ml-[15px] shrink-0 cursor-pointer text-xl text-white"
                                @click.stop="toggleDropdown('dropdown-' + photo.id)"
                            >
                                <i class="fas fa-ellipsis-h"></i>
                            </span>
                        </div>
                        <div
                            v-if="activeDropdown === 'dropdown-' + photo.id"
                            class="absolute bottom-14 right-2 z-[9999] min-w-[220px] overflow-hidden rounded-lg bg-white shadow-[0_4px_8px_rgba(0,0,0,0.1)]"
                            @click.stop
                        >
                            <ul class="m-0 flex list-none flex-col p-0">
                                <li class="flex cursor-pointer items-center whitespace-nowrap px-[25px] py-[15px] text-[#222] transition hover:bg-[#1890ff] hover:text-white" @click="handleClick('addToGallery', photo.id)">
                                    <i class="fa-solid fa-plus"></i> Add to Gallery
                                </li>
                                <li
                                    v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                    class="flex cursor-pointer items-center whitespace-nowrap px-[25px] py-[15px] text-[#222] transition hover:bg-[#1890ff] hover:text-white"
                                    @click="toggleBlockUser(photo.user)"
                                >
                                    <i class="fas fa-user-slash"></i>
                                    {{ photo.blocked ? 'Unblock' : 'Block' }}
                                </li>
                                <li
                                    v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                    class="flex cursor-pointer items-center whitespace-nowrap px-[25px] py-[15px] text-[#222] transition hover:bg-[#1890ff] hover:text-white"
                                    @click="toggleFollow(photo)"
                                >
                                    <i :class="['fas', photo.following ? 'fa-user-minus' : 'fa-user-plus']"></i>
                                    {{ photo.following ? 'Unfollow' : 'Follow' }}
                                </li>
                                <li
                                    v-if="photo.user && userStore.user && photo.user.id !== userStore.user.id"
                                    class="flex cursor-pointer items-center whitespace-nowrap px-[25px] py-[15px] text-[#222] transition hover:bg-[#1890ff] hover:text-white"
                                    @click="handleClick('reportPhoto', photo.id, photo.user.id)"
                                >
                                    <i class="fa-solid fa-flag"></i> Report this photo
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
                <!-- Nếu không có ảnh -->
                <div v-else class="mt-5 text-center text-[#888]">
                    <p>No photos in this gallery.</p>
                </div>

                <!-- Modal Add to Gallery -->
                <AddToGalleryModal
                    :is-visible="showAddToGallery"
                    :photo-id="selectedPhotoId"
                    @close="closeAddToGalleryModal"
                />
                <ReportGalleryModal
                    :is-visible="showReportGalleryModal"
                    :gallery-id="gallery.id"
                    :violator-id="gallery.user ? gallery.user.id : null"
                    @close="closeReportGalleryModal"
                />
                <ReportPhotoModal
                    :is-visible="showReportPhotoModal"
                    :photo-id="selectedPhotoId"
                    :violator-id="selectedViolatorId"
                    @close="closeReportPhotoModal"
                />
            </div>
</template>

<script>
import { galleryService } from '~/features/gallery/services/gallery.api.js'
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportGalleryModal from '~/features/gallery/components/ReportGalleryModal.vue'
import ReportPhotoModal from '~/features/photo/components/ReportPhotoModal.vue'
import { useLikeStore } from '~/stores/likeStore';
import { useAuthStore } from '~/stores/authStore';
import { useFollowStore } from '~/stores/followStore';
import { useUserStore } from '~/stores/userStore';
import { useBlockStore } from '~/stores/blockStore';
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export default {
    name: "GalleryDetailsUser",
    components: {
        AddToGalleryModal,
        ReportGalleryModal,
        ReportPhotoModal
    },
    data() {
        return {
            gallery: {},
            /** GET Gallery/DetailByCode trả 404 (gallery không có, chủ không tồn tại / khóa / block…) */
            galleryUnavailable: false,
            activeDropdown: null,
            showAddToGallery: false,
            selectedPhotoId: null,
            showReportGalleryModal: false,
            showReportPhotoModal: false,
            selectedViolatorId: null,
        };
    },
    async mounted() {
        await this.loadGalleryPage();
    },
    computed: {
        userStore() {
            return useUserStore();
        },
        blockStore() {
            return useBlockStore();
        },
        // Kiểm tra xem chủ gallery có bị chặn hay không
        isGalleryOwnerBlocked() {
            if (this.gallery.user && this.blockStore.blockedUsers) {
                return this.blockStore.blockedUsers.includes(this.gallery.user.id);
            }
            return false;
        },
        showGalleryUnavailable() {
            return this.galleryUnavailable || this.isGalleryOwnerBlocked;
        },
    },
    methods: {
        async loadGalleryPage() {
            const galleries_code = this.$route.params.galleries_code;
            if (!galleries_code) {
                this.galleryUnavailable = true;
                this.gallery = {};
                return;
            }
            this.galleryUnavailable = false;
            await this.fetchGalleryDetails(galleries_code);
            if (this.galleryUnavailable) {
                return;
            }

            const userStore = useUserStore();
            await userStore.fetchUserData();

            const blockStore = useBlockStore();
            await blockStore.fetchBlockedUsers();
            this.updateBlockedState();
            if (this.showGalleryUnavailable) {
                return;
            }

            const likeStore = useLikeStore();
            await likeStore.fetchLikedPhotos();
            await likeStore.fetchLikedGalleries();
            this.updateLikedState();

            const followStore = useFollowStore();
            await followStore.fetchFollowingList();
            this.updateFollowingState();

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
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },
        async fetchGalleryDetails(code) {
            try {
                const token = localStorage.getItem("token");
                let headers = {};
                if (token) {
                    headers = { Authorization: `Bearer ${token}` };
                }
                const response = await galleryService.fetchPublicByCode(code, { headers });
                const d = response.data;
                this.gallery = d?.data ?? d;
                this.galleryUnavailable = false;
                if (this.gallery) {
                    this.updateLikedState();
                    this.updateFollowingState();
                    this.updateBlockedState();
                }
            } catch (error) {
                console.error("Error fetching gallery details:", error);
                const status = error.response?.status;
                if (status === 404) {
                    this.galleryUnavailable = true;
                    this.gallery = {};
                } else if (status === 401) {
                    notification.warning({
                        message: 'Session',
                        description: 'Please sign in again to continue.',
                        placement: 'topRight',
                        duration: 4,
                    });
                }
            }
        },
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            if (!authStore.isLoggedIn) {
                this.$router.push({name: 'Login'});
                return false;
            }
            return true;
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            if (this.gallery) {
                // Gán trạng thái liked cho gallery (dựa vào store.likedGalleries)
                this.gallery.liked = likeStore.likedGalleries.includes(this.gallery.id);
            }
            // Nếu gallery có mảng photo, cũng cập nhật trạng thái liked cho từng photo
            if (this.gallery.photo) {
                this.gallery.photo.forEach(photo => {
                    photo.liked = likeStore.likedPhotos.includes(photo.id);
                });
            }
        },
        updateFollowingState() {
            const followStore = useFollowStore();
            if (this.gallery.photo) {
                this.gallery.photo.forEach(photo => {
                    photo.following = followStore.followingList.includes(photo.user.id);
                });
            }
        },
        updateBlockedState() {
            const blockStore = useBlockStore();
            if (this.gallery.photo) {
                this.gallery.photo.forEach(photo => {
                    photo.blocked = blockStore.blockedUsers.includes(photo.user.id);
                });
            }
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
                notification.error({
                    message: 'Error',
                    description: 'Failed to toggle like.',
                    placement: 'topRight',
                    duration: 3,
                });
            }
        },
        async toggleLikeGallery() {
            if (!await this.checkLogin()) return;
            const likeStore = useLikeStore();
            try {
                if (this.gallery.liked) {
                    await likeStore.unlikeGallery(this.gallery.id);
                    this.gallery.liked = false;
                    // Giảm tổng số like
                    this.gallery.total_likes = Math.max((this.gallery.total_likes || 1) - 1, 0);
                } else {
                    await likeStore.likeGallery(this.gallery.id, this.gallery.user ? this.gallery.user.id : null);
                    this.gallery.liked = true;
                    // Tăng tổng số like
                    this.gallery.total_likes = (this.gallery.total_likes || 0) + 1;
                }
            } catch (error) {
                console.error('Failed to toggle like on gallery:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to toggle like on gallery.',
                    placement: 'topRight',
                    duration: 3,
                });
            }
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
                    },
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
                        description: `${user.username} has been blocked.`,
                        duration: 3,
                    }));
                }
                this.updateBlockedState();
                window.location.reload();
            } catch (error) {
                console.error("Error toggling block:", error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to toggle block.',
                    placement: 'topRight',
                    duration: 3,
                });
            }
        },
        copyUrl() {
            const url = window.location.href;
            navigator.clipboard.writeText(url)
                .then(() => {
                    notification.success({
                        message: 'Success',
                        description: 'Link copied successfully!',
                        placement: 'topRight',
                        duration: 3,
                    });
                })
                .catch(err => {
                    console.error("Failed to copy URL:", err);
                    notification.error({
                        message: 'Error',
                        description: 'Failed to copy the URL.',
                        placement: 'topRight',
                        duration: 3,
                    });
                });
        },
        openAddToGalleryModal(photoId) {
            this.selectedPhotoId = photoId;
            this.showAddToGallery = true;
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false;
        },
        openReportGalleryModal() {
            if (!this.checkLogin()) return;
            this.showReportGalleryModal = true;
        },
        closeReportGalleryModal() {
            this.showReportGalleryModal = false;
        },
        openReportPhotoModal(photoId, violatorId) {
            if (!this.checkLogin()) return;
            this.selectedPhotoId = photoId;
            this.selectedViolatorId = violatorId;
            this.showReportPhotoModal = true;
        },
        closeReportPhotoModal() {
            this.showReportPhotoModal = false;
            this.selectedPhotoId = null;
            this.selectedViolatorId = null;
        },
        handleClick(action, photoId, violatorId) {
            if (!this.checkLogin()) return;
            switch (action) {
                case 'addToGallery':
                    this.openAddToGalleryModal(photoId);
                    break;
                case 'reportPhoto':
                    this.openReportPhotoModal(photoId, violatorId);
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        },
    },
    watch: {
        '$route.params.galleries_code': {
            handler() {
                this.loadGalleryPage();
            },
        },
        'gallery.photo': {
            handler() {
                this.updateLikedState();
                this.updateFollowingState();
                this.updateBlockedState();
            },
            deep: true,
            immediate: true,
        },
    },
};
</script>
