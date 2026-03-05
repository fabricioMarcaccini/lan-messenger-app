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

        <!-- ═══ Admin: Gestão de Equipe (Onboarding Turbo) ═══ -->
        <section v-if="authStore.isAdmin" class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">rocket_launch</span>
              Gestão de Equipe
            </h2>
            <div class="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
              <span class="material-symbols-outlined text-primary text-sm">group</span>
              <span class="text-xs font-bold text-gray-900 dark:text-white">Onboarding Turbo</span>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex gap-1 mb-6 bg-gray-100 dark:bg-black/20 rounded-xl p-1 border border-gray-200 dark:border-white/5">
            <button
              @click="adminTeamTab = 'bulk'"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all', adminTeamTab === 'bulk' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white']"
            >
              <span class="material-symbols-outlined text-[18px]">upload_file</span>
              Importação em Massa
            </button>
            <button
              @click="adminTeamTab = 'invite'"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all', adminTeamTab === 'invite' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white']"
            >
              <span class="material-symbols-outlined text-[18px]">link</span>
              Links Mágicos
            </button>
            <button
              @click="adminTeamTab = 'quick'"
              :class="['flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all', adminTeamTab === 'quick' ? 'bg-white dark:bg-white/10 text-primary shadow-sm' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white']"
            >
              <span class="material-symbols-outlined text-[18px]">person_add</span>
              Usuário Rápido
            </button>
          </div>

          <!-- TAB 1: Importação em Massa -->
          <div v-if="adminTeamTab === 'bulk'" class="space-y-4">
            <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <span class="material-symbols-outlined text-primary text-[20px]">content_paste</span>
                Smart Paste
              </h3>
              <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Cole uma lista de usuários. Formato: <strong>nome;email;departamento</strong> (um por linha). O sistema cria as contas automaticamente com senha padrão <code class="bg-primary/10 text-primary px-1 rounded text-xs">Lanly@2026!</code>.
              </p>
              <textarea
                v-model="bulkPasteText"
                rows="6"
                placeholder="João Silva;joao@empresa.com;TI&#10;Maria Santos;maria@empresa.com;RH&#10;Pedro Souza;pedro@empresa.com;Comercial"
                class="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-mono text-sm resize-none"
              ></textarea>
              
              <div class="flex items-center justify-between mt-4">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-slate-400">ou</span>
                  <label class="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer transition-colors">
                    <span class="material-symbols-outlined text-[18px]">attach_file</span>
                    Upload CSV
                    <input type="file" accept=".csv,.txt" class="hidden" @change="handleCSVUpload" />
                  </label>
                  <span v-if="csvFileName" class="text-xs text-primary font-medium">{{ csvFileName }}</span>
                </div>
                <button
                  @click="handleBulkImport"
                  :disabled="loadingBulk || (!bulkPasteText.trim() && bulkParsedUsers.length === 0)"
                  class="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="loadingBulk" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span v-else class="material-symbols-outlined text-sm">group_add</span>
                  Importar Todos
                </button>
              </div>
            </div>

            <!-- Preview of parsed users -->
            <div v-if="bulkParsedUsers.length > 0" class="bg-white dark:bg-[#131c1e] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div class="bg-gray-50 dark:bg-black/20 px-4 py-3 border-b border-gray-200 dark:border-white/5 flex items-center justify-between">
                <span class="text-sm font-bold text-gray-900 dark:text-white">{{ bulkParsedUsers.length }} usuários prontos para importar</span>
                <button @click="bulkParsedUsers = []; bulkPasteText = ''; csvFileName = ''" class="text-xs text-red-500 hover:text-red-600 font-medium">Limpar</button>
              </div>
              <div class="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                <div v-for="(u, idx) in bulkParsedUsers.slice(0, 20)" :key="idx" class="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{{ (u.fullName || '?')[0] }}</div>
                  <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 dark:text-white truncate">{{ u.fullName }}</p>
                    <p class="text-xs text-gray-500 dark:text-slate-400 truncate">{{ u.email }} <span v-if="u.department" class="text-primary">• {{ u.department }}</span></p>
                  </div>
                </div>
                <div v-if="bulkParsedUsers.length > 20" class="px-4 py-2 text-xs text-gray-400 text-center">...e mais {{ bulkParsedUsers.length - 20 }} usuários</div>
              </div>
            </div>

            <!-- Result -->
            <div v-if="bulkResult" :class="['p-4 rounded-xl border text-sm font-medium flex items-center gap-2', bulkResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800']">
              <span class="material-symbols-outlined text-lg">{{ bulkResult.success ? 'check_circle' : 'error' }}</span>
              {{ bulkResult.message }}
            </div>
          </div>

          <!-- TAB 2: Links Mágicos -->
          <div v-if="adminTeamTab === 'invite'" class="space-y-4">
            <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">Gerar Link de Convite</h3>
              <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 leading-relaxed">
                Crie um link mágico e compartilhe com sua equipe. Quem acessar o link se cadastra automaticamente na sua empresa.
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Máximo de usos</label>
                  <input v-model.number="inviteForm.maxUses" type="number" min="1" max="500" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Expira em (dias)</label>
                  <input v-model.number="inviteForm.expiresInDays" type="number" min="1" max="90" class="w-full px-3 py-2 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              <button
                @click="handleCreateInvite"
                :disabled="loadingInvite"
                class="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-sm transition-all hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50"
              >
                <span v-if="loadingInvite" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span v-else class="material-symbols-outlined text-sm">add_link</span>
                Gerar Link
              </button>
            </div>

            <!-- Active invites list -->
            <div v-if="activeInvites.length > 0" class="bg-white dark:bg-[#131c1e] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
              <div class="bg-gray-50 dark:bg-black/20 px-4 py-3 border-b border-gray-200 dark:border-white/5">
                <span class="text-sm font-bold text-gray-900 dark:text-white">Links Ativos ({{ activeInvites.length }})</span>
              </div>
              <div class="divide-y divide-gray-100 dark:divide-white/5">
                <div v-for="inv in activeInvites" :key="inv.id" class="px-4 py-3 flex items-center justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <code class="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{{ getInviteUrl(inv.code) }}</code>
                      <button @click="copyInviteLink(inv.code)" class="text-gray-400 hover:text-primary transition-colors" title="Copiar link">
                        <span class="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                      {{ inv.uses }}/{{ inv.max_uses }} usos
                      <span class="mx-1">•</span>
                      Expira: {{ new Date(inv.expires_at).toLocaleDateString('pt-BR') }}
                    </p>
                  </div>
                  <button @click="handleDeleteInvite(inv.code)" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="Revogar">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-400 dark:text-slate-500 text-sm">
              <span class="material-symbols-outlined text-3xl mb-2 block">link_off</span>
              Nenhum link de convite ativo. Crie um acima!
            </div>
          </div>

          <!-- TAB 3: Criação Rápida -->
          <div v-if="adminTeamTab === 'quick'" class="space-y-4">
            <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10">
              <h3 class="text-base font-bold text-gray-900 dark:text-white mb-4">Adicionar Usuário</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Nome Completo *</label>
                  <input v-model="quickUserForm.fullName" type="text" placeholder="João da Silva" class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Email *</label>
                  <input v-model="quickUserForm.email" type="email" placeholder="joao@empresa.com" class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Departamento</label>
                  <input v-model="quickUserForm.department" type="text" placeholder="TI, RH, Comercial..." class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Cargo</label>
                  <input v-model="quickUserForm.position" type="text" placeholder="Analista, Gerente..." class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Senha (opcional)</label>
                  <input v-model="quickUserForm.password" type="password" placeholder="Deixe em branco para padrão" class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label class="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1 block">Perfil</label>
                  <select v-model="quickUserForm.role" class="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/50">
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div class="flex items-center justify-between mt-5">
                <p class="text-[11px] text-gray-400 dark:text-slate-500">* Campos obrigatórios</p>
                <button
                  @click="handleQuickCreateUser"
                  :disabled="loadingQuickUser || !quickUserForm.fullName || !quickUserForm.email"
                  class="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span v-if="loadingQuickUser" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span v-else class="material-symbols-outlined text-sm">person_add</span>
                  Criar Usuário
                </button>
              </div>
            </div>
            <!-- Quick user result -->
            <div v-if="quickUserResult" :class="['p-4 rounded-xl border text-sm font-medium flex items-center gap-2', quickUserResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800']">
              <span class="material-symbols-outlined text-lg">{{ quickUserResult.success ? 'check_circle' : 'error' }}</span>
              {{ quickUserResult.message }}
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
              {{ locale.t.twoFactor.title }}
            </h2>
            <div v-if="twoFactorEnabled" class="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
              <span class="material-symbols-outlined text-sm">check_circle</span>
              <span class="text-xs font-bold">{{ locale.t.twoFactor.enabled }}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10 mb-6">
            <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">{{ locale.t.twoFactor.appTitle }}</h3>
            <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
             {{ locale.t.twoFactor.description }}
            </p>

            <!-- Generate 2FA -->
            <div v-if="!twoFactorEnabled && !twoFactorSecret" class="mt-4">
              <button @click="generate2FA" :disabled="loading2FA" class="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50">
                <span v-if="loading2FA" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                <span v-else class="material-symbols-outlined text-sm">qr_code_scanner</span>
                {{ locale.t.twoFactor.setupBtn }}
              </button>
            </div>

            <!-- Verify 2FA -->
            <div v-else-if="!twoFactorEnabled && twoFactorSecret" class="mt-4 bg-white dark:bg-[#131c1e] p-6 rounded-2xl border border-gray-200 dark:border-white/10 text-center">
              
              <div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-xl text-left text-sm border border-blue-100 dark:border-blue-800/50">
                 <h4 class="font-bold flex items-center gap-2 mb-2"><span class="material-symbols-outlined text-[18px]">info</span> {{ locale.t.twoFactor.howToTitle }}</h4>
                 <ol class="list-decimal pl-5 space-y-1">
                    <li v-html="locale.t.twoFactor.step1"></li>
                    <li v-html="locale.t.twoFactor.step2"></li>
                    <li v-html="locale.t.twoFactor.step3"></li>
                 </ol>
              </div>

              <a v-if="twoFactorOtpauth" :href="twoFactorOtpauth" class="block w-fit mx-auto cursor-pointer" title="Abrir App Authenticator">
                <img :src="twoFactorQR" alt="QR Code" class="mb-2 border-4 border-white rounded-xl shadow-md size-48 object-contain bg-white hover:scale-105 transition-transform mx-auto">
              </a>
              <img v-else :src="twoFactorQR" alt="QR Code" class="mx-auto mb-4 border-4 border-white rounded-xl shadow-md size-48 object-contain bg-white">
              
              <div class="mb-4 text-center">
                 <a v-if="twoFactorOtpauth" :href="twoFactorOtpauth" class="hidden sm:inline-block md:hidden px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold rounded-lg text-xs mb-3 shadow-sm active:scale-95 transition-all">
                   <span class="material-symbols-outlined text-[14px] align-middle mr-1">open_in_new</span> {{ locale.t.twoFactor.openAppBtn }}
                 </a>
                 <p class="text-sm text-gray-600 dark:text-slate-400 font-mono select-all bg-gray-100 dark:bg-black/40 py-2 rounded-lg" :title="locale.t.twoFactor.manualCodeDesc">{{ twoFactorSecret }}</p>
              </div>
              
              <div class="flex items-center justify-center gap-2 max-w-xs mx-auto">
                <input v-model="twoFactorVerifyCode" type="text" maxlength="6" placeholder="000000" class="w-full text-center tracking-widest text-xl font-mono px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all">
                <button @click="verify2FA" :disabled="loading2FA || twoFactorVerifyCode.length !== 6" class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center disabled:opacity-50">
                   <span v-if="loading2FA" class="material-symbols-outlined animate-spin">progress_activity</span>
                   <span v-else>{{ locale.t.twoFactor.activateBtn }}</span>
                </button>
              </div>
              <div v-if="error2FA" class="text-red-500 mt-2 text-sm font-medium">{{ error2FA }}</div>
            </div>

            <!-- Disable 2FA -->
            <div v-if="twoFactorEnabled" class="mt-4 bg-white dark:bg-[#131c1e] p-6 rounded-2xl border border-gray-200 dark:border-white/10">
               <p class="text-sm text-gray-600 dark:text-slate-400 mb-4">{{ locale.t.twoFactor.disableDesc }}</p>
               <div class="flex items-center gap-2 max-w-xs">
                <input v-model="twoFactorVerifyCode" type="text" maxlength="6" placeholder="000000" class="w-full text-center tracking-widest font-mono px-4 py-2 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all">
                <button @click="disable2FA" :disabled="loading2FA || twoFactorVerifyCode.length !== 6" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                   <span v-if="loading2FA" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                   <span v-else>{{ locale.t.twoFactor.disableBtn }}</span>
                </button>
              </div>
               <div v-if="error2FA" class="text-red-500 mt-2 text-sm font-medium">{{ error2FA }}</div>
            </div>

        <!-- Push Notifications Section -->
        <section class="mb-8 p-6 bg-white dark:bg-glass-surface rounded-2xl border border-gray-200 dark:border-glass-border shadow-sm">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span class="material-symbols-outlined text-primary">notifications_active</span>
              Notificações Desktop & Mobile
            </h2>
            <div v-if="notificationsStore.isSubscribed" class="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-800">
              <span class="material-symbols-outlined text-sm">notifications</span>
              <span class="text-xs font-bold">Ativadas</span>
            </div>
          </div>
          
          <div class="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/10 mb-6">
            <h3 class="text-base font-bold text-gray-900 dark:text-white mb-2">Mensagens fora do app</h3>
            <p class="text-sm text-gray-600 dark:text-slate-400 mb-4 max-w-2xl leading-relaxed">
             Ative as notificações para receber alertas de novas mensagens mesmo quando o Lanly estiver fechado ou minimizado. Essencial para não perder chamados da equipe.
            </p>

            <div v-if="!notificationsStore.isSupported" class="mt-4 p-4 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-xl border border-yellow-200 dark:border-yellow-800/50 flex flex-col gap-2">
              <div class="flex items-center gap-2 font-bold"><span class="material-symbols-outlined text-[18px]">warning</span> Não Suportado</div>
              <p class="text-xs">Seu navegador atual não suporta Notificações Push, ou o ServiceWorker falhou ao tentar ser registrado.</p>
            </div>
            
            <div v-else class="mt-4">
              <div v-if="notificationsStore.permission === 'denied'" class="p-4 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50 text-sm">
                <strong>Você bloqueou as notificações deste site.</strong> Por favor, altere nas configurações do seu navegador para permitir.
              </div>

              <div class="flex items-center justify-between" v-else>
                 <div class="flex flex-col gap-1">
                    <p class="text-sm font-semibold text-gray-800 dark:text-white">{{ notificationsStore.isSubscribed ? 'Notificações Ativas neste dispositivo' : 'Notificações desligadas neste dispositivo' }}</p>
                    <p class="text-xs text-gray-500">Você tem um total de <strong>{{ notificationsStore.activeDevices }} dispositivos</strong> conectados ao push.</p>
                 </div>
                 
                 <button 
                  v-if="!notificationsStore.isSubscribed"
                  @click="handleSubscribeToPush" 
                  :disabled="loadingPush" 
                  class="px-6 py-2.5 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                 >
                  <span v-if="loadingPush" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span v-else class="material-symbols-outlined text-sm">notifications_active</span>
                  Ativar
                 </button>

                 <button 
                  v-else
                  @click="handleUnsubscribeFromPush" 
                  :disabled="loadingPush" 
                  class="px-6 py-2.5 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-800/50 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                 >
                  <span v-if="loadingPush" class="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  Desativar daqui
                 </button>
              </div>
            </div>

          </div>
        </section>

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
import { useNotificationsStore } from '@/stores/notifications'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const locale = useLocaleStore()
const subStore = useSubscriptionStore()
const notificationsStore = useNotificationsStore()

const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'
const loading = ref(false)
const showMobileSidebar = ref(false)
const selectedSeats = ref(5)
const showCheckoutSuccess = ref(false)
const showStatusModal = ref(false)
const loadingPush = ref(false)

// ── Admin: Gestão de Equipe ──
const adminTeamTab = ref('bulk')
const bulkPasteText = ref('')
const bulkParsedUsers = ref([])
const csvFileName = ref('')
const loadingBulk = ref(false)
const bulkResult = ref(null)
const activeInvites = ref([])
const loadingInvite = ref(false)
const inviteForm = reactive({ maxUses: 50, expiresInDays: 7 })
const quickUserForm = reactive({ fullName: '', email: '', department: '', position: '', password: '', role: 'user' })
const loadingQuickUser = ref(false)
const quickUserResult = ref(null)

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
const twoFactorOtpauth = ref('')
const twoFactorVerifyCode = ref('')
const loading2FA = ref(false)
const error2FA = ref('')

async function load2FAStatus() {
  try {
     const res = await api.get('/auth/me');
     const me = res.data.data;
     if (me && me.is_two_factor_enabled !== undefined) {
         twoFactorEnabled.value = me.is_two_factor_enabled;
     } else {
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
      twoFactorOtpauth.value = res.data.data.otpauthUrl
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
      passwordSuccess.value = locale.t.twoFactor.successEnabled
      setTimeout(() => passwordSuccess.value = '', 5000);
    }
  } catch(e) {
    error2FA.value = e.response?.data?.message || 'Invalid code'
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
      passwordSuccess.value = locale.t.twoFactor.successDisabled
      setTimeout(() => passwordSuccess.value = '', 5000);
    }
  } catch(e) {
    error2FA.value = e.response?.data?.message || 'Invalid code'
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
  if (authStore.isAdmin) loadInvites()
  notificationsStore.checkStatus()

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

// Push Notifications logic
async function handleSubscribeToPush() {
    loadingPush.value = true
    try {
        await notificationsStore.subscribe()
    } catch (e) {
        alert(e.message || 'Erro ao inscrever push notification.')
    } finally {
        loadingPush.value = false
    }
}

async function handleUnsubscribeFromPush() {
    loadingPush.value = true
    try {
        await notificationsStore.unsubscribe()
    } catch (e) {
        alert('Erro ao cancelar notificação.')
    } finally {
        loadingPush.value = false
    }
}

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

// ── Admin Team Management Functions ──
function parseBulkText(text) {
  if (!text.trim()) return []
  return text.trim().split('\n').map(line => {
    const parts = line.split(/[;,\t]/).map(s => s.trim())
    if (parts.length >= 2) {
      return {
        fullName: parts[0],
        email: parts[1],
        department: parts[2] || null,
        position: parts[3] || null
      }
    }
    return null
  }).filter(Boolean)
}

function handleCSVUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  csvFileName.value = file.name
  const reader = new FileReader()
  reader.onload = (e) => {
    const text = e.target.result
    // Skip header line if it contains common header words
    const lines = text.split('\n')
    const firstLine = lines[0]?.toLowerCase() || ''
    const dataLines = (firstLine.includes('nome') || firstLine.includes('name') || firstLine.includes('email')) ? lines.slice(1) : lines
    bulkPasteText.value = dataLines.join('\n')
    bulkParsedUsers.value = parseBulkText(dataLines.join('\n'))
  }
  reader.readAsText(file)
}

async function handleBulkImport() {
  loadingBulk.value = true
  bulkResult.value = null
  try {
    const users = bulkParsedUsers.length > 0 ? bulkParsedUsers.value : parseBulkText(bulkPasteText.value)
    if (users.length === 0 && bulkPasteText.value.trim()) {
      // Re-parse
      const parsed = parseBulkText(bulkPasteText.value)
      if (parsed.length === 0) {
        bulkResult.value = { success: false, message: 'Nenhum usuário válido encontrado. Use o formato: nome;email;departamento' }
        loadingBulk.value = false
        return
      }
      bulkParsedUsers.value = parsed
    }
    const payload = bulkParsedUsers.value.length > 0 ? bulkParsedUsers.value : parseBulkText(bulkPasteText.value)
    const response = await api.post('/users/bulk', { users: payload })
    if (response.data.success) {
      bulkResult.value = { success: true, message: response.data.message }
      bulkPasteText.value = ''
      bulkParsedUsers.value = []
      csvFileName.value = ''
    }
  } catch (err) {
    bulkResult.value = { success: false, message: err.response?.data?.message || 'Erro ao importar usuários' }
  } finally {
    loadingBulk.value = false
  }
}

async function loadInvites() {
  try {
    const res = await api.get(`/companies/${authStore.user.companyId}/invites`)
    if (res.data.success) activeInvites.value = res.data.data
  } catch (e) {
    console.warn('Could not load invites')
  }
}

async function handleCreateInvite() {
  loadingInvite.value = true
  try {
    const res = await api.post(`/companies/${authStore.user.companyId}/invites`, {
      maxUses: inviteForm.maxUses,
      expiresInDays: inviteForm.expiresInDays
    })
    if (res.data.success) {
      activeInvites.value.unshift(res.data.data)
    }
  } catch (e) {
    alert(e.response?.data?.message || 'Erro ao gerar convite')
  } finally {
    loadingInvite.value = false
  }
}

async function handleDeleteInvite(code) {
  if (!confirm('Deseja revogar este link de convite?')) return
  try {
    await api.delete(`/companies/${authStore.user.companyId}/invites/${code}`)
    activeInvites.value = activeInvites.value.filter(i => i.code !== code)
  } catch (e) {
    alert('Erro ao revogar convite')
  }
}

function getInviteUrl(code) {
  const base = window.location.origin
  return `${base}/join/${code}`
}

function copyInviteLink(code) {
  navigator.clipboard.writeText(getInviteUrl(code))
  alert('Link copiado!')
}

async function handleQuickCreateUser() {
  loadingQuickUser.value = true
  quickUserResult.value = null
  try {
    const username = quickUserForm.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '')
    const response = await api.post('/users', {
      username,
      email: quickUserForm.email,
      fullName: quickUserForm.fullName,
      password: quickUserForm.password || undefined,
      role: quickUserForm.role,
      department: quickUserForm.department || undefined,
      position: quickUserForm.position || undefined
    })
    if (response.data.success) {
      quickUserResult.value = { success: true, message: `Usuário ${quickUserForm.fullName} criado com sucesso!` }
      Object.assign(quickUserForm, { fullName: '', email: '', department: '', position: '', password: '', role: 'user' })
    }
  } catch (err) {
    quickUserResult.value = { success: false, message: err.response?.data?.message || 'Erro ao criar usuário' }
  } finally {
    loadingQuickUser.value = false
  }
}
</script>
