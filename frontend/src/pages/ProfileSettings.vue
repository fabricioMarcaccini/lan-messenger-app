<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-background-dark transition-colors duration-300">
    <!-- Mobile Sidebar Overlay -->
    <div v-if="showMobileSidebar" class="fixed inset-0 bg-black/50 z-30 md:hidden" @click="showMobileSidebar = false"></div>

    <!-- Left Sidebar (Navigation) -->
    <aside :class="['flex-shrink-0 flex flex-col glass-panel border-r border-gray-200 dark:border-glass-border h-full bg-white dark:bg-[#131c1e] md:dark:bg-transparent w-[280px] absolute md:relative z-40 transition-transform duration-300', showMobileSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0']">
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
            <img src="/lanly-logo.png" alt="Lanly Logo" class="h-6 w-6 object-contain filter grayscale group-hover:grayscale-0 transition-all" />
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
      <div class="p-4 md:p-8 max-w-4xl mx-auto w-full">
        <header class="mb-8 flex items-start gap-4">
          <!-- Mobile Menu Toggle -->
          <button @click="showMobileSidebar = true" class="md:hidden size-10 rounded-xl bg-gray-200 dark:bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-gray-600 dark:text-white shrink-0 mt-1">
            <span class="material-symbols-outlined text-xl">menu</span>
          </button>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              {{ locale.t.settings.title }}
              <div class="relative flex items-center group cursor-help z-[100]">
                <span class="material-symbols-outlined text-primary/70 group-hover:text-primary transition-colors text-[28px]">help</span>
                <div class="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm leading-relaxed font-medium rounded-xl shadow-xl pointer-events-none transform -translate-x-2 group-hover:translate-x-0 border border-transparent dark:border-gray-200">
                  Configure seu perfil, troque de foto, mude senhas e altere a aparência visual do aplicativo.
                  <div class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rotate-45 border-l border-b border-transparent dark:border-gray-200"></div>
                </div>
              </div>
            </h1>
            <p class="text-gray-500 dark:text-slate-400">{{ locale.t.settings.subtitle }}</p>
          </div>
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
                <div v-if="statusForm.emoji" class="absolute -bottom-1 -right-1 size-8 rounded-full bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 flex items-center justify-center text-lg">
                  {{ statusForm.emoji }}
                </div>
              </div>
              <button 
                @click="openAvatarModal"
                class="text-sm text-primary hover:text-primary-hover font-medium hover:underline"
              >
                {{ locale.t.profile.change }}
              </button>
              <button
                @click="showStatusModal = true"
                class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
              >
                Status personalizado
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
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">{{ locale.t.profile.status }} <span class="text-[10px] text-gray-400 font-normal ml-1" title="Seu status online, visível para todos os contatos">(?)</span></label>
                <select 
                  v-model="formData.status"
                  class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all mb-3"
                  title="Altere como as outras pessoas veem o seu status (Online, Ocupado, Ausente)"
                >
                  <option value="online">Online</option>
                  <option value="busy">Busy</option>
                  <option value="away">Away</option>
                </select>
                <button 
                  @click="showStatusModal = true" 
                  class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-semibold text-sm"
                >
                  <span class="material-symbols-outlined text-lg">mood</span>
                  Definir Status Customizado
                </button>
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

        <!-- Subscription & Pricing Section -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">credit_card</span>
              Plano & Assinatura
            </h2>
            <div v-if="subStore.hasSubscription" class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                :class="subStore.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'">
                <span class="size-2 rounded-full" :class="subStore.isActive ? 'bg-green-500' : 'bg-yellow-500'"></span>
                {{ subStore.isActive ? 'Ativo' : subStore.subscriptionStatus }}
              </span>
              <button @click="handleOpenPortal"
                class="text-xs text-primary hover:text-cyan-400 font-medium hover:underline flex items-center gap-1">
                <span class="material-symbols-outlined text-sm">settings</span>
                Gerenciar
              </button>
            </div>
          </div>

          <!-- Seats Info Bar -->
          <div v-if="subStore.hasSubscription" class="mb-6 p-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-600 dark:text-slate-300">Usuários ativos</span>
              <span class="text-sm font-bold text-gray-900 dark:text-white">{{ subStore.activeUsers }} / {{ subStore.maxSeats }} seats</span>
            </div>
            <div class="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
              <div class="bg-primary rounded-full h-2 transition-all duration-500"
                :style="{ width: `${Math.min(100, (subStore.activeUsers / subStore.maxSeats) * 100)}%` }"
                :class="subStore.activeUsers >= subStore.maxSeats ? 'bg-red-500' : 'bg-primary'"></div>
            </div>
            <p v-if="subStore.activeUsers >= subStore.maxSeats" class="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1">
              <span class="material-symbols-outlined text-sm">warning</span>
              Limite de seats atingido. Adicione mais no portal de assinatura.
            </p>
          </div>

          <!-- Seats Selector (for new checkout) -->
          <div v-if="!subStore.hasSubscription" class="mb-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Quantos usuários (seats) você precisa?</label>
            <div class="flex items-center gap-4">
              <button @click="selectedSeats = Math.max(1, selectedSeats - 1)"
                class="size-10 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-white">
                <span class="material-symbols-outlined">remove</span>
              </button>
              <input v-model.number="selectedSeats" type="number" min="1" max="500"
                class="w-20 text-center text-2xl font-bold bg-transparent border-b-2 border-primary text-gray-900 dark:text-white focus:outline-none" />
              <button @click="selectedSeats = Math.min(500, selectedSeats + 1)"
                class="size-10 rounded-xl bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-700 dark:text-white">
                <span class="material-symbols-outlined">add</span>
              </button>
              <span class="text-sm text-gray-500 dark:text-slate-400">usuários</span>
            </div>
          </div>

          <!-- Pricing Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="plan in subStore.plans" :key="plan.id"
              class="relative flex flex-col p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg group"
              :class="[
                subStore.currentPlan === plan.id 
                  ? `${plan.borderColor} bg-gradient-to-b from-white to-gray-50 dark:from-glass-surface dark:to-background-dark shadow-md ring-2 ring-primary/20` 
                  : 'border-gray-200 dark:border-white/10 bg-white dark:bg-glass-surface hover:border-primary/30',
              ]">
              <!-- Badge -->
              <div v-if="plan.badge" class="absolute -top-3 left-1/2 -translate-x-1/2">
                <span class="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                  :class="plan.id === 'medium' ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'">
                  {{ plan.badge }}
                </span>
              </div>

              <!-- Plan Icon & Name -->
              <div class="flex items-center gap-3 mb-3 mt-1">
                <div class="size-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-md" :class="plan.color">
                  <span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">{{ plan.icon }}</span>
                </div>
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ plan.name }}</h3>
                  <p class="text-xs text-gray-500 dark:text-slate-400">{{ plan.description }}</p>
                </div>
              </div>

              <!-- Price -->
              <div class="mb-4">
                <div class="flex items-baseline gap-1">
                  <span class="text-sm text-gray-500 dark:text-slate-400">R$</span>
                  <span class="text-3xl font-black text-gray-900 dark:text-white">{{ plan.price.toFixed(2).replace('.', ',') }}</span>
                  <span class="text-sm text-gray-500 dark:text-slate-400">{{ plan.period }}</span>
                </div>
                <p v-if="!subStore.hasSubscription && selectedSeats > 1" class="text-xs text-primary font-medium mt-1">
                  Total: R$ {{ (plan.price * selectedSeats).toFixed(2).replace('.', ',') }}/mês ({{ selectedSeats }} usuários)
                </p>
              </div>

              <!-- Features -->
              <ul class="flex-1 space-y-2 mb-4">
                <li v-for="(feat, fi) in plan.features" :key="fi" class="flex items-center gap-2 text-sm">
                  <span class="material-symbols-outlined text-base" :class="feat.included ? 'text-green-500' : 'text-gray-300 dark:text-white/20'">
                    {{ feat.included ? 'check_circle' : 'cancel' }}
                  </span>
                  <span :class="feat.included ? 'text-gray-700 dark:text-slate-300' : 'text-gray-400 dark:text-white/30 line-through'">{{ feat.text }}</span>
                </li>
              </ul>

              <!-- Action Button -->
              <button v-if="subStore.currentPlan === plan.id && subStore.isActive"
                disabled
                class="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-400 font-bold text-sm cursor-default flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-base">verified</span>
                Plano Atual
              </button>
              <button v-else
                @click="handleCheckout(plan.id)"
                :disabled="subStore.checkoutLoading"
                class="w-full py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                :class="`bg-gradient-to-r ${plan.color} hover:opacity-90`">
                <span v-if="subStore.checkoutLoading" class="material-symbols-outlined animate-spin text-base">progress_activity</span>
                <span class="material-symbols-outlined text-base" v-else>upgrade</span>
                {{ subStore.currentPlan === 'free' ? 'Assinar' : 'Fazer Upgrade' }}
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="subStore.error" class="mt-4 text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-400/10 py-2 px-4 rounded-lg border border-red-200 dark:border-red-400/20 flex items-center gap-2">
            <span class="material-symbols-outlined text-base">error</span>
            {{ subStore.error }}
          </div>

          <!-- Checkout Success Toast -->
          <div v-if="showCheckoutSuccess" class="mt-4 text-green-600 dark:text-green-400 text-sm bg-green-50 dark:bg-green-400/10 py-3 px-4 rounded-lg border border-green-200 dark:border-green-400/20 flex items-center gap-2">
            <span class="material-symbols-outlined text-base">celebration</span>
            <div>
              <p class="font-bold">Assinatura ativada com sucesso! 🎉</p>
              <p class="text-xs mt-0.5">Seu plano já está ativo. Aproveite todos os recursos.</p>
            </div>
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

        <!-- AI Settings Section (Admin Only) -->
        <section v-if="authStore.isAdmin" class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">smart_toy</span>
              Inteligência Artificial (BYOK)
            </h2>
            <div class="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <span class="material-symbols-outlined text-primary text-sm">stars</span>
              <span class="text-sm font-bold text-gray-900 dark:text-white">Créditos: {{ aiSettingsForm.aiCreditsBalance }}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10 mb-6 relative overflow-hidden">
            <div class="absolute -right-10 -top-10 opacity-5 pointer-events-none">
              <span class="material-symbols-outlined text-[150px]">hub</span>
            </div>
            <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">Traga Sua Própria Chave (Bring Your Own Key)</h3>
            <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
             Crie sua conta gratuita no <a href="https://openrouter.ai" target="_blank" class="text-primary hover:underline font-medium">OpenRouter.ai</a> e cole sua chave API abaixo! Liberaremos no seu Painel todo o nosso robusto serviço de Inteligência Artificial para uso ilimitado e <strong>sem custo extra</strong>. Sua chave será perfeitamente roteada para os maiores motores do mercado como <span class="font-medium text-gray-800 dark:text-gray-200">Meta Llama 3, Google Gemini Flash, DeepSeek-R1</span> e a veloz arquitetura <span class="font-medium text-gray-800 dark:text-gray-200">Groq LPU (Whisper V3)</span> para as transcrições de áudio!
            </p>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Text Engine (OpenRouter) -->
              <div class="flex flex-col gap-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Motor de Textos (OpenRouter API Key)</label>
                
                 <div v-if="aiSettingsForm.hasCustomKey" class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl mb-2">
                    <div class="flex items-center gap-2">
                      <div class="size-6 shrink-0 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-300">
                        <span class="material-symbols-outlined text-xs">check_circle</span>
                      </div>
                      <div>
                        <p class="text-xs font-bold text-green-800 dark:text-green-300">Configurada</p>
                        <p class="text-[10px] text-green-600 dark:text-green-400 font-mono mt-0.5">{{ aiSettingsForm.maskedKey }}</p>
                      </div>
                    </div>
                    <button @click="removeAiKey('openrouter')" class="text-[10px] px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 font-semibold rounded transition-colors">Remover</button>
                 </div>

                <div class="flex flex-col sm:flex-row gap-2 relative z-10 w-full">
                  <input 
                    v-model="aiSettingsForm.openrouterApiKey"
                    type="password" 
                    placeholder="sk-or-v1-..."
                    class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
                  />
                  <button 
                    @click="saveAiSettings('openrouter')"
                    :disabled="savingAiSettings || !aiSettingsForm.openrouterApiKey"
                    class="shrink-0 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <span v-if="savingAiSettings" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span v-else class="material-symbols-outlined text-sm">save</span>
                    Salvar
                  </button>
                </div>
              </div>

              <!-- Audio Engine (Groq) -->
              <div class="flex flex-col gap-3">
                <label class="block text-sm font-medium text-gray-700 dark:text-slate-300">Motor de Áudio (GroqLPU API Key)</label>
                
                 <div v-if="aiSettingsForm.hasCustomGroqKey" class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3 rounded-xl mb-2">
                    <div class="flex items-center gap-2">
                      <div class="size-6 shrink-0 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center text-green-600 dark:text-green-300">
                        <span class="material-symbols-outlined text-xs">check_circle</span>
                      </div>
                      <div>
                        <p class="text-xs font-bold text-green-800 dark:text-green-300">Configurada</p>
                        <p class="text-[10px] text-green-600 dark:text-green-400 font-mono mt-0.5">{{ aiSettingsForm.maskedGroqKey }}</p>
                      </div>
                    </div>
                    <button @click="removeAiKey('groq')" class="text-[10px] px-2 py-1 bg-red-100 text-red-600 hover:bg-red-200 font-semibold rounded transition-colors">Remover</button>
                 </div>

                <div class="flex flex-col sm:flex-row gap-2 relative z-10 w-full">
                  <input 
                    v-model="aiSettingsForm.groqApiKey"
                    type="password" 
                    placeholder="gsk_..."
                    class="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm"
                  />
                  <button 
                    @click="saveAiSettings('groq')"
                    :disabled="savingAiSettings || !aiSettingsForm.groqApiKey"
                    class="shrink-0 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 font-bold rounded-xl shadow-sm transition-all flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <span v-if="savingAiSettings" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    <span v-else class="material-symbols-outlined text-sm">save</span>
                    Salvar
                  </button>
                </div>
              </div>
            </div>
            
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
                  title="Necessário informar para autorizar a troca"
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
                  title="Mínimo de 6 caracteres recomendados para segurança"
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

        <!-- Security Section - 2FA -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">verified_user</span>
              Autenticação de Dois Fatores (2FA)
            </h2>
            <div v-if="twoFactorEnabled" class="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
              <span class="material-symbols-outlined text-sm">check_circle</span>
              <span class="text-xs font-bold">Ativado</span>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10 mb-6">
            <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">Google Authenticator</h3>
            <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
             Adicione uma camada extra de segurança à sua conta corporativa exigindo um código do aplicativo (Google Authenticator, Authy, etc) além da sua senha a cada login.
            </p>

            <!-- Generate 2FA -->
            <div v-if="!twoFactorEnabled && !twoFactorSecret" class="mt-4">
              <button @click="generate2FA" :disabled="loading2FA" class="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50">
                <span v-if="loading2FA" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span v-else class="material-symbols-outlined text-sm">qr_code_scanner</span>
                Configurar 2FA
              </button>
            </div>

            <!-- Verify 2FA -->
            <div v-else-if="!twoFactorEnabled && twoFactorSecret" class="mt-4 bg-white dark:bg-[#131c1e] p-6 rounded-2xl border border-gray-200 dark:border-white/10 text-center">
              <img :src="twoFactorQR" alt="QR Code" class="mx-auto mb-4 border-4 border-white rounded-xl shadow-md size-48 object-contain bg-white">
              <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 font-mono select-all bg-gray-100 dark:bg-black/40 py-2 rounded-lg">{{ twoFactorSecret }}</p>
              
              <div class="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <input v-model="twoFactorVerifyCode" type="text" maxlength="6" placeholder="000000" class="w-full text-center tracking-widest text-xl font-mono px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all">
                <button @click="verify2FA" :disabled="loading2FA || twoFactorVerifyCode.length !== 6" class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center disabled:opacity-50">
                   <span v-if="loading2FA" class="material-symbols-outlined animate-spin">progress_activity</span>
                   <span v-else>Ativar</span>
                </button>
              </div>
              <div v-if="error2FA" class="text-red-500 mt-2 text-sm font-medium">{{ error2FA }}</div>
            </div>

            <!-- Disable 2FA -->
            <div v-if="twoFactorEnabled" class="mt-4 bg-white dark:bg-[#131c1e] p-6 rounded-2xl border border-gray-200 dark:border-white/10">
               <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">Para desativar o 2FA, confirme o código atual do seu aplicativo.</p>
               <div class="flex items-center gap-2 max-w-xs">
                <input v-model="twoFactorVerifyCode" type="text" maxlength="6" placeholder="000000" class="w-full text-center tracking-widest font-mono px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all">
                <button @click="disable2FA" :disabled="loading2FA || twoFactorVerifyCode.length !== 6" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                   <span v-if="loading2FA" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                   <span v-else>Desativar</span>
                </button>
              </div>
               <div v-if="error2FA" class="text-red-500 mt-2 text-sm font-medium">{{ error2FA }}</div>
            </div>

          </div>
        </section>

      </div>
    </main>
  </div>

  <!-- Custom Status Modal -->
  <div v-if="showStatusModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click="showStatusModal = false">
    <div class="bg-white dark:bg-[#131c1e] w-full max-w-md rounded-2xl p-6 border border-gray-200 dark:border-white/10 shadow-xl" @click.stop>
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Status personalizado</h3>
        <button @click="showStatusModal = false" class="text-gray-400 hover:text-gray-800 dark:hover:text-white">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="space-y-3">
        <input v-model="statusForm.emoji" type="text" maxlength="4" placeholder="Emoji (ex: 🧠)" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white" />
        <input v-model="statusForm.text" type="text" maxlength="100" placeholder="Mensagem de status" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white" />
        <label class="text-xs text-gray-500 dark:text-slate-400">Expira em</label>
        <input v-model="statusForm.expiresAt" type="datetime-local" class="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white" />
        <div class="pt-2 border-t border-gray-100 dark:border-white/10">
          <label class="text-xs font-semibold text-gray-600 dark:text-slate-300">Out of Office (OOO)</label>
          <input v-model="statusForm.oooUntil" type="datetime-local" class="mt-2 w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white" />
          <textarea v-model="statusForm.oooMessage" rows="2" placeholder="Mensagem OOO (opcional)" class="mt-2 w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-white/10 text-sm text-gray-800 dark:text-white"></textarea>
        </div>
      </div>
      <button @click="saveCustomStatus" class="mt-4 w-full py-2.5 rounded-xl bg-primary hover:bg-cyan-400 text-white font-bold text-sm">
        Salvar status
      </button>
    </div>
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
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore, api } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { useLocaleStore } from '@/stores/locale'
import { useSubscriptionStore } from '@/stores/subscription'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const locale = useLocaleStore()
const subStore = useSubscriptionStore()

const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'
const loading = ref(false)
const showMobileSidebar = ref(false)
const selectedSeats = ref(5)
const showCheckoutSuccess = ref(false)
const showStatusModal = ref(false)

const formData = ref({
  fullName: '',
  username: '',
  email: '',
  status: 'online',
  avatarUrl: ''
})

const statusForm = ref({
  emoji: '',
  text: '',
  expiresAt: '',
  oooUntil: '',
  oooMessage: '',
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

// ──────────────────────────────────────────────
// 2FA Security Logic
// ──────────────────────────────────────────────
const twoFactorEnabled = ref(false)
const twoFactorSecret = ref('')
const twoFactorQR = ref('')
const twoFactorVerifyCode = ref('')
const loading2FA = ref(false)
const error2FA = ref('')

async function load2FAStatus() {
  // Try to load via /auth/me or a new endpoint if needed.
  // The simplest is checking authStore.user.is_two_factor_enabled (requires me endpoint update or checking current state)
  // Let's assume authStore.user has it, or we just rely on state.
  try {
     const res = await api.get('/auth/me');
     const me = res.data.data;
     // Note: we'd need to ensure auth/me returns is_two_factor_enabled. For now let's set it if we find it:
     if (me && me.is_two_factor_enabled !== undefined) {
         twoFactorEnabled.value = me.is_two_factor_enabled;
     } else {
         // Fallback if not injected in 'me' mapping yet
         twoFactorEnabled.value = authStore.user?.is_two_factor_enabled || false;
     }
  } catch (e) {
     console.warn('Could not load 2FA configuration')
  }
}

async function generate2FA() {
  error2FA.value = ''
  loading2FA.value = true
  try {
    const res = await api.get('/auth/2fa/generate')
    if (res.data.success) {
      twoFactorSecret.value = res.data.data.secret
      twoFactorQR.value = res.data.data.qrCodeUrl
    }
  } catch(e) {
    error2FA.value = e.response?.data?.message || 'Erro ao gerar 2FA'
  } finally {
    loading2FA.value = false
  }
}

async function verify2FA() {
  if (twoFactorVerifyCode.value.length !== 6) return
  error2FA.value = ''
  loading2FA.value = true
  try {
    const res = await api.post('/auth/2fa/verify', { token: twoFactorVerifyCode.value })
    if (res.data.success) {
      twoFactorEnabled.value = true
      twoFactorSecret.value = ''
      twoFactorQR.value = ''
      twoFactorVerifyCode.value = ''
      
      // Toast notification reusing the password success logic visually
      passwordSuccess.value = "2FA Habilidado com Sucesso! Seu login corporativo agora é blindado."
      setTimeout(() => passwordSuccess.value = '', 5000);
    }
  } catch(e) {
    error2FA.value = e.response?.data?.message || 'Código inválido'
  } finally {
    loading2FA.value = false
  }
}

async function disable2FA() {
  if (twoFactorVerifyCode.value.length !== 6) return
  error2FA.value = ''
  loading2FA.value = true
  try {
    const res = await api.post('/auth/2fa/disable', { token: twoFactorVerifyCode.value })
    if (res.data.success) {
      twoFactorEnabled.value = false
      twoFactorVerifyCode.value = ''
      
      // Toast notification
      passwordSuccess.value = "2FA Desabilitado."
      setTimeout(() => passwordSuccess.value = '', 5000);
    }
  } catch(e) {
    error2FA.value = e.response?.data?.message || 'Código inválido'
  } finally {
    loading2FA.value = false
  }
}

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

// AI Settings Forms and Logic
const aiSettingsForm = reactive({
  openrouterApiKey: '',
  groqApiKey: '',
  hasCustomKey: false,
  maskedKey: '',
  hasCustomGroqKey: false,
  maskedGroqKey: '',
  aiCreditsBalance: 0
})
const savingAiSettings = ref(false)

async function loadAiSettings() {
  if (!authStore.isAdmin || !authStore.user?.companyId) return
  try {
    const res = await api.get(`/companies/${authStore.user.companyId}/ai-settings`)
    if (res.data?.success) {
      aiSettingsForm.hasCustomKey = res.data.data.hasCustomKey
      aiSettingsForm.maskedKey = res.data.data.maskedKey
      aiSettingsForm.hasCustomGroqKey = res.data.data.hasCustomGroqKey
      aiSettingsForm.maskedGroqKey = res.data.data.maskedGroqKey
      aiSettingsForm.aiCreditsBalance = res.data.data.aiCreditsBalance
    }
  } catch (error) {
    console.warn('Could not load AI settings', error)
  }
}

async function saveAiSettings(provider) {
  let keyToSave = '';
  let payload = {};
  if (provider === 'openrouter') {
      keyToSave = aiSettingsForm.openrouterApiKey;
      payload = { openrouterApiKey: keyToSave };
  } else if (provider === 'groq') {
      keyToSave = aiSettingsForm.groqApiKey;
      payload = { groqApiKey: keyToSave };
  }

  if (!keyToSave) return;
  savingAiSettings.value = true;
  try {
    const response = await api.put(`/companies/${authStore.user.companyId}/ai-settings`, payload);
    if (response.data?.success) {
      if (provider === 'openrouter') aiSettingsForm.openrouterApiKey = '';
      if (provider === 'groq') aiSettingsForm.groqApiKey = '';
      await loadAiSettings();
      // Mostra toast genérico
      const msg = showCheckoutSuccess.value;
      showCheckoutSuccess.value = true;
      setTimeout(() => { showCheckoutSuccess.value = false; }, 3000);
    }
  } catch (e) {
    console.error('Save AI Settings error:', e);
  } finally {
    savingAiSettings.value = false;
  }
}

async function removeAiKey(provider) {
  if (!confirm(`Deseja realmente remover sua chave de IA customizada do ${provider}? O uso voltará a consumir créditos locais.`)) return;
  savingAiSettings.value = true;
  
  let payload = {};
  if (provider === 'openrouter') payload = { openrouterApiKey: '' };
  if (provider === 'groq') payload = { groqApiKey: '' };

  try {
    const response = await api.put(`/companies/${authStore.user.companyId}/ai-settings`, payload);
    if (response.data?.success) {
      await loadAiSettings();
    }
  } catch (e) {
    console.error('Remove AI Key error:', e);
  } finally {
    savingAiSettings.value = false;
  }
}

onMounted(() => {
  if (authStore.user) {
    formData.value = {
      fullName: authStore.user.fullName || '',
      username: authStore.user.username || '',
      email: authStore.user.email || '',
      status: authStore.user.status || 'online',
      avatarUrl: authStore.user.avatarUrl || ''
    }

    statusForm.value = {
      emoji: authStore.user.customStatusEmoji || '',
      text: authStore.user.customStatusText || '',
      expiresAt: authStore.user.customStatusExpiresAt ? new Date(authStore.user.customStatusExpiresAt).toISOString().slice(0, 16) : '',
      oooUntil: authStore.user.oooUntil ? new Date(authStore.user.oooUntil).toISOString().slice(0, 16) : '',
      oooMessage: authStore.user.oooMessage || '',
    }
  }

  // Fetch subscription status
  subStore.fetchSubscriptionStatus()
  loadAiSettings()
  load2FAStatus()

  // Check for checkout success/cancel query params
  const checkoutParam = new URLSearchParams(window.location.search).get('checkout')
  if (checkoutParam === 'success') {
    showCheckoutSuccess.value = true
    subStore.fetchSubscriptionStatus() // Refresh after checkout
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname)
    // Auto-hide after 8 seconds
    setTimeout(() => { showCheckoutSuccess.value = false }, 8000)
  } else if (checkoutParam === 'cancel') {
    window.history.replaceState({}, '', window.location.pathname)
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

async function saveCustomStatus() {
  try {
    const payload = {
      emoji: statusForm.value.emoji || null,
      text: statusForm.value.text || null,
      expiresAt: statusForm.value.expiresAt ? new Date(statusForm.value.expiresAt).toISOString() : null,
      oooUntil: statusForm.value.oooUntil ? new Date(statusForm.value.oooUntil).toISOString() : null,
      oooMessage: statusForm.value.oooMessage || null,
    }

    const response = await api.put('/users/me/custom-status', payload)
    if (response.data?.success) {
      authStore.user = {
        ...authStore.user,
        customStatusEmoji: response.data.data.customStatusEmoji,
        customStatusText: response.data.data.customStatusText,
        customStatusExpiresAt: response.data.data.customStatusExpiresAt,
        oooUntil: response.data.data.oooUntil,
        oooMessage: response.data.data.oooMessage,
      }
      showStatusModal.value = false
    }
  } catch (error) {
    alert(error.response?.data?.message || 'Erro ao salvar status personalizado')
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

// ─── Stripe Functions ─────────────────────────────────────────────────────
async function handleCheckout(planId) {
  const seats = subStore.hasSubscription ? subStore.maxSeats : selectedSeats.value
  await subStore.createCheckout(planId, seats)
}

async function handleOpenPortal() {
  await subStore.openPortal()
}
</script>
