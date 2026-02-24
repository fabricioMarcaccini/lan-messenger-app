<template>
  <div class="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-background-dark transition-colors duration-300 relative">
    <!-- Mobile Sidebar Overlay -->
    <div v-if="showMobileSidebar" class="fixed inset-0 bg-black/50 z-30 md:hidden" @click="showMobileSidebar = false"></div>
    
    <!-- Left Sidebar -->
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
            <span class="material-symbols-outlined group-hover:text-primary transition-colors">hub</span>
            <span class="text-sm font-medium">{{ locale.t.nav.network }}</span>
          </router-link>
          
          <a class="flex items-center gap-3 px-3 py-3 rounded-xl bg-primary/10 text-gray-900 dark:text-white border border-primary/20 shadow-sm dark:shadow-neon" href="#">
            <span class="material-symbols-outlined text-primary" style="font-variation-settings: 'FILL' 1;">chat</span>
            <span class="text-sm font-medium">{{ locale.t.nav.chat }}</span>
            <span v-if="unreadCount > 0" class="ml-auto bg-primary text-white dark:text-background-dark text-[10px] font-bold px-1.5 py-0.5 rounded-full">{{ unreadCount }}</span>
          </a>
          
          <router-link to="/settings" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <span class="material-symbols-outlined group-hover:text-accent transition-colors">settings</span>
            <span class="text-sm font-medium">{{ locale.t.nav.settings }}</span>
          </router-link>
          
          <router-link v-if="authStore.isAdmin" to="/admin/users" class="flex items-center gap-3 px-3 py-3 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group">
            <span class="material-symbols-outlined group-hover:text-purple-400 transition-colors">admin_panel_settings</span>
            <span class="text-sm font-medium">{{ locale.t.nav.admin }}</span>
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
              <span class="material-symbols-outlined text-gray-400 dark:text-slate-500 group-open:rotate-180 transition-transform text-lg">expand_more</span>
            </summary>
            <div class="px-3 pb-3 pt-1 flex flex-col gap-2">
              <div 
                v-for="device in recentDevices" 
                :key="device.ip"
                class="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-100 dark:bg-black/20 hover:bg-gray-200 dark:hover:bg-black/40 cursor-pointer border border-transparent hover:border-primary/20"
              >
                <span class="font-mono text-gray-600 dark:text-slate-300">{{ device.ipAddress }}</span>
                <span 
                  :class="[
                    'font-medium text-[10px] px-1.5 py-0.5 rounded',
                    device.isOnline ? 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10' : 'text-gray-500 dark:text-slate-500 bg-gray-100 dark:bg-slate-500/10'
                  ]"
                >
                  {{ device.isOnline ? 'Active' : 'Idle' }}
                </span>
              </div>
              <router-link to="/network" class="text-xs text-primary hover:underline text-center mt-1">{{ locale.t.nav.viewAll }} →</router-link>
            </div>
          </details>
        </div>
      </nav>
      
      <!-- Bottom Info -->
      <div class="p-4 border-t border-gray-100 dark:border-glass-border flex flex-col gap-3">
        <button 
          @click="handleLogout"
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
    
    <!-- Center Panel: Chat List -->
    <section :class="['flex-shrink-0 flex flex-col bg-gray-50 dark:bg-glass-surface-lighter backdrop-blur-md border-r border-gray-200 dark:border-glass-border z-10 transition-colors duration-300 w-full md:w-[360px]', chatStore.activeConversation ? 'hidden md:flex' : 'flex']">
      <div class="p-5 pb-2 pt-6">
        <div class="flex justify-between items-end mb-4">
          <div class="flex items-center">
            <!-- Mobile Menu Toggle -->
            <button @click="showMobileSidebar = true" class="md:hidden size-8 mr-3 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-gray-600 dark:text-white shrink-0">
              <span class="material-symbols-outlined text-lg">menu</span>
            </button>
            <h2 id="tour-conversations" class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              {{ locale.t.chat.title }}
              <div class="relative flex items-center group cursor-help z-[100]">
                <span class="material-symbols-outlined text-primary/70 group-hover:text-primary transition-colors text-[28px]">help</span>
                <div class="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 p-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm leading-relaxed font-medium rounded-xl shadow-xl pointer-events-none transform -translate-x-2 group-hover:translate-x-0 border border-transparent dark:border-gray-200">
                  Aqui ficam listadas as conversas. Escolha uma para abrir ou clique no botão ao lado para criar uma nova.
                  <div class="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-gray-900 dark:bg-white rotate-45 border-l border-b border-transparent dark:border-gray-200"></div>
                </div>
              </div>
            </h2>
          </div>
          <button 
            id="tour-new-chat"
            @click="showNewChatModal = true"
            class="size-8 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-gray-600 dark:text-white"
            title="Nova Conversa ou Grupo"
          >
            <span class="material-symbols-outlined text-lg">edit_square</span>
          </button>
        </div>
        
        <!-- Search Bar -->
        <div class="relative group">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span class="material-symbols-outlined text-gray-400 dark:text-slate-400 group-focus-within:text-primary transition-colors">search</span>
          </div>
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="locale.t.chat.search"
            class="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl leading-5 bg-white dark:bg-black/20 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white dark:focus:bg-black/30 sm:text-sm transition-all shadow-sm dark:shadow-inner"
          />
        </div>
      </div>
      
      <!-- Conversations List -->
      <div class="flex-1 overflow-y-auto px-3 pb-4">
        
        <!-- Canais / Grupos -->
        <div class="mt-4 mb-2 px-1 flex justify-between items-center group">
          <h3 class="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Canais & Grupos</h3>
          <button @click="showPublicChannelsModal = true" class="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary/80 size-5 flex items-center justify-center rounded-md bg-primary/10" title="Descobrir Canais">
            <span class="material-symbols-outlined text-[14px]">explore</span>
          </button>
        </div>
        
        <div class="flex flex-col gap-1">
          <div 
            v-for="conv in filteredChannels" 
            :key="conv.id"
            @click="selectConversation(conv.id)"
            :class="[
              'glass-card p-3 rounded-xl cursor-pointer relative group border border-transparent hover:bg-white dark:hover:bg-white/5',
              chatStore.activeConversationId === conv.id ? 'bg-primary/10 border-primary/30 shadow-sm dark:shadow-neon' : 'bg-transparent'
            ]"
          >
            <div class="flex gap-3 relative z-10">
              <div class="relative flex-shrink-0">
                <div 
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 text-white flex items-center justify-center font-bold"
                  :class="conv.isPublic ? 'bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-700'"
                  :style="!conv.isPublic && conv.participants ? { backgroundImage: `url(${defaultAvatar})` } : {}"
                >
                  <span v-if="conv.isPublic" class="material-symbols-outlined text-[20px]">public</span>
                  <span v-else-if="!conv.isPublic && !conv.participants" class="material-symbols-outlined text-[20px]">lock</span>
                </div>
              </div>
              <div class="flex flex-col flex-1 min-w-0 justify-center">
                <div class="flex justify-between items-baseline mb-0.5">
                  <h3 class="text-gray-900 dark:text-white text-sm font-semibold truncate">
                    <span v-if="conv.isPublic" class="text-indigo-500 dark:text-indigo-400 mr-0.5">#</span>{{ conv.name }}
                  </h3>
                  <span class="text-gray-400 dark:text-slate-400 text-xs">{{ formatTime(conv.lastMessageAt) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <p class="text-gray-500 dark:text-slate-400 text-xs truncate pr-2">{{ conv.lastMessage }}</p>
                  <span 
                    v-if="conv.unreadCount > 0"
                    class="flex items-center justify-center min-w-[18px] h-[18px] bg-primary text-white dark:text-background-dark text-[10px] font-bold rounded-full px-1 shadow-sm dark:shadow-neon"
                  >
                    {{ conv.unreadCount }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p v-if="filteredChannels.length === 0" class="text-[11px] text-gray-400 opacity-60 text-center py-2 font-medium">Nenhum canal</p>
        </div>

        <!-- Mensagens Diretas -->
        <div class="mt-6 mb-2 px-1 flex justify-between items-center">
          <h3 class="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Mensagens Diretas</h3>
        </div>

        <div class="flex flex-col gap-1">
          <div 
            v-for="conv in filteredDirectMessages" 
            :key="conv.id"
            @click="selectConversation(conv.id)"
            :class="[
              'glass-card p-3 rounded-xl cursor-pointer relative group border border-transparent hover:bg-white dark:hover:bg-white/5',
              chatStore.activeConversationId === conv.id ? 'bg-primary/10 border-primary/30 shadow-sm dark:shadow-neon' : 'bg-transparent'
            ]"
          >
            <div class="flex gap-3 relative z-10">
              <div class="relative flex-shrink-0">
                <div 
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
                  :style="{ backgroundImage: `url(${conv.participants.find(p => p.id !== authStore.user?.id)?.avatar_url || defaultAvatar})` }"
                ></div>
                <div v-if="conv.participants.find(p => p.id !== authStore.user?.id)?.status === 'online'" class="absolute bottom-0 right-0 size-3 border-2 border-white dark:border-background-dark bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
              </div>
              <div class="flex flex-col flex-1 min-w-0 justify-center">
                <div class="flex justify-between items-baseline mb-0.5">
                  <h3 class="text-gray-900 dark:text-white text-sm font-semibold truncate">
                    {{ conv.participants.filter(p => p.id !== authStore.user?.id).map(p => p.full_name || p.username).join(', ') }}
                  </h3>
                  <span class="text-gray-400 dark:text-slate-400 text-xs">{{ formatTime(conv.lastMessageAt) }}</span>
                </div>
                <div class="flex justify-between items-center">
                  <p class="text-gray-500 dark:text-slate-400 text-xs truncate pr-2">
                     <span v-if="conv.lastMessageSenderId === authStore.user?.id" class="text-[10px] text-gray-400">Você: </span>
                     {{ conv.lastMessage }}
                  </p>
                  <span 
                    v-if="conv.unreadCount > 0"
                    class="flex items-center justify-center min-w-[18px] h-[18px] bg-primary text-white dark:text-background-dark text-[10px] font-bold rounded-full px-1 shadow-sm dark:shadow-neon"
                  >
                    {{ conv.unreadCount }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <p v-if="filteredDirectMessages.length === 0" class="text-[11px] text-gray-400 opacity-60 text-center py-2 font-medium">Nenhuma mensagem direta</p>
        </div>
        
      </div>
    </section>
    
    <!-- Right Panel: Active Chat -->
    <main :class="['flex-1 flex-col bg-white dark:bg-background-dark/30 backdrop-blur-sm relative min-w-0 transition-colors duration-300 w-full', chatStore.activeConversation ? 'flex' : 'hidden md:flex']">
      <template v-if="chatStore.activeConversation">
        <!-- Chat Header -->
        <header class="h-20 border-b border-gray-200 dark:border-glass-border bg-white dark:bg-glass-surface backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20 shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          <div class="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
            <!-- Back Button for Mobile -->
            <button @click="chatStore.setActiveConversation(null)" class="md:hidden size-8 mr-1 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 text-gray-600 dark:text-white flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-lg">arrow_back</span>
            </button>
            <div 
              @click="showGroupInfo = true"
              class="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-primary/20 flex-shrink-0"
              :style="{ backgroundImage: `url(${chatStore.activeConversation.isGroup ? defaultAvatar : (chatStore.activeConversation.participants.find(p => p.id !== authStore.user?.id)?.avatar_url || defaultAvatar)})` }"
            ></div>
            <div @click="showGroupInfo = true" class="flex-1 min-w-0 mr-2">
              <h2 class="text-gray-900 dark:text-white text-lg font-bold leading-none mb-1">
                {{ chatStore.activeConversation.name || chatStore.activeConversation.participants.filter(p => p.id !== authStore.user?.id).map(p => p.full_name || p.username).join(', ') }}
              </h2>
              <div class="flex items-center gap-2 text-xs" v-if="!chatStore.activeConversation.isGroup">
                <span class="flex size-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span class="text-green-600 dark:text-green-400 font-medium">{{ locale.t.chat.online }}</span>
              </div>
              <div class="flex items-center gap-2 text-xs" v-else>
                <span class="text-gray-500 dark:text-slate-400 font-medium">{{ chatStore.activeConversation.participants.length }} participantes, clique para ver info</span>
              </div>
            </div>
          </div>

          <div id="tour-actions" class="flex items-center gap-1 md:gap-2" v-if="!chatStore.activeConversation.isGroup && chatStore.activeConversation.participants.length > 0">
            <!-- AI Insights Buttons -->
            <button @click="fetchInsights('summarize')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-amber-500 flex items-center justify-center transition-colors" title="Resumir Conversa com IA">
              <span class="material-symbols-outlined text-xl">insights</span>
            </button>
            <button @click="fetchInsights('extract_tasks')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Extrair Tarefas com IA">
              <span class="material-symbols-outlined text-[22px]">checklist</span>
            </button>
            
            <!-- P2P Call Buttons -->
            <button 
              @click="startP2PCall('screen')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-blue-500 flex items-center justify-center transition-colors"
              title="Apresentar Tela"
            >
              <span class="material-symbols-outlined text-xl">present_to_all</span>
            </button>
            <button 
              @click="startP2PCall('audio')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors"
              title="Ligar (Apenas Áudio)"
            >
              <span class="material-symbols-outlined text-xl">call</span>
            </button>
            <button 
              @click="startP2PCall('video')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors relative group"
              title="Chamada de Vídeo ao vivo"
            >
              <span class="material-symbols-outlined text-xl">videocam</span>
              <span class="absolute -top-1 -right-1 text-[10px] bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">?</span>
            </button>
          </div>
          <!-- GROUP Call Buttons -->
          <div class="flex items-center gap-1 md:gap-2" v-if="chatStore.activeConversation.isGroup">
            <!-- AI Insights Buttons -->
            <button @click="fetchInsights('summarize')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-amber-500 flex items-center justify-center transition-colors" title="Resumir Conversa com IA">
              <span class="material-symbols-outlined text-xl">insights</span>
            </button>
            <button @click="fetchInsights('extract_tasks')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Extrair Tarefas com IA">
              <span class="material-symbols-outlined text-[22px]">checklist</span>
            </button>
            
            <button 
              @click="groupCallStore.startGroupCall(chatStore.activeConversationId, 'screen')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-blue-500 flex items-center justify-center transition-colors"
              title="Apresentar Tela"
              :disabled="groupCallStore.callState !== 'idle'"
            >
              <span class="material-symbols-outlined text-xl">present_to_all</span>
            </button>
            <button 
              @click="groupCallStore.startGroupCall(chatStore.activeConversationId, 'audio')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors"
              title="Chamada em Grupo (Áudio)"
              :disabled="groupCallStore.callState !== 'idle'"
            >
              <span class="material-symbols-outlined text-xl">call</span>
            </button>
            <button 
              @click="groupCallStore.startGroupCall(chatStore.activeConversationId, 'video')"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors"
              title="Chamada em Grupo (Vídeo)"
              :disabled="groupCallStore.callState !== 'idle'"
            >
              <span class="material-symbols-outlined text-xl">videocam</span>
            </button>
          </div>
        </header>
        
        <!-- Active Group Call Banner -->
        <div v-if="groupCallStore.activeCallInfo && groupCallStore.callState === 'idle'"
          class="mx-4 mt-3 mb-0 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 flex items-center justify-between gap-3 animate-pulse">
          <div class="flex items-center gap-3 min-w-0">
            <div class="size-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-green-500 text-xl">call</span>
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-green-700 dark:text-green-400">Chamada em andamento</p>
              <p class="text-xs text-green-600/70 dark:text-green-400/60 truncate">{{ groupCallStore.activeCallInfo.count }} participante(s) na chamada</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button @click="groupCallStore.joinActiveCall(false)"
              class="px-4 py-2 rounded-lg bg-green-500 text-white text-xs font-bold hover:bg-green-600 active:scale-95 transition-all shadow-md">
              <span class="material-symbols-outlined text-sm align-middle mr-1">call</span>
              Entrar
            </button>
            <button @click="groupCallStore.joinActiveCall(true)"
              class="px-3 py-2 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/80 active:scale-95 transition-all shadow-md"
              title="Entrar com vídeo">
              <span class="material-symbols-outlined text-sm">videocam</span>
            </button>
            <button @click="groupCallStore.clearActiveCallInfo()"
              class="size-8 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-slate-400 hover:bg-gray-300 flex items-center justify-center text-xs"
              title="Dispensar">
              <span class="material-symbols-outlined" style="font-size: 16px;">close</span>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50 dark:bg-transparent">
          <template v-for="msg in chatStore.activeMessages" :key="msg.id">

            <!-- ==== CALL LOG MESSAGE ==== -->
            <div v-if="msg.contentType === 'call'" :id="`msg-${msg.id}`" class="flex justify-center">
              <div class="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm max-w-xs text-gray-700 dark:text-slate-300">
                <!-- Icon by call type and status -->
                <div class="flex-shrink-0">
                  <template v-if="parseCallLog(msg.content).status === 'missed' || parseCallLog(msg.content).status === 'declined'">
                    <span class="material-symbols-outlined text-red-400 text-xl">call_missed</span>
                  </template>
                  <template v-else-if="parseCallLog(msg.content).callType === 'video'">
                    <span class="material-symbols-outlined text-primary text-xl">videocam</span>
                  </template>
                  <template v-else-if="parseCallLog(msg.content).callType === 'screen'">
                    <span class="material-symbols-outlined text-blue-400 text-xl">present_to_all</span>
                  </template>
                  <template v-else>
                    <span class="material-symbols-outlined text-green-400 text-xl">call</span>
                  </template>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-xs font-semibold">
                    <span v-if="msg.senderId === authStore.user?.id">Você iniciou</span>
                    <span v-else>{{ msg.senderName || msg.senderUsername }} ligou</span>
                    —
                    <span v-if="parseCallLog(msg.content).callType === 'video'">Chamada de vídeo</span>
                    <span v-else-if="parseCallLog(msg.content).callType === 'screen'">Compartilhamento de tela</span>
                    <span v-else>Chamada de voz</span>
                  </span>
                  <span class="text-[11px] opacity-60 flex items-center gap-1">
                    <span v-if="parseCallLog(msg.content).status === 'missed'" class="text-red-400">Não atendida</span>
                    <span v-else-if="parseCallLog(msg.content).status === 'declined'" class="text-red-400">Recusada</span>
                    <span v-else>
                      {{ formatCallDuration(parseCallLog(msg.content).duration) }}
                    </span>
                    <span class="opacity-40">·</span>
                    <span>{{ formatTime(msg.createdAt) }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- ==== NORMAL MESSAGE ==== -->
            <div v-else :id="`msg-${msg.id}`" :class="[
              'flex items-end gap-3 max-w-[80%] transition-colors duration-500 rounded-2xl',
              msg.senderId === authStore.user?.id ? 'self-end flex-row-reverse' : ''
            ]">
            <div 
              class="bg-center bg-no-repeat bg-cover rounded-full size-8 mb-1 flex-shrink-0 opacity-80"
              :style="{ backgroundImage: `url(${msg.senderAvatar || defaultAvatar})` }"
            ></div>
            <div :class="['flex flex-col gap-1 relative group max-w-full', msg.senderId === authStore.user?.id ? 'items-end' : '']">
              <div :class="['flex items-center gap-2', msg.senderId === authStore.user?.id ? 'flex-row-reverse' : '']">
                <div :class="[
                  'rounded-2xl border shadow-sm overflow-hidden min-w-[60px]',
                  msg.senderId === authStore.user?.id 
                    ? 'bg-primary text-white dark:bg-gradient-to-br dark:from-primary/20 dark:to-blue-600/20 dark:backdrop-blur-md dark:border-primary/30 dark:shadow-neon rounded-br-none border-primary'
                    : 'bg-white dark:bg-white/10 dark:backdrop-blur-md text-gray-700 dark:text-slate-200 border-gray-200 dark:border-white/5 rounded-bl-none'
                ]">
                  <!-- Deleted Message -->
                  <p v-if="msg.isDeleted || msg.contentType === 'deleted'" class="p-3.5 text-sm italic opacity-70 flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px]">block</span> {{ msg.content }}
                  </p>
                  
                  <!-- Normal Message (not deleted) -->
                  <template v-else>
                    <!-- Reply Context (shown above the content) -->
                    <div v-if="msg.replyTo" class="px-2.5 py-1.5 mx-2 mt-2 mb-0 bg-black/10 dark:bg-black/20 rounded border-l-[3px] border-black/20 dark:border-white/20 cursor-pointer hover:opacity-80 transition-opacity" @click="scrollToMessage(msg.replyTo)">
                       <span class="text-[10px] font-bold block opacity-70 leading-none mb-1">Respondendo a</span>
                       <p class="text-xs truncate italic opacity-90 leading-tight">{{ getMessageSnippet(msg.replyTo) }}</p>
                    </div>
                    
                    <!-- Text Message -->
                    <div v-if="!msg.contentType || msg.contentType === 'text'" class="flex flex-col">
                      <p class="p-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-lg" :class="msg.replyTo ? 'pt-1' : ''"><span v-html="renderMessageContent(msg.content)"></span></p>
                      <!-- Translation display -->
                      <div v-if="msg.aiTranslation" class="mx-3 mb-3 mt-0 p-2.5 bg-blue-50/80 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs leading-relaxed text-gray-800 dark:text-gray-300 relative shadow-inner">
                        <span class="absolute -top-2 -left-2 bg-blue-100 dark:bg-blue-800 size-5 flex items-center justify-center rounded-full text-[10px] shadow-sm border border-blue-200 dark:border-blue-700">🌍</span>
                        {{ msg.aiTranslation }}
                      </div>
                    </div>
                    
                    <!-- Image Message -->
                    <div v-else-if="msg.contentType === 'image'" class="p-1">
                      <img :src="getApiUrl(msg.content)" class="rounded-lg max-w-sm max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" @click="openImage(getApiUrl(msg.content))" />
                    </div>

                    <!-- Audio Message -->
                    <div v-else-if="msg.contentType === 'audio'" class="p-2 flex flex-col gap-2 relative">
                      <audio :src="getApiUrl(msg.content)" controls class="h-10 w-full max-w-[200px] custom-audio"></audio>
                      <button v-if="!msg.aiTranscription" @click="transcribeAudio(msg)" class="self-start text-[10px] flex items-center gap-1 mt-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-500/20 transition-all border border-purple-500/20" title="Criar resumo da IA para ler rápido sem ouvir">
                        <span class="material-symbols-outlined text-[12px]" :class="msg.isTranscribing ? 'animate-spin' : ''">{{ msg.isTranscribing ? 'progress_activity' : 'auto_awesome' }}</span> 
                        {{ msg.isTranscribing ? 'Lendo Áudio...' : 'Anotar c/ IA' }}
                      </button>
                      <div v-if="msg.aiTranscription" class="mx-1 mb-1 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30 text-[11px] leading-tight text-gray-800 dark:text-gray-300">
                        {{ msg.aiTranscription }}
                      </div>
                    </div>

                    <!-- File/PDF/Video Message -->
                    <div v-else class="p-3 flex items-center gap-3 min-w-[200px]">
                      <div class="size-10 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center">
                        <span class="material-symbols-outlined text-2xl" v-if="msg.contentType === 'video'">movie</span>
                        <span class="material-symbols-outlined text-2xl" v-else-if="msg.contentType === 'pdf'">picture_as_pdf</span>
                        <span class="material-symbols-outlined text-2xl" v-else>description</span>
                      </div>
                      <div class="flex flex-col flex-1 min-w-0">
                        <span class="text-sm font-medium truncate w-full">{{ getFileName(msg.content) }}</span>
                        <a 
                          :href="getApiUrl(msg.content)" 
                          target="_blank" 
                          download 
                          class="text-xs opacity-70 hover:opacity-100 hover:underline flex items-center gap-1"
                        >
                          Download <span class="material-symbols-outlined text-[10px]">download</span>
                        </a>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- Delete/Edit buttons (Hover) -->
                <div v-if="!msg.isDeleted && msg.contentType !== 'deleted'" class="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button v-if="(!msg.contentType || msg.contentType === 'text') && !msg.aiTranslation" @click="translateMessage(msg)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-500" title="Traduzir Mensagem (IA)"><span class="material-symbols-outlined text-[14px]" :class="msg.isTranslating ? 'animate-spin' : ''">{{ msg.isTranslating ? 'progress_activity' : 'translate' }}</span></button>
                  <button @click="startReply(msg)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-cyan-500" title="Responder"><span class="material-symbols-outlined text-[14px]">reply</span></button>
                  <button v-if="msg.senderId === authStore.user?.id && (!msg.contentType || msg.contentType === 'text')" @click="startEdit(msg)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"><span class="material-symbols-outlined text-[14px]">edit</span></button>
                  <button v-if="msg.senderId === authStore.user?.id" @click="deleteMsg(msg.id)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-500"><span class="material-symbols-outlined text-[14px]">delete</span></button>
                </div>
              </div>

              <div class="flex items-center gap-1 mt-0.5 px-1 truncate max-w-full justify-end flex-wrap">
                <!-- Reactions -->
                <div v-if="msg.reactions && Object.keys(msg.reactions).length > 0" class="flex gap-1 mr-2 bg-gray-100 dark:bg-black/30 rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-white/10">
                   <div v-for="(users, emoji) in msg.reactions" :key="emoji" @click="toggleReaction(msg.id, emoji)" class="flex items-center gap-1 cursor-pointer text-[10px] hover:scale-110 transition-transform" :class="users.includes(authStore.user?.id) ? 'text-primary' : ''">
                      <span>{{ emoji }}</span> <span class="font-bold">{{ users.length }}</span>
                   </div>
                </div>

                <div class="flex items-center gap-1">
                  <!-- Quick Reactions -->
                  <div class="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1 mr-2 transition-opacity">
                     <span class="cursor-pointer hover:scale-125 transition-transform" @click="toggleReaction(msg.id, '👍')">👍</span>
                     <span class="cursor-pointer hover:scale-125 transition-transform" @click="toggleReaction(msg.id, '❤️')">❤️</span>
                  </div>

                  <span v-if="msg.expiresAt" class="material-symbols-outlined text-[12px] text-red-400 mr-1" title="Mensagem temporária">timer</span>
                  <span class="text-[10px] text-gray-400 dark:text-slate-500">{{ formatTime(msg.createdAt) }}</span>
                  <span v-if="msg.editedAt" class="text-[9px] text-gray-400 dark:text-slate-500 italic ml-1">(editado)</span>
                  <span v-if="msg.senderId === authStore.user?.id" class="material-symbols-outlined text-[14px] ml-1" :class="msg.isRead ? 'text-blue-500 shadow-blue-500/20' : 'text-gray-400'">{{ msg.isRead ? 'done_all' : 'check' }}</span>
                </div>
              </div>
            </div>
            </div>

          </template>
        </div>
        
        <!-- Input Area -->
        <div class="p-6 pt-2 shrink-0 z-20 bg-gray-50 dark:bg-transparent relative">
          <!-- Typing Indicator -->
          <div v-if="typingUserNames.length > 0" class="absolute -top-6 left-6 text-xs text-gray-500 italic flex items-center gap-1.5 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-full dark:bg-black/30">
             <div class="flex gap-1 pr-1">
               <span class="size-1.5 bg-gray-400 rounded-full animate-bounce"></span>
               <span class="size-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></span>
               <span class="size-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></span>
             </div>
             <span class="font-medium text-primary">{{ typingUserNames.join(', ') }}</span> 
             {{ typingUserNames.length > 1 ? 'estão digitando' : 'está digitando' }}...
          </div>

          <!-- Edit / Reply Banner -->
          <div v-if="editingMessageId || replyingToMessage" class="absolute -top-10 left-6 right-6 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-t-xl text-xs font-medium flex justify-between items-center border border-yellow-200 dark:border-yellow-900/50 backdrop-blur-md">
            <div class="flex items-center gap-2 w-full pr-4 overflow-hidden">
              <span class="material-symbols-outlined text-[16px]">{{ replyingToMessage ? 'reply' : 'edit' }}</span> 
              <span class="truncate">{{ replyingToMessage ? `Respondendo: ${getMessageSnippet(replyingToMessage.id)}` : 'Editando mensagem' }}</span>
            </div>
            <button @click="cancelEditOrReply" class="text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-100 shrink-0"><span class="material-symbols-outlined text-sm">close</span></button>
          </div>

          <!-- Emoji Picker (Absolute positioned) -->
          <div v-if="showEmojiPicker" class="absolute bottom-20 left-6 z-30 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
            <emoji-picker class="light dark:dark"></emoji-picker>
          </div>

          <div class="bg-white dark:bg-glass-surface border border-gray-200 dark:border-glass-border rounded-2xl p-2 flex flex-col gap-2 shadow-lg relative" :class="editingMessageId ? 'rounded-tl-none rounded-tr-none' : ''">
            <div class="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-2xl opacity-50 pointer-events-none hidden dark:block"></div>
            <!-- Respostas Rápidas IA -->
            <div class="flex items-center gap-2 mb-2 ml-[44px] max-w-full overflow-x-auto no-scrollbar" v-if="!isRecording">
              <button v-if="!smartReplies.length" @click="generateSmartReplies" :disabled="isGeneratingReplies" class="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all whitespace-nowrap disabled:opacity-50" title="Ler a última mensagem recebida e gerar dicas de respostas curtas">
                <span class="material-symbols-outlined text-[14px]" :class="isGeneratingReplies ? 'animate-spin' : ''">
                  {{ isGeneratingReplies ? 'progress_activity' : 'smart_toy' }}
                </span>
                {{ isGeneratingReplies ? 'Analisando...' : 'Sugerir Respostas com IA' }}
              </button>
              <template v-else>
                <button v-for="(reply, idx) in smartReplies" :key="idx" @click="useSmartReply(reply)" class="flex items-center gap-1 px-4 py-1.5 rounded-full bg-white dark:bg-glass-surface text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all whitespace-nowrap shadow-sm">
                  {{ reply }}
                </button>
                <button @click="smartReplies = []" class="size-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 transition-colors shrink-0" title="Fechar">
                  <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
              </template>
            </div>
            
            <div class="flex items-end gap-1 md:gap-2 w-full relative">
            
            <!-- File Upload Input (Hidden) -->
            <input 
              type="file" 
              ref="fileInput" 
              class="hidden" 
              @change="handleFileUpload"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
            />
            
            <button 
              id="tour-attachment"
              @click="$refs.fileInput.click()"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors mb-0.5 shrink-0"
              :disabled="editingMessageId"
              :class="editingMessageId ? 'opacity-50 cursor-not-allowed' : ''"
            >
              <span class="material-symbols-outlined transform rotate-45">attach_file</span>
            </button>
            <select v-model="messageExpiresIn" class="mb-1 ml-1 text-xs bg-transparent border-none text-gray-500 dark:text-slate-400 p-1 cursor-pointer outline-none ring-0 w-16" title="Temporizador de Autodestruição">
                <option :value="null">Off</option>
                <option :value="60">1m</option>
                <option :value="600">10m</option>
                <option :value="3600">1h</option>
            </select>
            
            <div class="flex-1 min-h-[44px] py-2.5 flex items-center gap-2">
              <span v-if="isRecording" class="flex items-center gap-2 text-red-500 animate-pulse text-sm font-medium px-2">
                <span class="material-symbols-outlined text-lg">mic</span> Gravando áudio...
              </span>
              <textarea 
                id="tour-input"
                v-else
                v-model="newMessage"
                @keyup.enter.exact="sendMessage"
                rows="1"
                @input="handleTyping"
                :placeholder="locale.t.chat.typeMessage + ' (Shift+Enter para pular linha)'"
                class="w-full bg-transparent border-none p-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-0 resize-none max-h-32"
                title="Escreva sua mensagem aqui"
              ></textarea>
            </div>

            <!-- Mentions Dropdown -->
            <div v-if="showMentionDropdown && filteredMentionUsers.length > 0" class="absolute bottom-full left-10 mb-2 w-64 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-xl max-h-48 overflow-y-auto">
              <div class="px-3 py-2 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-white/5">Membros</div>
              <ul>
                <li v-for="u in filteredMentionUsers" :key="u.id" 
                    class="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    @click="selectMention(u)">
                   <div class="size-6 rounded-full bg-gradient-to-br from-primary/50 to-primary flex items-center justify-center text-white text-[10px] uppercase shadow-sm shrink-0">
                      {{ (u.full_name || u.username).substring(0, 2) }}
                   </div>
                   <div class="flex flex-col overflow-hidden leading-tight">
                     <span class="text-xs font-semibold text-gray-900 dark:text-white truncate">{{ u.full_name || u.username }}</span>
                     <span class="text-[10px] text-gray-500 truncate">@{{ u.username }}</span>
                   </div>
                </li>
              </ul>
            </div>
            
            <div class="flex items-center gap-1 mb-0.5 shrink-0 relative">
              <!-- Botão Varinha Mágica -->
              <div class="relative">
                <button 
                  id="tour-magic"
                  @click="showMagicMenu = !showMagicMenu"
                  class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-purple-500 flex items-center justify-center transition-colors relative"
                  title="Varinha Mágica (IA)"
                  v-if="!isRecording"
                  :disabled="!newMessage.trim() || isProcessingMagic"
                  :class="(!newMessage.trim() || isProcessingMagic) ? 'opacity-50 cursor-not-allowed' : ''"
                >
                  <span v-if="isProcessingMagic" class="material-symbols-outlined text-purple-500 animate-spin">progress_activity</span>
                  <template v-else>
                    <span class="material-symbols-outlined text-[22px]">auto_awesome</span>
                    <span v-if="newMessage.trim()" class="absolute top-1 right-1 size-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></span>
                  </template>
                </button>
                
                <!-- Menu IA -->
                <div v-if="showMagicMenu" class="absolute bottom-full right-0 md:-left-1/2 mb-2 w-56 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-xl">
                  <div class="p-2 border-b border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-400 dark:text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-xs">auto_awesome</span> Inteligência Artificial
                  </div>
                  <button @click="applyMagicText('professional')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                    <span class="material-symbols-outlined text-[18px] text-blue-500">work</span>
                    <div class="flex flex-col leading-tight gap-0.5">
                      <span class="font-medium">Tom Profissional</span>
                      <span class="text-[10px] text-gray-400">Reescrever para o trabalho</span>
                    </div>
                  </button>
                  <button @click="applyMagicText('grammar')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                    <span class="material-symbols-outlined text-[18px] text-green-500">spellcheck</span>
                    <div class="flex flex-col leading-tight gap-0.5">
                      <span class="font-medium">Corrigir Erros</span>
                      <span class="text-[10px] text-gray-400">Gramática e pontuação</span>
                    </div>
                  </button>
                  <button @click="applyMagicText('english')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                    <span class="material-symbols-outlined text-[18px] text-red-500">translate</span>
                    <div class="flex flex-col leading-tight gap-0.5">
                      <span class="font-medium">Traduzir (Inglês)</span>
                      <span class="text-[10px] text-gray-400">Native english translation</span>
                    </div>
                  </button>
                  <button @click="applyMagicText('summarize')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                    <span class="material-symbols-outlined text-[18px] text-amber-500">short_text</span>
                    <div class="flex flex-col leading-tight gap-0.5">
                      <span class="font-medium">Resumir Tópicos</span>
                      <span class="text-[10px] text-gray-400">Para mensagens grandes</span>
                    </div>
                  </button>
                </div>
              </div>

              <button 
                @click="showEmojiPicker = !showEmojiPicker"
                class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-accent flex items-center justify-center transition-colors"
                title="Inserir um Emoji (Rostinhos)"
                v-if="!isRecording"
              >
                <span class="material-symbols-outlined">sentiment_satisfied</span>
              </button>
              
              <button 
                v-if="!newMessage.trim() && !editingMessageId"
                @mousedown="startRecording"
                @mouseup="stopRecording"
                @touchstart.prevent="startRecording"
                @touchend.prevent="stopRecording"
                class="h-10 w-10 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-xl flex items-center justify-center transition-all select-none"
                :class="isRecording ? 'bg-red-500 text-white dark:bg-red-600 shadow-lg shadow-red-500/50 scale-110' : ''"
                title="Segure para gravar áudio"
              >
                <span class="material-symbols-outlined text-[20px]">mic</span>
              </button>
              
              <button 
                v-else
                @click="sendMessage"
                class="h-10 px-4 ml-1 bg-primary hover:bg-cyan-400 text-white dark:text-background-dark rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm dark:shadow-neon"
              >
                <span>{{ editingMessageId ? 'Salvar' : locale.t.chat.send }}</span>
                <span class="material-symbols-outlined text-[18px]" v-if="!editingMessageId">send</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </template>
      
      <!-- No conversation selected -->
      <template v-else>
        <div class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-transparent px-4">
          <div class="text-center text-gray-400 dark:text-slate-500 max-w-sm">
            <span class="material-symbols-outlined text-6xl mb-4 block opacity-30 text-primary">forum</span>
            <p class="text-xl font-bold text-gray-700 dark:text-gray-300">{{ locale.t.chat.selectConversation }}</p>
            <p class="text-sm mt-2 opacity-70">Escolha um contato na lista ao lado ou inicie uma nova conversa para enviar mensagens, áudios e arquivos de forma segura.</p>
          </div>
        </div>
      </template>
    </main>

    <!-- New Chat Modal -->
    <div v-if="showNewChatModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md rounded-2xl p-6 relative flex flex-col max-h-[80vh] bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ locale.t.chat.newChat }}</h2>
          <button @click="showNewChatModal = false" class="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="flex gap-4 mb-4 border-b border-gray-200 dark:border-white/10">
          <button @click="isCreatingGroup = false" :class="['pb-2 text-sm font-medium transition-colors', !isCreatingGroup ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Conversa Direta</button>
          <button @click="isCreatingGroup = true" :class="['pb-2 text-sm font-medium transition-colors', isCreatingGroup ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Novo Grupo</button>
        </div>

        <template v-if="!isCreatingGroup">
          <input 
            v-model="userFilter"
            type="text" 
            :placeholder="locale.t.chat.userSearch"
            class="w-full px-4 py-2 rounded-xl mb-4 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner"
          />
          
          <div class="flex-1 overflow-y-auto min-h-[200px] flex flex-col gap-2">
            <button
              v-for="user in filteredUsers"
              :key="user.id"
              @click="startConversation(user.id)"
              class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-left group"
            >
              <div 
                class="bg-center bg-no-repeat bg-cover rounded-full size-10"
                :style="{ backgroundImage: `url(${user.avatarUrl || defaultAvatar})` }"
              ></div>
              <div class="flex flex-col">
                <span class="text-gray-900 dark:text-white font-medium group-hover:text-primary transition-colors">{{ user.fullName }}</span>
                <span class="text-xs text-gray-500 dark:text-slate-500">@{{ user.username }}</span>
              </div>
            </button>
            <p v-if="filteredUsers.length === 0" class="text-gray-500 dark:text-slate-500 text-center py-4">
              {{ locale.t.chat.noUsers }}
            </p>
          </div>
        </template>

        <template v-else>
          <div class="flex flex-col gap-3 mb-4">
             <input v-model="groupName" placeholder="Nome do Canal/Grupo (ex: Geral)" class="w-full px-4 py-2 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
             <input v-model="groupDescription" placeholder="Descrição (Opcional)" class="w-full px-4 py-2 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
          </div>

          <label class="flex items-center gap-2 cursor-pointer mb-4 select-none p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 border border-transparent transition-colors">
            <input type="checkbox" v-model="isPublicGroup" class="form-checkbox rounded text-primary focus:ring-primary border-gray-300 dark:border-white/20 bg-white dark:bg-black/20" />
            <div class="flex flex-col">
              <span class="text-sm font-bold text-gray-900 dark:text-white">Canal Público</span>
              <span class="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">Membros da empresa podem descobrir e entrar sem convite direto.</span>
            </div>
          </label>

          <p class="text-[10px] text-gray-500 dark:text-slate-400 mb-2 font-bold uppercase tracking-wider">Adicionar Participantes <span v-if="!isPublicGroup">(Mín. 1)</span>:</p>
          <input v-model="userFilter" placeholder="Buscar usuário por nome..." class="w-full px-4 py-2 rounded-xl mb-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
          
          <div class="flex-1 overflow-y-auto max-h-[160px] flex flex-col gap-1 pr-1">
            <label v-for="user in filteredUsers" :key="user.id" class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer select-none">
              <input type="checkbox" :value="user.id" v-model="selectedUsers" class="form-checkbox rounded text-primary focus:ring-primary bg-white dark:bg-black/20 border-gray-300 dark:border-white/20 size-4" />
              <div class="bg-cover bg-center rounded-full size-8" :style="{ backgroundImage: `url(${user.avatarUrl || defaultAvatar})` }"></div>
              <div class="flex flex-col">
                <span class="text-sm text-gray-900 dark:text-white font-medium">{{ user.fullName }}</span>
              </div>
            </label>
            <p v-if="filteredUsers.length === 0" class="text-gray-500 dark:text-slate-500 text-center py-4 text-sm">
              {{ locale.t.chat.noUsers }}
            </p>
          </div>
          <button @click="createGroup" :disabled="!groupName.trim() || (!isPublicGroup && selectedUsers.length === 0)" class="mt-4 w-full bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold py-2.5 rounded-xl transition-colors shadow-sm dark:shadow-neon disabled:opacity-50 disabled:cursor-not-allowed">
            Criar {{ isPublicGroup ? 'Canal' : 'Grupo' }}
          </button>
        </template>
      </div>
    </div>

    <!-- Public Channels Modal -->
    <div v-if="showPublicChannelsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md rounded-2xl p-6 relative flex flex-col max-h-[80vh] bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="material-symbols-outlined text-primary text-[28px]">explore</span>
            Descobrir Canais
          </h2>
          <button @click="showPublicChannelsModal = false" class="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto min-h-[200px] flex flex-col gap-2">
          <div
            v-for="channel in chatStore.publicChannels"
            :key="channel.id"
            class="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-transparent hover:border-primary/20 transition-all"
          >
            <div class="flex items-center gap-3 min-w-0 pr-2">
              <div class="size-10 rounded-full bg-indigo-500/80 text-white flex flex-shrink-0 items-center justify-center shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                <span class="material-symbols-outlined text-lg">public</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-gray-900 dark:text-white font-bold leading-tight truncate">#{{ channel.name }}</span>
                <span class="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">{{ channel.description || 'Sem descrição' }}</span>
                <span class="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 font-medium">{{ channel.member_count }} membros</span>
              </div>
            </div>
            
            <button 
              v-if="!channel.is_member"
              @click="joinChannel(channel.id)" 
              :disabled="isJoiningChannel"
              class="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-cyan-400 active:scale-95 transition-all shadow-sm disabled:opacity-50"
            >
              Entrar
            </button>
            <span v-else class="text-[11px] font-bold text-green-500 bg-green-500/10 px-2.5 py-1 rounded-md flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">check_circle</span>
              Membro
            </span>
          </div>
          
          <p v-if="chatStore.publicChannels.length === 0" class="text-gray-400 dark:text-slate-500 text-center py-8">
            <span class="material-symbols-outlined text-4xl mb-2 opacity-50 block">search_off</span>
            <span class="font-medium text-sm text-gray-600 dark:text-gray-400">Nenhum canal público encontrado.</span>
            <span class="block text-xs opacity-70 mt-1">Seja o primeiro a criar um canal aberto!</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Group Info Modal -->
    <div v-if="showGroupInfo && chatStore.activeConversation?.isGroup" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-sm rounded-2xl p-6 relative flex flex-col bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Detalhes do Grupo</h2>
          <button @click="showGroupInfo = false" class="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div class="flex flex-col items-center mb-6">
           <div class="bg-center bg-cover rounded-full size-20 mb-3 border-4 border-primary/20" :style="{ backgroundImage: `url(${chatStore.activeConversation.isGroup ? defaultAvatar : (chatStore.activeConversation.participants.find(p => p.id !== authStore.user?.id)?.avatar_url || defaultAvatar)})` }"></div>
           <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ chatStore.activeConversation.name || chatStore.activeConversation.participants.filter(p => p.id !== authStore.user?.id).map(p => p.full_name || p.username).join(', ') }}</h3>
           <p class="text-sm text-gray-500 dark:text-slate-400 text-center mt-1 font-medium">{{ chatStore.activeConversation.participants.length }} Participantes</p>
        </div>

        <div class="flex gap-4 mb-4 border-b border-gray-200 dark:border-white/10 w-full justify-center">
          <button @click="infoTab = 'members'" :class="['pb-2 text-sm font-medium transition-colors', infoTab === 'members' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Membros</button>
          <button @click="infoTab = 'media'" :class="['pb-2 text-sm font-medium transition-colors', infoTab === 'media' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Mídia</button>
          <button @click="infoTab = 'files'" :class="['pb-2 text-sm font-medium transition-colors', infoTab === 'files' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Arquivos</button>
          <button @click="infoTab = 'calls'" :class="['pb-2 text-sm font-medium transition-colors', infoTab === 'calls' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200']">Chamadas</button>
        </div>

        <div v-if="infoTab === 'members'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full">
          <div v-for="p in chatStore.activeConversation.participants" :key="p.id" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/20">
             <div class="bg-cover bg-center rounded-full size-8" :style="{ backgroundImage: `url(${p.avatar_url || defaultAvatar})` }"></div>
             <span class="text-sm text-gray-900 dark:text-white font-medium truncate flex-1">{{ p.full_name || p.username }}</span>
             <span v-if="p.id === authStore.user?.id" class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Você</span>
          </div>
        </div>

        <!-- MEDIA TAB: images + audio + videos -->
        <div v-if="infoTab === 'media'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full relative">
           <!-- Images -->
           <p v-if="chatStore.activeMessages.filter(m => ['image'].includes(m.contentType)).length > 0" class="text-[10px] uppercase text-gray-400 dark:text-slate-500 font-bold tracking-wider mb-1">🖼️ Imagens</p>
           <div class="grid grid-cols-3 gap-2 mb-3">
              <template v-for="msg in chatStore.activeMessages">
                 <div v-if="msg.contentType === 'image'" :key="msg.id" class="aspect-square bg-gray-100 dark:bg-black/20 rounded-lg overflow-hidden cursor-pointer">
                    <img :src="getApiUrl(msg.content)" class="w-full h-full object-cover" @click="openImage(getApiUrl(msg.content))">
                 </div>
              </template>
           </div>
           <!-- Audios -->
           <p v-if="chatStore.activeMessages.filter(m => m.contentType === 'audio').length > 0" class="text-[10px] uppercase text-gray-400 dark:text-slate-500 font-bold tracking-wider mb-1">🎧 Áudios</p>
           <div class="flex flex-col gap-1 mb-3">
              <template v-for="msg in chatStore.activeMessages">
                 <div v-if="msg.contentType === 'audio'" :key="msg.id" class="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-black/20">
                    <span class="material-symbols-outlined text-green-500" style="font-size: 18px;">graphic_eq</span>
                    <audio :src="getApiUrl(msg.content)" controls class="h-8 flex-1 custom-audio"></audio>
                    <span class="text-[10px] text-gray-400">{{ formatTime(msg.createdAt) }}</span>
                 </div>
              </template>
           </div>
           <!-- Videos -->
           <p v-if="chatStore.activeMessages.filter(m => m.contentType === 'video').length > 0" class="text-[10px] uppercase text-gray-400 dark:text-slate-500 font-bold tracking-wider mb-1">🎬 Vídeos</p>
           <div class="flex flex-col gap-1 mb-3">
              <template v-for="msg in chatStore.activeMessages">
                 <div v-if="msg.contentType === 'video'" :key="msg.id" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/20">
                    <span class="material-symbols-outlined text-primary" style="font-size: 20px;">movie</span>
                    <span class="text-sm text-gray-700 dark:text-slate-200 truncate flex-1">{{ getFileName(msg.content) }}</span>
                    <a :href="getApiUrl(msg.content)" target="_blank" download class="text-xs text-primary hover:underline">Baixar</a>
                 </div>
              </template>
           </div>
           <div v-if="chatStore.activeMessages.filter(m => ['image','audio','video'].includes(m.contentType)).length === 0" class="text-center text-xs text-gray-400 py-4">Nenhuma mídia compartilhada.</div>
        </div>

        <!-- FILES TAB: pdfs, docs, archives, etc -->
        <div v-if="infoTab === 'files'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full">
           <template v-for="msg in chatStore.activeMessages">
              <div v-if="msg.contentType && !['text','image','audio','video','call','deleted'].includes(msg.contentType)" :key="msg.id" class="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-black/20">
                 <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span class="material-symbols-outlined text-primary" v-if="msg.contentType === 'pdf'">picture_as_pdf</span>
                    <span class="material-symbols-outlined text-primary" v-else>description</span>
                 </div>
                 <div class="flex flex-col flex-1 min-w-0">
                    <span class="text-xs font-medium text-gray-800 dark:text-slate-200 truncate">{{ getFileName(msg.content) }}</span>
                    <span class="text-[10px] text-gray-400">{{ formatTime(msg.createdAt) }}</span>
                 </div>
                 <a :href="getApiUrl(msg.content)" target="_blank" download class="text-xs text-primary hover:underline flex-shrink-0">Baixar</a>
              </div>
           </template>
           <div v-if="chatStore.activeMessages.filter(m => m.contentType && !['text','image','audio','video','call','deleted'].includes(m.contentType)).length === 0" class="text-center text-xs text-gray-400 py-4">Nenhum arquivo compartilhado.</div>
        </div>

        <!-- CALLS TAB: call logs -->
        <div v-if="infoTab === 'calls'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full">
           <template v-for="msg in chatStore.activeMessages">
              <div v-if="msg.contentType === 'call'" :key="msg.id" class="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-black/20">
                 <div class="size-9 rounded-lg flex items-center justify-center flex-shrink-0"
                   :class="parseCallLog(msg.content).status === 'missed' || parseCallLog(msg.content).status === 'declined' ? 'bg-red-50 dark:bg-red-500/10' : 'bg-green-50 dark:bg-green-500/10'">
                    <span class="material-symbols-outlined" :class="parseCallLog(msg.content).status === 'missed' ? 'text-red-400' : parseCallLog(msg.content).callType === 'video' ? 'text-primary' : 'text-green-500'">
                      {{ parseCallLog(msg.content).callType === 'video' ? 'videocam' : parseCallLog(msg.content).callType === 'screen' ? 'present_to_all' : 'call' }}
                    </span>
                 </div>
                 <div class="flex flex-col flex-1 min-w-0">
                    <span class="text-xs font-medium text-gray-800 dark:text-slate-200">
                       <span v-if="msg.senderId === authStore.user?.id">Você</span>
                       <span v-else>{{ msg.senderName || msg.senderUsername }}</span>
                       —
                       {{ parseCallLog(msg.content).callType === 'video' ? 'Vídeo' : parseCallLog(msg.content).callType === 'screen' ? 'Tela' : 'Voz' }}
                       {{ parseCallLog(msg.content).isGroup ? '(Grupo)' : '' }}
                    </span>
                    <span class="text-[10px] text-gray-400">
                       <span v-if="parseCallLog(msg.content).status === 'missed'" class="text-red-400">Não atendida</span>
                       <span v-else-if="parseCallLog(msg.content).status === 'declined'" class="text-red-400">Recusada</span>
                       <span v-else>{{ formatCallDuration(parseCallLog(msg.content).duration) }}</span>
                       · {{ formatTime(msg.createdAt) }}
                    </span>
                 </div>
              </div>
           </template>
           <div v-if="chatStore.activeMessages.filter(m => m.contentType === 'call').length === 0" class="text-center text-xs text-gray-400 py-4">Nenhuma chamada registrada.</div>
        </div>

        <button v-if="chatStore.activeConversation?.isGroup" @click="leaveGroup" class="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-900/30">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          Sair do Grupo
        </button>
      </div>
    </div>
    <!-- Active Call Overlay (Takes entire screen) -->
    <div v-if="webrtcStore.callState !== 'idle'" class="fixed inset-0 z-[100] bg-black overflow-hidden select-none touch-none">
      
      <!-- ===== BACKGROUND LAYER ===== -->
      <!-- Cinematic avatar blur background (always visible) -->
      <div 
        class="absolute inset-0 bg-center bg-cover scale-[1.5]"
        style="filter: blur(80px); opacity: 0.45;"
        :style="{ backgroundImage: `url(${webrtcStore.remoteUser.avatar || defaultAvatar})` }"
      ></div>
      <!-- Dark overlay gradient -->
      <div class="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70"></div>

      <!-- ===== REMOTE VIDEO (fills 100% when connected) ===== -->
      <video
        v-show="webrtcStore.isVideoCall && webrtcStore.callState === 'connected'"
        :srcObject="webrtcStore.remoteStream"
        autoplay
        playsinline
        class="absolute inset-0 w-full h-full"
        style="object-fit: contain; background: #000;"
        ref="remoteVideoEl"
      ></video>

      <!-- ===== AUDIO-ONLY / WAITING PLACEHOLDER ===== -->
      <Transition name="fade">
        <div v-if="!webrtcStore.isVideoCall || webrtcStore.callState !== 'connected'" class="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10">
          <!-- Pulse rings -->
          <div class="relative flex items-center justify-center">
            <div v-if="webrtcStore.callState !== 'idle'" class="absolute rounded-full bg-primary/20 animate-ping" style="width: 220px; height: 220px;"></div>
            <div v-if="webrtcStore.callState !== 'idle'" class="absolute rounded-full bg-primary/10 animate-ping animation-delay-300" style="width: 270px; height: 270px; animation-delay: 0.4s;"></div>
            <!-- Avatar -->
            <div
              class="relative bg-center bg-cover rounded-full border-4 border-white/20 shadow-2xl z-10"
              style="width: 160px; height: 160px;"
              :style="{ backgroundImage: `url(${webrtcStore.remoteUser.avatar || defaultAvatar})` }"
            ></div>
          </div>
          <div class="flex flex-col items-center gap-2 mt-2">
            <h2 class="text-white font-bold tracking-tight" style="font-size: clamp(1.5rem, 5vw, 2.5rem);">{{ webrtcStore.remoteUser.name }}</h2>
            <p class="text-sm font-semibold uppercase tracking-widest" :class="webrtcStore.callState === 'connected' ? 'text-green-400' : 'text-primary animate-pulse'">
              <span v-if="webrtcStore.callState === 'calling'">Chamando...</span>
              <span v-else-if="webrtcStore.callState === 'receiving'">Chamada Recebida</span>
              <span v-else-if="webrtcStore.callState === 'connected'">{{ callDuration }}</span>
            </p>
          </div>
        </div>
      </Transition>

      <!-- ===== PiP LOCAL VIDEO (top-right draggable card) ===== -->
      <div
        v-show="webrtcStore.isVideoCall && webrtcStore.callState === 'connected'"
        class="absolute z-30 overflow-hidden rounded-2xl border border-white/20 bg-black cursor-move active:scale-95 transition-transform duration-150"
        style="top: 20px; right: 16px; width: clamp(90px, 22vw, 150px); height: clamp(120px, 30vw, 200px); box-shadow: 0 8px 32px rgba(0,0,0,0.6);"
        @mousedown="startPipDrag"
        @touchstart.prevent="startPipDragTouch"
        ref="pipEl"
      >
        <video
          :srcObject="webrtcStore.localStream"
          autoplay
          playsinline
          muted
          class="w-full h-full object-cover"
          style="transform: scaleX(-1);"
        ></video>
        <!-- Muted badge inside PiP -->
        <div v-if="isMuted" class="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur rounded-full p-1">
          <span class="material-symbols-outlined text-red-400" style="font-size: 12px;">mic_off</span>
        </div>
        <!-- "Você" label -->
        <div class="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur rounded px-1.5 py-0.5">
          <span class="text-white" style="font-size: 9px; font-weight: 600;">VOCÊ</span>
        </div>
      </div>

      <!-- ===== TOP BAR (name + timer when in video call) ===== -->
      <div v-if="webrtcStore.isVideoCall && webrtcStore.callState === 'connected'" class="absolute top-0 inset-x-0 z-20 flex items-center justify-center pt-12 pb-4 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
        <div class="flex flex-col items-center gap-1">
          <span class="text-white font-semibold text-lg drop-shadow-lg">{{ webrtcStore.remoteUser.name }}</span>
          <span class="text-green-400 text-xs font-semibold uppercase tracking-widest">{{ callDuration }}</span>
        </div>
      </div>

      <!-- ===== BOTTOM CONTROLS BAR ===== -->
      <div class="absolute bottom-0 inset-x-0 z-30 flex justify-center"
        style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 28px); padding-top: 80px; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);">
        
        <div class="flex items-end gap-5">
          
          <!-- === RECEIVING STATE: Decline + Accept === -->
          <template v-if="webrtcStore.callState === 'receiving'">
            <!-- Decline -->
            <div class="flex flex-col items-center gap-2">
              <button @click="webrtcStore.endCall()"
                class="flex items-center justify-center rounded-full bg-red-500 active:scale-90 transition-transform"
                style="width: 68px; height: 68px; box-shadow: 0 0 24px rgba(239,68,68,0.5);">
                <span class="material-symbols-outlined text-white text-3xl" style="transform: rotate(135deg);">call</span>
              </button>
              <span class="text-white/70 text-xs font-medium">Recusar</span>
            </div>
            <!-- Accept -->
            <div class="flex flex-col items-center gap-2">
              <button @click="webrtcStore.answerCall(incomingOffer)"
                class="flex items-center justify-center rounded-full bg-green-500 active:scale-90 transition-transform animate-bounce"
                style="width: 80px; height: 80px; box-shadow: 0 0 30px rgba(34,197,94,0.6);">
                <span class="material-symbols-outlined text-white text-4xl">call</span>
              </button>
              <span class="text-white/70 text-xs font-medium">Atender</span>
            </div>
          </template>

          <!-- === ACTIVE CALL STATE: controls === -->
          <template v-else>
            <!-- Mic toggle -->
            <div class="flex flex-col items-center gap-2">
              <button @click="toggleMuteVideo"
                class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
                style="width: 58px; height: 58px;"
                :style="isMuted ? 'background: white; border-color: white;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
                <span class="material-symbols-outlined text-2xl" :class="isMuted ? 'text-gray-900' : 'text-white'">{{ isMuted ? 'mic_off' : 'mic' }}</span>
              </button>
              <span class="text-white/60 text-xs">{{ isMuted ? 'Mutado' : 'Microfone' }}</span>
            </div>

            <!-- Camera toggle (video calls only) -->
            <div v-if="webrtcStore.isVideoCall" class="flex flex-col items-center gap-2">
              <button @click="toggleCamera"
                class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
                style="width: 58px; height: 58px;"
                :style="isCamOff ? 'background: white; border-color: white;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
                <span class="material-symbols-outlined text-2xl" :class="isCamOff ? 'text-gray-900' : 'text-white'">{{ isCamOff ? 'videocam_off' : 'videocam' }}</span>
              </button>
              <span class="text-white/60 text-xs">{{ isCamOff ? 'Câmera off' : 'Câmera' }}</span>
            </div>

            <!-- Screen share (video calls only) -->
            <div v-if="webrtcStore.isVideoCall" class="flex flex-col items-center gap-2">
              <button @click="toggleScreenShare"
                class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
                style="width: 58px; height: 58px;"
                :style="webrtcStore.isScreenSharing ? 'background: rgb(59,130,246); border-color: rgb(59,130,246);' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
                <span class="material-symbols-outlined text-2xl text-white">present_to_all</span>
              </button>
              <span class="text-white/60 text-xs">{{ webrtcStore.isScreenSharing ? 'Parando...' : 'Tela' }}</span>
            </div>

            <!-- End Call (always last, centered emphasis) -->
            <div class="flex flex-col items-center gap-2">
              <button @click="webrtcStore.endCall()"
                class="flex items-center justify-center rounded-full active:scale-90 transition-transform"
                style="width: 68px; height: 68px; background: #ef4444; box-shadow: 0 0 24px rgba(239,68,68,0.5);">
                <span class="material-symbols-outlined text-white text-3xl">call_end</span>
              </button>
              <span class="text-white/60 text-xs">Encerrar</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- ===== GROUP CALL OVERLAY ===== -->
    <div v-if="groupCallStore.callState !== 'idle'" class="fixed inset-0 z-[100] bg-black overflow-hidden select-none">
      <!-- Gradient background -->
      <div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900"></div>
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"></div>

      <!-- TOP BAR -->
      <div class="absolute top-0 inset-x-0 z-40 flex items-center justify-between px-6 pt-6 pb-4">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span class="material-symbols-outlined text-primary text-xl">{{ groupCallStore.isVideoCall ? 'videocam' : 'call' }}</span>
          </div>
          <div>
            <h2 class="text-white font-bold text-lg">Chamada em Grupo</h2>
            <p class="text-xs font-semibold uppercase tracking-widest" :class="groupCallStore.callState === 'connected' ? 'text-green-400' : 'text-primary animate-pulse'">
              <span v-if="groupCallStore.callState === 'receiving'">Chamada Recebida</span>
              <span v-else>{{ groupCallStore.callDuration }} · {{ groupCallStore.participantCount }}/{{ groupCallStore.MAX_PARTICIPANTS }} participantes</span>
            </p>
          </div>
        </div>
      </div>

      <!-- RECEIVING STATE -->
      <div v-if="groupCallStore.callState === 'receiving'" class="absolute inset-0 flex flex-col items-center justify-center gap-8 z-20">
        <div class="relative flex items-center justify-center">
          <div class="absolute rounded-full bg-primary/20 animate-ping" style="width: 200px; height: 200px;"></div>
          <div class="relative bg-primary/30 rounded-full flex items-center justify-center z-10" style="width: 140px; height: 140px;">
            <span class="material-symbols-outlined text-white text-6xl">groups</span>
          </div>
        </div>
        <div class="text-center">
          <h2 class="text-white font-bold text-2xl mb-2">{{ groupCallStore.incomingCall?.callerName }}</h2>
          <p class="text-white/60 text-sm">está iniciando uma chamada em grupo</p>
        </div>
        <div class="flex gap-8 mt-4">
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.declineGroupCall()"
              class="flex items-center justify-center rounded-full bg-red-500 active:scale-90 transition-transform"
              style="width: 68px; height: 68px; box-shadow: 0 0 24px rgba(239,68,68,0.5);">
              <span class="material-symbols-outlined text-white text-3xl" style="transform: rotate(135deg);">call</span>
            </button>
            <span class="text-white/70 text-xs font-medium">Recusar</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.joinGroupCall()"
              class="flex items-center justify-center rounded-full bg-green-500 active:scale-90 transition-transform animate-bounce"
              style="width: 80px; height: 80px; box-shadow: 0 0 30px rgba(34,197,94,0.6);">
              <span class="material-symbols-outlined text-white text-4xl">call</span>
            </button>
            <span class="text-white/70 text-xs font-medium">Entrar</span>
          </div>
        </div>
      </div>

      <!-- CONNECTED STATE: Video Grid -->
      <div v-if="groupCallStore.callState === 'connected'" class="absolute inset-0 pt-24 pb-28 px-4 z-10">
        <div class="w-full h-full grid gap-3 auto-rows-fr" :class="groupCallGridClass">
          <!-- Local Video (You) -->
          <div class="relative rounded-2xl overflow-hidden bg-gray-800 border border-white/10">
            <video v-if="groupCallStore.localStream" :srcObject="groupCallStore.localStream" autoplay playsinline muted
              class="w-full h-full object-cover" style="transform: scaleX(-1);"></video>
            <div v-else class="w-full h-full flex items-center justify-center">
              <span class="material-symbols-outlined text-white/30 text-5xl">person</span>
            </div>
            <div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <span class="text-white text-xs font-semibold">Você</span>
              <span v-if="groupCallStore.isMuted" class="material-symbols-outlined text-red-400" style="font-size: 12px;">mic_off</span>
              <span v-if="groupCallStore.handRaised" class="text-yellow-400" style="font-size: 14px;">✋</span>
            </div>
          </div>
          <!-- Remote Participants -->
          <div v-for="remote in groupCallStore.remoteStreams" :key="remote.userId" class="relative rounded-2xl overflow-hidden bg-gray-800 border border-white/10">
            <video v-if="remote.stream" :srcObject="remote.stream" autoplay playsinline
              class="w-full h-full object-cover"></video>
            <div v-else class="w-full h-full flex items-center justify-center">
              <div class="bg-center bg-cover rounded-full" style="width: 80px; height: 80px;" :style="{ backgroundImage: `url(${remote.avatar || defaultAvatar})` }"></div>
            </div>
            <div class="absolute bottom-2 left-2 bg-black/60 backdrop-blur rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <span class="text-white text-xs font-semibold">{{ remote.name }}</span>
              <span v-if="remote.handRaised" class="text-yellow-400" style="font-size: 14px;">✋</span>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM CONTROLS -->
      <div v-if="groupCallStore.callState === 'connected'" class="absolute bottom-0 inset-x-0 z-30 flex justify-center"
        style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 28px); padding-top: 60px; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);">
        <div class="flex items-end gap-5">
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.toggleMute()"
              class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
              style="width: 58px; height: 58px;"
              :style="groupCallStore.isMuted ? 'background: white; border-color: white;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
              <span class="material-symbols-outlined text-2xl" :class="groupCallStore.isMuted ? 'text-gray-900' : 'text-white'">{{ groupCallStore.isMuted ? 'mic_off' : 'mic' }}</span>
            </button>
            <span class="text-white/60 text-xs">{{ groupCallStore.isMuted ? 'Mutado' : 'Microfone' }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.toggleHandRaise()"
              class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
              style="width: 58px; height: 58px;"
              :style="groupCallStore.handRaised ? 'background: #eab308; border-color: #eab308;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
              <span class="text-2xl">✋</span>
            </button>
            <span class="text-white/60 text-xs">{{ groupCallStore.handRaised ? 'Abaixar' : 'Mão' }}</span>
          </div>
          <div v-if="groupCallStore.isVideoCall" class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.toggleVideo()"
              class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
              style="width: 58px; height: 58px;"
              :style="groupCallStore.isCamOff ? 'background: white; border-color: white;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
              <span class="material-symbols-outlined text-2xl" :class="groupCallStore.isCamOff ? 'text-gray-900' : 'text-white'">{{ groupCallStore.isCamOff ? 'videocam_off' : 'videocam' }}</span>
            </button>
            <span class="text-white/60 text-xs">{{ groupCallStore.isCamOff ? 'Câmera off' : 'Câmera' }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.toggleScreenShare()"
              class="flex items-center justify-center rounded-full active:scale-90 transition-all border"
              style="width: 58px; height: 58px;"
              :style="groupCallStore.isScreenSharing ? 'background: #3b82f6; border-color: #3b82f6;' : 'background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15);'">
              <span class="material-symbols-outlined text-2xl text-white">{{ groupCallStore.isScreenSharing ? 'stop_screen_share' : 'present_to_all' }}</span>
            </button>
            <span class="text-white/60 text-xs">{{ groupCallStore.isScreenSharing ? 'Parar' : 'Tela' }}</span>
          </div>
          <div class="flex flex-col items-center gap-2">
            <button @click="groupCallStore.endCall()"
              class="flex items-center justify-center rounded-full active:scale-90 transition-transform"
              style="width: 68px; height: 68px; background: #ef4444; box-shadow: 0 0 24px rgba(239,68,68,0.5);">
              <span class="material-symbols-outlined text-white text-3xl">call_end</span>
            </button>
            <span class="text-white/60 text-xs">Sair</span>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Insights Modal -->
    <div v-if="showInsightsModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" @click="showInsightsModal = false">
      <div 
        class="bg-white dark:bg-background-dark w-full max-w-2xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-white/10 transition-transform transform scale-100"
        @click.stop
      >
        <div class="p-6 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-white dark:bg-background-dark">
          <h3 class="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <span class="material-symbols-outlined text-primary text-[32px]">{{ insightsType === 'summarize' ? 'insights' : 'checklist' }}</span>
            {{ insightsType === 'summarize' ? 'Resumo da Conversa' : 'Ações Extraídas' }}
          </h3>
          <button @click="showInsightsModal = false" class="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
            <span class="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto bg-gray-50/50 dark:bg-glass-surface">
          <div v-if="isProcessingInsights" class="flex flex-col items-center justify-center py-16 gap-5 text-gray-500">
             <span class="material-symbols-outlined text-6xl text-primary animate-spin">progress_activity</span>
             <p class="font-bold text-lg animate-pulse dark:text-slate-300">Inteligência Artificial analisando mensagens...</p>
             <p class="text-sm opacity-60">Isso pode levar alguns segundos dependendo do tamanho do histórico.</p>
          </div>
          <div v-else class="text-gray-800 dark:text-gray-200 text-sm md:text-[15px] leading-relaxed select-text space-y-4 prose prose-sm max-w-none dark:prose-invert">
             <!-- Render raw text with basic styling for bullet points or lists if model returns them -->
             <div class="font-medium whitespace-pre-wrap">{{ insightsResult }}</div>
          </div>
        </div>
        <div class="p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-background-dark flex justify-end">
           <button @click="showInsightsModal = false" class="px-6 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-300 dark:hover:bg-white/20 transition-colors">Fechar</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, api } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNetworkStore } from '@/stores/network'
import { useSocketStore } from '@/stores/socket'
import { useUsersStore } from '@/stores/users'
import { useLocaleStore } from '@/stores/locale'
import { useWebRTCStore } from '@/stores/webrtc'
import { useGroupCallStore } from '@/stores/groupCall'
import 'emoji-picker-element'
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const networkStore = useNetworkStore()
const socketStore = useSocketStore()
const usersStore = useUsersStore()
const locale = useLocaleStore()
const webrtcStore = useWebRTCStore()
const groupCallStore = useGroupCallStore()
const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'

// Group call grid layout
const groupCallGridClass = computed(() => {
  const total = groupCallStore.remoteStreams.length + 1 // +1 for self
  if (total <= 1) return 'grid-cols-1'
  if (total <= 2) return 'grid-cols-2'
  if (total <= 4) return 'grid-cols-2'
  if (total <= 6) return 'grid-cols-3'
  return 'grid-cols-4'
})

// WebRTC reactive local state
const isMuted = ref(false)
const isCamOff = ref(false)
const incomingOffer = ref(null)
const callSeconds = ref(0)
const callDuration = computed(() => {
  const m = Math.floor(callSeconds.value / 60).toString().padStart(2, '0')
  const s = (callSeconds.value % 60).toString().padStart(2, '0')
  return `${m}:${s}`
})
let callTimerInterval = null

const remoteVideoEl = ref(null)
const pipEl = ref(null)

const searchQuery = ref('')
const newMessage = ref('')
const messagesContainer = ref(null)
const showNewChatModal = ref(false)
const userFilter = ref('')
const showEmojiPicker = ref(false)
const showMobileSidebar = ref(false)
const fileInput = ref(null)

const showMagicMenu = ref(false)
const isProcessingMagic = ref(false)

// AI Functionalities State
const smartReplies = ref([])
const isGeneratingReplies = ref(false)
const showInsightsModal = ref(false)
const insightsType = ref('summarize')
const isProcessingInsights = ref(false)
const insightsResult = ref('')

const editingMessageId = ref(null)
const replyingToMessage = ref(null)
const messageExpiresIn = ref(null)
const infoTab = ref('members')

const isRecording = ref(false)
let mediaRecorder = null
let audioChunks = []

const isCreatingGroup = ref(false)
const groupName = ref('')
const groupDescription = ref('')
const selectedUsers = ref([])
const showGroupInfo = ref(false)

const unreadCount = computed(() => 
  chatStore.conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
)
// ... computed properties ...

const filteredChannels = computed(() => {
  if (!searchQuery.value) return chatStore.conversations.filter(c => c.isGroup)
  const query = searchQuery.value.toLowerCase()
  return chatStore.conversations.filter(c => 
    c.isGroup && (
      c.name?.toLowerCase().includes(query) ||
      c.participants.some(p => p.full_name?.toLowerCase().includes(query))
    )
  )
})

const filteredDirectMessages = computed(() => {
  if (!searchQuery.value) return chatStore.conversations.filter(c => !c.isGroup)
  const query = searchQuery.value.toLowerCase()
  return chatStore.conversations.filter(c => 
    !c.isGroup && (
      c.name?.toLowerCase().includes(query) ||
      c.participants.some(p => p.full_name?.toLowerCase().includes(query))
    )
  )
})

const recentDevices = computed(() => 
  networkStore.devices.slice(0, 3)
)

const filteredUsers = computed(() => {
  if (!usersStore.users) return []
  const query = userFilter.value.toLowerCase()
  return usersStore.users.filter(u => 
    u.id !== authStore.user?.id && // Exclude self
    (u.fullName?.toLowerCase().includes(query) || u.username?.toLowerCase().includes(query))
  )
})

const showPublicChannelsModal = ref(false)
const isJoiningChannel = ref(false)
const isPublicGroup = ref(false)

async function joinChannel(channelId) {
  isJoiningChannel.value = true;
  try {
    const success = await chatStore.joinPublicChannel(channelId);
    if (success) {
       showPublicChannelsModal.value = false;
       selectConversation(channelId);
    } else {
       alert("Erro ao entrar no canal.");
    }
  } catch (err) {
    alert("Erro ao entrar no canal: " + (err.response?.data?.message || err.message));
  } finally {
    isJoiningChannel.value = false;
  }
}

function selectConversation(id) {
  chatStore.setActiveConversation(id)
  socketStore.joinConversation(id)
}

async function startConversation(userId) {
  const conversationId = await chatStore.createConversation([userId])
  if (conversationId) {
    showNewChatModal.value = false
    selectConversation(conversationId)
  }
}

async function createGroup() {
  if (!groupName.value.trim() || (!isPublicGroup.value && selectedUsers.value.length === 0)) return;
  const conversationId = await chatStore.createConversation(selectedUsers.value, true, groupName.value, groupDescription.value, isPublicGroup.value);
  if (conversationId) {
    showNewChatModal.value = false;
    isCreatingGroup.value = false;
    groupName.value = '';
    groupDescription.value = '';
    selectedUsers.value = [];
    isPublicGroup.value = false;
    selectConversation(conversationId);
  }
}

async function leaveGroup() {
  if (confirm('Tem certeza que deseja sair do grupo?')) {
    try {
      await chatStore.manageGroupParticipants(chatStore.activeConversationId, [], 'leave');
      showGroupInfo.value = false;
      chatStore.setActiveConversation(null);
      await chatStore.fetchConversations();
    } catch(err) {
      alert('Erro ao sair do grupo');
    }
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() && !editingMessageId.value && !replyingToMessage.value && !chatStore.activeConversationId) return
  
  // Stop typing indicator immediately
  if (typingTimeout) clearTimeout(typingTimeout)
  if (chatStore.activeConversationId) {
    socketStore.sendTyping(chatStore.activeConversationId, false)
  }

  if (editingMessageId.value) {
    if (newMessage.value.trim()) {
        await chatStore.editMessage(editingMessageId.value, newMessage.value)
    }
    editingMessageId.value = null
  } else if (newMessage.value.trim()) {
    await chatStore.sendMessage(chatStore.activeConversationId, newMessage.value, 'text', {
        replyTo: replyingToMessage.value ? replyingToMessage.value.id : null,
        expiresIn: messageExpiresIn.value
    })
  }
  
  newMessage.value = ''
  showEmojiPicker.value = false
  replyingToMessage.value = null
  
  await nextTick()
  scrollToBottom()
  
  // Reset textarea height
  const textarea = document.querySelector('textarea')
  if (textarea) textarea.style.height = 'auto'
}

function startEdit(msg) {
  editingMessageId.value = msg.id
  newMessage.value = msg.content
  showEmojiPicker.value = false
  requestAnimationFrame(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      textarea.focus()
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  })
}

function startReply(msg) {
  replyingToMessage.value = msg
  editingMessageId.value = null
  requestAnimationFrame(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) textarea.focus()
  })
}

function cancelEditOrReply() {
  editingMessageId.value = null
  replyingToMessage.value = null
  newMessage.value = ''

  if (typingTimeout) clearTimeout(typingTimeout)
  if (chatStore.activeConversationId) {
    socketStore.sendTyping(chatStore.activeConversationId, false)
  }

  requestAnimationFrame(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) textarea.style.height = 'auto'
  })
}

async function deleteMsg(messageId) {
  if (confirm('Deseja realmente apagar esta mensagem?\n\nEla será mantida no banco de dados para segurança, mas ficará invisível aqui.')) {
    await chatStore.deleteMessage(messageId)
  }
}

// === Audio Recording ===
let _audioStream = null

async function startRecording() {
  if (isRecording.value) return;
  try {
    _audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // Determine best supported mime type
    let mimeType = 'audio/webm;codecs=opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm'
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4' // Safari fallback
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = '' // Let browser decide
    }
    
    const options = mimeType ? { mimeType } : {}
    mediaRecorder = new MediaRecorder(_audioStream, options)
    audioChunks = []
    
    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data)
    }
    
    mediaRecorder.onstop = async () => {
      // Kill microphone
      if (_audioStream) {
        _audioStream.getTracks().forEach(track => track.stop())
        _audioStream = null
      }
      
      if (audioChunks.length === 0) {
        console.warn('No audio chunks recorded')
        return
      }

      const actualMime = mediaRecorder.mimeType || mimeType || 'audio/webm'
      const ext = actualMime.includes('mp4') ? 'mp4' : 'webm'
      const audioBlob = new Blob(audioChunks, { type: actualMime })
      audioChunks = []
      
      if (audioBlob.size < 100) {
        console.warn('Audio too short, skipping')
        return
      }
      
      if (chatStore.activeConversationId) {
        const file = new File([audioBlob], `audio-${Date.now()}.${ext}`, { type: actualMime })
        try {
          const uploadResult = await chatStore.uploadFile(file)
          // uploadResult = { success, data: { url, contentType, ... } }
          const fileUrl = uploadResult.data?.url || uploadResult.url
          if (!fileUrl) {
            console.error('Upload returned no URL:', uploadResult)
            alert('Erro ao enviar áudio: URL não retornada')
            return
          }
          await chatStore.sendMessage(chatStore.activeConversationId, fileUrl, 'audio')
          await nextTick()
          scrollToBottom()
        } catch (err) {
          console.error('Audio upload failed:', err)
          alert('Erro ao enviar áudio: ' + (err.response?.data?.message || err.message || 'Erro desconhecido'))
        }
      }
    }
    
    // Start with 100ms timeslice to ensure data is captured even on short recordings
    mediaRecorder.start(100)
    isRecording.value = true
  } catch (err) {
    console.error('Microphone access error:', err)
    alert('Erro ao acessar o microfone. Verifique as permissões do navegador.')
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    isRecording.value = false
    if (mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
    }
  }
}

function autoResize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = event.target.scrollHeight + 'px'
}

let typingTimeout = null

// Mentions State
const showMentionDropdown = ref(false)
const mentionSearchQuery = ref('')
const mentionStartIndex = ref(-1)

const filteredMentionUsers = computed(() => {
    if (!chatStore.activeConversationId) return [];
    
    let users = [];
    if (chatStore.activeConversation?.is_public) {
       users = usersList.value;
    } else {
       users = chatStore.activeConversation?.participants || [];
       users = users.filter(u => u.id !== authStore.user?.id);
    }

    if (!mentionSearchQuery.value) return users;

    const query = mentionSearchQuery.value.toLowerCase();
    return users.filter(user => {
        const full = (user.full_name || '').toLowerCase();
        const uname = (user.username || '').toLowerCase();
        return full.includes(query) || uname.includes(query);
    });
})

function selectMention(user) {
    if (mentionStartIndex.value === -1) return;
    
    const textBefore = newMessage.value.substring(0, mentionStartIndex.value);
    const textAfter = newMessage.value.substring(mentionStartIndex.value + mentionSearchQuery.value.length + 1);
    
    newMessage.value = `${textBefore}@${user.username} ${textAfter}`;
    
    showMentionDropdown.value = false;
    mentionSearchQuery.value = '';
    mentionStartIndex.value = -1;
    
    setTimeout(() => {
      const inputEl = document.getElementById('tour-input');
      if (inputEl) {
          inputEl.focus();
          const newPos = textBefore.length + user.username.length + 2;
          inputEl.setSelectionRange(newPos, newPos);
      }
    }, 10);
}

function renderMessageContent(content) {
    if (!content) return '';
    let safeContent = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    safeContent = safeContent.replace(/@([a-zA-Z0-9_.-]+)/g, (match, username) => {
        const isMe = authStore.user?.username === username;
        const colorClass = isMe 
            ? 'text-primary dark:text-primary font-bold bg-primary/10 px-1 rounded shadow-sm' 
            : 'text-blue-500 font-bold hover:underline cursor-pointer';
        return `<span class="${colorClass}">@${username}</span>`;
    });
    
    return safeContent;
}

function handleTyping(event) {
  autoResize(event)
  
  const text = newMessage.value;
  const cursorPsn = event.target.selectionStart;
  const textBeforeCursor = text.substring(0, cursorPsn);
  const lastAt = textBeforeCursor.lastIndexOf('@');
  
  if (lastAt !== -1 && (lastAt === 0 || /\\s/.test(textBeforeCursor[lastAt - 1]))) {
      showMentionDropdown.value = true;
      mentionSearchQuery.value = textBeforeCursor.substring(lastAt + 1);
      mentionStartIndex.value = lastAt;
  } else {
      showMentionDropdown.value = false;
  }

  if (!chatStore.activeConversationId) return;
  
  socketStore.sendTyping(chatStore.activeConversationId, true)
  
  if (typingTimeout) clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    socketStore.sendTyping(chatStore.activeConversationId, false)
  }, 2000)
}

const typingUserNames = computed(() => {
  if (!chatStore.activeConversationId) return [];
  const typersIds = socketStore.getTypingUsers(chatStore.activeConversationId) || [];
  const participants = chatStore.activeConversation?.participants || [];
  
  return typersIds
    .filter(id => id !== authStore.user?.id) // exclude self just in case
    .map(id => {
      const p = participants.find(p => p.id === id);
      if (p) {
        return p.full_name || p.username || 'Alguém';
      }
      return 'Alguém';
    });
})

async function handleFileUpload(event) {
  const file = event.target.files[0]
  if (!file) return

  // Security: Block potentially malicious file types
  const blockedExtensions = ['.exe', '.bat', '.cmd', '.msi', '.ps1', '.vbs', '.js', '.jar', '.scr', '.pif']
  const fileExt = '.' + file.name.split('.').pop().toLowerCase()
  
  if (blockedExtensions.includes(fileExt)) {
    alert('Tipo de arquivo não permitido por segurança')
    event.target.value = ''
    return
  }

  // Max 50MB
  const maxSize = 50 * 1024 * 1024
  if (file.size > maxSize) {
    alert('Arquivo muito grande. Máximo permitido: 50MB')
    event.target.value = ''
    return
  }

  try {
    console.log('📤 Uploading file:', file.name, file.type, file.size)
    const uploadedFile = await chatStore.uploadFile(file)
    console.log('✅ Upload success:', uploadedFile)
    
    // Send message with file URL
    await chatStore.sendMessage(chatStore.activeConversationId, uploadedFile.data.url, uploadedFile.data.contentType, {
        replyTo: replyingToMessage.value ? replyingToMessage.value.id : null,
        expiresIn: messageExpiresIn.value
    })
    replyingToMessage.value = null
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('❌ Upload failed:', error)
    alert('Erro ao enviar arquivo: ' + (error.response?.data?.message || error.message || 'Erro desconhecido'))
  } finally {
    event.target.value = '' // Reset input
  }
}

function onEmojiClick(event) {
  newMessage.value += event.detail.unicode
}

async function applyMagicText(action) {
  if (!newMessage.value.trim()) return
  
  isProcessingMagic.value = true
  showMagicMenu.value = false
  
  try {
    const response = await api.post('/ai/magic-text', {
      text: newMessage.value,
      action: action
    })
    
    if (response.data.success) {
      newMessage.value = response.data.data.result
    } else {
      alert(response.data.message || 'Erro ao processar texto com IA')
    }
  } catch (error) {
    console.error('Magic AI error:', error)
    alert('Ops! Houve um erro ao se comunicar com a IA. Tente novamente mais tarde.')
  } finally {
    isProcessingMagic.value = false
    // Auto resize after applying new text
    nextTick(() => {
      const textarea = document.querySelector('textarea')
      if (textarea) autoResize({ target: textarea })
    })
  }
}

async function fetchInsights(type) {
  insightsType.value = type
  showInsightsModal.value = true
  isProcessingInsights.value = true
  insightsResult.value = ''
  
  // Extrai as ultimas 60 mensagens
  const msgs = chatStore.activeMessages.slice(-60).map(m => {
     const senderName = m.senderId === authStore.user?.id ? 'Eu' : (m.sender?.fullName || m.sender?.username || 'Sistema')
     return `[${formatTime(m.createdAt)}] ${senderName}: ${m.content || '[Mídia ' + m.contentType + ']'}`;
  }).join('\n')
  
  try {
     const response = await api.post('/ai/analyze-chat', { textLog: msgs, action: type })
     if(response.data.success) {
        insightsResult.value = response.data.result
     } else {
        insightsResult.value = '❌ Não foi possível gerar o resumo. Verifique a conexão com a API.'
     }
  } catch(e) {
     insightsResult.value = 'Houve um erro de comunicação intermitente com a Inteligência Artificial.'
  } finally {
     isProcessingInsights.value = false
  }
}

async function generateSmartReplies() {
  const lastOtherMsg = [...chatStore.activeMessages].reverse().find(m => m.senderId !== authStore.user?.id && m.contentType === 'text')
  if(!lastOtherMsg || !lastOtherMsg.content) {
    alert("Você precisa receber uma mensagem de texto primeiro para sugerirmos respostas!")
    return
  }
  
  isGeneratingReplies.value = true
  smartReplies.value = []
  
  try {
     const res = await api.post('/ai/smart-replies', { contextText: lastOtherMsg.content })
     if(res.data.success && res.data.replies && Array.isArray(res.data.replies)) {
        smartReplies.value = res.data.replies
     } else {
        alert("A Inteligência Artificial não retornou opções no formato esperado.")
     }
  } catch(e) {
     console.error(e)
     alert("Erro ao pedir sugestão de respostas.")
  } finally {
     isGeneratingReplies.value = false
  }
}

function useSmartReply(replyText) {
  newMessage.value = replyText
  smartReplies.value = []
  nextTick(() => {
    const textarea = document.querySelector('textarea')
    if (textarea) autoResize({ target: textarea })
  })
}

async function translateMessage(msg) {
  msg.isTranslating = true
  try {
    const res = await api.post('/ai/translate-message', {
      text: msg.content,
      targetLanguage: navigator.language.startsWith('pt') ? 'pt-BR' : 'en' 
    })
    if(res.data.success) {
      msg.aiTranslation = res.data.translation
    }
  } catch(e) {
    alert("Erro ao tentar traduzir a mensagem. O servidor de IA pode estar fora.")
  } finally {
    msg.isTranslating = false
  }
}

async function transcribeAudio(msg) {
  msg.isTranscribing = true
  // extract file id from url string
  // Ex: "https://url.com/api/uploads/d822df-12d.../file"
  let fileId = msg.content
  if (msg.content && msg.content.includes('/api/uploads/')) {
     const parts = msg.content.split('/api/uploads/')
     if (parts.length > 1) {
        fileId = parts[1].split('/')[0]
     }
  } else if (msg.content && msg.content.startsWith('/uploads/')) {
     fileId = msg.content.replace('/uploads/', '').split('.')[0]
  }

  try {
    const res = await api.post('/ai/transcribe-audio', { fileId: fileId })
    if(res.data.success) {
      msg.aiTranscription = res.data.summary || res.data.transcript
    }
  } catch(e) {
    alert("Erro ao transcrever o áudio. (Verifique as API Keys no Servidor)")
  } finally {
    msg.isTranscribing = false
  }
}


const API_BASE = import.meta.env.PROD 
  ? 'https://lan-messenger-backend.onrender.com' 
  : 'http://localhost:3000'

function getApiUrl(filePath) {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  // Legacy /uploads/ paths -> rewrite to /api/uploads/:id/file
  if (filePath.startsWith('/uploads/')) {
    const fileName = filePath.replace('/uploads/', '')
    const fileId = fileName.split('.')[0]
    return `${API_BASE}/api/uploads/${fileId}/file`
  }
  // /api/uploads/ paths: use backend base
  if (filePath.startsWith('/api/')) return `${API_BASE}${filePath}`
  return `${API_BASE}${filePath}`
}

function getFileName(path) {
  if (!path) return 'File'
  return path.split('/').pop().split('-').slice(1).join('-') || path.split('/').pop()
}

function openImage(url) {
  window.open(url, '_blank')
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

function getMessageSnippet(id) {
    const msg = chatStore.activeMessages.find(m => m.id === id);
    if (!msg) return 'Mensagem anterior...';
    if (msg.contentType === 'image') return '📷 Imagem';
    if (msg.contentType === 'audio') return '🎤 Áudio';
    if (msg.contentType === 'video') return '🎥 Vídeo';
    if (msg.contentType === 'pdf') return '📄 Arquivo PDF';
    
    // Fallback caso a msg venha sem content type mas seja um arquivo da API de uploads ou uma imagem copiada
    if (msg.content && msg.content.includes('/api/uploads/')) {
        return '📎 Anexo de Arquivo';
    }
    
    return msg.content || '...';
}

function scrollToMessage(id) {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-primary/20');
        setTimeout(() => el.classList.remove('bg-primary/20'), 1500);
    }
}

function parseCallLog(content) {
  try { return JSON.parse(content) } catch { return { callType: 'audio', duration: 0, status: 'completed' } }
}

function formatCallDuration(secs) {
  if (!secs) return '0s'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return locale.t.chat.now
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m `
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString()
}

watch(() => chatStore.activeMessages.length, () => {
  nextTick(scrollToBottom)
})

// Process read receipts when active conversation changes or new messages arrive
watch(() => chatStore.activeMessages, (messages) => {
  if (!messages || messages.length === 0) return;
  
  const unreadOwnMessages = messages.filter(m => !m.isRead && m.senderId !== authStore.user?.id)
  if (unreadOwnMessages.length > 0) {
    // Need to timeout to avoid hammering the API if multiple arrive at once
    setTimeout(() => {
      unreadOwnMessages.forEach(m => {
        if (!m.isRead) {
          chatStore.markAsRead(m.id)
          m.isRead = true; // Optimistic UI local update
        }
      })
    }, 500)
    
    // Clear unread badge in list immediately
    const conv = chatStore.conversations.find(c => c.id === chatStore.activeConversationId)
    if (conv) conv.unreadCount = 0
  }
}, { deep: true })

async function handleLogout() {
  socketStore.disconnect()
  webrtcStore.endCallLocally()
  await authStore.logout()
  router.push('/login')
}

// ==== WEBRTC Logic ====
function startP2PCall(type) {
  const targetUser = chatStore.activeConversation.participants.find(p => p.id !== authStore.user?.id)
  if (!targetUser) return;
  webrtcStore.startCall(
    targetUser.id,
    targetUser.full_name || targetUser.username,
    targetUser.avatar_url,
    type
  )
}

function toggleMuteVideo() {
  isMuted.value = webrtcStore.toggleMute()
}

function toggleCamera() {
  isCamOff.value = webrtcStore.toggleVideo()
}

function toggleScreenShare() {
  webrtcStore.toggleScreenShare()
}

// Call timer + auto-log when P2P call ends
let _callType = 'audio'
let _callWasConnected = false

watch(() => webrtcStore.callState, (state, oldState) => {
  if (state === 'connected') {
    _callWasConnected = true
    _callType = webrtcStore.isScreenSharing ? 'screen' : webrtcStore.isVideoCall ? 'video' : 'audio'
    callSeconds.value = 0
    callTimerInterval = setInterval(() => { callSeconds.value++ }, 1000)
  } else if (state === 'idle' && oldState !== 'idle') {
    const duration = callSeconds.value
    const convId = chatStore.activeConversationId

    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
    callSeconds.value = 0
    isMuted.value = false
    isCamOff.value = false

    // Save call log if there's an active conversation
    if (convId) {
      let status = 'missed'
      if (_callWasConnected) status = 'completed'
      else if (oldState === 'receiving') status = 'declined'

      chatStore.saveCallLog(convId, _callType, duration, status)
    }
    _callWasConnected = false
  } else {
    if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null }
    callSeconds.value = 0
    isMuted.value = false
    isCamOff.value = false
  }
})

// Group call auto-log when call ends
let _groupCallWasConnected = false
let _groupCallType = 'audio'

watch(() => groupCallStore.callState, (state, oldState) => {
  if (state === 'connected') {
    _groupCallWasConnected = true
    _groupCallType = groupCallStore.isScreenSharing ? 'screen' : groupCallStore.isVideoCall ? 'video' : 'audio'
  } else if (state === 'idle' && oldState !== 'idle') {
    const duration = groupCallStore.callSeconds
    const convId = groupCallStore.conversationId || chatStore.activeConversationId

    if (convId && _groupCallWasConnected) {
      chatStore.saveCallLog(convId, _groupCallType, duration, 'completed', true)
    }
    _groupCallWasConnected = false
  }
})

// PiP dragging (mouse)
function startPipDrag(e) {
  if (!pipEl.value) return
  const el = pipEl.value
  const startX = e.clientX - el.offsetLeft
  const startY = e.clientY - el.offsetTop
  function onMove(me) {
    let x = me.clientX - startX
    let y = me.clientY - startY
    x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x))
    y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y))
    el.style.left = x + 'px'; el.style.top = y + 'px'
    el.style.right = 'auto'; el.style.bottom = 'auto'
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// PiP dragging (touch)
function startPipDragTouch(e) {
  if (!pipEl.value) return
  const el = pipEl.value
  const touch = e.touches[0]
  const startX = touch.clientX - el.offsetLeft
  const startY = touch.clientY - el.offsetTop
  function onMove(te) {
    const t = te.touches[0]
    let x = t.clientX - startX
    let y = t.clientY - startY
    x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, x))
    y = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, y))
    el.style.left = x + 'px'; el.style.top = y + 'px'
    el.style.right = 'auto'; el.style.bottom = 'auto'
  }
  function onEnd() {
    window.removeEventListener('touchmove', onMove)
    window.removeEventListener('touchend', onEnd)
  }
  window.addEventListener('touchmove', onMove, { passive: false })
  window.addEventListener('touchend', onEnd)
}


async function toggleReaction(messageId, emoji) {
   await chatStore.toggleReaction(messageId, emoji)
}



// Handle new message from socket
let notifAudioCtx = null
function playNotificationSound() {
  try {
    if (!notifAudioCtx) notifAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const ctx = notifAudioCtx
    if (ctx.state === 'suspended') ctx.resume()

    // Pleasant double-beep notification
    const now = ctx.currentTime
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now + i * 0.18)
      gain.gain.setValueAtTime(0, now + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.18 + 0.04)
      gain.gain.linearRampToValueAtTime(0, now + i * 0.18 + 0.14)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.15)
    }
  } catch (e) { /* ignore audio errors */ }
}

function handleNewMessage(event) {
  const message = event.detail
  if (message && message.conversationId) {
    chatStore.addMessage(message.conversationId, message)
    
    if (chatStore.activeConversationId === message.conversationId) {
      nextTick(scrollToBottom)
      // Send read receipt if we are looking at this chat
      if (message.senderId !== authStore.user?.id) {
        chatStore.markAsRead(message.id)
      }
    }
    
    // Notification for messages in other conversations
    if (chatStore.activeConversationId !== message.conversationId && message.senderId !== authStore.user?.id) {
      // 🔊 Play notification sound (always)
      playNotificationSound()

      // Desktop notification (if permission granted)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Nova mensagem', {
          body: `${message.senderName || message.senderUsername}: ${message.content}`,
          icon: '/vite.svg'
        })
      }
    }
  }
}

function handleMessageEdited(event) {
  const data = event.detail;
  if (data?.conversationId && data?.messageId) {
    chatStore.updateMessageEdited(data.conversationId, data.messageId, data.content, data.editedAt)
  }
}

function handleMessageReaction(event) {
  const data = event.detail;
  if (data?.conversationId && data?.messageId) {
    chatStore.updateMessageReaction(data.conversationId, data.messageId, data.reactions)
  }
}

function handleMessageDeleted(event) {
  const data = event.detail;
  if (data?.conversationId && data?.messageId) {
    chatStore.updateMessageDeleted(data.conversationId, data.messageId)
  }
}

function handleMessageRead(event) {
  const data = event.detail;
  if (data?.conversationId && data?.messageId) {
    chatStore.updateMessageRead(data.conversationId, data.messageId, data.readBy)
  }
}

// Handle WebRTC Call Signaling
function handleCallOffer(event) {
  const data = event.detail
  if (data && data.offer) {
    incomingOffer.value = data.offer
    webrtcStore.handleIncomingCall(data.callerId, data.callerName, data.callerAvatar, data.isVideo)
  }
}

function handleCallAnswer(event) {
  const data = event.detail
  if (data && data.answer) {
    webrtcStore.handleAnswer(data.answer)
  }
}

function handleIceCandidateEvent(event) {
  const data = event.detail
  if (data && data.candidate) {
    webrtcStore.handleIceCandidate(data.candidate)
  }
}

function handleCallEnd(event) {
  webrtcStore.endCallLocally()
}

onMounted(async () => {
  await chatStore.fetchConversations()
  await networkStore.fetchDevices()
  await usersStore.fetchUsers(1, '')
  
  document.addEventListener('emoji-click', onEmojiClick)
  
  window.addEventListener('socket:message', handleNewMessage)
  window.addEventListener('socket:message:edited', handleMessageEdited)
  window.addEventListener('socket:message:deleted', handleMessageDeleted)
  window.addEventListener('socket:message:reaction', handleMessageReaction)
  window.addEventListener('socket:message:read', handleMessageRead)
  
  window.addEventListener('socket:call:offer', handleCallOffer)
  window.addEventListener('socket:call:answer', handleCallAnswer)
  window.addEventListener('socket:call:ice-candidate', handleIceCandidateEvent)
  window.addEventListener('socket:call:end', handleCallEnd)

  // Group call events
  window.addEventListener('socket:group-call:incoming', (e) => groupCallStore.handleIncomingGroupCall(e.detail))
  window.addEventListener('socket:group-call:existing-participants', (e) => groupCallStore.handleExistingParticipants(e.detail))
  window.addEventListener('socket:group-call:participant-joined', (e) => groupCallStore.handleParticipantJoined(e.detail))
  window.addEventListener('socket:group-call:offer', (e) => groupCallStore.handleGroupOffer(e.detail))
  window.addEventListener('socket:group-call:answer', (e) => groupCallStore.handleGroupAnswer(e.detail))
  window.addEventListener('socket:group-call:ice-candidate', (e) => groupCallStore.handleGroupIceCandidate(e.detail))
  window.addEventListener('socket:group-call:participant-left', (e) => groupCallStore.handleParticipantLeft(e.detail))
  window.addEventListener('socket:group-call:full', (e) => {
    alert(`A chamada em grupo está lotada (máximo ${e.detail.max} participantes). Tente novamente mais tarde.`)
    groupCallStore.endCall()
  })
  window.addEventListener('socket:group-call:active', (e) => groupCallStore.handleActiveCall(e.detail))
  window.addEventListener('socket:group-call:hand-raise', (e) => groupCallStore.handleHandRaise(e.detail))

  // Run Onboarding Tour
  if (localStorage.getItem('lan_tour_completed') !== 'true') {
     setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          nextBtnText: 'Próximo ›',
          prevBtnText: '‹ Anterior',
          doneBtnText: 'Pronto!',
          progressText: 'Passo {{current}} de {{total}}',
          steps: [
            { element: '#tour-conversations', popover: { title: 'Bem-vindo ao LAN Messenger!', description: 'Sua plataforma de comunicação corporativa rápida e segura.', side: "bottom", align: 'start' }},
            { element: '#tour-new-chat', popover: { title: 'Inicie ou Crie Canais', description: 'Clique aqui para buscar usuários, iniciar um chat ou criar grupos e canais abertos da empresa.', side: "bottom", align: 'end' }},
            { popover: { title: 'Área de Trabalho', description: 'Selecione uma conversa ou canal à esquerda para interagir. Use o painel central para ler mensagens antigas e enviar novas respostas.' }},
            { element: '#tour-network', popover: { title: 'Rede Local', description: 'Descubra rapidamente os dispositivos conectados na mesma rede local de sua sede.', side: "right", align: 'center' }}
          ],
          onDestroyStarted: () => {
             // Marca como concluído mesmo se fechou pela metade
             localStorage.setItem('lan_tour_completed', 'true')
             driverObj.destroy()
          }
        });
        driverObj.drive();
     }, 1500) // Dá um tempo para as conversas carregarem
  }
})

onUnmounted(() => {
  document.removeEventListener('emoji-click', onEmojiClick)
  window.removeEventListener('socket:message', handleNewMessage)
  window.removeEventListener('socket:message:edited', handleMessageEdited)
  window.removeEventListener('socket:message:deleted', handleMessageDeleted)
  window.removeEventListener('socket:message:reaction', handleMessageReaction)
  window.removeEventListener('socket:message:read', handleMessageRead)
  
  window.removeEventListener('socket:call:offer', handleCallOffer)
  window.removeEventListener('socket:call:answer', handleCallAnswer)
  window.removeEventListener('socket:call:ice-candidate', handleIceCandidateEvent)
  window.removeEventListener('socket:call:end', handleCallEnd)

  // Cleanup group call
  if (groupCallStore.callState !== 'idle') groupCallStore.endCall()
})
</script>
