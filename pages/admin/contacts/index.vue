<script setup>
import AdminPage from '~/features/admin/contacts/components/ContactsListPage.vue'
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Contacts'
})
</script>

<template>
  <AdminPage />
</template>
