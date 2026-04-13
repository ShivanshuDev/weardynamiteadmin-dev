<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Key, 
  Clock, 
  Activity, 
  Settings, 
  CheckCircle2,
  Calendar,
  Zap,
  Lock,
  History,
  TrendingUp,
  Globe,
  Monitor,
  Eye,
  EyeOff
} from 'lucide-vue-next'
import { reactive, ref } from 'vue'

const authStore = useAuthStore()
const user = computed(() => authStore.user || {
  name: 'Master Admin',
  email: 'admin@weardynamite.com',
  role: 'admin',
  id: 'ADM-2024-001'
})

const performanceMetrics = [
  { name: 'System Pulse', value: '98.5%', trend: '+0.2%', status: 'optimal', icon: Activity },
  { name: 'Audit Level', value: 'L-7', trend: 'Stable', status: 'secure', icon: ShieldCheck },
  { name: 'Action Density', value: '1.2k/hr', trend: '+12%', status: 'active', icon: Zap },
  { name: 'Compliance', value: '100%', trend: 'Verified', status: 'verified', icon: CheckCircle2 },
]

const quickActions = [
  { name: 'Rotate Master Key', icon: Key, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { name: 'Audit Logs', icon: History, color: 'text-slate-400', bg: 'bg-slate-400/10' },
  { name: 'Security Protocol', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
]

const recentActivity = [
  { action: 'Product Update', time: '2m', type: 'update', target: 'Classic Crew Black' },
  { action: 'Vendor Access', time: '1h', type: 'access', target: 'Fabric Partners S' },
  { action: 'System Sync', time: '3h', type: 'sync', target: 'Cloud Manifest v2' },
  { action: 'Price Override', time: '5h', type: 'override', target: 'Summer Shorts' },
]

const showPass = reactive({
  current: false,
  new: false,
  confirm: false
})

const passwordForm = reactive({
  current: '',
  new: '',
  confirm: ''
})

const isChangingPassword = ref(false)

const handlePasswordChange = async () => {
  if (passwordForm.new !== passwordForm.confirm) {
    return authStore.showNotification('Error', 'Confirm password does not match.', 'error')
  }
  // Logic for actual password change would go here
  isChangingPassword.value = true
  setTimeout(() => {
    isChangingPassword.value = false
    authStore.showNotification('Security Update', 'Access Key rotation successful.', 'success')
    passwordForm.current = ''
    passwordForm.new = ''
    passwordForm.confirm = ''
  }, 1500)
}
</script>

<template>
  <div class="p-4 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
    
    <!-- Ultra-Compact Intelligent Header -->
    <div class="bg-[#0f172a] rounded-3xl p-6 shadow-2xl relative overflow-hidden flex items-center justify-between group">
      <div class="absolute -right-10 -top-10 w-48 h-48 bg-blue-600/20 rounded-full blur-[80px] group-hover:bg-blue-600/30 transition-all"></div>
      
      <div class="flex items-center gap-6 relative z-10">
        <div class="relative">
           <img 
             :src="`https://ui-avatars.com/api/?name=${user.name}&background=3b82f6&color=fff&size=80&bold=true`" 
             class="w-20 h-20 rounded-2xl border-4 border-slate-800 shadow-xl" 
           />
           <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-slate-900 flex items-center justify-center">
              <CheckCircle2 size="12" class="text-white" />
           </div>
        </div>
        <div>
           <div class="flex items-center gap-3">
              <h1 class="text-2xl font-black italic uppercase tracking-tighter text-white leading-none">{{ user.name }}</h1>
              <span class="px-2 py-0.5 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest rounded-md">SUPERIOR TIER</span>
           </div>
           <p class="text-slate-400 text-[10px] font-bold mt-1 uppercase tracking-widest font-mono">Institutional ID: <span class="text-blue-400">{{ user.id || 'DC-2024-X' }}</span></p>
        </div>
      </div>

      <div class="flex items-center gap-4 relative z-10">
         <div class="text-right pr-4 border-r border-slate-800">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Global Integrity</p>
            <p class="text-lg font-black text-emerald-500 mt-1 italic leading-none">99.9%</p>
         </div>
         <button class="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl border border-white/5 transition-all">
            <Settings size="20" />
         </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <!-- Primary Intelligence Feed (Col 1-8) -->
      <div class="lg:col-span-8 space-y-6">
         <!-- High-Density Metric Matrix -->
         <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="m in performanceMetrics" :key="m.name" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-inner-sm hover:border-blue-200 transition-all group">
               <div class="flex items-center justify-between mb-3">
                  <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                     <component :is="m.icon" size="16" />
                  </div>
                  <span class="text-[9px] font-black text-emerald-500 italic">{{ m.trend }}</span>
               </div>
               <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{{ m.name }}</p>
               <h3 class="text-xl font-black text-slate-900 leading-tight italic tracking-tighter">{{ m.value }}</h3>
            </div>
         </div>

         <!-- Compact Institutional Metadata Manifold -->
         <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
               <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Metadata Manifold</h3>
               <TrendingUp size="14" class="text-slate-300" />
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
               <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                     <User size="18" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Core Identity</p>
                     <p class="text-xs font-black text-slate-900 uppercase italic">{{ user.name }}</p>
                  </div>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                     <Mail size="18" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Admin Access</p>
                     <p class="text-xs font-black text-slate-900 truncate max-w-[150px]">{{ user.email }}</p>
                  </div>
               </div>
               <div class="flex items-center gap-3">
                  <div class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                     <ShieldCheck size="18" />
                  </div>
                  <div>
                     <p class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Registry Date</p>
                     <p class="text-xs font-black text-slate-900 uppercase italic">Oct 2024</p>
                  </div>
               </div>
            </div>
         </div>

          <!-- Security & Access Control SECTION -->
          <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
            <div class="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
               <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Security & Access Control</h3>
               <Lock size="14" class="text-slate-300" />
            </div>
            <div class="p-8">
               <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="space-y-6">
                     <div class="space-y-2">
                        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Current Access Key</label>
                        <div class="relative group">
                           <input 
                              :type="showPass.current ? 'text' : 'password'" 
                              v-model="passwordForm.current"
                              class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm" 
                              placeholder="••••••••" 
                           />
                           <button type="button" @click="showPass.current = !showPass.current" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                              <component :is="showPass.current ? EyeOff : Eye" size="18" />
                           </button>
                        </div>
                     </div>
                     <div class="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <p class="text-[10px] font-bold text-blue-600 leading-relaxed uppercase italic tracking-tight">
                           Rotating your access key frequently is mandated by organizational security protocol level 7.
                        </p>
                     </div>
                  </div>
                  <div class="space-y-6">
                     <div class="space-y-2">
                        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">New Access Key</label>
                        <div class="relative group">
                           <input 
                              :type="showPass.new ? 'text' : 'password'" 
                              v-model="passwordForm.new"
                              class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm" 
                              placeholder="••••••••" 
                           />
                           <button type="button" @click="showPass.new = !showPass.new" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                              <component :is="showPass.new ? EyeOff : Eye" size="18" />
                           </button>
                        </div>
                     </div>
                     <div class="space-y-2">
                        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirm New Key</label>
                        <div class="relative group">
                           <input 
                              :type="showPass.confirm ? 'text' : 'password'" 
                              v-model="passwordForm.confirm"
                              class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner-sm" 
                              placeholder="••••••••" 
                           />
                           <button type="button" @click="showPass.confirm = !showPass.confirm" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
                              <component :is="showPass.confirm ? EyeOff : Eye" size="18" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
               <div class="mt-8 flex justify-end pt-6 border-t border-slate-50">
                  <button 
                     @click="handlePasswordChange"
                     :disabled="isChangingPassword"
                     class="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                  >
                     {{ isChangingPassword ? 'ENCRYPTING...' : 'UPGRADE ACCESS KEY' }}
                  </button>
               </div>
            </div>
          </div>

         <!-- Quick Command Grid -->
         <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button v-for="action in quickActions" :key="action.name" class="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-slate-100 hover:border-blue-400 hover:bg-blue-50/10 transition-all group">
               <div :class="[action.bg, action.color, 'w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform']">
                  <component :is="action.icon" size="20" />
               </div>
               <span class="text-[10px] font-black text-slate-600 group-hover:text-blue-600 uppercase tracking-widest">{{ action.name }}</span>
            </button>
         </div>
      </div>

      <!-- Live Pulse Column (Col 9-12) -->
      <div class="lg:col-span-4 space-y-6">
         <!-- System Health Command Card -->
         <div class="bg-indigo-600 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 opacity-10">
               <Globe size="80" class="group-hover:rotate-45 transition-transform duration-1000" />
            </div>
            <div class="flex items-center gap-3 mb-6 relative">
               <Monitor size="20" class="text-indigo-200" />
               <h3 class="text-sm font-black italic uppercase italic tracking-tighter">Security Pulse</h3>
            </div>
            <div class="space-y-4 relative">
               <div class="flex items-center justify-between text-[10px] uppercase font-black tracking-widest">
                  <span class="text-indigo-200">2FA Encryption</span>
                  <span class="text-emerald-400">ENCRYPTED</span>
               </div>
               <div class="h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 w-[85%]"></div>
               </div>
               <div class="flex items-center justify-between text-[10px] uppercase font-black tracking-widest">
                  <span class="text-indigo-200">Database Integrity</span>
                  <span class="text-emerald-400">100% SECURE</span>
               </div>
               <div class="h-1.5 bg-indigo-900/50 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-500 w-full"></div>
               </div>
            </div>
         </div>

         <!-- Ultra-Compact Audit Feed -->
         <div class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-6">
               <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Audit Pulse</h3>
               <button class="text-[8px] font-black text-blue-600 underline">EXPORT</button>
            </div>
            <div class="space-y-4">
               <div v-for="act in recentActivity" :key="act.action" class="flex items-center justify-between group border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                  <div class="flex items-center gap-3 overflow-hidden">
                     <div class="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></div>
                     <div class="overflow-hidden">
                        <p class="text-[11px] font-black text-slate-900 truncate">{{ act.action }}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ act.target }}</p>
                     </div>
                  </div>
                  <span class="text-[10px] font-black text-slate-300 italic">{{ act.time }}</span>
               </div>
            </div>
            <button class="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all">
               Deep Systems Audit
            </button>
         </div>
      </div>

    </div>
  </div>
</template>
