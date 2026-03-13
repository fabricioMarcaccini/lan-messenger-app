<template>
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
        <span class="truncate">{{ replyingToMessage ? `Respondendo: ${replyPreviewText}` : 'Editando mensagem' }}</span>
      </div>
      <button @click="emit('cancel-edit-or-reply')" class="text-yellow-600 hover:text-yellow-800 dark:hover:text-yellow-100 shrink-0"><span class="material-symbols-outlined text-sm">close</span></button>
    </div>

    <!-- Emoji Picker (Absolute positioned) -->
    <div v-if="showEmojiPicker" class="absolute bottom-20 left-6 z-30 shadow-2xl rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      <emoji-picker class="light dark:dark"></emoji-picker>
    </div>

    <div class="bg-white dark:bg-glass-surface border border-gray-200 dark:border-glass-border rounded-2xl p-2 flex flex-col gap-2 shadow-lg relative" :class="editingMessageId ? 'rounded-tl-none rounded-tr-none' : ''">
      <div class="absolute -inset-px bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 rounded-2xl opacity-50 pointer-events-none hidden dark:block"></div>
      <!-- Respostas Rápidas IA -->
      <div class="relative w-full overflow-hidden" v-if="!isRecording">
        <div class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-glass-surface to-transparent z-10 pointer-events-none"></div>
        <div class="flex items-center gap-2 mb-2 ml-[44px] max-w-full overflow-x-auto no-scrollbar snap-x snap-mandatory pr-8">
          <button v-if="!smartReplies.length" @click="emit('generate-smart-replies')" :disabled="isGeneratingReplies" class="snap-start flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all whitespace-nowrap disabled:opacity-50" title="Ler a última mensagem recebida e gerar dicas de respostas curtas">
            <span class="material-symbols-outlined text-[14px]" :class="isGeneratingReplies ? 'animate-spin' : ''">
              {{ isGeneratingReplies ? 'progress_activity' : 'smart_toy' }}
            </span>
            {{ isGeneratingReplies ? 'Analisando...' : 'Sugerir Respostas com IA' }}
          </button>
          <template v-else>
            <button v-for="(reply, idx) in smartReplies" :key="idx" @click="emit('use-smart-reply', reply)" class="snap-start flex items-center gap-1 px-4 py-1.5 rounded-full bg-white dark:bg-glass-surface text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-200 dark:border-white/10 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all whitespace-nowrap shadow-sm">
              {{ reply }}
            </button>
            <button @click="emit('clear-smart-replies')" class="snap-start size-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-white/5 transition-colors shrink-0" title="Fechar">
              <span class="material-symbols-outlined text-[16px]">close</span>
            </button>
          </template>
        </div>
      </div>

      <div class="flex items-end gap-1 md:gap-2 w-full relative">
        <!-- File Upload Input (Hidden) -->
        <input
          type="file"
          ref="fileInput"
          class="hidden"
          @change="emit('file-selected', $event)"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
        />

        <!-- Desktop Layout Tools -->
        <div class="hidden md:flex items-center">
          <button
            id="tour-attachment"
            @click="fileInput?.click()"
            class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-primary flex items-center justify-center transition-colors mb-0.5 shrink-0"
            :disabled="editingMessageId"
            :class="editingMessageId ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span class="material-symbols-outlined transform rotate-45">attach_file</span>
          </button>
          <button
            @click="emit('open-whiteboard')"
            class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-orange-500 flex items-center justify-center transition-colors mb-0.5 shrink-0"
            title="Lousa Criativa (Desenho livre)"
            :disabled="editingMessageId"
            :class="editingMessageId ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span class="material-symbols-outlined">draw</span>
          </button>
          <button
            @click="emit('open-meeting')"
            class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-indigo-500 flex items-center justify-center transition-colors mb-0.5 shrink-0"
            title="Agendar Reunião"
            :disabled="editingMessageId"
            :class="editingMessageId ? 'opacity-50 cursor-not-allowed' : ''"
          >
            <span class="material-symbols-outlined">event</span>
          </button>
          <select v-model="expiresInModel" class="mb-1 ml-1 text-xs bg-transparent border-none text-gray-500 dark:text-slate-400 p-1 cursor-pointer outline-none ring-0 w-16" title="Temporizador de Autodestruição">
            <option :value="null">Off</option>
            <option :value="60">1m</option>
            <option :value="600">10m</option>
            <option :value="3600">1h</option>
          </select>
        </div>

        <!-- Mobile Layout Tools -->
        <div class="md:hidden relative flex items-end">
          <button @click="emit('update:showComposerActions', !showComposerActions)" class="size-10 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center transition-all duration-300 mb-0.5 shrink-0" :class="showComposerActions ? 'rotate-45 bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white' : 'rotate-0'">
            <span class="material-symbols-outlined font-bold">add</span>
          </button>
          <div v-if="showComposerActions" class="absolute bottom-12 left-0 bg-white/90 dark:bg-black/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 p-2 flex flex-col gap-1 z-50 min-w-[180px] origin-bottom-left animate-fade-in-up">
            <button @click="fileInput?.click(); emit('update:showComposerActions', false)" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium">
              <span class="material-symbols-outlined text-primary text-[18px]">attach_file</span> Anexar
            </button>
            <button @click="emit('open-whiteboard'); emit('update:showComposerActions', false)" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium">
              <span class="material-symbols-outlined text-orange-500 text-[18px]">draw</span> Lousa Explicativa
            </button>
            <button @click="emit('open-meeting'); emit('update:showComposerActions', false)" class="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl text-gray-700 dark:text-slate-200 transition-colors text-sm font-medium">
              <span class="material-symbols-outlined text-indigo-500 text-[18px]">event</span> Agendar Reunião
            </button>
            <div class="px-3 py-2 border-t border-gray-100 dark:border-white/10 mt-1">
              <label class="text-[10px] text-gray-400 font-bold block mb-1 uppercase tracking-wider">Temporizador</label>
              <select v-model="expiresInModel" class="w-full text-xs font-semibold bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 p-2 rounded-lg text-gray-700 dark:text-white outline-none">
                <option :value="null">Off (Permanente)</option>
                <option :value="60">1 Minuto</option>
                <option :value="600">10 Minutos</option>
                <option :value="3600">1 Hora</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex-1 min-h-[44px] py-2.5 flex items-center gap-2">
          <span v-if="isRecording" class="flex items-center gap-2 text-red-500 animate-pulse text-sm font-medium px-2">
            <span class="material-symbols-outlined text-lg">mic</span> Gravando áudio...
          </span>
          <textarea
            id="tour-input"
            v-else
            v-model="textModel"
            @keyup.enter.exact="emit('send-message', { text: textModel })"
            rows="1"
            @input="emit('typing', $event)"
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
              @click="emit('select-mention', u)">
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
              @click="emit('update:showMagicMenu', !showMagicMenu)"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-purple-500 flex items-center justify-center transition-colors relative"
              title="Varinha Mágica (IA)"
              v-if="!isRecording"
              :disabled="!textModel.trim() || isProcessingMagic"
              :class="(!textModel.trim() || isProcessingMagic) ? 'opacity-50 cursor-not-allowed' : ''"
            >
              <span v-if="isProcessingMagic" class="material-symbols-outlined text-purple-500 animate-spin">progress_activity</span>
              <template v-else>
                <span class="material-symbols-outlined text-[22px]">auto_awesome</span>
                <span v-if="textModel.trim()" class="absolute top-1 right-1 size-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse"></span>
              </template>
            </button>

            <!-- Menu IA -->
            <div v-if="showMagicMenu" class="absolute bottom-full right-0 md:-left-1/2 mb-2 w-56 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden backdrop-blur-xl">
              <div class="p-2 border-b border-gray-100 dark:border-white/5 text-[10px] font-bold text-gray-400 dark:text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                <span class="material-symbols-outlined text-xs">auto_awesome</span> Inteligência Artificial
              </div>
              <button @click="emit('apply-magic-text', 'professional')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                <span class="material-symbols-outlined text-[18px] text-blue-500">work</span>
                <div class="flex flex-col leading-tight gap-0.5">
                  <span class="font-medium">Tom Profissional</span>
                  <span class="text-[10px] text-gray-400">Reescrever para o trabalho</span>
                </div>
              </button>
              <button @click="emit('apply-magic-text', 'grammar')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                <span class="material-symbols-outlined text-[18px] text-green-500">spellcheck</span>
                <div class="flex flex-col leading-tight gap-0.5">
                  <span class="font-medium">Corrigir Erros</span>
                  <span class="text-[10px] text-gray-400">Gramática e pontuação</span>
                </div>
              </button>
              <button @click="emit('apply-magic-text', 'english')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                <span class="material-symbols-outlined text-[18px] text-red-500">translate</span>
                <div class="flex flex-col leading-tight gap-0.5">
                  <span class="font-medium">Traduzir (Inglês)</span>
                  <span class="text-[10px] text-gray-400">Native english translation</span>
                </div>
              </button>
              <button @click="emit('apply-magic-text', 'summarize')" class="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 flex items-center gap-3 transition-colors">
                <span class="material-symbols-outlined text-[18px] text-amber-500">short_text</span>
                <div class="flex flex-col leading-tight gap-0.5">
                  <span class="font-medium">Resumir Tópicos</span>
                  <span class="text-[10px] text-gray-400">Para mensagens grandes</span>
                </div>
              </button>
            </div>
          </div>

          <button
            @click="emit('update:showEmojiPicker', !showEmojiPicker); emit('update:showStickerPicker', false)"
            class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-accent flex items-center justify-center transition-colors"
            title="Inserir um Emoji (Rostinhos)"
            v-if="!isRecording"
          >
            <span class="material-symbols-outlined">sentiment_satisfied</span>
          </button>

          <div class="relative items-center flex" v-if="!isRecording">
            <button
              @click="emit('update:showStickerPicker', !showStickerPicker); emit('update:showEmojiPicker', false)"
              class="size-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-orange-500 flex items-center justify-center transition-colors"
              title="Figurinhas (Stickers)"
            >
              <span class="material-symbols-outlined">sticky_note_2</span>
            </button>

            <div v-if="showStickerPicker" class="fixed inset-0 z-40" @click="emit('update:showStickerPicker', false)"></div>
            <div v-if="showStickerPicker" class="absolute bottom-full right-0 mb-2 z-50">
              <StickerPicker @select="emit('send-sticker', $event)" />
            </div>
          </div>

          <button
            v-if="!textModel.trim() && !editingMessageId"
            @mousedown="emit('start-recording')"
            @mouseup="emit('stop-recording')"
            @touchstart.prevent="emit('start-recording')"
            @touchend.prevent="emit('stop-recording')"
            class="h-10 w-10 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-gray-300 rounded-xl flex items-center justify-center transition-all select-none"
            :class="isRecording ? 'bg-red-500 text-white dark:bg-red-600 shadow-lg shadow-red-500/50 scale-110' : ''"
            title="Segure para gravar áudio"
          >
            <span class="material-symbols-outlined text-[20px]">mic</span>
          </button>

          <button
            v-else
            @click="emit('send-message', { text: textModel })"
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

<script setup>
import { computed, ref } from 'vue';
import StickerPicker from '@/components/StickerPicker.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  typingUserNames: { type: Array, default: () => [] },
  editingMessageId: { type: [String, Number], default: null },
  replyingToMessage: { type: Object, default: null },
  replyPreviewText: { type: String, default: '' },
  showEmojiPicker: { type: Boolean, default: false },
  showStickerPicker: { type: Boolean, default: false },
  showMagicMenu: { type: Boolean, default: false },
  showComposerActions: { type: Boolean, default: false },
  smartReplies: { type: Array, default: () => [] },
  isGeneratingReplies: { type: Boolean, default: false },
  isProcessingMagic: { type: Boolean, default: false },
  messageExpiresIn: { type: [Number, null], default: null },
  showMentionDropdown: { type: Boolean, default: false },
  filteredMentionUsers: { type: Array, default: () => [] },
  isRecording: { type: Boolean, default: false },
  locale: { type: Object, required: true },
});

const emit = defineEmits([
  'update:modelValue',
  'update:showEmojiPicker',
  'update:showStickerPicker',
  'update:showMagicMenu',
  'update:showComposerActions',
  'update:messageExpiresIn',
  'send-message',
  'typing',
  'cancel-edit-or-reply',
  'generate-smart-replies',
  'use-smart-reply',
  'clear-smart-replies',
  'file-selected',
  'open-whiteboard',
  'open-meeting',
  'apply-magic-text',
  'send-sticker',
  'start-recording',
  'stop-recording',
  'select-mention',
]);

const fileInput = ref(null);

const textModel = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const expiresInModel = computed({
  get: () => props.messageExpiresIn,
  set: (value) => emit('update:messageExpiresIn', value),
});
</script>
