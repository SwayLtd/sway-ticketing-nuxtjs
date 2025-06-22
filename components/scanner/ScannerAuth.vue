<template>
    <div class="scanner-auth max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-lg">
        <div class="text-center mb-6">
            <h1 class="text-2xl font-bold text-gray-900 mb-2">Sway Scanner</h1>
            <p class="text-gray-600">Authenticate to start scanning</p>
        </div>

        <!-- Automatic authentication (URL with token) -->
        <div v-if="hasUrlParams" class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"/>
            <p class="mt-4 text-gray-600">Authenticating...</p>
        </div>

        <!-- Manual authentication form -->
        <form v-else class="space-y-4" @submit.prevent="authenticate">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Event ID
                </label>
                <input
v-model="form.eventId" type="number" required placeholder="Ex: 123"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" >
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Authentication Type
                </label>
                <select
v-model="authType"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="token">Scanner Token</option>
                    <option value="user">User Account</option>
                </select>
            </div>

            <!-- Token-based authentication -->
            <div v-if="authType === 'token'">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                    Authentication Token
                </label>
                <input
v-model="form.authToken" type="text" required placeholder="Scanner token"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" >
            </div>

            <!-- User-based authentication -->
            <div v-if="authType === 'user'" class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Email
                    </label>
                    <input
v-model="form.email" type="email" required placeholder="your@email.com"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" >
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                        Password
                    </label>
                    <input
v-model="form.password" type="password" required placeholder="••••••••"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" >
                </div>
            </div>

            <!-- Error message -->
            <div v-if="errorMessage" class="bg-red-50 border border-red-200 rounded-md p-3">
                <p class="text-sm text-red-600">{{ errorMessage }}</p>
            </div>

            <!-- Login button -->
            <button
type="submit" :disabled="loading || !canSubmit"
                class="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors">
                {{ loading ? 'Authenticating...' : 'Connect' }}
            </button>
        </form>

        <!-- Instructions -->
        <div class="mt-6 text-center">
            <details class="text-sm text-gray-500">
                <summary class="cursor-pointer hover:text-gray-700">
                    Need help?
                </summary>
                <div class="mt-2 text-left space-y-2">
                    <p><strong>Token Scan:</strong> Use the link provided by the organizer</p>
                    <p><strong>User Scan:</strong> Log in with your Sway account</p>
                    <p><strong>Problem?</strong> Contact the event organizer</p>
                </div>
            </details>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'

const emit = defineEmits(['authenticated'])

// State
const loading = ref(false)
const errorMessage = ref('')
const authType = ref('token')
const hasUrlParams = ref(false)

const form = reactive({
    eventId: '',
    authToken: '',
    email: '',
    password: '',
    userId: null
})

// Computed
const canSubmit = computed(() => {
    if (!form.eventId) return false

    if (authType.value === 'token') {
        return !!form.authToken
    } else if (authType.value === 'user') {
        return !!form.email && !!form.password
    }

    return false
})

// Methods
const authenticate = async () => {
    try {
        loading.value = true
        errorMessage.value = ''

        let authData

        if (authType.value === 'token') {
            authData = {
                eventId: form.eventId,
                authToken: form.authToken
            }
        } else {
            // TODO: Authenticate the user first, then retrieve their ID
            authData = {
                eventId: form.eventId,
                userId: form.userId // Will be set after user auth
            }
        }

        emit('authenticated', authData)
    } catch (error) {
        errorMessage.value = error.message || 'Authentication error'
    } finally {
        loading.value = false
    }
}

// Check URL parameters on mount
onMounted(() => {
    const route = useRoute()

    if (route.query.event_id && route.query.auth_token) {
        hasUrlParams.value = true
        form.eventId = route.query.event_id
        form.authToken = route.query.auth_token

        // Attempting automatic authentication
        setTimeout(() => {
            authenticate()
        }, 1000)
    } else if (route.query.event_id) {
        form.eventId = route.query.event_id
    }
})
</script>

<style scoped>
/* Loader animations */
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.animate-spin {
    animation: spin 1s linear infinite;
}

/* Prevent zoom on mobile */
input {
    font-size: 16px;
}

/* Custom focus styles */
input:focus,
select:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
</style>
