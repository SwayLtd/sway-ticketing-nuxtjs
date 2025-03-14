<!-- pages/admin/manage.vue -->
<script setup>
</script>

<template>
  <div class="container">
    <h1>Manage Entities</h1>
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
              <NuxtLink :to="`/admin/promoter/${perm.entity_id}`">
                {{ perm.promoter_name }}
              </NuxtLink>
            </td>
            <td>{{ perm.permission_level }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else>
      <p>Aucune permission trouvée.</p>
    </div>
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

const permissions = ref([])
const permissionsLoading = ref(false)
// Pour obtenir l'ID interne de l'utilisateur (integer) depuis la table "users"
const userIdInt = ref(null)

onMounted(async () => {
  if (!user.value?.id) return

  // Récupération de l'utilisateur interne dans la table "users"
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()

  if (userError || !userData) {
    console.error('Erreur lors de la récupération de l’utilisateur interne:', userError)
    return
  }
  userIdInt.value = userData.id

  permissionsLoading.value = true
  try {
    // Récupérer les permissions de l'utilisateur pour les entités de type "promoter"
    const { data: perms, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userIdInt.value)
      .eq('entity_type', 'promoter')

    if (permError) {
      console.error('Erreur lors de la récupération des permissions:', permError)
    } else if (perms) {
      const permissionLevelMap = { 1: 'user', 2: 'manager', 3: 'admin' }
      // Pour chaque permission, récupérer le nom du promoteur depuis la table "promoters"
      for (const perm of perms) {
        const { data: promoterData, error: promoterError } = await supabase
          .from('promoters')
          .select('name')
          .eq('id', perm.entity_id)
          .single()
        if (promoterError) {
          console.error('Erreur lors de la récupération du nom du promoteur:', promoterError)
          perm.promoter_name = 'Inconnu'
        } else {
          perm.promoter_name = promoterData.name
        }
        perm.permission_level = permissionLevelMap[perm.permission_level] || perm.permission_level
      }
      permissions.value = perms
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions:', err)
  } finally {
    permissionsLoading.value = false
  }
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 1rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5rem;
  text-align: left;
}
</style>
