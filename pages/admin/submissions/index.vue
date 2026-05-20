<script setup>
import SubmissionsAdminPage from '~/features/admin/quests/components/SubmissionsAdminPage.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_QUEST',
  title: 'Quest submissions'
})
</script>

<template>
  <SubmissionsAdminPage />
</template>
