import { ref } from 'vue'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken, isSupported as isMessagingSupported } from 'firebase/messaging'
import { api } from '@/stores/auth'

let messagingInstance = null
let firebaseInitAttempted = false
let fcmSwRegistrationPromise = null

export function useChatNotifications() {
  const isNotificationSupported = ref(typeof window !== 'undefined' && 'Notification' in window)
  const isAppBadgeSupported = ref(typeof navigator !== 'undefined' && 'setAppBadge' in navigator)

  const notificationPermission = ref(
    isNotificationSupported.value ? Notification.permission : 'unsupported'
  )

  function getPermission() {
    if (!isNotificationSupported.value) return 'unsupported'
    const perm = Notification.permission
    notificationPermission.value = perm
    return perm
  }

  async function requestPermission() {
    if (!isNotificationSupported.value) return 'unsupported'
    try {
      const result = await Notification.requestPermission()
      notificationPermission.value = result
      return result
    } catch (error) {
      return notificationPermission.value
    }
  }

  async function updateBadge(count) {
    if (!isAppBadgeSupported.value) return false
    try {
      if (count > 0) {
        await navigator.setAppBadge(count)
      } else {
        await navigator.clearAppBadge()
      }
      return true
    } catch (error) {
      return false
    }
  }

  function playNotificationSound() {
    // Placeholder: implement sound feedback if desired
  }

  function notifyNewMessage(message, sender, options = {}) {
    if (!isNotificationSupported.value) return false
    const permission = getPermission()
    if (permission !== 'granted') return false

    const title = options.title || (sender ? `Nova mensagem de ${sender}` : 'Nova mensagem')
    const body =
      options.body ||
      message?.content ||
      'Você recebeu uma nova mensagem.'
    const icon = options.icon || '/lanly-logo.png'

    try {
      const notification = new Notification(title, {
        body,
        icon,
      })
      notification.onclick = () => {
        try {
          window.focus()
        } catch (error) {
          // ignore focus errors
        }
        notification.close()
      }
      return true
    } catch (error) {
      return false
    }
  }

  function getFirebaseConfig() {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }
  }

  async function initFirebaseMessaging() {
    if (firebaseInitAttempted) return messagingInstance
    firebaseInitAttempted = true

    const supported = await isMessagingSupported().catch(() => false)
    if (!supported) return null

    const firebaseConfig = getFirebaseConfig()
    if (!firebaseConfig.apiKey || !firebaseConfig.messagingSenderId) {
      return null
    }

    if (!getApps().length) {
      initializeApp(firebaseConfig)
    }
    messagingInstance = getMessaging()
    return messagingInstance
  }

  async function requestFcmToken() {
    try {
      if (typeof window === 'undefined') return null
      const permission = await requestPermission()
      if (permission !== 'granted') return null

      const messaging = await initFirebaseMessaging()
      if (!messaging) return null

      if (!('serviceWorker' in navigator)) return null
      if (!fcmSwRegistrationPromise) {
        fcmSwRegistrationPromise = navigator.serviceWorker.ready
      }
      const registration = await fcmSwRegistrationPromise
      const config = getFirebaseConfig()
      if (config?.apiKey) {
        const sw = registration.active || registration.waiting || registration.installing
        if (sw?.postMessage) {
          sw.postMessage({ type: 'FIREBASE_CONFIG', config })
        }
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY
      if (!vapidKey) return null

      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      })

      if (token) {
        await api.post('/users/me/fcm-token', { token })
      }

      return token || null
    } catch (error) {
      return null
    }
  }

  return {
    isNotificationSupported,
    isAppBadgeSupported,
    notificationPermission,
    requestPermission,
    getPermission,
    updateBadge,
    playNotificationSound,
    notifyNewMessage,
    requestFcmToken,
  }
}
