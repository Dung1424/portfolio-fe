<script setup>
import AdminPage from '~/features/admin/account/components/PasswordPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'CHANGE_ADMIN_PASSWORD',
  title: 'Password'
})
</script>

<template>
  <AdminPage />
</template>
