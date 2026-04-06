<script setup>
useHead({
  title: 'MyPortfolio',
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
      href: 'https://fonts.googleapis.com/css?family=Inconsolata:400,700|Raleway:400,700&display=swap'
    },
    { rel: 'stylesheet', href: '/front_assets/vendor/bootstrap/css/bootstrap.min.css' },
    { rel: 'stylesheet', href: '/front_assets/vendor/icofont/icofont.min.css' },
    { rel: 'stylesheet', href: '/front_assets/vendor/line-awesome/css/line-awesome.min.css' },
    { rel: 'stylesheet', href: '/front_assets/vendor/aos/aos.css' },
    { rel: 'stylesheet', href: '/front_assets/vendor/owlcarousel/assets/owl.carousel.min.css' },
    { rel: 'stylesheet', href: '/front_assets/css/style.css' }
  ],
  htmlAttrs: { lang: 'en' }
})
</script>

<template>
  <NuxtPage />
</template>
