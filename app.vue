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
    {
      rel: 'stylesheet',
      href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&display=swap'
    }
  ],
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <!-- Chỉ client: tránh useState skeleton bị hydrate từ SSR (false) → ghi đè plugin -->
  <ClientOnly>
    <AppPageSkeleton />
  </ClientOnly>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
