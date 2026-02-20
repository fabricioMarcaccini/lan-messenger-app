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
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{{ locale.t.chat.title }}</h2>
          </div>
          <button 
            @click="showNewChatModal = true"
            class="size-8 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-gray-600 dark:text-white"
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
        <div class="flex flex-col gap-2 mt-2">
          <div 
            v-for="conv in filteredConversations" 
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
                  class="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-12"
                  :style="{ backgroundImage: `url(${conv.isGroup ? defaultAvatar : (conv.participants.find(p => p.id !== authStore.user?.id)?.avatar_url || defaultAvatar)})` }"
                ></div>
              </div>
              <div class="flex flex-col flex-1 min-w-0 justify-center">
                <div class="flex justify-between items-baseline mb-0.5">
                  <h3 class="text-gray-900 dark:text-white text-sm font-semibold truncate">
                    {{ conv.name || conv.participants.filter(p => p.id !== authStore.user?.id).map(p => p.full_name || p.username).join(', ') }}
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
          
          <div v-if="filteredConversations.length === 0" class="text-center text-gray-400 dark:text-slate-500 py-8">
            <span class="material-symbols-outlined text-4xl mb-2 block opacity-50">chat_bubble</span>
            <p>{{ locale.t.chat.noConversations }}</p>
          </div>
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

          <div class="flex items-center gap-2" v-if="!chatStore.activeConversation.isGroup && chatStore.activeConversation.participants.length > 0">
            <!-- P2P Call Buttons -->
            <button 
              @click="startP2PCall(false)"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors"
              title="Ligar (Apenas Áudio)"
            >
              <span class="material-symbols-outlined text-xl">call</span>
            </button>
            <button 
              @click="startP2PCall(true)"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors"
              title="Chamada de Vídeo"
            >
              <span class="material-symbols-outlined text-xl">videocam</span>
            </button>
          </div>
        </header>
        
        <!-- Messages -->
        <div ref="messagesContainer" class="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-gray-50 dark:bg-transparent">
          <div v-for="msg in chatStore.activeMessages" :key="msg.id" :class="[
            'flex items-end gap-3 max-w-[80%]',
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
                  
                  <!-- Reply Context -->
                  <div v-if="msg.replyTo && !(msg.isDeleted || msg.contentType === 'deleted')" class="px-3 pt-3 pb-1 mb-1 border-b border-gray-300 dark:border-white/10 opacity-70">
                     <span class="text-[10px] font-bold block mb-1">Reposta a uma mensagem</span>
                     <p class="text-xs truncate italic">...</p>
                  </div>
                  
                  <!-- Text Message -->
                  <p v-else-if="!msg.contentType || msg.contentType === 'text'" class="p-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-lg">{{ msg.content }}</p>
                  
                  <!-- Image Message -->
                  <div v-else-if="msg.contentType === 'image'" class="p-1">
                    <img :src="getApiUrl(msg.content)" class="rounded-lg max-w-sm max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" @click="openImage(getApiUrl(msg.content))" />
                  </div>

                  <!-- Audio Message -->
                  <div v-else-if="msg.contentType === 'audio'" class="p-2">
                    <audio :src="getApiUrl(msg.content)" controls class="h-10 w-48 custom-audio"></audio>
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
                </div>

                <!-- Delete/Edit buttons (Hover) -->
                <div v-if="!msg.isDeleted && msg.contentType !== 'deleted'" class="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                  <button @click="startReply(msg)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-cyan-500" title="Responder"><span class="material-symbols-outlined text-[14px]">reply</span></button>
                  <button v-if="msg.senderId === authStore.user?.id && msg.contentType === 'text'" @click="startEdit(msg)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"><span class="material-symbols-outlined text-[14px]">edit</span></button>
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
                  <div class="opacity-0 group-hover:opacity-100 flex gap-1 mr-2 transition-opacity">
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
        </div>
        
        <!-- Input Area -->
        <div class="p-6 pt-2 shrink-0 z-20 bg-gray-50 dark:bg-transparent relative">
          <!-- Edit / Reply Banner -->
          <div v-if="editingMessageId || replyingToMessage" class="absolute -top-10 left-6 right-6 bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-t-xl text-xs font-medium flex justify-between items-center border border-yellow-200 dark:border-yellow-900/50 backdrop-blur-md">
            <div class="flex items-center gap-2 w-full pr-4 overflow-hidden">
              <span class="material-symbols-outlined text-[16px]">{{ replyingToMessage ? 'reply' : 'edit' }}</span> 
              <span class="truncate">{{ replyingToMessage ? `Respondendo: ${replyingToMessage.content}` : 'Editando mensagem' }}</span>
            </div>
            <button @click="cancelEditOrReply" class="text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-100 shrink-0"><span class="material-symbols-outlined text-sm">close</span></button>
          </div>

          <!-- Emoji Picker (Absolute positioned) -->
          <div v-if="showEmojiPicker" class="absolute bottom-20 left-6 z-30 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
            <emoji-picker class="light dark:dark"></emoji-picker>
          </div>

          <div class="bg-white dark:bg-glass-surface border border-gray-200 dark:border-glass-border rounded-2xl p-2 flex items-end gap-2 shadow-lg relative" :class="editingMessageId ? 'rounded-tl-none rounded-tr-none' : ''">
            <div class="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-2xl opacity-50 pointer-events-none hidden dark:block"></div>
            
            <!-- File Upload Input (Hidden) -->
            <input 
              type="file" 
              ref="fileInput" 
              class="hidden" 
              @change="handleFileUpload"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
            />
            
            <button 
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
                v-else
                v-model="newMessage"
                @keyup.enter.exact="sendMessage"
                rows="1"
                @input="autoResize"
                :placeholder="locale.t.chat.typeMessage"
                class="w-full bg-transparent border-none p-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:ring-0 resize-none max-h-32"
              ></textarea>
            </div>
            
            <div class="flex items-center gap-1 mb-0.5 shrink-0">
              <button 
                @click="showEmojiPicker = !showEmojiPicker"
                class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-accent flex items-center justify-center transition-colors"
                title="Emojis"
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
      </template>
      
      <!-- No conversation selected -->
      <template v-else>
        <div class="flex-1 flex items-center justify-center bg-gray-50 dark:bg-transparent">
          <div class="text-center text-gray-400 dark:text-slate-500">
            <span class="material-symbols-outlined text-6xl mb-4 block opacity-30">forum</span>
            <p class="text-lg">{{ locale.t.chat.selectConversation }}</p>
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
             <input v-model="groupName" placeholder="Nome do Grupo" class="w-full px-4 py-2 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
             <input v-model="groupDescription" placeholder="Descrição (Opcional)" class="w-full px-4 py-2 rounded-xl text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
          </div>
          <p class="text-xs text-gray-500 dark:text-slate-400 mb-2 font-medium uppercase tracking-wider">Selecione os participantes:</p>
          <input v-model="userFilter" placeholder="Buscar usuário..." class="w-full px-4 py-2 rounded-xl mb-2 text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-black/20 border-none focus:ring-1 focus:ring-primary/50 transition-all shadow-inner" />
          
          <div class="flex-1 overflow-y-auto max-h-[200px] flex flex-col gap-1 pr-1">
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
          <button @click="createGroup" :disabled="!groupName || selectedUsers.length === 0" class="mt-4 w-full bg-primary hover:bg-cyan-400 text-white dark:text-background-dark font-bold py-2.5 rounded-xl transition-colors shadow-sm dark:shadow-neon disabled:opacity-50 disabled:cursor-not-allowed">
            Criar Grupo
          </button>
        </template>
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
        </div>

        <div v-if="infoTab === 'members'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full">
          <div v-for="p in chatStore.activeConversation.participants" :key="p.id" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-black/20">
             <div class="bg-cover bg-center rounded-full size-8" :style="{ backgroundImage: `url(${p.avatar_url || defaultAvatar})` }"></div>
             <span class="text-sm text-gray-900 dark:text-white font-medium truncate flex-1">{{ p.full_name || p.username }}</span>
             <span v-if="p.id === authStore.user?.id" class="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Você</span>
          </div>
        </div>

        <div v-if="infoTab === 'media'" class="flex flex-col gap-2 max-h-48 overflow-y-auto mb-4 pr-1 w-full relative">
           <div class="grid grid-cols-3 gap-2">
              <template v-for="msg in chatStore.activeMessages">
                 <div v-if="msg.contentType === 'image'" :key="msg.id" class="aspect-square bg-gray-100 dark:bg-black/20 rounded-lg overflow-hidden cursor-pointer">
                    <img :src="getApiUrl(msg.content)" class="w-full h-full object-cover" @click="openImage(getApiUrl(msg.content))">
                 </div>
              </template>
           </div>
           <div v-if="chatStore.activeMessages.filter(m => m.contentType === 'image').length === 0" class="text-center text-xs text-gray-400 py-4">Nenhuma mídia.</div>
        </div>

        <button v-if="chatStore.activeConversation?.isGroup" @click="leaveGroup" class="w-full mt-2 py-2 flex items-center justify-center gap-2 text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors border border-red-200 dark:border-red-900/30">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          Sair do Grupo
        </button>
      </div>
    </div>
    <!-- Active Call Overlay Overlay (Takes entire screen) -->
    <div v-if="webrtcStore.callState !== 'idle'" class="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center transition-all">
      <!-- Background avatar blur -->
      <div 
        class="absolute inset-0 bg-center bg-cover opacity-20 filter blur-3xl scale-110"
        :style="{ backgroundImage: `url(${webrtcStore.remoteUser.avatar || defaultAvatar})` }"
      ></div>

      <!-- Main Video Container -->
      <div class="relative w-full max-w-6xl h-[70vh] flex items-center justify-center rounded-3xl overflow-hidden shadow-2xl z-10 bg-black/40 border border-white/10">
        
        <!-- Remote Video -->
        <video 
          v-if="webrtcStore.isVideoCall && webrtcStore.callState === 'connected'" 
          :srcObject="webrtcStore.remoteStream" 
          autoplay 
          playsinline 
          class="w-full h-full object-cover"
        ></video>
        
        <!-- Áudio Only Placeholder -->
        <div v-else class="flex flex-col items-center justify-center gap-6">
          <div class="relative">
            <div :class="['absolute inset-0 rounded-full bg-primary/20 blur-xl transition-all duration-1000', webrtcStore.callState === 'connected' ? 'animate-pulse scale-150' : '']"></div>
            <div 
              class="relative bg-center bg-cover rounded-full size-40 border-4 border-primary/30 shadow-2xl"
              :style="{ backgroundImage: `url(${webrtcStore.remoteUser.avatar || defaultAvatar})` }"
            ></div>
          </div>
          <div class="text-center">
            <h2 class="text-3xl font-bold text-white mb-2">{{ webrtcStore.remoteUser.name }}</h2>
            <p class="text-primary font-medium tracking-widest uppercase text-sm">
              <span v-if="webrtcStore.callState === 'calling'">Chamando...</span>
              <span v-else-if="webrtcStore.callState === 'receiving'">Chamada Recebida</span>
              <span v-else-if="webrtcStore.callState === 'connected'">00:00 (Conectado)</span>
            </p>
          </div>
        </div>

        <!-- Local Video (PiP) -->
        <div 
          v-show="webrtcStore.isVideoCall && webrtcStore.callState === 'connected'" 
          class="absolute bottom-6 right-6 w-48 h-64 bg-gray-900 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20"
        >
          <video :srcObject="webrtcStore.localStream" autoplay playsinline muted class="w-full h-full object-cover transform scale-x-[-1]"></video>
        </div>
      </div>

      <!-- Call Controls Container -->
      <div class="z-20 mt-12 flex items-center gap-6">
        
        <!-- Controls for Receiving Call -->
        <template v-if="webrtcStore.callState === 'receiving'">
          <button @click="webrtcStore.endCall()" class="size-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110">
            <span class="material-symbols-outlined text-3xl">call_end</span>
          </button>
          
          <button @click="webrtcStore.answerCall(incomingOffer)" class="size-20 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-all hover:scale-110 animate-bounce">
            <span class="material-symbols-outlined text-4xl">call</span>
          </button>
        </template>

        <!-- Controls for Connected / Calling -->
        <template v-else>
          <button @click="toggleMuteVideo" class="size-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all">
            <span class="material-symbols-outlined text-2xl">{{ isMuted ? 'mic_off' : 'mic' }}</span>
          </button>
          
          <button v-if="webrtcStore.isVideoCall" @click="toggleCamera" class="size-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all">
            <span class="material-symbols-outlined text-2xl">{{ isCamOff ? 'videocam_off' : 'videocam' }}</span>
          </button>

          <button v-if="webrtcStore.isVideoCall" @click="toggleScreenShare" class="size-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all">
            <span class="material-symbols-outlined text-2xl" :class="webrtcStore.isScreenSharing ? 'text-blue-400' : ''">present_to_all</span>
          </button>

          <button @click="webrtcStore.endCall()" class="size-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30 transition-all hover:scale-110">
            <span class="material-symbols-outlined text-3xl">call_end</span>
          </button>
        </template>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useNetworkStore } from '@/stores/network'
import { useSocketStore } from '@/stores/socket'
import { useUsersStore } from '@/stores/users'
import { useLocaleStore } from '@/stores/locale'
import { useWebRTCStore } from '@/stores/webrtc'
import 'emoji-picker-element'

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const networkStore = useNetworkStore()
const socketStore = useSocketStore()
const usersStore = useUsersStore()
const locale = useLocaleStore()
const webrtcStore = useWebRTCStore()
const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=0f2023&color=00d4ff'

// WebRTC reactive local state
const isMuted = ref(false)
const isCamOff = ref(false)
const incomingOffer = ref(null)

const searchQuery = ref('')
const newMessage = ref('')
const messagesContainer = ref(null)
const showNewChatModal = ref(false)
const userFilter = ref('')
const showEmojiPicker = ref(false)
const showMobileSidebar = ref(false)
const fileInput = ref(null)

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

const filteredConversations = computed(() => {
  if (!searchQuery.value) return chatStore.conversations
  const query = searchQuery.value.toLowerCase()
  return chatStore.conversations.filter(c => 
    c.name?.toLowerCase().includes(query) ||
    c.participants.some(p => p.full_name?.toLowerCase().includes(query))
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
  if (!groupName.value.trim() || selectedUsers.value.length === 0) return;
  const conversationId = await chatStore.createConversation(selectedUsers.value, true, groupName.value, groupDescription.value);
  if (conversationId) {
    showNewChatModal.value = false;
    isCreatingGroup.value = false;
    groupName.value = '';
    groupDescription.value = '';
    selectedUsers.value = [];
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
async function startRecording() {
  if (isRecording.value) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      stream.getTracks().forEach(track => track.stop()) // kill microphone usage
      
      // Upload
      if (audioBlob.size > 0 && chatStore.activeConversationId) {
        const file = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })
        try {
          const uploadedFile = await chatStore.uploadFile(file)
          await chatStore.sendMessage(chatStore.activeConversationId, uploadedFile.data.url, 'audio')
          await nextTick()
          scrollToBottom()
        } catch (err) {
          alert('Erro ao enviar áudio')
        }
      }
    }
    
    mediaRecorder.start()
    isRecording.value = true
  } catch (err) {
    alert('Erro ao acessar o microfone. Verifique as permissões do navegador.')
  }
}

function stopRecording() {
  if (mediaRecorder && isRecording.value) {
    mediaRecorder.stop()
    isRecording.value = false
  }
}

function autoResize(event) {
  event.target.style.height = 'auto'
  event.target.style.height = event.target.scrollHeight + 'px'
}

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

function getApiUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://localhost:3000${path}`
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
function startP2PCall(isVideo) {
  const targetUser = chatStore.activeConversation.participants.find(p => p.id !== authStore.user?.id)
  if (!targetUser) return;
  
  webrtcStore.startCall(
    targetUser.id,
    targetUser.full_name || targetUser.username,
    targetUser.avatar_url,
    isVideo
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

async function toggleReaction(messageId, emoji) {
   await chatStore.toggleReaction(messageId, emoji)
}



// Handle new message from socket
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
    
    if (chatStore.activeConversationId !== message.conversationId && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova mensagem', {
        body: `${message.senderName || message.senderUsername}: ${message.content}`,
        icon: '/vite.svg'
      })
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
})
</script>
