<template>
    <!-- Nếu user của ảnh bị block, hiển thị placeholder -->
                <div v-if="isPhotoUserBlocked" class="flex h-screen flex-col items-center justify-center bg-[#f5f5f5] text-center">
                    <i class="fa-solid fa-circle-xmark mb-5 text-[50px] text-[#ff4d4f]"></i>
                    <h2 class="mb-2.5 text-[28px] text-[#333]">Something went wrong</h2>
                    <p class="text-base text-[#666]">Please refresh the page to try again.</p>
                </div>
            <!-- 500px: nền trang #f7f8fa; cột phải thêm nền nhạt hơn một chút (#eff1f5) + padding; card trong sidebar = trắng -->
            <div v-else class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]">
                <div class="mx-auto w-full max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
                    <div class="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
                        <!-- Cột trái: mobile — pb để không khuất thanh action cố định -->
                        <div class="min-w-0 space-y-8 max-lg:pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:col-span-9">
                            <!-- Ảnh chính -->
                            <div
                                class="group relative overflow-hidden rounded-2xl bg-[#111] shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
                                @mouseenter="isHovered = true"
                                @mouseleave="isHovered = false"
                                @click="openFullScreen"
                            >
                                <img
                                    :src="photoDetail.image_url"
                                    alt=""
                                    class="max-h-[50vh] w-full cursor-zoom-in object-cover sm:max-h-[60vh] lg:max-h-[min(75vh,880px)]"
                                />
                                <div
                                    v-if="isHovered"
                                    class="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-md backdrop-blur-sm transition duration-200 hover:bg-white"
                                    @click.stop="openFullScreen"
                                >
                                    <i class="fa-solid fa-up-right-and-down-left-from-center text-xs"></i>
                                </div>
                            </div>

                            <!-- Mobile: meta cột phải — ngay sau ảnh (chỉ khi < lg; tránh 2 form comment) -->
                            <div class="space-y-4 rounded-2xl bg-[#eff1f5] p-3 sm:p-4 lg:hidden">
                                <PhotoDetailSidebarBody v-if="!layoutDesktop" ref="sidebarBody" />
                            </div>

                            <!-- Similar photos -->
                            <section class="space-y-4">
                                <div class="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
                                    <h2 class="text-lg font-bold tracking-tight text-[#222] sm:text-[1.25rem]">Similar photos</h2>
                                </div>
                                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
                                    <div v-for="photo in similarPhotos" :key="photo.id" class="group relative aspect-[3/2] overflow-hidden rounded-lg bg-neutral-100 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]">
                                        <NuxtLink :to="{ name: 'PhotoDetail', params: { token: photo.photo_token } }" class="absolute inset-0 z-0 block">
                                            <img
                                                :src="photo.image_url"
                                                alt=""
                                                class="h-full w-full object-cover transition duration-200 ease-out group-hover:scale-[1.02]"
                                            />
                                        </NuxtLink>
                                        <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 pt-6 opacity-0 transition duration-200 ease-out group-hover:pointer-events-auto group-hover:opacity-100 sm:p-2.5 sm:pt-8">
                                            <div class="flex items-center gap-1.5 text-xs text-white sm:text-sm">
                                                <NuxtLink
                                                    :to="{ name: 'MyProfile', params: { username: photo.user.username } }"
                                                    class="pointer-events-auto h-7 w-7 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30"
                                                    @click.stop
                                                >
                                                    <img class="h-full w-full object-cover" :src="photo.user.profile_picture" alt="">
                                                </NuxtLink>
                                                <span class="min-w-0 flex-1 truncate font-medium">{{ photo.user.name }}</span>
                                                <button
                                                    type="button"
                                                    class="pointer-events-auto rounded-md p-1 hover:bg-white/10"
                                                    @click.stop="handleClick('toggleLike', photo)"
                                                >
                                                    <i :class="['fas fa-heart text-sm', photo.liked ? 'text-[#ff5a5f]' : 'text-white']"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    class="pointer-events-auto rounded-md p-1 hover:bg-white/10"
                                                    @click.stop="handleClick('addToGallery', photo.id)"
                                                >
                                                    <i class="fa-regular fa-square-plus text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <!-- Featured in Galleries -->
                            <section v-if="relatedGalleries.length > 0" class="space-y-4">
                                <div class="flex items-end justify-between gap-4 border-b border-neutral-200 pb-3">
                                    <h2 class="text-lg font-bold tracking-tight text-[#222] sm:text-[1.25rem]">Featured in these galleries</h2>
                                </div>
                                <div class="grid gap-4 sm:grid-cols-2">
                                    <article
                                        v-for="gallery in relatedGalleries"
                                        :key="gallery.id"
                                        class="cursor-pointer rounded-2xl border border-[#eee] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition duration-200 ease-out hover:border-neutral-300 hover:shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
                                        @click="goToGalleryDetails(gallery.galleries_code)"
                                    >
                                        <div class="mb-3 flex items-start justify-between gap-2">
                                            <h3 class="line-clamp-2 text-base font-semibold text-zinc-900">{{ gallery.galleries_name }}</h3>
                                            <div class="flex shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                                                <i class="fa-regular fa-images text-[11px] opacity-80" aria-hidden="true"></i>
                                                <span>{{ gallery.photos.length }}</span>
                                            </div>
                                        </div>
                                        <div class="grid grid-cols-2 gap-2">
                                            <img
                                                v-for="(photo, index) in gallery.photos.slice(0, 4)"
                                                :key="photo.id"
                                                :src="photo.image_url"
                                                :alt="`Gallery ${gallery.id} ${index + 1}`"
                                                class="aspect-[3/2] w-full rounded-lg object-cover ring-1 ring-black/[0.04]"
                                            />
                                        </div>
                                        <div class="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3">
                                            <NuxtLink
                                                :to="{ name: 'MyProfile', params: { username: gallery.user.username } }"
                                                class="flex min-w-0 items-center gap-2"
                                                @click.stop
                                            >
                                                <img
                                                    class="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-zinc-100"
                                                    :src="gallery.user?.profile_picture || '/front_assets/img/user1.jpeg'"
                                                    alt=""
                                                />
                                                <span class="truncate text-sm font-medium text-zinc-800">{{ gallery.user?.name || 'Unknown' }}</span>
                                            </NuxtLink>
                                            <div class="flex shrink-0 gap-1">
                                                <button
                                                    type="button"
                                                    class="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-[#ff5a5f]"
                                                    @click.stop="toggleLikeGallery(gallery)"
                                                >
                                                    <i :class="['fa-heart', gallery.liked ? 'fas text-[#ff5a5f]' : 'far']"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    class="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100"
                                                    @click.stop="openReportGalleryModal(gallery.id, gallery.user.id)"
                                                >
                                                    <i class="fa-regular fa-flag"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            </section>
                        </div>
                        <!-- Sidebar: chỉ desktop — sticky; mobile dùng meta trong cột trái + action bar cố định dưới -->
                        <aside
                            class="hidden min-w-0 rounded-2xl bg-[#eff1f5] p-3 sm:p-4 lg:col-span-3 lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:self-start lg:pb-4"
                        >
                            <div class="w-full space-y-4">
                                <PhotoDetailActionsBar :dropdown-up="false" />
                                <PhotoDetailSidebarBody v-if="layoutDesktop" ref="sidebarBody" />
                            </div>
                        </aside>
                    </div>
                </div>
                <!-- Mobile: chỉ 4 nút — cố định cuối viewport -->
                <div
                    class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200/80 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.14)] backdrop-blur-sm lg:hidden"
                >
                    <PhotoDetailActionsBar :dropdown-up="true" />
                </div>
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
            <ReportCommentModal
                :is-visible="showReportCommentModal"
                :comment-id="selectedCommentId"
                :violator-id="selectedViolatorId"
                @close="closeReportCommentModal"
            />
            <ReportGalleryModal
                :is-visible="showReportGalleryModal"
                :gallery-id="selectedGalleryId"
                :violator-id="selectedViolatorId"
                @close="closeReportGalleryModal"
            />
            <div v-if="likesPopupVisible" class="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50 p-4" @click.self="closeLikesPopup">
                <div ref="popupContent" class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200/60">
                    <div class="flex items-center justify-between border-b-2 border-[#eee] px-5 py-4">
                        <h3 class="m-0 text-xl font-bold text-[#333]">Liked by</h3>
                        <button type="button" class="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[34px] leading-none text-[#666]" @click="closeLikesPopup">×</button>
                    </div>
                    <div v-if="likedUsers.length > 0" class="p-4">
                        <div v-for="user in likedUsers" :key="user.id" class="flex items-center border-b-2 border-[#eee] py-4">
                            <NuxtLink :to="{ name: 'MyProfile', params: { username: user.username } }">
                                <img :src="user.profile_picture ? `${apiOrigin}/images/avatars/${user.profile_picture.split('/').pop()}` : '/images/imageUserDefault.png'"
                                     alt="Avatar"
                                     class="mr-4 h-10 w-10 shrink-0 rounded-full object-cover" />
                            </NuxtLink>
                            <div class="min-w-0 flex-1">
                                <span class="block text-base font-bold text-[#333]">{{ user.username }}</span>
                                <span class="block text-sm text-[#666]">{{ user.followers_count || 0 }} Followers</span>
                            </div>
                            <button
                                v-if="userStore.user && user.id !== userStore.user.id"
                                type="button"
                                class="ml-4 shrink-0 cursor-pointer rounded-full border-0 bg-[#007bff] px-4 py-2 text-sm text-white hover:bg-[#0056b3]"
                                @click.stop="toggleFollowUser(user.username)"
                            >
                                {{ followStore.followingList.includes(user.id) ? 'Unfollow' : 'Follow' }}
                            </button>
                        </div>
                    </div>
                    <div v-else class="p-8 text-center text-base text-[#666]">No likes found.</div>
                </div>
            </div>
</template>

<script>
import { photoService } from '~/features/photo/services/photo.api.js'
import { useFollowStore } from '~/stores/followStore';
import { useCommentStore } from '~/stores/commentStore';
import { useLikeStore } from '~/stores/likeStore';
import { useAuthStore } from '~/stores/authStore';
import { useUserStore } from '~/stores/userStore';
import { useBlockStore } from '~/stores/blockStore';
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportPhotoModal from '~/features/photo/components/ReportPhotoModal.vue'
import ReportCommentModal from '~/features/photo/components/ReportCommentModal.vue'
import ReportGalleryModal from '~/features/gallery/components/ReportGalleryModal.vue'
import PhotoDetailSidebarBody from '~/features/photo/components/PhotoDetailSidebarBody.vue'
import PhotoDetailActionsBar from '~/features/photo/components/PhotoDetailActionsBar.vue'
import { Modal, notification } from 'ant-design-vue';
import { h } from 'vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';

export default {
    name: "PhotoDetail",
    components: {
        AddToGalleryModal,
        ReportPhotoModal,
        ReportCommentModal,
        ReportGalleryModal,
        PhotoDetailSidebarBody,
        PhotoDetailActionsBar,
    },
    provide() {
        return {
            pd: this,
        }
    },
    data() {
        return {
            isHovered: false,
            photoDetail: {
                title: "",
                description: "",
                location: "",
                upload_date: "",
                total_views: "",
                image_url: "",
                liked: false,
                user: {
                    username: "",
                    profile_picture: "",
                    bio: "",
                },
                category: {
                    category_name: "",
                },
            },
            newComment: '',
            isPosting: false,
            showButtons: false,
            activeDropdown: null,
            categories: [],
            showAddToGallery: false,
            selectedPhotoId: null,
            isPhotoUserBlocked: false,
            photoLikesCount: 0,
            likesPopupVisible: false,
            likedUsers: [],
            /** Pagination cho popup "Liked by" — tách khỏi currentPage/lastPage của comment (computed) */
            likesCurrentPage: 1,
            likesLastPage: 1,
            totalLikes: 0,
            loading: false,
            showReportModal: false,
            selectedCommentId: null,
            showReportCommentModal: false,
            showReportGalleryModal: false,
            selectedGalleryId: null,
            selectedViolatorId: null,
            similarPhotos: [],
            relatedGalleries: [],
            /** Chỉ mount một bản sidebar (mobile vs desktop) — tránh 2 ô comment / ref trùng */
            layoutDesktop: false,
        };
    },
    watch: {
        '$route.params.token': {
            immediate: true,
            async handler(newToken) {
                if (!newToken) {
                    return
                }
                try {
                    const commentStore = useCommentStore()
                    await commentStore.fetchComments(newToken, 1)
                    await this.fetchCategories()

                    const tokenFromLocalStorage = localStorage.getItem('token')
                    if (tokenFromLocalStorage) {
                        const likeStore = useLikeStore()
                        await likeStore.fetchLikedPhotos()
                        await likeStore.fetchLikedGalleries()
                        const followStore = useFollowStore()
                        await followStore.fetchFollowingList()
                    }

                    await this.fetchPhotoDetail(newToken)
                    await this.fetchPhotoLikes(newToken)
                    await this.fetchSimilarPhotos(newToken)
                    await this.fetchRelatedGalleries(newToken)

                    this.updateLikedState()
                    this.updateLikedGalleriesState()

                    const blockStore = useBlockStore()
                    await blockStore.fetchBlockedUsers()
                    this.isPhotoUserBlocked = blockStore.blockedUsers.includes(this.photoDetail.user.id)
                } catch (error) {
                    console.error('Error loading photo detail:', error)
                }
            },
        },
        likesPopupVisible(newVal) {
            if (newVal) {
                this.$nextTick(() => {
                    const popupContent = this.$refs.popupContent;
                    if (popupContent) {
                        popupContent.addEventListener('scroll', this.handleScroll);
                    }
                });
            } else {
                const popupContent = this.$refs.popupContent;
                if (popupContent) {
                    popupContent.removeEventListener('scroll', this.handleScroll);
                }
                // Reset pagination (likes popup)
                this.likedUsers = [];
                this.likesCurrentPage = 1;
                this.likesLastPage = 1;
                this.totalLikes = 0;
            }
        },
    },
    computed: {
        isFollowing() {
            return this.photoDetail.user?.id
                && useFollowStore().followingList.includes(this.photoDetail.user.id);
        },
        comments() {
            const commentStore = useCommentStore();
            return commentStore.comments;
        },
        currentPage() {
            const commentStore = useCommentStore();
            return commentStore.currentPage;
        },
        lastPage() {
            const commentStore = useCommentStore();
            return commentStore.lastPage;
        },
        total() {
            const commentStore = useCommentStore();
            return commentStore.total;
        },
        formattedViews() {
            const views = this.photoDetail.total_views;
            if (views >= 1000000) {
                return (views / 1000000).toFixed(1) + "M";
            } else if (views >= 1000) {
                return (views / 1000).toFixed(1) + "K";
            }
            return views;
        },
        formattedPhotoLikes() {
            const likes = this.photoLikesCount;
            if (likes >= 1000000) {
                return (likes / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            } else if (likes >= 1000) {
                return (likes / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
            }
            return likes;
        },
        followStore() {
            return useFollowStore();
        },
        userStore() {
            return useUserStore();
        },
    },
    beforeMount() {
        if (typeof window !== 'undefined') {
            this.layoutDesktop = window.matchMedia('(min-width: 1024px)').matches
        }
    },
    mounted() {
        if (typeof window === 'undefined') {
            return
        }
        this._mq = window.matchMedia('(min-width: 1024px)')
        this._mqHandler = () => {
            this.layoutDesktop = this._mq.matches
        }
        this._mq.addEventListener('change', this._mqHandler)
    },
    beforeUnmount() {
        this._mq?.removeEventListener('change', this._mqHandler)
        const popupContent = this.$refs.popupContent;
        if (popupContent) {
            popupContent.removeEventListener('scroll', this.handleScroll);
        }
    },
    methods: {
        async fetchPhotoDetail(token) {
            try {
                const tokenFromLocalStorage = localStorage.getItem("token");
                const headers = tokenFromLocalStorage
                    ? { Authorization: `Bearer ${tokenFromLocalStorage}` }
                    : {};

                const response = await photoService.fetchDetail(token, {
                    headers: headers
                });
                this.photoDetail = response.data.data;
                this.updateLikedState();
            } catch (error) {
                console.error("Error fetching photo details:", error);
            }
        },
        async fetchPhotoLikes(token, page = 1) {
            if (this.loading) return;
            this.loading = true;

            try {
                const response = await photoService.fetchPhotoLikes(token, {
                    params: {
                        page: page,
                        per_page: 8,
                    },
                });

                if (response.data.success) {
                    const { total_likes, liked_users, current_page, last_page, total } = response.data.data;
                    this.photoLikesCount = total_likes;
                    this.likedUsers = page === 1 ? liked_users : [...this.likedUsers, ...liked_users];
                    this.likesCurrentPage = current_page;
                    this.likesLastPage = last_page;
                    this.totalLikes = total;
                } else {
                    console.error(response.data.message);
                    notification.error({
                        message: 'Error',
                        description: response.data.message || 'Failed to fetch likes.',
                        placement: 'topRight',
                        duration: 3,
                    });
                    this.photoLikesCount = 0;
                    this.likedUsers = [];
                }
            } catch (error) {
                console.error("Error fetching photo likes:", error);
                notification.error({
                    message: 'Error',
                    description: 'An error occurred while fetching likes. Please try again.',
                    placement: 'topRight',
                    duration: 3,
                });
                this.photoLikesCount = 0;
                this.likedUsers = [];
            } finally {
                this.loading = false;
            }
        },
        async showLikesPopup() {
            this.likesPopupVisible = true;
            await this.fetchPhotoLikes(this.$route.params.token, 1);
        },
        async handleScroll() {
            const popupContent = this.$refs.popupContent;
            if (!popupContent || this.loading || this.likesCurrentPage >= this.likesLastPage) return;

            const { scrollTop, scrollHeight, clientHeight } = popupContent;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                await this.fetchPhotoLikes(this.$route.params.token, this.likesCurrentPage + 1);
            }
        },
        closeLikesPopup() {
            this.likesPopupVisible = false;
        },
        async fetchSimilarPhotos(token) {
            try {
                const authToken = localStorage.getItem("token"); // Lấy token nếu có

                let headers = {};
                if (authToken) {
                    headers = {
                        Authorization: `Bearer ${authToken}`,
                    };
                }

                const response = await photoService.fetchRelatedPhotos(token, { headers });

                if (response.data) {
                    this.similarPhotos = response.data;
                    this.updateLikedState();
                }
            } catch (error) {
                console.error("Error fetching similar photos:", error);
                this.similarPhotos = [];
            }
        },
        async fetchRelatedGalleries(token) {
            try {
                const authToken = localStorage.getItem("token");
                let headers = {};
                if (authToken) {
                    headers = { Authorization: `Bearer ${authToken}` };
                }

                const response = await photoService.fetchRelatedGalleries(token, { headers });

                if (response.data && Array.isArray(response.data)) {
                    this.relatedGalleries = response.data;
                    this.updateLikedGalleriesState(); // Cập nhật trạng thái liked sau khi gán dữ liệu
                    console.log('Related Galleries:', this.relatedGalleries); // Debug
                } else {
                    this.relatedGalleries = [];
                    console.error("No related galleries found or invalid data:", response.data?.message);
                }
            } catch (error) {
                console.error("Error fetching related galleries:", error);
                this.relatedGalleries = [];
            }
        },
        async toggleLikeGallery(gallery) {
            if (!await this.checkLogin()) return;

            const likeStore = useLikeStore();
            const galleryId = gallery.id;
            const galleryUserId = gallery.user?.id;

            try {
                if (gallery.liked) {
                    await likeStore.unlikeGallery(galleryId);
                    gallery.liked = false;
                } else {
                    await likeStore.likeGallery(galleryId, galleryUserId);
                    gallery.liked = true;
                }
                this.updateLikedGalleriesState(); // Cập nhật lại trạng thái cho tất cả galleries
            } catch (error) {
                console.error('Failed to toggle like for gallery:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to toggle like. Please try again.',
                });
            }
        },
        // Dùng trong các danh sách như popup hiển thị danh sách liked users
        async toggleFollowUser(username) {
            // Kiểm tra đăng nhập trước
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            if (!authStore.isLoggedIn) {
                this.$router.push({ name: 'Login' });
                return;
            }
            try {
                // Lấy thông tin user dựa vào username
                const userData = await photoService.fetchUserByUsername(username);
                const userId = userData.data.id;
                // Nếu đã theo dõi, hiện modal xác nhận unfollow
                if (this.followStore.followingList.includes(userId)) {
                    Modal.confirm({
                        title: 'Are you sure you want to unfollow this user',
                        icon: h(ExclamationCircleOutlined),
                        content: `This will unfollow the photographer. You will no longer see their content in your For You feed.`,
                        onOk: async () => {
                            try {
                                await this.followStore.unfollowUser(userId);
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
                        },
                        onCancel() {
                            // Không làm gì nếu hủy
                        },
                    });
                } else {
                    // Nếu chưa theo dõi, thực hiện follow luôn
                    await this.followStore.followUser(userId);
                    notification.success({
                        message: 'Success',
                        description: `You are now following ${username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                }
            } catch (error) {
                console.error('Error toggling follow for user:', error);
                notification.error({
                    message: 'Error',
                    description: `Failed to toggle follow for ${username}.`,
                    placement: 'topRight',
                    duration: 3,
                });
            }
        },
        // Dùng cho trường hợp cụ thể khi thao tác với user của ảnh chi tiết
        async toggleFollow() {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            const userId = this.photoDetail.user.id;
            const username = this.photoDetail.user.username; // Lấy username để hiển thị trong thông báo

            if (this.isFollowing) {
                // Nếu đang follow, hiển thị modal xác nhận unfollow
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer. You will no longer see their content in your For You feed.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(userId);
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
                    },
                    onCancel() {
                        // Không làm gì nếu hủy
                    },
                });
            } else {
                // Nếu chưa follow thì thực hiện follow luôn
                try {
                    await followStore.followUser(userId);
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
        // like ảnh chi tiết
        async toggleLike(item) {
            const photo_id = item.id;
            const photo_user_id = item.user.id;
            const likeStore = useLikeStore();

            try {
                if (item.liked) {
                    await likeStore.unlikePhoto(photo_id);
                    item.liked = false;
                    // Trừ 1 like nếu đang ở ảnh chi tiết
                    if (this.photoDetail.id === photo_id) {
                        this.photoLikesCount = Math.max(0, this.photoLikesCount - 1);
                    }
                } else {
                    await likeStore.likePhoto(photo_id, photo_user_id);
                    item.liked = true;
                    // Cộng 1 like nếu đang ở ảnh chi tiết
                    if (this.photoDetail.id === photo_id) {
                        this.photoLikesCount += 1;
                    }
                }
            } catch (error) {
                console.error('Failed to toggle like:', error);
            }
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            // Cập nhật trạng thái liked của ảnh chi tiết
            this.photoDetail.liked = likeStore.likedPhotos.includes(this.photoDetail.id);
            // Cập nhật trạng thái liked của các ảnh tương tự
            if (this.similarPhotos.length > 0) {
                this.similarPhotos.forEach(photo => {
                    photo.liked = likeStore.likedPhotos.includes(photo.id);
                });
            }
        },
        updateLikedGalleriesState() {
            const likeStore = useLikeStore();
            if (this.relatedGalleries.length > 0) {
                this.relatedGalleries.forEach(gallery => {
                    gallery.liked = likeStore.likedGalleries.includes(gallery.id);
                });
            }
        },

        // blcok user
        async toggleBlockUser(user) {
            if (!await this.checkLogin()) return;

            const blockStore = useBlockStore();
            const userId = user.id;

            try {
                if (blockStore.blockedUsers.includes(userId)) {
                    await blockStore.unblockUser(userId);
                    notification.success({
                        message: 'Success',
                        description: `${user.username} is unblocked.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                } else {
                    await blockStore.blockUser(userId);
                    notification.success({
                        message: 'Success',
                        description: `${user.username} has been blocked. All their related content will not be visible going forward.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                }

                this.$router.push({ name: 'Index' });
            } catch (error) {
                console.error("Error toggling block:", error);
            }
        },
        // comment
        async postComment() {
            if (!this.newComment.trim()) {
                return;
            }

            if (!await this.checkLogin()) {
                return;
            }

            const token = this.$route.params.token;
            const commentStore = useCommentStore();

            commentStore.postComment(token, this.newComment);
            this.newComment = ''; // Xóa nội dung
            this.showButtons = false; // Ẩn nút sau khi gửi
        },
        showDeleteConfirm(comment) {
            Modal.confirm({
                title: 'Are you sure you want to delete this comment?',
                icon: h(ExclamationCircleOutlined),
                content: 'This action cannot be undone. Once deleted, this comment will be permanently removed.',
                onOk: () => this.deleteComment(comment.id),
                onCancel() {},
            });
        },
        async deleteComment(commentId) {
            const commentStore = useCommentStore();
            const photoToken = this.$route.params.token;
            await commentStore.deleteComment(commentId, photoToken);
        },
        cancelComment() {
            this.newComment = ''; // Xóa nội dung
            this.showButtons = false; // Ẩn nút
        },
        focusCommentInput() {
            this.showButtons = true;
            this.$nextTick(() => {
                const body = this.$refs.sidebarBody;
                const input = body && body.$refs ? body.$refs.commentInput : null;
                if (input && typeof input.focus === 'function') {
                    input.focus();
                }
            });
        },
        async loadMoreComments() {
            const commentStore = useCommentStore();
            await commentStore.fetchComments(this.$route.params.token, this.currentPage + 1);
        },
        async readLessComments() {
            const commentStore = useCommentStore();
            await commentStore.fetchComments(this.$route.params.token, 1);
        },

        // category
        async fetchCategories() {
            try {
                const response = await photoService.fetchCategories();
                this.categories = response.data;
            } catch (error) {
                console.error("Error fetching categories:", error);
            }
        },

        // check login
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            if (!authStore.isLoggedIn) {
                this.$router.push({ name: 'Login' });
                return false;
            }
            return true;
        },
        async handleClick(action, id, violatorId) {
            if (!await this.checkLogin()) {
                return;
            }

            switch (action) {
                case 'toggleLike':
                    this.toggleLike(id); // id là photoDetail
                    break;
                case 'addToGallery':
                    this.openAddToGalleryModal(id); // id là photoId
                    break;
                case 'reportPhoto':
                    this.openReportModal(id, violatorId); // id là photoId, violatorId là userId
                    break;
                case 'reportComment':
                    this.openReportCommentModal(id, violatorId); // id là commentId, violatorId là userId
                    break;
                default:
                    console.error('Unknown action:', action);
            }
        },
        copyUrlToClipboard() {
            const url = window.location.href; // Lấy URL hiện tại của trình duyệt
            navigator.clipboard.writeText(url).then(() => {
                notification.success({
                    message: 'Success',
                    description: 'URL has been copied to the clipboard.',
                    placement: 'topRight',
                    duration: 3,
                });
            }).catch(err => {
                console.error('Failed to copy URL:', err);
                notification.error({
                    message: 'Error',
                    description: 'Failed to copy URL.',
                    placement: 'topRight',
                    duration: 3,
                });
            });
        },
        openFullScreen() {
            const img = document.createElement('img');
            img.src = this.photoDetail.image_url;
            /* Không dùng class Tailwind ở đây — JS string không được scanner build, style tay cho chắc */
            img.style.maxHeight = '100%';
            img.style.maxWidth = '100%';
            img.style.objectFit = 'contain';

            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.9)';

            // Tạo icon "X"
            const closeIcon = document.createElement('div');
            closeIcon.style.cssText = 'position:absolute;right:1.25rem;top:1.25rem;z-index:1001;cursor:pointer;font-size:1.5rem;color:#fff';
            closeIcon.innerHTML = '<i class="fa-solid fa-xmark"></i>'; // Sử dụng icon Font Awesome cho "X"

            // Thêm sự kiện click để đóng overlay
            closeIcon.onclick = () => document.body.removeChild(overlay);

            // Thêm ảnh và icon "X" vào overlay
            overlay.appendChild(img);
            overlay.appendChild(closeIcon);
            document.body.appendChild(overlay);
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        },
        getTimeAgo(uploadDate) {
            const now = new Date();
            const uploadTime = new Date(uploadDate);
            const diffInMs = now - uploadTime; // Độ chênh lệch thời gian (milliseconds)
            const diffInSeconds = Math.floor(diffInMs / 1000);

            if (diffInSeconds < 60) {
                return `${diffInSeconds} seconds ago`;
            } else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } else {
                const days = Math.floor(diffInSeconds / 86400);
                return `${days} day${days > 1 ? 's' : ''} ago`;
            }
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },

        // open gallery modal
        openAddToGalleryModal(photoId) {
            this.selectedPhotoId = photoId;
            this.showAddToGallery = true; // Mở modal
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false; // Đóng modal
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
        openReportCommentModal(commentId, violatorId) {
            this.selectedCommentId = commentId;
            this.selectedViolatorId = violatorId;
            this.showReportCommentModal = true;
        },
        closeReportCommentModal() {
            this.showReportCommentModal = false;
            this.selectedCommentId = null;
            this.selectedViolatorId = null;
        },
        async openReportGalleryModal(galleryId, violatorId) {
            if (!await this.checkLogin()) return;
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
    },
};
</script>
