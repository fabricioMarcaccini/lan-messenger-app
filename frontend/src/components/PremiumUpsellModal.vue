<template>
  <div v-if="show" class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 transition-all duration-500" @click.self="close">
    <div class="relative w-full max-w-xl bg-gradient-to-b from-[#14171F] to-[#0A0C10] rounded-[2rem] overflow-hidden border border-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.15)] animate-fade-in-up">
      
      <!-- Ambient Glows -->
      <div class="absolute -top-40 -right-40 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div class="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
      
      <button @click="close" class="absolute top-5 right-5 text-gray-400 hover:text-white bg-black/20 hover:bg-white/10 p-2 rounded-full backdrop-blur-md transition-all z-20">
        <span class="material-symbols-outlined text-[20px] block">close</span>
      </button>

      <div class="p-8 sm:p-10 relative z-10 flex flex-col items-center text-center">
        
        <!-- Premium Badge -->
        <div class="inline-flex items-center justify-center p-1 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 p-[1px] mb-8 shadow-lg shadow-indigo-500/20">
           <div class="bg-[#14171F] px-4 py-1.5 rounded-full flex items-center gap-2">
              <span class="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-fuchsia-400 text-[16px]">stars</span>
              <span class="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-fuchsia-300 uppercase tracking-widest">Lanly PRO</span>
           </div>
        </div>

        <h2 class="text-3xl sm:text-4xl font-extrabold text-white mb-4 tracking-tight leading-tight">
          Desbloqueie o poder da <br/>
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-fuchsia-400">Inteligência Artificial</span>
        </h2>
        
        <p class="text-gray-400 font-medium mb-10 max-w-md text-sm sm:text-base leading-relaxed">
          O recuros de <strong class="text-white">{{ featureName }}</strong> é exclusivo para usuários do plano PRO. Evolua sua comunicação e dobre a produtividade da equipe.
        </p>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 text-left">
           <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <span class="material-symbols-outlined text-indigo-400">bolt</span>
              <div>
                 <h4 class="text-white font-bold text-sm mb-1">Transcrição de Áudio</h4>
                 <p class="text-[11px] text-gray-500">Transforme áudios longos em texto instantaneamente com IA.</p>
              </div>
           </div>
           <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <span class="material-symbols-outlined text-purple-400">auto_awesome</span>
              <div>
                 <h4 class="text-white font-bold text-sm mb-1">Resumo de Reuniões</h4>
                 <p class="text-[11px] text-gray-500">Extraia Action Items e pautas de centenas de mensagens.</p>
              </div>
           </div>
           <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <span class="material-symbols-outlined text-pink-400">lock_open</span>
              <div>
                 <h4 class="text-white font-bold text-sm mb-1">Histórico Ilimitado</h4>
                 <p class="text-[11px] text-gray-500">Busque semântica inteligente em qualquer mensagem antiga.</p>
              </div>
           </div>
           <div class="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
              <span class="material-symbols-outlined text-indigo-400">support_agent</span>
              <div>
                 <h4 class="text-white font-bold text-sm mb-1">Suporte Prioritário</h4>
                 <p class="text-[11px] text-gray-500">Atendimento 24/7 direto com nossa equipe de engenharia.</p>
              </div>
           </div>
        </div>

        <button @click="upgrade" class="w-full relative group overflow-hidden rounded-2xl p-[1px] shadow-2xl shadow-indigo-500/20 active:scale-95 transition-all">
           <span class="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 group-hover:opacity-100 transition-opacity"></span>
           <span class="relative w-full h-full bg-indigo-600 group-hover:bg-transparent flex items-center justify-center gap-2 px-8 py-4 rounded-[15px] transition-colors">
              <span class="text-white font-bold text-lg tracking-wide">Fazer Upgrade Agora</span>
              <span class="material-symbols-outlined text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
           </span>
        </button>
        <p class="text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-bold">Cancele quando quiser. Sem fidelidade.</p>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const show = ref(false);
const featureName = ref('Inteligência Artificial Avançada');

const open = (featureTitle = 'Inteligência Artificial Avançada') => {
  featureName.value = featureTitle;
  show.value = true;
};

const close = () => {
  show.value = false;
};

const upgrade = () => {
   // Redirect to Stripe checkout or pricing page
   window.open('https://cnab.com.br', '_blank'); // Temporary placeholder
   close();
};

defineExpose({ open, close });
</script>

<style scoped>
.animate-fade-in-up {
  animation: fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
