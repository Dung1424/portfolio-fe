<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
            <div
                class="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:p-10"
            >
                <h2 class="mb-2 text-center text-xl font-bold tracking-tight text-[#222] sm:text-2xl">Set new password</h2>
                <p class="mb-6 text-center text-sm text-zinc-600">
                    Choose a new password for <span class="font-medium text-zinc-800">{{ emailFromLink || 'your account' }}</span>.
                </p>

                <div
                    v-if="!tokenFromLink || !emailFromLink"
                    class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left text-sm text-amber-900"
                >
                    This link is invalid or incomplete. Please request a new reset link from
                    <NuxtLink to="/forgot-password" class="font-semibold text-blue-600 hover:underline">Forgot password</NuxtLink>.
                </div>

                <form v-else class="space-y-4" @submit.prevent="handleSubmit">
                    <p v-if="generalError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {{ generalError }}
                    </p>

                    <div class="space-y-1.5 text-left">
                        <label for="password" class="block text-sm font-medium text-zinc-700">New password</label>
                        <div class="relative">
                            <i
                                class="fas fa-lock pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
                            />
                            <input
                                id="password"
                                v-model="password"
                                :type="showPassword ? 'text' : 'password'"
                                required
                                autocomplete="new-password"
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                tabindex="-1"
                                class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                                @click="showPassword = !showPassword"
                            >
                                <i
                                    class="fas text-sm"
                                    :class="showPassword ? 'fa-eye-slash' : 'fa-eye'"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                        <span v-if="errors.password && errors.password.length" class="block text-sm text-red-600">{{
                            errors.password[0]
                        }}</span>
                    </div>

                    <div class="space-y-1.5 text-left">
                        <label for="password_confirmation" class="block text-sm font-medium text-zinc-700"
                            >Confirm new password</label
                        >
                        <div class="relative">
                            <i
                                class="fas fa-lock pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
                            />
                            <input
                                id="password_confirmation"
                                v-model="password_confirmation"
                                :type="showPasswordConfirm ? 'text' : 'password'"
                                required
                                autocomplete="new-password"
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-10 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                tabindex="-1"
                                class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
                                :aria-label="showPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'"
                                @click="showPasswordConfirm = !showPasswordConfirm"
                            >
                                <i
                                    class="fas text-sm"
                                    :class="showPasswordConfirm ? 'fa-eye-slash' : 'fa-eye'"
                                    aria-hidden="true"
                                />
                            </button>
                        </div>
                        <span
                            v-if="errors.password_confirmation && errors.password_confirmation.length"
                            class="block text-sm text-red-600"
                        >
                            {{ errors.password_confirmation[0] }}
                        </span>
                    </div>

                    <button
                        type="submit"
                        :disabled="submitting"
                        class="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {{ submitting ? 'Saving…' : 'Reset password' }}
                    </button>
                </form>

                <p class="mt-8 text-center text-sm text-zinc-600">
                    <NuxtLink to="/login" class="font-semibold text-blue-600 hover:underline">← Back to sign in</NuxtLink>
                </p>
            </div>
        </div>
    </div>
</template>
<script>
import { authService } from '~/features/auth/services/auth.api.js'
import { flattenErrorMessages, getErrorMessage } from '~/services/apiEnvelope.js'
import { notification } from 'ant-design-vue'

function pickQueryString(route, key) {
    const raw = route.query[key]
    if (typeof raw === 'string' && raw.trim()) {
        return raw.trim()
    }
    if (Array.isArray(raw) && raw[0]) {
        return String(raw[0]).trim()
    }
    return ''
}

export default {
    name: 'AuthResetPassword',
    data() {
        return {
            tokenFromLink: '',
            emailFromLink: '',
            password: '',
            password_confirmation: '',
            showPassword: false,
            showPasswordConfirm: false,
            submitting: false,
            generalError: '',
            errors: {
                password: [],
                password_confirmation: [],
            },
        }
    },
    watch: {
        '$route.query': {
            handler() {
                this.syncFromRoute()
            },
            deep: true,
        },
    },
    created() {
        this.syncFromRoute()
    },
    methods: {
        syncFromRoute() {
            const route = this.$route
            this.tokenFromLink = pickQueryString(route, 'token')
            this.emailFromLink = pickQueryString(route, 'email')
            this.generalError = ''
            this.errors = { password: [], password_confirmation: [] }
        },
        async handleSubmit() {
            if (!this.tokenFromLink || !this.emailFromLink) {
                return
            }
            this.generalError = ''
            this.errors = { password: [], password_confirmation: [] }
            this.submitting = true
            try {
                const response = await authService.resetPassword({
                    email: this.emailFromLink,
                    token: this.tokenFromLink,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                })
                notification.success({
                    message: 'Password updated',
                    description:
                        typeof response?.apiMessage === 'string' && response.apiMessage
                            ? response.apiMessage
                            : 'You can sign in with your new password.',
                    placement: 'topRight',
                    duration: 4,
                })
                await this.$router.push('/login')
            } catch (error) {
                console.error(error)
                const raw = error.response?.data?.errors
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    this.errors = { ...this.errors, ...raw }
                } else {
                    const msgs = flattenErrorMessages(raw ?? error.apiErrors)
                    this.generalError = msgs.length
                        ? msgs.join('\n')
                        : getErrorMessage(error, 'Could not reset password. The link may have expired.')
                }
            } finally {
                this.submitting = false
            }
        },
    },
}
</script>
