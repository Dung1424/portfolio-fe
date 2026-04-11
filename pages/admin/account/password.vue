<script setup>
import AdminPage from '~/features/admin/account/components/PasswordPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Password'
})
</script>

<template>
  <AdminPage />
</template>
