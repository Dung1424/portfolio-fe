<script setup>
import AdminPage from '~/features/admin/reports/components/ReportsPhotosPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_PHOTO_REPORT',
  title: 'Photo reports'
})
</script>

<template>
  <AdminPage />
</template>
