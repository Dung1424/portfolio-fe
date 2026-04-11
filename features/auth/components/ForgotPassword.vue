<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
            <div
                class="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:p-10"
            >
                <h2 class="mb-2 text-center text-xl font-bold tracking-tight text-[#222] sm:text-2xl">Forgot password</h2>
                <p class="mb-6 text-center text-sm text-zinc-600">
                    Enter your email and we will send you a link to reset your password if an account exists.
                </p>
                <form class="space-y-4" @submit.prevent="handleSubmit">
                    <div
                        v-if="errorMessage"
                        class="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm text-red-700"
                    >
                        {{ errorMessage }}
                    </div>

                    <div class="space-y-1.5 text-left">
                        <label for="email" class="block text-sm font-medium text-zinc-700">Email</label>
                        <div class="relative">
                            <i
                                class="fas fa-envelope pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
                            />
                            <input
                                id="email"
                                v-model="email"
                                type="email"
                                required
                                autofocus
                                autocomplete="email"
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        :disabled="submitting"
                        class="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {{ submitting ? 'Sending…' : 'Send reset link' }}
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
import { getErrorMessage } from '~/services/apiEnvelope.js'
import { notification } from 'ant-design-vue'

export default {
    name: 'AuthForgotPassword',
    data() {
        return {
            email: '',
            submitting: false,
            errorMessage: '',
        }
    },
    methods: {
        async handleSubmit() {
            this.errorMessage = ''
            this.submitting = true
            try {
                const response = await authService.forgotPassword({ email: this.email })
                const msg =
                    typeof response?.apiMessage === 'string' && response.apiMessage
                        ? response.apiMessage
                        : 'If the email exists in our system, you will receive instructions to reset your password.'
                notification.success({
                    message: 'Check your email',
                    description: msg,
                    placement: 'topRight',
                    duration: 4,
                })
                this.$router.push('/login')
            } catch (error) {
                console.error(error)
                this.errorMessage = getErrorMessage(error, 'Could not send reset email. Please try again.')
            } finally {
                this.submitting = false
            }
        },
    },
}
</script>
