<template>
    <div
        :class="
            embedded
                ? 'flex h-full min-h-0 flex-1 flex-col'
                : 'min-h-[calc(100vh-60px)] w-full bg-gray-50'
        "
    >
        <div
            :class="
                embedded
                    ? 'flex min-h-0 flex-1 flex-col'
                    : 'flex w-full flex-col lg:min-h-[calc(100vh-60px)] lg:flex-row lg:items-stretch'
            "
        >
            <Sidebar v-if="!embedded" />
            <main
                class="flex min-h-[70vh] min-w-0 flex-1 flex-col bg-white lg:min-h-0"
                :class="embedded ? '' : 'border-l border-gray-200'"
            >
                <div class="border-b border-gray-200 px-6 pb-0 pt-7 sm:pt-8">
                    <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] sm:leading-8">Likes</h1>
                    <p class="mt-1 text-sm font-normal text-[#0870d1]">{{ headerSubtitle }}</p>
                    <div class="mt-5 flex gap-8 border-b border-gray-200">
                        <button
                            type="button"
                            class="-mb-px border-b-2 pb-3 text-sm transition-colors"
                            :class="
                                activeTab === 'photo'
                                    ? 'border-[#0870d1] font-semibold text-[#0870d1]'
                                    : 'border-transparent font-medium text-gray-600 hover:text-gray-900'
                            "
                            @click="activeTab = 'photo'"
                        >
                            Photos
                        </button>
                        <button
                            type="button"
                            class="-mb-px border-b-2 pb-3 text-sm transition-colors"
                            :class="
                                activeTab === 'gallery'
                                    ? 'border-[#0870d1] font-semibold text-[#0870d1]'
                                    : 'border-transparent font-medium text-gray-600 hover:text-gray-900'
                            "
                            @click="activeTab = 'gallery'"
                        >
                            Galleries
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap items-center justify-end gap-3 border-b border-gray-200 bg-white px-6 py-3">
                    <label for="sort-select-like" class="text-sm text-gray-600">Sort</label>
                    <select
                        id="sort-select-like"
                        v-model="sortBy"
                        class="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                    >
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                    </select>
                </div>
                <div class="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
                    <PhotoLikeGrid
                        v-if="activeTab === 'photo'"
                        :likedPhotos="sortedLikedPhotos"
                        @delete-like="deleteLikePhoto"
                    />
                    <GalleryLikeGrid
                        v-else-if="activeTab === 'gallery'"
                        :likedGalleries="sortedLikedGalleries"
                        @delete-like="deleteLikeGallery"
                    />
                </div>
            </main>
        </div>
    </div>
</template>

<script>
import { accountService } from '~/features/account/services/account.api.js'
import { useLikeStore } from '~/stores/likeStore.js'
import Sidebar from '../Sidebar.vue'
import PhotoLikeGrid from '../photos/PhotoLikeGrid.vue'
import GalleryLikeGrid from '../galleries/GalleryLikeGrid.vue'
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { h } from 'vue';

/** Trích mảng từ body JSON (Laravel: { data: [] } hoặc paginator { data: { data: [] } }) */
function extractListFromApiBody(body) {
    if (!body) {
        return [];
    }
    if (Array.isArray(body)) {
        return body;
    }
    if (Array.isArray(body.data)) {
        return body.data;
    }
    if (body.data && Array.isArray(body.data.data)) {
        return body.data.data;
    }
    return [];
}

export default {
    name: 'AccountLikes',
    components: {
        Sidebar,
        PhotoLikeGrid,
        GalleryLikeGrid
    },
    props: {
        embedded: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            activeTab: 'photo',
            likedPhotos: [],
            likedGalleries: [],
            sortBy: 'date',
        };
    },
    mounted() {
        this.fetchLikedPhotos();
        this.fetchLikedGalleries();
    },
    computed: {
        headerSubtitle() {
            return this.activeTab === 'gallery'
                ? `${this.likedGalleries.length} galleries`
                : `${this.likedPhotos.length} photos`;
        },
        sortedLikedPhotos() {
            const sorted = [...this.likedPhotos];

            if (this.sortBy === 'date') {
                sorted.sort((a, b) => (b.photoDate || 0) - (a.photoDate || 0));
            } else if (this.sortBy === 'name') {
                sorted.sort((a, b) =>
                    String(a.userName ?? '').localeCompare(String(b.userName ?? ''))
                );
            }

            return sorted;
        },
        sortedLikedGalleries() {
            const sorted = [...this.likedGalleries];

            if (this.sortBy === 'date') {
                sorted.sort((a, b) => (b.galleryDate || 0) - (a.galleryDate || 0));
            } else if (this.sortBy === 'name') {
                sorted.sort((a, b) =>
                    String(a.galleriesName ?? '').localeCompare(String(b.galleriesName ?? ''))
                );
            }

            return sorted;
        }
    },
    methods: {
        resolveMediaUrl(path) {
            if (!path || typeof path !== 'string') {
                return '';
            }
            if (path.startsWith('http')) {
                return path;
            }
            const base = this.apiOrigin || '';
            const p = path.startsWith('/') ? path : `/${path}`;
            return `${base}${p}`;
        },
        /** Chuẩn hóa 1 dòng like ảnh từ API (camelCase / snake_case / nested photo) */
        normalizeLikedPhoto(raw) {
            const p = raw.photo || {};
            const u = raw.user || p.user || {};
            const photoToken =
                raw.photo_token
                ?? p.photo_token
                ?? raw.photoToken
                ?? p.photoToken
                ?? '';
            let imageUrl =
                raw.image_url
                ?? p.image_url
                ?? raw.imageUrl
                ?? p.imageUrl
                ?? '';
            imageUrl = this.resolveMediaUrl(imageUrl) || imageUrl;
            if (!imageUrl) {
                imageUrl = '/images/imageUserDefault.png';
            }
            const userName =
                raw.username
                ?? raw.user_name
                ?? raw.userName
                ?? u.username
                ?? '';
            const name = raw.name ?? u.name ?? userName;
            let userAvatar =
                raw.user_avatar
                ?? raw.userAvatar
                ?? u.profile_picture
                ?? '';
            userAvatar = this.resolveMediaUrl(userAvatar) || userAvatar;
            if (!userAvatar) {
                userAvatar = '/images/imageUserDefault.png';
            }
            const photoDate =
                raw.photo_date
                ?? raw.photoDate
                ?? raw.created_at
                ?? p.created_at
                ?? p.upload_date
                ?? 0;
            const ts = photoDate ? new Date(photoDate).getTime() : 0;
            const photoId = raw.photo_id ?? p.id ?? raw.photoId ?? null;
            return {
                id: raw.id ?? raw.like_id ?? null,
                photoId,
                photoToken,
                imageUrl,
                userName,
                userAvatar,
                name: name || userName || 'User',
                photoDate: Number.isFinite(ts) ? ts : 0,
            };
        },
        normalizeLikedGallery(raw) {
            const g = raw.gallery || {};
            const u = raw.user ?? g.user ?? {};
            const photos =
                raw.galleries_photo
                ?? raw.galleriesPhoto
                ?? raw.photos
                ?? g.photos
                ?? g.galleries_photo
                ?? [];
            const galleriesCode =
                raw.galleries_code
                ?? raw.galleriesCode
                ?? g.galleries_code
                ?? g.galleriesCode
                ?? '';
            const galleriesName =
                raw.galleries_name
                ?? raw.galleriesName
                ?? g.galleries_name
                ?? g.galleriesName
                ?? '';
            let userAvatar =
                raw.user_avatar
                ?? raw.userAvatar
                ?? u.profile_picture
                ?? '';
            userAvatar = this.resolveMediaUrl(userAvatar) || userAvatar;
            if (!userAvatar) {
                userAvatar = '/images/imageUserDefault.png';
            }
            const username = raw.username ?? u.username ?? '';
            const name = raw.name ?? u.name ?? username;
            const galleryDate =
                raw.gallery_date
                ?? raw.galleryDate
                ?? raw.created_at
                ?? g.created_at
                ?? 0;
            const ts = galleryDate ? new Date(galleryDate).getTime() : 0;
            const galleryId = raw.gallery_id ?? g.id ?? raw.galleryId ?? null;
            const mappedPhotos = Array.isArray(photos)
                ? photos.map((ph) => ({
                    ...ph,
                    image_url:
                        ph.image_url && !String(ph.image_url).startsWith('http')
                            ? this.resolveMediaUrl(ph.image_url)
                            : ph.image_url,
                }))
                : [];
            return {
                id: raw.id ?? raw.like_id ?? null,
                galleryId,
                galleriesCode,
                galleriesName,
                galleriesPhoto: mappedPhotos,
                username,
                userAvatar,
                name: name || username || 'User',
                galleryDate: Number.isFinite(ts) ? ts : 0,
            };
        },
        async fetchLikedPhotos() {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }
            try {
                const response = await accountService.fetchLikedPhotos({
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const list = extractListFromApiBody(response.data);
                this.likedPhotos = list.map((row) => this.normalizeLikedPhoto(row));
            } catch (error) {
                console.error('Error fetching liked photos:', error);
                this.likedPhotos = [];
                notification.error({
                    message: 'Could not load likes',
                    description:
                        error.response?.data?.message
                        || error.message
                        || 'Please try again later.',
                    placement: 'topRight',
                    duration: 4,
                });
            }
        },
        async fetchLikedGalleries() {
            const token = localStorage.getItem('token');
            if (!token) {
                return;
            }
            try {
                const response = await accountService.fetchLikedGalleries({
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const list = extractListFromApiBody(response.data);
                this.likedGalleries = list.map((row) => this.normalizeLikedGallery(row));
            } catch (error) {
                console.error('Error fetching liked galleries:', error);
                this.likedGalleries = [];
                notification.error({
                    message: 'Could not load gallery likes',
                    description:
                        error.response?.data?.message
                        || error.message
                        || 'Please try again later.',
                    placement: 'topRight',
                    duration: 4,
                });
            }
        },
        deleteLikePhoto(like) {
            Modal.confirm({
                title: 'Remove this like?',
                icon: h(ExclamationCircleOutlined),
                content: 'This photo will be removed from your likes.',
                okText: 'Remove',
                cancelText: 'Cancel',
                onOk: () => this.confirmDeleteLikePhoto(like),
            });
        },
        async confirmDeleteLikePhoto(like) {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                if (like.id) {
                    await accountService.deleteLike(like.id, { headers });
                } else if (like.photoId) {
                    const likeStore = useLikeStore();
                    await likeStore.unlikePhoto(like.photoId);
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Could not remove like (missing id).',
                    });
                    return;
                }
                this.likedPhotos = this.likedPhotos.filter((p) => {
                    if (like.id && p.id) {
                        return p.id !== like.id;
                    }
                    if (like.photoId && p.photoId) {
                        return p.photoId !== like.photoId;
                    }
                    return p.photoToken !== like.photoToken;
                });
                notification.success({
                    message: 'Removed',
                    description: 'Photo removed from likes.',
                });
            } catch (error) {
                console.error('Error unliking photo:', error);
                notification.error({
                    message: 'Error',
                    description: 'Could not remove like.',
                });
            }
        },
        deleteLikeGallery(like) {
            Modal.confirm({
                title: 'Remove this like?',
                icon: h(ExclamationCircleOutlined),
                content: 'This gallery will be removed from your likes.',
                okText: 'Remove',
                cancelText: 'Cancel',
                onOk: () => this.confirmDeleteLikeGallery(like),
            });
        },
        async confirmDeleteLikeGallery(like) {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                if (like.id) {
                    await accountService.deleteLike(like.id, { headers });
                } else if (like.galleryId) {
                    const likeStore = useLikeStore();
                    await likeStore.unlikeGallery(like.galleryId);
                } else {
                    notification.error({
                        message: 'Error',
                        description: 'Could not remove like (missing id).',
                    });
                    return;
                }
                this.likedGalleries = this.likedGalleries.filter((g) => {
                    if (like.id && g.id) {
                        return g.id !== like.id;
                    }
                    if (like.galleryId && g.galleryId) {
                        return g.galleryId !== like.galleryId;
                    }
                    return g.galleriesCode !== like.galleriesCode;
                });
                notification.success({
                    message: 'Removed',
                    description: 'Gallery removed from likes.',
                });
            } catch (error) {
                console.error('Error unliking gallery:', error);
                notification.error({
                    message: 'Error',
                    description: 'Could not remove like.',
                });
            }
        },
    },
};
</script>
