<script setup>
import AddPhotos from '~/components/AddPhotos.vue'

definePageMeta({ name: 'AddPhotos', requiresAuth: true })
</script>

<template>
  <AddPhotos />
</template>
