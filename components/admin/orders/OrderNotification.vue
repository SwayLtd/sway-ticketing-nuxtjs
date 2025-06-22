<template>
    <div
v-if="show" :class="[
        'fixed top-4 right-4 z-50 max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 transform transition-all duration-300 ease-in-out',
        show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    ]">
        <div class="p-4">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg
v-if="type === 'success'" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg
v-else-if="type === 'error'" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <svg v-else class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div class="ml-3 w-0 flex-1">
                    <p
:class="[
                        'text-sm font-medium',
                        type === 'success' ? 'text-green-900' : type === 'error' ? 'text-red-900' : 'text-blue-900'
                    ]">
                        {{ message }}
                    </p>
                </div>
                <div class="ml-4 flex-shrink-0 flex">
                    <button
class="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        @click="hide">
                        <span class="sr-only">Fermer</span>
                        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path
fill-rule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
interface Props {
    type: 'success' | 'error' | 'info'
    message: string
    duration?: number
}

const props = withDefaults(defineProps<Props>(), {
    duration: 5000
})

const emit = defineEmits(['close'])

const show = ref(true)

let timeoutId: NodeJS.Timeout

onMounted(() => {
    if (props.duration > 0) {
        timeoutId = setTimeout(() => {
            hide()
        }, props.duration)
    }
})

onUnmounted(() => {
    if (timeoutId) {
        clearTimeout(timeoutId)
    }
})

function hide() {
    show.value = false
    setTimeout(() => {
        emit('close')
    }, 300) // Wait for animation to complete
}
</script>
