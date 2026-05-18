<script setup>
import StaffAdminPage from '~/features/admin/staff/components/StaffAdminPage.vue'

definePageMeta({ layout: 'admin', middleware: 'admin-auth' })
</script>

<template>
  <StaffAdminPage />
</template>
