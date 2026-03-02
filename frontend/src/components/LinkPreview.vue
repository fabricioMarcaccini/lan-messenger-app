<template>
  <a :href="url" target="_blank" rel="noopener noreferrer" 
    class="flex flex-col overflow-hidden rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 hover:border-primary/40 hover:shadow-lg transition-all group min-w-[200px] max-w-sm">
    
    <!-- Skeleton loader -->
    <div v-if="isLoading" class="p-3 animate-pulse flex flex-col gap-2">
      <div class="w-full h-32 bg-gray-200 dark:bg-white/5 rounded-lg mb-2"></div>
      <div class="h-4 bg-gray-200 dark:bg-white/5 rounded w-3/4"></div>
      <div class="h-3 bg-gray-200 dark:bg-white/5 rounded w-1/2"></div>
    </div>

    <!-- Error/Fallback -> Simplest representation -->
    <div v-else-if="!meta.title" class="flex items-center gap-2.5 p-3 group-hover:bg-gray-100 dark:group-hover:bg-white/5 transition-colors">
      <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
        <span class="material-symbols-outlined text-primary text-lg">link</span>
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-xs font-semibold text-gray-700 dark:text-slate-200 truncate">{{ hostname }}</span>
        <span class="text-[10px] text-gray-400 dark:text-slate-500 truncate">{{ url }}</span>
      </div>
      <span class="material-symbols-outlined text-gray-300 dark:text-slate-600 text-sm group-hover:text-primary transition-colors flex-shrink-0">open_in_new</span>
    </div>

    <!-- Rich Link Preview -->
    <div v-else class="flex flex-col">
      <div v-if="meta.image" class="w-full h-32 overflow-hidden bg-gray-100 dark:bg-black/40 border-b border-gray-200 dark:border-white/5 relative">
        <img :src="meta.image" :alt="meta.title" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" @error="meta.image = null" />
        <div class="absolute bottom-2 right-2 size-6 rounded bg-black/50 backdrop-blur-md flex items-center justify-center text-white">
           <span class="material-symbols-outlined text-[14px]">link</span>
        </div>
      </div>
      <div class="p-3 flex flex-col gap-1 bg-white dark:bg-white/5 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-colors">
        <h4 class="text-sm font-bold text-gray-900 dark:text-slate-100 line-clamp-1 leading-tight group-hover:text-primary transition-colors">{{ meta.title }}</h4>
        <p v-if="meta.description" class="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-snug">{{ meta.description }}</p>
        <span class="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-1">{{ hostname }}</span>
      </div>
    </div>
  </a>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/stores/auth' // fallback to raw axios/api

const props = defineProps({
  url: String
})

const isLoading = ref(true)
const meta = ref({
  title: null,
  description: null,
  image: null
})

const hostname = computed(() => {
  try {
    return new URL(props.url).hostname
  } catch (e) {
    return props.url
  }
})

onMounted(async () => {
  if (!props.url) {
    isLoading.value = false
    return
  }
  
  try {
    const res = await api.get(`/messages/preview-link?url=${encodeURIComponent(props.url)}`)
    if (res.data?.success && res.data.data) {
      meta.value = res.data.data
    }
  } catch (err) {
    console.warn('Failed to fetch link preview for:', props.url)
  } finally {
    isLoading.value = false
  }
})
</script>
