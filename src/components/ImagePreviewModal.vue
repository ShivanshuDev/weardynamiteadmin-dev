<script setup>
import { onMounted, onUnmounted, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-vue-next'

const adminStore = useAdminStore()
const preview = computed(() => adminStore.imagePreview)
const currentImage = computed(() => preview.value.images[preview.value.currentIndex] || '')

const close = () => adminStore.closeImagePreview()
const next = () => adminStore.nextPreview()
const prev = () => adminStore.prevPreview()

const handleKeydown = (e) => {
  if (!preview.value.show) return
  if (e.key === 'Escape') close()
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Transition name="lightbox">
    <div v-if="preview.show" class="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/95 backdrop-blur-md overflow-hidden">
      <!-- Backdrop Close Area -->
      <div class="absolute inset-0 cursor-zoom-out" @click="close"></div>

      <!-- Controls -->
      <div class="absolute top-8 right-8 flex items-center gap-4 z-10">
        <div class="px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 flex items-center gap-3">
          <span class="text-[10px] font-black text-white/50 uppercase tracking-widest">Image</span>
          <span class="text-xs font-black text-white">{{ preview.currentIndex + 1 }} / {{ preview.images.length }}</span>
        </div>
        <button @click="close" class="h-12 w-12 bg-white/10 hover:bg-red-600/20 hover:text-red-500 border border-white/10 rounded-2xl flex items-center justify-center transition-all text-white backdrop-blur-xl group">
          <X size="20" class="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      <!-- Main Image Container -->
      <div class="relative w-full h-full flex items-center justify-center p-12 pointer-events-none">
        <!-- Navigation Buttons -->
        <div v-if="preview.images.length > 1" class="absolute inset-x-8 flex items-center justify-between pointer-events-auto">
          <button @click="prev" class="h-16 w-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center text-white transition-all backdrop-blur-sm group">
            <ChevronLeft size="32" class="group-hover:-translate-x-1 transition-transform" />
          </button>
          <button @click="next" class="h-16 w-16 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl flex items-center justify-center text-white transition-all backdrop-blur-sm group">
            <ChevronRight size="32" class="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <!-- The Image -->
        <Transition name="image-swap" mode="out-in">
          <div :key="currentImage" class="relative group pointer-events-auto">
            <img 
              :src="currentImage" 
              class="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-[0_0_100px_rgba(37,99,235,0.2)] border border-white/20 object-contain animate-in zoom-in-95 duration-500"
              @click.stop
            />
            <!-- Tiny Brand/Status Indicator -->
            <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 rounded-full shadow-2xl shadow-blue-600/50 flex items-center gap-2">
               <Maximize2 size="14" class="text-white" />
               <span class="text-[9px] font-black text-white uppercase tracking-widest">High Resolution Preview</span>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Quick thumbnails list at bottom -->
      <div v-if="preview.images.length > 1" class="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/5 max-w-[80vw] overflow-x-auto no-scrollbar">
        <div 
          v-for="(img, idx) in preview.images" 
          :key="idx"
          @click="adminStore.imagePreview.currentIndex = idx"
          :class="[
            'h-12 w-12 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0',
            preview.currentIndex === idx ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/20' : 'border-transparent opacity-40 hover:opacity-100'
          ]"
        >
          <img :src="img" class="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.lightbox-enter-active, .lightbox-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.lightbox-enter-from, .lightbox-leave-to {
  opacity: 0;
}

.image-swap-enter-active, .image-swap-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.image-swap-enter-from {
  opacity: 0;
  transform: scale(0.95) translateX(20px);
}
.image-swap-leave-to {
  opacity: 0;
  transform: scale(0.95) translateX(-20px);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
