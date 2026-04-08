<script setup>
definePageMeta({ name: 'ChangePassword', requiresAuth: true })
await navigateTo({ path: '/account', query: { tab: 'password' } }, { replace: true })
</script>

<template>
    <div />
</template>
