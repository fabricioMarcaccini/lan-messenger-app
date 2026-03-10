<template>
  <div v-if="show" class="fixed inset-0 z-[1000] bg-slate-900/30 dark:bg-black/60 backdrop-blur-sm p-4 pt-[12vh] sm:pt-[20vh] flex justify-center transition-all duration-300" @click.self="close">
    <div class="relative w-full max-w-2xl bg-white dark:bg-[#151c20] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2a363d] overflow-hidden flex flex-col transform transition-transform" :class="show ? 'scale-100 opacity-100' : 'scale-95 opacity-0'">
      
      <!-- Search Input Header -->
      <div class="flex relative items-center px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/10">
        <span class="material-symbols-outlined text-indigo-500 mr-3 text-[24px]">search</span>
        <input 
          ref="searchInput" 
          v-model="query" 
          type="text" 
          placeholder="O que você está procurando?"
          class="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none text-lg sm:text-2xl font-medium"
          @keydown.esc="close"
        />
        <div class="flex items-center gap-1.5 ml-3 opacity-60">
           <kbd class="px-2 py-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md text-[10px] font-mono text-gray-500 items-center justify-center flex shadow-sm">esc</kbd>
        </div>
      </div>
      
      <!-- Content Area -->
      <div class="flex-1 overflow-y-auto max-h-[50vh] p-3 scrollbar-hide">
        
        <div v-if="!query" class="animate-fade-in text-left">
          <p class="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Ações Rápidas</p>
          
          <button @click="triggerAction('status')" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-white/5">
             <div class="flex items-center gap-4">
                <div class="size-10 rounded-[10px] bg-green-500/10 text-green-500 shadow-sm flex items-center justify-center border border-green-500/20">
                   <span class="material-symbols-outlined text-lg">circle</span>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100">Atualizar Status para Online</h4>
                  <p class="text-[11px] text-gray-500 mt-0.5 font-medium">Torne-se disponível para o time</p>
                </div>
             </div>
             <span class="material-symbols-outlined text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">keyboard_return</span>
          </button>
          
          <button @click="triggerAction('task')" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-white/5">
             <div class="flex items-center gap-4">
                <div class="size-10 rounded-[10px] bg-indigo-500/10 text-indigo-500 shadow-sm flex items-center justify-center border border-indigo-500/20">
                   <span class="material-symbols-outlined text-lg">add_task</span>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100">Criar Nova Tarefa Global</h4>
                  <p class="text-[11px] text-gray-500 mt-0.5 font-medium">Adicione rapidamente no seu Kanban focado</p>
                </div>
             </div>
             <span class="material-symbols-outlined text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">keyboard_return</span>
          </button>
          
          <button @click="triggerAction('ai')" class="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors text-left border border-transparent hover:border-gray-200 dark:hover:border-white/5">
             <div class="flex items-center gap-4">
                <div class="size-10 rounded-[10px] bg-fuchsia-500/10 text-fuchsia-500 shadow-sm flex items-center justify-center border border-fuchsia-500/20">
                   <span class="material-symbols-outlined text-lg">magic_button</span>
                </div>
                <div>
                  <h4 class="text-sm font-bold text-gray-900 dark:text-gray-100">Bate-papo com AI (Lanly Copilot)</h4>
                  <p class="text-[11px] text-gray-500 mt-0.5 font-medium">Faça perguntas sobre seu histórico de chats [PRO]</p>
                </div>
             </div>
             <span class="material-symbols-outlined text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">keyboard_return</span>
          </button>

          <p class="px-4 py-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-4 mb-1 border-t border-gray-100 dark:border-white/5 pt-4">Navegação Recente</p>
          <div class="px-2">
             <div class="text-center py-6">
                <p class="text-[13px] text-gray-400 font-medium">Comece a digitar para pesquisar em toda sua empresa.</p>
             </div>
          </div>
        </div>
        
        <div v-else class="py-10 text-center animate-fade-in-up">
           <span class="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-4 inline-block animate-pulse">manage_search</span>
           <p class="text-gray-800 dark:text-gray-300 font-bold">Procurando por "{{ query }}"...</p>
           <p class="text-xs text-gray-500 mt-2 font-medium max-w-sm mx-auto">Esta é uma funcionalidade em beta. A pesquisa semântica global varrerá quadros, wikis e conversas fechadas.</p>
           <button @click="close" class="mt-6 px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm shadow-md transition-colors hover:shadow-indigo-500/25">
             Cancelar (Em Desenvolvimento)
           </button>
        </div>

      </div>
      
      <!-- Footer details -->
      <div class="bg-gray-50/50 dark:bg-black/20 p-3 px-5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0">
         <div class="flex items-center gap-4 text-[10px] font-bold text-gray-400">
            <span class="flex items-center gap-1.5"><kbd class="bg-gray-200 dark:bg-white/10 px-1 py-0.5 rounded text-[10px]">&uarr;&darr;</kbd> Navegar</span>
            <span class="flex items-center gap-1.5"><kbd class="bg-gray-200 dark:bg-white/10 px-1 py-0.5 rounded text-[10px]">&crarr;</kbd> Selecionar</span>
         </div>
         <span class="text-[10px] text-indigo-500 opacity-60 font-black tracking-widest uppercase">COMMAND PALETTE</span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';

const emit = defineEmits(['openPremium']);
const authStore = useAuthStore();

const show = ref(false);
const query = ref('');
const searchInput = ref(null);

const triggerAction = (action) => {
   if (action === 'ai') {
       emit('openPremium', 'Copilot / Busca Global em IA');
   } else if (action === 'status') {
       authStore.updateProfile({ status: 'online' }); 
   } else if (action === 'task') {
       alert('Você abriu a janela de criação de tarefa rápida. (Em breve)');
   }
   close();
};

const handleKeydown = (e) => {
  // Ctrl+K or Cmd+K
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); // Prevents browser search bar
    if (show.value) close(); else open();
  }
};

const open = () => {
  show.value = true;
  query.value = '';
  nextTick(() => {
    if (searchInput.value) searchInput.value.focus();
  });
};

const close = () => {
  show.value = false;
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

defineExpose({ open, close });
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
