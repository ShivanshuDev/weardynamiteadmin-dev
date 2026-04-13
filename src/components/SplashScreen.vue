<template>
  <Transition name="fade-screen">
    <div v-if="show" class="splash-screen">
      <!-- Floating Background Items -->
      <div class="background-floating">
        <component 
          v-for="(item, i) in floatingItems" 
          :is="item.icon" 
          :key="i"
          class="floating-icon"
          :style="{ 
            top: item.top, 
            width: item.size + 'px', 
            height: item.size + 'px',
            animationDuration: item.speed,
            animationDelay: item.delay
          }"
        />
      </div>

      <div class="splash-content">
        <div class="logo-wrapper">
          <div class="brand-box">
            <span class="brand-letter">D</span>
          </div>
          <h1 class="splash-logo italic">ADMIN PORTAL</h1>
          <div class="loading-bar-container">
            <div class="loading-bar"></div>
          </div>
          <div class="category-ticker">
            <div class="ticker-content">
              <span>INVENTORIES</span>
              <span class="dot">•</span>
              <span>ORDERS</span>
              <span class="dot">•</span>
              <span>CUSTOMERS</span>
              <span class="dot">•</span>
              <span>ANALYTICS</span>
              <span class="dot">•</span>
              <!-- Repeat for seamless loop -->
              <span>INVENTORIES</span>
              <span class="dot">•</span>
              <span>ORDERS</span>
              <span class="dot">•</span>
              <span>CUSTOMERS</span>
              <span class="dot">•</span>
              <span>ANALYTICS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { Shirt, Archive, Tag, Layout } from 'lucide-vue-next'

defineProps({
  show: {
    type: Boolean,
    default: true
  }
})

const floatingItems = [
  { icon: Shirt, size: 40, top: '15%', speed: '14s', delay: '0s' },
  { icon: Archive, size: 30, top: '45%', speed: '20s', delay: '-5s' },
  { icon: Tag, size: 25, top: '75%', speed: '18s', delay: '-2s' },
  { icon: Layout, size: 35, top: '25%', speed: '22s', delay: '-8s' },
  { icon: Shirt, size: 30, top: '60%', speed: '16s', delay: '-12s' }
]
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  background-color: #020617; /* slate-950 */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
}

.background-floating {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.floating-icon {
  position: absolute;
  left: -100px;
  color: #fff;
  opacity: 0.1;
  animation: float-right linear infinite;
}

.splash-content {
  text-align: center;
}

.logo-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.brand-box {
  width: 60px;
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transform: rotate(-5deg);
  animation: box-entrance 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.brand-letter {
  color: #000;
  font-size: 2rem;
  font-weight: 900;
  font-family: 'Times New Roman', serif;
}

.splash-logo {
  font-family: 'Times New Roman', serif;
  font-size: 1.5rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 4px;
  color: #f8fafc;
  animation: logo-entrance 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards;
  opacity: 0;
}

.loading-bar-container {
  width: 140px;
  height: 2px;
  background: rgba(255,255,255,0.05);
  border-radius: 10px;
  overflow: hidden;
}

.loading-bar {
  width: 100%;
  height: 100%;
  background: #3b82f6;
  animation: bar-pulse 1.5s infinite ease-in-out;
  transform-origin: left;
}

/* Animations */
@keyframes box-entrance {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  100% { transform: scale(1) rotate(-5deg); opacity: 1; }
}

@keyframes logo-entrance {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes bar-pulse {
  0% { transform: scaleX(0); }
  50% { transform: scaleX(1); }
  100% { transform: scaleX(0); transform-origin: right; }
}

.category-ticker {
  width: 200px;
  overflow: hidden;
  margin-top: 10px;
  mask-image: linear-gradient(to right, transparent, rgba(0,0,0,0.1) 20%, rgba(0,0,0,0.1) 80%, transparent);
}

.ticker-content {
  display: flex;
  gap: 15px;
  white-space: nowrap;
  animation: scroll-left-to-right 10s linear infinite;
}

.ticker-content span {
  font-size: 9px;
  font-weight: 800;
  color: rgba(255,255,255,0.15);
  letter-spacing: 2px;
  text-transform: uppercase;
  font-family: 'Times New Roman', serif;
}

.ticker-content .dot {
  color: rgba(255,255,255,0.05);
}

@keyframes scroll-left-to-right {
  0% { transform: translateX(-50%); }
  100% { transform: translateX(0); }
}

/* Transition */
.fade-screen-leave-active {
  transition: all 0.6s cubic-bezier(0.65, 0, 0.35, 1);
}

.fade-screen-leave-to {
  opacity: 0;
  transform: scale(1.05);
}
</style>
