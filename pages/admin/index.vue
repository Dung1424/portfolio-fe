<script setup>
import AdminPage from '~/features/admin/dashboard/components/DashboardPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Dashboard'
})
</script>

<template>
  <AdminPage />
</template>
