<!-- pages/index.vue -->
<template>
  <div class="container">
    <h1>Bienvenue sur notre application</h1>
    <div v-if="user">
      <p>Connecté en tant que : {{ user.email }}</p>
      <p v-if="username">Username : {{ username }}</p>
      <button @click="goToDashboard">Accéder au Dashboard</button>
    </div>
    <div v-else>
      <button @click="goToLogin">Se connecter</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseUser, useSupabaseClient } from '#imports' // Auto-importés par @nuxtjs/supabase
import { useRouter } from 'vue-router'

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const router = useRouter()

// Pour récupérer le username depuis votre table "users"
const username = ref('')

onMounted(async () => {
  if (user.value && user.value.id) {
    // Récupération du username dans la table "users" en filtrant sur supabase_id
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('supabase_id', user.value.id)
      .single()
    if (error) {
      console.error('Erreur lors de la récupération du profil:', error)
    } else if (data) {
      username.value = data.username || ''
    }
  }
})

function goToDashboard() {
  router.push('/admin')
}

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
  text-align: center;
}
button {
  padding: 1rem 1.5rem;
  background-color: #6772e5;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background-color: #5469d4;
}
</style>
