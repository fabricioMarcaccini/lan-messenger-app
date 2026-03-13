<template>
  <header class="h-20 border-b border-gray-200 dark:border-glass-border bg-white dark:bg-glass-surface backdrop-blur-md flex items-center justify-between px-4 md:px-6 z-20 shrink-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
    <div class="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
      <!-- Back Button for Mobile -->
      <button @click="emit('back')" class="md:hidden size-8 mr-1 rounded-full bg-gray-200 dark:bg-white/5 hover:bg-gray-300 text-gray-600 dark:text-white flex items-center justify-center flex-shrink-0">
        <span class="material-symbols-outlined text-lg">arrow_back</span>
      </button>
      <div
        @click="emit('open-group-info')"
        class="bg-center bg-no-repeat bg-cover rounded-full size-10 ring-2 ring-primary/20 flex-shrink-0"
        :style="{ backgroundImage: `url(${avatarUrl})` }"
      ></div>
      <div @click="emit('open-group-info')" class="flex-1 min-w-0 mr-2">
        <h2 class="text-gray-900 dark:text-white text-lg font-bold leading-none mb-1">
          {{ displayName }}
        </h2>
        <div class="flex items-center gap-2 text-xs" v-if="!isGroup">
          <span :class="['flex size-2 rounded-full', isOtherUserOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-400']"></span>
          <span :class="isOtherUserOnline ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-400 dark:text-slate-500 font-medium'">
            {{ isOtherUserOnline ? locale.t.chat.online : 'Offline' }}
          </span>
          <span v-if="oooUntil" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 text-[10px] font-bold">OOO / Fora do Escritório</span>
        </div>
        <div class="flex items-center gap-2 text-xs" v-else>
          <span class="flex size-2 bg-green-500 rounded-full"></span>
          <span class="text-gray-500 dark:text-slate-400 font-medium">
            {{ groupOnlineCount }}/{{ participantsCount }} online · clique para ver info
          </span>
        </div>
      </div>
    </div>

    <div id="tour-actions" class="flex items-center gap-1 md:gap-2" v-if="!isGroup && participantsCount > 0">
      <!-- AI Insights Buttons -->
      <button @click="handleFetchInsights('summarize')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-amber-500 hidden md:flex items-center justify-center transition-colors" title="Resumir Conversa com IA">
        <span class="material-symbols-outlined text-xl">insights</span>
      </button>
      <button @click="handleFetchInsights('extract_tasks')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 hidden md:flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Extrair Tarefas com IA">
        <span class="material-symbols-outlined text-[22px]">checklist</span>
      </button>
      <button @click="handleOpenPoll" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-violet-500 hidden md:flex items-center justify-center transition-colors" title="Criar enquete">
        <span class="material-symbols-outlined text-xl">poll</span>
      </button>
      <button @click="handleOpenMeeting" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-indigo-500 hidden md:flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Agendar reunião">
        <span class="material-symbols-outlined text-xl">event</span>
      </button>

      <!-- Mobile Actions Dropdown -->
      <div class="relative flex items-center md:hidden">
        <button @click="showMobileHeaderActions = !showMobileHeaderActions" class="size-10 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-slate-300 flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-xl">more_vert</span>
        </button>
        <div v-if="showMobileHeaderActions" class="absolute top-12 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-2 flex flex-col gap-1 z-[110] min-w-[200px] origin-top-right animate-fade-in-down">
          <button @click="handleFetchInsights('summarize')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-amber-500 text-[18px]">insights</span> Resumo IA</button>
          <button @click="handleFetchInsights('extract_tasks')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-green-500 text-[18px]">checklist</span> Extrair Tarefas</button>
          <button @click="handleOpenPoll" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-violet-500 text-[18px]">poll</span> Nova Enquete</button>
          <button @click="handleOpenMeeting" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-indigo-500 text-[18px]">event</span> Agendar Reunião</button>
        </div>
      </div>

      <!-- P2P Call Buttons -->
      <button
        @click="emit('start-p2p-call', 'screen')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-blue-500 hidden md:flex items-center justify-center transition-colors"
        title="Apresentar Tela"
      >
        <span class="material-symbols-outlined text-xl">present_to_all</span>
      </button>
      <button
        @click="emit('start-p2p-call', 'audio')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors"
        title="Ligar (Apenas Áudio)"
      >
        <span class="material-symbols-outlined text-xl">call</span>
      </button>
      <button
        @click="emit('start-p2p-call', 'video')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors relative group"
        title="Chamada de Vídeo ao vivo"
      >
        <span class="material-symbols-outlined text-xl">videocam</span>
        <span class="absolute -top-1 -right-1 text-[10px] bg-primary text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">?</span>
      </button>
    </div>
    <!-- GROUP Call Buttons -->
    <div class="flex items-center gap-1 md:gap-2" v-if="isGroup">
      <!-- AI Insights Buttons -->
      <button @click="handleFetchInsights('summarize')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-amber-500 hidden md:flex items-center justify-center transition-colors" title="Resumir Conversa com IA">
        <span class="material-symbols-outlined text-xl">insights</span>
      </button>
      <button @click="handleFetchInsights('extract_tasks')" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 hidden md:flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Extrair Tarefas com IA">
        <span class="material-symbols-outlined text-[22px]">checklist</span>
      </button>
      <button @click="handleOpenPoll" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-violet-500 hidden md:flex items-center justify-center transition-colors" title="Criar enquete">
        <span class="material-symbols-outlined text-xl">poll</span>
      </button>
      <button @click="handleOpenMeeting" class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-indigo-500 hidden md:flex items-center justify-center transition-colors mr-1 md:mr-2 border-r border-gray-200 dark:border-white/10 pr-2" title="Agendar reunião">
        <span class="material-symbols-outlined text-xl">event</span>
      </button>

      <!-- Mobile Actions Dropdown -->
      <div class="relative flex items-center md:hidden">
        <button @click="showMobileHeaderActions = !showMobileHeaderActions" class="size-10 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-slate-300 flex items-center justify-center transition-colors">
          <span class="material-symbols-outlined text-xl">more_vert</span>
        </button>
        <div v-if="showMobileHeaderActions" class="absolute top-12 right-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-2 flex flex-col gap-1 z-[110] min-w-[200px] origin-top-right animate-fade-in-down">
          <button @click="handleFetchInsights('summarize')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-amber-500 text-[18px]">insights</span> Resumo IA</button>
          <button @click="handleFetchInsights('extract_tasks')" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-green-500 text-[18px]">checklist</span> Extrair Tarefas</button>
          <button @click="handleOpenPoll" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-violet-500 text-[18px]">poll</span> Nova Enquete</button>
          <button @click="handleOpenMeeting" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium"><span class="material-symbols-outlined text-indigo-500 text-[18px]">event</span> Agendar Reunião</button>
        </div>
      </div>

      <button
        @click="emit('start-group-call', 'screen')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-blue-500 hidden md:flex items-center justify-center transition-colors"
        title="Apresentar Tela"
        :disabled="!canStartGroupCall"
      >
        <span class="material-symbols-outlined text-xl">present_to_all</span>
      </button>
      <button
        @click="emit('start-group-call', 'audio')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-green-500 flex items-center justify-center transition-colors"
        title="Chamada em Grupo (Áudio)"
        :disabled="!canStartGroupCall"
      >
        <span class="material-symbols-outlined text-xl">call</span>
      </button>
      <button
        @click="emit('start-group-call', 'video')"
        class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors"
        title="Chamada em Grupo (Vídeo)"
        :disabled="!canStartGroupCall"
      >
        <span class="material-symbols-outlined text-xl">videocam</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  conversation: { type: Object, required: true },
  authUserId: { type: [String, Number], default: null },
  defaultAvatar: { type: String, required: true },
  locale: { type: Object, required: true },
  isOtherUserOnline: { type: Boolean, default: false },
  groupOnlineCount: { type: Number, default: 0 },
  canStartGroupCall: { type: Boolean, default: true },
})

const emit = defineEmits([
  'back',
  'open-group-info',
  'fetch-insights',
  'open-poll',
  'open-meeting',
  'start-p2p-call',
  'start-group-call',
])

const showMobileHeaderActions = ref(false)

const isGroup = computed(() => Boolean(props.conversation?.isGroup))
const participants = computed(() => props.conversation?.participants || [])
const participantsCount = computed(() => participants.value.length)
const otherParticipant = computed(() => participants.value.find(p => p.id !== props.authUserId))
const displayName = computed(() => (
  props.conversation?.name ||
  participants.value.filter(p => p.id !== props.authUserId).map(p => p.full_name || p.username).join(', ')
))
const avatarUrl = computed(() => (
  isGroup.value ? props.defaultAvatar : (otherParticipant.value?.avatar_url || props.defaultAvatar)
))
const oooUntil = computed(() => otherParticipant.value?.ooo_until)

function handleFetchInsights(type) {
  emit('fetch-insights', type)
  showMobileHeaderActions.value = false
}

function handleOpenPoll() {
  emit('open-poll')
  showMobileHeaderActions.value = false
}

function handleOpenMeeting() {
  emit('open-meeting')
  showMobileHeaderActions.value = false
}
</script>
