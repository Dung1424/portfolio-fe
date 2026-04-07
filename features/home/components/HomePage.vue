<template>
    <div class="site-section site-portfolio">
                <div class="container">
                    <TabBar :active-item="activeItem" :set-active="setActive" :is-logged-in="isLoggedIn" />
                    <ForYou v-if="activeItem === 'forYou'" :photos="photos" />
                    <Following v-else-if="activeItem === 'following' && isLoggedIn" :users="followingUsers"/>
                    <Explore v-else-if="activeItem === 'explore'" :users="followingUsers"/>
                </div>
            </div>
</template>
<script>
import { homeService } from '~/features/home/services/home.api.js'
import { useAuthStore } from '~/stores/authStore'

export default {
    name: 'HomePage',
    data() {
        return {
            activeItem: 'forYou',
            photos: [],
            followingUsers: [],
            isLoggedIn: false,
            currentPage: 1,
            lastPage: 1,
            loading: false, // Giữ biến này để kiểm soát tải, nhưng không hiển thị
            noMorePhotos: false,
        }
    },
    watch: {
        activeItem(newItem) {
            if (newItem === 'forYou') {
                this.getPhoto();
            }
            if (newItem === 'following' && this.isLoggedIn) {
                this.getFollow();
            }
        }
    },
    async mounted() {
        await this.checkLogin();
        if (this.activeItem === 'forYou') {
            await this.getPhoto();
            this.setupInfiniteScroll();
        }
        if (this.activeItem === 'following' && this.isLoggedIn) {
            this.getFollow();
        }
    },
    methods: {
        setActive(item) {
            this.activeItem = item;
        },
        async checkLogin() {
            const authStore = useAuthStore();
            await authStore.checkLoginStatus();
            this.isLoggedIn = authStore.isLoggedIn;
            if (!this.isLoggedIn && this.activeItem === 'following') {
                this.activeItem = 'forYou';
                this.$router.push({ name: 'Login' });
            }
            return this.isLoggedIn;
        },
        async getPhoto() {
            if (this.loading || this.noMorePhotos) return;
            this.loading = true;

            try {
                const token = localStorage.getItem("token");
                let headers = {};
                if (token) {
                    headers = { Authorization: `Bearer ${token}` };
                }
                const response = await homeService.fetchPhotoFeed(
                    {
                        page: this.currentPage,
                        per_page: 20,
                    },
                    { headers }
                );

                if (!response.data || typeof response.data !== 'object') {
                    throw new Error('Invalid API response format');
                }

                const { data, current_page, last_page } = response.data;
                if (!Array.isArray(data)) {
                    console.error('API response "data" is not an array:', data);
                    return;
                }

                this.photos = [...this.photos, ...data];
                this.currentPage = current_page;
                this.lastPage = last_page;

                if (current_page >= last_page) {
                    this.noMorePhotos = true;
                }
            } catch (error) {
                console.error('Error fetching photos:', error);
                if (error.response) {
                    console.error('API error response:', error.response.data);
                }
            } finally {
                this.loading = false;
            }
        },
        setupInfiniteScroll() {
            window.onscroll = () => {
                if (
                    this.activeItem === 'forYou' &&
                    window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
                    !this.loading &&
                    !this.noMorePhotos
                ) {
                    this.currentPage++;
                    this.getPhoto();
                }
            };
        },
        async getFollow() {
            try {
                const token = localStorage.getItem("token"); // Lấy token nếu có

                let headers = {};
                if (token) {
                    headers = {
                        Authorization: `Bearer ${token}`,
                    };
                }

                const response = await homeService.fetchFollowFeed({ headers });
                this.followingUsers = response.data.data || [];
            } catch (error) {
                console.error("Lỗi khi lấy danh sách follow:", error);
            }
        }
    }
}
</script>
