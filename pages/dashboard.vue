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

    <!-- Section Liste des permissions pour les promoteurs -->
    <section>
      <h2>Vos permissions (Promoters)</h2>
      <div v-if="permissionsLoading">
        <p>Chargement de vos permissions…</p>
      </div>
      <div v-else-if="permissions.length">
        <table>
          <thead>
            <tr>
              <th>Nom du promoteur</th>
              <th>Niveau de permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in permissions" :key="perm.entity_id">
              <td>
                <a href="#" @click.prevent="goToPromoter(perm.entity_id)">
                  {{ perm.promoter_name }}
                </a>
              </td>
              <td>{{ perm.permission_level }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else>
        <p>Aucune permission trouvée.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { useRouter } from 'vue-router'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

// Variables pour le username
const username = ref('')
const loading = ref(false)
const message = ref('')
const messageColor = ref('green')

// Variables pour les permissions (promoter uniquement)
const permissions = ref([])
const permissionsLoading = ref(false)
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
    await fetchPermissions()
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

// Fonction pour récupérer les permissions de l'utilisateur pour les promoteurs
async function fetchPermissions() {
  if (!userIdInt.value) return
  permissionsLoading.value = true

  try {
    // On filtre sur user_permissions avec entity_type "promoter"
    const { data: perms, error } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userIdInt.value)
      .eq('entity_type', 'promoter')

    if (error) {
      console.error('Erreur lors de la récupération des permissions:', error)
    } else if (perms) {
      // Mapper les niveaux de permission
      const permissionLevelMap = { 1: 'user', 2: 'manager', 3: 'admin' }
      // Pour chaque permission, récupérer le nom du promoteur depuis la table "promoters"
      for (const perm of perms) {
        const { data: promoterData, error: promoterError } = await supabase
          .from('promoters')
          .select('name')
          .eq('id', perm.entity_id)
          .single()
        if (promoterError) {
          console.error('Erreur lors de la récupération du nom du promoter:', promoterError)
          perm.promoter_name = 'Inconnu'
        } else {
          perm.promoter_name = promoterData.name
        }
        // Convertir le niveau de permission
        perm.permission_level = permissionLevelMap[perm.permission_level] || perm.permission_level
      }
      permissions.value = perms
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions:', err)
  } finally {
    permissionsLoading.value = false
  }
}

// Fonction pour rediriger vers la page de détails d'un promoteur
function goToPromoter(promoterId) {
  router.push(`/admin/promoter/${promoterId}`)
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
