<!-- pages/admin/event/[id]/permissions.vue -->
<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabaseClient, useSupabaseUser } from '#imports'
import AdminNotification from '~/components/admin/AdminNotification.vue'

definePageMeta({
  layout: 'admin-event'
})

const supabase = useSupabaseClient()
const route = useRoute()
const user = useSupabaseUser()

// Event ID from URL
const eventId = route.params.id

// State variables
const loading = ref(true)
const loadingPermissions = ref(false)
const userIdInt = ref(null)
const currentUserPermission = ref(null)
const notAuthorized = ref(false)

// Permissions data
const permissions = ref([])
const availableUsers = ref([])

// Modal states
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)

// Form data
const addUserForm = ref({
  selectedUserId: null,
  permissionLevel: 1
})
const editForm = ref({
  userId: null,
  permissionLevel: null,
  userName: ''
})
const deleteForm = ref({
  userId: null,
  userName: ''
})

// Search and filter
const searchTerm = ref('')
const permissionFilter = ref('all') // 'all', 'admin', 'manager', 'user'
const userSearchTerm = ref('') // For modal user search

// Notifications
const notifications = ref([])

// Permission level mapping with light theme colors and descriptions
const permissionLevels = {
  1: { 
    name: 'User', 
    color: 'badge-info', 
    canManage: [],
    description: 'Allow viewing information related to the event.'
  },
  2: { 
    name: 'Manager', 
    color: 'badge-warning', 
    canManage: [1],
    description: 'Allows modifying the event and managing part of the access.'
  },
  3: { 
    name: 'Admin', 
    color: 'badge-success', 
    canManage: [1, 2, 3],
    description: 'Allows modifying, deleting the event and managing full access.'
  }
}

// Check if current user can manage a specific permission level
const canManageLevel = (level) => {
  if (!currentUserPermission.value) return false
  return permissionLevels[currentUserPermission.value].canManage.includes(level)
}

// Check if current user can add users
const canAddUsers = computed(() => {
  return currentUserPermission.value >= 2 // Manager or Admin
})

// Filtered permissions
const filteredPermissions = computed(() => {
  let filtered = permissions.value

  // Filter by search term
  if (searchTerm.value) {
    const search = searchTerm.value.toLowerCase()
    filtered = filtered.filter(p => 
      p.user_name.toLowerCase().includes(search) ||
      p.user_email.toLowerCase().includes(search)
    )
  }

  // Filter by permission level
  if (permissionFilter.value !== 'all') {
    const levelMap = { admin: 3, manager: 2, user: 1 }
    filtered = filtered.filter(p => p.permission_level === levelMap[permissionFilter.value])
  }

  return filtered
})

// Permission statistics
const permissionStats = computed(() => {
  const stats = {
    total: permissions.value.length,
    admins: permissions.value.filter(p => p.permission_level === 3).length,
    managers: permissions.value.filter(p => p.permission_level === 2).length,
    users: permissions.value.filter(p => p.permission_level === 1).length
  }
  return stats
})

// Available users for adding (excluding those who already have permissions)
const availableUsersForAdd = computed(() => {
  const existingUserIds = permissions.value.map(p => p.user_id)
  let filtered = availableUsers.value.filter(u => !existingUserIds.includes(u.id))
  
  // Filter by search term in modal
  if (userSearchTerm.value) {
    const search = userSearchTerm.value.toLowerCase()
    filtered = filtered.filter(u => 
      u.username.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search)
    )
  }
  
  return filtered
})

// Initialize page
onMounted(async () => {
  await checkUserPermission()
  if (!notAuthorized.value) {
    await Promise.all([
      fetchEventPermissions(),
      fetchAvailableUsers()
    ])
  }
  loading.value = false
})

// Check current user's permission for this event
async function checkUserPermission() {
  if (!user.value) {
    notAuthorized.value = true
    return
  }

  try {
    // Get internal user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('supabase_id', user.value.id)
      .single()

    if (userError || !userData) {
      notAuthorized.value = true
      return
    }

    userIdInt.value = userData.id

    // Check permission for this event
    const { data: permData, error: permError } = await supabase
      .from('user_permissions')
      .select('permission_level')
      .eq('user_id', userIdInt.value)
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
      .single()

    if (permError || !permData) {
      notAuthorized.value = true
      return
    }

    currentUserPermission.value = permData.permission_level

    // Users (level 1) can only view, not manage
    if (currentUserPermission.value < 2) {
      // They can view but can't add/edit/delete
    }

  } catch (error) {
    console.error('Error checking user permission:', error)
    notAuthorized.value = true
  }
}

// Fetch event permissions
async function fetchEventPermissions() {
  loadingPermissions.value = true
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select(`
        user_id,
        permission_level,
        users!inner(
          id,
          username,
          email,
          profile_picture_url
        )
      `)
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)
      .order('permission_level', { ascending: false })

    if (error) throw error

    permissions.value = data.map(p => ({
      user_id: p.user_id,
      permission_level: p.permission_level,
      user_name: p.users.username,
      user_email: p.users.email,
      profile_picture_url: p.users.profile_picture_url
    }))

  } catch (error) {
    console.error('Error fetching permissions:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de la récupération des permissions.'
    })
  } finally {
    loadingPermissions.value = false
  }
}

// Fetch available users
async function fetchAvailableUsers() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, profile_picture_url')
      .order('username')

    if (error) throw error
    availableUsers.value = data

  } catch (error) {
    console.error('Error fetching users:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de la récupération des utilisateurs.'
    })
  }
}

// Add user permission
async function addUserPermission() {
  if (!addUserForm.value.selectedUserId || !canAddUsers.value) return

  // Check if user can manage this permission level
  if (!canManageLevel(addUserForm.value.permissionLevel)) {
    showNotification({
      type: 'error',
      message: 'Vous n\'avez pas l\'autorisation d\'attribuer ce niveau de permission.'
    })
    return
  }

  try {
    const { error } = await supabase
      .from('user_permissions')
      .insert({
        user_id: addUserForm.value.selectedUserId,
        entity_type: 'event',
        entity_id: parseInt(eventId),
        permission_level: addUserForm.value.permissionLevel
      })

    if (error) throw error

    showNotification({
      type: 'success',
      message: 'Permission ajoutée avec succès.'
    })

    closeAddModal()
    await fetchEventPermissions()

  } catch (error) {
    console.error('Error adding permission:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de l\'ajout de la permission.'
    })
  }
}

// Update user permission
async function updateUserPermission() {
  if (!editForm.value.userId || !canManageLevel(editForm.value.permissionLevel)) return

  try {
    const { error } = await supabase
      .from('user_permissions')
      .update({
        permission_level: editForm.value.permissionLevel
      })
      .eq('user_id', editForm.value.userId)
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)

    if (error) throw error

    showNotification({
      type: 'success',
      message: 'Permission modifiée avec succès.'
    })

    closeEditModal()
    await fetchEventPermissions()

  } catch (error) {
    console.error('Error updating permission:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de la modification de la permission.'
    })
  }
}

// Remove user permission
async function removeUserPermission() {
  if (!deleteForm.value.userId) return

  try {
    const { error } = await supabase
      .from('user_permissions')
      .delete()
      .eq('user_id', deleteForm.value.userId)
      .eq('entity_type', 'event')
      .eq('entity_id', eventId)

    if (error) throw error

    showNotification({
      type: 'success',
      message: 'Permission supprimée avec succès.'
    })

    closeDeleteModal()
    await fetchEventPermissions()

  } catch (error) {
    console.error('Error removing permission:', error)
    showNotification({
      type: 'error',
      message: 'Erreur lors de la suppression de la permission.'
    })
  }
}

// Modal functions
function openAddModal() {
  if (!canAddUsers.value) return
  userSearchTerm.value = ''
  addUserForm.value = {
    selectedUserId: null,
    permissionLevel: 1
  }
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
  userSearchTerm.value = ''
  addUserForm.value = {
    selectedUserId: null,
    permissionLevel: 1
  }
}

function openEditModal(permission) {
  if (!canManageLevel(permission.permission_level)) return
  // Empêcher de modifier sa propre permission
  if (permission.user_id === userIdInt.value) {
    showNotification({
      type: 'warning',
      message: 'Vous ne pouvez pas modifier votre propre permission.'
    })
    return
  }
  editForm.value = {
    userId: permission.user_id,
    permissionLevel: permission.permission_level,
    userName: permission.user_name
  }
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
  editForm.value = {
    userId: null,
    permissionLevel: null,
    userName: ''
  }
}

const confirmDeleteInput = ref('')

const isDeleteAdmin = computed(() => {
  const admin = permissions.value.find(p => p.user_id === deleteForm.value.userId)
  return admin && admin.permission_level === 3
})

const canConfirmDelete = computed(() => {
  if (!isDeleteAdmin.value) return true
  return confirmDeleteInput.value === deleteForm.value.userName
})

function openDeleteModal(permission) {
  if (!canManageLevel(permission.permission_level)) return
  // Empêcher de supprimer sa propre permission
  if (permission.user_id === userIdInt.value) {
    showNotification({
      type: 'warning',
      message: 'Vous ne pouvez pas supprimer votre propre permission.'
    })
    return
  }
  deleteForm.value = {
    userId: permission.user_id,
    userName: permission.user_name
  }
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteForm.value = {
    userId: null,
    userName: ''
  }
}

// Utility functions
function showNotification(notification) {
  const id = Date.now()
  notifications.value.push({ ...notification, id })
}

function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

function getPermissionLevelName(level) {
  return permissionLevels[level]?.name || 'Inconnu'
}

function getPermissionLevelColor(level) {
  return permissionLevels[level]?.color || 'badge-ghost'
}


</script>

<template>  <div class="min-h-screen bg-gray-50">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"/>
      <p class="ml-4 text-lg text-gray-900">Chargement...</p>
    </div>

    <!-- Unauthorized -->
    <div v-else-if="notAuthorized" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
      <div class="text-center">
        <div class="mx-auto h-12 w-12 text-error">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>        <h3 class="mt-4 text-lg font-medium text-gray-900">Accès non autorisé</h3>
        <p class="mt-2 text-sm text-gray-600">Vous n'avez pas l'autorisation d'accéder à cette page.</p>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 mb-1">Gestion des permissions</h1>
          <p class="text-sm text-gray-600">Gérez les permissions d'accès pour cet événement.</p>
        </div>
        <div class="flex gap-3">
          <button
            v-if="currentUserPermission >= 2"
            class="btn btn-primary"
            @click="openAddModal"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un utilisateur
          </button>
          <button
            v-else
            class="btn btn-primary btn-disabled opacity-50 cursor-not-allowed"
            disabled
            aria-disabled="true"
          >
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un utilisateur
          </button>
        </div>
      </div>      <!-- Statistics Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="card bg-white shadow-md border border-gray-200">
          <div class="card-body p-6">
            <div class="flex items-center">              <div class="p-3 rounded-full bg-blue-100">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Total utilisateurs</p>
                <p class="text-2xl font-bold text-gray-900">{{ permissionStats.total }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-md border border-gray-200">
          <div class="card-body p-6">
            <div class="flex items-center">              <div class="p-3 rounded-full bg-green-100">
                <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div class="ml-4">                <p class="text-sm font-medium text-gray-600">Administrateurs</p>
                <p class="text-2xl font-bold text-gray-900">{{ permissionStats.admins }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-md border border-gray-200">
          <div class="card-body p-6">
            <div class="flex items-center">              <div class="p-3 rounded-full bg-yellow-100">
                <svg class="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>              <div class="ml-4">                <p class="text-sm font-medium text-gray-600">Gestionnaires</p>
                <p class="text-2xl font-bold text-gray-900">{{ permissionStats.managers }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="card bg-white shadow-md border border-gray-200">
          <div class="card-body p-6">
            <div class="flex items-center">              <div class="p-3 rounded-full bg-blue-100">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div class="ml-4">
                <p class="text-sm font-medium text-gray-600">Utilisateurs</p>
                <p class="text-2xl font-bold text-gray-900">{{ permissionStats.users }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions Table -->
      <div class="card bg-base-100 shadow-xl border border-gray-200">
        <div class="card-body p-6 bg-white">
          <!-- Search and Filters -->
          <div class="flex flex-col sm:flex-row gap-4 mb-4 pb-4 border-b border-gray-200">
            <div class="flex-1">
              <input
                v-model="searchTerm"
                type="text"
                placeholder="Rechercher par nom ou email..."
                class="input input-bordered w-full bg-white text-gray-900 border-gray-300"
              >
            </div>
            <div class="flex gap-2">
              <select v-model="permissionFilter" class="select select-bordered bg-white text-gray-900">
                <option value="all">Tous les niveaux</option>
                <option value="admin">Administrateurs</option>
                <option value="manager">Gestionnaires</option>
                <option value="user">Utilisateurs</option>
              </select>
            </div>
          </div>
          <div v-if="loadingPermissions" class="flex items-center justify-center py-12">
            <div class="loading loading-spinner loading-md" />
            <span class="ml-3 text-gray-700">Chargement des permissions...</span>
          </div>          <div v-else-if="filteredPermissions.length === 0" class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900">Aucun utilisateur trouvé</h3>
            <p class="mt-2 text-sm text-gray-600">Aucun utilisateur ne correspond aux critères de recherche.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="table w-full bg-white">
              <thead class="bg-gray-50">
                <tr>
                  <th class="p-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Utilisateur</th>
                  <th class="p-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                  <th class="p-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Niveau de permission</th>
                  <th v-if="currentUserPermission >= 2" class="p-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="permission in filteredPermissions" :key="permission.user_id" class="hover:bg-gray-50 border-b border-gray-200 last:border-b-0">                  <td class="p-4">
                    <div class="flex items-center gap-3">
                      <div class="avatar">
                        <div class="w-12 h-12 rounded-lg overflow-hidden">
                          <img :src="permission.profile_picture_url" :alt="permission.user_name" class="w-full h-full object-cover">
                        </div>
                      </div>
                      <div>
                        <div class="font-bold text-gray-900">
                          {{ permission.user_name }}
                          <span v-if="permission.user_id === userIdInt" class="badge badge-primary badge-xs ml-2">Vous</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td class="p-4 text-gray-700">{{ permission.user_email }}</td>
                  <td class="p-4">
                    <div class="badge" :class="getPermissionLevelColor(permission.permission_level)">
                      {{ getPermissionLevelName(permission.permission_level) }}
                    </div>
                  </td>                  <td v-if="currentUserPermission >= 2" class="p-4">
                    <div v-if="permission.user_id === userIdInt" class="text-sm text-gray-500 italic">
                      Vous ne pouvez pas modifier vos propres permissions
                    </div>
                    <div v-else class="flex gap-2"><button
                        v-if="canManageLevel(permission.permission_level) && permission.user_id !== userIdInt"
                        class="btn btn-sm btn-ghost text-info"
                        :disabled="permission.user_id === userIdInt"
                        @click="openEditModal(permission)">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button><button
                        v-if="canManageLevel(permission.permission_level) && permission.user_id !== userIdInt"
                        class="btn btn-sm btn-ghost text-red-600"
                        @click="openDeleteModal(permission)">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>    <!-- Add User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-gray-500/30 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl max-w-4xl w-full relative z-60">
        <div class="p-6 border-b border-gray-200">
          <h3 class="font-bold text-xl text-gray-900">Ajouter un utilisateur</h3>
          <p class="text-sm text-gray-500 mt-1">Recherchez un utilisateur et assignez-lui un rôle pour cet événement.</p>
        </div>
        
        <form @submit.prevent="addUserPermission">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <!-- Left Column: User Search & Selection -->
            <div class="flex flex-col h-full">
              <input
                v-model="userSearchTerm"
                type="text"
                placeholder="Tapez un nom ou un email..."
                class="input input-bordered w-full bg-white"
              >
              <div class="mt-4 flex-grow overflow-y-auto bg-gray-50 rounded-lg p-2 min-h-[200px] border">
                <!-- Prompt to search -->
                <div v-if="!userSearchTerm" class="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg class="w-12 h-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <span class="font-medium">Commencez à taper pour rechercher.</span>
                </div>

                <!-- No results found -->
                <div v-else-if="availableUsersForAdd.length === 0" class="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg class="w-12 h-12 mb-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  <span class="font-medium">Aucun utilisateur trouvé</span>
                </div>

                <!-- Results -->
                <ul v-else class="space-y-2">
                  <li v-for="userOption in availableUsersForAdd.slice(0, 4)" :key="userOption.id">
                    <label
                      :class="['p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-colors', addUserForm.selectedUserId === userOption.id ? 'bg-primary text-primary-content shadow' : 'hover:bg-gray-200']"
                    >
                      <input v-model="addUserForm.selectedUserId" type="radio" name="selectedUser" :value="userOption.id" class="hidden">
                      <div class="avatar">
                        <div class="w-10 h-10 rounded-lg overflow-hidden">
                          <img :src="userOption.profile_picture_url" :alt="userOption.username" class="w-full h-full object-cover">
                        </div>
                      </div>
                      <div>
                        <div class="font-bold">{{ userOption.username }}</div>
                        <div class="text-xs opacity-80">{{ userOption.email }}</div>
                      </div>
                    </label>
                  </li>
                </ul>
              </div>
              <div v-if="userSearchTerm && availableUsersForAdd.length > 4" class="text-xs text-gray-500 mt-2">
                Les 4 premiers résultats sont affichés. Affinez votre recherche.
              </div>
            </div>

            <!-- Right Column: Permission Level -->
            <div class="flex flex-col">
              <div class="space-y-3">
                <div v-for="(level, key) in permissionLevels" :key="key">
                  <label :class="['p-4 rounded-lg border transition-all flex items-center gap-3', addUserForm.permissionLevel == key ? 'border-primary ring-2 ring-primary bg-base-100' : 'border-base-200', !canManageLevel(parseInt(key)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-base-200']">
                    <input 
                      v-model="addUserForm.permissionLevel"
                      type="radio" 
                      name="permissionLevel" 
                      :value="parseInt(key)" 
                      :disabled="!canManageLevel(parseInt(key))"
                      class="radio radio-primary mr-4"
                    >
                    <div>
                      <div class="font-bold text-gray-800">{{ level.name }}</div>
                      <p class="text-sm text-gray-600">{{ level.description }}</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-action p-6 bg-gray-50 border-t border-gray-200">
            <button type="button" class="btn btn-ghost" @click="closeAddModal">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="!addUserForm.selectedUserId">Ajouter la permission</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Permission Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-gray-500/30 z-50 flex items-center justify-center">
      <div class="bg-white rounded-xl shadow-xl max-w-lg w-full relative z-60 p-6">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeEditModal">✕</button>
        <h3 class="font-bold text-xl mb-2 text-gray-900">Modifier la permission</h3>
        <p class="mb-6 text-gray-600">Modification pour l'utilisateur : <strong class="font-semibold text-gray-800">{{ editForm.userName }}</strong></p>
        <form @submit.prevent="updateUserPermission">
          <div class="space-y-3 mb-6">
            <div v-for="(level, key) in permissionLevels" :key="key">
              <label :class="['p-4 rounded-lg border transition-all flex items-center gap-3', editForm.permissionLevel == key ? 'border-primary ring-2 ring-primary bg-base-100' : 'border-base-200', !canManageLevel(parseInt(key)) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary hover:bg-base-200']">
                <input 
                  v-model="editForm.permissionLevel"
                  type="radio" 
                  name="editPermissionLevel" 
                  :value="parseInt(key)" 
                  :disabled="!canManageLevel(parseInt(key))"
                  class="radio radio-primary mr-4"
                >
                <div>
                  <div class="font-bold text-gray-800">{{ level.name }}</div>
                  <p class="text-sm text-gray-600">{{ level.description }}</p>
                </div>
              </label>
            </div>
          </div>
          <div class="modal-action">
            <button type="button" class="btn btn-ghost" @click="closeEditModal">Annuler</button>
            <button type="submit" class="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Permission Modal -->
    <div v-if="showDeleteModal" class="modal modal-open">
      <div class="modal-backdrop bg-black/50" @click="closeDeleteModal" />
      <div class="modal-box bg-white">
        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" @click="closeDeleteModal">✕</button>
        <div class="text-center p-4">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 class="mt-4 font-semibold text-lg text-gray-900">Supprimer la permission</h3>
          <div class="mt-2 text-sm text-gray-600">
            <p>Êtes-vous sûr de vouloir révoquer l'accès de</p>
            <p class="font-bold my-1 text-gray-800">{{ deleteForm.userName }}</p>
            <p>à cet événement ? Cette action est irréversible.</p>
          </div>
          <div v-if="isDeleteAdmin" class="mt-4">
            <p class="text-sm text-error font-semibold mb-2">Pour confirmer la suppression d'un administrateur, veuillez saisir le nom d'utilisateur exact :</p>
            <input
              v-model="confirmDeleteInput"
              type="text"
              class="input input-bordered w-full max-w-xs mx-auto"
              :placeholder="deleteForm.userName"
            >
          </div>
        </div>
        <div class="modal-action bg-gray-50 px-6 py-4">
          <button class="btn btn-ghost" @click="closeDeleteModal">Annuler</button>
          <button class="btn btn-error" :disabled="!canConfirmDelete" @click="removeUserPermission">Oui, supprimer</button>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <AdminNotification
      v-for="notification in notifications"
      :key="notification.id"
      :type="notification.type"
      :message="notification.message"
      @close="removeNotification(notification.id)"
    />
  </div>
</template>
