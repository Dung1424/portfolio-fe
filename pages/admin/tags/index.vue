<script setup>
import AdminPage from '~/features/admin/tags/components/TagsListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_TAG',
  title: 'Tags'
})
</script>

<template>
  <AdminPage />
</template>
