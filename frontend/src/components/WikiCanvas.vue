<template>
  <div class="flex-1 w-full h-full flex bg-white dark:bg-[#131c1e] overflow-hidden relative">
    
    <!-- Sidebar: Index -->
    <div :class="['flex-shrink-0 w-64 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex flex-col transition-all duration-300', isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute md:relative md:-ml-64']">
      <div class="p-4 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between">
        <h3 class="font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">menu_book</span> Team Wiki</h3>
        <button @click="createNewPage" class="p-1 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-white/5 transition-colors" title="Nova Página">
          <span class="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>
      
      <!-- Pages List -->
      <div class="flex-1 overflow-y-auto p-2">
        <ul v-if="pages.length > 0" class="space-y-0.5">
          <li v-for="page in pages" :key="page.id">
            <button 
              @click="selectPage(page)"
              class="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors group"
              :class="activePage?.id === page.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'"
            >
              <span>{{ page.emoji || '📄' }}</span>
              <span class="truncate flex-1">{{ page.title || 'Sem Título' }}</span>
              <!-- Hover delete action -->
              <span @click.stop="deletePage(page.id)" class="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">close</span>
            </button>
          </li>
        </ul>
        
        <div v-if="!loading && pages.length === 0" class="flex flex-col items-center justify-center p-4 text-center mt-6">
          <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-slate-700 mb-2">draft</span>
          <p class="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Vazio</p>
          <p class="text-xs text-gray-500 mt-1">Crie dicas, regras e guias.</p>
        </div>
        <div v-if="loading" class="flex justify-center p-4">
          <span class="material-symbols-outlined animate-spin text-gray-400">sync</span>
        </div>
      </div>
    </div>

    <!-- Main Canvas -->
    <div class="flex-1 flex flex-col h-full bg-white dark:bg-[#131c1e] relative">
      <!-- Top navbar toggle -->
      <div class="absolute top-4 left-4 z-20 md:hidden">
        <button @click="isSidebarOpen = !isSidebarOpen" class="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white hover:bg-gray-200 transition-colors">
          <span class="material-symbols-outlined text-sm">menu</span>
        </button>
      </div>

      <!-- Editor Area -->
      <div v-if="activePage" class="flex-1 overflow-y-auto w-full max-w-3xl mx-auto p-8 md:p-12 relative">
        <div class="absolute top-6 right-6 opacity-50 text-[10px] text-gray-400 font-mono flex items-center gap-1">
          <span v-if="isSaving" class="flex items-center gap-1 text-indigo-400"><span class="material-symbols-outlined animate-spin text-[12px]">sync</span> Salvando</span>
          <span v-else-if="activePage.id">Salvo</span>
          <span v-else>Rascunho</span>
        </div>

        <div class="group relative inline-block mb-4">
          <button @click="showEmojiPicker = true" class="text-6xl hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl p-2 transition-colors cursor-pointer border border-transparent hover:border-dashed hover:border-gray-300 dark:hover:border-white/20">
            {{ activePage.emoji || '📄' }}
          </button>
          <!-- Naive Emoji Picker Overlay -->
          <div v-if="showEmojiPicker" class="absolute top-full left-0 bg-white dark:bg-black border border-gray-200 dark:border-white/10 p-2 rounded-2xl shadow-xl z-[100] grid grid-cols-5 gap-1 outline-none">
            <span v-for="emoji in ['📄','🔥','💻','📚','✅','🚀','📊','📌','💎','🌟']" :key="emoji" 
                  @click="activePage.emoji = emoji; showEmojiPicker = false; autoSave()"
                  class="cursor-pointer text-xl p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-center">{{ emoji }}</span>
          </div>
        </div>
        
        <input 
          v-model="activePage.title"
          @input="autoSave"
          type="text" 
          placeholder="Título da Página" 
          class="w-full text-4xl font-extrabold text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 block mb-6 px-1 appearance-none" 
        />
        
        <textarea 
          ref="contentArea"
          v-model="activePage.content"
          @input="autoSave; autoResize($event)"
          placeholder="Comece a digitar. Use Markdown..." 
          class="w-full min-h-[50vh] text-base leading-relaxed text-gray-700 dark:text-gray-300 bg-transparent outline-none placeholder-gray-300/60 dark:placeholder-gray-600/50 resize-none font-sans px-1"
        ></textarea>
      </div>

      <!-- Blank State (No page selected) -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center opacity-70">
         <span class="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-700 mb-6 drop-shadow-sm">edit_document</span>
         <p class="text-gray-800 dark:text-slate-200 font-bold mb-2 text-lg">Seu Espaço de Conhecimento</p>
         <p class="text-sm text-gray-500 max-w-sm mb-6">Crie a primeira página para documentar processos, manuais de integração, regras e mais.</p>
         <button @click="createNewPage" class="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2">
           <span class="material-symbols-outlined text-[18px]">add</span>
           Nova Página
         </button>
      </div>

    </div>

    <!-- Mobile sidebar overlay -->
    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="md:hidden fixed inset-0 bg-black/50 z-10 backdrop-blur-sm"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import axios from 'axios';

const props = defineProps({
  conversationId: { type: String, required: true }
});

const authStore = useAuthStore();
const pages = ref([]);
const activePage = ref(null);
const loading = ref(true);
const isSaving = ref(false);
const showEmojiPicker = ref(false);
const isSidebarOpen = ref(true);

let saveTimeout = null;

onMounted(() => {
  if (props.conversationId) fetchPages();
});

watch(() => props.conversationId, (newId) => {
  if (newId) fetchPages();
});

const fetchPages = async () => {
  loading.value = true;
  try {
    const { data } = await axios.get(`${import.meta.env.VITE_API_URL}/api/wiki/${props.conversationId}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    pages.value = data.data || [];
  } catch (err) {
    console.error('Wiki Error', err);
  } finally {
    loading.value = false;
  }
};

const selectPage = async (page) => {
  if (activePage.value && activePage.value.id === page.id) return;
  // Fetch full content if needed or just use what we have (we assume list has content)
  activePage.value = { ...page };
  if (window.innerWidth < 768) isSidebarOpen.value = false; // close on mobile
  
  // Resize textarea
  setTimeout(() => {
    const el = document.querySelector('textarea');
    if(el) { el.style.height = 'auto'; el.style.height = (el.scrollHeight) + 'px'; }
  }, 10);
};

const createNewPage = () => {
  activePage.value = { title: '', content: '', emoji: '📄' };
  if (window.innerWidth < 768) isSidebarOpen.value = false; // close on mobile
};

const autoSave = () => {
  isSaving.value = true;
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    if (!activePage.value || (!activePage.value.title && !activePage.value.content)) {
      isSaving.value = false;
      return;
    }
    
    try {
      if (activePage.value.id) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/wiki/pages/${activePage.value.id}`, {
          title: activePage.value.title,
          content: activePage.value.content,
          emoji: activePage.value.emoji
        }, { headers: { Authorization: `Bearer ${authStore.token}` } });
        
        // Update list
        const idx = pages.value.findIndex(p => p.id === activePage.value.id);
        if(idx > -1) pages.value[idx] = { ...activePage.value };
      } else {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/wiki/${props.conversationId}`, {
          title: activePage.value.title || 'Sem Título',
          content: activePage.value.content,
          emoji: activePage.value.emoji
        }, { headers: { Authorization: `Bearer ${authStore.token}` } });
        
        activePage.value.id = data.data.id;
        pages.value.unshift(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSaving.value = false;
    }
  }, 1000); // 1s debounce
};

const deletePage = async (id) => {
  if(!confirm('Deletar essa página permanentemente?')) return;
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL}/api/wiki/pages/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` }
    });
    pages.value = pages.value.filter(p => p.id !== id);
    if(activePage.value?.id === id) activePage.value = null;
  } catch(err) { console.error(err) }
};

const autoResize = (event) => {
  const el = event.target;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};
</script>

<style scoped>
/* Removed default scrollbar for textarea to look clean like Notion */
textarea::-webkit-scrollbar {
  display: block;
  width: 8px;
}
textarea::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}
</style>
