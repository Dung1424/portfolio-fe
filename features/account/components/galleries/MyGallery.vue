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
                    <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] sm:leading-8">
                        Galleries
                    </h1>
                    <p class="mt-1 text-sm font-normal text-[#0870d1]">{{ galleryCount }} galleries</p>
                    <div class="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-gray-200">
                        <button
                            v-for="tab in [
                                { id: 'all', label: 'All' },
                                { id: 'public', label: 'Public' },
                                { id: 'private', label: 'Private' },
                            ]"
                            :key="tab.id"
                            type="button"
                            class="-mb-px border-b-2 pb-3 text-sm transition-colors"
                            :class="
                                activeTab === tab.id
                                    ? 'border-[#0870d1] font-semibold text-[#0870d1]'
                                    : 'border-transparent font-medium text-gray-600 hover:text-gray-900'
                            "
                            @click="setActiveTab(tab.id)"
                        >
                            {{ tab.label }}
                        </button>
                    </div>
                </div>

                <div
                    class="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                    <div class="flex min-w-0 flex-1 items-stretch gap-2 sm:max-w-xl">
                        <input
                            ref="gallerySearchInput"
                            v-model="searchQuery"
                            type="search"
                            placeholder="Search galleries…"
                            class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                            autocomplete="off"
                            aria-label="Search galleries"
                            @keyup.enter="searchGalleries"
                        />
                        <button
                            type="button"
                            class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0870d1] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0658b0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0870d1]/40 focus-visible:ring-offset-2 active:scale-[0.99] sm:px-4"
                            @click="searchGalleries"
                        >
                            <i class="fa-solid fa-magnifying-glass text-[13px]" aria-hidden="true" />
                            <span>Search</span>
                        </button>
                    </div>
                    <div class="flex flex-wrap items-center justify-end gap-4 sm:gap-5 sm:shrink-0">
                        <label class="flex items-center gap-2 text-sm text-gray-600">
                            Show
                            <select
                                v-model.number="pageSize"
                                class="min-w-[4.5rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                            >
                                <option :value="10">10</option>
                                <option :value="25">25</option>
                                <option :value="50">50</option>
                            </select>
                        </label>
                        <label class="flex items-center gap-2 text-sm text-gray-600">
                            Sort
                            <select
                                v-model="sortBy"
                                class="min-w-[5.5rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                                @change="sortGalleries"
                            >
                                <option value="date">Date</option>
                                <option value="name">Name</option>
                            </select>
                        </label>
                        <button
                            type="button"
                            class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-50 text-[#0870d1] transition hover:bg-gray-100"
                            :title="sortAscending ? 'Ascending' : 'Descending'"
                            @click="sortAscending = !sortAscending"
                        >
                            <i :class="sortAscending ? 'fa-solid fa-arrow-up' : 'fa-solid fa-arrow-down'" />
                        </button>
                    </div>
                </div>

                <div class="flex-1 bg-zinc-50/90 px-6 py-6">
                    <div
                        v-if="filteredGalleries.length === 0"
                        class="flex flex-col items-center justify-center border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
                    >
                        <p class="text-base font-medium text-gray-800">No galleries match your filters.</p>
                        <button
                            type="button"
                            class="mt-6 rounded-full bg-[#0870d1] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            @click="openCreateGalleryModal"
                        >
                            Create Gallery
                        </button>
                    </div>
                    <component
                        v-else
                        :is="activeComponent"
                        :galleries="displayedGalleries"
                        @create-gallery="openCreateGalleryModal"
                        @go-to-gallery-details="goToGalleryDetails"
                        @edit-gallery="openEditGalleryModal"
                        @delete-gallery="showDeleteConfirm"
                        @toggle-dropdown="toggleDropdown"
                        :active-dropdown="activeDropdown"
                    />
                </div>
            </main>
        </div>

        <GalleryEditorModal
            v-model:open="showGalleryModal"
            :mode="galleryModalMode"
            :galleries-code="editGalleryCode"
            @success="onGalleryModalSuccess"
        />
    </div>
</template>

<script>
import { Modal, notification } from 'ant-design-vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import { useGalleryStore } from '~/stores/galleryStore.js';
import Sidebar from '../Sidebar.vue';
import AllGalleries from './AllGalleries.vue';
import PublicGalleries from './PublicGalleries.vue';
import PrivateGalleries from './PrivateGalleries.vue';
import GalleryEditorModal from './GalleryEditorModal.vue';
import { h } from 'vue';
import { accountService } from '~/features/account/services/account.api.js';

export default {
    name: 'MyGallery',
    components: {
        Sidebar,
        Modal,
        AllGalleries,
        PublicGalleries,
        PrivateGalleries,
        GalleryEditorModal,
    },
    props: {
        embedded: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            activeDropdown: null,
            galleryToDelete: null,
            activeTab: 'all',
            searchQuery: '',
            /** Chỉ lọc sau khi bấm Search / Enter */
            appliedSearchQuery: '',
            sortBy: 'date',
            sortAscending: false,
            pageSize: 25,
            showGalleryModal: false,
            galleryModalMode: 'create',
            editGalleryCode: '',
        };
    },
    computed: {
        galleries() {
            const store = useGalleryStore();
            return store.galleries;
        },
        filteredGalleries() {
            const list = Array.isArray(this.galleries) ? this.galleries : [];
            let filtered = [...list];
            if (this.activeTab === 'public') {
                filtered = filtered.filter(
                    g => g.visibility === 0 || g.visibility === '0',
                );
            } else if (this.activeTab === 'private') {
                filtered = filtered.filter(
                    g => g.visibility === 1 || g.visibility === '1',
                );
            }
            const q = String(this.appliedSearchQuery ?? '').trim().toLowerCase();
            if (q) {
                filtered = filtered.filter((gallery) => {
                    const name = String(gallery.galleries_name ?? '').toLowerCase();
                    const desc = String(gallery.galleries_description ?? '').toLowerCase();
                    return name.includes(q) || desc.includes(q);
                });
            }
            if (this.sortBy === 'date') {
                filtered.sort((a, b) => {
                    const va = new Date(a.created_at || 0).getTime() || 0;
                    const vb = new Date(b.created_at || 0).getTime() || 0;
                    return this.sortAscending ? va - vb : vb - va;
                });
            } else if (this.sortBy === 'name') {
                filtered.sort((a, b) => {
                    const c = String(a.galleries_name || '').localeCompare(
                        String(b.galleries_name || ''),
                        undefined,
                        { sensitivity: 'base' },
                    );
                    return this.sortAscending ? c : -c;
                });
            }
            return filtered;
        },
        displayedGalleries() {
            return this.filteredGalleries.slice(0, this.pageSize);
        },
        activeComponent() {
            if (this.activeTab === 'public') {
                return 'PublicGalleries';
            } else if (this.activeTab === 'private') {
                return 'PrivateGalleries';
            }
            return 'AllGalleries';
        },
        galleryCount() {
            return this.filteredGalleries.length;
        }
    },
    mounted() {
        const store = useGalleryStore();
        store.fetchGalleries();
        this.$nextTick(() => this.applyGalleryQueryFromRoute());
    },
    watch: {
        '$route.query': {
            handler() {
                this.applyGalleryQueryFromRoute();
            },
            deep: true,
        },
    },
    methods: {
        setActiveTab(tab) {
            this.activeTab = tab;
        },
        goToGalleryDetails(galleries_code) {
            this.$router.push(`/galleryDetails/${galleries_code}`);
        },
        openCreateGalleryModal() {
            this.galleryModalMode = 'create';
            this.editGalleryCode = '';
            this.showGalleryModal = true;
        },
        openEditGalleryModal(galleries_code) {
            this.activeDropdown = null;
            this.galleryModalMode = 'edit';
            this.editGalleryCode = galleries_code;
            this.showGalleryModal = true;
        },
        onGalleryModalSuccess() {
            this.activeDropdown = null;
        },
        /**
         * Deep link: /account?tab=galleries&editGallery=CODE hoặc &createGallery=1
         * (từ Gallery Details / Add to gallery modal sau khi xóa route add/edit).
         */
        applyGalleryQueryFromRoute() {
            const rawEdit = this.$route.query.editGallery;
            const code = typeof rawEdit === 'string' ? rawEdit : Array.isArray(rawEdit) ? rawEdit[0] : '';
            if (code) {
                this.openEditGalleryModal(code);
                const q = { ...this.$route.query };
                delete q.editGallery;
                this.$router.replace({ path: '/account', query: q });
                return;
            }
            const c = this.$route.query.createGallery;
            if (c === '1' || c === 'true') {
                this.openCreateGalleryModal();
                const q = { ...this.$route.query };
                delete q.createGallery;
                this.$router.replace({ path: '/account', query: q });
            }
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },
        showDeleteConfirm(gallery) {
            this.galleryToDelete = gallery;
            Modal.confirm({
                title: 'Are you sure delete this gallery?',
                icon: h(ExclamationCircleOutlined),
                content: 'Once deleted, the photos in the gallery will be deleted, this action cannot be undone',
                onOk: this.deleteGallery,
                onCancel() {},
            });
        },
        deleteGallery() {
            if (this.galleryToDelete && this.galleryToDelete.galleries_code) {
                const galleriesCode = this.galleryToDelete.galleries_code;

                accountService.deleteGallery(galleriesCode, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    })
                    .then(response => {
                        console.log('Gallery deleted successfully:', response);
                        this.galleryToDelete = null;

                        const store = useGalleryStore();
                        store.galleries = store.galleries.filter(gallery => gallery.galleries_code !== galleriesCode);
                        notification.success({
                            message: 'Success',
                            description: 'Gallery deleted successfully!',
                        });
                    })
                    .catch(error => {
                        console.log('Error deleting gallery:', error);
                        this.galleryToDelete = null;
                    });
            } else {
                console.log('Gallery code is missing or invalid.');
            }
        },
        searchGalleries() {
            this.appliedSearchQuery = String(this.searchQuery ?? '').trim();
            this.$refs.gallerySearchInput?.blur?.();
        },
        sortGalleries() {
        }
    }
};
</script>
