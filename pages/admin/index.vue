<script setup>
import AdminPage from '~/features/admin/dashboard/components/DashboardPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_DASHBOARD',
  title: 'Dashboard'
})
</script>

<template>
  <AdminPage />
</template>
