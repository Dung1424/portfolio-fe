<script setup>
import AdminPage from '~/features/admin/reports/components/ReportsPhotosPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Photo reports'
})
</script>

<template>
  <AdminPage />
</template>
