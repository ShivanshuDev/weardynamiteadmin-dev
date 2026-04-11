<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
import AdminSidebar from './components/AdminSidebar.vue'
import ImagePreviewModal from './components/ImagePreviewModal.vue'
import GlobalLoader from './components/GlobalLoader.vue'
import NotificationModal from './components/NotificationModal.vue'
import { useAuthStore } from './stores/authStore'
import { Menu } from 'lucide-vue-next'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)

// Global handling to prevent arrow keys from changing numeric input values
const handleGlobalKeydown = (e) => {
  if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.target.type === 'number') {
    e.preventDefault()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-950">
    <!-- Sidebar -->
    <AdminSidebar v-if="isAuthenticated && authStore.sidebarVisible" />
    
    <!-- Main Content Area -->
    <main 
      :class="[
        'h-screen overflow-y-auto relative transition-all duration-300', 
        isAuthenticated && authStore.sidebarVisible ? 'flex-1 bg-slate-50' : 'w-full bg-slate-50'
      ]"
    >
      <!-- Sidebar Toggle (When Hidden) -->
      <button 
        v-if="isAuthenticated && !authStore.sidebarVisible"
        @click="authStore.toggleSidebar"
        class="fixed top-6 left-6 z-[60] bg-white p-2 rounded-xl border border-slate-200 shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600 group"
      >
        <Menu size="20" class="group-hover:scale-110 transition-transform" />
      </button>

      <div :class="[isAuthenticated ? 'p-4 max-w-[1920px] mx-auto' : 'h-full']">
        <router-view v-slot="{ Component }">
          <transition 
            name="fade-slide" 
            mode="out-in"
          >
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <!-- Global Image Preview Lightbox -->
    <ImagePreviewModal />
    
    <!-- Global API Loader -->
    <GlobalLoader />

    <!-- Global Notification Modal -->
    <NotificationModal />
  </div>
</template>

<style>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
