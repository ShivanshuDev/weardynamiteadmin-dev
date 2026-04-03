<script setup>
import { ref } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Home, 
  Settings, 
  RotateCcw, 
  Phone, 
  Mail, 
  MapPin, 
  Save, 
  CheckCircle, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Layout,
  Layers,
  Zap,
  ShieldCheck
} from 'lucide-vue-next'

const adminStore = useAdminStore()
const activeTab = ref('home')
const saved = ref(false)

const handleSave = () => {
  saved.value = true
  setTimeout(() => saved.value = false, 3000)
}

const tabs = [
  { id: 'home', name: 'Hero & Promos', icon: Home },
  { id: 'collections', name: 'Collections', icon: Layers },
  { id: 'branding', name: 'Brand & Hooks', icon: Layout },
  { id: 'standard', name: 'The Standard', icon: ShieldCheck },
  { id: 'process', name: 'Our Process', icon: Zap },
  { id: 'contact', name: 'Contact Info', icon: Phone },
]
</script>

<template>
  <div class="space-y-10 min-h-screen relative">
    <!-- UI Status Overlay -->
    <div v-if="adminStore.loading && !adminStore.siteContent.home?.carousel?.length" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 anima-pulse">Synchronizing Architecture...</p>
    </div>

    <div v-if="adminStore.error" class="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between">
      <div class="flex items-center gap-4">
         <div class="bg-red-500 text-white p-2 rounded-xl"><RotateCcw size="20" class="animate-spin-slow"/></div>
         <p class="text-xs font-bold text-red-600 uppercase tracking-widest">{{ adminStore.error }}</p>
      </div>
      <button @click="adminStore.fetchCms" class="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">Retry Sync</button>
    </div>
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Architecture CMS</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Configure Global Visuals & Narratives</p>
      </div>
      <button 
        @click="handleSave"
        class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all shadow-lg"
      >
        <Save v-if="!saved" size="18" />
        <CheckCircle v-else size="18" />
        {{ saved ? 'Live Sync Successful' : 'Publish Site Updates' }}
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

    <!-- TAB CONTENT: HOME -->
    <div v-if="activeTab === 'home'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <!-- Hero Carousel -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center justify-between border-b border-slate-50 pb-6">
             <div class="flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Layout size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Hero Carousel</h3>
             </div>
             <button class="bg-slate-50 hover:bg-blue-600 hover:text-white p-2 rounded-xl transition-all"><Plus size="18"/></button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div v-for="(slide, idx) in (adminStore.siteContent?.home?.carousel || [])" :key="idx" class="p-8 bg-slate-50/50 rounded-[3px] border border-slate-50 space-y-6 group">
                <div class="aspect-video rounded-xl overflow-hidden relative border border-white">
                   <img :src="slide.image" class="w-full h-full object-cover" />
                   <div class="absolute inset-x-4 bottom-4 p-3 bg-white/90 backdrop-blur-md rounded-2xl text-[9px] font-bold text-slate-600 truncate border border-slate-100 italic">
                      {{ slide.image }}
                   </div>
                </div>
                <div class="space-y-4">
                   <input v-model="slide.title" class="w-full bg-transparent font-black text-2xl italic tracking-tighter outline-none" />
                   <textarea v-model="slide.subtitle" class="w-full bg-transparent text-xs font-bold uppercase tracking-widest outline-none leading-relaxed text-slate-500"></textarea>
                </div>
             </div>
          </div>
       </div>

       <!-- Mega Promos -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><Layers size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Promotional Banners</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div v-for="(promo, idx) in (adminStore.siteContent?.home?.megaPromos || [])" :key="idx" class="flex items-center gap-6 p-6 bg-slate-50/50 rounded-[3px] border border-slate-50">
                <img :src="promo.image" class="w-24 h-24 rounded-xl object-cover shadow-xl border-2 border-white" />
                <div class="flex-1 space-y-2">
                   <input v-model="promo.title" class="w-full bg-transparent font-black text-lg text-slate-900 outline-none" />
                   <input v-model="promo.subtitle" class="w-full bg-transparent text-[10px] font-bold uppercase tracking-widest text-emerald-600 outline-none" />
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB CONTENT: COLLECTIONS -->
    <div v-if="activeTab === 'collections'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><Layers size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Gender Collections Grid</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div v-for="(cat, idx) in (adminStore.siteContent?.home?.categories || [])" :key="idx" class="p-6 bg-slate-50/50 rounded-[3px] border border-slate-50 space-y-4">
                <div class="aspect-square relative rounded-xl overflow-hidden shadow-lg border-2 border-white">
                   <img :src="cat.image" class="w-full h-full object-cover" />
                </div>
                <div class="space-y-2">
                   <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Section Name</label>
                   <input v-model="cat.name" class="w-full bg-transparent font-black text-lg text-slate-900 outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors" />
                </div>
                <div class="space-y-2">
                   <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Image Link</label>
                   <input v-model="cat.image" class="w-full bg-white p-3 rounded-xl text-[10px] font-bold outline-none border border-slate-100" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                   <input v-model="cat.buttonText" placeholder="Button Text" class="bg-white p-3 rounded-xl text-xs font-bold outline-none border border-slate-100" />
                   <input v-model="cat.link" placeholder="Destination link" class="bg-white p-3 rounded-xl text-[10px] outline-none border border-slate-100 text-blue-500" />
                </div>
             </div>
          </div>
       </div>

       <!-- Product Grids (New Arrivals & Best Sellers) -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Layout size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Dynamic Storefront Grids</h3>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
             <!-- New Arrivals -->
             <div class="p-8 bg-slate-50/50 rounded-[3px] border border-slate-50 space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4">Latest Drop (Grid 1)</h4>
                <input v-model="adminStore.siteContent.home.productSections.newArrivals.title" class="w-full bg-transparent font-black text-2xl text-slate-900 outline-none border-b border-transparent focus:border-emerald-500 transition-colors" />
                <input v-model="adminStore.siteContent.home.productSections.newArrivals.subtitle" class="w-full bg-transparent text-xs font-bold text-slate-500 outline-none border-b border-transparent focus:border-emerald-500 transition-colors" />
             </div>
             
             <!-- Best Sellers -->
             <div class="p-8 bg-slate-50/50 rounded-[3px] border border-slate-50 space-y-4">
                <h4 class="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-4">Most Popular (Grid 2)</h4>
                <input v-model="adminStore.siteContent.home.productSections.mostPopular.title" class="w-full bg-transparent font-black text-2xl text-slate-900 outline-none border-b border-transparent focus:border-amber-500 transition-colors" />
                <input v-model="adminStore.siteContent.home.productSections.mostPopular.subtitle" class="w-full bg-transparent text-xs font-bold text-slate-500 outline-none border-b border-transparent focus:border-amber-500 transition-colors" />
             </div>
          </div>
       </div>
    </div>

    <!-- TAB CONTENT: BRANDING & HOOKS -->
    <div v-if="activeTab === 'branding'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <!-- Video Block -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Layout size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Brand Video Statement</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div class="space-y-4">
                <input v-model="adminStore.siteContent.home.videoBlock.title" class="w-full text-3xl font-black italic tracking-tighter outline-none border-none p-0" />
                <textarea v-model="adminStore.siteContent.home.videoBlock.subtitle" rows="5" class="w-full text-sm font-medium leading-relaxed outline-none border-none p-0 text-slate-500"></textarea>
                <div class="space-y-2 pt-4 border-t border-slate-100">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Perks (Edit Directly)</label>
                   <div v-for="(perk, idx) in adminStore.siteContent.home.videoBlock.perks" :key="idx">
                      <input v-model="adminStore.siteContent.home.videoBlock.perks[idx]" class="w-full bg-slate-50 p-3 rounded-xl text-xs font-bold outline-none mb-2 border border-slate-100" />
                   </div>
                </div>
             </div>
             <div class="space-y-4">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Background Video URL (MP4)</label>
                <div class="aspect-video bg-black rounded-xl overflow-hidden relative shadow-xl border border-slate-200">
                   <video autoplay muted loop playsinline :src="adminStore.siteContent.home.videoBlock.videoUrl" class="w-full h-full object-cover opacity-50"></video>
                </div>
                <input v-model="adminStore.siteContent.home.videoBlock.videoUrl" class="w-full bg-white p-4 rounded-2xl text-[10px] font-bold outline-none border border-slate-100" />
             </div>
          </div>
       </div>

       <!-- VIP Banner -->
       <div class="bg-gradient-to-br from-slate-50 to-blue-50 p-10 rounded-[3px] border border-blue-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-blue-200/50 pb-6">
             <div class="bg-blue-600 text-white p-3 rounded-2xl"><ShieldCheck size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-blue-900">VIP Advertisement Banner</h3>
          </div>
          <div class="space-y-4 max-w-2xl">
             <input v-model="adminStore.siteContent.home.vipBanner.title" class="w-full text-3xl font-black tracking-tighter outline-none bg-transparent" />
             <textarea v-model="adminStore.siteContent.home.vipBanner.subtitle" rows="3" class="w-full text-lg font-medium leading-relaxed outline-none bg-transparent text-slate-700"></textarea>
             <div class="flex gap-4 pt-4">
                <input v-model="adminStore.siteContent.home.vipBanner.buttonText" placeholder="Button Text" class="bg-blue-600 text-white p-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs outline-none shadow-lg" />
                <input v-model="adminStore.siteContent.home.vipBanner.buttonLink" placeholder="Link" class="bg-white p-3 rounded-xl text-xs outline-none border border-slate-200" />
             </div>
          </div>
       </div>

       <!-- What We Do Hook -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-purple-50 text-purple-600 p-3 rounded-2xl"><Layout size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">What We Do (Hook Section)</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div class="space-y-6">
                <input v-model="adminStore.siteContent.home.whatWeDo.title" class="w-full text-4xl font-black tracking-tighter outline-none bg-transparent" />
                <textarea v-model="adminStore.siteContent.home.whatWeDo.subtitle" rows="5" class="w-full text-lg font-medium leading-relaxed outline-none bg-transparent text-slate-600"></textarea>
                <div class="flex gap-4">
                   <input v-model="adminStore.siteContent.home.whatWeDo.buttonText" placeholder="Button Text" class="bg-black text-white p-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs outline-none" />
                   <input v-model="adminStore.siteContent.home.whatWeDo.buttonLink" placeholder="Link" class="bg-slate-50 p-3 rounded-xl text-xs outline-none border border-slate-200" />
                </div>
             </div>
             <div class="space-y-4">
                <img :src="adminStore.siteContent.home.whatWeDo.image" class="w-full aspect-[4/3] object-cover rounded-xl shadow-lg border-2 border-white" />
                <input v-model="adminStore.siteContent.home.whatWeDo.image" placeholder="Image URL" class="w-full bg-slate-50 p-4 rounded-2xl text-[10px] font-bold outline-none border border-slate-100" />
             </div>
          </div>
       </div>

    </div>

    <!-- TAB CONTENT: THE STANDARD -->
    <div v-if="activeTab === 'standard'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-10">
          <div class="border-b border-slate-50 pb-8 space-y-4">
             <div class="flex items-center gap-4">
                <div class="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><ShieldCheck size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Quality Framework</h3>
             </div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input v-model="adminStore.siteContent.home.standard.title" class="text-3xl font-black italic uppercase tracking-tighter outline-none border-none p-0" />
                <input v-model="adminStore.siteContent.home.standard.subtitle" class="text-xs font-bold text-slate-400 uppercase tracking-widest outline-none border-none p-0" />
             </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div v-for="(feature, idx) in adminStore.siteContent.home.standard.features" :key="idx" class="p-8 bg-slate-50/50 rounded-[3px] border border-slate-50 flex items-start gap-8">
                <div class="w-32 h-32 flex-shrink-0 relative group">
                   <img :src="feature.image" class="w-full h-full object-cover rounded-[30px] border-2 border-white shadow-xl" />
                   <div class="absolute inset-0 bg-black/40 rounded-[30px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button class="bg-white p-2 rounded-xl text-black hover:bg-emerald-600 hover:text-white transition-all shadow-lg"><ImageIcon size="16"/></button>
                   </div>
                </div>
                <div class="space-y-3 pt-2">
                   <input v-model="feature.title" class="w-full bg-transparent font-black text-lg text-slate-900 outline-none leading-none" />
                   <textarea v-model="feature.description" rows="3" class="w-full bg-transparent text-xs font-medium text-slate-500 outline-none leading-relaxed border-none p-0 resize-none"></textarea>
                </div>
             </div>
          </div>

          <!-- Trust Features -->
          <div class="pt-8 border-t border-slate-50 space-y-6">
             <div class="flex items-center gap-4">
                <div class="bg-purple-50 text-purple-600 p-3 rounded-2xl"><ShieldCheck size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Trust Badges & Promises</h3>
             </div>
             <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div v-for="(badge, idx) in adminStore.siteContent.home.trustFeatures" :key="idx" class="p-6 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                   <input v-model="badge.title" class="w-full bg-transparent font-black text-sm text-slate-900 outline-none border-b-2 border-transparent focus:border-purple-500 pb-1" />
                   <input v-model="badge.subtitle" class="w-full bg-transparent text-[10px] font-bold text-slate-500 outline-none border-b-2 border-transparent focus:border-purple-500 pb-1" />
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB CONTENT: PROCESS -->
    <div v-if="activeTab === 'process'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <!-- Hero Config -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-6">
             <div class="bg-purple-50 text-purple-600 p-3 rounded-2xl"><ImageIcon size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Process Page Hero</h3>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
             <div class="aspect-video rounded-xl overflow-hidden shadow-2xl relative border-4 border-white">
                <img :src="adminStore.siteContent.process.hero.image" class="w-full h-full object-cover" />
                <input v-model="adminStore.siteContent.process.hero.image" class="absolute bottom-4 left-4 right-4 p-3 bg-white/95 rounded-xl text-[10px] font-bold border border-slate-100" />
             </div>
             <div class="space-y-6 pt-4">
                <div class="space-y-2">
                   <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Main Heading</label>
                   <input v-model="adminStore.siteContent.process.hero.title" class="w-full bg-slate-50 p-4 rounded-2xl font-black text-2xl italic tracking-tighter" />
                </div>
                <div class="space-y-2">
                   <label class="text-[9px] font-black uppercase tracking-widest text-slate-400">Narrative Subtitle</label>
                   <textarea v-model="adminStore.siteContent.process.hero.subtitle" rows="3" class="w-full bg-slate-50 p-4 rounded-2xl text-xs font-medium leading-relaxed"></textarea>
                </div>
             </div>
          </div>
       </div>

       <!-- Steps Config -->
       <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-50 pb-6 mb-8">
             <div class="flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Zap size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Manufacturing Steps</h3>
             </div>
             <button class="bg-slate-50 p-2 rounded-xl"><Plus size="18"/></button>
          </div>
          <div class="space-y-6">
             <div v-for="(step, idx) in adminStore.siteContent.process.steps" :key="idx" class="p-8 bg-slate-50/50 rounded-[3px] border border-slate-50 space-y-6">
                <div class="flex items-center justify-between">
                   <input v-model="step.title" class="font-black text-lg outline-none bg-transparent" />
                   <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Step {{ idx + 1 }}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">What we have</label>
                      <textarea v-model="step.have" rows="3" class="w-full bg-white p-4 rounded-2xl text-xs font-medium leading-relaxed border border-slate-100"></textarea>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">What we do</label>
                      <textarea v-model="step.do" rows="3" class="w-full bg-white p-4 rounded-2xl text-xs font-medium leading-relaxed border border-slate-100"></textarea>
                   </div>
                </div>
             </div>
          </div>
       </div>

       <!-- CTA Config -->
       <div class="bg-slate-50 p-10 rounded-[3px] border border-slate-200 shadow-inner space-y-6">
          <div class="flex items-center gap-4 border-b border-slate-200 pb-6">
             <div class="bg-slate-900 text-white p-3 rounded-2xl"><Zap size="20"/></div>
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Experience The Difference (CTA)</h3>
          </div>
          <div class="space-y-4">
             <input v-model="adminStore.siteContent.process.cta.title" class="w-full bg-transparent font-black text-3xl text-slate-900 outline-none border-b-2 border-transparent focus:border-slate-800 pb-1" />
             <input v-model="adminStore.siteContent.process.cta.subtitle" class="w-full bg-transparent text-sm font-bold text-slate-500 outline-none border-b-2 border-transparent focus:border-slate-800 pb-1" />
             <div class="flex gap-4 pt-4">
                <input v-model="adminStore.siteContent.process.cta.buttonText" placeholder="Button Text" class="bg-black text-white p-3 px-6 rounded-xl font-bold uppercase tracking-widest text-xs outline-none shadow-lg" />
                <input v-model="adminStore.siteContent.process.cta.buttonLink" placeholder="Link" class="bg-white p-3 rounded-xl text-xs outline-none border border-slate-200" />
             </div>
          </div>
       </div>

    </div>

    <!-- TAB CONTENT: CONTACT -->
    <div v-if="activeTab === 'contact'" class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          <div class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-sm space-y-10">
             <div class="flex items-center gap-4 border-b border-slate-50 pb-8">
                <div class="bg-slate-900 text-white p-3 rounded-2xl shadow-lg ring-4 ring-slate-100"><Phone size="20"/></div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Support Terminal</h3>
             </div>
             
             <div class="space-y-8">
                <div class="space-y-4">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Hotline 1</label>
                   <div class="flex items-center gap-4">
                      <div class="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><Phone size="20"/></div>
                      <input v-model="adminStore.siteContent.contact.direct.phone[0]" class="flex-1 text-2xl font-black italic tracking-tighter outline-none border-b-2 border-slate-50 focus:border-blue-500 transition-colors pb-1" />
                   </div>
                </div>
                <div class="space-y-4">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Direct Hotline 2</label>
                   <div class="flex items-center gap-4">
                      <div class="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><Phone size="20"/></div>
                      <input v-model="adminStore.siteContent.contact.direct.phone[1]" class="flex-1 text-2xl font-black italic tracking-tighter outline-none border-b-2 border-slate-50 focus:border-blue-500 transition-colors pb-1" />
                   </div>
                </div>
                <div class="space-y-4">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Corporate Email</label>
                   <div class="flex items-center gap-4">
                      <div class="bg-blue-600 p-4 rounded-2xl text-white shadow-lg"><Mail size="20"/></div>
                      <input v-model="adminStore.siteContent.contact.direct.email" class="flex-1 text-lg font-black tracking-tight outline-none border-b-2 border-slate-50 focus:border-blue-500 transition-colors pb-1" />
                   </div>
                </div>
             </div>
          </div>

          <div class="flex flex-col gap-10">
            <!-- Newsletter Settings -->
            <div class="bg-slate-50 p-10 rounded-[3px] border border-slate-200 shadow-inner space-y-6">
               <div class="flex items-center gap-4 border-b border-slate-200 pb-6">
                  <div class="bg-amber-100 text-amber-700 p-3 rounded-2xl shadow-sm"><Mail size="20"/></div>
                  <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Newsletter Subscription Banner</h3>
               </div>
               <div class="space-y-4">
                  <input v-model="adminStore.siteContent.home.newsletter.title" class="w-full bg-transparent text-2xl font-black italic tracking-tighter outline-none border-b-2 border-transparent focus:border-amber-500 pb-1" />
                  <textarea v-model="adminStore.siteContent.home.newsletter.subtitle" rows="3" class="w-full bg-white p-4 rounded-2xl text-xs font-medium leading-relaxed outline-none border border-slate-200 focus:border-amber-500"></textarea>
               </div>
            </div>

            <div class="bg-[#0f172a] p-10 rounded-[3px] text-white space-y-8 shadow-2xl relative overflow-hidden group">
               <div class="absolute -right-20 -top-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-all duration-1000"></div>
               
               <div class="relative flex items-center justify-between">
                  <div class="flex items-center gap-4">
                     <div class="bg-blue-600 p-3 rounded-2xl shadow-xl shadow-blue-500/20"><MapPin size="20"/></div>
                     <h3 class="text-sm font-black uppercase tracking-widest italic">Global Logistics HQ</h3>
                  </div>
               </div>
               
               <div class="relative aspect-square bg-slate-800 rounded-[3px] overflow-hidden border border-slate-700 shadow-2xl group-hover:scale-[1.02] transition-transform duration-500">
                  <div class="absolute inset-x-8 bottom-8 p-6 bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 z-10 space-y-4 shadow-2xl">
                     <label class="text-[10px] font-black uppercase text-blue-400 tracking-widest">Map Coordinates URL</label>
                     <textarea v-model="adminStore.siteContent.contact.mapUrl" rows="4" class="w-full bg-slate-800 p-4 rounded-xl text-[10px] font-medium leading-relaxed border border-slate-700 outline-none text-slate-400"></textarea>
                  </div>
                  <iframe 
                     v-if="adminStore.siteContent.contact.mapUrl" 
                     :src="adminStore.siteContent.contact.mapUrl" 
                     class="w-full h-full border-0 absolute inset-0 opacity-50 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
                     allowfullscreen="" 
                     loading="lazy" 
                     referrerpolicy="no-referrer-when-downgrade">
                  </iframe>
                  <div v-else class="w-full h-full flex items-center justify-center text-slate-600 font-black uppercase tracking-widest italic opacity-20">Provide URL to view map</div>
               </div>
            </div>
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
