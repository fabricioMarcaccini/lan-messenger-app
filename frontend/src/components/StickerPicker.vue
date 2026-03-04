<template>
  <div class="sticker-picker w-72 h-80 bg-white dark:bg-glass-surface border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl">
    <!-- Header / Nav -->
    <div class="flex gap-2 p-2 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 shrink-0 justify-between items-center">
      <div class="flex gap-1">
        <button 
          @click="activeTab = 'favorites'"
          :class="['p-2 rounded-lg transition-colors flex items-center justify-center', activeTab === 'favorites' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10']"
          title="Favoritos"
        >
          <span class="material-symbols-outlined text-lg" :style="activeTab === 'favorites' ? 'font-variation-settings: \'FILL\' 1;' : ''">star</span>
        </button>
        <button 
          @click="activeTab = 'company'"
          :class="['p-2 rounded-lg transition-colors flex items-center justify-center', activeTab === 'company' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10']"
          title="Da Empresa"
        >
          <span class="material-symbols-outlined text-lg" :style="activeTab === 'company' ? 'font-variation-settings: \'FILL\' 1;' : ''">sticky_note_2</span>
        </button>
      </div>
      
      <!-- Upload Button -->
      <label class="cursor-pointer p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center justify-center" title="Criar Figurinha (+Upload)">
        <span class="material-symbols-outlined text-lg">add_photo_alternate</span>
        <input type="file" ref="fileInput" class="hidden" accept="image/webp,image/png,image/gif,image/jpeg" @change="handleUploadSticker" />
      </label>
    </div>

    <!-- Sticker Grid -->
    <div class="flex-1 overflow-y-auto p-2">
      <div v-if="stickerStore.loading && displayStickers.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
         <span class="material-symbols-outlined animate-spin text-3xl mb-2 text-primary">progress_activity</span>
         <span class="text-xs">Carregando...</span>
      </div>
      
      <div v-else-if="displayStickers.length === 0" class="h-full flex flex-col items-center justify-center text-center p-4">
        <span class="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">style</span>
        <p class="text-sm font-semibold text-gray-500 dark:text-slate-400">{{ activeTab === 'favorites' ? 'Nenhum favorito ainda.' : 'Nenhuma figurinha na empresa.' }}</p>
        <p class="text-xs text-gray-400 mt-1" v-if="activeTab === 'favorites'">Clique com botão direito numa figurinha enviada para favoritar.</p>
        <p class="text-xs text-gray-400 mt-1" v-if="activeTab === 'company'">Clique no ícone de + acima para enviar suas imagens ou WEBP/GIFs!</p>
      </div>

      <div v-else class="grid grid-cols-4 gap-2">
        <div 
          v-for="sticker in displayStickers" 
          :key="sticker.id"
          class="aspect-square relative group cursor-pointer rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors flex items-center justify-center"
          @click="selectSticker(sticker)"
          @contextmenu.prevent="toggleFavorite(sticker)"
        >
          <img :src="getApiUrl(sticker.url)" class="w-16 h-16 object-contain pointer-events-none drop-shadow-md" loading="lazy" />
          
          <!-- Favorite Indicator Badge -->
          <div v-if="stickerStore.isFavorite(sticker.id)" class="absolute -top-1 -right-1 size-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border border-white dark:border-[#131c1e]">
            <span class="material-symbols-outlined text-white text-[10px]" style="font-variation-settings: 'FILL' 1;">star</span>
          </div>

          <!-- Tooltip Hint for Right Click -->
          <div class="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center z-10 pointer-events-none">
             <span class="material-symbols-outlined text-white text-xl">{{ stickerStore.isFavorite(sticker.id) ? 'star_half' : 'star' }}</span>
             <span class="text-[8px] text-white font-bold leading-tight mt-1 px-1 text-center">Botão<br>Direito</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStickerStore } from '@/stores/stickers';

const emit = defineEmits(['select']);
const stickerStore = useStickerStore();
const activeTab = ref('favorites');

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

    if (file.size > 2 * 1024 * 1024) { // 2MB restriction for stickers
        alert("A figurinha deve ter no máximo 2MB.");
        return;
    }

    const toastMsg = "Fazendo upload... (Aguarde)";
    console.log(toastMsg); // Em um app real chamaríamos uma notificação

    try {
        const newSticker = await stickerStore.uploadSticker(file);
        // Switch to company tab so the user can see it right away
        activeTab.value = 'company';
    } catch (error) {
        alert("Erro ao fazer upload da figurinha");
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
/* Scrollbar custom for sticker picker */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.4);
  border-radius: 4px;
}
</style>
