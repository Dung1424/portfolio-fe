<template>
    <div class="min-h-[calc(100vh-60px)] w-full bg-gray-50">
        <div class="flex w-full flex-col lg:min-h-[calc(100vh-60px)] lg:flex-row lg:items-stretch">
            <Sidebar />
            <main class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-gray-200 bg-white">
                <div class="flex flex-col px-3 py-4 sm:px-4 sm:py-5 lg:px-5">
                    <div v-if="gallery" class="relative mb-4 text-center sm:mb-5">
                        <button
                            type="button"
                            class="absolute left-0 top-0 z-10 rounded-lg p-2 text-zinc-700 transition hover:bg-zinc-100"
                            aria-label="Back"
                            @click="goBack"
                        >
                            <i class="fas fa-arrow-left text-xl" />
                        </button>
                        <h1 class="m-0 px-11 text-xl font-bold leading-snug text-zinc-900 sm:text-2xl">
                            {{ gallery.galleries_name }}
                        </h1>
                        <div class="mt-2 flex flex-wrap items-center justify-center gap-2 px-11">
                            <span class="max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">{{
                                gallery.galleries_description
                            }}</span>
                            <button
                                type="button"
                                class="shrink-0 rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
                                aria-label="Edit gallery"
                                @click="goToEditGallery(gallery.galleries_code)"
                            >
                                <i class="fa-solid fa-pencil text-lg" />
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="gallery && gallery.photo.length === 0"
                        class="flex min-h-[320px] flex-col items-center justify-center py-8 text-center text-zinc-600"
                    >
                        <h2 class="mb-2 text-2xl font-semibold text-zinc-900">Add photos to this Gallery</h2>
                        <p class="mb-6 max-w-lg text-zinc-600">
                            Curate inspirational photos, or tell a story with your own photos.
                        </p>
                        <button
                            type="button"
                            class="rounded-lg bg-[#0870d1] px-5 py-2.5 text-base font-medium text-white transition hover:brightness-95"
                            @click="goToAddPhoto"
                        >
                            Add Photos
                        </button>
                    </div>
                    <div
                        v-else-if="gallery"
                        class="mt-2 max-h-[calc(100vh-7rem)] w-full min-w-0 overflow-y-auto overflow-x-hidden"
                    >
                        <div
                            class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5"
                        >
                            <div
                                v-for="photo in gallery.photo"
                                :key="photo.id"
                                class="group relative aspect-[4/3] w-full min-w-0"
                            >
                                <!-- overflow chỉ trên khung ảnh — tránh clip menu 3 chấm -->
                                <div
                                    class="absolute inset-0 overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-black/5"
                                >
                                    <NuxtLink
                                        v-if="photo.photo_token"
                                        class="block h-full w-full"
                                        :to="{ name: 'PhotoDetail', params: { token: photo.photo_token } }"
                                    >
                                        <img
                                            :src="photo.image_url"
                                            :alt="photo.title"
                                            class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                                        />
                                    </NuxtLink>
                                    <img
                                        v-else
                                        :src="photo.image_url"
                                        :alt="photo.title"
                                        class="h-full w-full object-cover opacity-80"
                                    />
                                </div>
                                <div
                                    class="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100"
                                >
                                        <img
                                            :src="photo.user.profile_picture || '/images/imageUserDefault.png'"
                                            alt=""
                                            class="h-8 w-8 shrink-0 rounded-full border-2 border-white object-cover"
                                        />
                                        <span class="min-w-0 max-w-[120px] truncate text-sm text-white">
                                            {{ photo.user.username || 'Unknown User' }}
                                        </span>
                                        <span
                                            class="pointer-events-auto cursor-pointer text-lg text-white"
                                            @click.stop="toggleLike(photo)"
                                        >
                                            <i :class="['fas', 'fa-heart', photo.liked ? 'text-red-400' : 'text-white']" />
                                        </span>
                                        <span
                                            class="pointer-events-auto cursor-pointer text-lg text-white"
                                            @click.stop="showDeletePhotoConfirm(photo)"
                                        >
                                            <i class="fa-solid fa-trash-can" />
                                        </span>
                                        <div class="relative z-20 ml-auto">
                                            <button
                                                type="button"
                                                class="pointer-events-auto rounded-full border-0 bg-transparent p-1 text-xl text-white focus:outline-none"
                                                :class="activeDropdown === 'dropdown-' + photo.id ? 'bg-[#1890ff]' : ''"
                                                @click.stop="toggleDropdown('dropdown-' + photo.id)"
                                            >
                                                <i class="fa-solid fa-ellipsis" />
                                            </button>
                                            <div
                                                v-if="activeDropdown === 'dropdown-' + photo.id"
                                                class="pointer-events-auto absolute bottom-full right-0 z-[200] mb-1 min-w-[180px] overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/10"
                                                @click.stop
                                            >
                                                <ul class="m-0 list-none p-0">
                                                    <li
                                                        class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm text-zinc-900 transition hover:bg-[#1890ff] hover:text-white"
                                                        @click.stop="openAddToGalleryModal(photo.id)"
                                                    >
                                                        <i class="fa-solid fa-plus" /> Add to Gallery
                                                    </li>
                                                    <li
                                                        class="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm text-zinc-900 transition hover:bg-[#1890ff] hover:text-white"
                                                    >
                                                        <i class="fa-solid fa-flag" /> Report this photo
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <AddToGalleryModal
        :is-visible="showAddToGallery"
        :photo-id="selectedPhotoId"
        @close="closeAddToGalleryModal"
    />
    <GalleryEditorModal
        v-model:open="showEditGalleryModal"
        mode="edit"
        :galleries-code="editGalleryCode"
        @success="onEditGallerySuccess"
    />
</template>

<script>
import Sidebar from '../Sidebar.vue';
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue';
import GalleryEditorModal from './GalleryEditorModal.vue';
import { accountService } from '~/features/account/services/account.api.js';
import { Modal, notification } from 'ant-design-vue';
import { useLikeStore } from '~/stores/likeStore';

export default {
    name: 'GalleryDetails',
    components: {
        Sidebar,
        AddToGalleryModal,
        GalleryEditorModal,
    },
    data() {
        return {
            gallery: {
                photo: []
            },
            activeDropdown: null,
            showAddToGallery: false,
            selectedPhotoId: null,
            showEditGalleryModal: false,
            editGalleryCode: '',
        };
    },
    async mounted() {
        const likeStore = useLikeStore();
        await likeStore.fetchLikedPhotos();

        const galleries_code = this.$route.params.galleries_code;
        await this.fetchGalleryDetails(galleries_code);
        this.updateLikedState();
    },
    methods: {
        goBack() {
            this.$router.push({ path: '/account', query: { tab: 'galleries' } });
        },
        goToEditGallery(galleries_code) {
            this.editGalleryCode = galleries_code;
            this.showEditGalleryModal = true;
        },
        async onEditGallerySuccess() {
            const galleries_code = this.$route.params.galleries_code;
            await this.fetchGalleryDetails(galleries_code);
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },
        async fetchGalleryDetails(galleries_code) {
            try {
                const response = await accountService.fetchGalleryDetails(galleries_code, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const d = response.data;
                this.gallery = d?.data ?? d;
            } catch (error) {
                console.error('Failed to fetch gallery details:', error);
            }
        },
        showDeletePhotoConfirm(photo) {
            Modal.confirm({
                title: 'Are you sure you want to delete this photo?',
                content: 'This action cannot be undone.',
                onOk: () => this.deletePhotoFromGallery(photo),
                onCancel() {
                    console.log('Delete canceled');
                },
            });
        },
        async deletePhotoFromGallery(photo) {
            try {
                const galleries_code = this.$route.params.galleries_code;
                await accountService.deletePhotoFromGallery(galleries_code, photo.id, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                this.gallery.photo = this.gallery.photo.filter(p => p.id !== photo.id);

                notification.success({
                    message: 'Success',
                    description: 'Photo removed from gallery successfully!',
                });
            } catch (error) {
                console.error('Error deleting photo:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to delete the photo. Please try again.',
                });
            }
        },
        goToAddPhoto() {
            this.$router.push('/');
        },
        openAddToGalleryModal(photoId) {
            this.selectedPhotoId = photoId;
            this.showAddToGallery = true;
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false;
        },
        async toggleLike(photo) {
            const photo_id = photo.id;
            const photo_user_id = photo.user.id;
            const likeStore = useLikeStore();

            try {
                console.log(`Liking photo with ID: ${photo_id}`);
                if (photo.liked) {
                    await likeStore.unlikePhoto(photo_id);
                } else {
                    await likeStore.likePhoto(photo_id, photo_user_id);
                }
                photo.liked = !photo.liked;
            } catch (error) {
                console.error('Failed to toggle like:', error);
                notification.error({
                    message: 'Error',
                    description: 'Failed to toggle like. Please try again.',
                });
            }
        },
        updateLikedState() {
            const likeStore = useLikeStore();
            this.gallery.photo.forEach(photo => {
                photo.liked = likeStore.likedPhotos.includes(photo.id);
            });
        },
    },
};
</script>
