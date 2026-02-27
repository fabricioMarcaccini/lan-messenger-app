<template>
  <div class="p-6 max-w-7xl mx-auto h-full flex flex-col">
    <!-- Header -->
    <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
          Auditoria de Sistema
        </h1>
        <p class="text-sm text-gray-500 mt-1 flex items-center gap-2">
          Monitoramento de segurança e compliance
        </p>
      </div>

      <div class="flex gap-2">
        <button 
          @click="fetchLogs" 
          class="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-all text-sm font-medium shadow-sm"
          :disabled="loading"
        >
          <span :class="['material-symbols-outlined text-[18px]', { 'animate-spin': loading }]">sync</span>
          Atualizar
        </button>
        <button 
          @click="exportCsv" 
          class="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-white transition-all text-sm font-medium shadow-sm"
          :disabled="loading || logs.length === 0"
        >
          <span class="material-symbols-outlined text-[18px]">download</span>
          Exportar CSV
        </button>
      </div>
    </header>

    <!-- Filters -->
    <div class="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shadow-sm">
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ação</label>
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
          <input 
            v-model="filters.action"
            @keyup.enter="applyFilters"
            type="text" 
            placeholder="Ex: login, delete_user..." 
            class="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
          >
        </div>
      </div>
      
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo Alvo</label>
        <select 
          v-model="filters.targetType"
          @change="applyFilters"
          class="w-full px-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white appearance-none"
        >
          <option value="">Todos</option>
          <option value="user">Usuário</option>
          <option value="conversation">Conversa</option>
          <option value="message">Mensagem</option>
          <option value="meeting">Reunião</option>
          <option value="file">Arquivo</option>
        </select>
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Inicial</label>
        <input 
          v-model="filters.dateFrom"
          @change="applyFilters"
          type="date" 
          class="w-full px-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
        >
      </div>

      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Final</label>
        <input 
          v-model="filters.dateTo"
          @change="applyFilters"
          type="date" 
          class="w-full px-3 py-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all dark:text-white"
        >
      </div>
    </div>

    <!-- Data Table -->
    <div class="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm flex flex-col relative min-h-[400px]">
      
      <!-- Loading Overlay -->
      <div v-if="loading && logs.length === 0" class="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
        <span class="material-symbols-outlined text-primary text-4xl animate-spin mb-4">progress_activity</span>
        <p class="text-gray-500 font-medium">Carregando logs...</p>
      </div>

      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead class="bg-gray-50 dark:bg-white/5 sticky top-0 z-10">
            <tr>
              <th class="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">Data / Hora</th>
              <th class="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">Ator</th>
              <th class="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">Ação</th>
              <th class="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">Alvo</th>
              <th class="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-white/10">Metadados</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/5">
            <template v-if="logs.length > 0">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {{ formatDate(log.created_at) }}
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2" v-if="log.actor_name">
                    <img :src="log.actor_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.actor_name)}&background=random`" class="w-6 h-6 rounded-full" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white leading-tight">{{ log.actor_name }}</p>
                      <p class="text-[10px] text-gray-500">@{{ log.actor_username }}</p>
                    </div>
                  </div>
                  <span v-else class="text-sm text-gray-500 italic pb-1">Sistema</span>
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium" :class="getActionColor(log.action)">
                    {{ log.action }}
                  </span>
                </td>
                <td class="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                  <span v-if="log.target_type" class="font-mono text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded mr-1">
                    {{ log.target_type }}
                  </span>
                  <span class="text-[11px] font-mono opacity-60" :title="log.target_id">
                    {{ truncate(log.target_id, 8) }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <details class="text-[11px] text-gray-500 cursor-pointer relative" v-if="Object.keys(log.metadata || {}).length > 0">
                    <summary class="hover:text-primary outline-none list-none flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                      <span class="material-symbols-outlined text-[14px]">data_object</span>
                      Ver payload
                    </summary>
                    <div class="absolute right-0 top-6 w-64 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl z-20 font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                      {{ JSON.stringify(log.metadata, null, 2) }}
                    </div>
                  </details>
                  <span v-else class="text-xs text-gray-400">-</span>
                </td>
              </tr>
            </template>
            <tr v-else-if="!loading">
              <td colspan="5" class="py-12 text-center text-gray-500">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                <p>Nenhum log de auditoria encontrado para os filtros atuais.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="border-t border-gray-200 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
        <p class="text-sm text-gray-500">
          Mostrando <span class="font-medium text-gray-900 dark:text-white">{{ offset + 1 }}</span> a 
          <span class="font-medium text-gray-900 dark:text-white">{{ Math.min(offset + limit, total) }}</span> de 
          <span class="font-medium text-gray-900 dark:text-white">{{ total }}</span> resultados
        </p>
        <div class="flex gap-2">
          <button 
            @click="prevPage" 
            :disabled="offset === 0 || loading"
            class="p-1 px-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/20 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Anterior
          </button>
          <button 
            @click="nextPage" 
            :disabled="offset + limit >= total || loading"
            class="p-1 px-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/20 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/stores/auth'

const logs = ref([])
const total = ref(0)
const limit = ref(50)
const offset = ref(0)
const loading = ref(false)

const filters = ref({
  action: '',
  targetType: '',
  dateFrom: '',
  dateTo: ''
})

async function fetchLogs() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      limit: limit.value,
      offset: offset.value
    })
    
    if (filters.value.action) params.append('action', filters.value.action.trim())
    if (filters.value.targetType) params.append('targetType', filters.value.targetType)
    if (filters.value.dateFrom) params.append('dateFrom', filters.value.dateFrom)
    if (filters.value.dateTo) params.append('dateTo', filters.value.dateTo)

    const response = await api.get(`/audit?${params.toString()}`)
    if (response.data.success) {
      logs.value = response.data.data
      total.value = response.data.total
    }
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    alert('Erro ao carregar auditoria. Verifique se você tem permissão.')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  offset.value = 0
  fetchLogs()
}

function prevPage() {
  if (offset.value > 0) {
    offset.value = Math.max(0, offset.value - limit.value)
    fetchLogs()
  }
}

function nextPage() {
  if (offset.value + limit.value < total.value) {
    offset.value += limit.value
    fetchLogs()
  }
}

async function exportCsv() {
  if (logs.value.length === 0) return
  
  try {
    const response = await api.get('/audit/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `auditoria_lanly_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    alert("Erro ao exportar CSV")
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '-'
  return new Date(isoStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

function truncate(str, max) {
  if (!str) return '-'
  return str.length > max ? str.substring(0, max) + '...' : str
}

function getActionColor(action) {
  const act = (action || '').toLowerCase()
  if (act.includes('delete') || act.includes('remove') || act.includes('fail')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }
  if (act.includes('update') || act.includes('edit') || act.includes('change')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
  }
  if (act.includes('login') || act.includes('auth')) {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  }
  if (act.includes('create') || act.includes('add') || act.includes('join')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  }
  return 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
}

onMounted(() => {
  fetchLogs()
})
</script>
