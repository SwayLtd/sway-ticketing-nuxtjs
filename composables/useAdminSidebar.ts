interface MenuItem {
    label: string
    path: string
    icon?: string | null
    disabled?: boolean
    isMainItem?: boolean
    children?: MenuItem[] | null
}

interface CreateMenuItemParams {
    label: string
    path: string
    icon?: string | null
    disabled?: boolean
    isMainItem?: boolean
    children?: MenuItem[] | null
}

export const useAdminSidebar = () => {
    // État global pour synchroniser l'état du sidebar entre composants
    const isOpen = useState('admin-sidebar-open', () => false)

    const toggleSidebar = () => {
        isOpen.value = !isOpen.value
    }

    const closeSidebar = () => {
        isOpen.value = false
    }

    const openSidebar = () => {
        isOpen.value = true
    }

    // Utilitaire pour créer des éléments de menu standardisés
    const createMenuItem = ({
        label,
        path,
        icon = null,
        disabled = false,
        isMainItem = false,
        children = null
    }: CreateMenuItemParams): MenuItem => ({
        label,
        path,
        icon,
        disabled,
        isMainItem,
        children
    })

    // Menus prédéfinis pour les différents contextes admin
    const getAdminMenuItems = () => [
        createMenuItem({
            label: 'Dashboard',
            path: '/admin',
            icon: 'home'
        }),
        createMenuItem({
            label: 'Manage entities',
            path: '/admin/manage',
            icon: 'settings'
        })
    ]

    const getEventMenuItems = (eventId: string): MenuItem[] => [
        createMenuItem({
            label: 'Main dashboard',
            path: `/admin/event/${eventId}`,
            icon: 'dashboard',
            isMainItem: true
        }),
        createMenuItem({
            label: 'Settings',
            path: `/admin/event/${eventId}/settings`,
            icon: 'cog'
        }),
        createMenuItem({
            label: 'Tickets',
            path: `/admin/event/${eventId}/tickets`,
            icon: 'ticket'
        }),
        createMenuItem({
            label: 'Orders',
            path: `/admin/event/${eventId}/orders`,
            icon: 'shopping-bag'
        }),
        createMenuItem({
            label: 'Insights',
            path: '',
            icon: 'chart',
            disabled: true
        }),
        createMenuItem({
            label: 'Scanners',
            path: `/admin/event/${eventId}/scanners`,
            icon: 'qr-code'
        }),
        createMenuItem({
            label: 'Permissions',
            path: `/admin/event/${eventId}/permissions`,
            icon: 'users'
        })
    ]

    return {
        isOpen,
        toggleSidebar,
        closeSidebar,
        openSidebar,
        createMenuItem,
        getAdminMenuItems,
        getEventMenuItems
    }
}
