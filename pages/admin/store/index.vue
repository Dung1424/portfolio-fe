<script setup>
import StoreAdminPage from '~/features/admin/store/components/StoreAdminPage.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Store'
})
</script>

<template>
  <StoreAdminPage />
</template>
