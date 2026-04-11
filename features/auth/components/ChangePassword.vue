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
                <div class="border-b border-gray-200 px-5 pb-4 pt-7 sm:px-6 sm:pt-8">
                    <div class="flex items-start gap-3">
                        <div
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0870d1]/10 text-[#0870d1]"
                            aria-hidden="true"
                        >
                            <i class="fa-solid fa-key text-lg" />
                        </div>
                        <div class="min-w-0">
                            <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] sm:leading-8">
                                Change password
                            </h1>
                            <p class="mt-1 text-sm font-normal text-[#0870d1]">
                                Security
                            </p>
                            <p class="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
                                Use a strong password you don’t use on other sites.
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex min-h-0 flex-1 flex-col overflow-y-auto bg-gray-50 px-5 py-6 sm:px-6">
                    <div
                        class="mx-auto w-full max-w-lg rounded-2xl border border-gray-200/80 bg-white p-6 shadow-[0_2px_12px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04] sm:p-8"
                    >
                        <form class="space-y-5" @submit.prevent="changePassword">
                            <div>
                                <label
                                    class="mb-1.5 block text-sm font-medium text-gray-800"
                                    for="current-password"
                                >
                                    Current password
                                </label>
                                <input
                                    id="current-password"
                                    v-model="password.current"
                                    type="password"
                                    required
                                    autocomplete="current-password"
                                    class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/20"
                                    placeholder="Enter current password"
                                />
                            </div>
                            <div>
                                <label class="mb-1.5 block text-sm font-medium text-gray-800" for="new-password">
                                    New password
                                </label>
                                <input
                                    id="new-password"
                                    v-model="password.new"
                                    type="password"
                                    required
                                    autocomplete="new-password"
                                    class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/20"
                                    placeholder="Enter new password"
                                />
                            </div>
                            <div>
                                <label
                                    class="mb-1.5 block text-sm font-medium text-gray-800"
                                    for="confirm-password"
                                >
                                    Confirm new password
                                </label>
                                <input
                                    id="confirm-password"
                                    v-model="password.confirm"
                                    type="password"
                                    required
                                    autocomplete="new-password"
                                    class="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/20"
                                    placeholder="Confirm new password"
                                />
                            </div>
                            <div class="border-t border-gray-100 pt-2">
                                <button
                                    type="submit"
                                    class="inline-flex w-full items-center justify-center rounded-xl bg-[#0870d1] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0658b0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0870d1]/40 focus-visible:ring-offset-2 active:scale-[0.99] sm:w-auto sm:min-w-[200px]"
                                >
                                    Update password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    </div>
</template>

<script>
import Sidebar from '~/features/account/components/Sidebar.vue'
import { authService } from '~/features/auth/services/auth.api.js'
import { notification } from 'ant-design-vue'

export default {
    name: 'ChangePassword',
    components: {
        Sidebar
    },
    props: {
        embedded: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            password: {
                current: '',
                new: '',
                confirm: ''
            }
        };
    },
    methods: {
        async changePassword() {
            if (this.password.new !== this.password.confirm) {
                notification.error({
                    message: 'Error',
                    description: 'New password and confirmation do not match.',
                    placement: 'topRight',
                    duration: 5,
                });
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await authService.changePassword(token, {
                    current_password: this.password.current,
                    new_password: this.password.new,
                    new_password_confirmation: this.password.confirm
                });

                notification.success({
                    message: 'Success',
                    description: response.apiMessage || response.data?.message || 'Password updated.',
                    placement: 'topRight',
                    duration: 5,
                });

                this.password.current = '';
                this.password.new = '';
                this.password.confirm = '';
            } catch (error) {
                if (error.response && error.response.status === 422) {
                    const errors = error.response.data.errors;
                    if (Array.isArray(errors)) {
                        errors.forEach((msg) => {
                            notification.error({
                                message: 'Error',
                                description: msg,
                                placement: 'topRight',
                                duration: 5,
                            });
                        });
                    } else if (errors && typeof errors === 'object') {
                        for (const key of Object.keys(errors)) {
                            notification.error({
                                message: 'Error',
                                description: errors[key].join(', '),
                                placement: 'topRight',
                                duration: 5,
                            });
                        }
                    } else {
                        notification.error({
                            message: 'Error',
                            description: error.apiMessage || error.response?.data?.message || 'Validation failed.',
                            placement: 'topRight',
                            duration: 5,
                        });
                    }
                } else {
                    notification.error({
                        message: 'Error',
                        description: error.apiMessage || (error.response ? error.response.data?.message : null) || 'An unexpected error occurred.',
                        placement: 'topRight',
                        duration: 5,
                    });
                }
            }
        }
    }
}
</script>
