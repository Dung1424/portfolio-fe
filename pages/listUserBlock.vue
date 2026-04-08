<script setup>
definePageMeta({ name: 'ListUserBlock', requiresAuth: true })
await navigateTo({ path: '/account', query: { tab: 'privacy' } }, { replace: true })
</script>

<template>
    <div />
</template>
