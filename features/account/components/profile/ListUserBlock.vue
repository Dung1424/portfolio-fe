<template>
    <div
        :class="
            embedded
                ? 'flex h-full min-h-0 flex-1 flex-col'
                : 'min-h-[calc(100vh-60px)] w-full bg-gray-50'
        "
    >
        <div
            :class="
                embedded
                    ? 'flex min-h-0 flex-1 flex-col'
                    : 'flex w-full flex-col lg:min-h-[calc(100vh-60px)] lg:flex-row lg:items-stretch'
            "
        >
            <Sidebar v-if="!embedded" />
            <main
                class="flex min-h-0 min-w-0 flex-1 flex-col bg-white lg:min-h-0"
                :class="embedded ? '' : 'border-l border-gray-200'"
            >
                <!-- Header — cùng nhịp với My Photos -->
                <div class="border-b border-gray-200 px-5 pb-4 pt-7 sm:px-6 sm:pt-8">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0870d1]/10 text-[#0870d1]"
                            aria-hidden="true"
                        >
                            <i class="fa-solid fa-lock text-lg" />
                        </div>
                        <div class="min-w-0">
                            <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] sm:leading-8">
                                Privacy
                            </h1>
                            <p class="mt-1 text-sm font-normal text-[#0870d1]">
                                Blocked accounts
                            </p>
                            <p class="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
                                Accounts you block won’t appear in your feeds. They are not notified.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 px-5 py-6 sm:px-6">
                    <div
                        class="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]"
                    >
                        <div
                            v-if="blockedUsersList.length === 0"
                            class="flex flex-col items-center justify-center px-6 py-16 text-center sm:py-20"
                        >
                            <div
                                class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400"
                                aria-hidden="true"
                            >
                                <i class="fa-solid fa-user-slash text-2xl" />
                            </div>
                            <p class="text-base font-semibold text-gray-900">No blocked accounts</p>
                            <p class="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
                                When you block someone from a photo or profile, they’ll show up here. You can unblock them anytime.
                            </p>
                        </div>

                        <ul v-else class="m-0 list-none divide-y divide-gray-100 p-0">
                            <li
                                v-for="user in blockedUsersList"
                                :key="user.id"
                                class="flex flex-wrap items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50/80 sm:px-6"
                            >
                                <img
                                    :src="avatarUrl(user)"
                                    :alt="user.username"
                                    class="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm ring-offset-2 ring-offset-gray-50"
                                />
                                <div class="min-w-0 flex-1">
                                    <span class="block font-semibold text-gray-900">{{ user.name || user.username }}</span>
                                    <span class="text-sm text-gray-500">@{{ user.username }}</span>
                                </div>
                                <button
                                    type="button"
                                    class="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#0870d1] hover:bg-[#0870d1]/5 hover:text-[#0870d1] active:scale-[0.99]"
                                    @click="confirmUnblockUser(user)"
                                >
                                    Unblock
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script>
import Sidebar from '../Sidebar.vue';
import { useBlockStore } from '~/stores/blockStore.js';
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

export default {
    name: 'ListUserBlock',
    components: {
        Sidebar
    },
    setup() {
        const { resolveMediaUrl } = useResolvePublicMediaUrl()
        return { resolveMediaUrl }
    },
    props: {
        embedded: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            blockStore: useBlockStore(),
        };
    },
    computed: {
        blockedUsersList() {
            return this.blockStore.blockedUsersFullInfo;
        }
    },
    async mounted() {
        await this.blockStore.fetchBlockedUsers();
    },
    methods: {
        avatarUrl(user) {
            const url = this.resolveMediaUrl(user?.profile_picture);
            return url || '/images/imageUserDefault.png';
        },
        confirmUnblockUser(user) {
            Modal.confirm({
                title: 'Unblock this user?',
                icon: h(ExclamationCircleOutlined),
                content: `${user.username} will be able to interact with you and see your public content.`,
                okText: 'Unblock',
                cancelText: 'Cancel',
                onOk: () => this.unblockUser(user),
            });
        },
        async unblockUser(user) {
            try {
                await this.blockStore.unblockUser(user.id);
                notification.success({
                    message: 'Success',
                    description: `User ${user.username} has been unblocked.`,
                    placement: 'topRight',
                    duration: 3,
                });
                await this.blockStore.fetchBlockedUsers();
            } catch {
                notification.error({
                    message: 'Error',
                    description: 'Unable to unblock user.',
                    placement: 'topRight',
                    duration: 3,
                });
            }
        }
    }
};
</script>
