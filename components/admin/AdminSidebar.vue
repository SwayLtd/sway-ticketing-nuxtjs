<template>
    <div> <!-- Bouton burger (mobile uniquement) - fixé à gauche, toujours visible -->
        <div class="lg:hidden">
            <!-- Bouton burger fixe en bas à gauche, par-dessus le contenu -->
            <div class="fixed bottom-6 left-6 z-50">
                <button @click="toggleSidebar"
                    class="bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-full p-4 shadow-lg transition-colors duration-200"
                    :aria-label="isOpen ? 'Fermer le menu' : 'Ouvrir le menu'">
                    <Transition enter-active-class="transition-transform duration-200 ease-in-out"
                        leave-active-class="transition-transform duration-200 ease-in-out"
                        enter-from-class="rotate-90 scale-0" enter-to-class="rotate-0 scale-100"
                        leave-from-class="rotate-0 scale-100" leave-to-class="rotate-90 scale-0" mode="out-in">
                        <Bars3Icon v-if="!isOpen" class="h-6 w-6" key="burger" />
                        <XMarkIcon v-else class="h-6 w-6" key="close" />
                    </Transition>
                </button>
            </div>
        </div>

        <!-- Bouton burger desktop - fixé en haut à gauche -->
        <div class="hidden lg:block">
            <div class="fixed top-6 left-6 z-50">
                <button @click="toggleSidebar"
                    class="bg-gray-800 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 rounded-lg p-3 shadow-lg transition-colors duration-200"
                    aria-label="Toggle menu">
                    <Bars3Icon class="h-5 w-5" />
                </button>
            </div>
        </div> <!-- Overlay (mobile ET desktop) -->
        <Transition enter-active-class="transition-opacity ease-linear duration-300" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition-opacity ease-linear duration-300"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="isOpen" class="fixed inset-0 z-40 bg-gray-600 bg-opacity-75" @click="closeSidebar" />
        </Transition> <!-- Sidebar -->
        <Transition enter-active-class="transition ease-in-out duration-300 transform"
            enter-from-class="-translate-x-full" enter-to-class="translate-x-0"
            leave-active-class="transition ease-in-out duration-300 transform" leave-from-class="translate-x-0"
            leave-to-class="-translate-x-full">
            <aside v-if="isOpen"
                class="fixed inset-y-0 left-0 z-45 w-full bg-gray-900 text-white overflow-y-auto lg:w-80"
                @keydown.esc="closeSidebar"> <!-- Header desktop avec bouton fermer -->
                <div class="hidden lg:block p-6 border-b border-gray-700">
                    <div class="flex items-center justify-between">
                        <h1 v-if="title" class="text-xl font-bold text-white">{{ title }}</h1>
                        <button @click="closeSidebar"
                            class="text-gray-400 hover:text-white transition-colors duration-200"
                            aria-label="Fermer le menu">
                            <XMarkIcon class="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <!-- Header mobile avec titre uniquement -->
                <div class="lg:hidden p-4 border-b border-gray-700">
                    <h2 v-if="title" class="text-lg font-semibold text-white text-center">{{ title }}</h2>
                </div> <!-- Navigation -->
                <nav class="p-4 flex-1">
                    <ul class="space-y-2">
                        <li v-for="item in menuItems" :key="item.path || item.label">
                            <AdminSidebarItem :item="item" :current-path="currentPath" @click="handleItemClick" />
                        </li>
                    </ul>
                </nav>
            </aside>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
    menuItems: {
        type: Array,
        required: true,
        default: () => []
    },
    title: {
        type: String,
        default: ''
    },
    currentPath: {
        type: String,
        default: ''
    }
})

// État réactif
const isOpen = ref(false)
const screenWidth = ref(0)

// Computed
const isMobile = computed(() => screenWidth.value < 1024)

// Méthodes
const toggleSidebar = () => {
    isOpen.value = !isOpen.value
}

const closeSidebar = () => {
    isOpen.value = false
}

const handleItemClick = () => {
    // Fermer le menu après clic sur un élément
    closeSidebar()
}

const updateScreenWidth = () => {
    screenWidth.value = window.innerWidth
}

const handleKeydown = (event) => {
    if (event.key === 'Escape' && isOpen.value) {
        closeSidebar()
    }
}

// Lifecycle
onMounted(() => {
    updateScreenWidth()
    window.addEventListener('resize', updateScreenWidth)
    document.addEventListener('keydown', handleKeydown)

    // La sidebar commence toujours fermée pour une expérience cohérente
    isOpen.value = false
})

onUnmounted(() => {
    window.removeEventListener('resize', updateScreenWidth)
    document.removeEventListener('keydown', handleKeydown)
})
</script>
