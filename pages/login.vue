<!-- pages/login.vue -->
<template>
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <img class="mx-auto h-12 w-auto" src="/images/black_logotype.jpg" alt="Sway">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Connexion à votre compte
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" method="post" @submit.prevent="signIn">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Adresse email
            </label>
            <div class="mt-1">
              <input id="email" v-model="email" name="email" type="email" autocomplete="email" required
                placeholder="Votre email"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FEBF1E] focus:border-[#FEBF1E] sm:text-sm">
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Mot de passe
            </label>
            <div class="mt-1">
              <input id="password" v-model="password" name="password" type="password" autocomplete="current-password"
                required placeholder="Votre mot de passe"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#FEBF1E] focus:border-[#FEBF1E] sm:text-sm">
            </div>
          </div>

          <div>
            <button type="submit"
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-black bg-[#FEBF1E] hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500">
              Se connecter
            </button>
          </div>
        </form>
        <p v-if="errorMessage" class="mt-4 text-center text-sm text-red-600">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { decodeRedirect, isSafeRedirect } from '~/utils/redirect'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const router = useRouter()
const route = useRoute()

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
    // Gestion de la redirection post-login
    const redirectParam = route.query.redirect as string | undefined
    if (redirectParam) {
      const decoded = decodeRedirect(redirectParam)
      if (isSafeRedirect(decoded)) {
        router.push(decoded)
        return
      }
    }
    router.push('/admin')
  } else {
    console.warn('Aucune session retournée. Vérifiez vos identifiants.')
    errorMessage.value = "Aucune session retournée. Vérifiez vos identifiants."
  }
}
</script>
