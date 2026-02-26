<template>
  <div class="min-h-screen bg-gray-50 dark:bg-transparent transition-colors duration-300">
    <!-- Header -->
    <header class="glass-panel sticky top-0 z-50 border-b border-gray-200 dark:border-glass-border shadow-sm dark:shadow-none bg-white/80 dark:bg-glass-surface backdrop-blur-md">
      <div class="flex items-center justify-between px-6 py-4 lg:px-10">
        <div class="flex items-center gap-8">
          <router-link to="/" class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <img src="/lanly-logo.png" alt="Lanly Logo" class="h-6 w-6 object-contain" />
            </div>
            <div>
              <h2 class="text-xl font-bold leading-none tracking-tight text-gray-900 dark:text-white">Lanly</h2>
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
                placeholder="Buscar por IP, hostname, MAC, fabricante..."
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
          <h1 class="text-4xl font-black tracking-tight text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            {{ locale.t.network.title }}
            <div class="relative flex items-center group cursor-help z-[100]">
              <span class="material-symbols-outlined text-primary/70 group-hover:text-primary transition-colors text-[28px]">help</span>
              <div class="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-72 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm leading-relaxed font-medium rounded-xl shadow-xl pointer-events-none transform -translate-x-2 group-hover:translate-x-0 border border-transparent dark:border-gray-200">
                Monitore, descubra e gerencie dispositivos conectados na sua infraestrutura de rede local em tempo real. Vincule dispositivos a usuários, exporte relatórios e receba alertas.
                <div class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rotate-45 border-l border-b border-transparent dark:border-gray-200"></div>
              </div>
            </div>
          </h1>
          <p class="text-gray-500 dark:text-slate-400">
            Topologia em tempo real da rede
            <span class="font-mono text-primary bg-primary/10 px-1 rounded text-sm">{{ networkStore.networkInfo?.cidr || '192.168.1.0/24' }}</span>
            <span class="mx-1 text-gray-300 dark:text-slate-600">•</span>
            <span class="font-mono text-xs text-gray-400">Gateway: {{ networkStore.networkInfo?.gateway || '...' }}</span>
          </p>
        </div>
        
        <!-- Stats Cards -->
        <div class="flex flex-wrap gap-4 w-full xl:w-auto">
          <!-- Total -->
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[140px] border-l-4 border-l-primary bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.total }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ networkStore.stats.totalDevices }}</p>
            </div>
          </div>
          <!-- Online -->
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[140px] border-l-4 border-l-green-500 bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.online }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ networkStore.stats.onlineDevices }}</p>
              <div class="size-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></div>
            </div>
          </div>
          <!-- Offline -->
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[140px] border-l-4 border-l-red-400 bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Offline</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold text-gray-900 dark:text-white">{{ offlineCount }}</p>
            </div>
          </div>
          <!-- Avg Latency -->
          <div class="glass-panel flex flex-1 flex-col gap-1 rounded-xl p-4 min-w-[140px] bg-white dark:bg-glass-surface shadow-md dark:shadow-none border border-gray-100 dark:border-white/5">
            <p class="text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">{{ locale.t.network.latency }}</p>
            <div class="flex items-baseline gap-2">
              <p class="text-3xl font-bold" :class="latencyColor">{{ networkStore.stats.avgLatencyMs }}<span class="text-base font-normal text-gray-400 dark:text-slate-500">ms</span></p>
            </div>
          </div>
        </div>
      </div>

      <!-- ★ Scan Progress Bar -->
      <div v-if="networkStore.scanning" class="mb-6">
        <div class="bg-white dark:bg-glass-surface rounded-xl p-4 border border-primary/20 shadow-md">
          <div class="flex items-center gap-3 mb-2">
            <span class="material-symbols-outlined text-primary animate-spin">radar</span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">Escaneando rede...</span>
            <span class="text-xs text-gray-500 dark:text-slate-400 ml-auto">{{ networkStore.networkInfo?.cidr || '192.168.1.0/24' }}</span>
          </div>
          <div class="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full animate-progress"></div>
          </div>
        </div>
      </div>
      
      <!-- Toolbar -->
      <div class="glass-panel mb-8 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 rounded-xl p-2 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/5 shadow-md dark:shadow-none">
        <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <!-- View Toggles -->
          <div class="flex bg-gray-100 dark:bg-white/5 rounded-lg p-1 border border-gray-200 dark:border-white/5">
            <button 
              @click="viewMode = 'grid'"
              :class="['rounded-md p-2 transition-colors', viewMode === 'grid' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white']"
              title="Visualização em cards"
            >
              <span class="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
            <button 
              @click="viewMode = 'list'"
              :class="['rounded-md p-2 transition-colors', viewMode === 'list' ? 'text-gray-900 dark:text-white bg-white dark:bg-white/10 shadow-sm' : 'text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white']"
              title="Visualização em tabela"
            >
              <span class="material-symbols-outlined text-[20px]">table_rows</span>
            </button>
          </div>
          
          <div class="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden md:block"></div>
          
          <!-- Filters -->
          <button 
            @click="filterStatus = filterStatus === 'online' ? 'all' : 'online'"
            :class="[
              'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
              filterStatus === 'online' ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'
            ]"
          >
            <span class="size-2 rounded-full bg-green-500"></span>
            Online
          </button>
          <button 
            @click="filterStatus = filterStatus === 'offline' ? 'all' : 'offline'"
            :class="[
              'flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors',
              filterStatus === 'offline' ? 'border-red-400/30 bg-red-500/10 text-red-500 hover:bg-red-500/20' : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10'
            ]"
          >
            <span class="size-2 rounded-full bg-red-400"></span>
            Offline
          </button>

          <div class="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 hidden md:block"></div>
          
          <!-- Device Type Filter -->
          <select v-model="filterType" class="h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-600 dark:text-slate-300 px-3 focus:ring-1 focus:ring-primary focus:border-primary">
            <option value="all">Todos tipos</option>
            <option value="desktop">💻 Desktop</option>
            <option value="laptop">💻 Laptop</option>
            <option value="server">🖥️ Server</option>
            <option value="router">📡 Router</option>
            <option value="printer">🖨️ Printer</option>
            <option value="mobile">📱 Mobile</option>
            <option value="smart_tv">📺 Smart TV</option>
            <option value="camera">📷 Câmera</option>
            <option value="access_point">📶 Access Point</option>
          </select>

          <!-- Sort -->
          <select v-model="sortBy" class="h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-600 dark:text-slate-300 px-3 focus:ring-1 focus:ring-primary focus:border-primary">
            <option value="status">Ordenar: Status</option>
            <option value="ip">Ordenar: IP</option>
            <option value="hostname">Ordenar: Hostname</option>
            <option value="latency">Ordenar: Latência</option>
            <option value="lastSeen">Ordenar: Última vez visto</option>
          </select>
        </div>

        <div class="flex items-center gap-2 w-full md:w-auto">
          <!-- Export -->
          <button 
            @click="exportCSV"
            class="flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 text-xs font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            title="Exportar lista de dispositivos em CSV"
          >
            <span class="material-symbols-outlined text-[16px]">download</span>
            Exportar CSV
          </button>

          <!-- Scan Button -->
          <button 
            @click="handleScan"
            :disabled="networkStore.scanning"
            class="group flex h-10 w-full md:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-bold text-white dark:text-background-dark shadow-sm dark:shadow-[0_0_15px_rgba(0,212,255,0.3)] hover:shadow-md dark:hover:shadow-[0_0_25px_rgba(0,212,255,0.5)] transition-all disabled:opacity-50"
            title="Escanear a rede em busca de dispositivos"
          >
            <span :class="['material-symbols-outlined text-[20px] transition-transform', networkStore.scanning ? 'animate-spin' : 'group-hover:rotate-180']">sync</span>
            {{ networkStore.scanning ? locale.t.network.scanning : locale.t.network.scan }}
          </button>
        </div>
      </div>
      
      <!-- ═══ GRID VIEW ═══ -->
      <div v-if="viewMode === 'grid'" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div 
          v-for="device in filteredDevices" 
          :key="device.id || device.ipAddress"
          @click="openDeviceDetail(device)"
          class="group relative flex flex-col gap-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#15262a]/80 p-5 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-primary/50 shadow-md dark:shadow-none dark:hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          <!-- Device header -->
          <div class="flex items-start justify-between">
            <div :class="['rounded-lg p-3 ring-1 transition-colors', getDeviceIconStyle(device)]">
              <span class="material-symbols-outlined">{{ getDeviceIcon(device) }}</span>
            </div>
            <span :class="[
              'flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide border',
              device.isOnline 
                ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' 
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
            ]">
              <span :class="['size-1.5 rounded-full', device.isOnline ? 'bg-green-500 dark:bg-green-400 shadow-sm dark:shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-red-500 dark:bg-red-400']"></span>
              {{ device.isOnline ? 'Online' : 'Offline' }}
            </span>
          </div>
          
          <!-- Device info -->
          <div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">{{ device.hostname || 'Desconhecido' }}</h3>
            <p class="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px]">{{ getDeviceTypeIcon(device.deviceType) }}</span>
              {{ getDeviceTypeLabel(device.deviceType) }}
              <span v-if="device.vendor" class="text-primary/70">• {{ device.vendor }}</span>
            </p>
          </div>
          
          <!-- Network details -->
          <div class="space-y-1.5 rounded-lg bg-gray-50 dark:bg-black/20 p-3">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-slate-500">IP</span>
              <span class="font-mono text-gray-700 dark:text-slate-300">{{ device.ipAddress }}</span>
            </div>
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-slate-500">MAC</span>
              <span class="font-mono text-gray-700 dark:text-slate-300 text-[11px]">{{ device.macAddress || 'N/A' }}</span>
            </div>
            <div v-if="device.linkedUserName" class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-slate-500">Usuário</span>
              <span class="text-primary font-semibold">{{ device.linkedUserName }}</span>
            </div>
          </div>
          
          <!-- Latency bar -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500">
              <span>Latência</span>
              <span :class="getLatencyClass(device)">
                {{ device.isOnline ? `${device.latencyMs || '?'}ms` : 'Timeout' }}
              </span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-white/5" title="Tempo de resposta">
              <div 
                :class="['h-full transition-all rounded', getLatencyBarClass(device)]"
                :style="{ width: device.isOnline ? `${Math.min(100, (device.latencyMs || 1) / 2)}%` : '100%' }"
              ></div>
            </div>
          </div>

          <!-- Last seen -->
          <p class="text-[10px] text-gray-400 dark:text-slate-600 flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px]">schedule</span>
            Últ. visto: {{ formatLastSeen(device.lastSeenAt) }}
          </p>
        </div>
      </div>

      <!-- ═══ TABLE VIEW ═══ -->
      <div v-if="viewMode === 'list'" class="bg-white dark:bg-glass-surface rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/5">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-50 dark:bg-black/20 border-b border-gray-200 dark:border-white/5 text-xs uppercase tracking-wider text-gray-500 dark:text-slate-400 font-semibold">
                <th class="px-4 py-4">Status</th>
                <th class="px-4 py-4">Dispositivo</th>
                <th class="px-4 py-4">Endereço IP</th>
                <th class="px-4 py-4 hidden lg:table-cell">MAC</th>
                <th class="px-4 py-4 hidden md:table-cell">Tipo</th>
                <th class="px-4 py-4 hidden xl:table-cell">Fabricante</th>
                <th class="px-4 py-4">Latência</th>
                <th class="px-4 py-4 hidden lg:table-cell">Usuário</th>
                <th class="px-4 py-4 hidden md:table-cell">Última vez</th>
                <th class="px-4 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-white/5 text-sm">
              <tr 
                v-for="device in filteredDevices" 
                :key="device.id || device.ipAddress"
                class="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group"
              >
                <td class="px-4 py-3">
                  <span :class="['flex items-center gap-1.5 text-xs font-bold', device.isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500']">
                    <span :class="['size-2 rounded-full', device.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-400']"></span>
                    {{ device.isOnline ? 'ON' : 'OFF' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-gray-500 dark:text-slate-400 text-lg">{{ getDeviceIcon(device) }}</span>
                    <span class="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">{{ device.hostname || 'Desconhecido' }}</span>
                  </div>
                </td>
                <td class="px-4 py-3 font-mono text-xs text-gray-700 dark:text-slate-300">{{ device.ipAddress }}</td>
                <td class="px-4 py-3 font-mono text-xs text-gray-500 dark:text-slate-400 hidden lg:table-cell">{{ device.macAddress || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-slate-400 hidden md:table-cell">{{ getDeviceTypeLabel(device.deviceType) }}</td>
                <td class="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 hidden xl:table-cell">{{ device.vendor || '—' }}</td>
                <td class="px-4 py-3">
                  <span :class="['text-xs font-mono font-bold', getLatencyClass(device)]">
                    {{ device.isOnline ? `${device.latencyMs || '?'}ms` : '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 hidden lg:table-cell">
                  <span v-if="device.linkedUserName" class="text-xs text-primary font-semibold">{{ device.linkedUserName }}</span>
                  <span v-else class="text-xs text-gray-400">—</span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500 dark:text-slate-400 hidden md:table-cell">{{ formatLastSeen(device.lastSeenAt) }}</td>
                <td class="px-4 py-3 text-right">
                  <button @click.stop="openDeviceDetail(device)" class="p-1.5 rounded-lg hover:bg-primary/10 text-gray-400 hover:text-primary transition-colors" title="Detalhes">
                    <span class="material-symbols-outlined text-[18px]">open_in_new</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Count -->
        <div class="bg-gray-50 dark:bg-black/20 border-t border-gray-200 dark:border-white/5 px-4 py-3 text-xs text-gray-500 dark:text-slate-400">
          Exibindo <span class="font-bold text-gray-900 dark:text-white">{{ filteredDevices.length }}</span> de <span class="font-bold text-gray-900 dark:text-white">{{ networkStore.devices.length }}</span> dispositivos
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-if="filteredDevices.length === 0 && !networkStore.scanning" class="flex flex-col items-center justify-center p-16 text-center bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl mt-8">
        <div class="relative mb-6">
          <div class="size-20 rounded-3xl bg-gradient-to-br from-primary/20 to-blue-500/10 flex items-center justify-center rotate-6">
            <span class="material-symbols-outlined text-5xl text-primary -rotate-6" style="font-variation-settings: 'FILL' 1;">wifi_tethering_off</span>
          </div>
        </div>
        <h3 class="text-xl font-bold text-gray-800 dark:text-white mb-2">Nenhum dispositivo encontrado</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
          A busca não retornou resultados ou a rede ainda não foi mapeada. Clique para iniciar o escaneamento.
        </p>
        <button @click="handleScan" class="flex items-center gap-2 px-6 py-3 bg-primary text-white dark:text-background-dark font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all">
          <span class="material-symbols-outlined">radar</span>
          Escanear Rede
        </button>
      </div>
    </main>

    <!-- ═══ Device Detail Modal ═══ -->
    <div v-if="selectedDevice" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="selectedDevice = null">
      <div class="bg-white dark:bg-[#131c1e] w-full max-w-lg rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl">
        <!-- Header -->
        <div class="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-primary/20 dark:to-blue-500/10 p-6 relative">
          <button @click="selectedDevice = null" class="absolute top-4 right-4 text-white/60 hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="flex items-center gap-4">
            <div :class="['p-4 rounded-2xl bg-white/10 backdrop-blur-sm', selectedDevice.isOnline ? 'ring-2 ring-green-400/50' : 'ring-2 ring-red-400/50']">
              <span class="material-symbols-outlined text-white text-3xl">{{ getDeviceIcon(selectedDevice) }}</span>
            </div>
            <div>
              <h2 class="text-xl font-bold text-white">{{ selectedDevice.hostname || 'Dispositivo Desconhecido' }}</h2>
              <p class="text-white/60 text-sm flex items-center gap-2">
                <span :class="['size-2 rounded-full', selectedDevice.isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400']"></span>
                {{ selectedDevice.isOnline ? 'Online' : 'Offline' }}
                <span v-if="selectedDevice.vendor" class="text-white/40">• {{ selectedDevice.vendor }}</span>
              </p>
            </div>
          </div>
        </div>

        <div class="p-6 space-y-4">
          <!-- Network Info Grid -->
          <div class="grid grid-cols-2 gap-3">
            <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Endereço IP</p>
              <p class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ selectedDevice.ipAddress }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Endereço MAC</p>
              <p class="font-mono text-sm font-bold text-gray-900 dark:text-white">{{ selectedDevice.macAddress || 'N/A' }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Tipo</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ getDeviceTypeLabel(selectedDevice.deviceType) }}</p>
            </div>
            <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
              <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Latência</p>
              <p class="text-sm font-bold" :class="getLatencyClass(selectedDevice)">
                {{ selectedDevice.isOnline ? `${selectedDevice.latencyMs || '?'}ms` : 'Timeout' }}
              </p>
            </div>
          </div>

          <!-- Vendor -->
          <div v-if="selectedDevice.vendor" class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
            <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Fabricante</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ selectedDevice.vendor }}</p>
          </div>

          <!-- Linked User -->
          <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
            <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Vinculado a</p>
            <p v-if="selectedDevice.linkedUserName" class="text-sm font-bold text-primary">{{ selectedDevice.linkedUserName }} (@{{ selectedDevice.linkedUsername }})</p>
            <p v-else class="text-sm text-gray-400 dark:text-slate-500 italic">Nenhum usuário vinculado</p>
          </div>

          <!-- Last seen -->
          <div class="bg-gray-50 dark:bg-white/5 rounded-xl p-3">
            <p class="text-[10px] uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-1">Última atividade</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatLastSeenFull(selectedDevice.lastSeenAt) }}</p>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <button @click="pingDevice(selectedDevice)" :disabled="pinging" class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary font-bold text-sm rounded-xl hover:bg-primary/20 transition-colors disabled:opacity-50">
              <span :class="['material-symbols-outlined text-lg', pinging ? 'animate-spin' : '']">{{ pinging ? 'progress_activity' : 'speed' }}</span>
              {{ pinging ? 'Pingando...' : 'Ping' }}
            </button>
            <button @click="copyDeviceInfo(selectedDevice)" class="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-slate-300 font-bold text-sm rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
              <span class="material-symbols-outlined text-lg">content_copy</span>
              Copiar Info
            </button>
          </div>

          <!-- Ping result -->
          <div v-if="pingResult" class="bg-gray-900 dark:bg-black/40 rounded-xl p-4 font-mono text-xs text-green-400">
            <p>PING {{ pingResult.ip }}:</p>
            <p v-if="pingResult.isAlive">✓ Resposta em {{ pingResult.latency }}ms</p>
            <p v-else class="text-red-400">✗ Host não respondeu (timeout)</p>
            <p v-if="pingResult.packetLoss !== undefined">Perda: {{ pingResult.packetLoss }}%</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <footer class="glass-panel mt-auto border-t border-t-gray-200 dark:border-t-white/5 py-2 px-6 lg:px-10 bg-white/50 dark:bg-transparent">
      <div class="flex flex-wrap justify-between items-center text-xs text-gray-500 dark:text-slate-500 gap-4">
        <div class="flex items-center gap-4">
          <span><span class="w-2 h-2 rounded-full bg-green-500 inline-block mr-2"></span>Network Status: Healthy</span>
          <span>Último scan: {{ lastScanTime }}</span>
        </div>
        <div class="flex items-center gap-4">
          <span>{{ filteredDevices.length }} dispositivos exibidos</span>
          <span class="font-mono text-primary">{{ networkStore.networkInfo?.localIp || '...' }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNetworkStore } from '@/stores/network'
import { useLocaleStore } from '@/stores/locale'
import { api } from '@/stores/auth'

const networkStore = useNetworkStore()
const locale = useLocaleStore()

const searchQuery = ref('')
const viewMode = ref('grid')
const filterStatus = ref('all')
const filterType = ref('all')
const sortBy = ref('status')
const lastScanTime = ref('Nunca')
const selectedDevice = ref(null)
const pinging = ref(false)
const pingResult = ref(null)

// ═══ Computed ═══

const offlineCount = computed(() => {
  return networkStore.stats.totalDevices - networkStore.stats.onlineDevices
})

const latencyColor = computed(() => {
  const ms = networkStore.stats.avgLatencyMs
  if (ms <= 5) return 'text-green-500'
  if (ms <= 20) return 'text-primary'
  if (ms <= 50) return 'text-amber-500'
  return 'text-red-500'
})

const filteredDevices = computed(() => {
  let devices = networkStore.devices.map(d => ({
    ...d,
    vendor: d.vendor || getVendorFromMac(d.macAddress),
  }))
  
  // Filter by status
  if (filterStatus.value === 'online') devices = devices.filter(d => d.isOnline)
  if (filterStatus.value === 'offline') devices = devices.filter(d => !d.isOnline)
  
  // Filter by type
  if (filterType.value !== 'all') devices = devices.filter(d => d.deviceType === filterType.value)
  
  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    devices = devices.filter(d => 
      d.ipAddress?.toLowerCase().includes(q) ||
      d.hostname?.toLowerCase().includes(q) ||
      d.macAddress?.toLowerCase().includes(q) ||
      d.vendor?.toLowerCase()?.includes(q) ||
      d.deviceType?.toLowerCase()?.includes(q) ||
      d.linkedUserName?.toLowerCase()?.includes(q)
    )
  }
  
  // Sort
  devices.sort((a, b) => {
    switch (sortBy.value) {
      case 'ip': {
        const aNum = a.ipAddress?.split('.').map(Number).reduce((acc, v, i) => acc + v * Math.pow(256, 3 - i), 0) || 0
        const bNum = b.ipAddress?.split('.').map(Number).reduce((acc, v, i) => acc + v * Math.pow(256, 3 - i), 0) || 0
        return aNum - bNum
      }
      case 'hostname': return (a.hostname || 'zzz').localeCompare(b.hostname || 'zzz')
      case 'latency': return (a.latencyMs || 999) - (b.latencyMs || 999)
      case 'lastSeen': return new Date(b.lastSeenAt || 0) - new Date(a.lastSeenAt || 0)
      default: return b.isOnline - a.isOnline || (a.latencyMs || 999) - (b.latencyMs || 999)
    }
  })
  
  return devices
})

// ═══ Functions ═══

function getVendorFromMac(mac) {
  if (!mac) return null
  const prefix = mac.substring(0, 8).toUpperCase().replace(/:/g, '').replace(/-/g, '')
  const vendors = {
    '000C29': 'VMware', '005056': 'VMware', '001C42': 'Parallels', '080027': 'VirtualBox',
    '00155D': 'Hyper-V', '001A2B': 'Cisco', '001D7E': 'Linksys', 'C0C1C0': 'Cisco',
    'DC9FDB': 'TP-Link', '001558': 'D-Link', '00E04C': 'Realtek', '00E018': 'HP',
    '3C2AF4': 'Brother', '001B63': 'Apple', '28C68E': 'Netgear', '00248C': 'ASUSTek',
    '001E8C': 'Samsung', 'B827EB': 'Raspberry Pi', 'DCA632': 'Raspberry Pi',
    'F8E43B': 'Apple', 'A4C639': 'Intel', '1C1B68': 'Intel', '3C9509': 'LG',
    '0050F2': 'Microsoft', '00AABB': 'Dell', 'F0DEF1': 'Samsung', 'E0ACCB': 'Apple',
    '7C5CF8': 'Samsung', '606D3C': 'Apple', '2C4401': 'Apple', 'A860B6': 'Apple',
    '00E0B8': 'AMD', '30AEA4': 'Samsung', '4CE676': 'Buffalo', '0017C4': 'Motorola',
    'E09861': 'Dell', '689423': 'Samsung', '78886D': 'Apple', '00037F': 'Atheros',
  }
  for (const [p, vendor] of Object.entries(vendors)) {
    if (prefix.startsWith(p)) return vendor
  }
  return null
}

function getDeviceIcon(device) {
  const t = device.deviceType || ''
  const icons = {
    router: 'router', switch: 'device_hub', server: 'dns', printer: 'print',
    mobile: 'smartphone', laptop: 'laptop_mac', desktop: 'desktop_windows',
    smart_tv: 'tv', camera: 'videocam', access_point: 'wifi',
    apple_device: 'laptop_mac',
  }
  return icons[t] || 'desktop_windows'
}

function getDeviceIconStyle(device) {
  const t = device.deviceType || ''
  const styles = {
    router: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-200 dark:ring-blue-500/20',
    server: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-200 dark:ring-purple-500/20',
    printer: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-200 dark:ring-amber-500/20',
    mobile: 'bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 ring-pink-200 dark:ring-pink-500/20',
    camera: 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 ring-red-200 dark:ring-red-500/20',
    smart_tv: 'bg-teal-100 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-teal-200 dark:ring-teal-500/20',
    access_point: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-200 dark:ring-cyan-500/20',
  }
  return styles[t] || 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-white ring-gray-200 dark:ring-white/10'
}

function getDeviceTypeIcon(type) {
  const icons = {
    router: 'router', switch: 'device_hub', server: 'dns', printer: 'print',
    mobile: 'smartphone', laptop: 'laptop_mac', desktop: 'desktop_windows',
    smart_tv: 'tv', camera: 'videocam', access_point: 'wifi',
  }
  return icons[type] || 'devices'
}

function getDeviceTypeLabel(type) {
  const labels = {
    router: 'Roteador', switch: 'Switch', server: 'Servidor', printer: 'Impressora',
    mobile: 'Celular', laptop: 'Notebook', desktop: 'Desktop', unknown: 'Desconhecido',
    smart_tv: 'Smart TV', camera: 'Câmera IP', access_point: 'Access Point',
    apple_device: 'Apple Device',
  }
  return labels[type] || type || 'Desktop'
}

function getLatencyClass(device) {
  if (!device.isOnline) return 'text-red-400'
  const ms = device.latencyMs || 0
  if (ms <= 5) return 'text-green-500'
  if (ms <= 20) return 'text-primary'
  if (ms <= 50) return 'text-amber-500'
  return 'text-red-500'
}

function getLatencyBarClass(device) {
  if (!device.isOnline) return 'bg-red-400'
  const ms = device.latencyMs || 0
  if (ms <= 5) return 'bg-green-500'
  if (ms <= 20) return 'bg-primary'
  if (ms <= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function formatLastSeen(dateStr) {
  if (!dateStr) return 'Nunca'
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return 'Agora'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min atrás`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
  return `${Math.floor(diff / 86400000)}d atrás`
}

function formatLastSeenFull(dateStr) {
  if (!dateStr) return 'Nunca'
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function openDeviceDetail(device) {
  selectedDevice.value = device
  pingResult.value = null
}

async function pingDevice(device) {
  pinging.value = true
  pingResult.value = null
  try {
    const res = await api.get(`/network/ping/${device.ipAddress}`)
    pingResult.value = { ip: device.ipAddress, ...res.data.data }
  } catch {
    pingResult.value = { ip: device.ipAddress, isAlive: false }
  }
  pinging.value = false
}

function copyDeviceInfo(device) {
  const info = [
    `Hostname: ${device.hostname || 'N/A'}`,
    `IP: ${device.ipAddress}`,
    `MAC: ${device.macAddress || 'N/A'}`,
    `Tipo: ${getDeviceTypeLabel(device.deviceType)}`,
    `Fabricante: ${device.vendor || 'N/A'}`,
    `Status: ${device.isOnline ? 'Online' : 'Offline'}`,
    `Latência: ${device.latencyMs || 'N/A'}ms`,
    `Usuário: ${device.linkedUserName || 'Não vinculado'}`,
  ].join('\n')
  navigator.clipboard.writeText(info)
  alert('Informações copiadas!')
}

function exportCSV() {
  const headers = ['Status', 'Hostname', 'IP', 'MAC', 'Tipo', 'Fabricante', 'Latência (ms)', 'Usuário', 'Última Atividade']
  const rows = filteredDevices.value.map(d => [
    d.isOnline ? 'Online' : 'Offline',
    d.hostname || '',
    d.ipAddress,
    d.macAddress || '',
    getDeviceTypeLabel(d.deviceType),
    d.vendor || '',
    d.latencyMs || '',
    d.linkedUserName || '',
    d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString('pt-BR') : '',
  ])
  
  const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `network-devices-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function handleScan() {
  await networkStore.scanNetwork()
  await networkStore.fetchStats()
  lastScanTime.value = new Date().toLocaleTimeString('pt-BR')
}

onMounted(async () => {
  await networkStore.fetchDevices()
  await networkStore.fetchStats()
  await networkStore.fetchNetworkInfo()
})
</script>

<style scoped>
@keyframes progress {
  0% { width: 0%; }
  50% { width: 70%; }
  100% { width: 100%; }
}
.animate-progress {
  animation: progress 8s ease-out forwards;
}
</style>
