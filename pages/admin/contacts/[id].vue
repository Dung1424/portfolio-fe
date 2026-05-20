<script setup>
import { onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'VIEW_CONTACT',
  title: 'Contact'
})

const route = useRoute()

onMounted(() => {
  const id = route.params.id
  navigateTo({ path: '/admin/contacts', query: { contact: String(id) } }, { replace: true })
})
</script>

<template>
  <div />
</template>
