<template>
    <button v-if="!item.disabled" :class="[
        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full text-left',
        getItemClasses(item)
    ]" @click="handleClick">
        <!-- Icône -->
        <component v-if="item.icon" :is="getIconComponent(item.icon)" class="h-5 w-5 mr-3 flex-shrink-0" />

        <!-- Label -->
        <span class="truncate">{{ item.label }}</span>

        <!-- Badge pour les éléments principaux -->
        <span v-if="item.isMainItem"
            class="ml-auto px-2 py-1 text-xs font-semibold bg-gray-700 text-gray-300 rounded-full">
            Main
        </span>
    </button>

    <span v-else :class="[
        'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
        getItemClasses(item)
    ]">
        <!-- Icône -->
        <component v-if="item.icon" :is="getIconComponent(item.icon)" class="h-5 w-5 mr-3 flex-shrink-0" />

        <!-- Label -->
        <span class="truncate">{{ item.label }}</span>

        <!-- Badge pour les éléments principaux -->
        <span v-if="item.isMainItem"
            class="ml-auto px-2 py-1 text-xs font-semibold bg-gray-700 text-gray-300 rounded-full">
            Main
        </span>
    </span>
</template>

<script setup>
import { computed } from 'vue'
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

    if (item.disabled) {
        baseClasses.push(
            'text-gray-500 cursor-not-allowed bg-transparent'
        )
    } else if (isActive.value) {
        baseClasses.push(
            'bg-blue-600 text-white shadow-md'
        )
    } else if (item.isMainItem) {
        baseClasses.push(
            'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
        )
    } else {
        baseClasses.push(
            'text-gray-300 hover:bg-gray-800 hover:text-white'
        )
    }

    return baseClasses.join(' ')
}
</script>
