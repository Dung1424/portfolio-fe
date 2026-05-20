<script setup>
import AdminPage from '~/features/admin/photos/components/PhotosPendingPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_PENDING_PHOTO',
  title: 'Pending photos'
})
</script>

<template>
  <AdminPage />
</template>
