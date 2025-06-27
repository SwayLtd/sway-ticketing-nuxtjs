import { ref } from 'vue'
import { useSupabaseClient, useSupabaseUser } from '#imports'

/**
 * Récupère le niveau de permission de l'utilisateur courant pour une entité donnée (event, promoter, etc.)
 * @param {string|number} entityId - L'ID de l'entité
 * @param {string} entityType - Le type d'entité (ex: 'event')
 * @returns {object} { currentUserPermission, loadingPermission, errorPermission }
 */
export function useEntityPermission(entityId: string | number, entityType: string = 'event') {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const currentUserPermission = ref<number | null>(null)
  const loadingPermission = ref(true)
  const errorPermission = ref<string | null>(null)

  async function fetchPermission() {
    loadingPermission.value = true
    errorPermission.value = null
    currentUserPermission.value = null
    try {
      // Récupérer l'ID interne de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('supabase_id', user.value.id)
        .single()
      if (userError || !userData) {
        errorPermission.value = "Utilisateur non trouvé"
        return
      }
      // Récupérer la permission
      const { data: permData, error: permError } = await supabase
        .from('user_permissions')
        .select('permission_level')
        .eq('user_id', userData.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .single()
      if (permError || !permData) {
        currentUserPermission.value = 0 // Aucun droit
      } else {
        currentUserPermission.value = permData.permission_level
      }
    } catch (e) {
      errorPermission.value = 'Erreur lors de la récupération des permissions.'
    } finally {
      loadingPermission.value = false
    }
  }

  return { currentUserPermission, loadingPermission, errorPermission, fetchPermission }
}
