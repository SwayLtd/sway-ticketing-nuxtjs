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
  ],
  link: [
    { rel: 'preload', as: 'image', href: '/images/sway-app.png' },
    { rel: 'preload', as: 'image', href: '/images/phone-composition.png' },
    { rel: 'preload', as: 'image', href: '/images/play-store.png' },
    { rel: 'preload', as: 'image', href: '/images/app-store.png' }
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
        <img src="/images/sway-app.png" alt="Sway Logo" class="mobile-logo" loading="eager" />
        <span class="mobile-app-name">Sway</span>
      </div>
      <button class="get-app-btn" @click="openPlayStore">Get the app</button>
    </header>

    <div id="scroll-container" ref="scrollContainer">
      <div class="left-panel">
        <div class="left-panel-content">
          <img src="/images/sway-app.png" alt="Sway Logo" class="sway-logo" loading="eager" />
          <div class="app-title">Sway</div>
          <div class="subtitle">Find raves and festivals</div>
          <div class="description">
            The ultimate raver companion. Lineups, set times, event discovery, and more – all offline, all in one app.
          </div>
          <div class="store-buttons">
            <img src="/images/play-store.png" alt="Play Store" class="store-btn" @click="openPlayStore" loading="eager" />
            <img src="/images/app-store.png" alt="App Store" class="store-btn" @click="openAppStore" loading="eager" />
          </div>
        </div>
        <div class="left-panel-footer">
          <span>Copyright © 2025 <span class="sway-highlight">Sway</span></span>
        </div>
      </div>
      <div id="horizontal-section" ref="horizontalSection">
        <div class="slide first-slide">
          <div class="first-slide-content">
            <img src="/images/phone-composition.png" alt="Phone composition" class="phone-image" loading="eager" />
            <span class="scroll-text">Scroll to discover</span>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/discover.png" alt="Discover feature" class="mockup-image" loading="lazy" />
            <div class="feature-title">Discover the best music events 🎵</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/timeline.png" alt="Roadmap" class="mockup-image" loading="lazy" />
            <div class="feature-title">Roadmap 🎉</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/phone-mockup.png" alt="Notifications" class="mockup-image" loading="lazy" />
            <div class="feature-title">Stay ahead with smart notifications 🔔</div>
          </div>
        </div>
        <div class="slide feature-slide">
          <div class="feature-slide-content">
            <img src="/images/phone-mockup.png" alt="Community" class="mockup-image" loading="lazy" />
            <div class="feature-title">Connect and share with the raving community 💬</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------- */
/*                     RESET / BASE STYLES                       */
/* ------------------------------------------------------------- */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Pour navigateurs WebKit (Chrome, Safari, Edge Chromium...) */
::-webkit-scrollbar {
    width: 8px;
    /* Largeur de la barre */
}

::-webkit-scrollbar-track {
    background: transparent;
    /* Fond du "rail" */
    /* background: #fff; si tu préfères blanc */
}

::-webkit-scrollbar-thumb {
    background-color: #ccc;
    /* Couleur du "thumb" (gris) */
    border-radius: 4px;
    /* Coins arrondis */
}

::-webkit-scrollbar-thumb:hover {
    background-color: #aaa;
    /* Légèrement plus foncé au survol */
}

html {
    scrollbar-width: thin;
    /* Barre fine */
    scrollbar-color: #ccc transparent;
    /* thumb gris, fond transparent */
}

body {
    font-family: Inter, Arial, Helvetica, sans-serif;
    color: #333;

    /* 5 slides horizontales => 4 “pages” verticales => 400vh 
       Barre de scroll => overflow-y: scroll
    */
    height: 400vh;
    overflow-y: scroll;
    overflow-x: hidden;
}

img {
    display: block;
    max-width: 100%;
    height: auto;
}

ul {
    list-style-type: none;
}

/* ------------------------------------------------------------- */
/*            HEADER MOBILE (caché par défaut)                   */
/* ------------------------------------------------------------- */
.mobile-header {
    display: none;
}

.mobile-header-content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mobile-logo {
    width: 40px;
}

.mobile-app-name {
    font-weight: bold;
    font-size: 18px;
}

.sway-highlight {
    color: #FFBC00;
    /* Jaune */
}

/* ------------------------------------------------------------- */
/*                 MODE LAPTOP (≥ 1025px)                       */
/* ------------------------------------------------------------- */
@media (min-width: 1025px) {

    /* Panneau gauche */
    .left-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 50vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        /* Centre horizontalement */
        align-items: flex-start;
        /* Aligne en haut verticalement */
        padding-top: 40px;
        /* Décalage depuis le haut */
        background-color: #fff;
    }


    .left-panel-content {
        margin-top: 16%;
        margin-left: 16%;
    }

    .sway-logo {
        width: 106px;
        margin-bottom: 20px;
    }

    .app-title {
        font-size: 48px;
        font-weight: bold;
        margin-top: 10px;
    }

    .subtitle {
        font-size: 24px;
        font-weight: bold;
        margin: 8px 0 16px 0;
    }

    .description {
        font-size: 18px;
        color: rgb(131, 139, 143);
        margin-bottom: 40px;
        line-height: 1.4;
        width: 80%;
        /* optionnel pour lisibilité */
    }

    .store-buttons {
        display: flex;
        gap: 10px;
    }

    .store-btn {
        height: 55px;
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .store-btn:hover {
        transform: translateY(-2px);
        /* Décalage de 2px vers le haut */
    }

    .left-panel-footer {
        /* On place le footer en bas du conteneur */
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        margin-left: 14%;
        /* Style demandé */
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 22px;

        font-weight: 600;
        font-size: 16px;
        color: rgb(151, 160, 165);
    }

    /* Partie droite */
    #scroll-container {
        position: fixed;
        top: 0;
        left: 50vw;
        width: 50vw;
        height: 100vh;
        overflow: hidden;
        background-color: #f9f9f9;
    }

    /* Section horizontale : 5 slides x 50vw = 250vw */
    #horizontal-section {
        position: relative;
        width: calc(50vw * var(--slides-count));
        height: 100%;
        display: flex;
        transform: translateX(0);
        order: 3;
    }

    /* Slide de base : 50vw x 100vh, fond gris */
    .slide {
        width: 50vw;
        height: 100vh;
        background-color: #f2f2f2;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
    }

    /* Slide 1 : image plus grande */
    .first-slide-content .phone-image {
        width: 300px;
        margin-bottom: 50px;
        margin-left: -20px;
        /* Décale l'image de 20px vers la gauche */
    }

    .scroll-text {
        font-weight: 800;
        font-size: 32px;
        /* Dégradé horizontal : jaune (#FFBC00) → noir (#000) */
        background: linear-gradient(to right, #FFBC00 1%, #030303 80%);
        background-size: 200% auto;

        /* On “clip” le background au texte pour peindre uniquement les glyphes */
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        -webkit-text-fill-color: transparent;

        /* Animation “shine” */
        animation: shine 2s linear infinite;
    }

    /* Animation : on déplace le gradient de 0% à 200% */
    @keyframes shine {
        0% {
            background-position: 0% center;
        }

        100% {
            background-position: 200% center;
        }
    }

    /* Slides 2 à 5 : mockup plus petit, texte centré */
    .feature-slide-content {
        /* Ajoute ou remplace ces propriétés */
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;

        /* Tu peux garder text-align: center si tu veux centrer le texte également */
        text-align: center;

        /* Facultatif si tu veux limiter la largeur du contenu */
        max-width: 90%;
        margin: 0 auto;
    }

    .feature-slide-content .mockup-image {
        width: 220px;
        margin-bottom: 20px;
    }

    .feature-title {
        font-weight: 800;
        font-size: 28px;
        text-align: center;
        padding-left: 64px;
        padding-right: 64px;
        padding-top: 5vh;
    }
}

/* ========== TABLET (768px–1024px) ========== */
@media (max-width: 1024px) and (min-width: 768px) {

    /* Body en scrolling vertical, sans background */
    body {
        overflow-y: auto;
        height: auto !important;
    }

    /* Conteneur principal en flex vertical */
    #scroll-container {
        position: static;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: visible;
        margin: 0;
        padding: 0;
    }

    /* Aplatir les conteneurs pour que leurs enfants soient des items directs */
    .left-panel,
    #horizontal-section {
        display: contents;
    }

    /* Réordonner les éléments */
    .slide.first-slide {
        order: 1;
    }

    .left-panel-content {
        height: 60vh;
        order: 2;
        display: flex;
        flex-direction: column;
        width: 80%;
        margin: 0 auto;
        padding: 20px;
        background-color: #fff;
        max-width: 900px;
    }

    .logo-title {
        display: flex;
        align-items: center;
        margin-bottom: 20px;
    }

    .logo-title .sway-logo {
        margin-right: 10px;
    }

    .logo-title .app-title {
        margin: 0;
        /* Ajustez ce padding ou margin pour repositionner le texte verticalement */
        padding-top: 4px;
    }


    .slide.feature-slide {
        order: 3;
        background-color: #f2f2f2;
        min-width: 100%;
    }

    .left-panel-footer {
        order: 4;
        width: 100%;
        /* le footer occupe toute la largeur */
        background: #f2f2f2;
        /* le background souhaité */
        padding: 20px 0;
        /* espace interne vertical */
        margin: 0;
        display: flex;
        justify-content: center;
    }

    .left-panel-footer>* {
        max-width: 900px;
        /* contraint le contenu, si nécessaire */
        width: 100%;
        text-align: center;
        margin: 0 auto;
    }

    /* Première slide (phone-image) */
    .first-slide-content {
        margin: 10% auto 10% auto;
        display: flex;
        height: 40vh;
        align-items: center;
        justify-content: center;
        text-align: center;
        min-width: 100%;
    }

    .first-slide-content .phone-image {
        position: relative;
        width: 100%;
        max-width: 300px;
        /* ajustez si nécessaire */
        margin: 0 auto;
        transform: none;
    }

    .first-slide-content .scroll-text {
        display: none;
    }

    .slide.first-slide {
        background-color: #fff;
    }

    /* Styles généraux pour les slides */
    .slide {
        width: 100%;
        height: auto;
        display: block;
        margin: 20px auto;
        padding: 40px 20px;
        max-width: 900px;
        text-align: center;
    }

    .slide.feature-slide {
        background-color: #f2f2f2;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 0 auto;
        padding: 40px 20px;
    }

    .slide.feature-slide:last-of-type {
        margin-bottom: 0;
    }

    .feature-slide-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .feature-title {
        font-size: 32px;
        font-weight: 800;
        padding-top: 5vh;
        padding-left: 64px;
        padding-right: 64px;
        margin: 0;
    }

    .mockup-image {
        margin-bottom: 20px;
        width: 30%;
        height: 60%;
        object-fit: contain;
    }

    /* Styles complémentaires pour left-panel-content */
    .sway-logo {
        width: 48px;
        margin-right: 16px;
        vertical-align: middle;
    }

    .app-title {
        display: inline-block;
        vertical-align: middle;
        font-weight: 600;
        font-size: 48px;
        margin-top: 24px;
        margin-bottom: 4px;
    }

    .subtitle {
        font-weight: 600;
        font-size: 24px;
        color: #000;
        margin-bottom: 24px;
    }

    .description {
        font-size: 18px;
        color: rgb(131, 139, 143);
        margin-bottom: 40px;
        line-height: 1.4;
    }

    .store-buttons {
        display: flex;
        flex-direction: row;
        gap: 10px;
        align-items: center;
    }

    .store-btn {
        height: 55px;
        cursor: pointer;
        transition: transform 0.2s ease;
    }

    .store-btn:hover {
        transform: translateY(-2px);
    }
}

/* --- MOBILE --- */
@media (max-width: 767px) {

    /* Réinitialisation générale */
    body {
        height: auto !important;
    }

    /* Empêche le bounce/rubber-band et la propagation du scroll */
    html,
    body,
    #scroll-container,
    #horizontal-section {
        overscroll-behavior: contain;
        touch-action: pan-y;
        /* n’autorise que le scroll vertical natif */
    }

    /* Affichage du menu mobile en haut */
    .mobile-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #fff;
        padding: 10px 20px;
        border-bottom: 1px solid #ddd;
        z-index: 10;
    }

    .mobile-header .app-name {
        font-weight: bold;
        font-size: 18px;
    }

    .mobile-header .get-app-btn {
        -webkit-appearance: none;
        appearance: none;
        background-color: #FFBC00;
        border: none;
        padding: 8px 12px;
        font-weight: bold;
        border-radius: 4px;
        color: #000;
        /* ou #fff, selon ce qui contraste le mieux */
        cursor: pointer;
    }

    .sway-logo,
    .app-title {
        display: none;
    }

    /* Contenu principal en dessous du menu */
    #scroll-container {
        position: static;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: visible;
        margin: 0;
        padding: 0;
        -webkit-overflow-scrolling: touch;
    }

    /* Aplatir les conteneurs pour que leurs enfants soient des items directs */
    .left-panel,
    #horizontal-section {
        display: contents;
    }

    /* Ordre des éléments (similaire au mode tablette) */
    .slide.first-slide {
        order: 1;
    }

    .left-panel-content {
        order: 2;
        display: flex;
        flex-direction: column;
        width: 90%;
        margin: 0 auto 13% auto;
        background-color: #fff;
        max-width: 100%;
        min-height: 25vh;
    }

    .slide.feature-slide {
        order: 3;
    }

    .left-panel-footer {
        order: 4;
        width: 100%;
        background: #f2f2f2;
        padding: 20px 0;
        margin: 0;
        display: flex;
        justify-content: center;
    }

    .left-panel-footer>* {
        width: 100%;
        text-align: center;
        margin: 0 auto;
    }

    /* Première slide (phone-image) */
    .first-slide-content {
        order: 1;
        /* Déjà défini via .slide.first-slide */
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        margin: 0 auto;
        width: 100%;
        padding: 20px;
        height: 50%;
    }

    .first-slide-content .phone-image {
        position: relative;
        width: 80%;
        max-width: 300px;
        margin: 0 auto;
        transform: none;
    }

    .first-slide-content .scroll-text {
        display: none;
    }

    .slide.first-slide {
        background-color: #fff;
    }

    /* Styles généraux pour les slides */
    .slide {
        width: 100%;
        height: auto;
        display: block;
        margin: 20px auto;
        padding: 20px;
        max-width: 100%;
        text-align: center;
    }

    .slide.feature-slide {
        background-color: #f2f2f2;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin: 0 auto;
        padding: 20px;
        height: 100vh;
    }

    .slide.feature-slide:last-of-type {
        margin-bottom: 0;
    }

    .feature-slide-content {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .feature-title {
        font-size: 24px;
        font-weight: 800;
        padding-top: 2vh;
        padding-left: 20px;
        padding-right: 20px;
        margin: 0;
    }

    .mockup-image {
        margin-bottom: 20px;
        width: 80%;
        height: auto;

    }

    .mockup-image .roadmap-image {
        margin-bottom: 20px;
        width: 100% !important;
        height: 80% io !important;
    }

    /* Styles pour le contenu principal (left-panel-content) */
    .sway-logo,
    .app-title,
    .store-buttons {
        display: none;
    }

    .subtitle {
        font-weight: 600;
        font-size: 20px;
        color: #000;
        margin-bottom: 16px;
    }

    .description {
        font-size: 16px;
        color: rgb(131, 139, 143);
        margin-bottom: 20px;
        line-height: 1.4;
    }
}
</style>
