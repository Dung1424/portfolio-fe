<script setup>
import AccountWorkspace from '~/features/account/components/AccountWorkspace.vue'

definePageMeta({
    name: 'Account',
    requiresAuth: true,
    middleware: ['account-tab']
})
</script>

<template>
    <AccountWorkspace />
</template>
