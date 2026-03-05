<template>
  <div class="sticker-picker w-80 h-96 bg-white dark:bg-[#1a2528] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
    <!-- Header / Tabs -->
    <div class="flex gap-1 p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 shrink-0 items-center justify-between">
      <div class="flex gap-1">
        <button 
          @click="activeTab = 'company'"
          :class="['px-3 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1', activeTab === 'company' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10']"
        >
          <span class="material-symbols-outlined text-sm">emoji_emotions</span>
          Todas
        </button>
        <button 
          @click="activeTab = 'favorites'"
          :class="['px-3 py-1.5 rounded-lg transition-all text-xs font-semibold flex items-center gap-1', activeTab === 'favorites' ? 'bg-yellow-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10']"
        >
          <span class="material-symbols-outlined text-sm" :style="activeTab === 'favorites' ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
          Favoritas
        </button>
      </div>
      
      <!-- Upload Button -->
      <label class="cursor-pointer px-2 py-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs font-semibold" title="Criar Figurinha">
        <span class="material-symbols-outlined text-sm">add_circle</span>
        <span class="hidden sm:inline">Criar</span>
        <input type="file" ref="fileInput" class="hidden" accept="image/webp,image/png,image/gif,image/jpeg" @change="handleUploadSticker" />
      </label>
    </div>

    <!-- Sticker Grid -->
    <div class="flex-1 overflow-y-auto p-2">
      <!-- Loading -->
      <div v-if="stickerStore.loading && displayStickers.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
         <span class="material-symbols-outlined animate-spin text-3xl mb-2 text-primary">progress_activity</span>
         <span class="text-xs">Carregando figurinhas...</span>
      </div>
      
      <!-- Empty States -->
      <div v-else-if="displayStickers.length === 0" class="h-full flex flex-col items-center justify-center text-center p-4">
        <span class="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600 mb-3">{{ activeTab === 'favorites' ? 'star_border' : 'sentiment_very_satisfied' }}</span>
        <p class="text-sm font-semibold text-gray-500 dark:text-slate-400">{{ activeTab === 'favorites' ? 'Nenhum favorito ainda' : 'Nenhuma figurinha disponível' }}</p>
        <p class="text-xs text-gray-400 mt-1.5 max-w-[200px]" v-if="activeTab === 'favorites'">
          Clique com botão direito em uma figurinha no chat para favoritar!
        </p>
        <p class="text-xs text-gray-400 mt-1.5 max-w-[200px]" v-else>
          Clique em <strong>"Criar"</strong> acima para enviar imagens como figurinhas.
        </p>
      </div>

      <!-- Sticker Grid -->
      <div v-else class="grid grid-cols-4 gap-1.5">
        <div 
          v-for="sticker in displayStickers" 
          :key="sticker.id"
          class="aspect-square relative group cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-200 flex items-center justify-center hover:scale-110"
          @click="selectSticker(sticker)"
          @contextmenu.prevent="toggleFavorite(sticker)"
        >
          <img 
            :src="getApiUrl(sticker.url)" 
            class="w-14 h-14 object-contain pointer-events-none drop-shadow-md" 
            loading="lazy"
            :alt="'Figurinha'"
          />
          
          <!-- Favorite Star Badge -->
          <div v-if="stickerStore.isFavorite(sticker.id)" class="absolute -top-0.5 -right-0.5 size-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-[#1a2528]">
            <span class="material-symbols-outlined text-white text-[8px]" style="font-variation-settings: 'FILL' 1;">star</span>
          </div>

          <!-- Hover Overlay -->
          <div class="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 pointer-events-none">
             <span class="material-symbols-outlined text-white text-base">send</span>
             <span class="text-[7px] text-white/80 font-bold mt-0.5">ENVIAR</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer hint -->
    <div class="px-3 py-1.5 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-white/[0.02] shrink-0">
      <p class="text-[10px] text-gray-400 text-center">Botão direito para ⭐ favoritar • Clique para enviar</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStickerStore } from '@/stores/stickers';

const emit = defineEmits(['select']);
const stickerStore = useStickerStore();
const activeTab = ref('company');

onMounted(() => {
    stickerStore.fetchStickers();
});

const displayStickers = computed(() => {
    return activeTab.value === 'favorites' ? stickerStore.favoriteStickers : stickerStore.companyStickers;
});

const selectSticker = (sticker) => {
    emit('select', sticker);
};

const toggleFavorite = async (sticker) => {
    if (stickerStore.isFavorite(sticker.id)) {
        await stickerStore.removeFavorite(sticker.id);
    } else {
        await stickerStore.addFavorite(sticker.id);
    }
};

const handleUploadSticker = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("A figurinha deve ter no máximo 2MB.");
        return;
    }

    try {
        await stickerStore.uploadSticker(file);
        activeTab.value = 'company';
    } catch (error) {
        alert("Erro ao fazer upload da figurinha. Tente novamente.");
    } finally {
        e.target.value = null;
    }
};

// Helper for image URLs
const getApiUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.PROD
        ? 'https://lan-messenger-backend.onrender.com'
        : 'http://localhost:3000';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
};
</script>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 4px;
}
</style>
