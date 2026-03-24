<template>
  <div class="flex-1 w-full h-full flex bg-white dark:bg-[#131c1e] overflow-hidden relative">
    
    <!-- Sidebar: Hierarchy Index -->
    <div :class="['flex-shrink-0 w-64 border-r border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex flex-col transition-all duration-300', isSidebarOpen ? 'translate-x-0' : '-translate-x-full absolute md:relative md:-ml-64']">
      <div class="p-4 border-b border-gray-200/50 dark:border-white/5 flex items-center justify-between">
        <h3 class="font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">menu_book</span> Team Wiki</h3>
        <button @click="createNewPage(null)" class="p-1 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-white/5 transition-colors" title="Nova Página Principal">
          <span class="material-symbols-outlined text-[16px]">add</span>
        </button>
      </div>
      
      <!-- Folders Tree -->
      <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
        <ul v-if="pageTree.length > 0" class="space-y-0.5">
          <template v-for="node in pageTree" :key="node.id">
            <!-- Parent Level -->
            <li>
              <div 
                @click="selectPage(node)"
                class="w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 text-sm transition-colors group cursor-pointer"
                :class="activePage?.id === node.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'"
              >
                <span @click.stop="node.isOpen = !node.isOpen" class="material-symbols-outlined text-[14px] opacity-40 hover:opacity-100 transition-transform" :class="node.isOpen ? 'rotate-90' : ''">chevron_right</span>
                <span>{{ node.emoji || '📄' }}</span>
                <span class="truncate flex-1">{{ node.title || 'Sem Título' }}</span>
                <span @click.stop="createNewPage(node.id)" class="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 hover:text-indigo-500 transition-opacity" title="Adicionar Sub-página">note_add</span>
                <span @click.stop="deletePage(node.id)" class="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity ml-1" title="Excluir">close</span>
              </div>
              
              <!-- Child Level -->
              <ul v-if="node.isOpen && node.children.length > 0" class="pl-6 mt-0.5 space-y-0.5 border-l border-gray-200 dark:border-gray-800 ml-4">
                <li v-for="child in node.children" :key="child.id">
                  <div 
                    @click="selectPage(child)"
                    class="w-full text-left px-2 py-1 rounded-lg flex items-center gap-2 text-sm transition-colors group cursor-pointer"
                    :class="activePage?.id === child.id ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'"
                  >
                    <span>{{ child.emoji || '📄' }}</span>
                    <span class="truncate flex-1">{{ child.title || 'Sem Título' }}</span>
                    <span @click.stop="deletePage(child.id)" class="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity" title="Excluir">close</span>
                  </div>
                </li>
              </ul>
            </li>
          </template>
        </ul>
        
        <div v-if="!loading && pages.length === 0" class="flex flex-col items-center justify-center p-4 text-center mt-6">
          <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-slate-700 mb-2">draft</span>
          <p class="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Vazio</p>
          <p class="text-xs text-gray-500 mt-1">Sua Base de Conhecimento.</p>
        </div>
        <div v-if="loading" class="flex justify-center p-4">
          <span class="material-symbols-outlined animate-spin text-gray-400">sync</span>
        </div>
      </div>
    </div>

    <!-- Main Editor Canvas -->
    <div class="flex-1 flex flex-col h-full bg-white dark:bg-[#131c1e] relative overflow-y-auto custom-scrollbar" id="main-scroll-container">
      
      <!-- Top navbar toggle -->
      <div class="absolute top-4 left-4 z-20 md:hidden">
        <button @click="isSidebarOpen = !isSidebarOpen" class="p-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white hover:bg-gray-200 transition-colors shadow-sm">
          <span class="material-symbols-outlined text-sm">menu</span>
        </button>
      </div>

      <!-- Action Icons (History) -->
      <div v-if="activePage" class="absolute top-4 right-4 z-20 flex items-center gap-2">
        <span v-if="conflictError" class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold animate-pulse">{{ conflictError }}</span>
        <span v-else-if="isSaving" class="flex items-center gap-1 text-indigo-400 text-xs font-mono mr-2"><span class="material-symbols-outlined animate-spin text-[14px]">sync</span> Salvando</span>
        <span v-else-if="activePage.id" class="text-gray-400 text-xs font-mono mr-2">Salvo</span>
        
        <button @click="openHistoryModal" class="p-2 rounded-xl bg-white/50 backdrop-blur-md dark:bg-black/20 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors shadow-sm border border-gray-200 dark:border-gray-800" title="Histórico da Máquina do Tempo">
          <span class="material-symbols-outlined text-sm">history</span>
        </button>
      </div>

      <!-- Notion-like Header -->
      <div v-if="activePage" class="w-full relative group/cover">
        <!-- Cover Image -->
        <div class="w-full h-48 md:h-64 bg-gray-200 dark:bg-gray-800 relative transition-all overflow-hidden">
          <img v-if="activePage.cover_url" :src="activePage.cover_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20"></div>
          
          <!-- Edit Cover Button (Hover) -->
          <div class="absolute bottom-4 right-4 opacity-0 group-hover/cover:opacity-100 transition-opacity">
            <button @click="changeCover" class="px-3 py-1.5 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-black rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 shadow-sm backdrop-blur-md transition border border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">image</span> Alterar Capa
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="max-w-4xl mx-auto px-8 md:px-16 pb-32 relative">
          <!-- Floating Icon -->
          <div class="group relative inline-block -mt-12 mb-4">
            <button @click="showEmojiPicker = true" class="text-7xl hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl p-2 transition-colors cursor-pointer border border-transparent hover:border-dashed hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-[#131c1e] shadow-sm">
              {{ activePage.emoji || '📄' }}
            </button>
            <div v-if="showEmojiPicker" class="absolute top-full mt-2 left-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 p-2 rounded-2xl shadow-2xl z-[100] grid grid-cols-5 gap-1 outline-none">
              <span v-for="emoji in ['📄','🔥','💻','📚','✅','🚀','📊','📌','💎','🌟','💡','🌐','🎨','⚙️']" :key="emoji" 
                    @click="activePage.emoji = emoji; showEmojiPicker = false; autoSave()"
                    class="cursor-pointer text-xl p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-center">{{ emoji }}</span>
            </div>
          </div>
          
          <!-- Title -->
          <input 
            v-model="activePage.title"
            @input="autoSave"
            type="text" 
            placeholder="Sem Título" 
            class="w-full text-5xl font-extrabold text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-300 dark:placeholder-gray-700 block mb-8 px-1 appearance-none" 
          />
          
          <!-- Editor.js Canvas -->
          <div id="editorjs-wiki-container" class="prose dark:prose-invert prose-lg max-w-none min-h-[50vh]"></div>
        </div>
      </div>

      <!-- Blank State (No page selected) -->
      <div v-else class="flex-1 flex flex-col items-center justify-center text-center opacity-70">
         <span class="material-symbols-outlined text-7xl text-gray-300 dark:text-slate-700 mb-6 drop-shadow-sm">space_dashboard</span>
         <p class="text-gray-800 dark:text-slate-200 font-bold mb-2 text-xl">Wiki Enterprise Suite</p>
         <p class="text-sm text-gray-500 max-w-sm mb-8 leading-relaxed">Pressione "/" para ver comandos ricos, estruture hierarquias e use a Máquina do Tempo para versionamentos.</p>
         <button @click="createNewPage(null)" class="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-transform hover:scale-105">
           <span class="material-symbols-outlined text-[20px]">add</span>
           Começar a Escrever
         </button>
      </div>
    </div>

    <!-- Time-Machine / History Modal -->
    <div v-if="showingHistory" class="absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl z-50 flex flex-col transform transition-transform">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-black/20">
        <h3 class="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">history</span> Versões Anteriores</h3>
        <button @click="showingHistory = false" class="text-gray-400 hover:text-gray-600 dark:hover:text-white"><span class="material-symbols-outlined text-sm">close</span></button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div v-if="historyLoading" class="flex justify-center py-4"><span class="material-symbols-outlined animate-spin text-gray-400">sync</span></div>
        <ul v-else class="space-y-4 relative border-l-2 border-gray-100 dark:border-gray-800 ml-3">
          <li v-for="commit in pageHistory" :key="commit.id" class="relative pl-6">
            <div class="absolute w-3 h-3 bg-indigo-500 rounded-full -left-[7px] top-1.5 ring-4 ring-white dark:ring-gray-900"></div>
            <div class="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-indigo-500/30 transition-colors">
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-1 font-mono">{{ formatTime(commit.created_at) }}</p>
              <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <img v-if="commit.avatar_url" :src="commit.avatar_url" class="w-4 h-4 rounded-full" />
                <span v-else class="w-4 h-4 bg-gray-200 rounded-full"></span>
                {{ commit.full_name || commit.username }}
              </p>
              <button @click="restoreCommit(commit)" class="mt-3 w-full py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition cursor-pointer">Reverter para esta versão</button>
            </div>
          </li>
          <li v-if="pageHistory.length === 0" class="text-sm text-gray-400 p-4">Nenhum histórico salvo ainda.</li>
        </ul>
      </div>
    </div>

    <div v-if="isSidebarOpen" @click="isSidebarOpen = false" class="md:hidden fixed inset-0 bg-black/50 z-10 backdrop-blur-sm"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { api } from '../stores/auth';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import CheckList from '@editorjs/checklist';
import CodeTool from '@editorjs/code';
import Warning from '@editorjs/warning';
import { debounce } from 'lodash-es';

const props = defineProps({
  conversationId: { type: String, required: true }
});

const pages = ref([]);
const activePage = ref(null);
const loading = ref(true);
const isSaving = ref(false);
const showEmojiPicker = ref(false);
const isSidebarOpen = ref(true);
const conflictError = ref('');

// History Modal
const showingHistory = ref(false);
const pageHistory = ref([]);
const historyLoading = ref(false);

let saveTimeout = null;
let editorInstance = null;

// Reconstruct Tree from flat pages array
const pageTree = computed(() => {
    const map = {};
    const roots = [];
    pages.value.forEach(p => {
        map[p.id] = { ...p, children: [], isOpen: true }; // default open
    });
    pages.value.forEach(p => {
        if (p.parent_id && map[p.parent_id]) {
            map[p.parent_id].children.push(map[p.id]);
        } else {
            roots.push(map[p.id]);
        }
    });
    return roots;
});

onMounted(() => {
  if (props.conversationId) fetchPages();
});

watch(() => props.conversationId, (newId) => {
  if (newId) fetchPages();
});

const fetchPages = async () => {
  loading.value = true;
  try {
    const { data } = await api.get(`/wiki/${props.conversationId}`);
    pages.value = data.data || [];
  } catch (err) {
    console.error('Wiki Error', err);
  } finally {
    loading.value = false;
  }
};

const initEditor = () => {
    if (editorInstance) {
        try { editorInstance.destroy(); } catch(e) {}
        editorInstance = null;
    }
    
    let initialData = { blocks: [] };
    if (activePage.value?.content) {
        try {
            initialData = JSON.parse(activePage.value.content);
        } catch (e) {
            initialData = { blocks: [{ type: 'paragraph', data: { text: activePage.value.content } }] };
        }
    }

    editorInstance = new EditorJS({
        holder: 'editorjs-wiki-container',
        data: initialData,
        placeholder: 'Pressione "/" para ver os comandos ou comece a digitar texto livremente...',
        tools: {
             header: Header,
             list: List,
             checklist: CheckList,
             code: CodeTool,
             warning: Warning
        },
        onChange: debounce(async (apiObj) => {
            const savedData = await apiObj.saver.save();
            activePage.value.content = JSON.stringify(savedData);
            autoSave();
        }, 1200)
    });
};

const selectPage = async (page) => {
  if (activePage.value && activePage.value.id === page.id) return;
  // Deep copy so tree reactivity doesn't break instantly on typing
  activePage.value = { ...page, version: page.version || 1 }; 
  conflictError.value = '';
  showingHistory.value = false;
  
  if (window.innerWidth < 768) isSidebarOpen.value = false; 
  
  await nextTick();
  initEditor();
};

const createNewPage = (parentId = null) => {
  activePage.value = { title: '', content: '', emoji: '📄', parent_id: parentId, version: 1 };
  conflictError.value = '';
  if (window.innerWidth < 768) isSidebarOpen.value = false; 
  
  nextTick(() => {
      initEditor();
  });
};

const autoSave = () => {
  isSaving.value = true;
  conflictError.value = '';
  clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(async () => {
    if (!activePage.value || (!activePage.value.title && !activePage.value.content)) {
        isSaving.value = false; return;
    }
    
    try {
      if (activePage.value.id) {
        // Update -> Optimistic Locking via backend validation
        const { data } = await api.put(`/wiki/pages/${activePage.value.id}`, {
          title: activePage.value.title,
          content: activePage.value.content,
          emoji: activePage.value.emoji,
          parentId: activePage.value.parent_id,
          coverUrl: activePage.value.cover_url,
          version: activePage.value.version
        });
        
        // Sucesso: Increment local version
        activePage.value.version = data.data.version;
        const idx = pages.value.findIndex(p => p.id === activePage.value.id);
        if(idx > -1) pages.value[idx] = { ...data.data };

      } else {
        // Create
        const { data } = await api.post(`/wiki/${props.conversationId}`, {
          title: activePage.value.title || 'Sem Título',
          content: activePage.value.content,
          emoji: activePage.value.emoji,
          parentId: activePage.value.parent_id
        });
        
        activePage.value.id = data.data.id;
        activePage.value.version = data.data.version;
        pages.value.unshift(data.data);
      }
    } catch (err) {
      if (err.response?.status === 409) {
          conflictError.value = "Conflito: Alguém editou a página recentemente. Atualize (F5).";
      } else {
          console.error("Wiki Save Error:", err.response?.data || err);
      }
    } finally {
      isSaving.value = false;
    }
  }, 1000);
};

const changeCover = () => {
    const url = prompt("Digite o link da nova imagem de capa (ex: Unsplash, Imgur):", "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1500&auto=format&fit=crop");
    if (url) {
        activePage.value.cover_url = url;
        autoSave();
    }
};

const deletePage = async (id) => {
  if(!confirm('Deletar essa página e suas sub-páginas permanentemente?')) return;
  try {
    await api.delete(`/wiki/pages/${id}`);
    pages.value = pages.value.filter(p => p.id !== id && p.parent_id !== id); // fake cascade visually
    if(activePage.value?.id === id) {
        activePage.value = null;
        if(editorInstance) { try { editorInstance.destroy(); } catch(e){} editorInstance = null; }
    }
  } catch(err) { console.error(err) }
};

const openHistoryModal = async () => {
    showingHistory.value = true;
    historyLoading.value = true;
    try {
        const { data } = await api.get(`/wiki/pages/${activePage.value.id}/history`);
        pageHistory.value = data.data;
    } catch(err) {
        console.error(err);
    } finally {
        historyLoading.value = false;
    }
};

const restoreCommit = async (commit) => {
    if(!confirm("Atenção! Isso irá sobrepor a página atual com a versão do dia " + formatTime(commit.created_at) + ". Continuar?")) return;
    try {
        const { data } = await api.post(`/wiki/pages/${activePage.value.id}/restore/${commit.id}`);
        activePage.value = { ...data.data };
        const idx = pages.value.findIndex(p => p.id === activePage.value.id);
        if(idx > -1) pages.value[idx] = { ...data.data };
        
        showingHistory.value = false;
        alert("Versão restaurada com sucesso!");
        initEditor();
    } catch (err) {
        console.error(err);
        alert("Erro ao restaurar a versão. Veja o console.");
    }
};

const formatTime = (isoString) => {
    if(!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};
</script>

<style>
/* CSS para o Editor JS combinar com o fundo escuro do Notion/Tailwind */
.codex-editor__redactor {
    padding-bottom: 100px !important;
}
.ce-block__content, .ce-toolbar__content {
    max-width: 100% !important;
}
.dark .ce-paragraph, .dark .ce-header, .dark .ce-list__item {
    color: #cbd5e1 !important;
}
.dark .ce-toolbar__actions {
    background: transparent;
}
.dark .ce-popover, .dark .ce-settings {
    background-color: #1f2937 !important;
    border-color: #374151 !important;
    color: white !important;
}
.dark .ce-popover-item:hover, .dark .ce-settings__button:hover {
    background-color: #374151 !important;
}
.dark .tc-wrap {
    --color-border: #374151;
    --color-text-secondary: #9ca3af;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 20px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.4);
}
</style>
