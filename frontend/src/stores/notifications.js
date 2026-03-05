import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from './auth'

export const useNotificationsStore = defineStore('notifications', () => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
    const permission = ref(Notification.permission)
    const isSubscribed = ref(false)
    const activeDevices = ref(0)

    // Converte chave Base64 para Uint8Array no formato que o Chrome exige
    function urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async function checkStatus() {
        if (!isSupported) return
        try {
            const res = await api.get('/notifications/status')
            if (res.data.success) {
                activeDevices.value = res.data.data.activeDevices || 0
            }

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            isSubscribed.value = !!subscription
        } catch (e) {
            console.error('Failed to get notification status', e)
        }
    }

    async function subscribe() {
        if (!isSupported) throw new Error('Notificações não suportadas no seu navegador.')

        const perm = await Notification.requestPermission()
        permission.value = perm

        if (perm !== 'granted') {
            throw new Error('Permissão negada pelo usuário')
        }

        const registration = await navigator.serviceWorker.ready

        // 1. Pega chave VAPID pública
        const keyResponse = await api.get('/notifications/vapid-key')
        const applicationServerKey = urlBase64ToUint8Array(keyResponse.data.data.publicKey)

        // 2. Cria ou pega sub inscrição no navegador
        let subscription = await registration.pushManager.getSubscription()
        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            })
        }

        // 3. Envia para o Backend salvar
        await api.post('/notifications/subscribe', {
            subscription: subscription.toJSON()
        })

        isSubscribed.value = true
        await checkStatus()
    }

    async function unsubscribe() {
        if (!isSupported) return

        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()

            if (subscription) {
                // Tenta descadastrar do backend primeiro
                await api.delete('/notifications/unsubscribe', { data: { endpoint: subscription.endpoint } })
                // Descadastra no browser localmente
                await subscription.unsubscribe()
            }
            isSubscribed.value = false
            await checkStatus()
        } catch (err) {
            console.error('Falhar ao fazer unsubscribe do push', err)
        }
    }

    return {
        isSupported,
        permission,
        isSubscribed,
        activeDevices,
        checkStatus,
        subscribe,
        unsubscribe
    }
})
