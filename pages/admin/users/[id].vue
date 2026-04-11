<script setup>
import AdminPage from '~/features/admin/users/components/UserDetailPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'User detail'
})
</script>

<template>
  <AdminPage />
</template>
