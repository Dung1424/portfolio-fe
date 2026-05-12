<script setup>
useSiteSeo()
useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' }
  ],
  link: [
    { rel: 'icon', href: '/front_assets/img/favicon.png' },
    { rel: 'apple-touch-icon', href: '/front_assets/img/apple-touch-icon.png' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'preload',
      as: 'font',
      type: 'font/woff2',
      href: 'https://fonts.gstatic.com/s/publicsans/v21/ijwRs572Xtc6ZYQws9YVwnNGfJ7QwOk1.woff2',
      crossorigin: ''
    },
    {
      rel: 'stylesheet',
      href: '/vendor/font-awesome/css/all.min.css',
      media: 'print',
      onload: `this.media='all'`
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap',
      media: 'print',
      onload: `this.media='all'`
    }
  ],
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
