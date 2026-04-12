<template>
    <div class="grid w-full grid-cols-1 gap-4 bg-[#f7f8fa] pb-4 pt-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <div
            v-for="gallery in galleries"
            :key="gallery.id"
            class="flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border border-zinc-200/80 bg-neutral-100 p-3 shadow-sm"
            :data-visibility="gallery.visibility"
            @click="goToGalleryDetails(gallery.galleries_code)"
        >
            <div class="mb-1 flex items-center justify-between gap-2">
                <h4 class="m-0 min-w-0 flex-1 truncate text-base font-medium text-zinc-900">
                    {{ gallery.galleries_name }}
                </h4>
                <div
                    class="ml-1 flex w-fit shrink-0 items-center gap-1.5 break-words rounded bg-[rgb(69,69,124)] px-2 py-1 text-white"
                >
                    <svg
                        class="h-4 w-4 shrink-0"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            d="M15.5333 0H0.466667C0.2 0 0 0.2 0 0.466667V10.2V15.5333C0 15.8 0.2 16 0.466667 16H15.5333C15.8 16 16 15.8 16 15.5333V13.4V0.466667C16 0.2 15.8 0 15.5333 0ZM15.0667 0.933333V12.2667L10.5333 7.66667C10.4667 7.6 10.3333 7.53333 10.2 7.53333C10.0667 7.53333 9.93333 7.6 9.86667 7.66667L8.53333 9L5.8 6.2C5.6 6 5.33333 6 5.13333 6.13333L0.933333 9.26667V0.933333H15.0667ZM15.0667 15.0667H0.933333V10.4667L3.8 8.33333L5.86667 10.4C5.93333 10.4667 6.06667 10.5333 6.2 10.5333C6.33333 10.5333 6.46667 10.4667 6.53333 10.4C6.73333 10.2 6.73333 9.93333 6.53333 9.73333L4.53333 7.73333L5.4 7.06667L8.26667 9.93333L9.6 11.2667C9.66667 11.3333 9.8 11.4 9.93333 11.4C10.0667 11.4 10.2 11.3333 10.2667 11.2667C10.4667 11.0667 10.4667 10.8 10.2667 10.6L9.26667 9.6L10.2667 8.6L15.1333 13.5333V15.0667H15.0667Z"
                            fill="white"
                        />
                    </svg>
                    <span class="text-sm text-neutral-100">{{ gallery.photo.length }}</span>
                </div>
            </div>

            <div
                v-if="gallery.photo.length === 0"
                class="flex h-[220px] flex-col items-center justify-center rounded-lg bg-[rgb(215,216,219)]"
            >
                <i class="fa-regular fa-image text-5xl text-[#b0b0b0]" aria-hidden="true" />
                <p class="m-0 text-[#b0b0b0]">
                    Gallery is empty
                </p>
            </div>
            <div
                v-else-if="gallery.photo.length === 1"
                class="flex h-[200px] overflow-hidden rounded-lg bg-neutral-100"
            >
                <img
                    :src="resolveMediaUrl(gallery.photo[0].image_url)"
                    :alt="gallery.photo[0].title"
                    class="h-full w-full object-cover"
                />
            </div>
            <div
                v-else
                class="grid flex-1 grid-cols-2 gap-1"
            >
                <img
                    v-for="photo in gallery.photo.slice(0, 4)"
                    :key="photo.id"
                    :src="resolveMediaUrl(photo.image_url)"
                    :alt="photo.title"
                    class="h-[100px] w-full rounded-lg object-cover"
                />
            </div>

            <div
                class="mt-2 flex items-center justify-between gap-2 pt-2"
                @click.stop
            >
                <div class="flex min-w-0 flex-1 items-center gap-2">
                    <img
                        v-if="gallery.user && gallery.user.profile_picture"
                        class="h-8 w-8 shrink-0 rounded-full object-cover"
                        :src="resolveMediaUrl(gallery.user.profile_picture)"
                        alt=""
                    />
                    <img
                        v-else
                        class="h-8 w-8 shrink-0 rounded-full object-cover"
                        src="/images/imageUserDefault.png"
                        alt=""
                    />
                    <h4 class="m-0 truncate text-sm font-medium text-zinc-800">
                        {{ gallery.user?.username || 'Anonymous' }}
                    </h4>
                </div>
                <button
                    type="button"
                    class="shrink-0 rounded-lg p-1 text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
                    aria-label="Like gallery"
                    @click.stop="toggleLikeGallery(gallery)"
                >
                    <i
                        :class="[
                            gallery.liked ? 'fas' : 'fa-regular',
                            'fa-heart text-xl transition-colors',
                            gallery.liked ? 'text-[#ff5a5f]' : 'text-zinc-400',
                        ]"
                    />
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { useLikeStore } from '~/stores/likeStore'
import { useAuthStore } from '~/stores/authStore'

export default {
    name: 'ProfileGalleryGrid',
    props: {
        galleries: {
            type: Array,
            required: true,
        },
        activeDropdown: {
            type: String,
            default: null,
        },
    },
    setup() {
        const { data: likesReady } = useApiAsyncData('profile-gallery-liked', async () => {
            await useLikeStore().fetchLikedGalleries()
            return true
        })
        const { resolveMediaUrl } = useResolvePublicMediaUrl()
        return { likesReady, resolveMediaUrl }
    },
    computed: {
        likeStore() {
            return useLikeStore()
        },
        authStore() {
            return useAuthStore()
        },
    },
    watch: {
        likesReady: {
            handler(val) {
                if (val) {
                    this.updateLikedState()
                }
            },
            immediate: true,
        },
        galleries: {
            handler() {
                this.updateLikedState()
            },
            deep: true,
            immediate: true,
        },
    },
    methods: {
        goToGalleryDetails(galleries_code) {
            this.$router.push({ name: 'GalleryDetailsUser', params: { galleries_code } })
        },
        async toggleLikeGallery(gallery) {
            if (!this.authStore.isLoggedIn) {
                this.$router.push({ name: 'Login' })
                return
            }
            try {
                if (gallery.liked) {
                    await this.likeStore.unlikeGallery(gallery.id)
                } else {
                    await this.likeStore.likeGallery(gallery.id, gallery.user ? gallery.user.id : null)
                }
                this.updateLikedState()
            } catch (error) {
                console.error('Failed to toggle like on gallery:', error)
            }
        },
        updateLikedState() {
            this.galleries.forEach((gallery) => {
                gallery.liked = this.likeStore.likedGalleries.includes(gallery.id)
            })
        },
    },
}
</script>
