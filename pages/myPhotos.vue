<script setup>
import MyPhoto from '~/components/MyAccount/MyPhoto.vue'

definePageMeta({ name: 'MyPhoto', requiresAuth: true })
</script>

<template>
  <MyPhoto />
</template>
