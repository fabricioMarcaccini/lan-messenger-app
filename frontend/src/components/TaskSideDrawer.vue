<template>
  <!-- Teleport: Renderiza na raiz do <body>, garantindo isolamento de contexto (UI limpa) -->
  <Teleport to="body">
    <transition name="drawer">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex justify-end">
        <!-- Overlay de Foco / Backdrop escuro e borrado -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" @click="closeDrawer"></div>
        
        <!-- Drawer Panel: Fundo claro/escuro, responsivo e com sombra 2xl -->
        <aside class="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full shadow-2xl flex flex-col transform transition-transform duration-300">
          
          <!-- Drawer Header -->
          <header class="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/20">
            <div class="flex items-center gap-3">
              <span class="text-xs font-semibold px-2 py-1 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10">
                TASK-{{ task?.id?.split('-')[0] || 'NEW' }}
              </span>
              <!-- Título Editável In-line (Optimistic) -->
              <h2 
                class="text-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 transition-colors" 
                contenteditable="true" 
                @blur="(e) => updateField('title', e.target.innerText)"
              >
                {{ task?.title || 'Título da Tarefa' }}
              </h2>
            </div>
            <!-- Botão Fechar Drawer -->
            <button @click="closeDrawer" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <span class="sr-only">Fechar</span>
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Drawer Body (Scrollable Sidebar) -->
          <main class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            <!-- Metadata (Priority, Due Date, Status) -->
            <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <!-- Select Component seria integrado aqui -->
                <select class="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Due Date</label>
                <!-- DatePicker Component seria integrado aqui -->
                <input type="date" class="w-full rounded-md border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
              </div>
            </section>

            <!-- Sessão Wiki / Rich Text Editor -->
            <section>
              <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Descrição / Wiki Block</label>
              <!-- Container alvo para o Editor.js (Debounced Auto-save) -->
              <div id="editorjs-container" class="prose dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 rounded-xl p-4 min-h-[250px] shadow-inner bg-gray-50/30 dark:bg-gray-800/30 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all"></div>
            </section>

            <!-- Activity Log / Auditoria Visual com Timeline Vertical -->
            <section>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-5">Atividades Recentes</h3>
              <ul class="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-gray-200 before:via-gray-200 before:to-transparent dark:before:from-gray-700 dark:before:via-gray-700">
                <li v-for="log in mockActivities" :key="log.id" class="relative flex items-start gap-4">
                  <!-- Avatar -->
                  <div class="flex items-center justify-center w-10 h-10 rounded-full border-[3px] border-white dark:border-gray-900 bg-indigo-100 text-indigo-700 font-bold shrink-0 z-10 shadow-sm text-sm">
                    {{ log.user_initials }}
                  </div>
                  <!-- Content Card -->
                  <div class="flex-1 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p class="text-sm text-gray-700 dark:text-gray-300">
                      <strong class="font-medium text-gray-900 dark:text-white">{{ log.full_name || log.username }}</strong> alterou 
                      <span v-for="field in log.changed_fields" :key="field" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 mx-1">
                        {{ field }}
                      </span>
                    </p>
                    <time class="text-xs text-gray-500 dark:text-gray-400 mt-1 block">{{ formatTime(log.created_at) }}</time>
                  </div>
                </li>
              </ul>
            </section>
          </main>

        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { api } from '../stores/auth';
import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import { debounce } from 'lodash-es';

const props = defineProps({
  isOpen: Boolean,
  task: {
    type: Object,
    default: () => ({ id: '1234', title: 'Implementar Funcionalidades Enterprise' })
  }
})

const emit = defineEmits(['close', 'update'])

// State
const mockActivities = ref([]) 
let editorInstance = null

const closeDrawer = () => emit('close')

const updateField = (field, value) => {
  emit('update', { [field]: value })
}

// Fetch Real Audit Logs
const fetchAuditLogs = async () => {
    if(!props.task?.id) return;
    try {
        const { data } = await api.get(`/tasks/${props.task.id}/audit`);
        if (data.success) {
            mockActivities.value = data.data.map(log => ({
                ...log,
                user_initials: (log.full_name || log.username || 'U').substring(0, 2).toUpperCase()
            }));
        }
    } catch (e) {
        console.error("Failed to load audit logs", e);
    }
}

const formatTime = (isoString) => {
    if(!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Inicialização Lazy do Editor.js
const initEditor = () => {
    if (editorInstance) return;
    
    // Tenta parsear JSON pré-existente (se houver), ou ignora para iniciar num bloco vazio/texto text puro formatado
    let initialData = { blocks: [] };
    if (props.task?.description) {
        try {
            initialData = JSON.parse(props.task.description);
        } catch (e) {
            // fallback for legacy plain text tasks
            initialData = { blocks: [{ type: 'paragraph', data: { text: props.task.description } }] };
        }
    }

    editorInstance = new EditorJS({
        holder: 'editorjs-container',
        data: initialData,
        placeholder: 'Pressione TAB ou digite para adicionar conteúdo na Wiki da sua tarefa...',
        tools: {
             header: Header,
             list: List
        },
        onChange: debounce(async (apiObj) => {
            const savedData = await apiObj.saver.save();
            emit('update', { description: JSON.stringify(savedData) });
        }, 1200)
    });
}

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        fetchAuditLogs();
        setTimeout(initEditor, 100); 
    } else {
        if (editorInstance) {
            try {
               editorInstance.destroy();
            } catch(e) {}
            editorInstance = null;
        }
    }
})
</script>

<style scoped>
/* Transições do Slide Over / Drawer Panel */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.3s ease;
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active aside, .drawer-leave-active aside {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from aside, .drawer-leave-to aside {
  transform: translateX(100%);
}

/* Scrollbar Customizada Discreta */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 20px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(75, 85, 99, 0.5);
}
</style>
