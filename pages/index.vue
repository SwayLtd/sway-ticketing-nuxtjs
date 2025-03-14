<template>
    <div class="container">
      <h2>Bienvenue sur l'onboarding Stripe Connect</h2>
      <form @submit.prevent="startOnboarding">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" placeholder="Votre email" required >
        <button type="submit">Commencer l'onboarding</button>
      </form>
      <div v-if="loading" class="loading">Chargement...</div>
      <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const email = ref('')
  const loading = ref(false)
  const errorMessage = ref('')
  
  const startOnboarding = async () => {
    loading.value = true
    errorMessage.value = ''
  
    try {
      const response = await $fetch('/api/stripe/connect', {
        method: 'POST',
        body: { email: email.value }
      })
  
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error) {
      console.error("Erreur lors de l'onboarding Stripe Connect :", error)
      errorMessage.value = "Erreur lors du démarrage de l'onboarding."
    } finally {
      loading.value = false
    }
  }
  </script>
  
  <style scoped>
  .container {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    font-family: sans-serif;
  }
  
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }
  
  input {
    width: 100%;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  
  button {
    background-color: #6772e5;
    color: #fff;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    cursor: pointer;
  }
  
  button:hover {
    background-color: #5469d4;
  }
  
  .loading {
    margin-top: 1rem;
    font-style: italic;
  }
  
  .error {
    margin-top: 1rem;
    color: red;
  }
  </style>
  