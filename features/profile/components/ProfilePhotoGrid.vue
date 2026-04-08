<template>
    <div
        class="grid w-full grid-cols-2 gap-0.5 bg-[#f7f8fa] px-0.5 pt-2 pb-4 sm:gap-1 md:grid-cols-3"
    >
        <div
            v-for="photo in photos"
            :key="photo.id"
            class="group relative aspect-[3/2] w-full overflow-hidden bg-zinc-200"
        >
            <div class="relative h-full w-full">
                <NuxtLink
                    :to="{ name: 'PhotoDetail', params: { token: photo.photo_token } }"
                    class="block h-full w-full"
                >
                    <img
                        :src="photo.image_url"
                        :alt="photo.title"
                        class="h-full w-full object-cover"
                    />
                </NuxtLink>
                <div
                    class="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/50 px-2 py-2 text-white opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100"
                >
                    <p class="m-0 truncate pr-2 text-xs sm:text-sm">
                        {{ truncateTitle(photo.title) }}
                    </p>
                    <i
                        class="fa-regular fa-square-plus shrink-0 cursor-pointer text-lg sm:text-xl"
                        role="button"
                        tabindex="0"
                        @click="openAddToGalleryModal(photo.id)"
                        @keydown.enter.prevent="openAddToGalleryModal(photo.id)"
                    />
                </div>
            </div>
        </div>
    </div>
    <AddToGalleryModal
        :is-visible="showAddToGallery"
        :photo-id="selectedPhotoId"
        @close="closeAddToGalleryModal"
    />
</template>

<script>
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'

export default {
    name: 'ProfilePhotoGrid',
    components: {
        AddToGalleryModal,
    },
    props: {
        photos: {
            type: Array,
            required: true,
        },
        checkLogin: {
            type: Function,
            required: true,
        },
    },
    data() {
        return {
            showAddToGallery: false,
            selectedPhotoId: null,
        }
    },
    methods: {
        async openAddToGalleryModal(id) {
            const isLoggedIn = await this.checkLogin()
            if (!isLoggedIn) {
                return
            }
            this.selectedPhotoId = id
            this.showAddToGallery = true
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false
        },
        truncateTitle(title) {
            const maxLength = 30
            if (!title) {
                return 'Untitled'
            }
            if (title.length > maxLength) {
                return `${title.substring(0, maxLength)}...`
            }
            return title
        },
    },
}
</script>
