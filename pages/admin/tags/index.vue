<script setup>
import AdminPage from '~/features/admin/tags/components/TagsListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Tags'
})
</script>

<template>
  <AdminPage />
</template>
