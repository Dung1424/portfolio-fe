<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <h1 class="mb-8 text-center text-2xl font-bold tracking-tight text-[#222] sm:text-3xl">
                Explore Categories
            </h1>
            <Transition name="skeleton-cross" mode="out-in">
                <div
                    v-if="loading"
                    key="category-skel"
                    class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                    aria-busy="true"
                    aria-label="Loading categories"
                >
                    <div
                        v-for="n in 8"
                        :key="n"
                        class="skeleton-shimmer h-48 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
                    />
                </div>
                <div
                    v-else
                    key="category-grid"
                    class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                >
                    <div
                        v-for="category in categories"
                        :key="category.id"
                        class="group relative h-48 overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] ring-1 ring-black/5"
                    >
                        <NuxtLink :to="{ name: 'DetailsCategory', query: { slugs: category.slug } }" class="block h-full">
                            <img
                                :src="category.image"
                                alt=""
                                class="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-110"
                            />
                            <div
                                class="absolute inset-0 flex items-center justify-center bg-black/70 transition duration-300 group-hover:bg-black/40"
                            >
                                <div class="px-3 text-center text-lg font-bold text-white sm:text-xl">
                                    {{ category.category_name }}
                                </div>
                            </div>
                        </NuxtLink>
                    </div>
                </div>
            </Transition>
        </div>
    </div>
</template>

<script>
import { waitRemainingSkeletonMs } from '~/composables/useSkeletonPlaceholder'
import { categoryService } from '~/features/category/services/category.api.js'

export default {
    name: "CategoryBrowsePage",
    components: {
    },
    data() {
        return {
            categories: [],
            loading: false,
        };
    },
    mounted() {
        this.fetchCategories();
    },
    methods: {
        async fetchCategories() {
            const startedAt = Date.now();
            this.loading = true;
            try {
                const response = await categoryService.fetchCategories();
                this.categories = response.data;
            } catch (error) {
                console.error('Error fetching categories:', error);
            } finally {
                await waitRemainingSkeletonMs(startedAt);
                this.loading = false;
            }
        },
    },
};
</script>
