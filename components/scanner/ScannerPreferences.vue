<template>
  <div class="scanner-preferences bg-white rounded-lg shadow-sm border p-4 mb-4">
    <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Préférences
    </h3>

    <div class="space-y-3">
      <!-- Option vibration -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 18.5c3.5 0 6.5-2.5 6.5-6s-3-6.5-6.5-6.5S5.5 9 5.5 12.5s3 6 6.5 6z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 12h.01M12 8v8M16 12h.01" />
          </svg>
          <div>
            <span class="font-medium text-gray-800">Vibration</span>
            <p class="text-sm text-gray-600">Feedback haptique lors des scans</p>
          </div>
        </div>
        <button
          @click="toggleVibration"
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            vibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
          ]"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
              vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>

      <!-- Option son -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 21H7a2 2 0 01-2-2V5a2 2 0 012-2h2l3.64 2.36a1 1 0 01.36.84v11.6a1 1 0 01-.36.84L9 21z" />
          </svg>
          <div>
            <span class="font-medium text-gray-800">Son</span>
            <p class="text-sm text-gray-600">Feedback sonore lors des scans</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <!-- Bouton test sons -->
          <button
            v-if="soundEnabled"
            @click="testSounds"
            class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="Tester les sons"
          >
            Test
          </button>
          <!-- Toggle son -->
          <button
            @click="toggleSound"
            :class="[
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
            ]"
          >
            <span
              :class="[
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
                soundEnabled ? 'translate-x-6' : 'translate-x-1'
              ]"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Légende des sons -->
    <div v-if="soundEnabled" class="mt-4 p-3 bg-blue-50 rounded-lg">
      <h4 class="text-sm font-medium text-blue-800 mb-2">Signification des sons :</h4>
      <div class="text-xs text-blue-700 space-y-1">
        <div>• <strong>Détection :</strong> Bip court (QR code détecté)</div>
        <div>• <strong>Succès :</strong> Double bip ascendant (ticket valide)</div>
        <div>• <strong>Avertissement :</strong> Bip modulé (ticket déjà scanné)</div>
        <div>• <strong>Erreur :</strong> Triple bip descendant (ticket invalide)</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useScannerSound } from '~/composables/useScannerSound'

interface Props {
  vibrationEnabled: boolean
}

interface Emits {
  (e: 'toggle-vibration'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composable pour le son
const { soundEnabled, toggleSound, testSounds } = useScannerSound()

// Toggle vibration
const toggleVibration = () => {
  emit('toggle-vibration')
}
</script>
