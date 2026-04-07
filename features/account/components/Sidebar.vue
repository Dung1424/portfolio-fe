<template>
    <aside class="sidebar">
        <div class="user-info">
            <div class="avatar-container">
                <img
                    class="avatar"
                    :src="user.profile_picture
                        ? `${apiOrigin}/images/avatars/${user.profile_picture.split('/').pop()}`
                        : `${apiOrigin}/images/imageUserDefault.png`"
                    alt="User Avatar"
                />
                <button @click="openUpdateProfileModal(user.id)" class="edit-avatar-btn" >
                    <i class="fa-solid fa-pencil"></i>
                </button>
            </div>

            <div class="user-details">
                <h2 class="username">{{ user.name ? user.name : user.username }}</h2>
            </div>
        </div>
        <ul>
            <li v-for="item in menuItems" :key="item.path">
                <NuxtLink :to="item.path" :class="{ active: isActive(item.path) }">
                    <i :class="item.icon"></i> {{ item.label }}
                </NuxtLink>
            </li>
        </ul>
    </aside>
    <UpdateProfileModal
        :is-visible="showUpdateModal"
        :user-id="selectedUserId"
        @close="closeUpdateProfileModal"
    />
</template>

<script>
import { useUserStore } from '~/stores/userStore';
import UpdateProfileModal from './UpdateProfileModal.vue';
import '@assets/css/account.css';

export default {
    name: 'AccountSidebar',
    components: {
        UpdateProfileModal,
    },
    data() {
        return {
            menuItems: [
                { path: '/myPhotos', icon: 'fas fa-camera', label: 'My Photo' },
                { path: '/myGallery', icon: 'fas fa-images', label: 'Galleries' },
                { path: '/Like', icon: 'fas fa-heart', label: 'Like' },
                { path: '/listUserBlock', icon: 'fa-solid fa-lock', label: 'Privacy' },
                { path: '/ChangePassword', icon: 'fas fa-key', label: 'Change Password' },
            ],
            showUpdateModal: false,
            selectedUserId: null,
        };
    },
    computed: {
        user() {
            const store = useUserStore();
            return store.user;
        },
    },
    created() {
        this.fetchUserData();
    },

    methods: {
        isActive(path) {
            return this.$route.path === path;
        },
        openUpdateProfileModal(id) {
            this.selectedUserId = id;
            this.showUpdateModal = true; // Mở modal
        },
        closeUpdateProfileModal() {
            this.showUpdateModal = false; // Close modal
        },
        async fetchUserData() {
            const store = useUserStore();
            await store.fetchUserData();
        },
    },
};
</script>
