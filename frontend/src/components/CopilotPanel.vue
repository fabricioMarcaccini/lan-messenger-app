<template>
  <div class="flex flex-col h-full bg-white dark:bg-background-dark border-l border-gray-200 dark:border-glass-border shadow-2xl relative w-full sm:w-80 md:w-96">
    
    <!-- HEADER -->
    <header class="h-16 flex items-center justify-between px-4 border-b border-gray-100 dark:border-white/5 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 shrink-0">
      <div class="flex items-center gap-2">
        <div class="relative">
          <div class="size-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 p-[1px]">
            <div class="size-full rounded-full bg-white dark:bg-black flex items-center justify-center">
              <span class="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 text-[18px]">auto_awesome</span>
            </div>
          </div>
          <span class="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] border border-white dark:border-black"></span>
        </div>
        <div class="flex flex-col leading-tight">
          <span class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1">Lanly Brain <span class="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">Beta</span></span>
          <span class="text-[10px] text-gray-500 dark:text-slate-400">Copiloto de IA Empresarial</span>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button @click="$emit('close')" class="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white transition-colors">
          <span class="material-symbols-outlined text-xl">close</span>
        </button>
      </div>
    </header>

    <!-- MESSAGES AREA -->
    <main class="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50 dark:bg-[#131c1e] scroll-smooth" ref="messagesContainer">
      
      <!-- Welcome Message -->
      <div class="flex gap-3 max-w-[90%]">
        <div class="size-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center mt-1">
          <span class="material-symbols-outlined text-white text-[12px]">auto_awesome</span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-[11px] font-bold text-gray-500 dark:text-slate-400">Lanly Brain</span>
          <div class="bg-white dark:bg-white/10 text-gray-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-white/5 text-[13px] leading-relaxed">
            Olá! Sou o <strong>Lanly Brain</strong>, o assistente inteligente da sua empresa. <br><br>Você pode me pedir resumos de conversas, redação de e-mails, análise de arquivos ou dúvidas gerais sobre processos. Como posso ajudar agora?
          </div>
        </div>
      </div>

      <!-- dynamic messages -->
      <template v-for="(msg, idx) in localMessages" :key="idx">
        
        <!-- User Message -->
        <div v-if="msg.role === 'user'" class="flex gap-3 max-w-[90%] self-end flex-row-reverse">
          <div class="flex flex-col gap-1 items-end">
             <div class="bg-primary text-white p-3 rounded-2xl rounded-tr-sm shadow-sm text-[13px] leading-relaxed whitespace-pre-wrap">
               {{ msg.content }}
             </div>
          </div>
        </div>
        
        <!-- Bot Message -->
        <div v-else class="flex gap-3 max-w-[90%]">
          <div class="size-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center mt-1">
            <span class="material-symbols-outlined text-white text-[12px]">auto_awesome</span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-[11px] font-bold text-gray-500 dark:text-slate-400">Lanly Brain</span>
            <div class="bg-white dark:bg-white/10 text-gray-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-white/5 text-[13px] leading-relaxed prose prose-sm dark:prose-invert">
              {{ msg.content }}
            </div>
          </div>
        </div>

      </template>

      <div v-if="isTyping" class="flex gap-3 max-w-[85%]">
        <div class="size-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center mt-1">
          <span class="material-symbols-outlined text-white text-[12px]">auto_awesome</span>
        </div>
        <div class="flex flex-col gap-1">
          <div class="bg-white dark:bg-white/10 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 dark:border-white/5 w-16 h-10 flex items-center justify-center gap-1">
             <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
             <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
             <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      </div>
    </main>

    <!-- INPUT AREA -->
    <div class="p-3 bg-white dark:bg-glass-surface border-t border-gray-100 dark:border-white/5">
      <div class="flex items-end gap-2 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl p-1 pr-2 shadow-inner focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all">
        <textarea 
          v-model="inputQuery"
          @keydown.enter.prevent="sendQuery"
          rows="1"
          placeholder="Pergunte ao Brain..." 
          class="flex-1 bg-transparent border-none text-sm text-gray-900 dark:text-white px-3 py-2.5 resize-none focus:outline-none max-h-32 min-h-[40px] w-full"
          style="scrollbar-width: none;"
          @input="autoResize"
        ></textarea>
        
        <button 
          @click="sendQuery"
          :disabled="!inputQuery.trim() || isTyping"
          class="h-9 w-9 mb-1 bg-gradient-to-br from-blue-500 to-purple-500 text-white rounded-lg flex items-center justify-center hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <span class="material-symbols-outlined text-[18px]">send_spark</span>
        </button>
      </div>
      <p class="text-[9px] text-center text-gray-400 mt-2">A IA pode cometer erros. Verifique as informações importantes.</p>
    </div>

  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { api } from '@/stores/auth';
import { useChatStore } from '@/stores/chat';

const emit = defineEmits(['close']);
const chatStore = useChatStore();

const inputQuery = ref('');
const isTyping = ref(false);
const localMessages = ref([]);
const messagesContainer = ref(null);

function autoResize(e) {
  const target = e.target;
  target.style.height = 'auto';
  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

async function sendQuery() {
  const text = inputQuery.value.trim();
  if (!text || isTyping.value) return;

  // Add user message
  localMessages.value.push({ role: 'user', content: text });
  inputQuery.value = '';
  isTyping.value = true;
  
  nextTick(() => {
    const textarea = document.querySelector('textarea');
    if(textarea) textarea.style.height = 'auto';
  });

  scrollToBottom();

  try {
    // Collect last ~10 context messages from current chat if any
    let context = [];
    if (chatStore.activeMessages && chatStore.activeMessages.length > 0) {
      context = chatStore.activeMessages.slice(-10).map(m => ({
        senderName: m.senderName || m.senderUsername,
        content: String(m.content || '')
      }));
    }

    const res = await api.post('/ai/bot-reply', {
      message: text,
      context: context
    });

    if (res.data.success) {
      localMessages.value.push({
        role: 'bot',
        content: res.data.data.reply
      });
    } else {
      localMessages.value.push({ role: 'bot', content: `[Erro]: ${res.data.message || 'Falha ao comunicar com IA'}` });
    }
  } catch (err) {
    console.error('Brain Error:', err);
    localMessages.value.push({ role: 'bot', content: 'Ops, houve um erro ao processar sua pergunta. Tente novamente mais tarde.' });
  } finally {
    isTyping.value = false;
    scrollToBottom();
  }
}
</script>
