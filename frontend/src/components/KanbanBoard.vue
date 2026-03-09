<template>
  <div class="flex-1 w-full h-full flex flex-col bg-gray-50/50 dark:bg-black/20 overflow-hidden relative">
    
    <!-- Header Controls -->
    <div class="p-4 md:p-6 border-b border-gray-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-4 shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-md z-10">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <span class="material-symbols-outlined block">view_kanban</span>
        </div>
        <div>
          <h2 class="text-lg font-bold text-gray-900 dark:text-white capitalize flex items-center gap-2">Painel de Tarefas</h2>
          <p class="text-[11px] text-gray-500 font-medium">Arraste para organizar as atividades</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button @click="openCreateColumnModal" class="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold shadow-sm hover:shadow relative group overflow-hidden transition-all">
          <span class="relative z-10 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">add</span> Coluna</span>
          <div class="absolute inset-0 h-full w-full bg-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
        </button>
      </div>
    </div>

    <!-- Board Area -->
    <div class="flex-1 flex overflow-x-auto overflow-y-hidden p-4 md:p-6 gap-6 scrollbar-hide snap-x">
      
      <!-- Columns -->
      <div 
        v-for="(column, cIndex) in columns" 
        :key="column.id"
        class="flex-shrink-0 w-[320px] max-w-[85vw] flex flex-col bg-gray-100/80 dark:bg-[#1A2325]/80 backdrop-blur border border-gray-200/50 dark:border-white/5 rounded-2xl max-h-full shadow-sm relative group snap-center"
        @dragover.prevent="onDragOverColumn($event, column.id)"
        @drop.prevent="onDropOnColumn($event, column.id)"
      >
        <!-- Column Header -->
        <div class="p-3.5 flex justify-between items-center group/header shrink-0 cursor-grab active:cursor-grabbing border-b border-transparent group-hover:border-gray-200/40 dark:group-hover:border-white/5 transition-colors">
          <h3 class="font-bold text-gray-800 dark:text-slate-100 uppercase tracking-wider text-xs flex items-center gap-2">
            {{ column.title }}
            <span class="bg-gray-200/80 dark:bg-white/10 text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-[10px]">{{ getTasks(column.id).length }}</span>
          </h3>
          <div class="flex gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
            <button @click="openCreateTaskModal(column.id)" class="text-gray-400 hover:text-indigo-500 rounded p-1"><span class="material-symbols-outlined text-[16px]">add</span></button>
            <button @click="deleteColumn(column.id)" class="text-gray-400 hover:text-red-500 rounded p-1"><span class="material-symbols-outlined text-[16px]">delete</span></button>
          </div>
        </div>

        <!-- Task List -->
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3 min-h-[50px]">
          <div 
            v-for="(task, tIndex) in getTasks(column.id)" 
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart($event, task, column.id)"
            @click="editTask(task)"
            class="bg-white dark:bg-black/40 border border-gray-200/70 dark:border-white/10 p-4 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer relative group/task"
          >
            <!-- Delete Task Button -->
            <button @click.stop="deleteTask(task.id)" class="absolute top-3 right-3 opacity-0 group-hover/task:opacity-100 text-gray-400 hover:text-red-500 transition-opacity pointer-events-auto">
              <span class="material-symbols-outlined text-[14px]">close</span>
            </button>

            <h4 class="text-sm font-bold text-gray-900 dark:text-white pr-6 leading-tight mb-2">{{ task.title }}</h4>
            <p v-if="task.description" class="text-xs text-gray-500 dark:text-slate-500 line-clamp-2 mb-3 leading-relaxed">{{ task.description }}</p>
            
            <div class="flex items-center justify-between mt-auto">
              <!-- Source Msg Badge -->
              <div v-if="task.source_message_id" class="flex flex-wrap" title="Criado a partir de uma mensagem no chat">
                 <span class="p-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20"><span class="material-symbols-outlined text-[12px] block">forum</span></span>
              </div>
              <div v-else></div>

              <!-- Assignee -->
              <div v-if="task.assignee_id" class="flex gap-1 justify-end flex-1 pl-2">
                <div class="size-6 rounded-full bg-cover bg-center border-2 border-white dark:border-[#1A2325]" :style="`background-image: url(${task.assignee_avatar || '/lanly-logo.png'})`" :title="`Responsável: ${task.assignee_name}`"></div>
              </div>
            </div>
          </div>
          
          <button @click="openCreateTaskModal(column.id)" class="mt-1 w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-white/5 hover:border-gray-400 dark:hover:border-white/20 transition-all text-xs font-bold flex items-center justify-center gap-1">
             <span class="material-symbols-outlined text-[16px]">add</span>
             Adicionar
          </button>
        </div>
      </div>
      
      <!-- Blank state / loading -->
      <div v-if="loading" class="flex items-center justify-center flex-1">
         <span class="material-symbols-outlined text-4xl text-indigo-500/50 animate-spin">progress_activity</span>
      </div>
      <div v-if="!loading && columns.length === 0" class="flex-1 flex flex-col items-center justify-center text-center opacity-70 mt-10">
         <span class="material-symbols-outlined text-6xl text-gray-400 dark:text-slate-600 mb-4 block animate-bounce">view_kanban</span>
         <p class="text-gray-800 dark:text-slate-200 font-bold mb-1">Nenhuma coluna configurada</p>
         <p class="text-xs text-gray-500 max-w-[250px] mx-auto">Crie a primeira coluna para iniciar o rastreio de tarefas neste projeto!</p>
         <button @click="openCreateColumnModal" class="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/30">Criar Coluna</button>
      </div>

    </div>

    <!-- Modals -->
    <!-- Column Modal -->
    <div v-if="showingColumnModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-white dark:bg-black w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 animate-fade-in-down">
        <div class="p-6">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Nova Coluna</h3>
          <input v-model="columnForm.title" type="text" placeholder="Nome (Ex: 'A Fazer')" class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white placeholder-gray-400 mb-4" />
          <div class="flex justify-end gap-3 mt-4">
            <button @click="showingColumnModal = false" class="px-4 py-2 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-white">Cancelar</button>
            <button @click="saveColumn" :disabled="!columnForm.title" class="px-6 py-2 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50">Salvar</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Task Modal -->
    <div v-if="showingTaskModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-white dark:bg-black w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/10 animate-fade-in-down max-h-[90vh] flex flex-col">
        <div class="p-6 flex-1 overflow-y-auto">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-4">{{ taskForm.id ? 'Editar Tarefa' : 'Nova Tarefa' }}</h3>
          
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 mt-4">Título</label>
          <input v-model="taskForm.title" type="text" placeholder="O que precisa ser feito?" class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white placeholder-gray-400 mb-4 font-bold" />
          
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 mt-2">Detalhes</label>
          <textarea v-model="taskForm.description" rows="4" placeholder="Adicione instruções, links, ou referências..." class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white placeholder-gray-400 mb-4 text-sm"></textarea>
          
          <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 mt-2">Responsável (Membro do Chat)</label>
          <select v-model="taskForm.assigneeId" class="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white text-sm mb-2">
             <option :value="null">Nenhum responsável</option>
             <option v-for="user in chatMembers" :key="user.id" :value="user.id">{{ user.full_name || user.username }}</option>
          </select>
          
          <div class="flex justify-end gap-3 mt-6">
            <button @click="showingTaskModal = false" class="px-4 py-2 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-white">Cancelar</button>
            <button @click="saveTask" :disabled="!taskForm.title" class="px-6 py-2 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-600 disabled:opacity-50">Salvar</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useChatStore } from '../stores/chat';
import { api } from '../stores/auth';

const props = defineProps({
  conversationId: { type: String, required: true }
});

const authStore = useAuthStore();
const chatStore = useChatStore();

const columns = ref([]);
const tasks = ref([]);
const loading = ref(true);

const showingColumnModal = ref(false);
const columnForm = ref({ title: '' });

const showingTaskModal = ref(false);
const taskForm = ref({ id: null, columnId: null, title: '', description: '', assigneeId: null });

const chatMembers = computed(() => {
   if (!chatStore.activeConversation) return [];
   return chatStore.activeConversation.participants || [];
});

onMounted(() => {
  if (props.conversationId) fetchBoard();
});

watch(() => props.conversationId, (newId) => {
  if (newId) fetchBoard();
});

const fetchBoard = async () => {
  loading.value = true;
  try {
    const { data } = await api.get(`/tasks/${props.conversationId}/board`);
    columns.value = data.data.columns || [];
    tasks.value = data.data.tasks || [];
  } catch (err) {
    console.error('Board Error', err);
  } finally {
    loading.value = false;
  }
};

const getTasks = (columnId) => {
  return tasks.value.filter(t => t.column_id === columnId);
};

// Modal Logic
const openCreateColumnModal = () => {
  columnForm.value = { title: '' };
  showingColumnModal.value = true;
};
const saveColumn = async () => {
  if (!columnForm.value.title) return;
  try {
    const { data } = await api.post(`/tasks/${props.conversationId}/columns`, columnForm.value);
    columns.value.push(data.data);
    showingColumnModal.value = false;
  } catch (err) { console.error(err); }
};

const deleteColumn = async (id) => {
  if(!confirm('Apagar essa coluna e TODAS as tarefas nela?')) return;
  try {
    await api.delete(`/tasks/columns/${id}`);
    columns.value = columns.value.filter(c => c.id !== id);
    tasks.value = tasks.value.filter(t => t.column_id !== id);
  } catch (err) { console.error(err); }
}

const openCreateTaskModal = (colId) => {
  taskForm.value = { id: null, columnId: colId, title: '', description: '', assigneeId: null };
  showingTaskModal.value = true;
};
const editTask = (task) => {
  taskForm.value = { id: task.id, columnId: task.column_id, title: task.title, description: task.description || '', assigneeId: task.assignee_id };
  showingTaskModal.value = true;
}
const saveTask = async () => {
  if (!taskForm.value.title) return;
  try {
    if (taskForm.value.id) {
       const reqObj = { title: taskForm.value.title, description: taskForm.value.description, assigneeId: taskForm.value.assigneeId };
       const { data } = await api.put(`/tasks/${taskForm.value.id}`, reqObj);
       const idx = tasks.value.findIndex(t => t.id === taskForm.value.id);
       if(idx > -1) tasks.value[idx] = data.data;
    } else {
       const reqObj = { columnId: taskForm.value.columnId, title: taskForm.value.title, description: taskForm.value.description, assigneeId: taskForm.value.assigneeId };
       const { data } = await api.post(`/tasks/${props.conversationId}`, reqObj);
       tasks.value.unshift(data.data);
    }
    showingTaskModal.value = false;
  } catch (err) { console.error(err); }
};
const deleteTask = async (id) => {
  if(!confirm('Apagar essa tarefa permanentemente?')) return;
  try {
    await api.delete(`/tasks/${id}`);
    tasks.value = tasks.value.filter(t => t.id !== id);
  } catch (err) { console.error(err); }
}

// Drag functionality
let draggedTask = null;

const onDragStart = (e, task, columnId) => {
  draggedTask = task;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.dropEffect = 'move';
};

const onDragOverColumn = (e, columnId) => {
  if (draggedTask && draggedTask.column_id !== columnId) {
     e.preventDefault(); // Necessary to allow dropping
  }
};

const onDropOnColumn = async (e, columnId) => {
  if (!draggedTask) return;
  const oldColumnId = draggedTask.column_id;
  if (oldColumnId === columnId) return; // Dropped in same column

  // Optimistic update
  draggedTask.column_id = columnId;

  // Persist
  try {
    await api.put(`/tasks/${draggedTask.id}`, { columnId });
  } catch (err) {
    // Revert if error
    draggedTask.column_id = oldColumnId;
    console.error(err);
  }
  
  draggedTask = null;
};
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
