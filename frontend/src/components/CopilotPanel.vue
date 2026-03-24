<template>
  <div class="flex flex-col h-full bg-zinc-50 dark:bg-[#0a0a0a] border-l border-zinc-200 dark:border-zinc-800/80 shadow-2xl relative w-full sm:w-80 md:w-96 font-sans">
    
    <!-- HEADER -->
    <header class="h-14 flex items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-[#0f0f0f] shrink-0">
      <div class="flex items-center gap-3">
        <div class="flex items-center justify-center size-6 bg-black dark:bg-white text-white dark:text-black rounded-sm">
          <span class="material-symbols-outlined text-[14px]">terminal</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs font-bold tracking-widest uppercase text-zinc-900 dark:text-zinc-100">Lanly Brain</span>
          <span class="text-[9px] font-mono text-zinc-500 dark:text-zinc-500">SYS.COPILOT.V1</span>
        </div>
      </div>
      <button @click="$emit('close')" class="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>
    </header>

    <!-- MESSAGES AREA -->
    <main class="flex-1 overflow-y-auto p-5 flex flex-col gap-6 bg-white dark:bg-[#0a0a0a]" ref="messagesContainer">
      
      <!-- Welcome Message -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">System</span>
          <div class="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50"></div>
        </div>
        <div class="text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300 font-mono">
          > INITIALIZING LANLY BRAIN...<br>
          > READY.<br><br>
          How can I assist you with your enterprise operations today?
        </div>
      </div>

      <!-- dynamic messages -->
      <template v-for="(msg, idx) in localMessages" :key="idx">
        
        <!-- User Message -->
        <div v-if="msg.role === 'user'" class="flex flex-col gap-2 items-end">
          <div class="flex items-center gap-2 w-full flex-row-reverse">
            <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">User</span>
            <div class="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50"></div>
          </div>
          <div class="text-[13px] leading-relaxed text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 px-3 py-2 rounded-sm whitespace-pre-wrap max-w-[85%] border-l-2 border-black dark:border-white">
            {{ msg.content }}
          </div>
        </div>
        
        <!-- Bot Message -->
        <div v-else class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Brain</span>
            <div class="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50"></div>
          </div>
          <div class="text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-300 font-mono prose prose-sm dark:prose-invert max-w-[95%] whitespace-pre-wrap">
            {{ msg.content }}
          </div>
        </div>

      </template>

      <div v-if="isTyping" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Brain</span>
          <div class="h-px flex-1 bg-zinc-100 dark:bg-zinc-800/50"></div>
        </div>
        <div class="text-[13px] text-zinc-500 font-mono animate-pulse">
          > processing_request...
        </div>
      </div>
    </main>

    <!-- INPUT AREA -->
    <div class="p-4 bg-white dark:bg-[#0f0f0f] border-t border-zinc-200 dark:border-zinc-800/80">
      <div class="relative flex items-end border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#141414] focus-within:border-black dark:focus-within:border-white transition-colors rounded-sm">
        <div class="absolute left-3 bottom-[11px] text-zinc-400">
          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        </div>
        <textarea 
          v-model="inputQuery"
          @keydown.enter.prevent="sendQuery"
          rows="1"
          placeholder="Enter command..." 
          class="flex-1 bg-transparent border-none text-[13px] font-mono text-zinc-900 dark:text-zinc-100 pl-9 pr-12 py-3 resize-none focus:outline-none max-h-32 min-h-[44px] w-full"
          style="scrollbar-width: none;"
          @input="autoResize"
        ></textarea>
        
        <button 
          @click="sendQuery"
          :disabled="!inputQuery.trim() || isTyping"
          class="absolute right-2 bottom-2 h-7 w-7 bg-black dark:bg-white text-white dark:text-black rounded-sm flex items-center justify-center hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <span class="material-symbols-outlined text-[14px]">subdirectory_arrow_left</span>
        </button>
      </div>
      <div class="flex justify-between items-center mt-3">
        <p class="text-[9px] font-mono text-zinc-400 uppercase tracking-widest">AI MODULE V1.0</p>
        <p class="text-[9px] font-mono text-zinc-400">MAY CONTAIN INACCURACIES</p>
      </div>
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
