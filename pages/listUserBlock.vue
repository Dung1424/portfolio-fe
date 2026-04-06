<script setup>
import ListUserBlock from '~/components/MyAccount/ListUserBlock.vue'

definePageMeta({ name: 'ListUserBlock', requiresAuth: true })
</script>

<template>
  <ListUserBlock />
</template>
