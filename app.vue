<!-- <template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </div>
</template>

-->

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup>
useHead({
  htmlAttrs: {
    'data-theme': 'light'
  }
})
</script>