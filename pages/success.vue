<!-- pages/success.vue -->
<template>
    <div class="success-container">
      <h1>Paiement réussi !</h1>
      <p>Votre session Stripe est confirmée.</p>
      <p v-if="sessionId"><strong>Session ID:</strong> {{ sessionId }}</p>
      <NuxtLink to="/">Retour à l'accueil</NuxtLink>
    </div>
  </template>
  
  <script setup>
  import { useRoute } from 'vue-router'
  
  const route = useRoute()
  const sessionId = route.query.session_id
  </script>
  
  <style scoped>
  .success-container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    text-align: center;
    font-family: sans-serif;
  }
  .success-container h1 {
    color: #4caf50;
  }
  .success-container p {
    font-size: 1.2rem;
    color: #333;
  }
  </style>
  