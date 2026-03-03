<script setup>
import { ref, watch, onMounted } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  conversationId: { type: String, required: true },
  threadId: { type: String, required: true }
})

const emit = defineEmits(['close'])

const chatStore = useChatStore()
const authStore = useAuthStore()

const newMessage = ref('')
const messagesEnd = ref(null)

watch(() => props.threadId, (newId) => {
  chatStore.setActiveThread(newId)
}, { immediate: true })

function scrollToBottom() {
  setTimeout(() => {
    messagesEnd.value?.scrollIntoView({ behavior: 'smooth' })
  }, 100)
}

async function handleSendMessage() {
  if (!newMessage.value.trim()) return
  const content = newMessage.value

  try {
    newMessage.value = ''
    await chatStore.sendMessage(props.conversationId, content, 'text', { threadId: props.threadId })
    chatStore.fetchThreadMessages(props.conversationId, props.threadId)
    scrollToBottom()
  } catch (err) {
    console.error('Failed to send thread reply', err)
  }
}

// Format message times
function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50 dark:bg-[#13181b] border-l border-gray-200 dark:border-white/10 w-[350px] shadow-2xl relative z-10 transition-all">
    <!-- Header -->
    <div class="p-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white dark:bg-black/20">
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary">forum</span>
        <h3 class="font-bold text-gray-900 dark:text-white">Tópico (Thread)</h3>
      </div>
      <button @click="$emit('close')" class="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-500 dark:text-gray-400">
        <span class="material-symbols-outlined text-sm">close</span>
      </button>
    </div>

    <!-- Messages List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <template v-for="(msg, i) in chatStore.threadMessages[threadId]" :key="msg.id">
        
        <!-- Divider if it's the second message (first reply) -->
        <div v-if="i === 1" class="flex items-center my-4 opacity-50">
          <div class="flex-1 border-t border-gray-300 dark:border-white/20"></div>
          <span class="px-3 text-xs font-bold text-gray-500 dark:text-gray-400">Respostas</span>
          <div class="flex-1 border-t border-gray-300 dark:border-white/20"></div>
        </div>

        <div class="flex gap-3 group" :class="msg.senderId === authStore.user?.id ? 'flex-row-reverse' : ''">
          <img :src="msg.senderAvatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.senderName}`"
               class="size-8 rounded-full border border-gray-200 dark:border-white/10 flex-shrink-0" />
          
          <div class="flex flex-col text-sm max-w-[85%]"
               :class="msg.senderId === authStore.user?.id ? 'items-end' : 'items-start'">
            <div class="flex items-baseline gap-2 mb-0.5">
              <span class="font-bold text-gray-900 dark:text-white text-xs">{{ msg.senderName.split(' ')[0] }}</span>
              <span class="text-[10px] text-gray-500 font-medium">{{ formatTime(msg.createdAt) }}</span>
            </div>
            
            <div class="px-3 py-2 rounded-xl shadow-sm text-sm break-words relative"
                 :class="msg.senderId === authStore.user?.id ? 'bg-primary text-white dark:text-background-dark rounded-tr-sm' : 'bg-white dark:bg-black/30 border border-gray-100 dark:border-white/5 text-gray-800 dark:text-gray-200 rounded-tl-sm'">
              {{ msg.content }}
            </div>
          </div>
        </div>
      </template>
      <div ref="messagesEnd"></div>
    </div>

    <!-- Input -->
    <div class="p-4 bg-white dark:bg-black/20 border-t border-gray-200 dark:border-white/10 pb-6 md:pb-4">
      <div class="flex gap-2">
        <input 
          v-model="newMessage"
          @keyup.enter="handleSendMessage"
          type="text" 
          class="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          placeholder="Responder em tópico..."
        />
        <button 
          @click="handleSendMessage"
          :disabled="!newMessage.trim()"
          class="p-2 rounded-xl bg-primary text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-400 transition-colors flex items-center justify-center shrink-0"
        >
          <span class="material-symbols-outlined text-lg">send</span>
        </button>
      </div>
    </div>
  </div>
</template>
