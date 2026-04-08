<template>
    <div
        class="grid w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6"
    >
        <div
            v-if="likedGalleries.length === 0"
            class="col-span-full flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center sm:min-h-[380px]"
        >
            <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-3xl text-rose-500">
                <i class="fa-regular fa-heart" />
            </div>
            <h2 class="mb-2 text-xl font-semibold text-slate-900 sm:text-2xl">No liked galleries</h2>
            <p class="mb-6 max-w-md text-sm text-slate-500 sm:text-base">
                When you heart a gallery, it will show up here.
            </p>
            <button
                type="button"
                class="rounded-xl bg-[#0870d1] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[#0658a8]"
                @click="goToAddPhoto"
            >
                Browse galleries
            </button>
        </div>
        <template v-else>
            <div
                v-for="like in likedGalleries"
                :key="like.id"
                class="relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                @click="goToGalleryDetails(like.galleriesCode)"
            >
            <div class="flex items-center justify-between gap-2">
                <h4 class="m-0 min-w-0 flex-1 truncate text-base font-semibold text-slate-900">
                    {{ like.galleriesName }}
                </h4>
                <div
                    class="ml-1 flex w-fit shrink-0 items-center gap-1 rounded bg-[rgb(69,69,124)] px-2 py-1 text-white"
                >
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        class="shrink-0"
                    >
                        <path
                            d="M15.5333 0H0.466667C0.2 0 0 0.2 0 0.466667V10.2V15.5333C0 15.8 0.2 16 0.466667 16H15.5333C15.8 16 16 15.8 16 15.5333V13.4V0.466667C16 0.2 15.8 0 15.5333 0ZM15.0667 0.933333V12.2667L10.5333 7.66667C10.4667 7.6 10.3333 7.53333 10.2 7.53333C10.0667 7.53333 9.93333 7.6 9.86667 7.66667L8.53333 9L5.8 6.2C5.6 6 5.33333 6 5.13333 6.13333L0.933333 9.26667V0.933333H15.0667ZM15.0667 15.0667H0.933333V10.4667L3.8 8.33333L5.86667 10.4C5.93333 10.4667 6.06667 10.5333 6.2 10.5333C6.33333 10.5333 6.46667 10.4667 6.53333 10.4C6.73333 10.2 6.73333 9.93333 6.53333 9.73333L4.53333 7.73333L5.4 7.06667L8.26667 9.93333L9.6 11.2667C9.66667 11.3333 9.8 11.4 9.93333 11.4C10.0667 11.4 10.2 11.3333 10.2667 11.2667C10.4667 11.0667 10.4667 10.8 10.2667 10.6L9.26667 9.6L10.2667 8.6L15.1333 13.5333V15.0667H15.0667Z"
                            fill="white"
                        />
                    </svg>
                    <span class="text-sm text-neutral-100">{{ like.galleriesPhoto?.length || 0 }}</span>
                </div>
            </div>

            <div v-if="!like.galleriesPhoto || like.galleriesPhoto.length === 0" class="mt-2 flex min-h-[180px] flex-col items-center justify-center rounded-xl bg-slate-100/90">
                <i class="fa-regular fa-image text-4xl text-slate-300" />
                <p class="m-0 mt-2 text-sm text-slate-400">Empty</p>
            </div>
            <div v-else-if="like.galleriesPhoto.length === 1" class="mt-2 flex h-[200px] w-full overflow-hidden rounded-xl bg-slate-100">
                <img
                    :src="like.galleriesPhoto[0].image_url"
                    :alt="like.galleriesPhoto[0].title"
                    class="h-full w-full object-cover"
                />
            </div>
            <div v-else class="mt-2 grid flex-1 grid-cols-2 gap-1.5">
                <img
                    v-for="photo in like.galleriesPhoto.slice(0, 4)"
                    :key="photo.id"
                    :src="photo.image_url"
                    :alt="photo.title"
                    class="h-[100px] w-full rounded-lg object-cover"
                />
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3" @click.stop>
                <NuxtLink :to="{ name: 'MyProfile', params: { username: like.username } }" class="shrink-0">
                    <img
                        class="h-8 w-8 rounded-full object-cover"
                        :src="like.userAvatar || '/images/imageUserDefault.png'"
                        alt="User Avatar"
                    />
                </NuxtLink>
                <h4 class="m-0 min-w-0 flex-1 text-sm font-semibold text-slate-900">{{ like.name || 'Unknown' }}</h4>
                <div class="ml-auto flex shrink-0 items-center">
                    <button
                        type="button"
                        class="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        @click.stop="showDeleteLikeConfirm(like)"
                    >
                        <i class="fa-solid fa-trash-can text-sm" />
                    </button>
                </div>
            </div>
            </div>
        </template>
    </div>
</template>

<script>
export default {
    name: 'GalleryLikeGrid',
    props: {
        likedGalleries: {
            type: Array,
            required: true
        }
    },
    emits: ['delete-like'],
    methods: {
        goToGalleryDetails(galleriesCode) {
            this.$router.push({
                name: 'GalleryDetailsUser',
                params: { galleries_code: galleriesCode }
            });
        },
        showDeleteLikeConfirm(like) {
            this.$emit('delete-like', like);
        },
        goToAddPhoto() {
            this.$router.push('/');
        }
    }
};
</script>
