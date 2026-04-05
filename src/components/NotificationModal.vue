<script setup>
import { useAdminStore } from '../stores/adminStore'
import { 
  X, CheckCircle, AlertOctagon, Info, AlertTriangle, 
  ChevronRight, ArrowRight 
} from 'lucide-vue-next'

const adminStore = useAdminStore()

const getTypeStyles = (type) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-900',
        icon: 'text-emerald-500',
        border: 'border-emerald-100',
        btn: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20',
        component: CheckCircle
      }
    case 'error':
      return {
        bg: 'bg-red-50',
        text: 'text-red-900',
        icon: 'text-red-500',
        border: 'border-red-100',
        btn: 'bg-red-600 hover:bg-red-700 shadow-red-900/20',
        component: AlertOctagon
      }
    case 'warning':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        icon: 'text-amber-500',
        border: 'border-amber-100',
        btn: 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20',
        component: AlertTriangle
      }
    default:
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-900',
        icon: 'text-blue-500',
        border: 'border-blue-100',
        btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20',
        component: Info
      }
  }
}
</script>

<template>
  <Transition
    enter-active-class="transform transition duration-300 ease-out"
    enter-from-class="opacity-0 scale-95 translate-y-4"
    enter-to-class="opacity-100 scale-100 translate-y-0"
    leave-active-class="transform transition duration-200 ease-in"
    leave-from-class="opacity-100 scale-100 translate-y-0"
    leave-to-class="opacity-0 scale-95 translate-y-4"
  >
    <div 
      v-if="adminStore.notification.show" 
      class="fixed inset-0 z-[9999] flex items-center justify-center p-6 sm:p-12 pointer-events-none"
    >
      <!-- Backdrop (Blurs the dashboard behind) -->
      <div 
        class="absolute inset-0 bg-slate-950/40 backdrop-blur-md pointer-events-auto"
        @click="adminStore.closeNotification()"
      ></div>

      <!-- Modal Container -->
      <div 
        class="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden pointer-events-auto border-t-4"
        :class="[getTypeStyles(adminStore.notification.type).border]"
      >
        <!-- Modal Content -->
        <div class="p-8 sm:p-10 flex flex-col items-center text-center">
          
          <!-- Icon Circle -->
          <div 
            class="w-24 h-24 rounded-full flex items-center justify-center mb-8 relative"
            :class="[getTypeStyles(adminStore.notification.type).bg]"
          >
            <!-- Animated Ping Effect -->
            <div 
              class="absolute inset-0 rounded-full animate-ping opacity-20"
              :class="[getTypeStyles(adminStore.notification.type).bg]"
            ></div>
            <component 
              :is="getTypeStyles(adminStore.notification.type).component" 
              size="48" 
              stroke-width="1.5"
              :class="[getTypeStyles(adminStore.notification.type).icon]"
            />
          </div>

          <!-- Header -->
          <h2 class="text-2xl font-black italic uppercase tracking-tighter text-slate-900 mb-4">
            {{ adminStore.notification.title }}
          </h2>
          
          <!-- Message -->
          <div class="space-y-4 mb-10">
            <p 
              class="text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed whitespace-pre-wrap px-4"
            >
              {{ adminStore.notification.message }}
            </p>
          </div>

          <!-- Close Action -->
          <button 
            @click="adminStore.closeNotification()"
            class="group w-full max-w-xs text-white py-5 px-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl"
            :class="[getTypeStyles(adminStore.notification.type).btn]"
          >
            OKAY, I UNDERSTAND
            <ArrowRight size="18" class="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <!-- Subtle Close Corner Button -->
        <button 
          @click="adminStore.closeNotification()"
          class="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
        >
          <X size="20" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* High-Fidelity Custom Scrollbar if needed in message */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
</style>
