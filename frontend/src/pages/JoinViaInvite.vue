<template>
  <div class="min-h-screen bg-[#0f171a] flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Starfield Background -->
    <div class="absolute inset-0 z-0">
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjMGYxNzFhIiAvPgo8Y2lyY2xlIGN4PSI0IiBjeT0iNCIgcj0iMC41IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjEiIC8+Cjwvc3ZnPg==')] opacity-50"></div>
      <!-- Glowing Orbs -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
    </div>

    <div class="w-full max-w-md relative z-10 animate-fade-in-up">
      <!-- Loading State -->
      <div v-if="isValidating" class="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 text-center shadow-2xl">
        <span class="material-symbols-outlined animate-spin text-primary text-4xl mb-4">progress_activity</span>
        <h2 class="text-xl font-bold text-white mb-2">Validando convite...</h2>
        <p class="text-slate-400 text-sm">Por favor, aguarde um momento.</p>
      </div>

      <!-- Invalid/Error State -->
      <div v-else-if="error" class="bg-red-500/10 backdrop-blur-xl rounded-3xl p-8 border border-red-500/20 text-center shadow-2xl">
        <div class="size-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/30">
          <span class="material-symbols-outlined text-red-500 text-3xl">error</span>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">Convite Inválido</h2>
        <p class="text-slate-400 text-sm mb-6">{{ error }}</p>
        <router-link to="/login" class="inline-flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-all border border-white/10">
          <span class="material-symbols-outlined text-lg">arrow_back</span>
          Voltar para Home
        </router-link>
      </div>

      <!-- Join Form -->
      <div v-else class="bg-[#131c1e]/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <div class="text-center mb-8">
          <div v-if="inviteData?.logoUrl" class="size-20 bg-black/50 rounded-2xl mx-auto mb-4 border border-white/10 overflow-hidden shadow-lg p-2">
            <img :src="inviteData.logoUrl" alt="Logo da Empresa" class="w-full h-full object-contain" />
          </div>
          <div v-else class="size-20 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-lg shadow-primary/20">
            <span class="material-symbols-outlined text-white text-3xl">corporate_fare</span>
          </div>
          
          <h2 class="text-2xl font-black text-white mb-1">Junte-se ao time!</h2>
          <p class="text-slate-400 text-sm">
            Você foi convidado para participar da <span class="font-bold text-white">{{ inviteData?.companyName }}</span>.
          </p>
        </div>

        <form @submit.prevent="handleJoin" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome Completo</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span class="material-symbols-outlined text-[20px]">badge</span>
              </span>
              <input 
                v-model="form.fullName"
                type="text" 
                required
                placeholder="Ex: Maria Santos"
                class="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nome de Usuário</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span class="material-symbols-outlined text-[20px]">person</span>
              </span>
              <input 
                v-model="form.username"
                type="text" 
                required
                placeholder="maria.santos"
                class="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600"
                @input="form.username = form.username.replace(/[^a-z0-9_.]/g, '').toLowerCase()"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">E-mail Corporativo</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span class="material-symbols-outlined text-[20px]">mail</span>
              </span>
              <input 
                v-model="form.email"
                type="email" 
                required
                placeholder="maria@suaempresa.com"
                class="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl pl-11 pr-4 py-3.5 focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Senha</label>
            <div class="relative">
              <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <span class="material-symbols-outlined text-[20px]">lock</span>
              </span>
              <input 
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'" 
                required
                placeholder="Sua senha secreta"
                class="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl pl-11 pr-11 py-3.5 focus:ring-1 focus:ring-primary focus:border-primary transition-all placeholder:text-slate-600"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword" 
                class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-white transition-colors"
                tabindex="-1"
              >
                <span class="material-symbols-outlined text-[20px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
          </div>

          <!-- Alert Context -->
          <div v-if="joinError" class="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-4">
             <p class="text-[13px] text-red-400 flex items-center gap-2">
               <span class="material-symbols-outlined text-[16px]">error</span>
               {{ joinError }}
             </p>
          </div>

          <button 
            type="submit" 
            :disabled="isJoining"
            class="w-full py-4 mt-6 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 group"
          >
            <span v-if="isJoining" class="material-symbols-outlined animate-spin">progress_activity</span>
            <span v-else class="material-symbols-outlined transition-transform group-hover:translate-x-1">login</span>
            {{ isJoining ? 'Criando conta...' : `Entrar na ${inviteData?.companyName}` }}
          </button>
        </form>

        <p class="text-center text-[10px] text-slate-500 mt-6">
          Ao se cadastrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const code = route.params.code
const isValidating = ref(true)
const error = ref(null)
const inviteData = ref(null)

const isJoining = ref(false)
const joinError = ref(null)
const showPassword = ref(false)

const form = reactive({
  fullName: '',
  username: '',
  email: '',
  password: ''
})

async function validateInvite() {
  try {
    const res = await api.get(`/auth/invites/${code}`)
    if (res.data.success) {
      inviteData.value = res.data.data
    }
  } catch (err) {
    if (err.response?.status === 404) {
      error.value = 'Este link mágico de convite não existe ou já foi revogado.'
    } else if (err.response?.status === 400) {
      error.value = err.response.data.message || 'Este convite não é mais válido.'
    } else {
      error.value = 'Erro de conexão ao tentar validar o convite.'
    }
  } finally {
    isValidating.value = false
  }
}

async function handleJoin() {
  isJoining.value = true
  joinError.value = null
  
  try {
    const res = await api.post(`/auth/invites/${code}/join`, form)
    if (res.data.success) {
      // Authenticate via store with the returned token
      authStore.setToken(res.data.data.accessToken, res.data.data.refreshToken)
      authStore.user = res.data.data.user
      authStore.isAuthenticated = true
      
      // Send to Chat
      router.push('/')
    }
  } catch (err) {
    if (err.response?.status === 409) {
      joinError.value = 'O nome de usuário ou e-mail já estão em uso. Escolha outros.'
    } else if (err.response?.data?.message) {
      joinError.value = err.response.data.message
    } else {
      joinError.value = 'Ocorreu um erro ao criar a conta. Tente novamente mais tarde.'
    }
  } finally {
    isJoining.value = false
  }
}

onMounted(() => {
  if (!code) {
    error.value = 'Código de convite ausente.'
    isValidating.value = false
    return
  }
  
  // If already logged in, show an error that you are logged in
  if (authStore.isAuthenticated) {
     error.value = 'Você já está logado em uma conta. Saia primeiro para usar o convite.'
     isValidating.value = false
     return
  }

  validateInvite()
})
</script>

<style scoped>
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
