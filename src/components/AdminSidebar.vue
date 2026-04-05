<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Image as ImageIcon, 
  Boxes, 
  BookOpen,
  LogOut,
  BarChart3,
  Settings,
  Mail,
  UserPlus,
  ShieldAlert,
  Wallet,
  Building2,
  Receipt,
  PanelLeftClose
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Products', path: '/products', icon: Package },
  { name: 'Orders', path: '/orders', icon: ShoppingCart },
  { name: 'Inventory', path: '/inventory', icon: Boxes },
  { 
    name: 'Financials', 
    isGroup: true,
    children: [
      { name: 'General Ledger', path: '/ledger', icon: Wallet },
      { name: 'Vendors', path: '/vendors', icon: Building2 },
      { name: 'Expenses', path: '/expenses', icon: Receipt },
    ]
  },
  { name: 'Workforce', path: '/employees', icon: Users },
  { name: 'Blog Engine', path: '/blog', icon: BookOpen },
  { name: 'Store CMS', path: '/content', icon: ImageIcon },
  { name: 'Inquiries', path: '/inquiries', icon: Mail },
  { name: 'Subscribers', path: '/subscribers', icon: UserPlus },
  { name: 'Policy Suite', path: '/policies', icon: ShieldAlert },
]

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="w-64 h-screen bg-[#0f172a] text-slate-300 flex flex-col flex-shrink-0 z-50">
    <!-- Header -->
    <div class="p-6 border-b border-slate-800 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold ring-4 ring-blue-900/40">
          W
        </div>
        <div class="flex flex-col">
          <span class="text-white font-black tracking-tight leading-4 italic">DYNAMITE<span class="text-blue-500">PRO</span></span>
          <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise CMS</span>
        </div>
      </div>
      
      <!-- Collapse Button -->
      <button 
        @click="authStore.toggleSidebar"
        class="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition-all group"
      >
        <PanelLeftClose size="18" class="group-hover:-translate-x-0.5 transition-transform" />
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-6 px-4 space-y-1">
      <template v-for="item in menuItems" :key="item.path || item.name">
        <!-- Group Header -->
        <div v-if="item.isGroup" class="pt-4 pb-2">
          <p class="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] px-4">{{ item.name }}</p>
          <div class="mt-2 space-y-1">
            <router-link 
              v-for="child in item.children" 
              :key="child.path"
              :to="child.path"
              class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group relative overflow-hidden"
              :class="route.path === child.path ? 'bg-blue-600/10 text-blue-400' : 'hover:bg-slate-800 hover:text-white'"
            >
              <component :is="child.icon" size="16" :class="route.path === child.path ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'" />
              <span class="text-[13px] font-bold tracking-wide">{{ child.name }}</span>
            </router-link>
          </div>
        </div>
        
        <!-- Standard Link -->
        <router-link 
          v-else
          :to="item.path"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative overflow-hidden"
          :class="route.path === item.path ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'"
        >
          <component :is="item.icon" size="20" :class="route.path === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'" />
          <span class="text-sm font-bold tracking-wide">{{ item.name }}</span>
          <div v-if="route.path === item.path" class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full"></div>
        </router-link>
      </template>
    </nav>

    <!-- Footer -->
    <div class="p-6 border-t border-slate-800 space-y-4">
      <router-link 
        to="/profile"
        class="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 transition-all hover:bg-slate-800 group/profile"
        :class="route.path === '/profile' ? 'border-blue-500/50 bg-blue-600/5 shadow-xl shadow-blue-500/5' : ''"
      >
         <div class="flex items-center gap-3">
           <img :src="`https://ui-avatars.com/api/?name=${authStore.user?.name || 'Admin'}&background=3b82f6&color=fff`" class="w-10 h-10 rounded-xl group-hover/profile:scale-105 transition-transform" />
           <div class="overflow-hidden">
             <p class="text-xs font-black text-white truncate group-hover/profile:text-blue-400 transition-colors">{{ authStore.user?.name || 'Shivanshu Admin' }}</p>
             <p class="text-[10px] font-bold text-slate-500 tracking-tight truncate">{{ authStore.user?.email || 'Enterprise Access' }}</p>
           </div>
         </div>
      </router-link>
      <button 
        @click="handleLogout"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold text-sm group"
      >
        <LogOut size="20" class="group-hover:translate-x-1 transition-transform" />
        <span>End Session</span>
      </button>
    </div>
  </aside>
</template>
