<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 pb-16 pt-10 sm:px-6">
            <div
                class="rounded-2xl border border-neutral-200/80 bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5 sm:p-10"
            >
                <h2 class="mb-6 text-center text-xl font-bold tracking-tight text-[#222] sm:text-2xl">Sign In</h2>
                <form class="space-y-4" @submit.prevent="handleLogin">
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
                                class="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
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
                                autocomplete="current-password"
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
                        Login
                    </button>
                </form>

                <p class="mt-8 text-center text-sm text-zinc-600">
                    Create a new account?
                    <NuxtLink to="/register" class="font-semibold text-blue-600 hover:underline">Sign up</NuxtLink>
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
    name: 'AuthLogin',
    data() {
        return {
            email: '',
            password: '',
            showPassword: false,
            errorMessage: '',
        };
    },
    mounted() {
        const successMessage = localStorage.getItem("successMessage");
        if (successMessage) {
            notification.success({
                message: "Success",
                description: successMessage,
                placement: "topRight",
                duration: 3,
            });
            localStorage.removeItem("successMessage");
        }
    },
    methods: {
        async handleLogin() {
            try {
                const response = await authService.login({
                    email: this.email,
                    password: this.password,
                });

                localStorage.setItem('token', response.data.token);
                localStorage.setItem('refresh_token', response.data.refresh_token);

                window.location.href = response.data.route;
            } catch (error) {
                console.error(error);
                this.errorMessage = getErrorMessage(error, 'Login failed, please try again.');
            }
        }
    }
}
</script>
