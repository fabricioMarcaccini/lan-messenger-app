import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { api } from './auth';

export const useStickerStore = defineStore('stickers', () => {
    const companyStickers = ref([]);
    const favoriteStickers = ref([]);
    const loading = ref(false);

    async function fetchStickers() {
        loading.value = true;
        try {
            const response = await api.get('/stickers');
            if (response.data.success) {
                // Remove duplicates in favorites and map to match format
                companyStickers.value = response.data.stickers;
                favoriteStickers.value = response.data.favorites.map(f => ({ ...f, isFavorite: true }));
            }
        } catch (error) {
            console.error('Falha ao carregar figurinhas:', error);
        } finally {
            loading.value = false;
        }
    }

    async function addFavorite(stickerId) {
        try {
            await api.post(`/stickers/${stickerId}/favorite`);
            const sticker = companyStickers.value.find(s => s.id === stickerId);
            if (sticker && !favoriteStickers.value.some(s => s.id === stickerId)) {
                favoriteStickers.value.unshift({ ...sticker, isFavorite: true });
            }
        } catch (error) {
            console.error('Falha ao favoritar figurinha:', error);
        }
    }

    async function removeFavorite(stickerId) {
        try {
            await api.delete(`/stickers/${stickerId}/favorite`);
            favoriteStickers.value = favoriteStickers.value.filter(s => s.id !== stickerId);
        } catch (error) {
            console.error('Falha ao remover favorito:', error);
        }
    }

    async function uploadSticker(file) {
        // Upload to our generic uploads route first
        const formData = new FormData();
        formData.append('file', file);

        try {
            // Step 1: Upload file to get a URL
            const uploadRes = await api.post('/uploads', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // The upload endpoint returns { success, data: { url, ... } }
            const fileUrl = uploadRes.data?.data?.url || uploadRes.data?.url;

            if (!fileUrl) {
                console.error('Upload returned no URL:', uploadRes.data);
                throw new Error('URL do arquivo não retornada pelo servidor');
            }

            // Step 2: Register as sticker in the stickers table
            const stickerRes = await api.post('/stickers', {
                fileUrl,
                isAnimated: file.type.includes('gif') || file.name.endsWith('.webp')
            });

            if (stickerRes.data.success) {
                companyStickers.value.unshift(stickerRes.data.sticker);
                return stickerRes.data.sticker;
            } else {
                throw new Error(stickerRes.data.message || 'Erro ao registrar figurinha');
            }
        } catch (error) {
            console.error('Falha ao fazer upload de figurinha:', error);
            throw error;
        }
    }

    const isFavorite = (id) => favoriteStickers.value.some(s => s.id === id);

    return {
        companyStickers,
        favoriteStickers,
        loading,
        fetchStickers,
        addFavorite,
        removeFavorite,
        uploadSticker,
        isFavorite
    };
});
