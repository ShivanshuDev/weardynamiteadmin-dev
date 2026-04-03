<script setup>
import { computed } from 'vue'
import AdminSidebar from './components/AdminSidebar.vue'
import ImagePreviewModal from './components/ImagePreviewModal.vue'
import GlobalLoader from './components/GlobalLoader.vue'
import { useAuthStore } from './stores/authStore'

const authStore = useAuthStore()
const isAuthenticated = computed(() => authStore.isAuthenticated)
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-950">
    <!-- Sidebar -->
    <AdminSidebar v-if="isAuthenticated" />
    
    <!-- Main Content Area -->
    <main 
      :class="[
        'h-screen overflow-y-auto relative transition-all duration-500', 
        isAuthenticated ? 'flex-1 bg-slate-50' : 'w-full bg-slate-950'
      ]"
    >
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
