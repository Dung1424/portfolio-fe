<template>
    <Teleport to="body">
        <div
            v-if="open"
            class="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            role="presentation"
            @click.self="handleClose"
        >
            <div
                class="flex max-h-[min(92vh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:rounded-2xl"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="titleId"
                @click.stop
            >
                <div class="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
                    <h2 :id="titleId" class="m-0 text-lg font-semibold text-zinc-900 sm:text-xl">
                        {{ mode === 'create' ? 'Create gallery' : 'Edit gallery' }}
                    </h2>
                    <button
                        type="button"
                        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                        aria-label="Close"
                        @click="handleClose"
                    >
                        <i class="fa-solid fa-xmark text-xl" />
                    </button>
                </div>

                <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    <div v-if="mode === 'edit' && loadError" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {{ loadError }}
                    </div>
                    <div v-else-if="mode === 'edit' && isLoadingDetails" class="flex flex-col gap-4 py-8">
                        <div class="skeleton-shimmer h-10 w-full rounded-lg" />
                        <div class="skeleton-shimmer h-24 w-full rounded-lg" />
                        <div class="skeleton-shimmer h-8 w-2/3 rounded-lg" />
                    </div>
                    <form v-else @submit.prevent="handleSubmit">
                        <div class="mb-4">
                            <label for="gallery-editor-title" class="mb-1.5 block text-sm font-medium text-zinc-800">Title*</label>
                            <input
                                id="gallery-editor-title"
                                v-model="form.title"
                                type="text"
                                required
                                class="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                            />
                        </div>
                        <div class="mb-4">
                            <label for="gallery-editor-desc" class="mb-1.5 block text-sm font-medium text-zinc-800">Description</label>
                            <textarea
                                id="gallery-editor-desc"
                                v-model="form.description"
                                rows="4"
                                class="h-24 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 shadow-sm focus:border-[#0870d1] focus:outline-none focus:ring-2 focus:ring-[#0870d1]/25"
                            />
                        </div>
                        <div class="mb-4">
                            <span class="mb-1.5 block text-sm font-medium text-zinc-800">Visibility</span>
                            <div class="flex flex-row flex-wrap gap-5">
                                <label class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                                    <input v-model="visibilityUi" type="radio" value="public" class="text-[#0870d1]" />
                                    Visible to everyone
                                </label>
                                <label class="flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
                                    <input v-model="visibilityUi" type="radio" value="private" class="text-[#0870d1]" />
                                    Only visible to me
                                </label>
                            </div>
                        </div>
                        <div v-if="errorMessage" class="mb-4 text-sm text-red-600">
                            {{ errorMessage }}
                        </div>
                        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                            <button
                                type="button"
                                class="rounded-full border-0 bg-transparent px-5 py-2.5 text-sm font-semibold text-[#0870d1] transition hover:bg-blue-50"
                                @click="handleClose"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                class="rounded-full border-0 bg-[#0870d1] px-6 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-95 disabled:opacity-60"
                                :disabled="isSubmitting"
                            >
                                <span v-if="isSubmitting">{{ mode === 'create' ? 'Creating…' : 'Updating…' }}</span>
                                <span v-else>{{ mode === 'create' ? 'Create' : 'Update' }}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script>
import { notification } from 'ant-design-vue';
import { useGalleryStore } from '~/stores/galleryStore.js';
import { accountService } from '~/features/account/services/account.api.js';

let uid = 0;

export default {
    name: 'GalleryEditorModal',
    props: {
        open: {
            type: Boolean,
            default: false,
        },
        /** 'create' | 'edit' */
        mode: {
            type: String,
            default: 'create',
        },
        /** Required when mode is edit */
        galleriesCode: {
            type: String,
            default: '',
        },
    },
    emits: ['update:open', 'success'],
    data() {
        uid += 1;
        return {
            titleId: `gallery-editor-title-${uid}`,
            form: {
                title: '',
                description: '',
            },
            /** create: 'public' | 'private'; edit: loaded 0|1 as string via visibilityUiEdit */
            visibilityUi: 'public',
            errorMessage: '',
            loadError: '',
            isLoadingDetails: false,
            isSubmitting: false,
        };
    },
    watch: {
        open(val) {
            if (val) {
                this.errorMessage = '';
                this.loadError = '';
                if (this.mode === 'create') {
                    this.resetCreateForm();
                } else if (this.mode === 'edit' && this.galleriesCode) {
                    this.fetchGalleryDetails();
                }
            }
        },
        galleriesCode(val) {
            if (this.open && this.mode === 'edit' && val) {
                this.fetchGalleryDetails();
            }
        },
    },
    methods: {
        resetCreateForm() {
            this.form = { title: '', description: '' };
            this.visibilityUi = 'public';
        },
        async fetchGalleryDetails() {
            this.isLoadingDetails = true;
            this.loadError = '';
            try {
                const token = localStorage.getItem('token');
                const response = await accountService.fetchGalleryDetails(this.galleriesCode, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const raw = response.data;
                const d = raw?.data ?? raw;
                this.form.title = d.galleries_name;
                this.form.description = d.galleries_description || '';
                this.visibilityUi = d.visibility === 0 ? 'public' : 'private';
            } catch (error) {
                this.loadError = error.response?.data?.message || 'Failed to load gallery';
            } finally {
                this.isLoadingDetails = false;
            }
        },
        visibilityPayload() {
            return this.visibilityUi === 'public' ? 0 : 1;
        },
        async handleSubmit() {
            const token = localStorage.getItem('token');
            if (!token) {
                notification.error({ message: 'Error', description: 'Please sign in again.' });
                return;
            }
            this.errorMessage = '';
            this.isSubmitting = true;
            try {
                if (this.mode === 'create') {
                    await accountService.addGallery(
                        {
                            title: this.form.title,
                            description: this.form.description,
                            visibility: this.visibilityPayload(),
                        },
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                    notification.success({
                        message: 'Success',
                        description: 'Gallery created successfully.',
                        placement: 'topRight',
                        duration: 3,
                    });
                } else {
                    await accountService.updateGallery(
                        this.galleriesCode,
                        {
                            title: this.form.title,
                            description: this.form.description,
                            visibility: this.visibilityPayload(),
                        },
                        { headers: { Authorization: `Bearer ${token}` } },
                    );
                    notification.success({
                        message: 'Success',
                        description: 'Gallery updated successfully.',
                    });
                }
                const store = useGalleryStore();
                await store.fetchGalleries();
                this.$emit('success');
                this.$emit('update:open', false);
            } catch (error) {
                const raw = error.response?.data?.errors ?? error.apiErrors;
                const flat = Array.isArray(raw)
                    ? raw.filter(e => typeof e === 'string')
                    : Object.values(raw || {}).flat().filter(e => typeof e === 'string');
                if (flat.length) {
                    this.errorMessage = flat.join(', ');
                } else {
                    this.errorMessage =
                        error.apiMessage
                        || error.response?.data?.message
                        || (this.mode === 'create' ? 'Could not create gallery.' : 'Could not update gallery.');
                }
            } finally {
                this.isSubmitting = false;
            }
        },
        handleClose() {
            if (this.isSubmitting) {
                return;
            }
            this.$emit('update:open', false);
        },
    },
};
</script>
