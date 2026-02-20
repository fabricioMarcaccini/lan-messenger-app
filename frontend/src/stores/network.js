import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from './auth'

export const useNetworkStore = defineStore('network', () => {
    const devices = ref([])
    const stats = ref({ totalDevices: 0, onlineDevices: 0, avgLatencyMs: 0 })
    const networkInfo = ref(null)
    const loading = ref(false)
    const scanning = ref(false)

    async function fetchDevices(onlineOnly = false) {
        loading.value = true

        try {
            const response = await api.get('/network/devices', {
                params: { onlineOnly: onlineOnly.toString() }
            })
            devices.value = response.data.data
        } catch (err) {
            console.error('Failed to fetch devices:', err)
        } finally {
            loading.value = false
        }
    }

    async function scanNetwork() {
        scanning.value = true

        try {
            const response = await api.get('/network/scan')
            devices.value = response.data.data.devices
            return response.data.data
        } catch (err) {
            console.error('Failed to scan network:', err)
            return null
        } finally {
            scanning.value = false
        }
    }

    async function fetchStats() {
        try {
            const response = await api.get('/network/stats')
            stats.value = response.data.data
        } catch (err) {
            console.error('Failed to fetch stats:', err)
        }
    }

    async function fetchNetworkInfo() {
        try {
            const response = await api.get('/network/info')
            networkInfo.value = response.data.data
        } catch (err) {
            console.error('Failed to fetch network info:', err)
        }
    }

    async function linkDevice(deviceId, userId) {
        try {
            await api.post(`/network/devices/${deviceId}/link`, { userId })
            await fetchDevices()
            return true
        } catch (err) {
            console.error('Failed to link device:', err)
            return false
        }
    }

    return {
        devices,
        stats,
        networkInfo,
        loading,
        scanning,
        fetchDevices,
        scanNetwork,
        fetchStats,
        fetchNetworkInfo,
        linkDevice,
    }
})
