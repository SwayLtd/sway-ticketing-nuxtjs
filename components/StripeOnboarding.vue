<template>
    <div>
      <h1>Intégration de Stripe Connect</h1>
      <form @submit.prevent="handleOnboarding">
        <input v-model="email" type="email" placeholder="Votre email" required >
        <button type="submit">Commencer l'onboarding</button>
      </form>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  
  const email = ref('');
  
  const handleOnboarding = async () => {
    try {
      const response = await $fetch('/api/stripe/connect', {
        method: 'POST',
        body: { email: email.value },
      });
  
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (error) {
      console.error('Erreur lors de l\'onboarding :', error);
    }
  };
  </script>
  