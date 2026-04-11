<script setup>
import AdminPage from '~/features/admin/users/components/UsersInactivePage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Inactive users'
})
</script>

<template>
  <AdminPage />
</template>
