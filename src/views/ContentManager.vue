<script setup>
import { ref, onMounted } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Home, Settings, RotateCcw, Phone, Mail, MapPin, 
  Save, CheckCircle, Plus, Trash2, Image as ImageIcon,
  Layout, Layers, Zap, ShieldCheck, ChevronUp, ChevronDown,
  ExternalLink, UploadCloud, Link, Eye, X, Bold, Italic,
  HelpCircle, Shield, Globe, PhoneCall
} from 'lucide-vue-next'

const adminStore = useAdminStore()
const activeTab = ref('home')
const saved = ref(false)

// Preview State
const previewSlide = ref(null)
const showPreview = ref(false)

// Process Management
const addProcessStep = () => {
   if (!adminStore.siteContent.process) adminStore.siteContent.process = { hero: {}, steps: [] }
   if (!adminStore.siteContent.process.steps) adminStore.siteContent.process.steps = []
   
   adminStore.siteContent.process.steps.push({
      title: { text: 'New Milestone', size: 32, color: '#111111', bold: true, italic: false },
      have: { text: 'Premium starting materials...', size: 14, color: '#555555', bold: false, italic: false },
      do: { text: 'The expert execution phase...', size: 14, color: '#555555', bold: false, italic: false }
   })
}

const removeProcessStep = (idx) => {
   adminStore.siteContent.process.steps.splice(idx, 1)
}

// Global Info Management
const addPhone = () => {
   if (!adminStore.siteContent.contact.direct.phone) adminStore.siteContent.contact.direct.phone = []
   adminStore.siteContent.contact.direct.phone.push('')
}
const removePhone = (idx) => {
   adminStore.siteContent.contact.direct.phone.splice(idx, 1)
}

const addFaq = () => {
   if (!adminStore.siteContent.policies.faq.items) adminStore.siteContent.policies.faq.items = []
   adminStore.siteContent.policies.faq.items.push({ q: 'New Question?', a: '' })
}
const removeFaq = (idx) => {
   adminStore.siteContent.policies.faq.items.splice(idx, 1)
}

// ─── Initializer ─────────────────────────────────────────────────────────────
const slideImageInput = ref(null)
const brandVideoInput = ref(null)
const activeUploadIdx = ref(null)
const activeUploadType = ref(null) // 'carousel' or 'category' or 'video'

const triggerSlideUpload = (id) => {
   activeUploadType.value = id
   if (id === 'video') {
      brandVideoInput.value?.click()
   } else {
      slideImageInput.value?.click()
   }
}

const handleFileUpload = async (event) => {
   const file = event.target.files[0]
   if (!file) return

   try {
      adminStore.loading = true
      const id = activeUploadType.value
      
      const isVideo = id === 'video'
      const isPromo = typeof id === 'string' && id.startsWith('promo_')
      const isCategory = typeof id === 'string' && id.startsWith('category_')
      const isProcessHero = id === 'process_hero'
      
      let folder = isVideo ? 'cms/branding' : (isCategory ? 'cms/categories' : (isPromo ? 'cms/promos' : (isProcessHero ? 'cms/process' : 'cms/carousel')))
      
      const fileName = file.name.replace(/\s/g, '_')
      const { uploadUrl, fileKey } = await adminStore.getPresignedUrl(fileName, file.type, folder)
      
      await adminStore.uploadToS3(uploadUrl, file)

      if (isVideo) {
         adminStore.siteContent.home.videoBlock.videoUrl = fileKey
      } else if (isProcessHero) {
         if (!adminStore.siteContent.process) adminStore.siteContent.process = { hero: {}, steps: [] }
         if (!adminStore.siteContent.process.hero) adminStore.siteContent.process.hero = {}
         adminStore.siteContent.process.hero.image = fileKey
      } else if (isPromo) {
         const idx = parseInt(id.split('_')[1])
         adminStore.siteContent.home.megaPromos[idx].image = fileKey
      } else if (isCategory) {
         const idx = parseInt(id.split('_')[1])
         adminStore.siteContent.home.categories[idx].image = fileKey
      } else {
         // Carousel slide (index is directly passed as id for hero)
         adminStore.siteContent.home.carousel[id].image = fileKey
      }

      adminStore.showNotification('Upload Success', 'Media asset synchronized with S3.', 'success')
   } catch (err) {
      console.error('Upload failed:', err)
      adminStore.showNotification('Upload Failed', 'Critical failure during S3 transmission.', 'error')
   } finally {
      adminStore.loading = false
      activeUploadType.value = null
      event.target.value = ''
   }
}

// Slide Management
const addSlide = () => {
  if (!adminStore.siteContent.home) {
    adminStore.siteContent.home = { carousel: [] }
  } else if (!adminStore.siteContent.home.carousel) {
    adminStore.siteContent.home.carousel = []
  }
  
  // ADD TO TOP
  adminStore.siteContent.home.carousel.unshift({
    image: '',
    title: 'New Dynamic Slide',
    subtitle: 'Describe the new collection here...',
    align: 'middle-left',
    buttons: [
       { text: 'Explore Now', link: '/shop', bg: '#000000', textColor: '#ffffff', border: false }
    ]
  })
}

const alignmentOptions = [
  { id: 'top-left', name: 'Top Left' },
  { id: 'top-center', name: 'Top Center' },
  { id: 'top-right', name: 'Top Right' },
  { id: 'middle-left', name: 'Middle Left' },
  { id: 'middle-center', name: 'Middle Center' },
  { id: 'middle-right', name: 'Middle Right' },
  { id: 'bottom-left', name: 'Bottom Left' },
  { id: 'bottom-center', name: 'Bottom Center' },
  { id: 'bottom-right', name: 'Bottom Right' }
]

const getAlignmentClasses = (align) => {
  const map = {
    'top-left': 'items-start justify-start text-left',
    'top-center': 'items-start justify-center text-center',
    'top-right': 'items-start justify-end text-right',
    'middle-left': 'items-center justify-start text-left',
    'middle-center': 'items-center justify-center text-center',
    'middle-right': 'items-center justify-end text-right',
    'bottom-left': 'items-end justify-start text-left',
    'bottom-center': 'items-end justify-center text-center',
    'bottom-right': 'items-end justify-end text-right'
  }
  return map[align] || map['middle-left']
}

const removeSlide = (index) => {
  adminStore.siteContent.home.carousel.splice(index, 1)
}

const moveSlide = (index, delta) => {
  const item = adminStore.siteContent.home.carousel.splice(index, 1)[0]
  adminStore.siteContent.home.carousel.splice(index + delta, 0, item)
}

const clearSlideAsset = (index) => {
  adminStore.siteContent.home.carousel[index].image = ''
  adminStore.showNotification('Asset Cleared', 'The image reference has been removed.', 'info')
}

// Button Management
const addButton = (slideIdx) => {
   const slide = adminStore.siteContent.home.carousel[slideIdx]
   if (!slide.buttons) slide.buttons = []
   slide.buttons.push({ text: 'New Button', link: '/shop', bg: '#ffffff', textColor: '#000000', border: true })
}

const removeButton = (slideIdx, btnIdx) => {
   adminStore.siteContent.home.carousel[slideIdx].buttons.splice(btnIdx, 1)
}

const openHeroPreview = (slide) => {
   previewSlide.value = slide
   showPreview.value = true
}

// Curated Links
const pageLinks = [
  { name: 'Home', url: '/' },
  { name: 'Shop All', url: '/shop' },
  { name: "Men's Collection", url: '/shop?category=Men' },
  { name: "Women's Collection", url: '/shop?category=Women' },
  { name: "Kids' Collection", url: '/shop?category=Kids' },
  { name: 'Customizer Studio', url: '/customize' },
  { name: 'Blog / Stories', url: '/blog' },
  { name: 'About Us', url: '/about' },
  { name: 'Contact Support', url: '/contact' }
]

const handleSaveSection = async (sectionPath) => {
   try {
      const parts = sectionPath.split('.')
      let data = adminStore.siteContent
      for (const p of parts) {
         data = data[p]
      }
      await adminStore.updateCmsSection(sectionPath, data)
      adminStore.showNotification('Saved', `${sectionPath} updated successfully.`, 'success')
   } catch (err) {
      console.error('Section save failed:', err)
   }
}

const handleSaveAll = async () => {
  try {
    if (activeTab.value === 'home') {
      const carousel = adminStore.siteContent.home?.carousel || []
      const promos = adminStore.siteContent.home?.megaPromos || []
      await adminStore.updateCmsSection('home.carousel', carousel)
      await adminStore.updateCmsSection('home.megaPromos', promos)
    } else if (activeTab.value === 'collections') {
      const categories = adminStore.siteContent.home?.categories || []
      const sections = adminStore.siteContent.home?.productSections || {}
      await adminStore.updateCmsSection('home.categories', categories)
      await adminStore.updateCmsSection('home.productSections', sections)
    } else {
        const path = activeTab.value === 'branding' ? 'home' : activeTab.value;
        const data = adminStore.siteContent[path] || {}
        await adminStore.updateCmsSection(path, data)
    }
    
    saved.value = true
    setTimeout(() => saved.value = false, 3000)
  } catch (err) {
    console.error('Save failed:', err)
  }
}

const tabs = [
  { id: 'home', name: 'Hero & Promos', icon: Home },
  { id: 'collections', name: 'Collections', icon: Layers },
  { id: 'branding', name: 'Brand Hooks', icon: Layout },
  { id: 'process', name: 'Our Process', icon: Zap },
  { id: 'contact', name: 'Global Info', icon: Phone },
]

onMounted(async () => {
  if (!adminStore.siteContent.home?.carousel?.length) {
    await adminStore.fetchCms()
  }
})
</script>

<template>
  <div class="space-y-10 min-h-screen relative pb-20">
    <!-- Hidden Inputs for S3 Uploads -->
    <input type="file" ref="slideImageInput" class="hidden" accept="image/*" @change="handleFileUpload" />
    <input type="file" ref="brandVideoInput" class="hidden" accept="video/mp4,video/webm" @change="handleFileUpload" />

    <!-- UI Status Overlay -->
    <div v-if="adminStore.loading && !adminStore.siteContent.home?.carousel?.length" class="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
      <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 anima-pulse">Syncing Visual Architecture...</p>
    </div>

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Commerce Engine CMS</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Global Site Content & Visual Storytelling</p>
      </div>
      <button 
        @click="handleSaveAll"
        class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all shadow-lg active:scale-95"
      >
        <Save v-if="!saved" size="18" />
        <CheckCircle v-else size="18" />
        {{ saved ? 'Changes Distributed' : 'Publish Site Updates' }}
      </button>
    </div>

    <!-- Tab Navigation -->
    <div class="flex items-center gap-2 bg-slate-100 p-2 rounded-[30px] w-max overflow-hidden scrollbar-hide">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        class="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
        :class="activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      >
        <component :is="tab.icon" size="14" />
        {{ tab.name }}
      </button>
    </div>

    <!-- TAB: HOME (HERO & PROMOS) -->
    <div v-if="activeTab === 'home'" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <!-- Hero Carousel Management -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
          <div class="flex items-center justify-between border-b border-slate-50 pb-8">
             <div class="flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Layout size="20"/></div>
                <div>
                    <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Dynamic Hero Slider</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global site banners & storytelling</p>
                </div>
             </div>
             <div class="flex items-center gap-3">
               <button @click="handleSaveSection('home.carousel')" class="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                  <Save size="16"/>
                  Save Carousel
               </button>
               <button @click="addSlide" class="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-blue-500/20">
                  <Plus size="16"/>
                  Add New Slide
               </button>
             </div>
          </div>

          <!-- Slides List -->
          <div class="space-y-10">
             <div v-for="(slide, idx) in (adminStore.siteContent?.home?.carousel || [])" :key="idx" class="relative bg-slate-50/50 p-10 rounded-3xl border border-slate-100 group">
                <!-- Slide Header/Actions -->
                <div class="absolute -right-4 top-10 flex flex-col gap-2 z-10 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <button @click="moveSlide(idx, -1)" :disabled="idx === 0" class="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-lg disabled:opacity-30"><ChevronUp size="18"/></button>
                    <button @click="moveSlide(idx, 1)" :disabled="idx === adminStore.siteContent.home.carousel.length - 1" class="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-lg disabled:opacity-30"><ChevronDown size="18"/></button>
                    <button @click="removeSlide(idx)" class="p-3 bg-white text-red-400 hover:text-red-600 rounded-xl shadow-lg"><Trash2 size="18"/></button>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
                   <!-- Visual Asset Panel (Left) -->
                   <div class="space-y-4">
                      <div class="relative group/asset rounded-[40px] overflow-hidden aspect-[16/10] shadow-2xl bg-slate-900 border-4 border-white transition-all transform hover:scale-[1.02] duration-500">
                         <img v-if="slide.image" :src="adminStore.resolveImageUrl(slide.image)" class="w-full h-full object-cover group-hover/asset:scale-105 transition-transform duration-1000" />
                         <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                             <ImageIcon size="48" stroke-width="1" />
                             <span class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Visual Architecture Needed</span>
                         </div>
                         
                         <!-- Overlay Actions -->
                         <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/asset:opacity-100 transition-all duration-300 gap-4">
                             <button @click="triggerSlideUpload(idx)" class="bg-white text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600 hover:text-white transition-all shadow-2xl">
                                 <UploadCloud size="18"/>
                                 {{ slide.image ? 'Replace Asset' : 'Assign S3 Asset' }}
                             </button>
                             <button v-if="slide.image" @click="clearSlideAsset(idx)" class="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-2xl">
                                 <Trash2 size="18"/>
                                 Destroy Reference
                             </button>
                         </div>
                      </div>
                      
                      <!-- Asset Info Bar (Mockup Style) -->
                      <div class="flex items-center gap-4 px-6 py-4 bg-white/50 rounded-2xl border border-slate-100 backdrop-blur-sm">
                         <Link size="16" class="text-slate-300" />
                         <p class="text-[10px] font-bold text-slate-400 truncate flex-1 tracking-wider">{{ slide.image || 'Waiting for asset synchronization...' }}</p>
                         <div v-if="slide.image" class="flex items-center gap-3">
                             <Eye size="16" class="text-blue-400 cursor-pointer hover:scale-125 transition-transform" @click="openHeroPreview(slide)" />
                             <Trash2 size="16" class="text-red-300 cursor-pointer hover:text-red-600 transition-colors" @click="clearSlideAsset(idx)" />
                         </div>
                      </div>
                   </div>

                   <!-- Narrative & Actions Panel (Right) -->
                   <div class="space-y-12">
                      <div class="space-y-6">
                        <div class="space-y-2">
                           <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Main Presentation Heading</label>
                           <textarea v-model="slide.title" rows="1" class="w-full bg-transparent font-black text-5xl italic tracking-tighter outline-none leading-none border-none p-0 focus:text-blue-600 transition-colors" placeholder="DYNAMITE STYLE"></textarea>
                        </div>
                        <div class="space-y-2">
                           <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Supporting Narrative</label>
                           <textarea v-model="slide.subtitle" rows="2" class="w-full bg-transparent text-sm font-bold uppercase tracking-[0.1em] text-slate-400 outline-none leading-relaxed border-none p-0 focus:text-slate-800" placeholder="Describe your collection..."></textarea>
                        </div>
                      </div>

                      <!-- Alignment Studio -->
                      <div class="space-y-4">
                         <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Content Alignment Architecture</label>
                         <div class="grid grid-cols-3 gap-2 w-max">
                            <button 
                               v-for="opt in alignmentOptions" 
                               :key="opt.id"
                               @click="slide.align = opt.id"
                               class="w-10 h-10 rounded-lg border flex items-center justify-center transition-all group"
                               :class="slide.align === opt.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-100 hover:border-blue-300'"
                               :title="opt.name"
                            >
                               <div class="w-2 h-2 rounded-full transition-all" :class="slide.align === opt.id ? 'bg-white scale-125' : 'bg-slate-200 group-hover:bg-blue-300'"></div>
                            </button>
                         </div>
                      </div>

                      <!-- Action Interface (Buttons) -->
                      <div class="space-y-4">
                         <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <label class="text-xs font-black uppercase tracking-[0.2em] text-blue-600">Action Interface</label>
                            <button @click="addButton(idx)" class="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-1 hover:text-black transition-colors">
                               <Plus size="14"/> Add Button
                            </button>
                         </div>
                         
                         <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            <div v-for="(btn, bIdx) in (slide.buttons || [])" :key="bIdx" class="bg-white px-5 py-4 rounded-2xl border border-slate-50 space-y-4 shadow-sm relative group/btn hover:shadow-md transition-shadow">
                               <button @click="removeButton(idx, bIdx)" class="absolute -right-2 -top-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover/btn:opacity-100 transition-all hover:scale-110 shadow-lg z-10">
                                  <X size="12"/>
                               </button>
                               <div class="grid grid-cols-2 gap-4">
                                  <div class="space-y-1.5">
                                     <label class="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Label</label>
                                     <input v-model="btn.text" class="w-full bg-slate-50/50 px-3 py-2.5 rounded-lg text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/10" placeholder="SHOP NOW" />
                                  </div>
                                  <div class="space-y-1.5">
                                     <label class="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Navigation</label>
                                     <select v-model="btn.link" class="w-full bg-slate-50/50 px-3 py-2.5 rounded-lg text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/10">
                                        <option v-for="link in pageLinks" :key="link.url" :value="link.url">{{ link.name }}</option>
                                     </select>
                                  </div>
                               </div>
                               <div class="grid grid-cols-3 gap-4 items-center pt-1">
                                  <div class="space-y-1.5">
                                     <label class="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Background</label>
                                     <div class="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-lg">
                                       <input type="color" v-model="btn.bg" class="w-full h-6 rounded-md cursor-pointer border-none bg-transparent" />
                                     </div>
                                  </div>
                                  <div class="space-y-1.5">
                                     <label class="text-xs font-black uppercase text-slate-300 tracking-[0.2em]">Text Color</label>
                                     <div class="flex items-center gap-2 bg-slate-50/50 p-1.5 rounded-lg">
                                       <input type="color" v-model="btn.textColor" class="w-full h-6 rounded-md cursor-pointer border-none bg-transparent" />
                                     </div>
                                  </div>
                                  <div class="space-y-1.5 flex flex-col items-center">
                                     <label class="text-xs font-black uppercase text-slate-300 tracking-[0.2em] mb-1">Border</label>
                                     <div @click="btn.border = !btn.border" class="w-8 h-4.5 rounded-full p-0.5 cursor-pointer transition-all duration-500" :class="btn.border ? 'bg-blue-600' : 'bg-slate-200'">
                                        <div class="w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all duration-500" :style="{ transform: btn.border ? 'translateX(14px)' : 'translateX(0)' }"></div>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div v-if="!adminStore.siteContent?.home?.carousel?.length" class="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <div class="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
                <Layout size="24" class="text-slate-300" />
             </div>
             <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Architecture is Empty. <span class="text-blue-600 cursor-pointer" @click="addSlide">Add First Slide</span></p>
          </div>
       </div>

       <!-- Mega Promos Display Grid -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-8">
          <div class="flex items-center justify-between border-b border-slate-50 pb-6">
             <div class="flex items-center gap-4">
                <div class="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><Layers size="20"/></div>
                <div>
                   <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Promotional Segments</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High-density visual hooks for the homepage</p>
                </div>
             </div>
             <button @click="handleSaveSection('home.megaPromos')" class="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95">
                <Save size="16"/>
                Save Promos
             </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div v-for="(promo, idx) in (adminStore.siteContent?.home?.megaPromos || [])" :key="idx" class="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-4">
                <div class="aspect-video rounded-2xl overflow-hidden relative shadow-lg group/promo bg-slate-200">
                    <img v-if="promo.image" :src="adminStore.resolveImageUrl(promo.image)" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400">
                         <ImageIcon size="20" />
                    </div>
                    <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover/promo:opacity-100 transition-opacity gap-2">
                         <button @click="triggerSlideUpload(`promo_${idx}`)" class="p-2 bg-white rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-lg" title="Upload Image"><UploadCloud size="16"/></button>
                         <button v-if="promo.image" @click="adminStore.siteContent.home.megaPromos[idx].image = ''" class="p-2 bg-red-600 text-white rounded-lg hover:bg-black transition-all shadow-lg" title="Delete Image"><Trash2 size="16"/></button>
                    </div>
                </div>
                <div class="space-y-4">
                   <input v-model="promo.title" class="w-full bg-transparent font-black text-sm uppercase tracking-tight outline-none" placeholder="Title" />
                   <input v-model="promo.subtitle" class="w-full bg-transparent text-sm font-black uppercase tracking-widest text-emerald-600 outline-none" placeholder="Tagline" />
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB: COLLECTIONS (GENDER BANNERS) -->
    <div v-if="activeTab === 'collections'" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
          <div class="flex items-center justify-between border-b border-slate-50 pb-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                   <Layers size="24" />
                </div>
                <div>
                   <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Gender Collection Studio</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage Men, Women, and Kids homepage banners</p>
                </div>
             </div>
             <button @click="handleSaveSection('home.categories')" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all shadow-lg active:scale-95">
                <Save size="18" />
                Save Collections
             </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div v-for="(cat, cIdx) in (adminStore.siteContent.home.categories || [])" :key="cIdx" class="space-y-6">
                <div class="aspect-[4/5] rounded-[32px] overflow-hidden relative group/cat shadow-xl bg-slate-100 border border-slate-50">
                   <img v-if="cat.image" :src="adminStore.resolveImageUrl(cat.image)" class="w-full h-full object-cover" />
                   <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center">
                      <ImageIcon size="40" stroke-width="1.5" class="mb-4 opacity-50" />
                      <span class="text-[9px] font-black uppercase tracking-widest">No Visual Selected</span>
                   </div>

                   <div class="absolute inset-0 bg-indigo-600/80 opacity-0 group-hover/cat:opacity-100 transition-all flex flex-col items-center justify-center p-6 text-center">
                      <button @click="triggerSlideUpload(`category_${cIdx}`)" class="bg-white text-indigo-600 p-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 mb-4">
                         <UploadCloud size="20" />
                         Update Visual
                      </button>
                      <p class="text-white/60 text-[8px] font-black uppercase tracking-widest">Recommended: 800x1200 Vertical</p>
                   </div>
                </div>

                <div class="space-y-4 px-2">
                   <div class="space-y-1">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Collection Title</label>
                      <input v-model="cat.title" class="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm font-black uppercase tracking-tight outline-none focus:ring-2 ring-indigo-500/10 border-transparent border focus:border-indigo-100" />
                   </div>
                   <div class="space-y-1">
                      <label class="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 ml-1">Destination Link</label>
                      <select v-model="cat.link" class="w-full bg-slate-50 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 outline-none focus:ring-2 ring-indigo-500/10 border-transparent border focus:border-indigo-100 cursor-pointer">
                         <option v-for="link in pageLinks" :key="link.url" :value="link.url">{{ link.name }}</option>
                      </select>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>


    <!-- TAB: BRAND HOOKS (TRUST & NARRATIVE) -->
    <div v-if="activeTab === 'branding' && adminStore.siteContent.home?.videoBlock && adminStore.siteContent.home?.vipBanner" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <!-- Section 1: Trust Signals -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
          <div class="flex items-center justify-between border-b border-slate-50 pb-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                   <ShieldCheck size="24" />
                </div>
                <div>
                   <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Trust Architecture</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage global shipping and security hooks</p>
                </div>
             </div>
             <div class="flex items-center gap-4">
                <button @click="handleSaveSection('home.trustFeatures')" class="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                   <Save size="16" />
                   Save Trust Bar
                </button>
             </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div v-for="(feat, tIdx) in (adminStore.siteContent.home.trustFeatures || [])" :key="tIdx" class="bg-slate-50/50 p-6 rounded-[30px] border border-slate-100 space-y-4">
                <div class="flex items-center gap-3 mb-2">
                   <div class="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-800 border border-slate-50">
                      <component :is="feat.icon === 'Truck' ? Truck : (feat.icon === 'RotateCcw' ? RotateCcw : ShieldCheck)" size="20" />
                   </div>
                   <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Signal #{{ tIdx + 1 }}</span>
                </div>
                <div class="space-y-4">
                   <input v-model="feat.title" class="w-full bg-transparent font-black text-sm uppercase tracking-tight outline-none" placeholder="Feature Title" />
                   <input v-model="feat.subtitle" class="w-full bg-transparent text-sm font-bold text-slate-500 outline-none" placeholder="Short detail..." />
                </div>
             </div>
          </div>
       </div>

       <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <!-- Section 2: Brand Narrative Advanced Editor -->
          <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-8">
             <div class="flex items-center justify-between border-b border-slate-50 pb-6">
                <div class="flex items-center gap-4">
                   <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <Zap size="20" />
                   </div>
                   <h3 class="text-xs font-black uppercase tracking-widest text-slate-800">Brand Statement</h3>
                </div>
                <div class="flex items-center gap-2">
                   <button @click="triggerSlideUpload('video')" class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black hover:text-white transition-all">
                      {{ adminStore.loading ? 'Uploading...' : 'Change Video' }}
                   </button>
                   <button @click="handleSaveSection('home.videoBlock')" class="bg-emerald-600 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all">
                      Save All
                   </button>
                </div>
             </div>

             <div class="space-y-10">
                <!-- Title Style Tool -->
                <div class="space-y-3">
                   <div class="flex items-center justify-between">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400">Main Headline</label>
                      <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                         <input type="color" v-model="adminStore.siteContent.home.videoBlock.title.color" class="w-5 h-5 rounded-md cursor-pointer border-none bg-transparent" />
                         <input type="number" v-model="adminStore.siteContent.home.videoBlock.title.size" class="w-10 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                         <button @click="adminStore.siteContent.home.videoBlock.title.bold = !adminStore.siteContent.home.videoBlock.title.bold" :class="adminStore.siteContent.home.videoBlock.title.bold ? 'bg-blue-600 text-white' : 'text-slate-400'" class="w-5 h-5 flex items-center justify-center rounded transition-colors"><Bold size="10"/></button>
                         <button @click="adminStore.siteContent.home.videoBlock.title.italic = !adminStore.siteContent.home.videoBlock.title.italic" :class="adminStore.siteContent.home.videoBlock.title.italic ? 'bg-blue-600 text-white' : 'text-slate-400'" class="w-5 h-5 flex items-center justify-center rounded transition-colors"><Italic size="10"/></button>
                      </div>
                   </div>
                   <input v-model="adminStore.siteContent.home.videoBlock.title.text" class="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-tighter" :style="{ fontSize: '11px', color: adminStore.siteContent.home.videoBlock.title.color, fontStyle: adminStore.siteContent.home.videoBlock.title.italic ? 'italic' : 'normal', fontWeight: adminStore.siteContent.home.videoBlock.title.bold ? '900' : '400' }" />
                </div>

                <!-- Story Style Tool -->
                <div class="space-y-3">
                   <div class="flex items-center justify-between">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400">Brand Story</label>
                      <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                         <input type="color" v-model="adminStore.siteContent.home.videoBlock.description.color" class="w-5 h-5 rounded-md cursor-pointer border-none bg-transparent" />
                         <input type="number" v-model="adminStore.siteContent.home.videoBlock.description.size" class="w-10 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                      </div>
                   </div>
                   <textarea v-model="adminStore.siteContent.home.videoBlock.description.text" rows="4" class="w-full bg-slate-50 px-5 py-4 rounded-2xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-none"></textarea>
                </div>

                <!-- Perks Tool -->
                <div class="space-y-4 pt-4 border-t border-slate-50">
                   <div class="flex items-center justify-between">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400">Premium Perks</label>
                      <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                         <input type="color" v-model="adminStore.siteContent.home.videoBlock.perkStyle.color" class="w-5 h-5 rounded-md cursor-pointer border-none bg-transparent" />
                         <input type="number" v-model="adminStore.siteContent.home.videoBlock.perkStyle.size" class="w-10 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                      </div>
                   </div>
                   <div v-for="(perk, pIdx) in (adminStore.siteContent.home.videoBlock.perks || [])" :key="pIdx" class="flex items-center gap-3 bg-slate-50 p-3 rounded-xl">
                      <CheckCircle class="text-emerald-500 shrink-0" size="14" />
                      <input v-model="adminStore.siteContent.home.videoBlock.perks[pIdx]" class="w-full bg-transparent text-sm font-black uppercase tracking-widest outline-none" />
                   </div>
                </div>
             </div>
          </div>

          <!-- Section 3: VIP Growth Advanced Editor -->
          <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-8">
             <div class="flex items-center justify-between border-b border-slate-50 pb-6">
                <div class="flex items-center gap-4">
                   <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Star size="20" />
                   </div>
                   <h3 class="text-xs font-black uppercase tracking-widest text-slate-800">VIP Recruitment</h3>
                </div>
                <button @click="handleSaveSection('home.vipBanner')" class="bg-indigo-600 text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all">
                   Save Banner
                </button>
             </div>

             <div class="space-y-6">
                <!-- Banner Styling -->
                <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                   <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Banner Theme</label>
                      <input type="color" v-model="adminStore.siteContent.home.vipBanner.bg" class="w-full h-8 rounded-lg cursor-pointer border-none bg-white p-1" />
                   </div>
                   <div class="space-y-1.5">
                      <label class="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Text Theme</label>
                      <input type="color" v-model="adminStore.siteContent.home.vipBanner.title.color" class="w-full h-8 rounded-lg cursor-pointer border-none bg-white p-1" @input="adminStore.siteContent.home.vipBanner.description.color = $event.target.value" />
                   </div>
                </div>

                <div class="space-y-4">
                   <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Headline</label>
                        <input type="number" v-model="adminStore.siteContent.home.vipBanner.title.size" class="w-10 bg-slate-50 text-sm font-black text-center outline-none py-1 rounded" />
                      </div>
                      <input v-model="adminStore.siteContent.home.vipBanner.title.text" class="w-full bg-slate-50 px-5 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest" :style="{ color: adminStore.siteContent.home.vipBanner.title.color, fontSize: '12px' }" />
                   </div>
                   <div class="space-y-2">
                      <div class="flex items-center justify-between">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Pitch Copy</label>
                        <input type="number" v-model="adminStore.siteContent.home.vipBanner.description.size" class="w-10 bg-slate-50 text-sm font-black text-center outline-none py-1 rounded" />
                      </div>
                      <textarea v-model="adminStore.siteContent.home.vipBanner.description.text" rows="4" class="w-full bg-slate-50 px-5 py-4 rounded-xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-none"></textarea>
                   </div>
                </div>

                <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                   <div class="space-y-2">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400">Button Label</label>
                      <input v-model="adminStore.siteContent.home.vipBanner.buttonText" class="w-full bg-slate-50 px-5 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest" />
                   </div>
                   <div class="space-y-2">
                      <label class="text-xs font-black uppercase tracking-widest text-slate-400">Destination</label>
                      <select v-model="adminStore.siteContent.home.vipBanner.link" class="w-full bg-slate-50 px-5 py-3.5 rounded-xl text-sm font-bold text-slate-800 outline-none cursor-pointer">
                         <option v-for="link in pageLinks" :key="link.url" :value="link.url">{{ link.name }}</option>
                      </select>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>

    <!-- TAB: OUR PROCESS (CRAFTSMANSHIP) -->
    <div v-if="activeTab === 'process' && adminStore.siteContent.process" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <!-- Section 1: Hero Studio -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
          <div class="flex items-center justify-between border-b border-slate-50 pb-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                   <Layout size="24" />
                </div>
                <div>
                   <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Process Hero Studio</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage the visual entry point for your craftsmanship story</p>
                </div>
             </div>
             <button @click="handleSaveSection('process')" class="bg-amber-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Save size="18" />
                Save Infrastructure
             </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <!-- Visual Preview (Left) -->
             <div class="space-y-4">
                <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Presentation Background</label>
                <div class="aspect-[21/9] rounded-[32px] overflow-hidden relative group/hero shadow-2xl bg-slate-900 border border-slate-100">
                   <div 
                     class="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] group-hover/hero:scale-110"
                     :style="{ backgroundImage: `url(${adminStore.resolveImageUrl(adminStore.siteContent.process?.hero?.image)})` }"
                   ></div>
                   <div class="absolute inset-0 bg-black/40"></div>
                   <div class="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-all backdrop-blur-sm p-6">
                      <button @click="triggerSlideUpload('process_hero')" class="bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-amber-500 hover:text-white transition-all flex items-center gap-2 mb-2">
                         <UploadCloud size="16" />
                         Sync Visual Asset
                      </button>
                      <p class="text-white/60 text-[8px] font-black uppercase tracking-widest">Recommended: 1920x800 Cinematic</p>
                   </div>
                </div>
             </div>

             <!-- Narrative Controls (Right) -->
             <div class="space-y-8 flex flex-col justify-center">
                <div class="space-y-3">
                   <div class="flex items-center justify-between">
                     <label class="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Primary Heading</label>
                     <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 scale-90">
                        <input type="color" v-model="adminStore.siteContent.process.hero.title.color" class="w-4 h-4 rounded-md cursor-pointer border-none bg-transparent" />
                        <input type="number" v-model="adminStore.siteContent.process.hero.title.size" class="w-8 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                        <button @click="adminStore.siteContent.process.hero.title.bold = !adminStore.siteContent.process.hero.title.bold" :class="adminStore.siteContent.process.hero.title.bold ? 'bg-amber-600 text-white' : 'text-slate-400'" class="w-4 h-4 flex items-center justify-center rounded transition-colors"><Bold size="10"/></button>
                        <button @click="adminStore.siteContent.process.hero.title.italic = !adminStore.siteContent.process.hero.title.italic" :class="adminStore.siteContent.process.hero.title.italic ? 'bg-amber-600 text-white' : 'text-slate-400'" class="w-4 h-4 flex items-center justify-center rounded transition-colors"><Italic size="10"/></button>
                     </div>
                   </div>
                   <input v-model="adminStore.siteContent.process.hero.title.text" class="w-full bg-slate-50 px-6 py-4 rounded-2xl text-xl font-black italic tracking-tighter uppercase outline-none focus:ring-2 ring-amber-500/10 border-transparent border focus:border-amber-100 transition-all" :style="{ color: adminStore.siteContent.process.hero.title.color, fontSize: '14px', fontWeight: adminStore.siteContent.process.hero.title.bold ? '900' : '400', fontStyle: adminStore.siteContent.process.hero.title.italic ? 'italic' : 'normal' }" />
                </div>
                <div class="space-y-3">
                   <div class="flex items-center justify-between">
                     <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Supporting Narrative</label>
                     <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 scale-90">
                        <input type="color" v-model="adminStore.siteContent.process.hero.subtitle.color" class="w-4 h-4 rounded-md cursor-pointer border-none bg-transparent" />
                        <input type="number" v-model="adminStore.siteContent.process.hero.subtitle.size" class="w-8 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                     </div>
                   </div>
                   <textarea v-model="adminStore.siteContent.process.hero.subtitle.text" rows="3" class="w-full bg-slate-50 px-6 py-4 rounded-2xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-transparent border focus:border-amber-100" :style="{ color: adminStore.siteContent.process.hero.subtitle.color, fontSize: '11px' }"></textarea>
                </div>
             </div>
          </div>
       </div>

       <!-- Section 2: Timeline Architect -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
          <div class="flex items-center justify-between border-b border-slate-50 pb-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                   <RotateCcw size="24" />
                </div>
                <div>
                   <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Timeline Architect</h3>
                   <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure step-by-step craftsmanship journey</p>
                </div>
             </div>
             <button @click="addProcessStep" class="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg">
                <Plus size="16" />
                Add Milestone
             </button>
          </div>

          <div class="space-y-6">
             <div v-for="(step, sIdx) in (adminStore.siteContent.process?.steps || [])" :key="sIdx" class="group relative bg-slate-50/50 hover:bg-white p-8 rounded-[40px] border border-slate-100 hover:border-amber-200 transition-all hover:shadow-2xl hover:shadow-slate-200/50">
                <button @click="removeProcessStep(sIdx)" class="absolute -right-3 -top-3 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg z-10">
                   <X size="14" />
                </button>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                   <!-- Index & Icon Simulation -->
                   <div class="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-50 shadow-sm">
                      <div class="text-4xl font-black italic text-slate-100 mb-2">0{{ sIdx + 1 }}</div>
                      <div class="w-16 h-16 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg">
                         <Zap size="24" />
                      </div>
                   </div>

                   <!-- Detailed Content Inputs -->
                   <div class="md:col-span-3 space-y-6">
                      <div class="space-y-3">
                         <div class="flex items-center justify-between">
                            <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Milestone Title</label>
                            <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 scale-90">
                              <input type="color" v-model="step.title.color" class="w-4 h-4 rounded-md cursor-pointer border-none bg-transparent" />
                              <input type="number" v-model="step.title.size" class="w-8 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                              <button @click="step.title.bold = !step.title.bold" :class="step.title.bold ? 'bg-slate-900 text-white' : 'text-slate-400'" class="w-4 h-4 flex items-center justify-center rounded transition-colors"><Bold size="10"/></button>
                            </div>
                         </div>
                         <input v-model="step.title.text" class="w-full bg-transparent font-black text-2xl tracking-tighter outline-none focus:text-amber-600 transition-colors" :style="{ color: step.title.color, fontWeight: step.title.bold ? '900' : '400', fontSize: '24px' }" />
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                         <div class="space-y-3">
                            <div class="flex items-center justify-between">
                              <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Phase 1: Raw Elements</label>
                              <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 scale-75">
                                 <input type="color" v-model="step.have.color" class="w-3 h-3 rounded-md cursor-pointer border-none bg-transparent" />
                                 <input type="number" v-model="step.have.size" class="w-6 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                              </div>
                            </div>
                            <textarea v-model="step.have.text" rows="2" class="w-full bg-slate-100/30 p-4 rounded-xl text-sm font-bold text-slate-500 outline-none border-transparent border focus:border-amber-100" :style="{ color: step.have.color, fontSize: '10px' }"></textarea>
                         </div>
                         <div class="space-y-3">
                            <div class="flex items-center justify-between">
                              <label class="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Phase 2: Execution</label>
                              <div class="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100 scale-75">
                                 <input type="color" v-model="step.do.color" class="w-3 h-3 rounded-md cursor-pointer border-none bg-transparent" />
                                 <input type="number" v-model="step.do.size" class="w-6 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                              </div>
                            </div>
                            <textarea v-model="step.do.text" rows="2" class="w-full bg-slate-100/30 p-4 rounded-xl text-sm font-bold text-slate-500 outline-none border-transparent border focus:border-amber-100" :style="{ color: step.do.color, fontSize: '10px' }"></textarea>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <div v-if="!adminStore.siteContent.process?.steps?.length" class="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <RotateCcw size="24" class="text-slate-300 mx-auto mb-4" />
             <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">No Milestones Defined. <span class="text-amber-600 cursor-pointer" @click="addProcessStep">Begin Architecture</span></p>
          </div>
       </div>

       <!-- Section 3: Final CTA Architect -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm">
           <div class="flex items-center justify-between border-b border-slate-50 pb-8">
              <div class="flex items-center gap-4">
                 <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100">
                    <CheckCircle size="24" />
                 </div>
                 <div>
                    <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Conclusion Architecture</h3>
                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage the final pitch and call-to-action</p>
                 </div>
              </div>
           </div>
           
           <div class="py-10 text-center max-w-2xl mx-auto space-y-8">
              <div class="space-y-4">
                 <div class="flex items-center justify-center gap-4">
                    <label class="text-xs font-black uppercase tracking-widest text-slate-400">Main Pitch</label>
                    <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 scale-90">
                       <input type="color" v-model="adminStore.siteContent.process.cta.title.color" class="w-5 h-5 rounded-md cursor-pointer border-none bg-transparent" />
                       <input type="number" v-model="adminStore.siteContent.process.cta.title.size" class="w-10 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                    </div>
                 </div>
                 <input v-model="adminStore.siteContent.process.cta.title.text" class="w-full bg-transparent text-center font-black text-4xl tracking-tighter uppercase outline-none" :style="{ color: adminStore.siteContent.process.cta.title.color, fontSize: '32px' }" />
              </div>

              <div class="space-y-4 pt-4 border-t border-slate-50">
                 <div class="flex items-center justify-center gap-4">
                    <label class="text-xs font-black uppercase tracking-widest text-slate-400">Supporting Pitch</label>
                    <div class="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100 scale-90">
                       <input type="color" v-model="adminStore.siteContent.process.cta.subtitle.color" class="w-5 h-5 rounded-md cursor-pointer border-none bg-transparent" />
                       <input type="number" v-model="adminStore.siteContent.process.cta.subtitle.size" class="w-10 bg-transparent text-sm font-black text-center outline-none" title="Font Size" />
                    </div>
                 </div>
                 <textarea v-model="adminStore.siteContent.process.cta.subtitle.text" rows="2" class="w-full bg-transparent text-center text-sm font-bold text-slate-400 uppercase tracking-widest outline-none border-none p-0" :style="{ color: adminStore.siteContent.process.cta.subtitle.color, fontSize: '11px' }"></textarea>
              </div>

              <div class="pt-8">
                <RouterLink to="/shop" class="bg-slate-900 text-white px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl">
                   Shop The Resulting Excellence
                </RouterLink>
              </div>
           </div>
       </div>
    </div>

    <!-- TAB: GLOBAL INFO (CONTACT & POLICIES) -->
    <div v-if="activeTab === 'contact' && adminStore.siteContent.contact && adminStore.siteContent.policies" class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       
       <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-4">
             <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Globe size="24" />
             </div>
             <div>
                <h3 class="text-sm font-black uppercase tracking-widest text-slate-800">Global Infrastructure</h3>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage contact reach and legal narratives</p>
             </div>
          </div>
          <div class="flex items-center gap-4">
            <button @click="handleSaveSection('contact')" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Save size="18" />
                Save Contact details
            </button>
            <button @click="handleSaveSection('policies')" class="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                <Save size="18" />
                Save Policies
            </button>
          </div>
       </div>

       <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <!-- Section 1: Contact Studio -->
          <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
            <div class="flex items-center gap-4 border-b border-slate-50 pb-8">
                <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <PhoneCall size="20" />
                </div>
                <h4 class="text-xs font-black uppercase tracking-widest text-slate-800">Contact Studio</h4>
            </div>

            <div class="space-y-8">
               <div class="space-y-3">
                  <label class="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">Support Email Address</label>
                  <div class="relative group">
                     <Mail size="16" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                     <input v-model="adminStore.siteContent.contact.direct.email" class="w-full bg-slate-50 pl-14 pr-6 py-4 rounded-2xl text-sm font-bold text-slate-600 outline-none border-transparent border focus:border-indigo-100 transition-all" placeholder="support@brand.com" />
                  </div>
               </div>

               <div class="space-y-4">
                  <div class="flex items-center justify-between">
                     <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Direct Support Lines</label>
                     <button @click="addPhone" class="text-[8px] font-black uppercase tracking-widest text-indigo-600 hover:text-black flex items-center gap-1">
                        <Plus size="12" /> Add Line
                     </button>
                  </div>
                  <div class="space-y-3">
                     <div v-for="(phone, pIdx) in adminStore.siteContent.contact.direct.phone" :key="pIdx" class="flex gap-2">
                        <div class="relative flex-grow">
                           <Phone size="14" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                           <input v-model="adminStore.siteContent.contact.direct.phone[pIdx]" class="w-full bg-slate-50 pl-14 pr-6 py-3 rounded-xl text-sm font-bold text-slate-600 outline-none border-transparent border focus:border-indigo-100 transition-all" placeholder="+91 XXX XXX XXXX" />
                        </div>
                        <button @click="removePhone(pIdx)" class="bg-red-50 text-red-500 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all">
                           <Trash2 size="14" />
                        </button>
                     </div>
                  </div>
               </div>

               <div class="space-y-3">
                  <label class="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Google Maps Embed URL</label>
                  <div class="relative group">
                     <MapPin size="16" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                     <input v-model="adminStore.siteContent.contact.mapUrl" class="w-full bg-slate-50 pl-14 pr-6 py-4 rounded-2xl text-sm font-bold text-slate-600 outline-none border-transparent border focus:border-indigo-100 transition-all" placeholder="https://www.google.com/maps/embed?pb=..." />
                  </div>
                  <div v-if="adminStore.siteContent.contact.mapUrl" class="aspect-video rounded-2xl overflow-hidden border border-slate-100 mt-4 bg-slate-50 relative group">
                     <iframe :src="adminStore.siteContent.contact.mapUrl" class="w-full h-full grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" frameborder="0"></iframe>
                     <div class="absolute inset-0 flex items-center justify-center bg-black/5 opacity-100 group-hover:opacity-0 transition-opacity">
                        <p class="text-[8px] font-black uppercase tracking-widest text-slate-400 italic">Maps Preview Rendered</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          <!-- Section 2: FAQ Architect -->
          <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-10">
             <div class="flex items-center justify-between border-b border-slate-50 pb-8">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                        <HelpCircle size="20" />
                    </div>
                    <h4 class="text-xs font-black uppercase tracking-widest text-slate-800">FAQ Architect</h4>
                </div>
                <button @click="addFaq" class="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2">
                   <Plus size="14" /> Add FAQ
                </button>
             </div>

             <div class="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                <div v-for="(item, fIdx) in adminStore.siteContent.policies.faq.items" :key="fIdx" class="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4 hover:border-indigo-200 transition-all">
                   <div class="flex gap-4">
                      <div class="flex-grow space-y-3">
                        <input v-model="item.q" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black text-slate-800 outline-none border border-slate-100 focus:border-indigo-400 transition-all" placeholder="Question Title" />
                        <textarea v-model="item.a" rows="3" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-slate-500 leading-relaxed outline-none border border-slate-100" placeholder="Provide a detailed answer..."></textarea>
                      </div>
                      <button @click="removeFaq(fIdx)" class="self-start bg-red-50 text-red-400 p-2 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                         <Trash2 size="14" />
                      </button>
                   </div>
                </div>
                <div v-if="!adminStore.siteContent.policies.faq.items?.length" class="text-center py-10 opacity-30 italic text-[10px] font-bold">
                   No questions defined. Click "Add FAQ" to begin.
                </div>
             </div>
          </div>
       </div>

       <!-- Section 3: Legal Policy Narratives -->
       <div class="bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-12">
          <div class="flex items-center gap-4 border-b border-slate-50 pb-8">
              <div class="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                  <Shield size="20" />
              </div>
              <h4 class="text-xs font-black uppercase tracking-widest text-slate-800">Legal & Operations Narratives</h4>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <div class="space-y-8">
                <div class="space-y-4">
                   <div class="flex items-center gap-3">
                      <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                      <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-800">Shipping & Refund Protocol</h5>
                   </div>
                   <div class="space-y-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Process Heading</label>
                        <input v-model="adminStore.siteContent.policies.shippingAndReturns.shippingProcess.title" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                      </div>
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Shipping Policy Detail</label>
                        <textarea v-model="adminStore.siteContent.policies.shippingAndReturns.shippingProcess.content" rows="4" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-transparent border focus:border-indigo-100" placeholder="Configure shipping timelines..."></textarea>
                      </div>
                   </div>
                   <div class="space-y-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Refund Heading</label>
                        <input v-model="adminStore.siteContent.policies.shippingAndReturns.refundPolicy.title" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                      </div>
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Refund Policy Detail</label>
                        <textarea v-model="adminStore.siteContent.policies.shippingAndReturns.refundPolicy.content" rows="4" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-transparent border focus:border-indigo-100" placeholder="Configure return conditions..."></textarea>
                      </div>
                   </div>
                </div>
             </div>

             <div class="space-y-8">
                <div class="space-y-4">
                   <div class="flex items-center gap-3">
                      <div class="w-1.5 h-6 bg-slate-400 rounded-full"></div>
                      <h5 class="text-[10px] font-black uppercase tracking-widest text-slate-800">Privacy & Data Governance</h5>
                   </div>
                   <div class="space-y-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Governance Heading</label>
                        <input v-model="adminStore.siteContent.policies.privacy.pageTitle" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                      </div>
                      <div class="space-y-2">
                        <label class="text-xs font-black uppercase tracking-widest text-slate-400">Privacy Policy Narrative</label>
                        <textarea v-model="adminStore.siteContent.policies.privacy.content" rows="14" class="w-full bg-white px-4 py-4 rounded-3xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-transparent border focus:border-indigo-100" placeholder="Full privacy documentation..."></textarea>
                      </div>
                   </div>

                   <div class="space-y-6 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                      <div class="flex items-center justify-between">
                        <div class="space-y-1">
                          <label class="text-xs font-black uppercase tracking-widest text-slate-400">Terms Architecture</label>
                          <input v-model="adminStore.siteContent.policies.terms.pageTitle" class="bg-transparent text-sm font-black outline-none border-none p-0" />
                        </div>
                        <button @click="adminStore.addTermsSection" class="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-all flex items-center gap-1 px-3">
                          <Plus :size="10" strokeWidth="4" />
                          <span class="text-[7px] font-black uppercase tracking-tighter">Add Section</span>
                        </button>
                      </div>

                      <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                          <label class="text-xs font-black uppercase tracking-widest text-slate-400">Page Subtitle</label>
                          <input v-model="adminStore.siteContent.policies.terms.subtitle" placeholder="e.g. Transparent guidelines for our customers" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                        </div>
                        <div class="space-y-2">
                          <label class="text-xs font-black uppercase tracking-widest text-slate-400">Last Updated</label>
                          <input v-model="adminStore.siteContent.policies.terms.lastUpdated" placeholder="e.g. April 2026" class="w-full bg-white px-4 py-3 rounded-xl text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                        </div>
                      </div>

                      <div class="space-y-4">
                        <div v-for="(clause, idx) in adminStore.siteContent.policies.terms.items" :key="idx" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3 relative group">
                          <button @click="adminStore.removeTermsSection(idx)" class="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 :size="12" />
                          </button>
                          
                          <div class="space-y-1">
                            <label class="text-xs font-black uppercase tracking-widest text-slate-400">Section Title</label>
                            <input v-model="clause.title" placeholder="e.g. 1. Introduction" class="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-black outline-none border-transparent border focus:border-indigo-100" />
                          </div>
                          
                          <div class="space-y-1">
                            <label class="text-xs font-black uppercase tracking-widest text-slate-400">Section Content</label>
                            <textarea v-model="clause.content" rows="4" placeholder="Detailed legal text..." class="w-full bg-slate-50 px-3 py-3 rounded-xl text-sm font-bold text-slate-500 leading-relaxed outline-none border-transparent border focus:border-indigo-100"></textarea>
                          </div>
                        </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>


    <!-- Remaining Tabs Coverage -->
    <div v-if="!['home', 'collections', 'branding', 'process', 'contact'].includes(activeTab)" class="p-20 text-center bg-white rounded-3xl border border-slate-100 italic font-bold text-slate-300">
        Architecture sync with other sections remains consistent. 
        Focus maintained on Dynamic Hero Engine.
    </div>

    <!-- HIGH-FIDELITY PREVIEW MODAL -->
    <div v-if="showPreview" class="fixed inset-0 z-[100] flex items-center justify-center p-10 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
       <button @click="showPreview = false" class="absolute top-10 right-10 text-white/50 hover:text-white transition-colors">
          <X size="40" stroke-width="1.5" />
       </button>
       
       <div class="w-full max-w-7xl aspect-[21/9] bg-slate-900 rounded-[40px] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] relative border border-white/10">
          <div v-if="previewSlide" class="w-full h-full relative">
             <!-- Background Image Simulation -->
             <div 
               class="absolute inset-0 bg-cover bg-center transition-all duration-700"
               :style="{ backgroundImage: `url(${adminStore.resolveImageUrl(previewSlide.image)})` }"
             ></div>
             <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
             
             <!-- Content Simulation -->
             <div class="absolute inset-0 flex p-20" :class="getAlignmentClasses(previewSlide.align)">
                <div class="space-y-6 max-w-2xl">
                   <div class="space-y-2">
                      <h1 class="text-white text-6xl font-black italic tracking-tighter uppercase leading-[0.9] drop-shadow-2xl">
                         {{ previewSlide.title || 'Dynamic Title' }}
                      </h1>
                      <p class="text-white/70 text-lg font-bold uppercase tracking-[0.2em]">
                         {{ previewSlide.subtitle || 'Supporting narrative goes here...' }}
                      </p>
                   </div>
                   
                   <div class="flex items-center gap-4 pt-6" :class="previewSlide.align.includes('center') ? 'justify-center' : (previewSlide.align.includes('right') ? 'justify-end' : 'justify-start')">
                      <div 
                        v-for="(btn, idx) in (previewSlide.buttons || [])" 
                        :key="idx"
                        class="px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 whitespace-nowrap"
                        :style="{ 
                           backgroundColor: btn.bg, 
                           color: btn.textColor,
                           border: btn.border ? `2px solid ${btn.textColor}` : 'none'
                        }"
                      >
                        {{ btn.text }}
                      </div>
                   </div>
                </div>
             </div>
             
             <!-- Interface Decorative -->
             <div class="absolute bottom-10 right-10 flex items-center gap-2">
                <div class="h-1 w-12 bg-white rounded-full"></div>
                <div class="h-1 w-2 bg-white/20 rounded-full"></div>
                <div class="h-1 w-2 bg-white/20 rounded-full"></div>
             </div>
          </div>
       </div>
       
       <div class="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">
          Frontend Presentation Simulation • Precision Rendering
       </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-from-bottom { from { transform: translateY(10px); } to { transform: translateY(0); } }
.animate-in { animation: fade-in 0.5s ease-out, slide-in-from-bottom 0.5s ease-out; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
