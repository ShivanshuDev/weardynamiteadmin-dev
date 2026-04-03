<script setup>
import { ref } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { Save, CheckCircle, Shield, Truck, HelpCircle, Lock, Plus, Trash2 } from 'lucide-vue-next'

const adminStore = useAdminStore()
const activeTab = ref('shipping')
const saved = ref(false)

const handleSave = () => {
  saved.value = true
  setTimeout(() => saved.value = false, 3000)
}

const tabs = [
  { id: 'shipping', name: 'Shipping & Returns', icon: Truck },
  { id: 'faq', name: 'FAQ', icon: HelpCircle },
  { id: 'privacy', name: 'Privacy Policy', icon: Lock }
]

const addFaq = () => {
  adminStore.siteContent.policies.faq.items.push({
    id: Date.now(),
    q: '',
    a: ''
  })
}

const removeFaq = (idx) => {
  adminStore.siteContent.policies.faq.items.splice(idx, 1)
}
</script>

<template>
  <div class="space-y-10 min-h-screen relative">
    <!-- UI Status Overlay -->
    <div v-if="adminStore.loading && !adminStore.siteContent.policies?.shippingAndReturns?.pageTitle" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 anima-pulse">Retrieving Legal Framework...</p>
    </div>

    <div v-if="adminStore.error" class="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between">
      <div class="flex items-center gap-4">
         <div class="bg-red-500 text-white p-2 rounded-xl"><Shield size="20" class="animate-pulse"/></div>
         <p class="text-xs font-bold text-red-600 uppercase tracking-widest">{{ adminStore.error }}</p>
      </div>
      <button @click="adminStore.fetchCms" class="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">Retry Sync</button>
    </div>
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Policy Suite</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Manage Store Policies & Legal Documents</p>
      </div>
      <button 
        @click="handleSave"
        class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all shadow-lg"
      >
        <Save v-if="!saved" size="18" />
        <CheckCircle v-else size="18" />
        {{ saved ? 'Policies Published' : 'Publish Site Policies' }}
      </button>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center gap-2 bg-slate-100 p-2 rounded-[30px] w-max">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all"
        :class="activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      >
        <component :is="tab.icon" size="14" />
        {{ tab.name }}
      </button>
    </div>

    <!-- TAB CONTENT: SHIPPING & RETURNS -->
    <div v-if="activeTab === 'shipping'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-10">
          <div class="border-b border-slate-50 pb-8 space-y-4">
             <div class="flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Truck size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Logistics & Returns Display</h3>
             </div>
             
             <div class="space-y-2 mt-4">
               <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Main Page Title</label>
               <input v-model="adminStore.siteContent.policies.shippingAndReturns.pageTitle" class="w-full text-3xl font-black italic uppercase tracking-tighter outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors pb-2" />
             </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
             <div class="space-y-6">
                <h4 class="text-sm font-black uppercase tracking-widest text-emerald-600 mb-4">Section 1: Shipping Process</h4>
                <div class="space-y-4 p-8 bg-slate-50 rounded-[3px] border border-slate-100">
                  <input v-model="adminStore.siteContent.policies.shippingAndReturns.shippingProcess.title" class="w-full bg-transparent font-black text-xl text-slate-900 outline-none border-b-2 border-transparent focus:border-emerald-500 pb-2" />
                  <textarea v-model="adminStore.siteContent.policies.shippingAndReturns.shippingProcess.content" rows="6" class="w-full bg-white p-4 rounded-2xl text-sm font-medium leading-relaxed outline-none border border-slate-200 focus:border-emerald-500"></textarea>
                </div>
             </div>
             
             <div class="space-y-6">
                <h4 class="text-sm font-black uppercase tracking-widest text-amber-600 mb-4">Section 2: Return & Refund Policy</h4>
                <div class="space-y-4 p-8 bg-slate-50 rounded-[3px] border border-slate-100">
                  <input v-model="adminStore.siteContent.policies.shippingAndReturns.refundPolicy.title" class="w-full bg-transparent font-black text-xl text-slate-900 outline-none border-b-2 border-transparent focus:border-amber-500 pb-2" />
                  <textarea v-model="adminStore.siteContent.policies.shippingAndReturns.refundPolicy.content" rows="6" class="w-full bg-white p-4 rounded-2xl text-sm font-medium leading-relaxed outline-none border border-slate-200 focus:border-amber-500"></textarea>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB CONTENT: FAQ -->
    <div v-if="activeTab === 'faq'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-10">
          <div class="flex flex-wrap items-center justify-between gap-6 border-b border-slate-50 pb-8">
             <div class="space-y-4 flex-1">
               <div class="flex items-center gap-4">
                  <div class="bg-purple-50 text-purple-600 p-3 rounded-2xl"><HelpCircle size="20"/></div>
                  <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Frequently Asked Questions</h3>
               </div>
               <div>
                  <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Page Heading</label>
                  <input v-model="adminStore.siteContent.policies.faq.pageTitle" class="w-full mt-2 text-3xl font-black italic uppercase tracking-tighter outline-none border-b-2 border-transparent focus:border-purple-500 transition-colors pb-2" />
               </div>
             </div>
             <button @click="addFaq" class="bg-slate-100 hover:bg-purple-600 hover:text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2">
                <Plus size="16"/> Add New FAQ
             </button>
          </div>

          <div class="space-y-6">
             <div v-for="(item, idx) in adminStore.siteContent.policies.faq.items" :key="item.id" class="p-8 bg-slate-50 border border-slate-100 rounded-[3px] flex items-start gap-6 relative group">
                <div class="flex-1 space-y-4">
                   <div class="flex items-start gap-4">
                      <span class="text-lg font-black text-purple-500 mt-1">Q:</span>
                      <input v-model="item.q" class="w-full bg-transparent font-black text-xl text-slate-900 outline-none border-b-2 border-transparent focus:border-purple-500 pb-1" placeholder="Question?" />
                   </div>
                   <div class="flex items-start gap-4">
                      <span class="text-lg font-black text-slate-400 mt-2">A:</span>
                      <textarea v-model="item.a" rows="3" class="w-full bg-white p-4 rounded-2xl text-sm font-medium leading-relaxed outline-none border border-slate-200 focus:border-purple-500" placeholder="Answer..."></textarea>
                   </div>
                </div>
                <button @click="removeFaq(idx)" class="bg-white p-3 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm border border-red-100 absolute -right-3 -top-3 opacity-0 group-hover:opacity-100">
                   <Trash2 size="16"/>
                </button>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB CONTENT: PRIVACY POLICY -->
    <div v-if="activeTab === 'privacy'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-10">
          <div class="border-b border-slate-50 pb-8 space-y-4">
             <div class="flex items-center gap-4">
                <div class="bg-slate-900 text-white p-3 rounded-2xl shadow-lg ring-4 ring-slate-100"><Lock size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Privacy Policy Document</h3>
             </div>
             
             <div class="space-y-2 mt-4">
               <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Document Title</label>
               <input v-model="adminStore.siteContent.policies.privacy.pageTitle" class="w-full text-3xl font-black italic uppercase tracking-tighter outline-none border-b-2 border-transparent focus:border-slate-800 transition-colors pb-2" />
             </div>
          </div>

          <div class="space-y-4">
            <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Content</label>
            <textarea v-model="adminStore.siteContent.policies.privacy.content" rows="15" class="w-full bg-slate-50 p-8 rounded-[3px] border border-slate-100 text-sm font-medium leading-relaxed outline-none focus:border-slate-800 focus:bg-white transition-colors"></textarea>
          </div>
       </div>
    </div>

  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-in-from-bottom {
  from { transform: translateY(10px); }
  to { transform: translateY(0); }
}
.animate-in {
  animation: fade-in 0.5s ease-out, slide-in-from-bottom 0.5s ease-out;
}
</style>
