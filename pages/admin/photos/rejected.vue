<script setup>
import AdminPage from '~/features/admin/photos/components/PhotosRejectedPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Rejected photos'
})
</script>

<template>
  <AdminPage />
</template>
