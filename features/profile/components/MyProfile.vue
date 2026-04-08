<template>
    <div
        class="min-h-screen overflow-x-hidden bg-white font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <section class="relative w-full pt-0">
            <div
                class="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden"
            >
                <div
                    class="relative h-[min(48vh,600px)] min-h-[260px] w-full overflow-hidden bg-zinc-900 sm:min-h-[320px] lg:h-[min(52vh,680px)]"
                >
                    <img
                        :src="coverPhotoUrl"
                        alt=""
                        class="h-full w-full object-cover object-center"
                    />
                    <div
                        class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/45 via-black/15 to-transparent"
                        aria-hidden="true"
                    />
                </div>
            </div>

            <div
                class="relative z-10 mx-auto max-w-5xl px-4 sm:px-6"
            >
                <div
                    class="relative -mt-14 flex min-h-[120px] w-full flex-col items-center gap-3 pb-2 sm:-mt-[4.75rem] sm:min-h-[132px] sm:flex-row sm:items-center sm:justify-center sm:gap-0"
                >
                    <img
                        :src="profilePictureUrl"
                        alt=""
                        class="relative z-10 h-[120px] w-[120px] shrink-0 rounded-full border-4 border-white object-cover shadow-[0_8px_30px_rgba(0,0,0,0.18)] sm:h-[132px] sm:w-[132px]"
                    />
                    <div
                        class="flex items-center justify-center gap-5 text-[22px] text-zinc-800 sm:absolute sm:bottom-3 sm:right-0 sm:justify-end sm:pr-0.5"
                    >
                        <button
                            v-if="isMyProfile"
                            type="button"
                            class="rounded-lg p-1.5 transition hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label="Edit profile"
                            @click="openUpdateProfileModal"
                        >
                            <i class="fa-solid fa-pencil" />
                        </button>
                        <button
                            type="button"
                            class="rounded-lg p-1.5 transition hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label="Copy profile link"
                            @click="copyProfileLink"
                        >
                            <i class="fa-solid fa-share-nodes" />
                        </button>
                        <div class="relative">
                            <button
                                type="button"
                                class="rounded-lg p-1.5 transition hover:bg-zinc-100"
                                :class="{ 'bg-zinc-100': activeDropdown === 'dropdown-' + user.id }"
                                aria-label="More options"
                                @click.stop="toggleDropdown('dropdown-' + user.id)"
                            >
                                <i class="fa-solid fa-ellipsis" />
                            </button>
                            <div
                                v-if="activeDropdown === 'dropdown-' + user.id"
                                class="absolute right-0 top-full z-[1001] mt-2 min-w-[220px] overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
                                @click.stop
                            >
                                <ul class="m-0 flex list-none flex-col p-0">
                                    <li
                                        v-if="isMyProfile"
                                        class="flex cursor-pointer items-center px-4 py-3 pl-6 text-sm text-zinc-800 transition hover:bg-zinc-100"
                                        @click="goToMyPhotos"
                                    >
                                        <i class="fas fa-camera mr-2 w-4" /> My Photos
                                    </li>
                                    <li
                                        v-if="isMyProfile"
                                        class="flex cursor-pointer items-center px-4 py-3 pl-6 text-sm text-zinc-800 transition hover:bg-zinc-100"
                                        @click="goToMyGalleries"
                                    >
                                        <i class="fas fa-images mr-2 w-4" /> My Galleries
                                    </li>
                                    <li
                                        v-if="!isMyProfile"
                                        class="flex cursor-pointer items-center px-4 py-3 pl-6 text-sm text-zinc-800 transition hover:bg-zinc-100"
                                        @click="toggleBlockUser"
                                    >
                                        <i class="fa-solid fa-user-large-slash mr-2 w-4" />
                                        {{ isBlocked ? 'Unblock user' : 'Block user' }}
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mx-auto flex w-full max-w-2xl flex-col items-center px-2 pb-2 pt-1 text-center">
                        <h1 class="text-[28px] font-bold tracking-tight text-zinc-900 sm:text-[32px]">
                            {{ user.name ? user.name : user.username }}
                        </h1>
                        <p class="mt-1 flex items-center justify-center gap-1.5 text-sm text-zinc-500">
                            <i class="fa-solid fa-location-dot text-zinc-400" />
                            {{ user.location ? user.location : 'no location' }}
                        </p>
                        <button
                            v-if="!isMyProfile && isBlocked"
                            type="button"
                            class="mt-2 inline-flex min-h-[38px] min-w-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-red-500 bg-white px-5 py-2 text-sm font-semibold text-red-500 transition hover:bg-zinc-100"
                            @click="toggleBlockUser"
                        >
                            Unblock
                        </button>
                        <button
                            v-if="!isMyProfile && !isBlocked"
                            type="button"
                            class="mt-2 inline-flex min-h-[38px] min-w-[120px] cursor-pointer items-center justify-center rounded-lg border-2 border-[#0870d1] bg-[#0870d1] px-5 py-2 text-sm font-semibold text-white transition hover:brightness-[0.96] active:brightness-[0.92]"
                            @click="toggleFollow"
                        >
                            {{ isFollowing ? 'Unfollow' : 'Follow' }}
                        </button>
                        <p class="mt-2 max-w-xl text-sm leading-relaxed text-zinc-700 sm:text-base">
                            <span v-if="user.bio">
                                <span v-if="isBioExpanded">{{ user.bio }}</span>
                                <span v-else>{{ truncatedBio }}</span>
                                <a
                                    v-if="user.bio.length > 100"
                                    href="#"
                                    class="ml-1 text-blue-600 underline"
                                    @click.prevent="toggleBio"
                                >
                                    {{ isBioExpanded ? 'Read less' : 'Read more' }}
                                </a>
                            </span>
                            <span v-else class="text-zinc-500">No bio</span>
                        </p>
                        <div
                            class="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-sm text-zinc-600"
                        >
                            <button
                                type="button"
                                class="rounded-md px-1.5 py-1 text-left transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
                                @click="showFollowersPopup"
                            >
                                <span class="font-semibold tabular-nums text-zinc-900">{{ userFollowersCount }}</span>
                                <span class="ml-1.5 font-normal">Followers</span>
                            </button>
                            <span class="hidden h-4 w-px bg-zinc-200 sm:inline" aria-hidden="true" />
                            <button
                                type="button"
                                class="rounded-md px-1.5 py-1 text-left transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/40"
                                @click="showFollowingPopup"
                            >
                                <span class="font-semibold tabular-nums text-zinc-900">{{ userFollowingCount }}</span>
                                <span class="ml-1.5 font-normal">Following</span>
                            </button>
                            <span class="hidden h-4 w-px bg-zinc-200 sm:inline" aria-hidden="true" />
                            <span class="tabular-nums">
                                <span class="font-semibold text-zinc-900">{{ formattedPhotoLikes }}</span>
                                <span class="ml-1.5 font-normal">Photo Likes</span>
                            </span>
                        </div>
                    </div>
            </div>

            <!-- Tabs: cùng vùng header nền trắng, tách hẳn khỏi khung xám ảnh/gallery (kiểu 500px) -->
            <div
                v-if="!isBlocked && (photos.length > 0 || galleries.length > 0)"
                class="w-full border-b border-zinc-200 bg-white"
            >
                <div class="mx-auto flex max-w-7xl justify-center gap-10 px-4 pt-3 pb-0 sm:px-6 lg:px-8">
                    <a
                        v-if="photos.length > 0"
                        href="#"
                        class="-mb-px inline-flex border-b-2 border-transparent pb-2.5 text-base no-underline transition-colors"
                        :class="activeContent === 'photos'
                            ? 'border-[#0870d1] font-bold text-[#0870d1]'
                            : 'font-bold text-zinc-500 hover:text-zinc-800'"
                        @click.prevent="activeTab = 'photos'"
                    >
                        Photos
                        <span :class="activeContent === 'photos' ? 'text-[#0870d1]' : 'text-zinc-500'">&nbsp;{{ photos.length }}</span>
                    </a>
                    <a
                        v-if="galleries.length > 0"
                        href="#"
                        class="-mb-px inline-flex border-b-2 border-transparent pb-2.5 text-base no-underline transition-colors"
                        :class="activeContent === 'galleries'
                            ? 'border-[#0870d1] font-bold text-[#0870d1]'
                            : 'font-bold text-zinc-500 hover:text-zinc-800'"
                        @click.prevent="activeTab = 'galleries'"
                    >
                        Galleries
                        <span :class="activeContent === 'galleries' ? 'text-[#0870d1]' : 'text-zinc-500'">&nbsp;{{ galleries.length }}</span>
                    </a>
                </div>
            </div>

            <div class="mx-auto w-full max-w-7xl bg-[#f7f8fa] pb-10">
                <div v-if="activeContent === 'photos' && !isBlocked" class="w-full">
                    <ProfilePhotoGrid :photos="photos" :check-login="checkLogin" />
                </div>
                <div v-else-if="activeContent === 'galleries' && !isBlocked" class="px-4 sm:px-6 lg:px-8">
                    <ProfileGalleryGrid :galleries="galleries" />
                </div>
            </div>
        </section>

        <UpdateProfileModal
            :is-visible="showUpdateModal"
            @close="closeUpdateProfileModal"
            @update="reloadProfileData"
        />

        <div
            v-if="followersPopupVisible"
            class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
            @click.self="closeFollowersPopup"
        >
            <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                <div class="flex items-center justify-between border-b-2 border-neutral-100 px-5 py-4">
                    <h3 class="m-0 text-xl font-bold text-zinc-800">
                        {{ user.name || user.username }}'s Followers
                    </h3>
                    <button
                        type="button"
                        class="flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-3xl leading-none text-zinc-500 hover:text-zinc-800"
                        @click="closeFollowersPopup"
                    >
                        ×
                    </button>
                </div>
                <div v-if="followersData.length > 0" class="px-4 pb-4 pt-2">
                    <div
                        v-for="follower in followersData"
                        :key="follower.id"
                        class="flex items-center border-b-2 border-neutral-100 py-4 last:border-0"
                    >
                        <NuxtLink :to="{ name: 'MyProfile', params: { username: follower.username } }">
                            <img
                                :src="follower.profile_picture ? `${apiOrigin}/images/avatars/${follower.profile_picture.split('/').pop()}` : '/images/imageUserDefault.png'"
                                alt=""
                                class="mr-4 h-10 w-10 rounded-full object-cover"
                            />
                        </NuxtLink>
                        <div class="min-w-0 flex-1">
                            <span class="block text-base font-bold text-zinc-800">{{ follower.name }}</span>
                            <span class="block text-sm text-zinc-500">{{ follower.followers_count || 0 }} Followers</span>
                        </div>
                        <button
                            v-if="follower.id !== userStore.user.id"
                            type="button"
                            class="ml-3 shrink-0 cursor-pointer rounded-lg border-0 bg-[#0870d1] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-[0.96] active:brightness-[0.92]"
                            @click.stop="toggleFollowUser(follower.username)"
                        >
                            {{ followStore.followingList.includes(follower.id) ? 'Unfollow' : 'Follow' }}
                        </button>
                    </div>
                </div>
                <div v-else class="px-8 py-10 text-center text-base text-zinc-500">No followers found.</div>
            </div>
        </div>

        <div
            v-if="followingPopupVisible"
            class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
            @click.self="closeFollowingPopup"
        >
            <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                <div class="flex items-center justify-between border-b-2 border-neutral-100 px-5 py-4">
                    <h3 class="m-0 text-xl font-bold text-zinc-800">
                        {{ user.name || user.username }}'s Following
                    </h3>
                    <button
                        type="button"
                        class="flex h-8 w-8 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-3xl leading-none text-zinc-500 hover:text-zinc-800"
                        @click="closeFollowingPopup"
                    >
                        ×
                    </button>
                </div>
                <div v-if="followingData.length > 0" class="px-4 pb-4 pt-2">
                    <div
                        v-for="following in followingData"
                        :key="following.id"
                        class="flex items-center border-b-2 border-neutral-100 py-4 last:border-0"
                    >
                        <NuxtLink :to="{ name: 'MyProfile', params: { username: following.username } }">
                            <img
                                :src="following.profile_picture ? `${apiOrigin}/images/avatars/${following.profile_picture.split('/').pop()}` : '/images/imageUserDefault.png'"
                                alt=""
                                class="mr-4 h-10 w-10 rounded-full object-cover"
                            />
                        </NuxtLink>
                        <div class="min-w-0 flex-1">
                            <span class="block text-base font-bold text-zinc-800">{{ following.name }}</span>
                            <span class="block text-sm text-zinc-500">{{ following.followers_count || 0 }} Followers</span>
                        </div>
                        <button
                            v-if="following.id !== userStore.user.id"
                            type="button"
                            class="ml-3 shrink-0 cursor-pointer rounded-lg border-0 bg-[#0870d1] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-[0.96] active:brightness-[0.92]"
                            @click.stop="toggleFollowUser(following.username)"
                        >
                            {{ followStore.followingList.includes(following.id) ? 'Unfollow' : 'Follow' }}
                        </button>
                    </div>
                </div>
                <div v-else class="px-8 py-10 text-center text-base text-zinc-500">No following found.</div>
            </div>
        </div>
    </div>
</template>

<script>
import { profileService } from '~/features/profile/services/profile.api.js'
import UpdateProfileModal from '~/features/account/components/profile/UpdateProfileModal.vue'
import ProfilePhotoGrid from '~/features/profile/components/ProfilePhotoGrid.vue'
import ProfileGalleryGrid from '~/features/profile/components/ProfileGalleryGrid.vue'
import { useAuthStore } from '~/stores/authStore';
import { useUserStore } from '~/stores/userStore.js';
import { useFollowStore } from '~/stores/followStore.js';
import { useBlockStore } from '~/stores/blockStore';
import { notification, Modal } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export default {
    name: "MyProfileView",
    components: {
        UpdateProfileModal,
        ProfilePhotoGrid,
        ProfileGalleryGrid,
    },
    data() {
        return {
            activeTab: null,
            activeDropdown: null,
            user: {},
            photos: [],
            galleries: [],
            photoLikesCount: 0,
            isBioExpanded: false,
            showUpdateModal: false,
            isMyProfile: false,
            isFollowing: false,
            isBlocked: false,
            followersPopupVisible: false,
            followingPopupVisible: false,
        };
    },
    computed: {
        activeContent() {
            if (this.activeTab) {
                return this.activeTab;
            }
            if (this.photos && this.photos.length > 0) {
                return 'photos';
            } else if (this.galleries && this.galleries.length > 0) {
                return 'galleries';
            } else {
                return null;
            }
        },
        profilePictureUrl() {
            return this.user.profile_picture ? `${this.apiOrigin}/images/avatars/${this.user.profile_picture.split('/').pop()}` : '/images/imageUserDefault.png';
        },
        coverPhotoUrl() {
            return this.user.cover_photo ? `${this.apiOrigin}/images/covers/${this.user.cover_photo.split('/').pop()}` : '/images/blackImage.jpeg';
        },
        truncatedBio() {
            if (this.user.bio && this.user.bio.length > 100) {
                return this.user.bio.substring(0, 100) + '...';
            }
            return this.user.bio;
        },
        userStore() {
            return useUserStore();
        },
        isLoggedIn() {
            const authStore = useAuthStore();
            return authStore.isLoggedIn;
        },
        followStore() {
            return useFollowStore();
        },
        userFollowersCount() {
            return this.followStore.userFollowersList.length;
        },
        userFollowingCount() {
            return this.followStore.userFollowingList.length;
        },
        followersData() {
            return this.followStore.userFollowersList;
        },
        followingData() {
            return this.followStore.userFollowingList;
        },
        formattedPhotoLikes() {
            const likes = this.photoLikesCount;
            if (likes >= 1000000) {
                return (likes / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
            } else if (likes >= 1000) {
                return (likes / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
            } else {
                return likes;
            }
        },
    },
    watch: {
        '$route.params.username': {
            immediate: true,
            handler() {
                this.reloadProfileData();
            }
        }
    },
    methods: {
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            if (!authStore.isLoggedIn) {
                this.$router.push({ name: 'Login' });
                return false;
            }
            return true;
        },
        async reloadProfileData() {
            await this.fetchUserData();
            await Promise.all([this.fetchPhotos(), this.fetchGalleries(), this.fetchTotalLikes()]);

            // Token / localStorage / follow–block: chỉ trên client (SSR không có localStorage)
            if (!import.meta.client) {
                return;
            }

            await this.checkIfBlocked();
            await this.checkIfMyProfile();
            if (!this.isMyProfile) {
                await this.checkFollowingStatus();
            }
            const followStore = useFollowStore();
            const username = this.$route.params.username;
            await followStore.fetchUserFollowersList(username);
            await followStore.fetchUserFollowingList(username);
            await followStore.fetchFollowingList();
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },
        async fetchUserData() {
            const username = this.$route.params.username;
            try {
                const response = await profileService.fetchByUsername(username);
                this.user = response.data;
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        },
        async fetchTotalLikes() {
            const username = this.$route.params.username;
            try {
                const response = await profileService.fetchTotalLikes(username);
                if (response.data.success) {
                    this.photoLikesCount = response.data.data.total_likes;
                } else {
                    this.photoLikesCount = 0;
                }
            } catch (error) {
                console.error('Error fetching total likes:', error);
                this.photoLikesCount = 0;
            }
        },
        async checkIfBlocked() {
            if (!import.meta.client) {
                return;
            }
            const blockStore = useBlockStore();
            await blockStore.fetchBlockedUsers();
            this.isBlocked = blockStore.blockedUsers.includes(this.user.id);
        },
        async toggleBlockUser() {
            if (!await this.checkLogin()) return;
            const blockStore = useBlockStore();
            if (this.isBlocked) {
                this.confirmUnblockUser();
            } else {
                await blockStore.blockUser(this.user.id);
                this.isBlocked = true;
                this.isFollowing = false;
                notification.success({
                    message: 'Success',
                    description: `${this.user.username} has been blocked. All their related content will not be visible going forward.`,
                    placement: 'topRight',
                    duration: 3,
                });
            }
        },
        confirmUnblockUser() {
            Modal.confirm({
                title: 'Are you sure you want to unblock this user?',
                icon: h(ExclamationCircleOutlined),
                content: `You will unblock ${this.user.username}. They will be able to interact with you and view your content.`,
                okText: 'Yes',
                cancelText: 'No',
                onOk: async () => {
                    const blockStore = useBlockStore();
                    await blockStore.unblockUser(this.user.id);
                    this.isBlocked = false;
                    notification.success({
                        message: 'Success',
                        description: `${this.user.username} is unblocked.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                },
                onCancel() {},
            });
        },
        openUpdateProfileModal() {
            this.showUpdateModal = true;
        },
        closeUpdateProfileModal() {
            this.showUpdateModal = false;
        },
        async checkFollowingStatus() {
            const followStore = useFollowStore();
            await followStore.fetchFollowingList();
            this.isFollowing = followStore.followingList.includes(this.user.id);
        },
        async toggleFollow() {
            if (!await this.checkLogin()) return;
            if (this.isBlocked) return;

            const followStore = useFollowStore();
            const username = this.$route.params.username;

            if (this.isFollowing) {
                Modal.confirm({
                    title: 'Are you sure you want to unfollow this user?',
                    icon: h(ExclamationCircleOutlined),
                    content: 'This will unfollow the photographer. You will no longer see their content in your For You feed.',
                    onOk: async () => {
                        try {
                            await followStore.unfollowUser(this.user.id, username);
                            this.isFollowing = false;
                            notification.success({
                                message: 'Success',
                                description: `You have unfollowed ${this.user.username}.`,
                                placement: 'topRight',
                                duration: 3,
                            });
                        } catch (error) {
                            console.error('Error unfollowing user:', error);
                        }
                    },
                    onCancel() {},
                });
            } else {
                try {
                    await followStore.followUser(this.user.id, username);
                    this.isFollowing = true;
                    notification.success({
                        message: 'Success',
                        description: `You are now following ${this.user.username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                } catch (error) {
                    console.error('Error following user:', error);
                }
            }
        },
        async fetchPhotos() {
            const username = this.$route.params.username;
            try {
                const response = await profileService.fetchPhotos(username);
                this.photos = response.data;
            } catch (error) {
                console.error('Error fetching photos:', error);
            }
        },
        async fetchGalleries() {
            const username = this.$route.params.username;
            try {
                let headers = {};
                if (import.meta.client) {
                    const token = localStorage.getItem('token');
                    if (token) {
                        headers = { Authorization: `Bearer ${token}` };
                    }
                }
                const response = await profileService.fetchGalleries(username, { headers });
                this.galleries = response.data;
            } catch (error) {
                console.error('Error fetching galleries:', error);
            }
        },
        toggleBio() {
            this.isBioExpanded = !this.isBioExpanded;
        },
        copyProfileLink() {
            const url = window.location.href;
            navigator.clipboard.writeText(url)
                .then(() => {
                    notification.success({
                        message: 'Success',
                        description: 'Link copied successfully!',
                        placement: 'topRight',
                    });
                })
                .catch(err => {
                    notification.error({
                        message: 'Error',
                        description: 'Failed to copy the link.',
                        placement: 'topRight',
                    });
                    console.error("Failed to copy: ", err);
                });
        },
        async checkIfMyProfile() {
            this.isMyProfile = false;
            if (!import.meta.client) {
                return;
            }
            const userStore = useUserStore();
            await userStore.fetchUserData();
            const authUser = userStore.user;
            if (authUser && authUser.username === this.$route.params.username) {
                this.isMyProfile = true;
            }
        },
        goToMyPhotos() {
            this.$router.push({ name: 'Account', query: { tab: 'photos' } });
        },
        goToMyGalleries() {
            this.$router.push({ name: 'Account', query: { tab: 'galleries' } });
        },
        showFollowersPopup() {
            console.log('Opening Followers Popup', this.followersData);
            this.followersPopupVisible = true;
        },
        closeFollowersPopup() {
            this.followersPopupVisible = false;
        },
        showFollowingPopup() {
            console.log('Opening Following Popup', this.followingData);
            this.followingPopupVisible = true;
        },
        closeFollowingPopup() {
            this.followingPopupVisible = false;
        },
        async toggleFollowUser(username) {
            if (!await this.checkLogin()) return;

            const followStore = useFollowStore();
            try {
                const userData = await profileService.fetchByUsername(username);
                const userId = userData.data.id;

                if (followStore.followingList.includes(userId)) {
                    await followStore.unfollowUser(userId);
                    notification.success({
                        message: 'Success',
                        description: `You have unfollowed ${username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                } else {
                    await followStore.followUser(userId);
                    notification.success({
                        message: 'Success',
                        description: `You are now following ${username}.`,
                        placement: 'topRight',
                        duration: 3,
                    });
                }
                const profileUsername = this.$route.params.username;
                await followStore.fetchUserFollowersList(profileUsername);
                await followStore.fetchUserFollowingList(profileUsername);
                await followStore.fetchFollowingList();
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
    }
};
</script>
