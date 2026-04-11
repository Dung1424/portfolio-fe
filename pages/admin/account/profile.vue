<script setup>
import AdminPage from '~/features/admin/account/components/ProfilePage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Profile'
})
</script>

<template>
  <AdminPage />
</template>
