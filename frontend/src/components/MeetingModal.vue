<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div class="glass-panel w-full max-w-md rounded-2xl p-6 relative flex flex-col bg-white dark:bg-[#131c1e] border border-gray-200 dark:border-white/10 shadow-xl">
      
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span class="material-symbols-outlined text-primary text-[28px]">event</span>
          Agendar Reunião
        </h2>
        <button @click="$emit('close')" class="text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="flex flex-col gap-4">
        <!-- Title -->
        <div class="group">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Título / Assunto</label>
          <input 
            v-model="form.title"
            type="text" 
            placeholder="Ex: Sync Semanal de Marketing"
            class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <!-- Start At -->
          <div class="group">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Início</label>
            <input 
              v-model="form.startAt"
              type="datetime-local" 
              class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            />
          </div>
          <!-- End At -->
          <div class="group">
            <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Fim (Opcional)</label>
            <input 
              v-model="form.endAt"
              type="datetime-local" 
              class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <!-- Meeting Link -->
        <div class="group">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Link da Sala (Zoom/Meet)</label>
          <input 
            v-model="form.meetingLink"
            type="url" 
            placeholder="https://meet.google.com/xxx-yyy-zzz"
            class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
          />
        </div>

        <!-- Description -->
        <div class="group">
          <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">Observações (Pauta)</label>
          <textarea 
            v-model="form.description"
            rows="2"
            placeholder="Detalhes ou pauta da reunião"
            class="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-none"
          ></textarea>
        </div>

      </div>

      <!-- Action -->
      <button 
        @click="createMeeting" 
        :disabled="isSubmitting || !form.title || !form.startAt"
        class="mt-6 w-full flex items-center justify-center gap-2 bg-primary hover:bg-cyan-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="isSubmitting" class="material-symbols-outlined animate-spin text-lg">progress_activity</span>
        <span v-else class="material-symbols-outlined text-xl">calendar_add_on</span>
        Agendar Reunião
      </button>

      <p v-if="errorMsg" class="mt-3 text-xs text-red-500 text-center font-bold">{{ errorMsg }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/stores/auth';

const props = defineProps({
  conversationId: { type: String, required: true }
});
const emit = defineEmits(['close', 'success']);

const isSubmitting = ref(false);
const errorMsg = ref('');

// Auto-set the time to the nearest next hour
const now = new Date();
now.setHours(now.getHours() + 1, 0, 0, 0);
const startIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

now.setHours(now.getHours() + 1);
const endIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

const form = ref({
  title: '',
  startAt: startIso,
  endAt: endIso,
  meetingLink: '',
  description: ''
});

async function createMeeting() {
  if (!form.value.title || !form.value.startAt) return;
  
  errorMsg.value = '';
  isSubmitting.value = true;
  
  try {
    const payload = {
      conversationId: props.conversationId,
      title: form.value.title,
      startAt: new Date(form.value.startAt).toISOString(),
    };
    if (form.value.endAt) payload.endAt = new Date(form.value.endAt).toISOString();
    if (form.value.meetingLink) payload.meetingLink = form.value.meetingLink;
    if (form.value.description) payload.description = form.value.description;

    const res = await api.post('/meetings', payload);
    if (res.data.success) {
      emit('success', res.data.data);
      emit('close');
    } else {
      errorMsg.value = res.data.message || 'Erro ao agendar';
    }
  } catch (e) {
    console.error(e);
    errorMsg.value = 'Erro ao contactar o servidor';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
