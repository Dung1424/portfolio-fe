<script setup>
import AdminPage from '~/features/admin/users/components/UsersInactivePage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_INACTIVE_USER',
  title: 'Inactive users'
})
</script>

<template>
  <AdminPage />
</template>
