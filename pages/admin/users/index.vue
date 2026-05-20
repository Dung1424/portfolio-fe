<script setup>
import AdminPage from '~/features/admin/users/components/UsersListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_ACTIVE_USER',
  title: 'Users'
})
</script>

<template>
  <AdminPage />
</template>
