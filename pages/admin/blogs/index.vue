<script setup>
import AdminPage from '~/features/admin/blogs/components/BlogsListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_BLOG',
  title: 'Blogs'
})
</script>

<template>
  <AdminPage />
</template>
