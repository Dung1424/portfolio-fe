<script setup>
import AdminPage from '~/features/admin/users/components/UserDetailPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_DETAIL_USER',
  title: 'User detail'
})
</script>

<template>
  <AdminPage />
</template>
