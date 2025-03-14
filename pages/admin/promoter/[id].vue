<!-- pages/admin/promoter/[id].vue -->
<template>
    <div class="container">
      <h1>Détails du Promoteur</h1>
      <div v-if="loading">
        <p>Chargement…</p>
      </div>
      <div v-else>
        <div v-if="notAuthorized">
          <p>Pas autorisé.</p>
        </div>
        <div v-else-if="promoter">
          <p><strong>ID:</strong> {{ promoter.id }}</p>
          <p><strong>Nom:</strong> {{ promoter.name }}</p>
          <p v-if="promoter.image_url">
            <img :src="promoter.image_url" alt="Image du promoteur">
          </p>
          <p><strong>Description:</strong> {{ promoter.description }}</p>
          <p><strong>Vérifié:</strong> {{ promoter.is_verified ? 'Oui' : 'Non' }}</p>
          <div v-if="promoter.stripe_account_id">
            <h2>Informations Stripe</h2>
            <div v-if="stripeLoading">
              <p>Chargement des informations Stripe…</p>
            </div>
            <div v-else-if="stripeInfo">
              <p><strong>Account ID:</strong> {{ stripeInfo.id }}</p>
              <p v-if="stripeInfo.email"><strong>Email:</strong> {{ stripeInfo.email }}</p>
              <p><strong>Pays:</strong> {{ stripeInfo.country }}</p>
              <ul>
                <li>Card Payments: {{ stripeInfo.capabilities?.card_payments }}</li>
                <li>Transfers: {{ stripeInfo.capabilities?.transfers }}</li>
              </ul>
              <p><strong>Détails soumis:</strong> {{ stripeInfo.details_submitted ? 'Oui' : 'Non' }}</p>
              <p><strong>Charges activées:</strong> {{ stripeInfo.charges_enabled ? 'Oui' : 'Non' }}</p>
              <p><strong>Payouts activés:</strong> {{ stripeInfo.payouts_enabled ? 'Oui' : 'Non' }}</p>
            </div>
            <div v-else>
              <p>Aucune information Stripe disponible.</p>
            </div>
          </div>
          <div v-else>
            <button :disabled="stripeLoading" @click="linkPromoterStripe">
              {{ stripeLoading ? 'En cours…' : 'Connecter ce promoteur à Stripe' }}
            </button>
          </div>
        </div>
        <button @click="goBack">Retour</button>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useSupabaseClient, useSupabaseUser } from '#imports'
  definePageMeta({
  layout: 'admin'
})
  
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const router = useRouter()
  const route = useRoute()
  
  const promoter = ref(null)
  const loading = ref(true)
  const stripeLoading = ref(false)
  const stripeInfo = ref(null)
  const notAuthorized = ref(false)
  
  // On récupère d'abord les détails du promoteur
  onMounted(async () => {
    const promoterId = route.params.id
    if (!promoterId) {
      loading.value = false
      return
    }
    const { data: promoterData, error: promoterError } = await supabase
      .from('promoters')
      .select('*')
      .eq('id', promoterId)
      .single()
    if (promoterError) {
      console.error('Erreur lors de la récupération du promoteur:', promoterError)
      loading.value = false
      return
    }
    promoter.value = promoterData
  
    // Vérifier les permissions : récupérer l'ID interne de l'utilisateur dans la table "users"
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_id', user.value.id)
      .single()
    if (userError || !userData) {
      console.error('Erreur lors de la récupération de l’utilisateur interne:', userError)
      notAuthorized.value = true
      loading.value = false
      return
    }
    const userIdInt = userData.id
  
    // Vérifier dans la table "user_permissions" que l'utilisateur a une permission pour ce promoteur
    const { data: permData, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userIdInt)
      .eq('entity_type', 'promoter')
      .eq('entity_id', promoterId)
    if (permError) {
      console.error('Erreur lors de la récupération des permissions:', permError)
      notAuthorized.value = true
    } else if (!permData || permData.length === 0) {
      notAuthorized.value = true
    }
    
    // Si le promoteur est lié à Stripe, on récupère ses infos
    if (promoter.value.stripe_account_id) {
      await fetchStripeDetails(promoter.value.stripe_account_id)
    }
    loading.value = false
  })
  
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
  
  async function linkPromoterStripe() {
    // On stocke l'ID du promoteur dans localStorage afin que la page return puisse l'utiliser.
    localStorage.setItem('promoterToLink', promoter.value.id)
    try {
      stripeLoading.value = true
      // Vous pouvez utiliser un email de contact spécifique ou l'email du promoteur si disponible.
      const response = await $fetch('/api/stripe/connect', {
        method: 'POST',
        body: { email: promoter.value.email || user.value.email }
      })
      if (response.url) {
        window.location.href = response.url
      }
    } catch (err) {
      console.error('Erreur lors du lien avec Stripe Connect pour le promoteur:', err)
    } finally {
      stripeLoading.value = false
    }
  }
  
  function goBack() {
    router.back()
  }
  </script>
  
  <style scoped>
  .container {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
  }
  img {
    max-width: 100%;
    height: auto;
    margin-bottom: 1rem;
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
  