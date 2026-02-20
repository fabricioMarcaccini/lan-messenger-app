<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Left Sidebar (Navigation) -->
    <aside class="w-[280px] flex-shrink-0 flex flex-col glass-panel border-r border-gray-200 dark:border-glass-border h-full z-20 bg-white dark:bg-transparent">
      <!-- User Profile -->
      <div class="p-6 border-b border-gray-100 dark:border-glass-border">
        <div class="flex items-center gap-4">
          <div class="relative">
            <div 
              class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12 ring-2 ring-primary/20"
              :style="{ backgroundImage: `url(${authStore.user?.avatarUrl || defaultAvatar})` }"
            ></div>
            <div class="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full border-2 border-white dark:border-background-dark"></div>
          </div>
          <div class="flex flex-col">
            <h1 class="text-gray-900 dark:text-white text-base font-bold leading-tight tracking-tight">{{ authStore.user?.fullName || authStore.user?.username }}</h1>
            <span class="text-primary text-xs font-medium tracking-wide">{{ locale.t.profile.connected }}</span>
          </div>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
        <div class="flex flex-col gap-1">
          <router-link to="/network" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <span class="material-symbols-outlined group-hover:text-primary transition-colors">hub</span>
            <span class="text-sm font-medium">{{ locale.t.nav.network }}</span>
          </router-link>
          
          <router-link to="/" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <span class="material-symbols-outlined group-hover:text-primary transition-colors">chat</span>
            <span class="text-sm font-medium">{{ locale.t.nav.chat }}</span>
          </router-link>
          
          <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 text-gray-900 dark:text-white border border-primary/20 shadow-sm dark:shadow-neon" href="#">
            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">settings</span>
            <span class="text-sm font-medium">{{ locale.t.nav.settings }}</span>
          </a>
          
          <router-link v-if="authStore.isAdmin" to="/admin/users" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <span class="material-symbols-outlined group-hover:text-purple-400 transition-colors">admin_panel_settings</span>
            <span class="text-sm font-medium">{{ locale.t.nav.admin }}</span>
          </router-link>
        </div>
      </nav>
      
      <!-- Bottom Info -->
      <div class="p-4 border-t border-gray-100 dark:border-glass-border">
        <button 
          @click="handleLogout"
          class="flex items-center justify-center gap-2 w-full px-4 py-2 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-medium"
        >
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>{{ locale.t.auth?.logout || 'Sign Out' }}</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col bg-white dark:bg-background-dark/30 backdrop-blur-sm relative min-w-0 transition-colors duration-300 overflow-y-auto">
      <div class="p-8 max-w-4xl mx-auto w-full">
        <header class="mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">{{ locale.t.settings.title }}</h1>
          <p class="text-gray-500 dark:text-slate-400">{{ locale.t.settings.subtitle }}</p>
        </header>

        <!-- Profile Section -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">person</span>
            {{ locale.t.settings.personalInfo }}
          </h2>
          
          <div class="flex flex-col md:flex-row gap-8 items-start">
            <!-- Avatar -->
            <div class="flex flex-col items-center gap-4">
              <div 
                class="size-32 bg-center bg-no-repeat bg-cover rounded-full ring-4 ring-gray-50 dark:ring-glass-border shadow-md cursor-pointer relative group"
                :style="{ backgroundImage: `url(${formData.avatarUrl || authStore.user?.avatarUrl || defaultAvatar})` }"
                @click="openAvatarModal"
              >
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                  <span class="material-symbols-outlined text-white text-3xl">edit</span>
                </div>
              </div>
              <button 
                @click="openAvatarModal"
                class="text-sm text-primary hover:text-primary-hover font-medium hover:underline"
              >
                {{ locale.t.profile.change }}
              </button>
            </div>

            <!-- Form -->
            <div class="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.settings.displayName }}</label>
                <input 
                  v-model="formData.fullName"
                  type="text" 
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              
              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Username</label>
                <input 
                  v-model="formData.username"
                  type="text" 
                  disabled
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/5 text-gray-500 dark:text-slate-500 cursor-not-allowed"
                />
              </div>

              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.settings.email }}</label>
                <input 
                  v-model="formData.email"
                  type="email" 
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>

              <div class="group">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.profile.status }}</label>
                <select 
                  v-model="formData.status"
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end">
             <button 
                @click="saveProfile"
                :disabled="loading"
                class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="loading" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span>{{ locale.t.profile.saveChanges }}</span>
              </button>
          </div>
        </section>

        <!-- Appearance Section -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">palette</span>
            {{ locale.t.settings.appearance }}
          </h2>
          
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
            <div class="flex items-center gap-4">
              <div class="size-10 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-slate-300">
                <span class="material-symbols-outlined">{{ themeStore.isDark ? 'dark_mode' : 'light_mode' }}</span>
              </div>
              <div>
                <h3 class="font-medium text-gray-900 dark:text-white">{{ locale.t.profile.darkMode }}</h3>
                <p class="text-sm text-gray-500 dark:text-slate-400">{{ themeStore.isDark ? locale.t.profile.darkDescription : locale.t.profile.lightDescription }}</p>
              </div>
            </div>
            
            <button 
              @click="themeStore.toggleTheme"
              class="relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 dark:focus:ring-offset-background-dark"
              :class="themeStore.isDark ? 'bg-primary' : 'bg-gray-200'"
            >
              <span
                class="inline-block size-6 transform rounded-full bg-white transition shadow-sm"
                :class="themeStore.isDark ? 'translate-x-[26px]' : 'translate-x-1'"
              />
            </button>
          </div>
        </section>

         <!-- Language Section -->
        <section class="p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">language</span>
            {{ locale.t.settings.language }}
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
                @click="locale.setLanguage('pt')"
                :class="[
                  'p-4 rounded-xl border flex items-center gap-4 transition-all',
                   locale.currentLang === 'pt' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 dark:border-white/10 hover:border-primary/50 text-gray-600 dark:text-slate-300'
                ]"
            >
                <span class="text-2xl">🇧🇷</span>
                <span class="font-medium">Português (Brasil)</span>
                 <span v-if="locale.currentLang === 'pt'" class="material-symbols-outlined ml-auto">check_circle</span>
            </button>

             <button 
                @click="locale.setLanguage('en')"
                :class="[
                  'p-4 rounded-xl border flex items-center gap-4 transition-all',
                   locale.currentLang === 'en' 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : 'border-gray-200 dark:border-white/10 hover:border-primary/50 text-gray-600 dark:text-slate-300'
                ]"
            >
                <span class="text-2xl">🇺🇸</span>
                <span class="font-medium">English</span>
                <span v-if="locale.currentLang === 'en'" class="material-symbols-outlined ml-auto">check_circle</span>
            </button>
          </div>
        </section>

        <!-- Security Section - Change Password -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span class="material-symbols-outlined text-primary">lock</span>
            {{ locale.t.settings.security || 'Segurança' }}
          </h2>
          
          <div class="space-y-4">
            <!-- Current Password -->
            <div class="group">
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.settings.currentPassword || 'Senha Atual' }}</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.currentPassword"
                  :type="showCurrentPassword ? 'text' : 'password'" 
                  class="w-full px-4 py-2.5 pr-12 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  :placeholder="locale.t.settings.currentPasswordPlaceholder || 'Digite sua senha atual'"
                />
                <button 
                  type="button"
                  @click="showCurrentPassword = !showCurrentPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white"
                >
                  <span class="material-symbols-outlined text-[20px]">{{ showCurrentPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- New Password -->
            <div class="group">
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.settings.newPassword || 'Nova Senha' }}</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.newPassword"
                  :type="showNewPassword ? 'text' : 'password'" 
                  class="w-full px-4 py-2.5 pr-12 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  :placeholder="locale.t.settings.newPasswordPlaceholder || 'Digite sua nova senha'"
                />
                <button 
                  type="button"
                  @click="showNewPassword = !showNewPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white"
                >
                  <span class="material-symbols-outlined text-[20px]">{{ showNewPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Confirm New Password -->
            <div class="group">
              <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.settings.confirmPassword || 'Confirmar Nova Senha' }}</label>
              <div class="relative">
                <input 
                  v-model="passwordForm.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'" 
                  class="w-full px-4 py-2.5 pr-12 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  :placeholder="locale.t.settings.confirmPasswordPlaceholder || 'Confirme sua nova senha'"
                />
                <button 
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-white"
                >
                  <span class="material-symbols-outlined text-[20px]">{{ showConfirmPassword ? 'visibility_off' : 'visibility' }}</span>
                </button>
              </div>
            </div>

            <!-- Password Error/Success Messages -->
            <div v-if="passwordError" class="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20">
              {{ passwordError }}
            </div>
            <div v-if="passwordSuccess" class="text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-400/10 py-2 px-4 rounded-lg border border-green-200 dark:border-green-400/20 flex items-center gap-2">
              <span class="material-symbols-outlined text-lg">check_circle</span>
              {{ passwordSuccess }}
            </div>

            <!-- Change Password Button -->
            <div class="flex justify-end pt-2">
              <button 
                @click="handleChangePassword"
                :disabled="changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword"
                class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="changingPassword" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span class="material-symbols-outlined text-lg" v-else>lock_reset</span>
                <span>{{ locale.t.settings.changePassword || 'Alterar Senha' }}</span>
              </button>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>

<!-- Avatar Selection Modal -->
<div v-if="showAvatarModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
  <div class="bg-white dark:bg-[#131c1e] w-full max-w-2xl rounded-2xl p-6 relative border border-gray-200 dark:border-white/10 shadow-xl flex flex-col max-h-[90vh]">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ locale.t.profile.changeAvatar || 'Alterar Avatar' }}</h2>
      <button @click="showAvatarModal = false" class="text-gray-400 hover:text-gray-900 dark:hover:text-white">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 mb-6 border-b border-gray-200 dark:border-white/10">
      <button 
        @click="avatarTab = 'gallery'"
        class="pb-2 px-4 font-medium transition-colors relative"
        :class="avatarTab === 'gallery' ? 'text-primary' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'"
      >
        Galeria
        <div v-if="avatarTab === 'gallery'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
      <button 
        @click="avatarTab = 'upload'"
        class="pb-2 px-4 font-medium transition-colors relative"
        :class="avatarTab === 'upload' ? 'text-primary' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'"
      >
        Upload
        <div v-if="avatarTab === 'upload'" class="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></div>
      </button>
    </div>

    <!-- Gallery Content -->
    <div v-if="avatarTab === 'gallery'" class="flex-1 overflow-y-auto min-h-[300px] p-1">
      <div class="grid grid-cols-3 sm:grid-cols-4 gap-4">
        <!-- Gallery Items -->
        <button 
          v-for="(avatar, index) in galleryAvatars" 
          :key="index"
          @click="selectAvatar(avatar)"
          class="aspect-square rounded-xl border-2 border-transparent hover:border-primary hover:bg-gray-50 dark:hover:bg-white/5 transition-all p-2 flex items-center justify-center relative group"
          :class="{ 'border-primary bg-primary/5': formData.avatarUrl === avatar }"
        >
          <img :src="avatar" class="w-full h-full object-contain rounded-lg" alt="Avatar option" loading="lazy">
          <div v-if="formData.avatarUrl === avatar" class="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5 shadow-sm">
            <span class="material-symbols-outlined text-xs">check</span>
          </div>
        </button>
      </div>
    </div>

    <!-- Upload Content -->
    <div v-if="avatarTab === 'upload'" class="flex-1 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl hover:border-primary/50 transition-colors bg-gray-50 dark:bg-black/20"
         @dragover.prevent
         @drop.prevent="handleDrop"
    >
      <div class="text-center p-8" v-if="!uploadingAvatar">
        <div class="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
          <span class="material-symbols-outlined text-4xl">cloud_upload</span>
        </div>
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">Arraste uma imagem ou clique para selecionar</h3>
        <p class="text-gray-500 dark:text-slate-400 text-sm mb-6 max-w-xs mx-auto">Suporta JPG, PNG, GIF (animado) e WebP. Máximo 5MB.</p>
        
        <input type="file" ref="fileInput" class="hidden" accept="image/*" @change="handleAvatarUpload">
        
        <button 
          @click="$refs.fileInput.click()"
          class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold rounded-xl shadow-lg transition-all"
        >
          Selecionar Arquivo
        </button>
      </div>
      <div class="text-center p-8" v-else>
         <div class="material-symbols-outlined text-4xl text-primary animate-spin mb-4">progress_activity</div>
         <p class="text-gray-500 dark:text-slate-400">Enviando imagem...</p>
      </div>
    </div>

  </div>
</div>

</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, api } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'

const router = useRouter()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const locale = useLocaleStore()

const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'
const loading = ref(false)

const formData = ref({
  fullName: '',
  username: '',
  email: '',
  status: 'online',
  avatarUrl: ''
})

// Avatar Selection
const showAvatarModal = ref(false)
const avatarTab = ref('gallery')
const uploadingAvatar = ref(false)
const fileInput = ref(null)

// Lista de avatares estilo cartoons/bots/emojis 
const galleryAvatars = [
  // Avataaars (Humanos)
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Lily',
  
  // Bottts (Robôs)
  'https://api.dicebear.com/7.x/bottts/svg?seed=Zoom',
  'https://api.dicebear.com/7.x/bottts/svg?seed=C3PO',
  'https://api.dicebear.com/7.x/bottts/svg?seed=R2D2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Bender',
  'https://api.dicebear.com/7.x/bottts/svg?seed=WallE',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Eve',
  
  // Fun Emoji
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Surprise',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Silly', 
]

function openAvatarModal() {
  showAvatarModal.value = true
}

function selectAvatar(url) {
  formData.value.avatarUrl = url
  // Don't close immediately, let user confirm by saving or just clicking outside/close
  // Or auto-save? Let's just update preview and keep modal open or close it.
  // Better to update preview and close
  showAvatarModal.value = false
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  await processAvatarFile(file)
}

function handleDrop(event) {
  const file = event.dataTransfer.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    alert('Apenas arquivos de imagem são permitidos')
    return
  }
  processAvatarFile(file)
}

async function processAvatarFile(file) {
  uploadingAvatar.value = true
  
  try {
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    
    // Use the upload route we already tested
    const response = await api.post('/uploads', formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    if (response.data.success) {
      formData.value.avatarUrl = response.data.data.url
      showAvatarModal.value = false
    }
  } catch (error) {
    console.error('Failed to upload avatar:', error)
    alert('Erro ao enviar imagem. Tente novamente.')
  } finally {
    uploadingAvatar.value = false
  }
}

// Password change form
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const changingPassword = ref(false)
const passwordError = ref('')
const passwordSuccess = ref('')

onMounted(() => {
  if (authStore.user) {
    formData.value = {
      fullName: authStore.user.fullName || '',
      username: authStore.user.username || '',
      email: authStore.user.email || '',
      status: authStore.user.status || 'online',
      avatarUrl: authStore.user.avatarUrl || ''
    }
  }
})

async function saveProfile() {
  loading.value = true
  try {
    await authStore.updateProfile(formData.value)
    // Show success notification (could use a toast store here)
  } catch (error) {
    console.error('Failed to update profile:', error)
  } finally {
    loading.value = false
  }
}

async function handleChangePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  
  // Validate passwords match
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    passwordError.value = locale.t.settings?.passwordMismatch || 'As senhas não coincidem'
    return
  }
  
  // Validate minimum length
  if (passwordForm.newPassword.length < 6) {
    passwordError.value = locale.t.settings?.passwordTooShort || 'A senha deve ter pelo menos 6 caracteres'
    return
  }
  
   changingPassword.value = true
  
  try {
    const result = await authStore.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
    
    if (result.success) {
      passwordSuccess.value = result.message
      // Clear form
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      passwordError.value = result.message
    }
  } catch (error) {
    passwordError.value = 'Erro ao alterar senha'
    console.error('Failed to change password:', error)
  } finally {
    changingPassword.value = false
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
