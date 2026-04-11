<script setup>
import AdminPage from '~/features/admin/reports/components/ReportsGalleriesPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Gallery reports'
})
</script>

<template>
  <AdminPage />
</template>
