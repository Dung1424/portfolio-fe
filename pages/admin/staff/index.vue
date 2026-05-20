<script setup>
import StaffAdminPage from '~/features/admin/staff/components/StaffAdminPage.vue'

definePageMeta({ permission: 'MANAGE_STAFF_ACCOUNT', layout: 'admin', middleware: 'admin-auth' })
</script>

<template>
  <StaffAdminPage />
</template>
