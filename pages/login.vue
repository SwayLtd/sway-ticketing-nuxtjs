<!-- pages/login.vue -->
<template>
  <div>
    <h1>Connexion</h1>
    <form @submit.prevent="signIn">
      <div>
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" placeholder="Votre email" required >
      </div>
      <div>
        <label for="password">Mot de passe</label>
        <input id="password" v-model="password" type="password" placeholder="Votre mot de passe" required >
      </div>
      <button type="submit">Se connecter</button>
    </form>
    <p v-if="errorMessage" style="color:red">{{ errorMessage }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const router = useRouter()

const supabase = useSupabaseClient()

const signIn = async () => {
  errorMessage.value = ''
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })
  console.log('Réponse de Supabase:', data, error)

  if (error) {
    console.error('Erreur lors de la connexion :', error)
    errorMessage.value = error.message
  } else if (data.session) {
    console.log('Connexion réussie, session :', data.session)
    router.push('/dashboard')
  } else {
    console.warn('Aucune session retournée. Vérifiez vos identifiants.')
    errorMessage.value = "Aucune session retournée. Vérifiez vos identifiants."
  }
}
</script>
