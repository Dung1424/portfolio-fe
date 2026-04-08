<script setup>
definePageMeta({ name: 'Like', requiresAuth: true })
await navigateTo({ path: '/account', query: { tab: 'likes' } }, { replace: true })
</script>

<template>
    <div />
</template>
