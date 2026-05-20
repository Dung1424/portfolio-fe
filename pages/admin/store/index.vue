<script setup>
import StoreAdminPage from '~/features/admin/store/components/StoreAdminPage.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'MANAGE_STORE_ITEM',
  title: 'Store'
})
</script>

<template>
  <StoreAdminPage />
</template>
