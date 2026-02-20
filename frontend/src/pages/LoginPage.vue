<template>
  <div class="flex h-screen items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Login Card -->
    <div class="glass-panel w-full max-w-[440px] rounded-2xl p-8 sm:p-10 flex flex-col relative overflow-hidden animate-float bg-white dark:bg-[#13181b] border border-gray-200 dark:border-white/10 shadow-xl dark:shadow-none">
      <!-- Decorative Top Border Gradient -->
      <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent shadow-[0_0_15px_rgba(0,212,255,0.5)]"></div>
      
      <!-- Header Section -->
      <div class="flex flex-col items-center mb-10">
        <!-- Animated Logo -->
        <div class="relative group mb-6">
          <div class="absolute -inset-2 bg-primary/30 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
          <div class="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#13181b] border border-gray-200 dark:border-white/10 shadow-lg dark:shadow-2xl">
            <span class="material-symbols-outlined text-primary text-4xl group-hover:scale-110 transition-transform duration-300" style="font-variation-settings: 'FILL' 1, 'wght' 600;">hub</span>
          </div>
        </div>
        <h1 class="text-gray-900 dark:text-white tracking-tight text-3xl font-bold leading-tight text-center mb-2">{{ locale.t.login.title }}</h1>
        <p class="text-gray-500 dark:text-slate-400 text-sm font-normal text-center max-w-[280px]">{{ locale.t.login.subtitle }}</p>
      </div>
      
      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="flex flex-col gap-6 w-full">
        <!-- Username Input -->
        <div class="relative group">
          <input 
            v-model="form.username"
            type="text" 
            id="username" 
            placeholder=" "
            class="floating-input bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-300 dark:border-white/20 focus:border-primary peer"
            :disabled="loading"
          />
          <label for="username" class="floating-label text-gray-500 dark:text-slate-400 peer-focus:text-primary dark:peer-focus:text-primary bg-white dark:bg-transparent px-1">{{ locale.t.login.username }}</label>
          <div class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none peer-focus:text-primary transition-colors">
            <span class="material-symbols-outlined text-[20px]">badge</span>
          </div>
        </div>
        
        <!-- Password Input -->
        <div class="relative group">
          <input 
            v-model="form.password"
            :type="showPassword ? 'text' : 'password'" 
            id="password" 
            placeholder=" "
            class="floating-input pr-12 bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-300 dark:border-white/20 focus:border-primary peer"
            :disabled="loading"
          />
          <label for="password" class="floating-label text-gray-500 dark:text-slate-400 peer-focus:text-primary dark:peer-focus:text-primary bg-white dark:bg-transparent px-1">{{ locale.t.login.password }}</label>
          <button 
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white transition-colors focus:outline-none"
          >
            <span class="material-symbols-outlined text-[20px]">
              {{ showPassword ? 'visibility_off' : 'visibility' }}
            </span>
          </button>
        </div>
        
        <!-- Error Message -->
        <div v-if="error" class="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20">
          {{ error }}
        </div>
        
        <!-- Remember Me & Forgot Password -->
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-3 cursor-pointer group select-none">
            <div class="relative">
              <input v-model="form.remember" type="checkbox" class="peer sr-only" />
              <div class="block w-10 h-6 bg-gray-200 dark:bg-slate-700/30 rounded-full border border-gray-300 dark:border-white/10 peer-checked:bg-primary/20 peer-checked:border-primary/50 transition-all"></div>
              <div class="absolute left-1 top-1 bg-white dark:bg-slate-400 w-4 h-4 rounded-full transition-all peer-checked:translate-x-4 peer-checked:bg-primary shadow-sm dark:shadow-[0_0_10px_rgba(0,212,255,0.5)]"></div>
            </div>
            <span class="text-sm text-gray-500 dark:text-slate-400 group-hover:text-gray-700 dark:group-hover:text-slate-200 transition-colors">{{ locale.t.login.remember }}</span>
          </label>
          <button type="button" @click="showForgotModal = true" class="text-sm font-medium text-primary hover:text-cyan-600 dark:hover:text-primary hover:underline underline-offset-4 transition-colors">{{ locale.t.login.forgot }}</button>
        </div>
        
        <!-- Submit Button -->
        <button type="submit" class="relative w-full group mt-2" :disabled="loading">
          <div class="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-40 group-hover:opacity-75 transition duration-200"></div>
          <div class="relative w-full bg-gradient-to-r from-primary to-secondary text-white font-bold py-3.5 rounded-lg shadow-xl flex items-center justify-center gap-2 transform transition-all active:scale-[0.98] hover:brightness-110">
            <span v-if="loading" class="animate-spin">
              <span class="material-symbols-outlined">progress_activity</span>
            </span>
            <span v-else class="tracking-wide">{{ locale.t.login.signin }}</span>
            <span v-if="!loading" class="material-symbols-outlined text-xl">arrow_forward</span>
          </div>
        </button>
      </form>
      
      <!-- Footer -->
      <div class="mt-8 pt-6 border-t border-gray-200 dark:border-white/5 flex flex-col items-center gap-3">
        <a class="text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white text-xs transition-colors flex items-center gap-2 group" href="#">
          <span class="p-1 rounded-full bg-gray-100 dark:bg-white/5 group-hover:bg-gray-200 dark:group-hover:bg-white/10 transition-colors">
            <span class="material-symbols-outlined text-sm">contact_support</span>
          </span>
          {{ locale.t.login.contact }}
        </a>
        <p class="text-gray-400 dark:text-slate-600 text-[10px] uppercase tracking-wider font-semibold">v3.0.0 • {{ locale.t.login.secure }}</p>
      </div>
    </div>

    <!-- Forgot Password Modal -->
    <Transition name="fade">
      <div v-if="showForgotModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="closeForgotModal">
        <div class="w-full max-w-md bg-white dark:bg-[#13181b] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden animate-float">
          <!-- Modal Header -->
          <div class="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-xl bg-primary/10">
                <span class="material-symbols-outlined text-primary text-2xl">lock_reset</span>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ locale.t.login.forgotTitle || 'Esqueceu sua senha?' }}</h3>
                <p class="text-sm text-gray-500 dark:text-slate-400">{{ locale.t.login.forgotSubtitle || 'Informe seu usuário para solicitar reset' }}</p>
              </div>
            </div>
            <button @click="closeForgotModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
              <span class="material-symbols-outlined text-gray-500 dark:text-slate-400">close</span>
            </button>
          </div>
          
          <!-- Modal Body -->
          <div class="p-6">
            <!-- Success State -->
            <div v-if="forgotSuccess" class="text-center py-6">
              <div class="size-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-400/20 flex items-center justify-center">
                <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-3xl">check_circle</span>
              </div>
              <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">{{ locale.t.login.forgotSuccessTitle || 'Solicitação Enviada!' }}</h4>
              <p class="text-gray-500 dark:text-slate-400 text-sm">{{ forgotSuccess }}</p>
              <button @click="closeForgotModal" class="mt-6 px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:brightness-110 transition-all">
                {{ locale.t.login.forgotClose || 'Fechar' }}
              </button>
            </div>

            <!-- Form State -->
            <div v-else class="space-y-4">
              <div class="relative">
                <input 
                  v-model="forgotUsername"
                  type="text" 
                  placeholder=" "
                  class="floating-input bg-gray-50 dark:bg-transparent text-gray-900 dark:text-white border-gray-300 dark:border-white/20 focus:border-primary peer"
                  :disabled="forgotLoading"
                />
                <label class="floating-label text-gray-500 dark:text-slate-400 peer-focus:text-primary dark:peer-focus:text-primary bg-white dark:bg-transparent px-1">
                  {{ locale.t.login.forgotInput || 'Username ou Email' }}
                </label>
              </div>

              <!-- Error Message -->
              <div v-if="forgotError" class="text-red-500 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20">
                {{ forgotError }}
              </div>

              <p class="text-xs text-gray-500 dark:text-slate-500 text-center">
                {{ locale.t.login.forgotInfo || 'Um administrador será notificado e irá resetar sua senha.' }}
              </p>

              <button 
                @click="handleForgotPassword" 
                :disabled="forgotLoading || !forgotUsername.trim()"
                class="w-full bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold py-3 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="forgotLoading" class="material-symbols-outlined animate-spin">progress_activity</span>
                <span class="material-symbols-outlined" v-else>send</span>
                <span>{{ locale.t.login.forgotSubmit || 'Solicitar Reset' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, api } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useLocaleStore } from '@/stores/locale'

const router = useRouter()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const locale = useLocaleStore()

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

// Forgot Password Modal
const showForgotModal = ref(false)
const forgotUsername = ref('')
const forgotLoading = ref(false)
const forgotError = ref('')
const forgotSuccess = ref('')

// Load saved username and initialize
onMounted(() => {
    // Load remembered username
    const rememberedUsername = localStorage.getItem('rememberedUsername')
    if (rememberedUsername) {
        form.username = rememberedUsername
        form.remember = true
    }
    
    // Initialize Theme
    const savedSettings = localStorage.getItem('settings')
    if (savedSettings) {
        const { theme } = JSON.parse(savedSettings)
        const root = document.documentElement
        if (theme === 'dark') {
            root.classList.add('dark'); root.classList.remove('light');
        } else if (theme === 'light') {
            root.classList.add('light'); root.classList.remove('dark');
        }
    }
})

async function handleLogin() {
  if (!form.username || !form.password) {
    error.value = locale.t.login.error
    return
  }
  
  loading.value = true
  error.value = ''
  
  const result = await authStore.login(form.username, form.password)
  
  if (result.success) {
    // Handle Remember Me
    if (form.remember) {
      localStorage.setItem('rememberedUsername', form.username)
    } else {
      localStorage.removeItem('rememberedUsername')
    }
    
    socketStore.connect()
    router.push('/')
  } else {
    error.value = result.message
  }
  
  loading.value = false
}

async function handleForgotPassword() {
  if (!forgotUsername.value.trim()) return
  
  forgotLoading.value = true
  forgotError.value = ''
  forgotSuccess.value = ''
  
  try {
    const response = await api.post('/auth/forgot-password', {
      username: forgotUsername.value.trim()
    })
    
    if (response.data.success) {
      forgotSuccess.value = response.data.message
    } else {
      forgotError.value = response.data.message
    }
  } catch (err) {
    forgotError.value = err.response?.data?.message || 'Erro ao processar solicitação'
  } finally {
    forgotLoading.value = false
  }
}

function closeForgotModal() {
  showForgotModal.value = false
  forgotUsername.value = ''
  forgotError.value = ''
  forgotSuccess.value = ''
}
</script>
