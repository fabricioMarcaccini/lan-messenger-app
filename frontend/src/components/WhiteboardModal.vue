<template>
  <Transition name="fade">
    <div class="fixed inset-0 z-[200] flex flex-col bg-black/80 backdrop-blur-md">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 bg-gray-900 border-b border-white/10 shrink-0">
        <div class="flex items-center gap-3 text-white">
          <div class="size-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <span class="material-symbols-outlined text-orange-400">draw</span>
          </div>
          <div>
            <h3 class="font-bold text-lg">Lousa Criativa</h3>
            <p class="text-xs text-white/50">Desenhe, anote e envie como imagem na conversa</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Clear Button -->
          <button @click="clearCanvas" class="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
            <span class="material-symbols-outlined text-sm">delete</span> Limpar
          </button>
          <!-- Send Button -->
          <button @click="sendCanvas" class="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all">
            <span class="material-symbols-outlined text-sm">send</span> Enviar
          </button>
          <!-- Close -->
          <button @click="$emit('close')" class="size-10 flex items-center justify-center rounded-lg hover:bg-red-500/20 text-white hover:text-red-400 transition-colors ml-2">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center justify-center gap-6 p-3 bg-gray-800 shrink-0 border-b border-white/5">
        <!-- Tools -->
        <div class="flex items-center gap-1 bg-black/40 p-1 rounded-xl">
          <button @click="tool = 'pen'" :class="tool === 'pen' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:text-white'" class="size-10 flex items-center justify-center rounded-lg transition-colors" title="Caneta Livre">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button @click="tool = 'eraser'" :class="tool === 'eraser' ? 'bg-gray-600 text-white shadow-md' : 'text-gray-400 hover:text-white'" class="size-10 flex items-center justify-center rounded-lg transition-colors" title="Borracha">
            <span class="material-symbols-outlined">ink_eraser</span>
          </button>
        </div>

        <!-- Thickness -->
        <div class="flex items-center gap-3">
           <span class="text-xs text-gray-400 font-bold uppercase tracking-widest">Tamanho</span>
           <input type="range" v-model="lineWidth" min="1" max="30" class="w-32 accent-orange-500 shadow" />
           <div class="size-6 bg-black/40 rounded-full flex items-center justify-center">
             <div class="bg-white rounded-full" :style="{ width: lineWidth + 'px', height: lineWidth + 'px', backgroundColor: tool === 'eraser' ? '#ffffff' : color }"></div>
           </div>
        </div>

        <!-- Colors -->
        <div class="flex items-center gap-2 pl-4 border-l border-white/10" v-if="tool !== 'eraser'">
          <button v-for="c in colors" :key="c" @click="color = c" :class="color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-800' : 'hover:scale-110'" class="size-6 rounded-full shadow-md transition-all" :style="{ backgroundColor: c }"></button>
          <input type="color" v-model="color" class="size-8 rounded cursor-pointer border-0 p-0 overflow-hidden ml-2" />
        </div>
      </div>

      <!-- Canvas Area -->
      <div class="flex-1 bg-white relative top-0 touch-none overflow-hidden" ref="canvasContainer">
        <!-- We use 2 canvases, one for drawing, one for background (grid) -->
        <div class="absolute inset-0 pointer-events-none" style="background-image: radial-gradient(#d1d5db 1px, transparent 1px); background-size: 20px 20px;"></div>
        <canvas 
          ref="canvasEl" 
          class="absolute inset-0 touch-none cursor-crosshair w-full h-full"
          @mousedown="startDrawing"
          @mousemove="draw"
          @mouseup="stopDrawing"
          @mouseout="stopDrawing"
          @touchstart.prevent="startDrawingTouch"
          @touchmove.prevent="drawTouch"
          @touchend.prevent="stopDrawing"
        ></canvas>
      </div>

    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const emit = defineEmits(['close', 'send'])

const canvasContainer = ref(null)
const canvasEl = ref(null)
let ctx = null

const tool = ref('pen') // 'pen' | 'eraser'
const color = ref('#ff5722') // default orange
const lineWidth = ref(5)

const colors = ['#000000', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']

let isDrawing = false
let lastX = 0
let lastY = 0

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', resizeCanvas)
  // Ensure the body doesn't scroll on mobiles while drawing
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  document.body.style.overflow = ''
})

function initCanvas() {
  if (!canvasEl.value || !canvasContainer.value) return
  ctx = canvasEl.value.getContext('2d', { willReadFrequently: true })
  resizeCanvas()
}

function resizeCanvas() {
  if (!canvasEl.value || !canvasContainer.value) return
  // Save current drawing
  let tempCanvas = null
  let tempCtx = null
  if(ctx && canvasEl.value.width > 0) {
      tempCanvas = document.createElement('canvas')
      tempCtx = tempCanvas.getContext('2d')
      tempCanvas.width = canvasEl.value.width
      tempCanvas.height = canvasEl.value.height
      tempCtx.drawImage(canvasEl.value, 0, 0)
  }

  const rect = canvasContainer.value.getBoundingClientRect()
  canvasEl.value.width = rect.width
  canvasEl.value.height = rect.height

  // Setup Default Context after resize
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Restore drawing
  if(tempCanvas && tempCtx) {
      ctx.drawImage(tempCanvas, 0, 0)
  }
}

function getPos(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

function getTouchPos(e) {
  const rect = canvasEl.value.getBoundingClientRect()
  return {
    x: e.touches[0].clientX - rect.left,
    y: e.touches[0].clientY - rect.top
  }
}

function startDrawing(e) {
  if (e.button !== 0) return // only left click
  isDrawing = true
  const pos = getPos(e)
  lastX = pos.x
  lastY = pos.y
  
  // draw dots if just clicked
  draw(e)
}

function startDrawingTouch(e) {
  isDrawing = true
  const pos = getTouchPos(e)
  lastX = pos.x
  lastY = pos.y
  drawTouch(e)
}

function draw(e) {
  if (!isDrawing || !ctx) return
  const pos = getPos(e)
  executeDraw(pos.x, pos.y)
}

function drawTouch(e) {
  if (!isDrawing || !ctx) return
  const pos = getTouchPos(e)
  executeDraw(pos.x, pos.y)
}

function executeDraw(x, y) {
  ctx.beginPath()
  
  if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineWidth = lineWidth.value * 2 // Eraser is bigger
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
    ctx.lineWidth = lineWidth.value
  }

  ctx.moveTo(lastX, lastY)
  ctx.lineTo(x, y)
  ctx.stroke()
  
  lastX = x
  lastY = y
}

function stopDrawing() {
  isDrawing = false
  if(ctx) ctx.beginPath()
}

function clearCanvas() {
  if (!ctx || !canvasEl.value) return
  ctx.clearRect(0, 0, canvasEl.value.width, canvasEl.value.height)
}

function sendCanvas() {
  if (!canvasEl.value) return
  
  // We need to draw a solid white background first so that transpareny isn't black 
  // Wait, if it's transparent, we can save it as PNG with transparency! That's cool.
  // But maybe a white background is better for chat visibility. Let's make it white.
  
  const finalCanvas = document.createElement('canvas')
  finalCanvas.width = canvasEl.value.width
  finalCanvas.height = canvasEl.value.height
  const finalCtx = finalCanvas.getContext('2d')
  
  // Fill white
  finalCtx.fillStyle = '#ffffff'
  finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
  
  // Draw content
  finalCtx.drawImage(canvasEl.value, 0, 0)
  
  finalCanvas.toBlob((blob) => {
    if(!blob) return
    const file = new File([blob], `Board_${Date.now()}.png`, { type: 'image/png' })
    emit('send', file)
  }, 'image/png')
}
</script>
