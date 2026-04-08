<template>
  <div
    id="for-you-feed"
    :class="feedRootClass"
  >
    <article
      v-for="item in photos"
      :key="item.id"
      class="group relative mb-4"
      :class="layout === 'masonry' ? 'break-inside-avoid' : ''"
    >
      <div
        class="relative overflow-hidden rounded-xl bg-zinc-100 shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]"
      >
        <NuxtLink
          :to="{ name: 'PhotoDetail', params: { token: item.photo_token } }"
          :class="[
            layout === 'grid'
              ? 'relative block aspect-[4/5] overflow-hidden bg-zinc-200 sm:aspect-[3/4]'
              : 'block overflow-hidden bg-zinc-200',
          ]"
        >
          <!-- Grid: khung xám + shimmer cho đến khi ảnh load (kiểu 500px) -->
          <div
            v-if="layout === 'grid'"
            class="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300 ease-out"
            :class="isFeedPhotoLoaded(item.id) ? 'opacity-0' : 'opacity-100'"
            aria-hidden="true"
          >
            <div class="skeleton-shimmer h-full w-full" />
          </div>
          <img
            :src="item.image_url"
            loading="lazy"
            decoding="async"
            :class="feedPhotoImgClass(item.id, layout)"
            alt=""
            @load="onFeedPhotoLoad(item.id)"
            @error="onFeedPhotoLoad(item.id)"
          >
        </NuxtLink>

        <!-- 500px-style bottom overlay: author left, like + more right (stronger on hover desktop) -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-3 pb-3 pt-14 transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <div class="pointer-events-auto flex items-center justify-between gap-2">
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <NuxtLink
                :to="{ name: 'MyProfile', params: { username: item.user.username } }"
                class="shrink-0"
                @click.stop
              >
                <img
                  class="h-8 w-8 rounded-full border-2 border-white/90 object-cover shadow-sm"
                  :src="item.user.profile_picture || '/images/userDefault.png'"
                  alt=""
                  loading="lazy"
                  decoding="async"
                >
              </NuxtLink>
              <span class="min-w-0 truncate text-[14px] font-medium text-white drop-shadow-sm">{{ item.user.name }}</span>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
                aria-label="Like"
                @click.stop="toggleLike(item)"
              >
                <i
                  :class="[
                    'text-[18px]',
                    item.liked ? 'fa-solid fa-heart text-rose-400' : 'fa-regular fa-heart'
                  ]"
                />
              </button>
              <div class="relative">
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/15"
                  aria-label="More"
                  @click.stop="toggleDropdown('dotsDropdown-' + item.id)"
                >
                  <i class="fa-solid fa-ellipsis-h text-[16px]" />
                </button>
                <div
                  v-if="activeDropdown === 'dotsDropdown-' + item.id"
                  class="absolute bottom-full right-0 z-50 mb-2 min-w-[220px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl"
                  @click.stop
                >
                  <ul class="m-0 list-none p-0">
                    <li
                      class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-[#1877f2] hover:text-white"
                      @click="handleClick('addToGallery', item.id)"
                    >
                      <i class="fa-regular fa-square-plus w-5 shrink-0" /> Add to Gallery
                    </li>
                    <li
                      v-if="item.user && userStore.user && item.user.id !== userStore.user.id"
                      class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-[#1877f2] hover:text-white"
                      @click="toggleBlockUser(item.user)"
                    >
                      <i class="fas fa-user-slash w-5 shrink-0" /> {{ item.blocked ? 'Unblock' : 'Block' }}
                    </li>
                    <li
                      v-if="item.user && userStore.user && item.user.id !== userStore.user.id"
                      class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-[#1877f2] hover:text-white"
                      @click="toggleFollow(item)"
                    >
                      <i class="fas w-5 shrink-0" :class="item.following ? 'fa-user-minus' : 'fa-user-plus'" />
                      {{ item.following ? 'Unfollow' : 'Follow' }}
                    </li>
                    <li
                      v-if="item.user && userStore.user && item.user.id !== userStore.user.id"
                      class="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-[#1877f2] hover:text-white"
                      @click="handleClick('reportPhoto', item.id, item.user.id)"
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
    </article>
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
</template>

<script>
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import ReportPhotoModal from '~/features/photo/components/ReportPhotoModal.vue'
import { useLikeStore } from '~/stores/likeStore';
import { useAuthStore } from '~/stores/authStore';
import { useFollowStore } from '~/stores/followStore';
import { useUserStore } from '~/stores/userStore';
import { useBlockStore } from '~/stores/blockStore';
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { getCurrentInstance, h } from 'vue';

export default {
    components: {
        AddToGalleryModal,
        ReportPhotoModal
    },
    props: {
        photos: {
            type: Array,
            required: true
        },
        layout: {
            type: String,
            default: 'masonry',
            validator: (v) => ['masonry', 'grid'].includes(v),
        },
    },
    setup() {
        useApiAsyncData('for-you-init', async () => {
            const vm = getCurrentInstance()?.proxy
            if (!vm) return null
            const userStore = useUserStore()
            await userStore.fetchUserData()
            const likeStore = useLikeStore()
            await likeStore.fetchLikedPhotos()
            vm.updateLikedState()
            const followStore = useFollowStore()
            await followStore.fetchFollowingList()
            vm.updateFollowingState()
            const blockStore = useBlockStore()
            await blockStore.fetchBlockedUsers()
            vm.updateBlockedState()
            return true
        })
    },
    data() {
        return {
            activeDropdown: null,
            showAddToGallery: false,
            showReportModal: false,
            selectedPhotoId: null,
            selectedViolatorId: null,
            /** ảnh feed đã decode xong — tắt blur (kiểu 500px) */
            feedPhotoLoaded: {},
        };
    },
    computed: {
        userStore() {
            return useUserStore();
        },
        feedRootClass() {
            /* [contain:layout] giúp trình duyệt cô lập reflow khi đổi masonry/grid; bỏ data-aos để tránh AOS refresh chậm */
            if (this.layout === 'grid') {
                return 'grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5 [contain:layout]'
            }
            return 'columns-2 gap-4 sm:columns-3 sm:gap-5 lg:columns-4 xl:columns-5 [column-fill:_balance] [contain:layout]'
        },
    },
    methods: {
        isFeedPhotoLoaded(id) {
            return Boolean(this.feedPhotoLoaded[id])
        },
        onFeedPhotoLoad(id) {
            if (this.feedPhotoLoaded[id]) {
                return
            }
            this.feedPhotoLoaded = { ...this.feedPhotoLoaded, [id]: true }
        },
        feedPhotoImgClass(id, layout) {
            const loaded = this.isFeedPhotoLoaded(id)
            if (layout === 'grid') {
                const base =
                    'relative z-[2] h-full w-full object-cover transition-[opacity,transform] duration-300 ease-out group-hover:scale-[1.02]'
                return loaded ? `${base} opacity-100` : `${base} opacity-0`
            }
            const blur = loaded
                ? 'blur-0 scale-100 opacity-100'
                : 'blur-2xl scale-[1.03] opacity-90'
            const baseMasonry =
                'block h-auto min-h-[100px] w-full object-cover transition-[filter,transform,opacity] duration-500 ease-out group-hover:scale-[1.02]'
            return [baseMasonry, blur].join(' ')
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
        updateFollowingState() {
            const followStore = useFollowStore();
            this.photos.forEach(photo => {
                photo.following = followStore.followingList.includes(photo.user.id);
            });
        },
        async toggleFollow(item) {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            const userId = item.user.id;
            const username = item.user.username;

            if (item.following) {
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer. You will no longer see their content in your For You feed.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(userId);
                            item.following = false;
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
                    item.following = true;
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
            this.photos.forEach(photo => {
                photo.blocked = blockStore.blockedUsers.includes(photo.user.id);
            });
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            this.photos.forEach(photo => {
                photo.liked = likeStore.likedPhotos.includes(photo.id);
            });
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
    },
    mounted() {
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
    watch: {
        photos: {
            handler() {
                this.updateLikedState();
                this.updateFollowingState();
            },
            deep: true,
            immediate: true
        }
    }
};
</script>
