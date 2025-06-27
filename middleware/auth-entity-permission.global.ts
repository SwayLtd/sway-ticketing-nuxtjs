import { defineNuxtRouteMiddleware, useSupabaseUser, useSupabaseClient, navigateTo } from '#imports'
import { encodeRedirect } from '~/utils/redirect'

export default defineNuxtRouteMiddleware(async (to) => {
  // Ex: /admin/event/51/..., /admin/promoter/12/..., etc.
  const match = to.path.match(/^\/admin\/(\w+)\/(\d+)/)
  if (!match) return // Pas une page d'entité admin, ne rien faire

  const [, entityType, entityId] = match
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()

  if (!user.value) {
    // Redirige vers login avec redirect param (URL encodée)
    const redirectParam = encodeRedirect(to.fullPath)
    return navigateTo(`/login?redirect=${redirectParam}`)
  }

  // Récupérer l'ID interne utilisateur
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('supabase_id', user.value.id)
    .single()

  const userId = (userData as { id: number } | null)?.id
  if (!userId) {
    const redirectParam = encodeRedirect(to.fullPath)
    return navigateTo(`/login?redirect=${redirectParam}`)
  }

  // Vérifier la permission sur l'entité
  const { data: perm } = await supabase
    .from('user_permissions')
    .select('permission_level')
    .eq('user_id', userId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .single()

  const permissionLevel = (perm as { permission_level: number } | null)?.permission_level
  if (!permissionLevel || permissionLevel < 1) {
    // Option : afficher une page d'accès refusé ou rediriger
    return navigateTo('/login?unauthorized=1')
  }
})
