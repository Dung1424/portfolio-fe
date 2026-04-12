<template>
    <div
        v-if="isVisible"
        class="fixed inset-0 z-[1000] flex justify-end bg-black/50"
        role="dialog"
        aria-modal="true"
        @click.self="closeModal"
    >
        <div
            class="flex h-full w-full max-w-[500px] flex-col bg-white shadow-[-2px_0_8px_rgba(0,0,0,0.1)]"
            @click.stop
        >
            <div class="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4">
                <h2 class="m-0 text-lg font-semibold text-zinc-900">
                    Edit photo
                </h2>
                <button
                    type="button"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                    aria-label="Close"
                    @click="closeModal"
                >
                    <i class="fa-solid fa-xmark text-xl" />
                </button>
            </div>

            <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <div class="mb-4 text-center">
                    <img
                        :src="previewImageSrc"
                        alt="Photo preview"
                        class="max-h-[min(40vh,500px)] w-full rounded-lg object-contain"
                    />
                </div>

                <p class="mb-4 text-sm text-zinc-600">
                    Add or confirm your photo(s) information. This helps with the
                    discoverability and search of your photo(s).
                </p>

                <div class="mb-4">
                    <label for="title" class="mb-1 block text-sm font-medium text-zinc-700">Title:</label>
                    <input
                        id="title"
                        v-model="localPhoto.title"
                        type="text"
                        placeholder="Enter photo title"
                        maxlength="255"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ (localPhoto.title || '').length }}/255</small>
                </div>
                <div class="mb-4">
                    <label for="location" class="mb-1 block text-sm font-medium text-zinc-700">Location:</label>
                    <input
                        id="location"
                        v-model="localPhoto.location"
                        type="text"
                        placeholder="Enter photo location"
                        maxlength="255"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ (localPhoto.location || '').length }}/255</small>
                </div>
                <div class="mb-4">
                    <label for="description" class="mb-1 block text-sm font-medium text-zinc-700">Description:</label>
                    <textarea
                        id="description"
                        v-model="localPhoto.description"
                        placeholder="Enter description"
                        maxlength="500"
                        rows="4"
                        class="w-full resize-y rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    />
                    <small class="mt-1 block text-xs text-zinc-500">{{ (localPhoto.description || '').length }}/500</small>
                </div>
                <div class="mb-4">
                    <label for="category" class="mb-1 block text-sm font-medium text-zinc-700">Category:</label>
                    <select
                        id="category"
                        v-model="localPhoto.category_id"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    >
                        <option disabled value="">
                            Choose Category
                        </option>
                        <option v-for="category in categories" :key="category.id" :value="category.id">
                            {{ category.category_name }}
                        </option>
                    </select>
                </div>
                <div class="mb-4">
                    <label for="privacy_status" class="mb-1 block text-sm font-medium text-zinc-700">Photo Privacy:</label>
                    <select
                        id="privacy_status"
                        v-model="localPhoto.privacy_status"
                        class="w-full rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                    >
                        <option value="0">Public</option>
                        <option value="1">Private</option>
                    </select>
                </div>

                <div class="mb-4">
                    <label for="custom-tags" class="mb-1 block text-sm font-medium text-zinc-700">Add Custom Tags:</label>
                    <div class="flex gap-2">
                        <input
                            id="custom-tags"
                            v-model="keywordInput"
                            type="text"
                            placeholder="Add your keywords"
                            class="min-w-0 flex-1 rounded-md border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                            @keyup.enter="addKeyword(keywordInput)"
                        />
                        <button
                            type="button"
                            class="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0870d1] px-3 py-2.5 text-sm font-medium text-white transition hover:brightness-95"
                            @click="addKeyword(keywordInput)"
                        >
                            <i class="fa-solid fa-plus" /> Add
                        </button>
                    </div>
                </div>

                <div class="mb-4">
                    <span class="mb-1 block text-sm font-medium text-zinc-700">Tag Suggestions:</span>
                    <div class="mt-2 flex flex-wrap gap-2">
                        <button
                            v-for="keyword in suggestedKeywords"
                            :key="keyword.id"
                            type="button"
                            class="rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-sm text-sky-900 transition hover:bg-sky-100"
                            @click="addKeyword(keyword.tag_name)"
                        >
                            {{ keyword.tag_name }}
                        </button>
                    </div>
                </div>

                <div class="mb-2 flex flex-wrap gap-2">
                    <span
                        v-for="keyword in localPhoto.keywords"
                        :key="keyword"
                        class="inline-flex items-center gap-1 rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-sm font-medium text-sky-900"
                    >
                        {{ keyword }}
                        <button
                            type="button"
                            class="ml-1 text-red-500 hover:text-red-600"
                            aria-label="Remove tag"
                            @click="removeKeyword(keyword)"
                        >
                            ×
                        </button>
                    </span>
                </div>
            </div>

            <div class="flex shrink-0 justify-end gap-3 border-t border-zinc-100 px-5 py-4">
                <button
                    type="button"
                    class="rounded-full px-5 py-2.5 text-base text-[#0870d1] transition hover:bg-[#0870d1]/10"
                    @click="closeModal"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    class="rounded-full bg-[#0870d1] px-6 py-2.5 text-base font-bold text-white shadow-md transition hover:brightness-95"
                    @click="saveChanges"
                >
                    Save
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import { notification } from 'ant-design-vue';
import { accountService } from '~/features/account/services/account.api.js'

export default {
    setup() {
        const { resolveMediaUrl } = useResolvePublicMediaUrl()
        return { resolveMediaUrl }
    },
    props: {
        isVisible: {
            type: Boolean,
            required: true,
        },
        photoId: {
            type: Number,
            required: true,
        },
    },
    emits: ['close', 'save'],
    data() {
        return {
            localPhoto: {
                title: "",
                description: "",
                location: "",
                category_id: "",
                privacy_status: "0",
                keywords: [],
            },
            categories: [],
            keywordInput: '',
            suggestedKeywords: [],
        };
    },
    watch: {
        photoId: {
            immediate: true,
            handler(newPhotoId) {
                if (newPhotoId) {
                    this.fetchPhotoDetails(newPhotoId);
                }
            },
        },
    },
    mounted() {
        this.fetchCategoriesAndTags();
    },
    computed: {
        previewImageSrc() {
            const u = this.localPhoto?.image_url
            if (!u) {
                return '/front_assets/img/img_5.jpg'
            }
            return this.resolveMediaUrl(u) || '/front_assets/img/img_5.jpg'
        },
    },
    methods: {
        async fetchPhotoDetails(photoId) {
            try {
                const response = await accountService.fetchPhotoForEdit(photoId, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                this.localPhoto = response.data;
                this.localPhoto.keywords = (response.data.tags || []).map(tag => tag.tag_name);
            } catch (error) {
                console.error('Error fetching photo details:', error);
            }
        },
        async fetchCategoriesAndTags() {
            try {
                const [categoriesResponse, tagsResponse] = await accountService.fetchCategoriesAndTags();
                this.categories = categoriesResponse.data;
                this.suggestedKeywords = tagsResponse.data.slice(0, 15);
            } catch (error) {
                console.error('Error fetching categories and tags:', error);
            }
        },
        addKeyword(keyword) {
            if (typeof keyword !== 'string') {
                keyword = this.keywordInput.trim();
            }
            if (keyword && !this.localPhoto.keywords.includes(keyword)) {
                this.localPhoto.keywords.push(keyword);
                this.keywordInput = '';
            }
        },
        removeKeyword(keyword) {
            this.localPhoto.keywords = this.localPhoto.keywords.filter(k => k !== keyword);
        },
        closeModal() {
            this.$emit("close");
        },
        async saveChanges() {
            const payload = {
                ...this.localPhoto,
                privacy_status: String(this.localPhoto.privacy_status),
                tags: this.localPhoto.keywords.join(','),
            };
            try {
                await accountService.updatePhoto(this.photoId, payload, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                notification.success({
                    message: 'Success',
                    description: 'Photo updated successfully!',
                });
                this.$emit("save", this.localPhoto);
                this.closeModal();
            } catch (error) {
                console.error('Error saving photo changes:', error);
                notification.error({
                    message: 'Error',
                    description: 'There was an error saving the photo changes.',
                });
            }
        },
    },
};
</script>
