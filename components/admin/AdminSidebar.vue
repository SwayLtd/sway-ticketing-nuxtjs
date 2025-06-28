<template>
    <div> <!-- Bouton burger (mobile uniquement) - fixé à gauche, toujours visible -->
        <div class="lg:hidden">
            <!-- Bouton burger fixe en bas à gauche, par-dessus le contenu -->
            <div class="fixed bottom-6 left-6 z-50">
                <button
                    class="btn btn-square btn-ghost bg-base-100 text-base-content border border-base-200 hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg transition-colors duration-200"
                    :aria-label="isOpen ? 'Fermer le menu' : 'Ouvrir le menu'" @click="toggleSidebar">
                    <Transition enter-active-class="transition-transform duration-200 ease-in-out"
                        leave-active-class="transition-transform duration-200 ease-in-out"
                        enter-from-class="rotate-90 scale-0" enter-to-class="rotate-0 scale-100"
                        leave-from-class="rotate-0 scale-100" leave-to-class="rotate-90 scale-0" mode="out-in">
                        <Bars3Icon v-if="!isOpen" key="burger" class="h-6 w-6" />
                        <XMarkIcon v-else key="close" class="h-6 w-6" />
                    </Transition>
                </button>
            </div>
        </div>

        <!-- Bouton burger desktop - fixé en haut à gauche -->
        <div class="hidden lg:block">
            <div class="fixed top-6 left-6 z-50">
                <button
                    class="btn btn-square btn-ghost bg-base-100 text-base-content border border-base-200 hover:bg-base-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 shadow-lg transition-colors duration-200"
                    aria-label="Toggle menu" @click="toggleSidebar">
                    <Bars3Icon class="h-5 w-5" />
                </button>
            </div>
        </div> <!-- Overlay (mobile ET desktop) -->
        <Transition enter-active-class="transition-opacity ease-linear duration-300" enter-from-class="opacity-0"
            enter-to-class="opacity-100" leave-active-class="transition-opacity ease-linear duration-300"
            leave-from-class="opacity-100" leave-to-class="opacity-0">
            <div v-if="isOpen" class="fixed inset-0 z-40 bg-gray-500/30" @click="closeSidebar" />
        </Transition> <!-- Sidebar -->
        <Transition enter-active-class="transition ease-in-out duration-300 transform"
            enter-from-class="-translate-x-full" enter-to-class="translate-x-0"
            leave-active-class="transition ease-in-out duration-300 transform" leave-from-class="translate-x-0"
            leave-to-class="-translate-x-full">
            <aside v-if="isOpen"
                class="fixed inset-y-0 left-0 z-45 w-full bg-base-100 text-base-content overflow-y-auto lg:w-80 flex flex-col"
                @keydown.esc="closeSidebar"> <!-- Header desktop avec bouton fermer -->
                <div class="hidden lg:block p-6 border-b border-base-200">
                    <div class="flex items-center justify-between">
                        <h1 v-if="title" class="text-xl font-bold">{{ title }}</h1>
                        <button class="text-base-content/60 hover:text-base-content transition-colors duration-200"
                            aria-label="Fermer le menu" @click="closeSidebar">
                            <XMarkIcon class="h-6 w-6" />
                        </button>
                    </div>
                </div>

                <!-- Header mobile avec titre uniquement -->
                <div class="lg:hidden p-4 border-b border-base-200">
                    <h2 v-if="title" class="text-lg font-semibold text-center">{{ title }}</h2>
                </div> <!-- Navigation -->
                <nav class="p-4 flex-1">
                    <ul class="space-y-2">
                        <li v-for="item in localMenuItems" :key="item.path || item.label">
                            <template v-if="item.label && item.label.toLowerCase() === 'insights'">
                              <div class="tooltip tooltip-bottom w-full" data-tip="This feature will be available soon.">
                                <div>
                                  <AdminSidebarItem :item="item" :current-path="currentPath" @click="handleItemClick" />
                                </div>
                              </div>
                            </template>
                            <template v-else>
                              <AdminSidebarItem :item="item" :current-path="currentPath" @click="handleItemClick" />
                            </template>
                        </li>
                    </ul>
                </nav>
                <!-- Log out button collé en bas -->
                <div class="w-full px-4 pb-6 mt-auto">
                    <button aria-label="Log out"
                        class="btn btn-ghost w-full text-error border-none bg-transparent hover:bg-error/10 focus:bg-error/20 focus:outline-none"
                        @click="logout">
                        Log out
                    </button>
                </div>
            </aside>
        </Transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bars3Icon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useSupabaseClient, useRoute, navigateTo } from '#imports'

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
const supabase = useSupabaseClient()
const route = useRoute()
const eventId = computed(() => {
  // Cherche un id dans l'URL du type /admin/event/:id
  const match = route.path.match(/\/admin\/event\/(\d+)/)
  return match ? match[1] : null
})
const eventMetadata = ref(null)
const loadingMetadata = ref(false)

// Copie réactive du menu pour pouvoir le modifier dynamiquement
const localMenuItems = ref(props.menuItems ? JSON.parse(JSON.stringify(props.menuItems)) : [])

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

const logout = async () => {
    const supabase = useSupabaseClient()
    const { error } = await supabase.auth.signOut()
    if (!error) {
        const currentUrl = window.location.pathname + window.location.search
        await navigateTo(`/login?redirect=${encodeURIComponent(currentUrl)}`)
    }
}

async function fetchEventMetadata() {
  if (!eventId.value) return
  loadingMetadata.value = true
  const { data, error } = await supabase
    .from('events')
    .select('metadata')
    .eq('id', eventId.value)
    .single()
  if (error) {
    eventMetadata.value = null
  } else {
    eventMetadata.value = data?.metadata || null
  }
  loadingMetadata.value = false
  updateTicketsMenuItem()
}

function updateTicketsMenuItem() {
  // Cherche l'item Tickets et désactive si sway_tickets absent ou false
  if (!localMenuItems.value) return
  const meta = eventMetadata.value
  const found = localMenuItems.value.find(item => item.label && item.label.toLowerCase() === 'tickets')
  if (found) {
    if (!meta || meta.sway_tickets !== true) {
      found.disabled = true
    } else {
      found.disabled = false
    }
  }
}

// Lifecycle
onMounted(() => {
    updateScreenWidth()
    window.addEventListener('resize', updateScreenWidth)
    document.addEventListener('keydown', handleKeydown)

    // La sidebar commence toujours fermée pour une expérience cohérente
    isOpen.value = false

    // Si on est sur une page event, charger la metadata pour gérer Tickets
    if (eventId.value) {
      fetchEventMetadata()
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', updateScreenWidth)
    document.removeEventListener('keydown', handleKeydown)
})
</script>