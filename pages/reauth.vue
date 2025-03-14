<template>
    <div>
      <h1>Ré-authentification requise</h1>
      <p>Une erreur est survenue lors du processus d'onboarding. Veuillez réessayer.</p>
      <button @click="retryOnboarding">Relancer l'onboarding</button>
    </div>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  
  const router = useRouter();
  const retryOnboarding = () => {
    // Par exemple, rediriger vers la page de démarrage de l'onboarding
    router.push('/');
  };
  </script>
  