<!-- pages/return.vue -->
<template>
  <div class="container">
    <h1>Onboarding terminé</h1>
    <div v-if="loading">
      <p>Validation en cours…</p>
    </div>
    <div v-else>
      <p v-if="success">Le compte Stripe Connect a été lié avec succès !</p>
      <p v-else>Erreur lors de la liaison du compte Stripe Connect.</p>
      <button @click="goBack">Retour à la fiche promoteur</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSupabaseClient } from '#imports' // Auto-importé par @nuxtjs/supabase

const router = useRouter()
const supabase = useSupabaseClient()

const loading = ref(true)
const success = ref(false)
const promoterId = ref(null)

function goBack() {
  // Redirige vers la fiche admin du promoteur
  if (promoterId.value) {
    router.push(`/admin/promoter/${promoterId.value}`)
  } else {
    router.push('/admin')
  }
}

onMounted(async () => {
  // Récupérer le Stripe Account ID depuis l'URL (ex: ?accountId=acct_XXXXXX)
  const urlParams = new URLSearchParams(window.location.search)
  const stripeAccountId = urlParams.get('accountId')

  // Vérifier si un promoteur à lier a été stocké dans localStorage
  const storedPromoterId = localStorage.getItem('promoterToLink')
  if (storedPromoterId) {
    promoterId.value = storedPromoterId
  }

  if (!stripeAccountId || !promoterId.value) {
    loading.value = false
    return
  }

  try {
    // Récupérer la session pour obtenir le token d'accès
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error("Token d'accès non trouvé")

    // Appel de l'endpoint pour lier le promoteur via Stripe Connect
    const { success: linkSuccess } = await $fetch('/api/link-promoter-stripe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        promoterId: promoterId.value,
        stripeAccountId
      }
    })
    success.value = linkSuccess
    // On efface l'ID du promoteur temporaire
    localStorage.removeItem('promoterToLink')
  } catch (err) {
    console.error('Erreur lors de la liaison du compte Stripe Connect pour le promoteur:', err)
    success.value = false
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
  text-align: center;
}
button {
  padding: 0.75rem 1.5rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 1rem;
}
</style>
