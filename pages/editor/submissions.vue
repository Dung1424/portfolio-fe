<script setup>
import SubmissionsAdminPage from '~/features/admin/quests/components/SubmissionsAdminPage.vue'

definePageMeta({
  layout: 'editor',
  middleware: ['editor-auth'],
  title: 'Editor Submissions'
})
</script>

<template>
  <SubmissionsAdminPage />
</template>
