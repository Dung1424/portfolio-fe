<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <section class="relative h-[min(50vh,500px)] w-full overflow-hidden">
            <img
                src="/images/covers/covers_0.jpeg"
                alt=""
                class="absolute inset-0 h-full w-full object-cover"
            />
            <div
                class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 px-4 text-center text-white"
            >
                <h2 class="max-w-3xl text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
                    Mastering Light and Perspective in Urban Architecture
                </h2>
                <p class="mt-3 text-sm text-white/90 sm:text-base">Published by MyPortfolio Blog - 7 days ago</p>
                <p class="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                    Architectural photography goes beyond capturing buildings...
                </p>
            </div>
        </section>

        <section
            v-for="blog in latestBlogs"
            :key="blog.id"
            class="border-b border-neutral-200/80 bg-white"
        >
            <div
                class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:gap-10 lg:px-8"
            >
                <img
                    :src="blog.cover_image"
                    alt=""
                    class="h-48 w-full shrink-0 rounded-2xl object-cover shadow-[0_2px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5 md:h-[300px] md:w-[min(100%,500px)]"
                />
                <div class="min-w-0 flex-1 text-left">
                    <h2 class="text-xl font-bold tracking-tight text-[#222] sm:text-2xl">{{ blog.title }}</h2>
                    <p class="mt-2 text-sm text-zinc-600">
                        Published by MyPortfolio Blog - {{ timeAgo(blog.created_at) }}
                    </p>
                    <button
                        type="button"
                        class="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        @click="goToBlog(blog.slug)"
                    >
                        Keep reading
                    </button>
                </div>
            </div>
        </section>

        <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <h2 class="mb-8 text-xl font-bold tracking-tight text-[#222] sm:text-2xl">Latest Posts</h2>
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <article
                    v-for="blog in olderBlogs"
                    :key="blog.id"
                    class="cursor-pointer overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-100/80 p-2 shadow-sm ring-1 ring-black/[0.04] transition hover:border-neutral-300 hover:shadow-md"
                    @click="goToBlog(blog.slug)"
                >
                    <img
                        :src="blog.cover_image"
                        alt=""
                        class="h-40 w-full rounded-xl object-cover"
                    />
                    <div class="p-3 text-left">
                        <h3 class="line-clamp-2 text-base font-semibold text-zinc-900">{{ blog.title }}</h3>
                        <p class="mt-1 text-sm text-zinc-600">MyPortfolio Blog - {{ timeAgo(blog.created_at) }}</p>
                    </div>
                </article>
            </div>
        </section>
    </div>
</template>

<script>
import { notification } from 'ant-design-vue'
import { blogService } from '~/features/blog/services/blog.api.js'

export default {
    name: "BlogComponent",
    components: {
    },
    data() {
        return {
            featuredBlog: {},
            latestBlogs: [],
            olderBlogs: [],
        };
    },
    mounted() {
        this.fetchLatestBlogs();
        this.fetchOlderBlogs();
    },
    methods: {
        async fetchLatestBlogs() {
            try {
                const response = await blogService.fetchLatest();
                const d = response.data;
                const blogs = d.blogs ?? (Array.isArray(d) ? d : []);
                if (blogs.length > 0) {
                    this.latestBlogs = blogs;
                } else {
                    throw new Error('No latest blogs found');
                }
            } catch (error) {
                console.error('Error fetching latest blogs:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to load latest blogs.',
                });
            }
        },
        async fetchOlderBlogs() {
            try {
                const response = await blogService.fetchOlder();
                const d = response.data;
                const blogs = d.blogs ?? (Array.isArray(d) ? d : []);
                this.olderBlogs = blogs;
            } catch (error) {
                console.error('Error fetching older blogs:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to load older blogs.',
                });
            }
        },
        timeAgo(date) {
            const now = new Date();
            const past = new Date(date);
            const diffTime = Math.abs(now - past);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays === 0 ? "Today" : `${diffDays} days ago`;
        },
        goToBlog(slug) {
            this.$router.push({name: 'BlogDetails', params: {slug}});
        },
    },
};
</script>
