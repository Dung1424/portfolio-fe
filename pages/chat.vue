<script setup>
definePageMeta({
  name: 'Chat',
  requiresAuth: true,
  layout: 'chat',
})
</script>

<template>
  <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
    <ChatPage />
  </div>
</template>
