<script setup>
import RedemptionsAdminPage from '~/features/admin/store/components/RedemptionsAdminPage.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Redemptions'
})
</script>

<template>
  <RedemptionsAdminPage />
</template>
