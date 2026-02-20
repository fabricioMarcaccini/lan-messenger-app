<template>
  <div class="min-h-screen bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Background atmospheric effects -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div class="absolute inset-0 bg-gray-50 dark:bg-background-dark transition-colors duration-300"></div>
      <div class="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div class="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] bg-secondary/10 rounded-full blur-[120px] animate-pulse-slow" style="animation-delay: 4s;"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] bg-indigo-900/20 rounded-full blur-[100px]"></div>
    </div>
    
    <!-- Main content -->
    <div class="relative z-10">
      <router-view />
    </div>

    <!-- PWA Install Prompt (Floating) -->
    <div v-if="deferredPrompt" class="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-white/10 flex items-center gap-4 animate-fade-in">
      <div class="bg-primary/20 text-primary p-2 rounded-xl flex items-center justify-center">
        <span class="material-symbols-outlined">install_desktop</span>
      </div>
      <div class="flex-1">
        <h4 class="text-sm font-bold text-gray-900 dark:text-white">Instalar App</h4>
        <p class="text-xs text-gray-500 dark:text-gray-400">Tenha a melhor experiência no desktop ou celular.</p>
      </div>
      <div class="flex items-center gap-2">
        <button @click="dismissInstall" class="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">Agora não</button>
        <button @click="installPWA" class="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-cyan-500 shadow-lg shadow-primary/30 transition-colors">Instalar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useThemeStore } from '@/stores/theme'

const authStore = useAuthStore()
const socketStore = useSocketStore()
const themeStore = useThemeStore() // Just initializing it applies the theme

// PWA Install Logic
const deferredPrompt = ref(null)

const handleInstallPrompt = (e) => {
  e.preventDefault()
  deferredPrompt.value = e
}

const installPWA = async () => {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  console.log(`User response to the install prompt: ${outcome}`)
  deferredPrompt.value = null
}

const dismissInstall = () => {
  deferredPrompt.value = null
}

onMounted(async () => {
  // Check if user is authenticated
  await authStore.checkAuth()
  
  // Connect socket if authenticated
  if (authStore.isAuthenticated) {
    socketStore.connect()
    
    // Request notification permission early
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (e) {
        console.warn('Notification permission request failed', e)
      }
    }
  }

  window.addEventListener('beforeinstallprompt', handleInstallPrompt)
})

onUnmounted(() => {
  window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
})
</script>
