<script setup>
definePageMeta({ name: 'MyGallery', requiresAuth: true })
await navigateTo({ path: '/account', query: { tab: 'galleries' } }, { replace: true })
</script>

<template>
    <div />
</template>
