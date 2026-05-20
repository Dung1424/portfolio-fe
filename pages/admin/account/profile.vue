<script setup>
import AdminPage from '~/features/admin/account/components/ProfilePage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_ADMIN_PROFILE',
  title: 'Profile'
})
</script>

<template>
  <AdminPage />
</template>
