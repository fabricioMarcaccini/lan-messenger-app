import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from './auth'

export const useUsersStore = defineStore('users', () => {
    const users = ref([])
    const pagination = ref({ page: 1, limit: 20, total: 0 })
    const loading = ref(false)
    const stats = ref({ totalUsers: 0, activeUsers: 0, messagesToday: 0, networkDevices: 0 })

    async function fetchUsers(page = 1, search = '') {
        loading.value = true

        try {
            const response = await api.get('/users', {
                params: { page, limit: pagination.value.limit, search }
            })
            users.value = response.data.data.users
            pagination.value = response.data.data.pagination
        } catch (err) {
            console.error('Failed to fetch users:', err)
        } finally {
            loading.value = false
        }
    }

    async function createUser(userData) {
        try {
            // Note: If creating a regular user via admin panel, using /users endpoint
            // If self-registration, use authStore.register()
            const response = await api.post('/users', userData)
            await fetchUsers()
            return { success: true, data: response.data.data }
        } catch (err) {
            return { success: false, message: err.response?.data?.message }
        }
    }

    async function updateUser(userId, userData) {
        try {
            const response = await api.put(`/users/${userId}`, userData)
            // Refresh the users list to get updated data
            await fetchUsers(pagination.value.page)
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('Failed to update user:', err)
            return { success: false, message: err.response?.data?.message || 'Erro ao atualizar usuário' }
        }
    }

    async function deleteUser(userId) {
        try {
            await api.delete(`/users/${userId}`)
            users.value = users.value.filter(u => u.id !== userId)
            return { success: true }
        } catch (err) {
            return { success: false, message: err.response?.data?.message }
        }
    }

    async function fetchStats(companyId) {
        try {
            const response = await api.get(`/companies/${companyId}/stats`)
            stats.value = response.data.data
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        }
    }

    return {
        users,
        pagination,
        loading,
        stats,
        fetchUsers,
        createUser,
        updateUser,
        deleteUser,
        fetchStats,
    }
})
