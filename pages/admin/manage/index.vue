<!-- pages/admin/manage.vue -->
<script setup>
import { ref, onMounted } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import { NuxtLink } from '#components'

definePageMeta({
  layout: 'admin'
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const promoterPermissions = ref([])
const eventPermissions = ref([])
const permissionsLoading = ref(false)
const userIdInt = ref(null)

onMounted(async () => {
  if (!user.value?.id) return

  // Récupérer l'ID interne de l'utilisateur depuis la table "users"
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
    // Récupérer les permissions pour les promoteurs
    const { data: perms, error: permError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userIdInt.value)
      .eq('entity_type', 'promoter')

    if (permError) {
      console.error('Erreur lors de la récupération des permissions promoteurs:', permError)
    } else if (perms) {
      const permissionLevelMap = { 1: 'user', 2: 'manager', 3: 'admin' }
      for (const perm of perms) {
        const { data: promoterData, error: promoterError } = await supabase
          .from('promoters')
          .select('name')
          .eq('id', perm.entity_id)
          .single()
        // Si aucune donnée ou un nom non défini, on n'ajoute pas cette permission
        if (promoterError || !promoterData?.name) continue
        // Si le nom récupéré est "Inconnu", on ne le liste pas
        if (promoterData.name === 'Inconnu') continue
        perm.promoter_name = promoterData.name
        perm.permission_level = permissionLevelMap[perm.permission_level] || perm.permission_level
        promoterPermissions.value.push(perm)
      }
    }

    // Récupérer les permissions pour les événements
    const { data: eventPerms, error: eventPermsError } = await supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userIdInt.value)
      .eq('entity_type', 'event')

    if (eventPermsError) {
      console.error('Erreur lors de la récupération des permissions événements:', eventPermsError)
    } else if (eventPerms) {
      for (const perm of eventPerms) {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('title')
          .eq('id', perm.entity_id)
          .single()
        if (eventError || !eventData?.title) continue
        perm.event_title = eventData.title
        // On suppose que le niveau de permission est déjà correct
        eventPermissions.value.push(perm)
      }
    }
  } catch (err) {
    console.error('Erreur lors de la récupération des permissions:', err)
  } finally {
    permissionsLoading.value = false
  }
})
</script>

<template>
  <div class="container">
    <h1>Manage Entities</h1>
    <div v-if="permissionsLoading">
      <p>Chargement de vos permissions…</p>
    </div>
    <div v-else>
      <!-- Liste des événements -->
      <div v-if="eventPermissions.length">
        <h2>Événements</h2>
        <table>
          <thead>
            <tr>
              <th>Nom de l'événement</th>
              <th>Niveau de permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in eventPermissions" :key="perm.entity_id">
              <td>
                <NuxtLink :to="`/admin/event/${perm.entity_id}`">
                  {{ perm.event_title }}
                </NuxtLink>
              </td>
              <td>{{ perm.permission_level }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <!-- Liste des promoteurs -->
      <div v-if="promoterPermissions.length">
        <h2>Promoteurs</h2>
        <table>
          <thead>
            <tr>
              <th>Nom du promoteur</th>
              <th>Niveau de permission</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in promoterPermissions" :key="perm.entity_id">
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
      <!-- Si aucune permission trouvée -->
      <div v-if="!eventPermissions.length && !promoterPermissions.length">
        <p>Aucune permission trouvée.</p>
      </div>
    </div>
  </div>
</template>

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
