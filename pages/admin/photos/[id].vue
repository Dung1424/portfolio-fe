<script setup>
import { onMounted } from 'vue'
import { navigateTo, useRoute } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Photo'
})

const route = useRoute()

onMounted(() => {
  const id = route.params.id
  navigateTo({ path: '/admin/photos', query: { photo: String(id) } }, { replace: true })
})
</script>

<template>
  <div />
</template>
