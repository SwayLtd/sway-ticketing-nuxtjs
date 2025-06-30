
<script setup lang="ts">
import { useSeoMeta, useHead } from '#imports'

// SEO meta tags
useSeoMeta({
  title: 'Sway – Find raves and festivals',
  ogTitle: 'Sway – Find raves and festivals',
  description: 'Sway is a mobile event management application that helps users discover, organize, and manage raves and festivals effortlessly.',
  ogDescription: 'Discover, organize, and manage events effortlessly with Sway.',
  ogImage: '/images/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Sway – Find raves and festivals',
  twitterDescription: 'Discover, organize, and manage events effortlessly with Sway.',
  twitterImage: '/images/og-image.jpg',
})

// JSON-LD
useHead({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'MobileApplication',
        name: 'Sway',
        operatingSystem: 'ANDROID, IOS',
        applicationCategory: 'BusinessApplication',
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.5',
          reviewCount: '276',
        },
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
        url: 'https://sway.events',
        description: 'Sway is a mobile event management application that helps users discover, organize, and manage raves and festivals effortlessly.'
      })
    }
  ]
})

function openPlayStore() {
  window.open('https://play.google.com/store/apps/details?id=app.sway.main', '_blank')
}
function openAppStore() {
  window.open('https://apps.apple.com/us/app/sway-find-raves-and-festivals/id6744655264', '_blank')
}
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// --- Scroll horizontal JS logic converted from script.js ---
const slidesCount = ref(0)
const currentIndex = ref(0)
let wheelDeltaAcc = 0
const scrollContainer = ref<HTMLElement | null>(null)
const horizontalSection = ref<HTMLElement | null>(null)

function handleScroll() {
  const sec = horizontalSection.value
  if (!sec) return
  if (window.innerWidth >= 1025) {
    const maxScroll = (slidesCount.value - 1) * window.innerHeight
    const scrollTop = window.scrollY
    const clamped = Math.max(0, Math.min(scrollTop, maxScroll))
    const ratio = maxScroll === 0 ? 0 : clamped / maxScroll
    const maxTranslate = (slidesCount.value - 1) * 0.5 * window.innerWidth
    const translateX = -ratio * maxTranslate
    sec.style.transform = `translateX(${translateX}px)`
  } else {
    sec.style.transform = 'translateX(0)'
  }
}

function handleWheel(event: WheelEvent) {
  if (window.innerWidth < 1025) return
  event.preventDefault()
  wheelDeltaAcc += event.deltaY
  const threshold = 100
  if (wheelDeltaAcc > threshold && currentIndex.value < slidesCount.value - 1) {
    currentIndex.value++
    wheelDeltaAcc = 0
  } else if (wheelDeltaAcc < -threshold && currentIndex.value > 0) {
    currentIndex.value--
    wheelDeltaAcc = 0
  }
  window.scrollTo({
    top: currentIndex.value * window.innerHeight,
    behavior: 'smooth',
  })
}

function handleResize() {
  if (window.innerWidth < 1025) {
    currentIndex.value = 0
    wheelDeltaAcc = 0
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    if (horizontalSection.value) horizontalSection.value.style.transform = 'translateX(0)'
  }
}

onMounted(() => {
  nextTick(() => {
    // 1) Initialisation du nombre de slides et du body height
    slidesCount.value = document.querySelectorAll('.slide').length
    document.body.style.height = `${slidesCount.value * 100}vh`
    document.documentElement.style.setProperty('--slides-count', String(slidesCount.value))
    // 2) Détection du mode mobile
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (!isMobile) {
      window.addEventListener('scroll', handleScroll)
      window.addEventListener('wheel', handleWheel, { passive: false })
      window.addEventListener('resize', handleResize)
      handleScroll()
    } else {
      if (horizontalSection.value) horizontalSection.value.style.transform = 'none'
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('resize', handleResize)
})

</script>

<template>
  <div>
    <!-- Header (mobile & desktop) -->
    <header class="mobile-header">
      <div class="mobile-header-content">
        <img src="/images/sway-app.png" alt="Sway Logo" class="mobile-logo" />
        <span class="mobile-app-name">Sway</span>
      </div>
      <button class="get-app-btn" @click="openPlayStore">Get the app</button>
    </header>

    <div id="scroll-container" ref="scrollContainer">
      <div class="left-panel">
        <div class="left-panel-content">
          <img src="/images/sway-app.png" alt="Sway Logo" class="sway-logo" />
          <div class="app-title">Sway</div>
          <div class="subtitle">Find raves and festivals</div>
          <div class="description">
            The ultimate raver companion. Lineups, set times, event discovery, and more – all offline, all in one app.
          </div>
          <div class="store-buttons">
            <img src="/images/play-store.png" alt="Play Store" class="store-btn" @click="openPlayStore" />
            <img src="/images/app-store.png" alt="App Store" class="store-btn" @click="openAppStore" />
          </div>
        </div>
        <div class="left-panel-footer">
          <span>Copyright © 2025 <span class="sway-highlight">Sway</span></span>
        </div>
      </div>
      <div id="horizontal-section" ref="horizontalSection">
        <div class="slide first-slide">
          <div class="first-slide-content">
            <img src="/images/phone-composition.png" alt="Phone composition" class="phone-image" />
            <span class="scroll-text">Scroll to discover</span>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/discover.png" alt="Discover feature" class="mockup-image" />
            <div class="feature-title">Discover the best music events 🎵</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/timeline.png" alt="Roadmap" class="mockup-image" />
            <div class="feature-title">Roadmap 🎉</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/phone-mockup.png" alt="Notifications" class="mockup-image" />
            <div class="feature-title">Stay ahead with smart notifications 🔔</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/phone-mockup.png" alt="Community" class="mockup-image" />
            <div class="feature-title">Connect and share with the raving community 💬</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped src="../website/assets/style.css"></style>
