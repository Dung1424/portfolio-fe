<template>
    <div
        class="account-sidebar-root w-full shrink-0 lg:w-64 lg:shrink-0 lg:self-stretch"
    >
        <aside
            class="flex w-full flex-col border-b border-gray-200 bg-white lg:sticky lg:top-[60px] lg:min-h-[calc(100vh-60px)] lg:border-b-0 lg:border-r lg:border-gray-200"
        >
            <!-- 500px-style header: soft gray → white -->
            <div
                class="flex flex-col items-center border-b border-gray-100/90 bg-gradient-to-b from-zinc-100/95 via-white to-white px-4 pb-6 pt-7 lg:border-b-0"
            >
                <div class="relative">
                    <img
                        class="h-24 w-24 rounded-full border border-gray-200/80 bg-gray-200 object-cover shadow-sm"
                        :src="user.profile_picture
                            ? `${apiOrigin}/images/avatars/${user.profile_picture.split('/').pop()}`
                            : `${apiOrigin}/images/imageUserDefault.png`"
                        alt="User Avatar"
                    />
                    <button
                        v-if="user?.id"
                        type="button"
                        class="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-[#0870d1] text-white shadow-sm ring-2 ring-white transition hover:bg-blue-700"
                        aria-label="Edit profile photo"
                        @click="openUpdateProfileModal(user.id)"
                    >
                        <i class="fa-solid fa-pencil text-[10px]" />
                    </button>
                </div>
                <p class="mt-4 text-center font-heading text-[17px] font-bold leading-tight text-gray-900">
                    {{ user.name ? user.name : user.username }}
                </p>
                <p v-if="user.name && user.username" class="mt-1 text-xs text-gray-500">
                    @{{ user.username }}
                </p>
            </div>

            <!-- Desktop: full-width active row (500px) — cột dọc -->
            <nav class="account-sidebar-nav hidden flex-1 flex-col py-2 lg:flex">
                <button
                    v-for="item in menuItems"
                    :key="item.tab"
                    type="button"
                    class="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium no-underline transition-colors"
                    :class="
                        sidebarItemIsActive(item)
                            ? '!bg-[#0870d1] !text-white'
                            : 'text-gray-900 hover:bg-zinc-50'
                    "
                    :aria-current="sidebarItemIsActive(item) ? 'page' : undefined"
                    @click="goToSidebarItem(item)"
                >
                    <i
                        :class="[
                            sidebarItemIsActive(item) ? item.iconActive : item.iconInactive,
                            'w-6 shrink-0 text-center text-[17px] leading-none',
                            sidebarItemIsActive(item) ? '!text-white' : 'text-[#0870d1]'
                        ]"
                    />
                    {{ item.label }}
                </button>
            </nav>
        </aside>

        <!-- Mobile: thanh điều hướng cố định cuối viewport (không cuộn theo nội dung) -->
        <nav
            class="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-sm lg:hidden"
            aria-label="Account sections"
        >
            <button
                v-for="item in menuItems"
                :key="'m-' + item.tab"
                type="button"
                class="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 text-center text-[10px] font-semibold leading-tight no-underline transition-colors"
                :class="
                    sidebarItemIsActive(item)
                        ? 'text-[#0870d1]'
                        : 'text-gray-600 active:bg-zinc-50'
                "
                :aria-current="sidebarItemIsActive(item) ? 'page' : undefined"
                @click="goToSidebarItem(item)"
            >
                <i
                    :class="[
                        sidebarItemIsActive(item) ? item.iconActive : item.iconInactive,
                        'mb-0.5 shrink-0 text-[18px] leading-none',
                        sidebarItemIsActive(item) ? 'text-[#0870d1]' : 'text-gray-700'
                    ]"
                />
                <span class="line-clamp-2 w-full break-words px-0.5">{{ item.shortLabel }}</span>
            </button>
        </nav>
        <!-- Không Teleport ra body: tránh race DOM với Nuxt layout / đổi tab (parentNode null). Modal đã position: fixed. -->
        <UpdateProfileModal
            :is-visible="showUpdateModal"
            :user-id="selectedUserId"
            @close="closeUpdateProfileModal"
        />
    </div>
</template>

<script>
import { useUserStore } from '~/stores/userStore';
import UpdateProfileModal from './profile/UpdateProfileModal.vue';

export default {
    name: 'AccountSidebar',
    components: {
        UpdateProfileModal,
    },
    data() {
        return {
            menuItems: [
                {
                    tab: 'photos',
                    iconInactive: 'fa-regular fa-image',
                    iconActive: 'fa-solid fa-image',
                    label: 'My Photos',
                    shortLabel: 'Photos',
                },
                {
                    tab: 'galleries',
                    iconInactive: 'fa-regular fa-images',
                    iconActive: 'fa-solid fa-images',
                    label: 'Galleries',
                    shortLabel: 'Galleries',
                },
                {
                    tab: 'likes',
                    iconInactive: 'fa-regular fa-heart',
                    iconActive: 'fa-solid fa-heart',
                    label: 'Likes',
                    shortLabel: 'Likes',
                },
                {
                    tab: 'privacy',
                    // FA 6 Free (cdn beta): regular lock/key đôi khi không có glyph → dùng solid cho cả hai trạng thái
                    iconInactive: 'fa-solid fa-lock',
                    iconActive: 'fa-solid fa-lock',
                    label: 'Privacy',
                    shortLabel: 'Privacy',
                },
                {
                    tab: 'password',
                    iconInactive: 'fa-solid fa-key',
                    iconActive: 'fa-solid fa-key',
                    label: 'Change Password',
                    shortLabel: 'Password',
                },
            ],
            showUpdateModal: false,
            selectedUserId: null,
        };
    },
    computed: {
        user() {
            const store = useUserStore();
            return store.user;
        },
    },
    created() {
        this.fetchUserData();
    },

    methods: {
        sidebarItemIsActive(item) {
            const p = this.$route.path;
            const q = this.$route.query.tab;
            const activeTab = typeof q === 'string' ? q : 'photos';

            if (p === '/account') {
                return activeTab === item.tab;
            }
            if (item.tab === 'galleries') {
                return p.startsWith('/galleryDetails');
            }
            if (item.tab === 'photos') {
                return p.startsWith('/photoDetail');
            }
            return false;
        },
        openUpdateProfileModal(id) {
            this.selectedUserId = id;
            this.showUpdateModal = true;
        },
        goToSidebarItem(item) {
            if (
                this.$route.path === '/account'
                && (this.$route.query.tab || 'photos') === item.tab
            ) {
                return;
            }
            this.$router.push({ path: '/account', query: { tab: item.tab } });
        },
        closeUpdateProfileModal() {
            this.showUpdateModal = false;
        },
        async fetchUserData() {
            const store = useUserStore();
            await store.fetchUserData();
        },
    },
};
</script>
