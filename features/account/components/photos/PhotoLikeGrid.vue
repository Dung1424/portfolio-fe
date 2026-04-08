<template>
    <div>
        <div
            v-if="likedPhotos.length === 0"
            class="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-gray-300 bg-white px-6 py-14 text-center"
        >
            <i class="fa-regular fa-heart mb-3 text-4xl text-gray-300" />
            <p class="text-sm font-medium text-gray-800">No liked photos</p>
            <p class="mt-1 text-xs text-gray-500">Heart photos while browsing to save them here.</p>
            <button
                type="button"
                class="mt-5 rounded-full bg-[#0870d1] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
                @click="goToAddPhoto"
            >
                Discover
            </button>
        </div>
        <div
            v-else
            class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
        >
            <div
                v-for="like in likedPhotos"
                :key="like.id"
                class="group flex flex-col border border-gray-200 bg-white"
            >
                <div class="relative aspect-square w-full overflow-hidden bg-gray-100">
                    <NuxtLink
                        v-if="like.photoToken"
                        :to="{ name: 'PhotoDetail', params: { token: like.photoToken } }"
                        class="block h-full w-full"
                    >
                        <img
                            :src="like.imageUrl"
                            alt="photo"
                            class="h-full w-full object-cover transition group-hover:opacity-95"
                        />
                    </NuxtLink>
                    <div v-else class="block h-full w-full">
                        <img
                            :src="like.imageUrl"
                            alt="photo"
                            class="h-full w-full object-cover opacity-80"
                        />
                    </div>
                    <div
                        class="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-1 bg-black/45 px-2 py-1.5 text-white opacity-0 transition group-hover:opacity-100"
                    >
                        <NuxtLink :to="{ name: 'MyProfile', params: { username: like.userName } }" class="shrink-0">
                            <img
                                :src="like.userAvatar"
                                alt=""
                                class="h-7 w-7 rounded-full border border-white object-cover"
                            />
                        </NuxtLink>
                        <span class="min-w-0 flex-1 truncate text-xs">{{ like.name }}</span>
                        <button
                            type="button"
                            class="shrink-0 rounded-full bg-white/90 p-1.5 text-gray-700 hover:bg-white"
                            aria-label="Remove like"
                            @click="showDeleteLikeConfirm(like)"
                        >
                            <i class="fa-solid fa-trash-can text-xs" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: "PhotoLikeGrid",
    props: {
        likedPhotos: {
            type: Array,
            required: true
        }
    },
    emits: ['delete-like'],
    methods: {
        showDeleteLikeConfirm(like) {
            this.$emit('delete-like', like);
        },
        goToAddPhoto() {
            this.$router.push('/');
        }
    }
};
</script>
