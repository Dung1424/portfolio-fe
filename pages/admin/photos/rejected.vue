<script setup>
import AdminPage from '~/features/admin/photos/components/PhotosRejectedPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_REJECTED_PHOTO',
  title: 'Rejected photos'
})
</script>

<template>
  <AdminPage />
</template>
