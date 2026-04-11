<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
            <div
                class="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:p-10"
            >
                <h2 class="mb-6 text-center text-xl font-bold tracking-tight text-[#222] sm:text-2xl">Sign Up</h2>

                <form class="space-y-4" @submit.prevent="handleRegister">
                    <p v-if="generalError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {{ generalError }}
                    </p>
                    <div class="space-y-1.5 text-left">
                        <label for="username" class="block text-sm font-medium text-zinc-700">User name</label>
                        <div class="relative">
                            <i
                                class="fas fa-user pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400"
                            />
                            <input
                                id="username"
                                v-model="username"
                                type="text"
                                required
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <span v-if="errors.username && errors.username.length" class="block text-sm text-red-600">{{
                            errors.username[0]
                        }}</span>
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
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <span v-if="errors.email && errors.email.length" class="block text-sm text-red-600">{{
                            errors.email[0]
                        }}</span>
                    </div>

                    <div class="space-y-1.5 text-left">
                        <label for="password" class="block text-sm font-medium text-zinc-700">Password</label>
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
                            >Confirm password</label
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

                    <div class="flex items-center justify-between gap-3 pt-1 text-sm">
                        <label class="flex cursor-pointer items-center gap-2 text-zinc-600">
                            <input type="checkbox" class="h-4 w-4 rounded border-neutral-300 text-blue-600 accent-blue-600" />
                            Remember me
                        </label>
                        <NuxtLink to="/forgot-password" class="shrink-0 text-blue-600 hover:underline"
                            >Forgot password?</NuxtLink
                        >
                    </div>

                    <button
                        type="submit"
                        class="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Register
                    </button>

                    <p class="mt-6 text-center text-sm text-zinc-600">
                        Already have an account?
                        <NuxtLink to="/login" class="font-semibold text-blue-600 hover:underline">Sign in</NuxtLink>
                    </p>
                </form>
            </div>
        </div>
    </div>
</template>
<script>
import { authService } from '~/features/auth/services/auth.api.js'
import { flattenErrorMessages, getErrorMessage } from '~/services/apiEnvelope.js'
import { notification } from "ant-design-vue"

export default {
    name: 'AuthRegister',
    data() {
        return {
            username: '',
            email: '',
            password: '',
            password_confirmation: '',
            showPassword: false,
            showPasswordConfirm: false,
            generalError: '',
            errors: {
                username: [],
                email: [],
                password: [],
                password_confirmation: []
            }
        };
    },
    methods: {
        async handleRegister() {
            this.generalError = '';
            try {
                await authService.register({
                    username: this.username,
                    email: this.email,
                    password: this.password,
                    password_confirmation: this.password_confirmation,
                });
                notification.success({
                    message: "Success",
                    description: "Registration successful! Please login to continue.",
                    placement: "topRight",
                    duration: 3,
                });
                this.$router.push("/login");
            } catch (error) {
                console.error('Registration failed', error);
                const raw = error.response?.data?.errors;
                if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                    this.errors = { ...this.errors, ...raw };
                } else {
                    const msgs = flattenErrorMessages(raw ?? error.apiErrors);
                    this.generalError = msgs.length ? msgs.join('\n') : getErrorMessage(error, 'Registration failed. Please check your input.');
                }
            }
        }
    }
}
</script>
