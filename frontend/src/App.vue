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
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useThemeStore } from '@/stores/theme'

const authStore = useAuthStore()
const socketStore = useSocketStore()
const themeStore = useThemeStore() // Just initializing it applies the theme

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
})
</script>
