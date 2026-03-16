import { ref } from 'vue'

/**
 * Composable para gerenciar notificações locais e permissões de navegador.
 * Nota: O Push Notification real é gerenciado pelo stores/notifications.js (Web Push VAPID).
 */
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
    // Implementar som se desejado
  }

  /**
   * Exibe uma notificação local (Desktop Notification) se o browser suportar.
   * Utilizada quando o app está aberto, mas em background ou em outra conversa.
   */
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
        tag: options.tag || (message?.conversationId ? `conv-${message.conversationId}` : undefined),
        renotify: true
      })
      
      notification.onclick = () => {
        try {
          window.focus()
          if (message?.conversationId) {
            // Emite um evento customizado que o Dashboard pode ouvir para trocar de conversa
            window.dispatchEvent(new CustomEvent('notification:click', { 
               detail: { conversationId: message.conversationId } 
            }))
          }
        } catch (error) {
          console.error('[Notification] Falha ao focar janela:', error)
        }
        notification.close()
      }
      return true
    } catch (error) {
      console.error('[Notification] Falha ao criar notificação local:', error)
      return false
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
    notifyNewMessage
  }
}
