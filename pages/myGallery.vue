<script setup>
import MyGallery from '~/components/MyAccount/MyGallery.vue'

definePageMeta({ name: 'MyGallery', requiresAuth: true })
</script>

<template>
  <MyGallery />
</template>
