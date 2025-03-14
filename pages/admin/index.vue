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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
definePageMeta({
  layout: 'admin'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Variables pour le username
const username = ref('')
const loading = ref(false)
const message = ref('')
const messageColor = ref('green')

// Pour obtenir l'ID interne de l'utilisateur (integer)
const userIdInt = ref(null)

onMounted(async () => {
  if (!user.value?.id) return

  // Récupération de l'utilisateur dans la table "users"
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .eq('supabase_id', user.value.id)
    .single()

  if (error) {
    console.error('Erreur lors de la récupération du profil:', error)
  } else if (data) {
    userIdInt.value = data.id
    username.value = data.username || ''
  }
})

// Fonction pour mettre à jour le username dans la table "users"
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
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  padding: 0.5rem;
  border: 1px solid #ccc;
  text-align: left;
}
a {
  cursor: pointer;
  color: #6772e5;
  text-decoration: underline;
}
</style>
