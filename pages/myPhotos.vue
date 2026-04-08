<script setup>
definePageMeta({ name: 'MyPhoto', requiresAuth: true })
await navigateTo({ path: '/account', query: { tab: 'photos' } }, { replace: true })
</script>

<template>
    <div />
</template>
