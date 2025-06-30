<script setup lang="ts">
import { useRoute, useHead } from '#imports'
import { onMounted, ref } from 'vue'

const route = useRoute()
const entityId = route.params.id as string | undefined
const isMobile = ref(false)

const entityType = 'venue'

useHead({
  title: entityId ? `Sway App - Loading ${entityType}...` : 'Sway - Helping you find raves and afters',
  meta: [
    {
      name: 'description',
      content: 'Sway is a mobile event management application that helps users discover, organize, and manage events effortlessly. Sway aims to provide a seamless and intuitive experience for both event attendees and promoters.'
    }
  ]
})

onMounted(() => {
  isMobile.value = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (entityId && isMobile.value) {
    window.location.href = `app.sway.main://app/${entityType}/${entityId}`
  }
})
</script>

<template>
  <div class="venue-page">
    <img src="/images/sway-app.png" alt="Sway Logo" class="logo" loading="eager" />
    <p class="loading-text">Loading venue...</p>
    <p v-if="entityId && !isMobile" class="message">
      The web version of Sway App is not yet available.<br />Please check back soon, or open the app on your phone!
    </p>
  </div>
</template>

<style scoped>
.venue-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: #fff;
  font-family: Arial, sans-serif;
}
.logo {
  width: 400px;
  height: 400px;
  opacity: 1;
  animation: pulse 2s infinite;
}
.loading-text {
  margin-top: 20px;
  font-size: 1.5em;
  color: #333;
}
.message {
  margin-top: 30px;
  font-size: 1em;
  color: #666;
  text-align: center;
  max-width: 100%;
}
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
