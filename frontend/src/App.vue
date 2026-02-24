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
      <!-- Trial Banner -->
      <div v-if="trialDaysLeft !== null && trialDaysLeft > 0 && $route.name !== 'Pricing' && $route.name !== 'Login'"
        class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
        <span class="material-symbols-outlined text-base">timer</span>
        <span>{{ locale.t.pricing.trialBanner }} <strong>{{ trialDaysLeft }} {{ trialDaysLeft > 1 ? locale.t.pricing.daysPlural : locale.t.pricing.days }}</strong></span>
        <router-link to="/pricing" class="ml-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-colors text-xs">
          {{ locale.t.pricing.subscribeNow }}
        </router-link>
      </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'

const authStore = useAuthStore()
const socketStore = useSocketStore()
const themeStore = useThemeStore()
const locale = useLocaleStore()

// Trial countdown
const trialDaysLeft = computed(() => {
  const user = authStore.user
  if (!user?.trialEndsAt || user.planId !== 'trial') return null
  const diff = new Date(user.trialEndsAt) - new Date()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
})

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
  // 🔗 Affiliate tracking: capture ?ref= from URL and save to localStorage
  const urlParams = new URLSearchParams(window.location.search)
  const ref = urlParams.get('ref')
  if (ref) {
    localStorage.setItem('affiliate_ref', ref)
    console.log('🤝 Affiliate ref captured:', ref)
    // Clean URL without losing other params
    urlParams.delete('ref')
    const cleanUrl = urlParams.toString()
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', cleanUrl)
  }

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
