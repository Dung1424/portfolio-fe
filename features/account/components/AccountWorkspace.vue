<template>
    <div class="min-h-[calc(100vh-60px)] w-full bg-gray-50">
        <div class="flex w-full flex-col lg:min-h-[calc(100vh-60px)] lg:flex-row lg:items-stretch">
            <Sidebar />
            <section
                class="flex min-h-[70vh] min-w-0 flex-1 flex-col overflow-hidden border-l border-gray-200 bg-white pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:min-h-0 lg:pb-0"
            >
                <!-- Không dùng KeepAlive: tránh lỗi DOM (parentNode null) khi đổi tab + modal/ant-design -->
                <component :is="activePanel" :key="tab" embedded />
            </section>
        </div>
    </div>
</template>

<script setup>
import { markRaw, computed } from 'vue'
import Sidebar from './Sidebar.vue'
import MyPhoto from '~/features/account/components/photos/MyPhoto.vue'
import MyGallery from '~/features/account/components/galleries/MyGallery.vue'
import AccountLikes from '~/features/account/components/likes/Like.vue'
import ListUserBlock from '~/features/account/components/profile/ListUserBlock.vue'
import ChangePassword from '~/features/auth/components/ChangePassword.vue'

const route = useRoute()

const tab = computed(() => String(route.query.tab || 'photos'))

const panelMap = {
    photos: markRaw(MyPhoto),
    galleries: markRaw(MyGallery),
    likes: markRaw(AccountLikes),
    privacy: markRaw(ListUserBlock),
    password: markRaw(ChangePassword)
}

const activePanel = computed(() => panelMap[tab.value] || panelMap.photos)
</script>
