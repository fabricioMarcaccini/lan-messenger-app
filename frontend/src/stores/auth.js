import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const API_URL = import.meta.env.PROD ? 'https://lan-messenger-backend.onrender.com/api' : '/api'

// Export axios instance directly
export const api = axios.create({ baseURL: API_URL })

api.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem('accessToken')
    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
        if (import.meta.env.DEV) {
            console.debug('🔑 [API] Attaching token to request:', config.url)
        }
    } else {
        if (import.meta.env.DEV) {
            console.warn('⚠️ [API] No token found for request:', config.url)
        }
    }
    return config
})

// Flag to prevent multiple refresh attempts
let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(callback) {
    refreshSubscribers.push(callback)
}

function onTokenRefreshed(newToken) {
    refreshSubscribers.forEach(callback => callback(newToken))
    refreshSubscribers = []
}

api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            console.error('❌ [API] 401 Unauthorized:', error.config.url)

            // Skip refresh for login/register/refresh endpoints
            if (originalRequest.url.includes('/auth/login') ||
                originalRequest.url.includes('/auth/register') ||
                originalRequest.url.includes('/auth/refresh')) {
                return Promise.reject(error)
            }

            const refreshTokenValue = localStorage.getItem('refreshToken')

            if (refreshTokenValue && !isRefreshing) {
                isRefreshing = true
                originalRequest._retry = true

                try {
                    // Use api instance with baseURL already configured
                    const response = await axios.create({ baseURL: API_URL }).post('/auth/refresh', {
                        refreshToken: refreshTokenValue
                    })

                    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data

                    // Save new tokens
                    localStorage.setItem('accessToken', newAccessToken)
                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken)
                    }

                    if (import.meta.env.DEV) {
                        console.log('🔄 Token refreshed successfully')
                    }

                    // Update default header for future requests
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`

                    onTokenRefreshed(newAccessToken)
                    isRefreshing = false

                    // Create a new config with updated headers
                    const newConfig = {
                        ...originalRequest,
                        headers: {
                            ...originalRequest.headers,
                            Authorization: `Bearer ${newAccessToken}`
                        }
                    }

                    return api.request(newConfig)
                } catch (refreshError) {
                    console.error('❌ Token refresh failed, redirecting to login')
                    isRefreshing = false
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    window.location.href = '/login'
                    return Promise.reject(refreshError)
                }
            } else if (isRefreshing) {
                // Wait for token refresh to complete
                return new Promise(resolve => {
                    subscribeTokenRefresh(newToken => {
                        const newConfig = {
                            ...originalRequest,
                            headers: {
                                ...originalRequest.headers,
                                Authorization: `Bearer ${newToken}`
                            }
                        }
                        resolve(api.request(newConfig))
                    })
                })
            } else {
                // No refresh token, redirect to login
                localStorage.removeItem('accessToken')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const accessToken = ref(localStorage.getItem('accessToken') || null)
    const refreshToken = ref(localStorage.getItem('refreshToken') || null)
    const initialized = ref(false)
    const loading = ref(false)
    const error = ref(null)

    const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')

    async function login(username, password) {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/login', { username, password })
            const { data } = response.data

            user.value = data.user
            accessToken.value = data.accessToken
            refreshToken.value = data.refreshToken

            localStorage.setItem('accessToken', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao fazer login'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    async function register(userData) {
        loading.value = true
        error.value = null

        try {
            const response = await api.post('/auth/register', userData)
            const { data } = response.data

            user.value = data.user
            accessToken.value = data.accessToken
            refreshToken.value = data.refreshToken

            localStorage.setItem('accessToken', data.accessToken)
            localStorage.setItem('refreshToken', data.refreshToken)

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao criar conta'
            return { success: false, message: error.value }
        } finally {
            loading.value = false
        }
    }

    async function logout() {
        try {
            await api.post('/auth/logout')
        } catch (e) {
            // Ignore logout errors
        }

        user.value = null
        accessToken.value = null
        refreshToken.value = null
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
    }

    async function checkAuth() {
        if (!accessToken.value) {
            initialized.value = true
            return
        }

        try {
            const response = await api.get('/auth/me')
            user.value = response.data.data
        } catch (err) {
            // Try refresh token
            if (refreshToken.value) {
                try {
                    const refreshResponse = await api.post('/auth/refresh', {
                        refreshToken: refreshToken.value
                    })

                    accessToken.value = refreshResponse.data.data.accessToken
                    refreshToken.value = refreshResponse.data.data.refreshToken
                    localStorage.setItem('accessToken', accessToken.value)
                    localStorage.setItem('refreshToken', refreshToken.value)

                    const meResponse = await api.get('/auth/me')
                    user.value = meResponse.data.data
                } catch (e) {
                    await logout()
                }
            } else {
                await logout()
            }
        }

        initialized.value = true
    }

    async function updateProfile(data) {
        try {
            const response = await api.put(`/users/${user.value.id}`, data)
            user.value = { ...user.value, ...response.data.data }
            return { success: true }
        } catch (err) {
            return { success: false, message: err.response?.data?.message }
        }
    }

    async function changePassword(currentPassword, newPassword) {
        try {
            await api.put(`/users/${user.value.id}/password`, {
                currentPassword,
                newPassword
            })
            return { success: true, message: 'Senha alterada com sucesso' }
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Erro ao alterar senha' }
        }
    }

    return {
        user,
        accessToken,
        initialized,
        loading,
        error,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        checkAuth,
        updateProfile,
        changePassword,
    }
})
