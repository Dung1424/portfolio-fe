<script setup>
import ChangePassword from '~/components/MyAccount/ChangePassword.vue'

definePageMeta({ name: 'ChangePassword', requiresAuth: true })
</script>

<template>
  <ChangePassword />
</template>
