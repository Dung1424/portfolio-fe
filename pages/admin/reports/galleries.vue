<script setup>
import AdminPage from '~/features/admin/reports/components/ReportsGalleriesPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_GALLERY_REPORT',
  title: 'Gallery reports'
})
</script>

<template>
  <AdminPage />
</template>
