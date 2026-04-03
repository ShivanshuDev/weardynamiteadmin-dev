<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { Lock, Mail, Loader2, Sparkles, ShieldCheck, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('admin@weardynamite.com')
const password = ref('Admin@123')
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = async () => {
  loading.value = true
  error.value = ''
  try {
    await authStore.loginWithGoogle()
    router.push('/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
    <!-- Branded Background Elements -->
    <div class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 blur-[120px] rounded-full"></div>
    
    <div class="w-full max-w-md relative z-10">
      <!-- Logo Section -->
      <div class="text-center mb-10 transition-all duration-700 animate-in fade-in slide-in-from-top-4">
        <div class="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-2xl mb-6 group hover:scale-110 transition-transform duration-500">
           <Sparkles class="text-black scale-150 group-hover:rotate-12 transition-transform" />
        </div>
        <h1 class="text-4xl font-black italic uppercase tracking-tighter text-white">
          Wear <span class="text-blue-500 underline decoration-4 underline-offset-8">Dynamite</span>
        </h1>
        <p class="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-4">Command Center Access</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white/5 backdrop-blur-2xl border border-white/10 p-10 rounded-[4px] shadow-2xl animate-in zoom-in duration-500">
        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Email Field -->
          <div class="space-y-2">
            <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Admin Identity</label>
            <div class="relative group">
              <Mail class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size="18" />
              <input 
                v-model="email"
                type="email" 
                placeholder="admin@weardynamite.com"
                class="w-full bg-white/5 border border-white/10 rounded-[4px] py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm"
              />
            </div>
          </div>

          <!-- Password Field -->
          <div class="space-y-2">
            <div class="flex items-center justify-between px-1">
               <label class="text-[10px] font-black uppercase text-slate-500 tracking-widest">Access Key</label>
               <a href="#" class="text-[9px] font-black uppercase text-blue-500 hover:text-blue-400 transition-colors">Forgot Key?</a>
            </div>
            <div class="relative group">
              <Lock class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size="18" />
              <input 
                v-model="password"
                :type="showPassword ? 'text' : 'password'" 
                placeholder="••••••••"
                class="w-full bg-white/5 border border-white/10 rounded-[4px] py-4 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm"
              />
              <button 
                type="button" 
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white focus:text-white transition-colors"
              >
                <Eye v-if="!showPassword" size="18" />
                <EyeOff v-else size="18" />
              </button>
            </div>
          </div>

          <!-- Error Message -->
          <div v-if="error" class="bg-red-500/10 border border-red-500/20 p-4 rounded-[4px] flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
             <div class="text-red-500 mt-0.5"><Lock size="14"/></div>
             <p class="text-red-400 text-[10px] font-bold leading-relaxed uppercase tracking-wider">{{ error }}</p>
          </div>

          <!-- Submit Button -->
          <button 
            type="submit"
            :disabled="loading"
            class="w-full bg-white text-black py-4 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden flex items-center justify-center gap-2"
          >
            <span v-if="loading" class="animate-spin"><Loader2 size="18" /></span>
            <span v-else class="flex items-center gap-2">Initiate Authorization <ShieldCheck size="18" class="group-hover:translate-x-1 transition-transform" /></span>
          </button>
        </form>

        <!-- Divider -->
        <div class="relative my-8">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/10"></div></div>
          <div class="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span class="bg-slate-900/50 backdrop-blur-xl px-4 text-slate-500">Secure SSO</span>
          </div>
        </div>

        <!-- Google Login -->
        <button 
          @click="handleGoogleLogin"
          :disabled="loading"
          class="w-full bg-white/5 border border-white/10 text-white py-4 rounded-[4px] font-black text-xs uppercase tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <!-- Footer -->
        <div class="mt-8 pt-8 border-t border-white/5 text-center">
           <p class="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-relaxed">
             Authorized Access Only. All interactions are being monitored for organizational security.
           </p>
        </div>
      </div>

      <!-- Support Link -->
      <div class="text-center mt-10">
         <p class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
           Technical Troubles? <a href="#" class="text-white hover:text-blue-500 underline transition-colors decoration-2 underline-offset-4">Vault Support</a>
         </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation-fill-mode: forwards;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-from-top { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.fade-in { animation: fade-in 0.6s ease-out; }
.slide-in-from-top-4 { animation: slide-in-from-top 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
.zoom-in { animation: zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
