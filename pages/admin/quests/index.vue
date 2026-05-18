<script setup>
import QuestsAdminPage from '~/features/admin/quests/components/QuestsAdminPage.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Quests'
})
</script>

<template>
  <QuestsAdminPage />
</template>
