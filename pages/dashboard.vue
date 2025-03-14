<!-- pages/dashboard.vue -->
<template>
  <div class="container">
    <h1>Dashboard</h1>
    <p>Bienvenue, {{ user.email }}</p>

    <!-- Section mise à jour du username -->
    <section>
      <h2>Modifier votre username</h2>
      <form @submit.prevent="updateUsername">
        <div>
          <label for="username">Username</label>
          <input
            id="username"
            type="text"
            v-model="username"
            placeholder="Entrez votre nouveau username"
            required
          />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Mise à jour...' : 'Mettre à jour' }}
        </button>
      </form>
      <p v-if="message" :style="{ color: messageColor }">{{ message }}</p>
    </section>

    <!-- Section pour lier le compte Stripe Connect -->
    <section>
      <h2>Stripe Connect</h2>
      <div v-if="stripeAccountId">
        <p>Votre compte Stripe Connect est lié : {{ stripeAccountId }}</p>
      </div>
      <div v-else>
        <p>Vous n'avez pas encore lié votre compte Stripe Connect.</p>
        <button @click="linkStripe" :disabled="stripeLoading">
          {{ stripeLoading ? 'En cours...' : 'Lier mon compte Stripe Connect' }}
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

// Variables pour la mise à jour du username
const username = ref('')
const loading = ref(false)
const message = ref('')
const messageColor = ref('green')

// Variables pour le lien Stripe Connect
const stripeLoading = ref(false)
const stripeAccountId = ref(null)

// Au montage, on récupère les informations du profil dans la table "users"
// en filtrant sur "supabase_id" qui contient l'UUID de l'utilisateur Supabase.
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
  }
})

// Fonction pour mettre à jour le username dans la table "users"
async function updateUsername() {
  if (!user.value?.id) return
  loading.value = true
  message.value = ''

  const { error } = await supabase
    .from('users')
    .update({ username: username.value, email: user.value.email }) // on inclut email pour respecter la contrainte NOT NULL
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

// Fonction pour lier le compte Stripe Connect
async function linkStripe() {
  if (!user.value?.email) return
  stripeLoading.value = true

  try {
    // Appel de l'endpoint pour démarrer l'onboarding Stripe Connect
    const response = await $fetch('/api/stripe/connect', {
      method: 'POST',
      body: { email: user.value.email }
    })
    if (response.url) {
      // Redirection vers le processus d'onboarding Stripe
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
