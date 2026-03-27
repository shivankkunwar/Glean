<template>
  <NuxtLayout>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
useHead({
  script: !import.meta.dev ? [
    {
      defer: true,
      src: 'https://umami.shvnk.in/script.js',
      'data-website-id': '195eaf65-40eb-4389-838c-3c2f29938534'
    }
  ] : []
});
</script>
