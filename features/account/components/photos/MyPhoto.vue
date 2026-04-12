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
                <!-- Header: title + count (count = brand blue, smaller) -->
                <div class="border-b border-gray-200 px-6 pb-0 pt-7 sm:pt-8">
                    <h1 class="text-2xl font-bold tracking-tight text-gray-900 sm:text-[28px] sm:leading-8">
                        My Photos
                    </h1>
                    <p class="mt-1 text-sm font-normal text-[#0870d1]">{{ photoCount }} photos</p>
                    <!-- Tabs: underline active (500px pattern) -->
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

                <!-- Toolbar: search trái | Show + Sort + hướng sort phải -->
                <div
                    class="flex flex-col gap-3 border-b border-gray-200 bg-white px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                    <div class="flex min-w-0 flex-1 items-stretch gap-2 sm:max-w-xl">
                        <input
                            ref="photoSearchInput"
                            v-model="searchQuery"
                            type="search"
                            placeholder="Search photos…"
                            class="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                            autocomplete="off"
                            aria-label="Search photos"
                            @keyup.enter="searchPhotos"
                        />
                        <button
                            type="button"
                            class="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0870d1] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0658b0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0870d1]/40 focus-visible:ring-offset-2 active:scale-[0.99] sm:px-4"
                            @click="searchPhotos"
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
                                <option :value="100">100</option>
                            </select>
                        </label>
                        <label class="flex items-center gap-2 text-sm text-gray-600">
                            Sort
                            <select
                                v-model="sortBy"
                                class="min-w-[5.5rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-[#0870d1] focus:outline-none focus:ring-1 focus:ring-[#0870d1]"
                                @change="sortPhotos"
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

                <div class="flex-1 bg-gray-50 px-6 py-6">
                    <div
                        v-if="filteredPhotos.length === 0"
                        class="flex flex-col items-center justify-center border border-dashed border-gray-300 bg-white px-6 py-16 text-center"
                    >
                        <p class="text-base font-medium text-gray-800">No photos match your filters.</p>
                        <p class="mt-2 text-sm text-gray-500">Try another tab or upload new photos.</p>
                        <button
                            type="button"
                            class="mt-6 rounded-full bg-[#0870d1] px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                            @click="goToAddPhoto"
                        >
                            Upload photo
                        </button>
                    </div>
                    <component
                        v-else
                        :is="activeComponent"
                        :photos="displayedPhotos"
                        @create-photo="goToAddPhoto"
                        @go-to-photo-details="goToPhotoDetails"
                        @edit-photo="openEditPhotoModal"
                        @add-gallery="openAddToGalleryModal"
                        @delete-photo="showDeletePhotoConfirm"
                        @toggle-dropdown="toggleDropdown"
                        :active-dropdown="activeDropdown"
                        :download-image="downloadImage"
                    />
                </div>
            </main>
        </div>

        <AddToGalleryModal
            :is-visible="showAddToGallery"
            :photo-id="selectedPhotoId"
            @close="closeAddToGalleryModal"
        />
        <EditPhotoModal
            :is-visible="showEditModal"
            :photo-id="selectedPhotoId"
            @close="closeEditModal"
            @save="fetchApprovedPhotos"
        />
    </div>
</template>

<script>
import { Modal, notification } from 'ant-design-vue';
import { h } from 'vue';
import { ExclamationCircleOutlined } from '@ant-design/icons-vue';
import AddToGalleryModal from '~/features/gallery/components/AddToGalleryModal.vue'
import EditPhotoModal from './EditPhotoModal.vue'
import AllPhotos from './AllPhotos.vue'
import PublicPhotos from './PublicPhotos.vue'
import PrivatePhotos from './PrivatePhotos.vue'
import Sidebar from '../Sidebar.vue'
import { accountService } from '~/features/account/services/account.api.js'

export default {
    name: 'MyPhoto',
    components: {
        Sidebar,
        AddToGalleryModal,
        EditPhotoModal,
        AllPhotos,
        PublicPhotos,
        PrivatePhotos,
    },
    props: {
        embedded: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            photos: [],
            activeDropdown: null,
            showAddToGallery: false,
            showEditModal: false,
            selectedPhotoId: null,
            activeTab: 'all',
            /** Ô nhập (chưa áp dụng lọc cho đến khi bấm Search / Enter) */
            searchQuery: '',
            /** Từ khóa đang dùng để lọc — chỉ cập nhật khi gọi searchPhotos() */
            appliedSearchQuery: '',
            sortBy: 'date',
            sortAscending: false,
            pageSize: 25,
        };
    },
    mounted() {
        this.fetchApprovedPhotos();
    },
    computed: {
        filteredPhotos() {
            const list = Array.isArray(this.photos) ? this.photos : [];
            let filtered = [...list];
            if (this.activeTab === 'public') {
                filtered = filtered.filter(photo => photo.privacy_status == 0 || photo.privacy_status === '0');
            } else if (this.activeTab === 'private') {
                filtered = filtered.filter(photo => photo.privacy_status == 1 || photo.privacy_status === '1');
            }
            const q = String(this.appliedSearchQuery ?? '').trim().toLowerCase();
            if (q) {
                filtered = filtered.filter((photo) => {
                    const hay = (v) => String(v ?? '').toLowerCase();
                    if (
                        hay(photo.title).includes(q)
                        || hay(photo.description).includes(q)
                        || hay(photo.location).includes(q)
                        || hay(photo.category?.category_name).includes(q)
                    ) {
                        return true;
                    }
                    const tags = Array.isArray(photo.tags) ? photo.tags : [];
                    return tags.some(tag => hay(tag?.tag_name).includes(q));
                });
            }
            if (this.sortBy === 'date') {
                filtered.sort((a, b) => {
                    const va = new Date(a.upload_date || 0).getTime() || 0;
                    const vb = new Date(b.upload_date || 0).getTime() || 0;
                    return this.sortAscending ? va - vb : vb - va;
                });
            } else if (this.sortBy === 'name') {
                filtered.sort((a, b) => {
                    const c = String(a.title || '').localeCompare(String(b.title || ''), undefined, {
                        sensitivity: 'base',
                    });
                    return this.sortAscending ? c : -c;
                });
            }
            return filtered;
        },
        displayedPhotos() {
            return this.filteredPhotos.slice(0, this.pageSize);
        },
        activeComponent() {
            if (this.activeTab === 'public') {
                return 'PublicPhotos';
            } else if (this.activeTab === 'private') {
                return 'PrivatePhotos';
            }
            return 'AllPhotos';
        },
        photoCount() {
            return this.filteredPhotos.length;
        }
    },
    methods: {
        setActiveTab(tab) {
            this.activeTab = tab;
        },
        goToPhotoDetails(photoToken) {
            if (!photoToken) {
                return;
            }
            this.$router.push({ name: 'PhotoDetail', params: { token: photoToken } });
        },
        toggleDropdown(id) {
            this.activeDropdown = this.activeDropdown === id ? null : id;
        },
        async fetchApprovedPhotos() {
            try {
                const response = await accountService.fetchApprovedPhotos({
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const d = response.data;
                // axios envelope interceptor đã unwrap → response.data là mảng ảnh (không còn { data: [...] })
                this.photos = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : []);
            } catch (error) {
                console.error('Error fetching approved photos:', error);
            }
        },
        openAddToGalleryModal(id) {
            this.selectedPhotoId = id;
            this.showAddToGallery = true;
        },
        closeAddToGalleryModal() {
            this.showAddToGallery = false;
        },
        downloadImage(photoUrl, photoTitle) {
            const link = document.createElement('a');
            link.href = photoUrl;
            link.download = photoTitle || 'downloaded-photo.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        showDeletePhotoConfirm(photo) {
            Modal.confirm({
                title: 'Are you sure you want to delete this photo?',
                icon: h(ExclamationCircleOutlined),
                content: `This action will permanently delete the photo titled "${photo.title}".`,
                okText: 'Yes',
                cancelText: 'No',
                onOk: () => this.deletePhoto(photo.id),
            });
        },
        async deletePhoto(photoId) {
            try {
                await accountService.deletePhoto(photoId, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                });
                notification.success({
                    message: 'Success',
                    description: 'Photo deleted successfully!',
                });
                this.fetchApprovedPhotos();
            } catch (error) {
                console.error('Error deleting photo:', error);
                notification.error({
                    message: 'Error',
                    description: 'There was an error deleting the photo.',
                });
            }
        },
        openEditPhotoModal(id) {
            this.selectedPhotoId = id;
            this.showEditModal = true;
        },
        closeEditModal() {
            this.showEditModal = false;
        },
        goToAddPhoto() {
            this.$router.push({ name: 'AddPhotos' });
        },
        searchPhotos() {
            this.appliedSearchQuery = String(this.searchQuery ?? '').trim();
            this.$refs.photoSearchInput?.blur?.();
        },
        sortPhotos() {
        }
    }
}
</script>
