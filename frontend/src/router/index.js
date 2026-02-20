import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/pages/LoginPage.vue'),
        meta: { guest: true }
    },
    {
        path: '/',
        name: 'Dashboard',
        component: () => import('@/pages/ChatDashboard.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/network',
        name: 'Network',
        component: () => import('@/pages/NetworkDiscovery.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/admin/users',
        name: 'AdminUsers',
        component: () => import('@/pages/AdminUsers.vue'),
        meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
        path: '/settings',
        name: 'Settings',
        component: () => import('@/pages/ProfileSettings.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore()

    // Wait for auth check if not done
    if (!authStore.initialized) {
        await authStore.checkAuth()
    }

    const isAuthenticated = authStore.isAuthenticated
    const isAdmin = authStore.user?.role === 'admin'

    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'Login' })
    } else if (to.meta.guest && isAuthenticated) {
        next({ name: 'Dashboard' })
    } else if (to.meta.requiresAdmin && !isAdmin) {
        next({ name: 'Dashboard' })
    } else {
        next()
    }
})

export default router
