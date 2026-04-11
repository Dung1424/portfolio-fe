<script setup>
import AdminPage from '~/features/admin/users/components/UsersListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Users'
})
</script>

<template>
  <AdminPage />
</template>
