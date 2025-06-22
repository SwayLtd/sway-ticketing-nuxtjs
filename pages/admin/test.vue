<template>
  <div class="min-h-screen bg-gray-100">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Test des Notifications Admin</h1>
        <p class="text-gray-600">Page de test pour tester le système de notifications dans l'interface admin.</p>
      </div>

      <!-- Test Buttons -->
      <div class="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-5 bg-gray-50">
          <h2 class="text-xl font-semibold text-gray-900">Tester les Notifications</h2>
        </div>
        
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Success Notification -->
            <button
              class="flex items-center justify-center px-4 py-3 border border-green-300 rounded-lg shadow-sm bg-white text-sm font-medium text-green-700 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
              @click="showNotification('success', 'Opération réussie !', 'Votre action a été effectuée avec succès.')"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Succès
            </button>

            <!-- Error Notification -->
            <button
              class="flex items-center justify-center px-4 py-3 border border-red-300 rounded-lg shadow-sm bg-white text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              @click="showNotification('error', 'Erreur survenue', 'Une erreur inattendue s\'est produite lors de l\'opération.')"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Erreur
            </button>

            <!-- Warning Notification -->
            <button
              class="flex items-center justify-center px-4 py-3 border border-yellow-300 rounded-lg shadow-sm bg-white text-sm font-medium text-yellow-700 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
              @click="showNotification('warning', 'Attention requise', 'Cette action nécessite votre attention avant de continuer.')"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833-.23 2.5 1.732 2.5z" />
              </svg>
              Test Avertissement
            </button>

            <!-- Info Notification -->
            <button
              class="flex items-center justify-center px-4 py-3 border border-blue-300 rounded-lg shadow-sm bg-white text-sm font-medium text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              @click="showNotification('info', 'Information', 'Voici une information utile pour vous.')"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test Info
            </button>
          </div>

          <!-- Advanced Tests -->
          <div class="pt-6 border-t border-gray-200">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Tests Avancés</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                @click="showNotification('success', 'Notification sans description')"
              >
                Sans description
              </button>

              <button
                class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                @click="showNotification('info', 'Notification persistante', 'Cette notification ne disparaît pas automatiquement.', 0)"
              >
                Persistante (durée = 0)
              </button>

              <button
                class="flex items-center justify-center px-4 py-3 border border-purple-300 rounded-lg shadow-sm bg-white text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200"
                @click="showMultipleNotifications"
              >
                Notifications multiples
              </button>

              <button
                class="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                @click="showNotification('error', 'Message très long pour tester l\'affichage', 'Ceci est une description très longue pour tester comment le composant de notification se comporte avec beaucoup de texte et voir si l\'affichage reste correct dans tous les cas.')"
              >
                Texte long
              </button>
            </div>
          </div>

          <!-- Clear All Button -->
          <div class="pt-6 border-t border-gray-200">
            <button
              class="flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
              @click="clearAllNotifications"
            >
              <svg class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Effacer toutes les notifications
            </button>
          </div>
        </div>
      </div>

      <!-- Documentation -->
      <div class="mt-8 bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
        <div class="px-6 py-5 bg-gray-50">
          <h2 class="text-xl font-semibold text-gray-900">Documentation du Composant</h2>
        </div>
        
        <div class="p-6">
          <div class="prose max-w-none">
            <h3 class="text-lg font-medium text-gray-900 mb-3">Utilisation du composant AdminNotification</h3>
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <pre class="text-sm text-gray-800"><code>&lt;AdminNotification
  :type="'success' | 'error' | 'warning' | 'info'"
  :message="string"
  :description="string (optionnel)"
  :duration="number (ms, défaut: 5000, 0 = persistant)"
  @close="handleClose"
/&gt;</code></pre>
            </div>
            
            <h4 class="text-md font-medium text-gray-900 mb-2">Propriétés :</h4>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700 mb-4">
              <li><code>type</code> : Type de notification (success, error, warning, info)</li>
              <li><code>message</code> : Message principal de la notification</li>
              <li><code>description</code> : Description optionnelle plus détaillée</li>
              <li><code>duration</code> : Durée d'affichage en millisecondes (0 = persistant)</li>
            </ul>

            <h4 class="text-md font-medium text-gray-900 mb-2">Événements :</h4>
            <ul class="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li><code>@close</code> : Émis quand la notification est fermée</li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications -->
    <div class="fixed top-4 right-4 z-50 space-y-2">
      <AdminNotification 
        v-for="notification in notifications" 
        :key="notification.id"
        :type="notification.type" 
        :message="notification.message"
        :description="notification.description"
        :duration="notification.duration"
        @close="removeNotification(notification.id)" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AdminNotification from '~/components/admin/AdminNotification.vue'

definePageMeta({
  layout: 'admin'
})

const notifications = ref([])

function showNotification(type, message, description = null, duration = 5000) {
  const id = Date.now() + Math.random()
  notifications.value.push({
    id,
    type,
    message,
    description,
    duration
  })
}

function showMultipleNotifications() {
  const types = ['success', 'error', 'warning', 'info']
  const messages = [
    'Première notification',
    'Deuxième notification', 
    'Troisième notification',
    'Quatrième notification'
  ]
  
  types.forEach((type, index) => {
    setTimeout(() => {
      showNotification(type, messages[index], `Description ${index + 1}`)
    }, index * 500)
  })
}

function removeNotification(id) {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

function clearAllNotifications() {
  notifications.value = []
}
</script>
