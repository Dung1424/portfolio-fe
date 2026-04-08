<template>
    <div v-if="isVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div class="relative max-h-[600px] w-[450px] max-w-[90%] overflow-y-auto rounded-lg bg-white p-[6px] shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
            <div class="sticky top-[-10px] z-10 flex items-center justify-start border-b border-[#ccc] bg-white p-[10px]">
                <span class="cursor-pointer" @click="closeModal">
                    <i class="fa-solid fa-xmark"></i>
                </span>
                <h2 class="mr-[35px] flex-grow text-center text-xl font-bold text-black">Add to Gallery</h2>
            </div>

            <button class="inline-flex max-h-12 w-full cursor-pointer items-center justify-center rounded-[28px] border-2 border-solid border-[#0870d1] bg-white px-[22px] py-3 text-base font-bold leading-5 text-[#0870d1] hover:bg-[#dddddd]" @click="goToAddGallery">Create new Gallery</button>
            <hr class="my-5 h-px border-none bg-[#ccc]" />
            <div class="relative w-full">
                <i class="fa-solid fa-magnifying-glass pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-base text-[#888]"></i>
                <input
                    class="w-full rounded-[100px] border border-[#ccc] bg-[#eeeff2] px-[10px] py-[10px] pl-[35px] text-sm outline-none focus:border-[#0078ff]"
                    type="text"
                    placeholder="Search Galleries"
                    v-model="searchTerm"
                />
            </div>

            <ul class="mt-3 list-none p-0">
                <li v-for="gallery in filteredGalleries" :key="gallery.id" class="flex cursor-pointer items-center p-[15px] hover:bg-[#f1f1f1]" @click="addPhoto(gallery.id)">
                    <img :src="gallery.photo && gallery.photo.length ? gallery.photo[0].image_url : '/images/galleryDefaultImage.png'"
                         alt="Gallery Image"
                         class="mr-[10px] h-[60px] w-[60px] rounded-[5px]" />
                    <span class="grow text-base text-[#222]">{{ gallery.galleries_name }}</span>
                    <i v-if="gallery.visibility === 1" class="fa-solid fa-lock"></i>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import { useGalleryStore } from '~/stores/galleryStore.js';

export default {
    props: {
        isVisible: {
            type: Boolean,
            required: true,
        },
        photoId: {
            type: Number,
            required: true,
        }
    },
    emits: ['close'],
    data() {
        return {
            searchTerm: "",
        };
    },
    computed: {
        filteredGalleries() {
            return this.galleries.filter((gallery) =>
                gallery.galleries_name.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        },
        galleries() {
            return this.galleryStore.galleries;
        }
    },
    methods: {
        closeModal() {
            this.$emit("close");
        },
        goToAddGallery() {
            this.closeModal();
            this.$router.push({
                path: '/account',
                query: { tab: 'galleries', createGallery: '1' },
            });
        },
        async addPhoto(galleryId) {
            try {
                await this.galleryStore.addPhotoToGallery(galleryId, this.photoId);
                this.closeModal();
            } catch (error) {
                console.error('Failed to add photo to gallery:', error);
            }
        }
    },
    setup() {
        const galleryStore = useGalleryStore();
        useApiAsyncData('add-to-gallery-modal-galleries', () =>
            galleryStore.fetchGalleries().then(() => true)
        )
        return { galleryStore };
    }
};
</script>
