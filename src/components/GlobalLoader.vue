<script setup>
import { useAdminStore } from '../stores/adminStore'
import { Loader2 } from 'lucide-vue-next'

const adminStore = useAdminStore()
</script>

<template>
  <transition name="fade">
    <div v-if="adminStore.loading" class="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <!-- High-End Backdrop -->
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md"></div>
      
      <!-- Loader Core -->
      <div class="relative bg-white p-8 rounded-[40px] shadow-2xl border border-white/50 flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
         <div class="relative">
            <!-- Outer Glow -->
            <div class="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse"></div>
            
            <!-- Rotating SVG Loader -->
            <div class="h-20 w-20 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin flex items-center justify-center relative z-10">
               <div class="h-10 w-10 flex items-center justify-center">
                  <div class="h-3 w-3 bg-blue-600 rounded-full animate-ping"></div>
               </div>
            </div>
         </div>
         
         <div class="text-center">
            <h3 class="text-xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Initializing</h3>
            <p class="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-2 opacity-80">Synchronizing with Wear Dynamite Core</p>
         </div>
         
         <!-- Progress indicator bar (Static loop) -->
         <div class="w-48 h-1 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div class="h-full bg-gradient-to-r from-blue-600 to-indigo-600 w-1/3 rounded-full animate-progress-loop"></div>
         </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

@keyframes progress-loop {
  0% { transform: translateX(-100%); width: 20%; }
  50% { width: 50%; }
  100% { transform: translateX(300%); width: 20%; }
}

.animate-progress-loop {
  animation: progress-loop 2s infinite cubic-bezier(0.65, 0.815, 0.735, 0.395);
}
</style>
