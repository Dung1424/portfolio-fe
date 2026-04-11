<script setup>
import AdminPage from '~/features/admin/blogs/components/BlogsListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Blogs'
})
</script>

<template>
  <AdminPage />
</template>
