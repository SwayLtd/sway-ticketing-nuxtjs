<!-- pages/dashboard.vue -->
<template>
  <div class="container">
    <h1>Dashboard</h1>
    <p>Bienvenue, {{ user.email }}</p>

    <!-- Section mise à jour du username (déjà en place) -->
    <section>
      <h2>Modifier votre username</h2>
      <form @submit.prevent="updateUsername">
        <div>
          <label for="username">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            placeholder="Entrez votre nouveau username"
            required
          >
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Mise à jour...' : 'Mettre à jour' }}
        </button>
      </form>
      <p v-if="message" :style="{ color: messageColor }">{{ message }}</p>
    </section>

    <!-- Section d'affichage des infos Stripe -->
    <section>
      <h2>Informations de votre compte Stripe Connect</h2>
      <div v-if="loadingStripe">
        <p>Chargement des informations Stripe…</p>
      </div>
      <div v-else-if="stripeInfo">
        <p><strong>Account ID:</strong> {{ stripeInfo.id }}</p>
        <p v-if="stripeInfo.email"><strong>Email:</strong> {{ stripeInfo.email }}</p>
        <p><strong>Pays:</strong> {{ stripeInfo.country }}</p>
        <p>
          <strong>Capacités:</strong>
          <ul>
            <li>Card Payments: {{ stripeInfo.capabilities?.card_payments }}</li>
            <li>Transfers: {{ stripeInfo.capabilities?.transfers }}</li>
          </ul>
        </p>
        <p><strong>Détails soumis:</strong> {{ stripeInfo.details_submitted ? 'Oui' : 'Non' }}</p>
        <p><strong>Charges activées:</strong> {{ stripeInfo.charges_enabled ? 'Oui' : 'Non' }}</p>
        <p><strong>Payouts activés:</strong> {{ stripeInfo.payouts_enabled ? 'Oui' : 'Non' }}</p>
      </div>
      <div v-else>
        <p>Aucune information Stripe disponible.</p>
      </div>
    </section>

    <!-- Section pour lier Stripe Connect si non lié -->
    <section v-if="!stripeAccountId">
      <h2>Stripe Connect</h2>
      <div>
        <p>Vous n'avez pas encore lié votre compte Stripe Connect.</p>
        <button :disabled="stripeLoading" @click="linkStripe">
          {{ stripeLoading ? 'En cours…' : 'Lier mon compte Stripe Connect' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports' // Auto-importés par @nuxtjs/supabase

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Variables pour username
const username = ref('')
const loading = ref(false)
const message = ref('')
const messageColor = ref('green')

// Variables pour Stripe
const stripeLoading = ref(false)
const stripeInfo = ref(null)
const stripeAccountId = ref(null)

// Récupération des infos du profil depuis la table "users"
onMounted(async () => {
  if (!user.value?.id) return

  const { data, error } = await supabase
    .from('users')
    .select('username, stripe_account_id')
    .eq('supabase_id', user.value.id)
    .single()

  if (error) {
    console.error('Erreur lors de la récupération du profil:', error)
  } else if (data) {
    username.value = data.username || ''
    stripeAccountId.value = data.stripe_account_id || null
    if (stripeAccountId.value) {
      await fetchStripeDetails(stripeAccountId.value)
    }
  }
})

// Fonction pour récupérer les infos Stripe via l'endpoint existant
async function fetchStripeDetails(accountId) {
  try {
    stripeLoading.value = true
    stripeInfo.value = await $fetch(`/api/stripe/account?accountId=${accountId}`)
  } catch (err) {
    console.error('Erreur lors de la récupération des infos Stripe:', err)
  } finally {
    stripeLoading.value = false
  }
}

// Fonction pour mettre à jour le username
async function updateUsername() {
  if (!user.value?.id) return
  loading.value = true
  message.value = ''

  const { error } = await supabase
    .from('users')
    .update({ username: username.value, email: user.value.email })
    .eq('supabase_id', user.value.id)

  if (error) {
    console.error('Erreur lors de la mise à jour du profil:', error)
    message.value = error.message
    messageColor.value = 'red'
  } else {
    message.value = 'Votre username a été mis à jour avec succès !'
    messageColor.value = 'green'
  }
  loading.value = false
}

// Fonction pour lier Stripe Connect (démarre le processus d'onboarding)
async function linkStripe() {
  if (!user.value?.email) return
  stripeLoading.value = true

  try {
    const response = await $fetch('/api/stripe/connect', {
      method: 'POST',
      body: { email: user.value.email }
    })
    if (response.url) {
      window.location.href = response.url
    }
  } catch (err) {
    console.error('Erreur lors du lien avec Stripe Connect :', err)
  } finally {
    stripeLoading.value = false
  }
}
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
}
section {
  margin-bottom: 2rem;
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
  padding: 0.75rem 1.5rem;
  background-color: #6772e5;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
