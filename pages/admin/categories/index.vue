<script setup>
import AdminPage from '~/features/admin/categories/components/CategoriesListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_CATEGORY',
  title: 'Categories'
})
</script>

<template>
  <AdminPage />
</template>
