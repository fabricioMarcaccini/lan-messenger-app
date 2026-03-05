<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 transition-opacity duration-300">
    <div class="bg-white dark:bg-[#0f171a] w-full max-w-2xl rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative flex flex-col max-h-[90vh]">
      
      <!-- Close Button -->
      <button @click="$emit('close')" class="absolute top-5 right-5 z-20 p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-all backdrop-blur-sm">
        <span class="material-symbols-outlined text-[20px] block">close</span>
      </button>

      <!-- Decorative Header Background -->
      <div class="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent dark:from-primary/10 dark:via-blue-500/5 pointer-events-none">
        <div class="absolute inset-0 opacity-30" style="background-image: radial-gradient(#3b82f6 1px, transparent 1px); background-size: 20px 20px;"></div>
      </div>

      <div class="px-8 pt-8 pb-4 relative z-10 flex-shrink-0">
        <div class="flex items-center gap-4 mb-2">
          <div class="size-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <span class="material-symbols-outlined text-white text-2xl">rocket_launch</span>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Onboarding Turbo</h2>
            <p class="text-sm font-medium text-gray-500 dark:text-slate-400">Escale seu time em segundos.</p>
          </div>
        </div>
        
        <!-- Tabs -->
        <div class="flex items-center gap-2 mt-8 bg-gray-100 dark:bg-black/30 p-1 rounded-xl">
          <button 
            @click="activeTab = 'paste'"
            :class="['flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2', activeTab === 'paste' ? 'bg-white dark:bg-[#1a2c30] text-primary shadow-sm ring-1 ring-gray-200 dark:ring-white/10' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300']"
          >
            <span class="material-symbols-outlined text-[18px]">content_paste</span>
            Smart Paste
          </button>
          <button 
            @click="activeTab = 'link'"
            :class="['flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2', activeTab === 'link' ? 'bg-white dark:bg-[#1a2c30] text-primary shadow-sm ring-1 ring-gray-200 dark:ring-white/10' : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300']"
          >
            <span class="material-symbols-outlined text-[18px]">link</span>
            Link Mágico
          </button>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="px-8 py-4 overflow-y-auto relative z-10 flex-1 custom-scrollbar">
        
        <!-- SMART PASTE TAB -->
        <div v-if="activeTab === 'paste'" class="space-y-6 animate-fade-in">
          <div class="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <span class="material-symbols-outlined text-blue-500 mt-0.5">info</span>
            <div>
              <p class="text-sm text-blue-800 dark:text-blue-300 font-medium">Copie do Excel e cole aqui.</p>
              <p class="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">O formato ideal é ter colunas para: Nome, Email, Departamento (opcional).</p>
            </div>
          </div>

          <div class="relative group">
            <textarea 
              v-model="rawPasteData"
              @input="parseData"
              rows="6"
              class="w-full bg-gray-50 dark:bg-[#131c1e] border-2 border-dashed border-gray-300 dark:border-white/20 rounded-2xl p-4 text-sm text-gray-900 dark:text-gray-300 focus:outline-none focus:border-primary dark:focus:border-primary focus:bg-white dark:focus:bg-[#152326] transition-all resize-none font-mono"
              placeholder="Exemplo:&#10;João Silva    joao@empresa.com     TI&#10;Maria Santos  maria@empresa.com    Marketing"
            ></textarea>
            
            <div v-if="!rawPasteData" class="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
              <span class="material-symbols-outlined text-4xl text-gray-400 dark:text-slate-500 mb-2">content_paste_go</span>
            </div>
          </div>

          <div v-if="parsedUsers.length > 0" class="border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-black/20">
            <div class="bg-gray-50 dark:bg-white/5 py-2 px-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
              <span class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{{ parsedUsers.length }} usuários detectados</span>
              <button @click="processImport" :disabled="importing" class="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50">
                <span v-if="importing" class="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                <span v-else class="material-symbols-outlined text-[16px]">upload</span>
                Importar Todos
              </button>
            </div>
            <div class="max-h-60 overflow-y-auto">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                  <tr v-for="(u, idx) in parsedUsers" :key="idx" class="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ u.fullName }}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-slate-400">{{ u.email }}</td>
                    <td class="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">{{ u.department || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Status Alerts -->
          <div v-if="importError" class="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start gap-3">
             <span class="material-symbols-outlined text-red-500">error</span>
             <div>
               <p class="text-sm font-bold text-red-800 dark:text-red-400">{{ importError.message }}</p>
               <p v-if="importError.code === 'SEAT_LIMIT_REACHED'" class="text-xs text-red-600 dark:text-red-300 mt-1">Sua empresa atingiu o limite de licenças.</p>
             </div>
          </div>
          
          <div v-if="importSuccess" class="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-3">
             <span class="material-symbols-outlined text-emerald-500">check_circle</span>
             <p class="text-sm font-bold text-emerald-800 dark:text-emerald-400">{{ importSuccess }}</p>
          </div>
        </div>

        <!-- MAGIC LINK TAB -->
        <div v-else-if="activeTab === 'link'" class="space-y-6 animate-fade-in">
          <div class="bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-xl p-4 flex items-start gap-3">
            <span class="material-symbols-outlined text-purple-500 mt-0.5">celebration</span>
            <div>
              <p class="text-sm text-purple-800 dark:text-purple-300 font-medium">Link Mágico de Convite</p>
              <p class="text-xs text-purple-600/80 dark:text-purple-400/80 mt-1">Envie este link no grupo do WhatsApp da empresa. A equipe se cadastra sozinha e entra direto na sua organização.</p>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-4">
            <div class="flex-1">
              <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Limite de Usos</label>
              <select v-model="inviteConfig.maxUses" class="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary transition-all">
                <option :value="10">10 usos</option>
                <option :value="50">50 usos</option>
                <option :value="100">100 usos</option>
                <option :value="0">Ilimitado</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Validade</label>
              <select v-model="inviteConfig.expiresInDays" class="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary transition-all">
                <option :value="1">1 dia (24h)</option>
                <option :value="7">7 dias</option>
                <option :value="30">30 dias</option>
              </select>
            </div>
          </div>

          <button @click="generateInvite" :disabled="generatingLink" class="w-full py-3.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70">
            <span v-if="generatingLink" class="material-symbols-outlined animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined">add_link</span>
            {{ generatingLink ? 'Gerando...' : 'Gerar Novo Link Mágico' }}
          </button>

          <!-- Active Links List -->
          <div v-if="invites.length > 0" class="mt-8">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-4">Links Ativos</h3>
            <div class="space-y-3">
              <div v-for="invite in invites" :key="invite.id" class="p-4 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#152326] flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between group hover:border-primary/50 transition-colors">
                <div class="flex-1 min-w-0 pr-4">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Ativo</span>
                    <span class="text-xs text-gray-500 dark:text-slate-400 font-medium">Válido até {{ new Date(invite.expires_at).toLocaleDateString() }}</span>
                  </div>
                  <div class="font-mono text-sm text-gray-900 dark:text-primary truncate w-full cursor-pointer hover:underline" @click="copyLink(invite.code)" title="Clique para copiar">
                     {{ currentOrigin }}/join/{{ invite.code }}
                  </div>
                  <div class="w-full h-1.5 bg-gray-100 dark:bg-black/30 rounded-full overflow-hidden mt-2">
                    <div class="h-full bg-primary rounded-full transition-all" :style="{ width: invite.max_uses > 0 ? `${(invite.uses / invite.max_uses) * 100}%` : '5%' }"></div>
                  </div>
                  <div class="text-[10px] text-gray-400 font-medium mt-1">Usos: {{ invite.uses }} {{ invite.max_uses ? `/ ${invite.max_uses}` : '' }}</div>
                </div>
                
                <div class="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                  <button @click="copyLink(invite.code)" class="flex-1 sm:flex-none p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">content_copy</span>
                    <span class="text-xs font-bold sm:hidden">Copiar</span>
                  </button>
                  <button @click="deleteInvite(invite.code)" class="flex-1 sm:flex-none p-2 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                    <span class="text-xs font-bold sm:hidden">Revogar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      <div v-if="copiedText" class="absolute bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-full shadow-xl animate-fade-in-up flex items-center gap-2">
        <span class="material-symbols-outlined text-[16px]">check_circle</span> Link Copiado!
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { api } from '@/stores/auth'
import { useAuthStore } from '@/stores/auth'

const props = defineProps(['companyId'])
const emit = defineEmits(['close', 'imported'])
const authStore = useAuthStore()

const activeTab = ref('paste')
const rawPasteData = ref('')
const parsedUsers = ref([])

const importing = ref(false)
const importError = ref(null)
const importSuccess = ref('')

// Magic Links
const invites = ref([])
const generatingLink = ref(false)
const inviteConfig = ref({ maxUses: 50, expiresInDays: 7 })
const copiedText = ref(false)
const currentOrigin = computed(() => window.location.origin)

// -------- SMART PASTE LOGIC --------
function parseData() {
  const raw = rawPasteData.value.trim()
  if (!raw) {
    parsedUsers.value = []
    return
  }

  const lines = raw.split('\n')
  const results = []

  for (const line of lines) {
    // Tenta separar por Tab (Excel default) ou vírgula/ponto-e-vírgula (CSV)
    const columns = line.split(/\t|;|,/).map(c => c.trim()).filter(Boolean)
    
    if (columns.length >= 2) { // Nome e Email mínimos
      // Basic heuristics: find the one with '@' as email
      let emailIndex = columns.findIndex(c => c.includes('@'))
      
      if (emailIndex !== -1) {
        const email = columns[emailIndex]
        const nameCandidates = columns.filter((_, i) => i !== emailIndex)
        const fullName = nameCandidates[0] || email.split('@')[0]
        const department = nameCandidates[1] || ''

        // Generate a safe username
        const usernameBase = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '')
        const username = usernameBase.length >= 3 ? usernameBase : `${usernameBase}${Math.floor(Math.random()*1000)}`

        results.push({
          fullName,
          email,
          username,
          department
        })
      }
    }
  }

  parsedUsers.value = results
}

async function processImport() {
  if (parsedUsers.value.length === 0) return
  
  importing.value = true
  importError.value = null
  importSuccess.value = ''

  try {
    const response = await api.post('/users/bulk', { users: parsedUsers.value })
    if (response.data.success) {
      importSuccess.value = response.data.message
      rawPasteData.value = ''
      parsedUsers.value = []
      setTimeout(() => {
        emit('imported')
      }, 2000)
    }
  } catch (error) {
    importError.value = error.response?.data || { message: 'Erro ao importar usuários.' }
  } finally {
    importing.value = false
  }
}

// -------- MAGIC LINKS LOGIC --------
async function loadInvites() {
  if (!props.companyId) return
  try {
    const res = await api.get(`/companies/${props.companyId}/invites`)
    if (res.data.success) {
      invites.value = res.data.data
    }
  } catch (e) {
    console.error('Failed to load invites')
  }
}

async function generateInvite() {
  generatingLink.value = true
  try {
    const res = await api.post(`/companies/${props.companyId}/invites`, inviteConfig.value)
    if (res.data.success) {
      invites.value.unshift(res.data.data)
      copyLink(res.data.data.code)
    }
  } catch (e) {
    alert('Erro ao gerar link de convite')
  } finally {
    generatingLink.value = false
  }
}

async function deleteInvite(code) {
  if(!confirm('Tem certeza que deseja revogar este link? Usuários não poderão mais usá-lo.')) return
  
  try {
    const res = await api.delete(`/companies/${props.companyId}/invites/${code}`)
    if (res.data.success) {
      invites.value = invites.value.filter(i => i.code !== code)
    }
  } catch (e) {
    alert('Erro ao revogar')
  }
}

function copyLink(code) {
  const url = `${currentOrigin.value}/join/${code}`
  navigator.clipboard.writeText(url)
  copiedText.value = true
  setTimeout(() => copiedText.value = false, 3000)
}

onMounted(() => {
  loadInvites()
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(150, 150, 150, 0.2);
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: rgba(150, 150, 150, 0.4);
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-fade-in-up {
  animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
