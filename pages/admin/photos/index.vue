<script setup>
import AdminPage from '~/features/admin/photos/components/PhotosListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_LIST_PHOTO',
  title: 'Photos'
})
</script>

<template>
  <AdminPage />
</template>
