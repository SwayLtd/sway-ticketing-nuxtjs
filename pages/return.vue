<template>
  <div>
    <h1>Onboarding terminé</h1>
    <div v-if="loading">
      <p>Validation en cours…</p>
    </div>
    <div v-else>
      <p v-if="success">Votre compte Stripe Connect a été lié avec succès !</p>
      <p v-else>Erreur lors du lien du compte Stripe Connect.</p>
      <button @click="goToDashboard">Aller au Dashboard</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSupabaseUser, useSupabaseClient } from '#imports'  // Utilisez le client par défaut

const user = useSupabaseUser()
const supabase = useSupabaseClient()  // Utilisez le client qui gère déjà l'auth
const router = useRouter()
const route = useRoute()

const loading = ref(true)
const success = ref(false)

const goToDashboard = () => {
  router.push('/dashboard')
}

onMounted(async () => {
  const stripeAccountId = route.query.accountId
  if (!stripeAccountId || !user.value?.id || !user.value?.email) {
    loading.value = false
    return
  }

  try {
    // Récupérer la session pour obtenir le token d'accès
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      throw new Error("Token d'accès non trouvé")
    }

    // Appel de l'endpoint avec le header Authorization contenant le token
    const { success: linkSuccess } = await $fetch('/api/link-stripe', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        userId: user.value.id,
        stripeAccountId,
        email: user.value.email
      }
    })
    success.value = linkSuccess
  } catch (err) {
    console.error('Erreur lors de la liaison du compte Stripe Connect :', err)
    success.value = false
  } finally {
    loading.value = false
  }
})
</script>
