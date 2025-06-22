<template>
  <div class="scanner-preferences bg-white rounded-lg shadow-sm border p-4 mb-4">
    <h3 class="text-lg font-semibold text-gray-800 mb-3 flex items-center">
      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Preferences
    </h3>

    <div class="space-y-3">
      <!-- Vibration option -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 18.5c3.5 0 6.5-2.5 6.5-6s-3-6.5-6.5-6.5S5.5 9 5.5 12.5s3 6 6.5 6z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 8v8M16 12h.01" />
          </svg>
          <div>
            <span class="font-medium text-gray-800">Vibration</span>
            <p class="text-sm text-gray-600">Haptic feedback on scans</p>
          </div>
        </div>
        <button
:class="[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          localVibrationEnabled ? 'bg-blue-600' : 'bg-gray-200'
        ]" @click="toggleVibration">
          <span
:class="[
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
            localVibrationEnabled ? 'translate-x-6' : 'translate-x-1'
          ]" />
        </button>
      </div>

      <!-- Sound option -->
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div class="flex items-center">
          <svg class="w-5 h-5 text-gray-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 21H7a2 2 0 01-2-2V5a2 2 0 012-2h2l3.64 2.36a1 1 0 01.36.84v11.6a1 1 0 01-.36.84L9 21z" />
          </svg>
          <div>
            <span class="font-medium text-gray-800">Sound</span>
            <p class="text-sm text-gray-600">Sound feedback on scans</p>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <!-- Test sounds button -->
          <button
v-if="soundEnabled" class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            title="Test sounds"
            @click="testSounds">
            Test
          </button>
          <!-- Sound toggle -->
          <button
:class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
          ]" @click="toggleSound">
            <span
:class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out',
              soundEnabled ? 'translate-x-6' : 'translate-x-1'
            ]" />
          </button>
        </div>
      </div>
    </div>

    <!-- Sound legend -->
    <div v-if="soundEnabled" class="mt-4 p-3 bg-blue-50 rounded-lg">
      <h4 class="text-sm font-medium text-blue-800 mb-2">Sound meanings:</h4>
      <div class="text-xs text-blue-700 space-y-1">
        <div>• <strong>Detection:</strong> Short beep (QR code detected)</div>
        <div>• <strong>Success:</strong> Double ascending beep (valid ticket)</div>
        <div>• <strong>Warning:</strong> Modulated beep (ticket already scanned)</div>
        <div>• <strong>Error:</strong> Triple descending beep (invalid ticket)</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { soundEnabled as sharedSoundEnabled, useScannerSound } from '~/composables/useScannerSound'

interface Props {
  vibrationEnabled?: boolean // Make optional for default
}

interface Emits {
  (e: 'toggle-vibration'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composable pour le son
const { toggleSound, testSounds, initAudioContext } = useScannerSound()

// Use the shared global soundEnabled for reactivity
const soundEnabled = sharedSoundEnabled

// Set default to false if not provided
const localVibrationEnabled = ref(props.vibrationEnabled === true)

// Watch for prop changes (if parent updates)
watch(() => props.vibrationEnabled, (val) => {
  if (val !== undefined) localVibrationEnabled.value = val
})

// Toggle vibration
const toggleVibration = () => {
  localVibrationEnabled.value = !localVibrationEnabled.value
  emit('toggle-vibration')
  // Test vibration on enable (for mobile browser unlock)
  if (import.meta.client && localVibrationEnabled.value && 'vibrate' in navigator) {
    try {
      navigator.vibrate(100)
    } catch (e) {
      // ignore
    }
  }
}

// Initialize audio context on component mount
onMounted(() => {
  if (import.meta.client) {
    initAudioContext()
  }
})
</script>
