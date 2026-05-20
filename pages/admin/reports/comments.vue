<script setup>
import AdminPage from '~/features/admin/reports/components/ReportsCommentsPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_COMMENT_REPORT',
  title: 'Comment reports'
})
</script>

<template>
  <AdminPage />
</template>
