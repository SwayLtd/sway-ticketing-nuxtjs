<template>
    <button v-if="!item.disabled && !(item.key === 'tickets' && ticketsEnabled !== true)" :class="[
        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left',
        getItemClasses(item)
    ]" @click="handleClick">
        <!-- Icône -->
        <component :is="getIconComponent(item.icon)" v-if="item.icon" class="h-5 w-5 mr-3 flex-shrink-0" />

        <!-- Label -->
        <span class="truncate">{{ item.label }}</span>

        <!-- Badge pour les éléments principaux -->
        <span v-if="item.isMainItem"
            class="ml-auto px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
            Main
        </span>
        <!-- Log état bouton Tickets -->
        <span v-if="item.key === 'tickets'" style="font-size:10px;color:#888;">
          [LOG] Tickets bouton actif (ticketsEnabled: {{ ticketsEnabled }})
        </span>
        <span v-if="item.key === 'tickets'" style="font-size:10px;color:#c00;">[DOM] ticketsEnabled: {{ ticketsEnabled }}</span>
    </button>

    <!-- Désactivation + tooltip pour Tickets -->
    <span v-else-if="item.key === 'tickets' && ticketsEnabled !== true"
        class="flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 text-base-content/40 cursor-not-allowed bg-transparent opacity-50 relative group"
        tabindex="-1" aria-disabled="true">
        <component :is="getIconComponent(item.icon)" v-if="item.icon" class="h-5 w-5 mr-3 flex-shrink-0" />
        <span class="truncate">{{ item.label }}</span>
        <span v-if="item.isMainItem"
            class="ml-auto px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">Main</span>
        <!-- Tooltip -->
        <span
            class="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-10 hidden group-hover:inline-block bg-base-200 text-base-content text-xs rounded px-2 py-1 shadow border border-base-300 whitespace-nowrap">
            {{ metadataLoading ? 'Chargement...' : 'Activez Sway Tickets pour accéder à cette page' }}
        </span>
        <!-- Log état bouton Tickets désactivé -->
        <span style="font-size:10px;color:#888;">
          [LOG] Tickets bouton désactivé (ticketsEnabled: {{ ticketsEnabled }}, loading: {{ metadataLoading }})
        </span>
        <span style="font-size:10px;color:#c00;">[DOM] ticketsEnabled: {{ ticketsEnabled }}</span>
    </span>

    <span v-else :class="[
        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
        getItemClasses(item)
    ]">
        <!-- Icône -->
        <component :is="getIconComponent(item.icon)" v-if="item.icon" class="h-5 w-5 mr-3 flex-shrink-0" />

        <!-- Label -->
        <span class="truncate">{{ item.label }}</span>

        <!-- Badge pour les éléments principaux -->
        <span v-if="item.isMainItem"
            class="ml-auto px-2 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-full">
            Main
        </span>
    </span>
</template>

<script setup>
import { computed, watchEffect } from 'vue'
import {
    HomeIcon,
    CogIcon,
    TicketIcon,
    ShoppingBagIcon,
    ChartBarIcon,
    QrCodeIcon,
    UsersIcon,
    Cog6ToothIcon as SettingsIcon,
    ViewColumnsIcon as DashboardIcon
} from '@heroicons/vue/24/outline'

// Props
const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    currentPath: {
        type: String,
        default: ''
    },
    ticketsEnabled: {
        type: Boolean,
        default: false // Fallback désactivé par défaut
    },
    metadataLoading: {
        type: Boolean,
        default: false
    }
})

if (props.item.key === 'tickets') {
    // eslint-disable-next-line no-console
    console.log('[SIDEBAR ITEM] ticketsEnabled:', props.ticketsEnabled)
}

// Log console à chaque rendu de l'item Tickets
watchEffect(() => {
  if (props.item.key === 'tickets') {
    // eslint-disable-next-line no-console
    console.log('[SIDEBAR ITEM] Tickets bouton', props.ticketsEnabled ? 'ACTIF' : 'DESACTIVE', '(ticketsEnabled:', props.ticketsEnabled, ')')
  }
})

// Emits
const emit = defineEmits(['click'])

// Map des icônes
const iconMap = {
    home: HomeIcon,
    dashboard: DashboardIcon,
    settings: SettingsIcon,
    cog: CogIcon,
    ticket: TicketIcon,
    'shopping-bag': ShoppingBagIcon,
    chart: ChartBarIcon,
    'qr-code': QrCodeIcon,
    users: UsersIcon
}

// Computed
const isActive = computed(() => {
    if (!props.item.path || props.item.disabled) return false
    return props.currentPath === props.item.path
})

// Méthodes
const getIconComponent = (iconName) => {
    return iconMap[iconName] || HomeIcon
}

const handleClick = () => {
    // Désactive le clic si item Tickets et ticketsEnabled false
    if ((props.item.key === 'tickets' || props.item.path?.includes('/tickets')) && !props.ticketsEnabled) return;
    if (!props.item.disabled) {
        // Navigation programmatique si on a un chemin
        if (props.item.path) {
            navigateTo(props.item.path)
        }
        emit('click')
    }
}

const getItemClasses = (item) => {
    const baseClasses = []
    // Désactive visuellement l'item Tickets si ticketsEnabled false
    if ((item.key === 'tickets' || item.path?.includes('/tickets')) && !props.ticketsEnabled) {
        baseClasses.push('text-base-content/40 cursor-not-allowed bg-transparent opacity-50')
    } else if (item.disabled) {
        baseClasses.push(
            'text-base-content/40 cursor-not-allowed bg-transparent'
        )
    } else if (isActive.value) {
        baseClasses.push(
            'bg-primary text-primary-content shadow-md'
        )
    } else if (item.isMainItem) {
        baseClasses.push(
            'bg-base-300 text-base-content border border-base-200 hover:bg-base-200'
        )
    } else {
        baseClasses.push(
            'text-base-content hover:bg-base-300 hover:text-base-content'
        )
    }
    return baseClasses.join(' ')
}
</script>
