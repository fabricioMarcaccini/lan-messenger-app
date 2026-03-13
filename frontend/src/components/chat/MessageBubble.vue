<template>
  <!-- ==== CALL LOG MESSAGE ==== -->
  <div v-if="message.contentType === 'call'" :id="`msg-${message.id}`" class="flex justify-center">
    <div class="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm max-w-xs text-gray-700 dark:text-slate-300">
      <!-- Icon by call type and status -->
      <div class="flex-shrink-0">
        <template v-if="helpers.parseCallLog(message.content).status === 'missed' || helpers.parseCallLog(message.content).status === 'declined'">
          <span class="material-symbols-outlined text-red-400 text-xl">call_missed</span>
        </template>
        <template v-else-if="helpers.parseCallLog(message.content).callType === 'video'">
          <span class="material-symbols-outlined text-primary text-xl">videocam</span>
        </template>
        <template v-else-if="helpers.parseCallLog(message.content).callType === 'screen'">
          <span class="material-symbols-outlined text-blue-400 text-xl">present_to_all</span>
        </template>
        <template v-else>
          <span class="material-symbols-outlined text-green-400 text-xl">call</span>
        </template>
      </div>
      <div class="flex flex-col min-w-0">
        <span class="text-xs font-semibold">
          <span v-if="isMine">Você iniciou</span>
          <span v-else>{{ message.senderName || message.senderUsername }} ligou</span>
          —
          <span v-if="helpers.parseCallLog(message.content).callType === 'video'">Chamada de vídeo</span>
          <span v-else-if="helpers.parseCallLog(message.content).callType === 'screen'">Compartilhamento de tela</span>
          <span v-else>Chamada de voz</span>
        </span>
        <span class="text-[11px] opacity-60 flex items-center gap-1">
          <span v-if="helpers.parseCallLog(message.content).status === 'missed'" class="text-red-400">Não atendida</span>
          <span v-else-if="helpers.parseCallLog(message.content).status === 'declined'" class="text-red-400">Recusada</span>
          <span v-else>
            {{ helpers.formatCallDuration(helpers.parseCallLog(message.content).duration) }}
          </span>
          <span class="opacity-40">·</span>
          <span>{{ helpers.formatTime(message.createdAt) }}</span>
        </span>
      </div>
    </div>
  </div>

  <!-- ==== NORMAL MESSAGE ==== -->
  <div v-else :id="`msg-${message.id}`" :class="[
    'flex items-end max-w-[80%] transition-colors duration-500 rounded-2xl',
    isMine ? 'self-end flex-row-reverse' : '',
    isGrouped ? 'mt-0.5' : 'mt-4',
    isGrouped ? '' : 'gap-3'
  ]">
    <!-- ★ Avatar: hidden for grouped messages (same sender, < 5min apart) -->
    <div v-if="!isGrouped"
      class="bg-center bg-no-repeat bg-cover rounded-full size-8 mb-1 flex-shrink-0 opacity-80"
      :style="{ backgroundImage: `url(${message.senderAvatar || defaultAvatar})` }"
    ></div>
    <div v-else class="w-8 flex-shrink-0"></div>
    <div :class="['flex flex-col relative group max-w-full', isMine ? 'items-end' : '', isGrouped ? 'gap-0' : 'gap-1']">
      <div :class="['flex items-center gap-2', isMine ? 'flex-row-reverse' : '']">
        <div :class="[
          'rounded-2xl border shadow-sm overflow-hidden min-w-[60px]',
          message.contentType === 'sticker' ? '!bg-transparent !border-transparent !shadow-none' :
          isMine
            ? 'bg-primary text-white dark:bg-gradient-to-br dark:from-primary/20 dark:to-blue-600/20 dark:backdrop-blur-md dark:border-primary/30 dark:shadow-neon rounded-br-none border-primary'
            : 'bg-white dark:bg-white/10 dark:backdrop-blur-md text-gray-700 dark:text-slate-200 border-gray-200 dark:border-white/5 rounded-bl-none'
        ]">
          <!-- Deleted Message -->
          <p v-if="message.isDeleted || message.contentType === 'deleted'" class="p-3.5 text-sm italic opacity-70 flex items-center gap-2">
            <span class="material-symbols-outlined text-[16px]">block</span> {{ message.content }}
          </p>

          <!-- Normal Message (not deleted) -->
          <template v-else>
            <!-- Reply Context (shown above the content) -->
            <div v-if="message.replyTo" class="px-2.5 py-1.5 mx-2 mt-2 mb-0 bg-black/10 dark:bg-black/20 rounded border-l-[3px] border-black/20 dark:border-white/20 cursor-pointer hover:opacity-80 transition-opacity" @click="emit('jump-to-message', message.replyTo)">
              <span class="text-[10px] font-bold block opacity-70 leading-none mb-1">Respondendo a</span>
              <p class="text-xs truncate italic opacity-90 leading-tight">{{ helpers.getMessageSnippet(message.replyTo) }}</p>
            </div>

            <!-- Text Message -->
            <div v-if="!message.contentType || message.contentType === 'text'" class="flex flex-col">
              <p class="p-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-lg" :class="message.replyTo ? 'pt-1' : ''"><span v-html="helpers.renderMessageContent(message.content)"></span></p>
              <!-- Link Preview Cards -->
              <div v-if="helpers.hasLinks(message.content)" class="px-3 pb-2 flex flex-col gap-1.5">
                <LinkPreview v-for="url in helpers.extractUrls(message.content)" :key="url" :url="url" />
              </div>
              <!-- Translation display -->
              <div v-if="message.aiTranslation" class="mx-3 mb-3 mt-0 p-2.5 bg-blue-50/80 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs leading-relaxed text-gray-800 dark:text-gray-300 relative shadow-inner">
                <span class="absolute -top-2 -left-2 bg-blue-100 dark:bg-blue-800 size-5 flex items-center justify-center rounded-full text-[10px] shadow-sm border border-blue-200 dark:border-blue-700">🌍</span>
                {{ message.aiTranslation }}
              </div>
            </div>

            <!-- Poll Message -->
            <div v-else-if="message.contentType === 'poll'" class="p-3 min-w-[260px] max-w-md">
              <div class="rounded-xl border border-violet-300/40 dark:border-violet-500/30 bg-violet-50/70 dark:bg-violet-500/10 p-3">
                <p class="text-[11px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide mb-2">Enquete</p>
                <p class="text-sm font-semibold text-gray-800 dark:text-slate-100 mb-3">{{ helpers.parsePoll(message.content).question }}</p>
                <div class="flex flex-col gap-2">
                  <button
                    v-for="(opt, optIdx) in helpers.parsePoll(message.content).options"
                    :key="`${message.id}-${optIdx}`"
                    @click="emit('vote-poll', { message, optionIndex: optIdx })"
                    class="w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs"
                    :class="helpers.isOptionSelected(message, optIdx) ? 'border-violet-500 bg-violet-500/20 text-violet-800 dark:text-violet-100' : 'border-violet-300/40 dark:border-violet-500/20 hover:bg-violet-500/10 text-gray-700 dark:text-slate-200'"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <span class="truncate">{{ opt.text }}</span>
                      <span class="font-bold text-[10px]">{{ helpers.getPollVotesCount(message, optIdx) }}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Meeting Message -->
            <div v-else-if="message.contentType === 'meeting'" class="w-full max-w-sm rounded-2xl bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden mt-1 p-0.5">
              <div class="h-1 bg-primary w-full rounded-t-xl"></div>
              <div class="p-4 flex flex-col gap-3">
                <div class="flex items-center gap-2">
                  <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary text-sm">event</span>
                  </div>
                  <div class="flex flex-col flex-1 min-w-0">
                    <span class="text-sm font-bold text-gray-900 dark:text-white truncate" :title="helpers.parseMeeting(message.content)?.title">{{ helpers.parseMeeting(message.content)?.title || 'Reunião Agendada' }}</span>
                    <span class="text-[11px] text-gray-500 font-medium truncate">Liderada por {{ message.senderName || message.senderUsername }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-white/5">
                  <span class="material-symbols-outlined text-[16px] text-gray-400">schedule</span>
                  <span class="font-medium">{{ helpers.formatMeetingDate(helpers.parseMeeting(message.content)?.startAt) }}</span>
                </div>
                <p v-if="helpers.parseMeeting(message.content)?.description" class="text-xs text-gray-500 italic px-1 line-clamp-2">"{{ helpers.parseMeeting(message.content)?.description }}"</p>
                <a v-if="helpers.parseMeeting(message.content)?.meetingLink" :href="helpers.parseMeeting(message.content)?.meetingLink" target="_blank" class="mt-1 w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-colors">
                  <span class="material-symbols-outlined text-[14px]">videocam</span> Juntar-se à Reunião
                </a>
                <div v-else class="text-center text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">Sem link de vídeo</div>
              </div>
            </div>

            <!-- Sticker Message -->
            <div v-else-if="message.contentType === 'sticker'" class="p-1 max-w-[180px] relative group/sticker">
              <img
                :src="helpers.getApiUrl(message.content)"
                class="w-full h-auto object-contain drop-shadow-xl select-none scale-100 hover:scale-105 transition-transform cursor-pointer"
                @contextmenu.prevent="emit('sticker-actions', message)"
              />
              <!-- Hover action buttons -->
              <div class="absolute top-1 right-1 opacity-0 group-hover/sticker:opacity-100 transition-opacity flex gap-1">
                <button
                  @click.stop="emit('save-sticker', message.content)"
                  class="size-7 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-yellow-500 transition-colors"
                  title="Salvar nos Favoritos"
                >
                  <span class="material-symbols-outlined text-sm">star</span>
                </button>
                <a
                  :href="helpers.getApiUrl(message.content)"
                  download
                  target="_blank"
                  class="size-7 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-primary transition-colors"
                  title="Baixar Figurinha"
                  @click.stop
                >
                  <span class="material-symbols-outlined text-sm">download</span>
                </a>
              </div>
            </div>

            <!-- Image Message -->
            <div v-else-if="message.contentType === 'image'" class="p-1">
              <img :src="helpers.getApiUrl(message.content)" class="rounded-lg max-w-sm max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity" @click="emit('open-image', helpers.getApiUrl(message.content))" />
            </div>

            <!-- Audio Message -->
            <div v-else-if="message.contentType === 'audio'" class="p-2 flex flex-col gap-2 relative">
              <audio :src="helpers.getApiUrl(message.content)" controls class="h-10 w-full max-w-[200px] custom-audio"></audio>
              <button v-if="!message.aiTranscription" @click="emit('transcribe-audio', message)" class="self-start text-[10px] flex items-center gap-1 mt-1 px-2 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold hover:bg-purple-500/20 transition-all border border-purple-500/20" title="Criar resumo da IA para ler rápido sem ouvir">
                <span class="material-symbols-outlined text-[12px]" :class="message.isTranscribing ? 'animate-spin' : ''">{{ message.isTranscribing ? 'progress_activity' : 'auto_awesome' }}</span>
                {{ message.isTranscribing ? 'Lendo Áudio...' : 'Anotar c/ IA' }}
              </button>
              <div v-if="message.aiTranscription" class="mx-1 mb-1 p-2 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-800/30 text-[11px] leading-tight text-gray-800 dark:text-gray-300">
                {{ message.aiTranscription }}
              </div>
            </div>

            <!-- File/PDF/Video Message -->
            <div v-else class="p-3 flex items-center gap-3 min-w-[200px]">
              <div class="size-10 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center">
                <span class="material-symbols-outlined text-2xl" v-if="message.contentType === 'video'">movie</span>
                <span class="material-symbols-outlined text-2xl" v-else-if="message.contentType === 'pdf'">picture_as_pdf</span>
                <span class="material-symbols-outlined text-2xl" v-else>description</span>
              </div>
              <div class="flex flex-col flex-1 min-w-0">
                <span class="text-sm font-medium truncate w-full">{{ helpers.getFileName(message.content) }}</span>
                <a
                  :href="helpers.getApiUrl(message.content)"
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
        <div v-if="!message.isDeleted && message.contentType !== 'deleted'" class="opacity-100 md:opacity-0 md:group-hover:opacity-100 flex gap-1 transition-opacity">
          <button v-if="(!message.contentType || message.contentType === 'text') && !message.aiTranslation" @click="emit('translate', message)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-blue-500" title="Traduzir Mensagem (IA)"><span class="material-symbols-outlined text-[14px]" :class="message.isTranslating ? 'animate-spin' : ''">{{ message.isTranslating ? 'progress_activity' : 'translate' }}</span></button>
          <button @click="emit('reply', message)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-cyan-500" title="Responder"><span class="material-symbols-outlined text-[14px]">reply</span></button>
          <button @click="emit('pin', message.id)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-amber-500" title="Fixar/Desfixar">
            <span class="material-symbols-outlined text-[14px]">keep</span>
          </button>
          <button v-if="isMine && (!message.contentType || message.contentType === 'text')" @click="emit('edit', message)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary"><span class="material-symbols-outlined text-[14px]">edit</span></button>
          <button v-if="isMine" @click="emit('delete', message.id)" class="p-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-500"><span class="material-symbols-outlined text-[14px]">delete</span></button>
        </div>
      </div>

      <div class="flex items-center gap-1 mt-0.5 px-1 truncate max-w-full justify-end flex-wrap">
        <!-- Thread Info -->
        <button
          v-if="message.replyCount > 0"
          @click="emit('reply', message)"
          class="mr-2 text-[11px] font-bold text-primary hover:underline hover:text-cyan-500 transition-colors flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[14px]">forum</span>
          {{ message.replyCount }} {{ message.replyCount > 1 ? 'respostas' : 'resposta' }}
        </button>

        <!-- Reactions -->
        <div v-if="message.reactions && Object.keys(message.reactions).length > 0" class="flex gap-1 mr-2 bg-gray-100 dark:bg-black/30 rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-white/10">
          <div v-for="(users, emoji) in message.reactions" :key="emoji" @click="emit('react', { messageId: message.id, emoji })" class="flex items-center gap-1 cursor-pointer text-[10px] hover:scale-110 transition-transform" :class="users.includes(currentUserId) ? 'text-primary' : ''">
            <span>{{ emoji }}</span> <span class="font-bold">{{ users.length }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <!-- Quick Reactions (Desktop expanded on hover) -->
          <div class="hidden md:group-hover:flex opacity-0 md:opacity-100 flex-nowrap gap-0.5 mr-2 transition-opacity bg-gray-100 dark:bg-black/30 rounded-full px-1.5 py-0.5 border border-gray-200 dark:border-white/10 shadow-sm relative z-10">
            <button class="flex items-center justify-center p-0.5 hover:scale-125 transition-transform text-sm active:scale-95 focus:outline-none" @click="emit('react', { messageId: message.id, emoji: '👍' })" title="Curtir">👍</button>
            <button class="flex items-center justify-center p-0.5 hover:scale-125 transition-transform text-sm active:scale-95 focus:outline-none" @click="emit('react', { messageId: message.id, emoji: '❤️' })" title="Amar">❤️</button>
            <button class="flex items-center justify-center p-0.5 hover:scale-125 transition-transform text-sm active:scale-95 focus:outline-none" @click="emit('react', { messageId: message.id, emoji: '😂' })" title="Rir">😂</button>
            <button class="flex items-center justify-center p-0.5 hover:scale-125 transition-transform text-sm active:scale-95 focus:outline-none" @click="emit('react', { messageId: message.id, emoji: '🔥' })" title="Fogo">🔥</button>
            <button class="flex items-center justify-center p-0.5 hover:scale-125 transition-transform text-sm active:scale-95 focus:outline-none" @click="emit('react', { messageId: message.id, emoji: '😮' })" title="Surpreso">😮</button>
            <button class="flex items-center justify-center p-0.5 border-l border-gray-300 dark:border-white/10 pl-1.5 ml-0.5 text-gray-500 hover:scale-110 transition-transform active:scale-95 focus:outline-none" @click="emit('open-reaction-picker', message.id)" title="Mais emojis">
              <span class="material-symbols-outlined text-sm">add</span>
            </button>
          </div>
          <!-- Mobile 'Add Reaction' trigger (always visible but small) -->
          <button class="md:hidden flex items-center justify-center size-6 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 mr-2 hover:bg-gray-200 transition-colors" @click="emit('open-reaction-picker', message.id)">
            <span class="material-symbols-outlined text-[14px]">add_reaction</span>
          </button>

          <span v-if="message.expiresAt" class="material-symbols-outlined text-[12px] text-red-400 mr-1" title="Mensagem temporária">timer</span>
          <span class="text-[10px] text-gray-400 dark:text-slate-500">{{ helpers.formatTime(message.createdAt) }}</span>
          <span v-if="message.editedAt" class="text-[9px] text-gray-400 dark:text-slate-500 italic ml-1">(editado)</span>
          <!-- Read receipts -->
          <span v-if="isMine" class="material-symbols-outlined text-[14px] ml-1" :class="message.isRead ? 'text-blue-500 shadow-blue-500/20' : 'text-gray-400'">{{ message.isRead ? 'done_all' : 'check' }}</span>
          <!-- Seen by tooltip for groups -->
          <div v-if="isGroupConversation && isMine && message.readBy && message.readBy.length > 0" class="relative group/seen inline-flex ml-1">
            <span class="text-[9px] text-blue-400 cursor-help">{{ message.readBy.length }}👁</span>
            <div class="absolute bottom-full right-0 mb-1 hidden group-hover/seen:block bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[10px] px-2 py-1.5 rounded-lg shadow-xl z-50 whitespace-nowrap max-w-48">
              <p class="font-bold mb-0.5">Visto por:</p>
              <p v-for="uid in message.readBy.slice(0, 5)" :key="uid" class="leading-relaxed">{{ helpers.getParticipantName(uid) }}</p>
              <p v-if="message.readBy.length > 5" class="opacity-60">+{{ message.readBy.length - 5 }} mais</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import LinkPreview from '@/components/LinkPreview.vue';

defineProps({
  message: { type: Object, required: true },
  isMine: { type: Boolean, required: true },
  isGrouped: { type: Boolean, default: false },
  isGroupConversation: { type: Boolean, default: false },
  currentUserId: { type: String, default: null },
  defaultAvatar: { type: String, required: true },
  helpers: { type: Object, required: true },
});

const emit = defineEmits([
  'reply',
  'edit',
  'delete',
  'pin',
  'translate',
  'react',
  'open-reaction-picker',
  'vote-poll',
  'open-image',
  'transcribe-audio',
  'save-sticker',
  'sticker-actions',
  'jump-to-message',
]);
</script>
