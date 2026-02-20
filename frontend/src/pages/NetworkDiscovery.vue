<template>
  <div class="min-h-screen bg-gray-50 dark:bg-transparent transition-colors duration-300">
    <!-- Header -->
    <header class="glass-panel sticky top-0 z-50 border-b border-gray-200 dark:border-glass-border shadow-sm dark:shadow-none bg-white/80 dark:bg-glass-surface backdrop-blur-md">
      <div class="flex items-center justify-between px-6 py-4 lg:px-10">
        <div class="flex items-center gap-8">
          <router-link to="/" class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <span class="material-symbols-outlined text-3xl">hub</span>
            </div>
            <div>
              <h2 class="text-xl font-bold leading-none tracking-tight text-gray-900 dark:text-white">LAN Messenger</h2>
              <span class="text-xs font-medium text-primary/80 neon-text">ENTERPRISE</span>
            </div>
          </router-link>
          
          <!-- Search Bar -->
          <label class="hidden md:flex flex-col min-w-64 max-w-96">
            <div class="flex w-full items-center rounded-lg border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5 px-3 py-2 focus-within:border-primary/50 focus-within:bg-white dark:focus-within:bg-white/10 transition-colors">
              <span class="material-symbols-outlined text-gray-400 dark:text-slate-400">search</span>
              <input 
                v-model="searchQuery"
                class="ml-2 w-full flex-1 border-none bg-transparent p-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-400 focus:ring-0" 
                :placeholder="locale.t.network.search"
              />
            </div>
          </label>
        </div>
        
        <div class="flex items-center gap-6">
          <nav class="hidden lg:flex items-center gap-6">
            <router-link to="/" class="text-sm font-medium text-gray-600 dark:text-white hover:text-primary transition-colors">{{ locale.t.nav.chat }}</router-link>
            <a class="text-sm font-medium text-primary neon-text" href="#">Topology</a>
            <router-link to="/settings" class="text-sm font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">{{ locale.t.nav.settings }}</router-link>
          </nav>
        </div>
      </div>
    </header>
    
    <!-- Main Content -->
    <main class="flex-1 px-6 py-8 lg:px-10 xl:px-20 max-w-[1600px] mx-auto w-full">
      <!-- Header + Stats -->
      <div class="flex flex-col xl:flex-row gap-6 mb-8 justify-between items-end">
        <div class="flex-1 min-w-[300px]">
          <h1 class="text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-2">{{ locale.t.network.title }}</h1>
          <p class="text-gray-500 dark:text-slate-400">
            Real-time topology of connected devices on Subnet 
            <span class="font-mono text-primary bg-primary/10 px-1 rounded text-sm">{{ networkStore.networkInfo?.cidr || '192.168.1.0/24' }}</span>
          </p>
        </div>
        
        <!-- Stats Cards -->
        <div class="flex flex-wrap gap-4 w-full xl:w-auto">
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[160px] border-l-4 border-l-primary bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.total }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ networkStore.stats.totalDevices }}</p>
            </div>
          </div>
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[160px] bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.online }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ networkStore.stats.onlineDevices }}</p>
              <div class="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
            </div>
          </div>
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[160px] bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.latency }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ networkStore.stats.avgLatencyMs }}<span class="text-base font-normal text-gray-400 dark:text-slate-500">ms</span></p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Toolbar -->
      <div class="glass-panel mb-8 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 rounded-xl p-2 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/5 shadow-md dark:shadow-none">
        <div class="flex items-center gap-2 w-full md:w-auto">
          <!-- View Toggles -->
          <div class="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/5">
            <button 
              @click="viewMode = 'grid'"
              :class="['rounded-md p-2 transition-colors', viewMode === 'grid' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white']"
            >
              <span class="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button 
              @click="viewMode = 'list'"
              :class="['rounded-md p-2 transition-colors', viewMode === 'list' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white']"
            >
              <span class="material-symbols-outlined text-[20px]">table_rows</span>
            </button>
          </div>
          
          <div class="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
          
          <!-- Filters -->
          <button 
            @click="onlineOnly = !onlineOnly"
            :class="[
              'flex h-9 items-center gap-2 rounded-lg border px-4 text-xs font-medium transition-colors',
              onlineOnly ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'
            ]"
          >
            <span class="size-2 rounded-full" :class="onlineOnly ? 'bg-primary' : 'bg-slate-500'"></span>
            {{ locale.t.network.filterOnline }}
          </button>
        </div>
        
        <!-- Scan Button -->
        <button 
          @click="handleScan"
          :disabled="networkStore.scanning"
          class="group flex h-10 w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white dark:text-background-dark shadow-sm dark:shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all disabled:opacity-50"
        >
          <span :class="['material-symbols-outlined text-[20px] transition-transform', networkStore.scanning ? 'animate-spin' : 'group-hover:rotate-180']">sync</span>
          {{ networkStore.scanning ? locale.t.network.scanning : locale.t.network.scan }}
        </button>
      </div>
      
      <!-- Device Grid -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div 
          v-for="device in filteredDevices" 
          :key="device.id"
          class="group relative flex flex-col gap-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#15262a]/80 p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-primary/50 shadow-md dark:shadow-none dark:hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
        >
          <div class="flex items-start justify-between">
            <div class="rounded-lg bg-gray-100 dark:bg-white/5 p-3 text-gray-700 dark:text-white ring-1 ring-gray-200 dark:ring-white/10">
              <span class="material-symbols-outlined">{{ getDeviceIcon(device) }}</span>
            </div>
            <span :class="[
              'flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide border',
              device.isOnline 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
            ]">
              <span :class="['size-1.5 rounded-full', device.isOnline ? 'bg-green-500 dark:bg-green-400 shadow-sm dark:shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-red-500 dark:bg-red-400']"></span>
              {{ device.isOnline ? locale.t.chat.online : 'Offline' }}
            </span>
          </div>
          
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{{ device.hostname || locale.t.network.unknown }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400">{{ device.deviceType || 'Network Device' }}</p>
          </div>
          
          <div class="space-y-2 rounded-lg bg-gray-50 dark:bg-black/20 p-3">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-slate-500">{{ locale.t.network.ip }}</span>
              <span class="font-mono text-gray-700 dark:text-slate-300">{{ device.ipAddress }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-slate-500">{{ locale.t.network.mac }}</span>
              <span class="font-mono text-gray-700 dark:text-slate-300">{{ device.macAddress || 'N/A' }}</span>
            </div>
          </div>
          
          <!-- Latency -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
              <span>Latency</span>
              <span :class="device.isOnline ? 'text-primary' : 'text-red-400'">
                {{ device.isOnline ? `${device.latencyMs || '?'}ms` : 'Timeout' }}
              </span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-white/5">
              <div 
                :class="[
                  'h-full transition-all',
                  device.isOnline ? 'bg-primary' : 'bg-red-400'
                ]"
                :style="{ width: device.isOnline ? `${Math.min(100, (device.latencyMs || 50) / 2)}%` : '100%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </main>
    
    <!-- Footer -->
    <footer class="glass-panel mt-auto border-t border-t-gray-200 dark:border-t-white/5 py-2 px-6 lg:px-10 bg-white/50 dark:bg-transparent">
      <div class="flex flex-wrap justify-between items-center text-xs text-gray-500 dark:text-slate-500 gap-4">
        <div class="flex items-center gap-4">
          <span><span class="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>Network Status: Healthy</span>
          <span>Last scan: {{ lastScanTime }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useLocaleStore } from '@/stores/locale'

const networkStore = useNetworkStore()
const locale = useLocaleStore()

const searchQuery = ref('')
const viewMode = ref('grid')
const onlineOnly = ref(false)
const lastScanTime = ref(locale.t.chat?.now || 'Never')

const filteredDevices = computed(() => {
  let devices = networkStore.devices
  
  if (onlineOnly.value) {
    devices = devices.filter(d => d.isOnline)
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    devices = devices.filter(d => 
      d.ipAddress?.toLowerCase().includes(query) ||
      d.hostname?.toLowerCase().includes(query) ||
      d.macAddress?.toLowerCase().includes(query)
    )
  }
  
  return devices
})

function getDeviceIcon(device) {
  const hostname = (device.hostname || '').toLowerCase()
  if (hostname.includes('server') || hostname.includes('srv')) return 'dns'
  if (hostname.includes('iphone') || hostname.includes('android')) return 'smartphone'
  if (hostname.includes('macbook') || hostname.includes('laptop')) return 'laptop_mac'
  if (hostname.includes('printer')) return 'print'
  return 'desktop_windows'
}

async function handleScan() {
  await networkStore.scanNetwork()
  await networkStore.fetchStats()
  lastScanTime.value = locale.t.chat.now
}

onMounted(async () => {
  await networkStore.fetchDevices()
  await networkStore.fetchStats()
  await networkStore.fetchNetworkInfo()
})
</script>
