<template>
  <!-- Mobile Sidebar Overlay -->
  <div
    v-if="showMobileSidebar"
    class="fixed inset-0 bg-black/50 z-30 md:hidden"
    @click="emit('update:showMobileSidebar', false)"
  ></div>

  <!-- Left Sidebar -->
  <aside
    :class="[
      'flex-shrink-0 flex flex-col glass-panel border-r border-gray-200 dark:border-glass-border h-full bg-white dark:bg-[#131c1e] md:dark:bg-transparent w-[280px] absolute md:relative z-40 transition-transform duration-300',
      showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    ]"
  >
    <!-- User Profile -->
    <div class="p-6 border-b border-gray-100 dark:border-glass-border">
      <div class="flex items-center gap-4">
        <div class="relative">
          <div
            class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 ring-2 ring-primary/20"
            :style="{ backgroundImage: `url(${authUser?.avatarUrl || defaultAvatar})` }"
          ></div>
          <div class="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-background-dark"></div>
          <div v-if="authUser?.customStatusEmoji" class="absolute -top-1 -right-1 size-5 rounded-full bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 flex items-center justify-center text-[11px]">
            {{ authUser.customStatusEmoji }}
          </div>
        </div>
        <div class="flex flex-col">
          <h1 class="text-gray-900 dark:text-white text-base font-bold leading-tight tracking-tight">{{ authUser?.fullName || authUser?.username }}</h1>
          <span class="text-primary text-xs font-medium tracking-wide">{{ locale.t.profile.connected }}</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
      <div class="flex flex-col gap-1">
        <router-link to="/network" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <img src="/lanly-logo.png" alt="Lanly Logo" class="h-6 w-6 object-contain filter grayscale group-hover:grayscale-0 transition-all" />
          <span class="text-sm font-medium">{{ locale.t.nav.network }}</span>
        </router-link>

        <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 text-gray-900 dark:text-white border border-primary/20 shadow-sm dark:shadow-neon" href="#">
          <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">chat</span>
          <span class="text-sm font-medium">{{ locale.t.nav.chat }}</span>
          <div class="ml-auto flex items-center gap-1">
            <span v-if="unreadMentions > 0" class="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full" :title="`${unreadMentions} menções não lidas`">
              @{{ unreadMentions }}
            </span>
            <span v-if="unreadCount > 0" class="bg-primary text-white dark:text-background-dark text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ unreadCount }}</span>
          </div>
        </a>

        <router-link to="/settings" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <span class="material-symbols-outlined group-hover:text-accent transition-colors">settings</span>
          <span class="text-sm font-medium">{{ locale.t.nav.settings }}</span>
        </router-link>

        <button
          @click="emit('toggle-deep-work')"
          :class="[
            'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors group text-left',
            isDeepWorkMode ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
          ]"
        >
          <span class="material-symbols-outlined transition-colors" :class="isDeepWorkMode ? 'text-amber-500' : 'group-hover:text-amber-400'">notifications_paused</span>
          <span class="text-sm font-medium flex-1">Foco Total</span>
          <div class="w-8 h-4 rounded-full relative transition-colors" :class="isDeepWorkMode ? 'bg-amber-500' : 'bg-gray-200 dark:bg-white/10'">
            <div class="absolute w-3 h-3 rounded-full bg-white top-0.5 transition-transform" :class="isDeepWorkMode ? 'left-4.5 translate-x-3.5' : 'left-0.5'"></div>
          </div>
        </button>

        <router-link v-if="isAdmin" to="/admin/users" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <span class="material-symbols-outlined group-hover:text-purple-400 transition-colors">admin_panel_settings</span>
          <span class="text-sm font-medium">{{ locale.t.nav.admin }}</span>
        </router-link>

        <router-link v-if="isAdmin" to="/admin/analytics" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <span class="material-symbols-outlined group-hover:text-blue-400 transition-colors">insights</span>
          <span class="text-sm font-medium">Analytics</span>
        </router-link>

        <router-link v-if="isAdmin" to="/admin/audit" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
          <span class="material-symbols-outlined group-hover:text-rose-400 transition-colors">local_police</span>
          <span class="text-sm font-medium">Auditoria</span>
        </router-link>
      </div>

      <!-- Network Scanner Section -->
      <div class="h-6"></div>
      <div class="flex flex-col gap-2">
        <p class="px-3 text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">{{ locale.t.nav.scannerTools }}</p>
        <details class="group bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5" open>
          <summary class="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 select-none hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-primary text-lg">radar</span>
              <span class="text-gray-700 dark:text-slate-200 text-sm font-medium">{{ locale.t.nav.scanner }}</span>
            </div>
            <div class="flex items-center gap-2">
              <!-- Mini counter -->
              <span v-if="networkDeviceCount > 0" class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                {{ networkStats?.onlineDevices || 0 }}/{{ networkStats?.totalDevices || 0 }}
              </span>
              <span class="material-symbols-outlined text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform text-lg">expand_more</span>
            </div>
          </summary>
          <div class="px-3 pb-3 pt-1 flex flex-col gap-1.5">
            <!-- Quick scan button -->
            <button
              @click="emit('quick-scan')"
              :disabled="networkScanning"
              class="flex items-center justify-center gap-1.5 w-full py-1.5 text-[11px] font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50 mb-1"
            >
              <span :class="['material-symbols-outlined text-sm', networkScanning ? 'animate-spin' : '']">{{ networkScanning ? 'progress_activity' : 'sync' }}</span>
              {{ networkScanning ? 'Escaneando...' : 'Escanear Rede' }}
            </button>

            <!-- Device list -->
            <template v-if="recentDevices.length > 0">
              <div
                v-for="device in recentDevices"
                :key="device.ipAddress"
                class="flex items-center gap-2 text-xs p-2 rounded-lg bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/40 border border-transparent hover:border-primary/20 transition-colors"
              >
                <span :class="['size-1.5 rounded-full shrink-0', device.isOnline ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]' : 'bg-gray-400 dark:bg-slate-600']"></span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-gray-700 dark:text-slate-200 truncate text-[11px]">{{ device.hostname || device.ipAddress }}</p>
                  <p v-if="device.hostname" class="font-mono text-[10px] text-gray-400 dark:text-slate-500">{{ device.ipAddress }}</p>
                </div>
                <span class="font-mono text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
                  {{ device.isOnline && device.latencyMs ? `${device.latencyMs}ms` : '' }}
                </span>
              </div>
            </template>

            <!-- Empty state -->
            <div v-else-if="!networkScanning" class="text-center py-3">
              <span class="material-symbols-outlined text-gray-300 dark:text-slate-600 text-2xl mb-1">wifi_tethering_off</span>
              <p class="text-[10px] text-gray-400 dark:text-slate-500">Nenhum dispositivo encontrado</p>
            </div>

            <router-link to="/network" class="text-[11px] text-primary hover:underline text-center mt-1 font-medium">{{ locale.t.nav.viewAll }} →</router-link>
          </div>
        </details>
      </div>
    </nav>

    <!-- Bottom Info -->
    <div class="p-4 border-t border-gray-100 dark:border-glass-border flex flex-col gap-3">
      <button
        @click="emit('logout')"
        class="flex items-center justify-center gap-2 w-full px-4 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
      >
        <span class="material-symbols-outlined text-[18px]">logout</span>
        <span>{{ locale.t.auth?.logout || 'Sign Out' }}</span>
      </button>
      <div class="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
        <span>v3.0.0 (Stable)</span>
        <div class="flex items-center gap-1">
          <div class="size-2 rounded-full bg-primary/50"></div>
          <span>LAN Secure</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
defineProps({
  showMobileSidebar: { type: Boolean, required: true },
  authUser: { type: Object, default: null },
  isAdmin: { type: Boolean, default: false },
  defaultAvatar: { type: String, required: true },
  locale: { type: Object, required: true },
  unreadCount: { type: Number, default: 0 },
  unreadMentions: { type: Number, default: 0 },
  isDeepWorkMode: { type: Boolean, default: false },
  recentDevices: { type: Array, default: () => [] },
  networkStats: { type: Object, default: () => ({}) },
  networkDeviceCount: { type: Number, default: 0 },
  networkScanning: { type: Boolean, default: false },
});

const emit = defineEmits(['update:showMobileSidebar', 'toggle-deep-work', 'quick-scan', 'logout']);
</script>
