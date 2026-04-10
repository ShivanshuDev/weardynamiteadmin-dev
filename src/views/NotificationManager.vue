<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Bell, 
  Plus, 
  Send, 
  History, 
  Users, 
  Target, 
  Image as ImageIcon, 
  Search, 
  X, 
  Mail, 
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  UploadCloud,
  RefreshCw
} from 'lucide-vue-next'

const adminStore = useAdminStore()

// State
const showCreateModal = ref(false)
const isSubmitting = ref(false)
const isUploading = ref(false)
const searchQuery = ref('')
const pollingId = ref(null)

const defaultForm = {
  title: '',
  message: '',
  imageUrl: '',
  targetType: 'all', // all, gender, single
  targetValue: '',   // male, female, or user email
  channels: ['push'], // push, email
  product: null
}

const form = ref({ ...defaultForm })

// Data Fetching
const refreshData = () => {
  adminStore.fetchNotifications()
  if (adminStore.products.length === 0) {
    adminStore.fetchProducts()
  }
}

const startPolling = () => {
  if (pollingId.value) return
  pollingId.value = setInterval(() => {
    const hasPending = adminStore.notifications.some(n => n.status === 'Pending')
    if (hasPending) {
      adminStore.fetchNotifications()
    } else {
      stopPolling()
    }
  }, 10000)
}

const stopPolling = () => {
  if (pollingId.value) {
    clearInterval(pollingId.value)
    pollingId.value = null
  }
}

import { onUnmounted, watch } from 'vue'

onMounted(() => {
  refreshData()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})

// Watch for changes in notifications to restart polling if needed
watch(() => adminStore.notifications, (newVal) => {
  if (newVal.some(n => n.status === 'Pending')) {
    startPolling()
  }
}, { deep: true })

// Computed
const filteredCampaigns = computed(() => {
  if (!searchQuery.value) return adminStore.notifications
  const q = searchQuery.value.toLowerCase()
  return adminStore.notifications.filter(n => 
    n.title?.toLowerCase().includes(q) || 
    n.message?.toLowerCase().includes(q) ||
    n.targetType?.toLowerCase().includes(q)
  )
})

const paginatedCampaigns = computed(() => filteredCampaigns.value) // Simple for now

// Methods
const openCreateModal = () => {
  form.value = { ...defaultForm }
  showCreateModal.value = true
}

const selectProduct = (product) => {
  form.value.product = product
}

const handleImageUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isUploading.value = true
  try {
    const { uploadUrl, fileKey } = await adminStore.getPresignedUrl(file.name, file.type, 'notifications')
    await adminStore.uploadToS3(uploadUrl, file)
    form.value.imageUrl = fileKey
    adminStore.showNotification('Upload Success', 'Asset ready for broadcast.', 'success')
  } catch (error) {
    console.error('Upload failed:', error)
  } finally {
    isUploading.value = false
  }
}

const sendBroadcast = async () => {
  if (!form.value.title || !form.value.message) {
    adminStore.showNotification('Validation Error', 'Title and Message are mandatory.', 'warning')
    return
  }

  isSubmitting.value = true
  try {
    await adminStore.broadcastNotification(form.value)
    showCreateModal.value = false
  } catch (error) {
    console.error('Broadcast failed:', error)
  } finally {
    isSubmitting.value = false
  }
}

const getStatusColor = (status) => {
  switch (status) {
    case 'Sent': return 'text-emerald-500 bg-emerald-500/10'
    case 'Pending': return 'text-amber-500 bg-amber-500/10'
    case 'Failed': return 'text-rose-500 bg-rose-500/10'
    default: return 'text-slate-400 bg-slate-400/10'
  }
}

const formatDate = (ts) => {
  if (!ts) return '-'
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="notification-manager">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
      <div>
        <h1 class="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <Bell class="text-blue-600" size="32" />
          BROADCAST CENTER
        </h1>
        <p class="text-slate-500 font-bold mt-1 uppercase text-xs tracking-widest">Multi-Channel Communication & Marketing</p>
      </div>

      <div class="flex items-center gap-3">
        <div class="relative group">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size="18" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search campaigns..." 
            class="bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all w-64 md:w-80 shadow-sm"
          />
        </div>

        <button 
          @click="refreshData"
          class="p-3 bg-white border-2 border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 rounded-2xl transition-all shadow-sm group"
          :title="'Refresh List'"
        >
          <RefreshCw size="20" :class="{ 'animate-spin': adminStore.loading }" />
        </button>

        <button 
          @click="openCreateModal"
          class="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-600/20"
        >
          <Plus size="20" />
          NEW BROADCAST
        </button>
      </div>
    </div>

    <!-- History Table -->
    <div class="bg-white rounded-[32px] border-2 border-slate-100 shadow-sm overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50/50 border-b-2 border-slate-100">
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Campaign / Message</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target / Channel</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pulse</th>
            <th class="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="notif in filteredCampaigns" :key="notif.SK" class="group hover:bg-slate-50/50 transition-colors">
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                   <img v-if="notif.imageUrl" :src="adminStore.resolveImageUrl(notif.imageUrl)" class="w-full h-full object-cover" />
                   <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size="20" /></div>
                </div>
                <div>
                  <p class="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{{ notif.title }}</p>
                  <p class="text-sm text-slate-500 line-clamp-1 font-medium">{{ notif.message }}</p>
                </div>
              </div>
            </td>
            <td class="px-8 py-6">
              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                   <Users size="14" class="text-slate-400" />
                   <span class="text-sm font-bold text-slate-700">
                     {{ notif.targetType === 'all' ? 'Everyone' : 
                        notif.targetType === 'gender' ? `Gender: ${notif.targetValue}` :
                        `Single: ${notif.targetValue}` }}
                   </span>
                </div>
                <div class="flex items-center gap-2">
                   <Mail v-if="notif.channels?.includes('email')" size="14" class="text-blue-400" />
                   <Smartphone v-if="notif.channels?.includes('push')" size="14" class="text-purple-400" />
                   <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     {{ notif.channels?.join(' + ') }}
                   </span>
                </div>
              </div>
            </td>
            <td class="px-8 py-6 text-center">
              <span 
                :class="['px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1.5', getStatusColor(notif.status)]"
              >
                <Clock v-if="notif.status === 'Pending'" size="12" />
                <CheckCircle2 v-if="notif.status === 'Sent'" size="12" />
                <AlertCircle v-if="notif.status === 'Failed'" size="12" />
                {{ notif.status }}
              </span>
            </td>
            <td class="px-8 py-6">
              <div class="flex flex-col items-center">
                <span class="text-xl font-black text-slate-900 leading-none">{{ notif.sentCount || 0 }}</span>
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-1">Recipients</span>
              </div>
            </td>
            <td class="px-8 py-6">
              <p class="text-xs font-bold text-slate-600 text-right">{{ formatDate(notif.created_at) }}</p>
            </td>
          </tr>
          <tr v-if="filteredCampaigns.length === 0">
            <td colspan="5" class="py-20 text-center">
              <div class="flex flex-col items-center gap-4 text-slate-300">
                <History size="64" class="opacity-20" />
                <p class="font-bold text-lg">No communication history found.</p>
                <button @click="openCreateModal" class="text-blue-500 font-black uppercase text-xs tracking-widest hover:underline">Launch your first campaign</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Broadcast Modal -->
    <Transition name="modal">
      <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/90 backdrop-blur-md" @click="showCreateModal = false"></div>
        
        <div class="bg-white w-full max-w-5xl rounded-[40px] shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
          <!-- Modal Header -->
          <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/20">
                <Send size="24" />
              </div>
              <div class="flex flex-col">
                <h2 class="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Draft Broadcast</h2>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Multi-Channel Communication Engine</p>
              </div>
            </div>
            <button 
              @click="showCreateModal = false"
              class="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-100"
            >
              <X size="20" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
              
              <!-- Left Side: Content & Creative -->
              <div class="space-y-8">
                <div>
                  <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
                    Campaign Creative
                  </h3>
                  
                  <div class="space-y-6">
                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Campaign Title</label>
                      <input 
                        v-model="form.title"
                        type="text" 
                        placeholder="e.g. Midnight Drop Live! 🌙" 
                        class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm"
                      />
                    </div>

                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Broadcast Message</label>
                      <textarea 
                        v-model="form.message"
                        rows="5"
                        placeholder="What do you want to tell your users?" 
                        class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm resize-none"
                      ></textarea>
                    </div>

                    <div class="space-y-2">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Visual Banner (Optional)</label>
                      <div 
                        class="relative h-56 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center group overflow-hidden transition-all hover:border-blue-300"
                        :class="{ 'opacity-50 pointer-events-none': isUploading }"
                      >
                        <input type="file" class="absolute inset-0 opacity-0 cursor-pointer z-10" @change="handleImageUpload" />
                        
                        <template v-if="form.imageUrl">
                          <img :src="adminStore.resolveImageUrl(form.imageUrl)" class="absolute inset-0 w-full h-full object-cover" />
                          <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p class="text-white text-[10px] font-black uppercase">Change Image</p>
                          </div>
                        </template>
                        <template v-else>
                          <UploadCloud class="text-slate-300 group-hover:text-blue-500 transition-all" size="32" />
                          <p class="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">Drop banner or Click</p>
                        </template>

                        <div v-if="isUploading" class="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                           <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right Side: Logistics & Targeting -->
              <div class="space-y-8">
                <!-- Audience -->
                <div class="bg-slate-50 rounded-[32px] p-8 border border-slate-100 italic-gradient">
                  <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Target size="18" class="text-rose-500" />
                    Target Audience
                  </h3>

                  <div class="grid grid-cols-3 gap-3 mb-6">
                    <button 
                      v-for="type in ['all', 'gender', 'single']"
                      :key="type"
                      @click="form.targetType = type; form.targetValue = ''"
                      class="px-3 py-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all"
                      :class="form.targetType === type ? 'bg-black border-black text-white' : 'bg-white border-white text-slate-400 hover:border-slate-200'"
                    >
                      {{ type }}
                    </button>
                  </div>

                  <div v-if="form.targetType === 'gender'" class="space-y-2 animate-in slide-in-from-top-2 duration-300">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Select Gender Segment</label>
                     <select v-model="form.targetValue" class="w-full bg-white border-2 border-transparent focus:border-black rounded-2xl p-4 text-sm font-black outline-none transition-all shadow-sm">
                       <option value="">Select Gender...</option>
                       <option value="Male">Men Only</option>
                       <option value="Female">Women Only</option>
                       <option value="Other">Other Segments</option>
                     </select>
                  </div>

                  <div v-if="form.targetType === 'single'" class="space-y-2 animate-in slide-in-from-top-2 duration-300">
                     <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Target User Email/ID</label>
                     <input 
                       v-model="form.targetValue"
                       type="text" 
                       placeholder="Enter customer identifier" 
                       class="w-full bg-white border-2 border-transparent focus:border-black rounded-2xl p-4 text-sm font-bold outline-none transition-all shadow-sm"
                     />
                  </div>
                </div>

                <!-- Channels -->
                <div class="bg-slate-950 rounded-[32px] p-8 text-white relative overflow-hidden">
                  <div class="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 blur-[60px] rounded-full -translate-y-16 translate-x-16"></div>
                  
                  <h3 class="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Smartphone size="18" class="text-blue-400" />
                    Delivery Channels
                  </h3>

                  <div class="flex flex-col gap-3">
                    <button 
                      @click="form.channels.includes('push') ? form.channels = form.channels.filter(c => c !== 'push') : form.channels.push('push')"
                      class="flex items-center justify-between p-4 rounded-2xl border-2 transition-all group"
                      :class="form.channels.includes('push') ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-800 text-slate-500'"
                    >
                      <div class="flex items-center gap-3">
                        <Smartphone size="20" :class="form.channels.includes('push') ? 'text-white' : 'text-slate-600'" />
                        <span class="text-sm font-black uppercase tracking-wider">Push Notification</span>
                      </div>
                      <CheckCircle2 v-if="form.channels.includes('push')" size="20" />
                    </button>

                    <button 
                      @click="form.channels.includes('email') ? form.channels = form.channels.filter(c => c !== 'email') : form.channels.push('email')"
                      class="flex items-center justify-between p-4 rounded-2xl border-2 transition-all group"
                      :class="form.channels.includes('email') ? 'bg-blue-600 border-blue-600' : 'bg-slate-900 border-slate-800 text-slate-500'"
                    >
                      <div class="flex items-center gap-3">
                        <Mail size="20" :class="form.channels.includes('email') ? 'text-white' : 'text-slate-600'" />
                        <span class="text-sm font-black uppercase tracking-wider">Direct Email</span>
                      </div>
                      <CheckCircle2 v-if="form.channels.includes('email')" size="20" />
                    </button>
                  </div>
                </div>

                <!-- Product Link -->
                <div class="space-y-4">
                  <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <ExternalLink size="18" class="text-blue-600" />
                    Store Redirect
                  </h3>
                   
                  <div v-if="form.product" class="flex items-center justify-between p-4 bg-white rounded-3xl border-2 border-blue-100 shadow-sm animate-in zoom-in-95 duration-200">
                    <div class="flex items-center gap-4">
                      <div class="w-14 h-14 rounded-xl overflow-hidden border border-slate-100">
                        <img :src="adminStore.resolveImageUrl(form.product.image || form.product.images?.[0])" class="w-full h-full object-cover" />
                      </div>
                      <div class="overflow-hidden">
                        <p class="text-sm font-black text-slate-900 truncate">{{ form.product.product_name }}</p>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ form.product.sku }}</p>
                      </div>
                    </div>
                    <button @click="form.product = null" class="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X size="20" /></button>
                  </div>
                  
                  <div v-else class="relative group">
                     <select 
                       class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl p-4 text-sm font-black outline-none transition-all appearance-none pr-12 shadow-sm"
                       @change="(e) => selectProduct(adminStore.products[e.target.selectedIndex - 1])"
                     >
                       <option value="">Select Product to promote...</option>
                       <option v-for="p in adminStore.products" :key="p.id" :value="p.id">{{ p.product_name }} ({{ p.sku }})</option>
                     </select>
                     <Plus size="20" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-8 py-6 bg-slate-50 flex items-center justify-between border-t border-slate-100 sticky bottom-0 z-20">
             <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic max-w-xs">
               Broadcast handles thousands of users via async processing queues.
             </p>
             <div class="flex items-center gap-4">
                <button 
                  @click="showCreateModal = false"
                  class="px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all font-mono"
                >
                  [ DISCARD ]
                </button>
                <button 
                  @click="sendBroadcast"
                  :disabled="isSubmitting"
                  class="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <Send v-if="!isSubmitting" size="20" />
                  <div v-else class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {{ isSubmitting ? 'DISPATCHING...' : 'INITIATE BROADCAST' }}
                </button>
             </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

.modal-enter-active, .modal-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.modal-enter-from, .modal-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
