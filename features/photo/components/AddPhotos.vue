<template>
    <div class="flex min-h-0 w-full flex-1 flex-col bg-[#f4f6f8]">
        <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="onFilesSelected"
        />
        <input
            ref="replaceFileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onReplaceFileSelected"
        />

        <!-- Trạng thái chưa chọn ảnh: hero kiểu 500px (không còn ô Upload lẻ trên nền trắng) -->
        <div
            v-if="fileList.length === 0"
            class="flex min-h-0 flex-1 flex-col items-center px-4 py-10 sm:py-16"
        >
            <div class="w-full max-w-[520px]">
                <div
                    class="rounded-2xl border-2 border-dashed bg-white p-10 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-zinc-900/5 transition-colors sm:p-12"
                    :class="heroDragActive ? 'border-[#1877f2] bg-[#f0f7ff]' : 'border-zinc-200 hover:border-zinc-300'"
                    role="presentation"
                    @dragenter.prevent="heroDragActive = true"
                    @dragleave.prevent="onHeroDragLeave"
                    @dragover.prevent="heroDragActive = true"
                    @drop.prevent="onHeroDrop"
                >
                    <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                        <i class="fa-solid fa-cloud-arrow-up text-3xl" aria-hidden="true" />
                    </div>
                    <h1 class="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
                        Drag photos to upload
                    </h1>
                    <p class="mt-2 text-sm text-zinc-500">
                        JPEG or PNG · AI-generated images are not allowed
                    </p>
                    <button
                        type="button"
                        class="mt-8 inline-flex min-w-[200px] items-center justify-center rounded-full bg-[#1877f2] px-8 py-3 text-[15px] font-semibold text-white shadow-sm transition hover:bg-[#166fe5]"
                        @click="triggerFileDialog"
                    >
                        Add photos
                    </button>
                    <p class="mt-6 text-xs font-medium text-zinc-600">
                        Maximum image size 200MB · Up to 10 files
                    </p>
                </div>
                <div
                    class="mt-6 rounded-xl border border-sky-100 bg-sky-50/90 px-4 py-3 text-center text-sm text-zinc-700 ring-1 ring-sky-100/80"
                >
                    <span class="font-medium text-zinc-800">Tip:</span>
                    you can drag multiple files at once. After adding photos, you’ll fill in titles and categories on the next step.
                </div>
            </div>
        </div>

        <!-- Đã có ảnh: layout 2 cột + Gallery / Grid cho thumbnail -->
        <div v-else class="flex min-h-0 flex-1 overflow-hidden">
            <div
                class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain border-r border-zinc-200 p-5 sm:p-6"
                :class="uploadThumbView === 'gallery' ? 'bg-[#f9f9f9]' : 'bg-white'"
            >
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <p class="text-sm font-medium text-zinc-700">
                        Selected photos ({{ fileList.length }}/10)
                        <span class="ml-2 text-xs font-normal text-zinc-400">
                            ({{ uploadThumbView === 'gallery' ? 'Gallery' : 'Grid' }})
                        </span>
                    </p>
                    <UploadViewModeToggle v-model="uploadThumbView" />
                </div>
                <!-- Grid view: 1 ảnh lớn + dải thumbnail dưới (bấm nhỏ → hiện lớn) -->
                <div
                    v-if="uploadThumbView === 'grid'"
                    :key="'grid-preview'"
                    class="flex w-full flex-col gap-4"
                >
                    <div
                        class="relative aspect-[16/10] w-full overflow-hidden rounded-lg bg-zinc-100 ring-1 ring-zinc-200/80"
                    >
                        <ImageLoadRing
                            v-if="selectedFile && selectedFile.loadStatus === 'loading'"
                            :key="`${selectedFile.uid}-p-${selectedFile.loadProgress}`"
                            class="absolute inset-0 h-full w-full"
                            :progress="selectedFile.loadProgress"
                        />
                        <img
                            v-else-if="selectedFile && selectedFile.loadStatus === 'ready'"
                            :src="selectedFile.url"
                            :alt="selectedFile.name"
                            class="h-full w-full object-contain"
                        >
                        <div
                            v-else-if="selectedFile && selectedFile.loadStatus === 'error'"
                            class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-100 px-4 text-center text-sm text-zinc-600"
                        >
                            <i class="fa-solid fa-circle-exclamation text-2xl text-amber-600" aria-hidden="true" />
                            <span>Could not load this image. Remove it and try again.</span>
                        </div>
                    </div>
                    <div class="flex items-center justify-center gap-2 sm:gap-3">
                        <button
                            v-if="fileList.length > 3"
                            type="button"
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#1877f2] shadow-sm transition enabled:hover:border-zinc-300 enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Previous thumbnails"
                            :disabled="!canThumbStripPrev"
                            @click="thumbStripPrev"
                        >
                            <i class="fa-solid fa-chevron-left text-sm" aria-hidden="true" />
                        </button>
                        <div
                            class="grid min-h-[88px] w-full max-w-[min(100%,420px)] flex-1 grid-cols-3 gap-2 sm:gap-3"
                        >
                            <template v-for="(stripSlot, si) in gridThumbStripSlots" :key="stripSlot.type === 'file' ? stripSlot.file.uid : `slot-${si}-${stripSlot.type}`">
                                <div
                                    v-if="stripSlot.type === 'file'"
                                    class="group relative aspect-square w-full min-w-0 cursor-pointer overflow-hidden rounded-md border-2 bg-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2] focus-visible:ring-offset-2"
                                    :class="
                                        stripSlot.file === selectedFile
                                            ? 'border-[#1877f2] ring-2 ring-[#1877f2]/25'
                                            : 'border-zinc-200 hover:border-zinc-400'
                                    "
                                    tabindex="0"
                                    @click="selectFile(stripSlot.file)"
                                    @keydown.enter.prevent="selectFile(stripSlot.file)"
                                >
                                    <ImageLoadRing
                                        v-if="stripSlot.file.loadStatus === 'loading'"
                                        :key="`${stripSlot.file.uid}-p-${stripSlot.file.loadProgress}`"
                                        class="absolute inset-0 h-full w-full"
                                        :progress="stripSlot.file.loadProgress"
                                    />
                                    <img
                                        v-else-if="stripSlot.file.loadStatus === 'ready'"
                                        :src="stripSlot.file.url"
                                        :alt="stripSlot.file.name"
                                        class="h-full w-full object-cover"
                                    >
                                    <div
                                        v-else
                                        class="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 p-1 text-center"
                                    >
                                        <i class="fa-solid fa-triangle-exclamation text-lg text-amber-600" aria-hidden="true" />
                                        <span class="text-[9px] font-medium leading-tight text-zinc-600">Failed</span>
                                    </div>
                                    <button
                                        v-if="stripSlot.file.loadStatus === 'ready'"
                                        type="button"
                                        class="pointer-events-none absolute right-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-sm text-[#1877f2] opacity-0 shadow-md transition group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-[#1877f2] hover:text-white"
                                        @click.stop="toggleImageMenu(stripSlot.file.uid)"
                                    >
                                        <span class="flex items-center gap-0.5">
                                            <span class="h-1 w-1 rounded-full bg-current" />
                                            <span class="h-1 w-1 rounded-full bg-current" />
                                            <span class="h-1 w-1 rounded-full bg-current" />
                                        </span>
                                    </button>
                                    <div
                                        v-if="stripSlot.file.loadStatus === 'ready' && activeMenuUid === stripSlot.file.uid"
                                        class="absolute right-0 top-9 z-20 min-w-[170px] rounded-xl border border-zinc-200 bg-white p-2 text-left shadow-lg"
                                        @click.stop
                                    >
                                        <button
                                            type="button"
                                            class="flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                                            @click="triggerReplaceFile(stripSlot.file.uid)"
                                        >
                                            Replace photo
                                        </button>
                                        <button
                                            type="button"
                                            class="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                                            @click="removeFile(stripSlot.file.uid)"
                                        >
                                            Remove photo
                                        </button>
                                    </div>
                                </div>
                                <button
                                    v-else-if="stripSlot.type === 'add'"
                                    type="button"
                                    class="flex aspect-square w-full min-w-0 flex-col items-center justify-center rounded-md border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition hover:border-[#1877f2] hover:bg-[#f0f7ff] hover:text-[#1877f2]"
                                    @click="triggerFileDialog"
                                >
                                    <i class="fa-solid fa-plus text-xl" aria-hidden="true" />
                                    <span class="mt-1 text-[10px] font-medium leading-tight">Add</span>
                                </button>
                                <div
                                    v-else
                                    class="aspect-square w-full min-w-0 rounded-md bg-zinc-100 ring-1 ring-zinc-200/80"
                                    aria-hidden="true"
                                />
                            </template>
                        </div>
                        <button
                            v-if="fileList.length > 3"
                            type="button"
                            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-[#1877f2] shadow-sm transition enabled:hover:border-zinc-300 enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-35"
                            aria-label="Next thumbnails"
                            :disabled="!canThumbStripNext"
                            @click="thumbStripNext"
                        >
                            <i class="fa-solid fa-chevron-right text-sm" aria-hidden="true" />
                        </button>
                    </div>
                    <div
                        v-if="fileList.length < 10 && fileList.length >= 3"
                        class="flex justify-center pt-1"
                    >
                        <button
                            type="button"
                            class="text-sm font-medium text-[#1877f2] underline-offset-2 hover:underline"
                            @click="triggerFileDialog"
                        >
                            Add more photos
                        </button>
                    </div>
                </div>

                <!-- Gallery view: lưới 3 ảnh / dòng -->
                <div
                    v-else
                    :key="'gallery-grid'"
                    class="grid w-full grid-cols-3 gap-4 transition-[gap] duration-200 sm:gap-5"
                >
                    <button
                        v-for="file in fileList"
                        :key="file.uid"
                        type="button"
                        @click="selectFile(file)"
                        :class="[
                            'group relative aspect-square overflow-hidden border-2 bg-white shadow-sm transition',
                            'rounded-[3px] ring-1 ring-black/[0.06]',
                            file === selectedFile ? 'border-[#1877f2] shadow-[0_0_0_2px_rgba(24,119,242,0.18)]' : 'border-zinc-200 hover:border-zinc-300'
                        ]"
                    >
                        <ImageLoadRing
                            v-if="file.loadStatus === 'loading'"
                            :key="`${file.uid}-p-${file.loadProgress}`"
                            class="absolute inset-0 h-full w-full"
                            :progress="file.loadProgress"
                        />
                        <img
                            v-else-if="file.loadStatus === 'ready'"
                            :src="file.url"
                            :alt="file.name"
                            class="h-full w-full object-cover"
                        >
                        <div
                            v-else
                            class="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-100 p-2 text-center"
                        >
                            <i class="fa-solid fa-triangle-exclamation text-xl text-amber-600" aria-hidden="true" />
                            <span class="text-[10px] font-medium text-zinc-600">Failed</span>
                        </div>
                        <button
                            v-if="file.loadStatus === 'ready'"
                            type="button"
                            class="pointer-events-none absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg text-[#1877f2] opacity-0 shadow-md transition group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-[#1877f2] hover:text-white"
                            @click.stop="toggleImageMenu(file.uid)"
                        >
                            <span class="flex items-center gap-1">
                                <span class="h-1.5 w-1.5 rounded-full bg-current" />
                                <span class="h-1.5 w-1.5 rounded-full bg-current" />
                                <span class="h-1.5 w-1.5 rounded-full bg-current" />
                            </span>
                        </button>
                        <div
                            v-if="file.loadStatus === 'ready' && activeMenuUid === file.uid"
                            class="absolute right-2 top-12 z-20 min-w-[170px] rounded-xl border border-zinc-200 bg-white p-2 text-left shadow-lg"
                            @click.stop
                        >
                            <button
                                type="button"
                                class="flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                                @click="triggerReplaceFile(file.uid)"
                            >
                                Replace photo
                            </button>
                            <button
                                type="button"
                                class="mt-1 flex w-full items-center rounded-lg px-3 py-2 text-sm text-zinc-800 transition hover:bg-zinc-50"
                                @click="removeFile(file.uid)"
                            >
                                Remove photo
                            </button>
                        </div>
                    </button>

                    <button
                        v-if="fileList.length < 10"
                        type="button"
                        class="flex aspect-square flex-col items-center justify-center border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition hover:border-[#1877f2] hover:bg-[#f0f7ff] hover:text-[#1877f2] rounded-[3px]"
                        @click="triggerFileDialog"
                    >
                        <i class="fa-solid fa-plus text-2xl" aria-hidden="true" />
                        <span class="mt-2 text-xs font-medium">Add more</span>
                    </button>
                </div>
            </div>

            <div v-if="selectedFile" class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain bg-white p-5 sm:p-6">
                <div class="mb-5">
                    <a-steps
                        v-model:current="current"
                        :items="[
                            { title: 'Images' },
                            { title: 'Details' },
                            { title: 'Finish' }
                        ]"
                    />
                </div>
                <span class="block text-zinc-700">Add or confirm your photo(s) information. This helps with the discoverability and search of your photo(s).</span>
                <span class="mb-[10px] mt-[10px] block text-[#0870D1]">Use shift or command/ctrl key to select multiple</span>
                <p
                    v-if="hasPendingImageLoads"
                    class="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900"
                >
                    Loading image previews… Upload stays disabled until every photo finishes loading.
                </p>
                <p
                    v-else-if="hasBlockingImageErrors"
                    class="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                >
                    One or more images failed to load. Remove them from the grid before uploading.
                </p>
                <h3 class="mb-4 text-2xl font-medium leading-tight text-zinc-900 sm:text-[34px]">Editing: {{ selectedFile.name }}</h3>
                <div class="mb-3">
                    <span class="mb-[5px] block font-bold text-zinc-800">Title</span>
                    <input
                        type="text"
                        placeholder="Enter title"
                        v-model="selectedFile.details.title"
                        maxlength="255"
                        class="w-full rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2]"
                    />
                    <span class="mt-[5px] block text-right text-[15px] text-zinc-500">{{ selectedFile.details.title.length || 0 }}/255</span>
                </div>
                <div class="mb-3">
                    <span class="mb-[5px] block font-bold text-zinc-800">Location</span>
                    <input
                        type="text"
                        placeholder="Enter location"
                        v-model="selectedFile.details.location"
                        maxlength="255"
                        class="w-full rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2]"
                    />
                    <span class="mt-[5px] block text-right text-[15px] text-zinc-500">{{ selectedFile.details.location.length || 0 }}/255</span>
                </div>
                <div class="mb-3">
                    <span class="mb-[5px] block font-bold text-zinc-800">Description</span>
                    <textarea
                        placeholder="Enter description"
                        rows="4"
                        v-model="selectedFile.details.description"
                        maxlength="500"
                        class="w-full rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2]"
                    />
                    <span class="mt-[5px] block text-right text-[15px] text-zinc-500">{{ selectedFile.details.description.length || 0 }}/500</span>
                </div>

                <div class="flex flex-wrap justify-between gap-4">
                    <div class="mb-3 w-full min-w-[200px] flex-1 sm:w-[48%]">
                        <span class="mb-[5px] block font-bold text-zinc-800">Category</span>
                        <select v-model="selectedFile.details.category" class="w-full rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2]">
                            <option disabled value="">Choose Category</option>
                            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.category_name }}</option>
                        </select>
                    </div>
                    <div class="mb-3 w-full min-w-[200px] flex-1 sm:w-[48%]">
                        <span class="mb-[5px] block font-bold text-zinc-800">Photo Privacy</span>
                        <select v-model="selectedFile.details.privacy" class="w-full rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2]">
                            <option value="0">Public</option>
                            <option value="1">Private</option>
                        </select>
                    </div>
                </div>
                <div class="mb-3">
                    <span class="mb-[5px] block font-bold text-zinc-800">Add Custom Tags</span>
                    <div class="ml-0 mt-[2px] flex max-w-full flex-wrap gap-2">
                        <input
                            type="text"
                            v-model="keywordInput"
                            @keyup.enter="addKeyword(keywordInput)"
                            placeholder="Add your keywords"
                            class="min-w-0 flex-1 rounded border border-zinc-300 p-[10px] outline-none transition focus:border-[#1877f2] sm:max-w-[500px]"
                        />
                        <button type="button" class="cursor-pointer rounded bg-[#0870D1] px-[10px] py-[11px] text-white" @click="addKeyword(keywordInput)">
                            <i class="fa-solid fa-plus" /> Add
                        </button>
                    </div>
                </div>
                <div class="mb-3">
                    <span class="mb-[5px] block font-bold text-zinc-800">Tag Suggestions</span>
                    <div class="ml-0 mt-2 flex flex-wrap gap-2">
                        <span
                            v-for="keyword in suggestedKeywords.slice(0, 15)"
                            :key="keyword.id"
                            class="inline-flex cursor-pointer items-center whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-[10px] py-[5px] text-sm"
                            @click="addKeyword(keyword.tag_name)"
                        >
                            {{ keyword.tag_name }}
                        </span>
                    </div>
                </div>
                <div class="mb-3">
                    <div class="mt-[10px] flex flex-wrap gap-2">
                        <span
                            v-for="keyword in selectedFile.details.keywords"
                            :key="keyword"
                            class="inline-flex cursor-default items-center whitespace-nowrap rounded border border-sky-200 bg-sky-50 px-[10px] py-[5px] text-sm font-medium"
                        >
                            {{ keyword }}
                            <span class="ml-2 cursor-pointer text-base leading-none text-red-500 transition hover:text-red-600" @click="removeKeyword(keyword)">×</span>
                        </span>
                    </div>
                </div>

                <div class="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" class="cursor-pointer rounded-[20px] bg-transparent px-6 py-3 text-base text-[#1877f2] transition-colors" @click="resetDetails">
                        Reset
                    </button>
                    <button
                        type="button"
                        class="cursor-pointer rounded-[20px] bg-[#1877f2] px-6 py-3 text-base font-bold text-white shadow-sm transition hover:bg-[#166fe5] disabled:cursor-not-allowed disabled:opacity-50"
                        :disabled="hasPendingImageLoads || hasBlockingImageErrors"
                        @click="uploadPhotos"
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { notification } from 'ant-design-vue';
import { photoService } from '~/features/photo/services/photo.api.js'
import UploadViewModeToggle from '~/features/photo/components/UploadViewModeToggle.vue'
import ImageLoadRing from '~/features/photo/components/ImageLoadRing.vue'

export default {
    name: 'AddPhotos',
    components: {
        UploadViewModeToggle,
        ImageLoadRing,
    },
    data() {
        return {
            /** Gallery = ít cột, gutter lớn; Grid = lưới dày nhiều ô */
            uploadThumbView: 'grid',
            fileList: [],
            selectedFile: null,
            activeMenuUid: null,
            replacingFileUid: null,
            title: '',
            location: '',
            description: '',
            keywordInput: '',
            keywords: [],
            categories: [],
            tags: [],
            suggestedKeywords: [],
            current: 1,
            exceededLimit: false,
            heroDragActive: false,
            /** Chỉ hiển thị 3 ô thumb; khi >3 ảnh, trượt cửa sổ bằng prev/next */
            thumbStripStart: 0,
        };
    },

    computed: {
        gridThumbStripSlots() {
            const files = this.fileList;
            const start = this.thumbStripStart;
            const slots = [];
            for (let i = 0; i < 3; i += 1) {
                const globalIdx = start + i;
                if (globalIdx < files.length) {
                    slots.push({ type: 'file', file: files[globalIdx] });
                } else if (globalIdx === files.length && files.length < 10) {
                    slots.push({ type: 'add' });
                } else {
                    slots.push({ type: 'empty' });
                }
            }
            return slots;
        },
        canThumbStripPrev() {
            return this.fileList.length > 3 && this.thumbStripStart > 0;
        },
        canThumbStripNext() {
            return this.fileList.length > 3 && this.thumbStripStart < this.fileList.length - 3;
        },
        /** Còn ảnh đang đọc/decode — chưa cho upload server */
        hasPendingImageLoads() {
            return this.fileList.some((f) => f.loadStatus === 'loading');
        },
        /** Có ảnh lỗi — cần xóa trước khi upload */
        hasBlockingImageErrors() {
            return this.fileList.some((f) => f.loadStatus === 'error');
        },
    },

    watch: {
        uploadThumbView(v) {
            if (import.meta.client) {
                try {
                    localStorage.setItem('add-photos-thumb-view', v);
                } catch {
                    /* ignore */
                }
            }
            if (v === 'grid') {
                this.clampThumbStripStart();
                this.syncThumbStripToSelection();
            }
        },
        fileList: {
            handler() {
                this.clampThumbStripStart();
            },
            deep: true,
        },
    },
    mounted() {
        if (import.meta.client) {
            try {
                const t = localStorage.getItem('add-photos-thumb-view')
                if (t === 'gallery' || t === 'grid') {
                    this.uploadThumbView = t
                }
            } catch {
                /* ignore */
            }
        }
        this.fetchCategoriesAndTags();
    },
    methods: {
        onHeroDragLeave(e) {
            const related = e.relatedTarget;
            if (!e.currentTarget.contains(related)) {
                this.heroDragActive = false;
            }
        },
        onHeroDrop(e) {
            e.preventDefault();
            this.heroDragActive = false;
            const files = Array.from(e.dataTransfer?.files || []);
            this.ingestFiles(files);
        },
        async fetchCategoriesAndTags() {
            try {
                const [categoriesResponse, tagsResponse] = await photoService.fetchCategoriesAndTags();
                this.categories = categoriesResponse.data;
                this.tags = tagsResponse.data;
                this.suggestedKeywords = this.tags.slice(0, 15);
            } catch (error) {
                console.error('Error fetching categories or tags:', error);
            }
        },
        resetDetails() {
            if (this.selectedFile) {
                this.selectedFile.details = {
                    title: '',
                    location: '',
                    description: '',
                    category: '',
                    privacy: '0',
                    keywords: [],
                };
                this.keywordInput = '';
            }
        },
        triggerFileDialog() {
            this.activeMenuUid = null;
            this.$refs.fileInput?.click();
        },
        toggleImageMenu(uid) {
            this.activeMenuUid = this.activeMenuUid === uid ? null : uid;
        },
        clampThumbStripStart() {
            const max = Math.max(0, this.fileList.length - 3);
            if (this.thumbStripStart > max) {
                this.thumbStripStart = max;
            }
        },
        syncThumbStripToSelection() {
            if (this.uploadThumbView !== 'grid' || !this.selectedFile || this.fileList.length <= 3) {
                return;
            }
            const idx = this.fileList.findIndex((f) => f.uid === this.selectedFile.uid);
            if (idx < 0) {
                return;
            }
            if (idx < this.thumbStripStart) {
                this.thumbStripStart = idx;
            } else if (idx >= this.thumbStripStart + 3) {
                this.thumbStripStart = Math.max(0, Math.min(this.fileList.length - 3, idx - 2));
            }
        },
        thumbStripPrev() {
            if (!this.canThumbStripPrev) {
                return;
            }
            this.thumbStripStart = Math.max(0, this.thumbStripStart - 1);
        },
        thumbStripNext() {
            if (!this.canThumbStripNext) {
                return;
            }
            this.thumbStripStart = Math.min(this.fileList.length - 3, this.thumbStripStart + 1);
        },
        /**
         * Cập nhật một item trong fileList bằng object mới — đảm bảo Vue re-render (tránh kẹt UI khi mutate sâu).
         */
        patchFileEntry(uid, partial) {
            const i = this.fileList.findIndex((f) => f.uid === uid);
            if (i === -1) {
                return null;
            }
            const cur = this.fileList[i];
            const next = { ...cur, ...partial };
            this.fileList.splice(i, 1, next);
            if (this.selectedFile?.uid === uid) {
                this.selectedFile = next;
            }
            return next;
        },
        /**
         * Chỉ decode blob URL (không đọc cả file vào RAM) + % giả lập theo thời gian.
         * readAsArrayBuffer nhiều ảnh lớn có thể làm main thread bận → RAF không chạy, % kẹt ở mốc đầu.
         */
        async prepareLocalImageEntry(entry) {
            if (!entry?.originFileObj || !entry.url) {
                return;
            }
            const uid = entry.uid;
            if (!this.fileList.some((f) => f.uid === uid)) {
                return;
            }

            this.patchFileEntry(uid, { loadStatus: 'loading', loadProgress: 0 });

            const minDisplayMs = 520;
            const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
            const t0 = now();
            let tickId = 0;

            const stopSynthetic = () => {
                if (tickId) {
                    clearInterval(tickId);
                    tickId = 0;
                }
            };

            tickId = setInterval(() => {
                if (!this.fileList.some((f) => f.uid === uid)) {
                    stopSynthetic();
                    return;
                }
                const row = this.fileList.find((f) => f.uid === uid);
                if (!row || row.loadStatus !== 'loading') {
                    stopSynthetic();
                    return;
                }
                const elapsed = now() - t0;
                const fromTime = Math.min(88, Math.round((elapsed / minDisplayMs) * 88));
                if (fromTime > row.loadProgress) {
                    this.patchFileEntry(uid, { loadProgress: fromTime });
                }
            }, 48);

            try {
                const rowAfter = this.fileList.find((f) => f.uid === uid);
                const url = rowAfter?.url;
                if (!url) {
                    throw new Error('no url');
                }

                const img = new Image();
                img.src = url;
                if (typeof img.decode === 'function') {
                    await img.decode();
                } else {
                    await new Promise((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = () => reject(new Error('decode'));
                    });
                }

                if (!this.fileList.some((f) => f.uid === uid)) {
                    stopSynthetic();
                    return;
                }

                const cur = this.fileList.find((f) => f.uid === uid);
                const atLeast92 = Math.max(cur?.loadProgress ?? 0, 92);
                this.patchFileEntry(uid, { loadProgress: atLeast92 });

                const elapsed = now() - t0;
                if (elapsed < minDisplayMs) {
                    await new Promise((r) => setTimeout(r, minDisplayMs - elapsed));
                }

                if (!this.fileList.some((f) => f.uid === uid)) {
                    stopSynthetic();
                    return;
                }

                stopSynthetic();
                this.patchFileEntry(uid, { loadProgress: 100, loadStatus: 'ready' });
            } catch {
                stopSynthetic();
                if (!this.fileList.some((f) => f.uid === uid)) {
                    return;
                }
                const row = this.fileList.find((f) => f.uid === uid);
                const name = row?.name ?? '';
                if (row?.url) {
                    URL.revokeObjectURL(row.url);
                }
                this.patchFileEntry(uid, { loadStatus: 'error', loadProgress: 0, url: '' });
                notification.error({
                    message: 'Image load failed',
                    description: `Could not load "${name}". Please try another file.`,
                });
            }
        },
        triggerReplaceFile(uid) {
            this.replacingFileUid = uid;
            this.activeMenuUid = null;
            this.$refs.replaceFileInput?.click();
        },
        onReplaceFileSelected(event) {
            const replacement = event.target.files?.[0];
            if (!replacement || !this.replacingFileUid) {
                event.target.value = '';
                return;
            }
            if (!replacement.type.startsWith('image/')) {
                notification.error({
                    message: 'Invalid File Type',
                    description: 'You can only upload image files.',
                });
                event.target.value = '';
                return;
            }

            const targetIndex = this.fileList.findIndex((file) => file.uid === this.replacingFileUid);
            if (targetIndex === -1) {
                event.target.value = '';
                return;
            }

            const oldFile = this.fileList[targetIndex];
            if (oldFile?.url) {
                URL.revokeObjectURL(oldFile.url);
            }

            const replacedFile = {
                ...oldFile,
                name: replacement.name,
                size: replacement.size,
                type: replacement.type,
                originFileObj: replacement,
                url: URL.createObjectURL(replacement),
                loadStatus: 'loading',
                loadProgress: 0,
            };

            this.fileList.splice(targetIndex, 1, replacedFile);
            this.selectedFile = replacedFile;
            this.replacingFileUid = null;
            event.target.value = '';
            this.prepareLocalImageEntry(replacedFile);
        },
        removeFile(uid) {
            const targetIndex = this.fileList.findIndex((file) => file.uid === uid);
            if (targetIndex === -1) return;

            const targetFile = this.fileList[targetIndex];
            if (targetFile?.url) {
                URL.revokeObjectURL(targetFile.url);
            }
            this.fileList.splice(targetIndex, 1);
            this.activeMenuUid = null;

            if (!this.fileList.length) {
                this.selectedFile = null;
                return;
            }

            if (this.selectedFile?.uid === uid) {
                const fallbackIndex = targetIndex >= this.fileList.length ? this.fileList.length - 1 : targetIndex;
                this.selectedFile = this.fileList[fallbackIndex];
            }
            this.clampThumbStripStart();
            this.syncThumbStripToSelection();
        },
        onFilesSelected(event) {
            this.ingestFiles(Array.from(event.target.files || []));
            event.target.value = '';
        },
        ingestFiles(files) {
            let newestAdded = null;

            for (const file of files) {
                if (!file.type.startsWith('image/')) {
                    notification.error({
                        message: 'Invalid File Type',
                        description: 'You can only upload image files.',
                    });
                    continue;
                }

                const isDuplicate = this.fileList.some(
                    (existingFile) => existingFile.name === file.name && existingFile.size === file.size
                );
                if (isDuplicate) {
                    notification.error({
                        message: 'Duplicate File',
                        description: `${file.name} has already been selected.`,
                    });
                    continue;
                }

                if (this.fileList.length >= 10) {
                    if (!this.exceededLimit) {
                        notification.error({
                            message: 'Upload Limit Exceeded',
                            description: 'You can only upload up to 10 images.',
                        });
                        this.exceededLimit = true;
                    }
                    break;
                }

                const mappedFile = {
                    uid: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    originFileObj: file,
                    url: URL.createObjectURL(file),
                    loadStatus: 'loading',
                    loadProgress: 0,
                    details: {
                        title: '',
                        location: '',
                        description: '',
                        category: '',
                        privacy: '0',
                        keywords: [],
                    },
                };

                this.fileList.push(mappedFile);
                newestAdded = mappedFile;
                this.prepareLocalImageEntry(mappedFile);
            }

            this.exceededLimit = this.fileList.length >= 10;
            if (newestAdded) {
                this.selectedFile = newestAdded;
            } else if (this.fileList.length > 0) {
                this.selectedFile = this.fileList[0];
            } else {
                this.selectedFile = null;
            }
            this.clampThumbStripStart();
            this.syncThumbStripToSelection();
        },
        addKeyword(keyword) {
            if (typeof keyword !== 'string') {
                keyword = this.keywordInput.trim();
            }
            if (keyword && !this.selectedFile.details.keywords.includes(keyword)) {
                this.selectedFile.details.keywords.push(keyword);
                this.keywordInput = '';
            }
        },
        removeKeyword(keyword) {
            this.selectedFile.details.keywords = this.selectedFile.details.keywords.filter((k) => k !== keyword);
        },
        selectFile(file) {
            this.activeMenuUid = null;
            this.selectedFile = file;
            this.syncThumbStripToSelection();
        },
        async uploadPhotos() {
            if (!this.selectedFile.details.category) {
                notification.error({
                    message: 'Upload Failed',
                    description: 'Please choose a category for the photo.',
                });
                return;
            }

            try {
                const formData = new FormData();
                this.fileList.forEach((file, index) => {
                    formData.append(`photos[${index}][title]`, file.details.title || '');
                    formData.append(`photos[${index}][description]`, file.details.description || '');
                    formData.append(`photos[${index}][location]`, file.details.location || '');
                    formData.append(`photos[${index}][category_id]`, file.details.category);
                    formData.append(`photos[${index}][privacy_status]`, file.details.privacy);
                    formData.append(`photos[${index}][tags]`, file.details.keywords.join(','));
                    formData.append(`photos[${index}][image]`, file.originFileObj);
                });

                const response = await photoService.uploadPhoto(formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (response.status === 201) {
                    notification.success({
                        message: 'Success',
                        description: 'Photo added successfully, your photo will wait for processing',
                    });
                    this.$router.push({ name: 'Account', query: { tab: 'photos' } });
                }
            } catch (error) {
                notification.error({
                    message: 'Upload Failed',
                    description: 'There was an error uploading the photos.',
                });
                console.error('Upload error:', error);
            }
        },
    },
};
</script>
