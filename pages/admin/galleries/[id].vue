<script setup>
import AdminPage from '~/features/admin/galleries/components/GalleryPhotosPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Gallery photos'
})
</script>

<template>
  <AdminPage />
</template>
