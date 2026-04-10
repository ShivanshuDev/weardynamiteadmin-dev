<script setup>
import { ref, onMounted, watch } from 'vue'
import api from '../utils/api'
import { 
  Plus, Search, Filter, Layers, Mail, Building2, Phone, TrendingUp,
  Package, CheckCircle2, Clock, ChevronRight, MoreHorizontal
} from 'lucide-vue-next'

const inquiries = ref([])
const loading = ref(false)
const pageStack = ref([null]) // Stores LastEvaluatedKeys
const currentPageIndex = ref(0)
const hasNextPage = ref(false)
const filters = ref({
  status: '',
  orderType: ''
})

const stats = ref({
  total: 0,
  new: 0,
  completed: 0
})

const fetchInquiries = async (reset = false) => {
  loading.value = true
  if (reset) {
    pageStack.value = [null]
    currentPageIndex.value = 0
  }

  try {
    const params = {
      status: filters.value.status || undefined,
      orderType: filters.value.orderType || undefined,
      lastKey: pageStack.value[currentPageIndex.value] || undefined,
      limit: 7
    }
    
    const { data } = await api.get('/admin/bulk-orders', { params })
    
    inquiries.value = data.items
    hasNextPage.value = !!data.lastKey

    // If we're going forward and the next key isn't in stack yet, add it
    if (data.lastKey && currentPageIndex.value + 1 === pageStack.value.length) {
      pageStack.value.push(data.lastKey)
    }
    
    // Update stats only on reset
    if (reset) {
       stats.value.total = data.total || inquiries.value.length
       stats.value.new = inquiries.value.filter(i => i.status === 'New').length
       stats.value.completed = inquiries.value.filter(i => i.status === 'Completed').length
    }
  } catch (error) {
    console.error('Failed to fetch inquiries:', error)
  } finally {
    loading.value = false
  }
}

const nextPage = () => {
  if (hasNextPage.value) {
    currentPageIndex.value++
    fetchInquiries()
  }
}

const prevPage = () => {
  if (currentPageIndex.value > 0) {
    currentPageIndex.value--
    fetchInquiries()
  }
}

const updateStatus = async (inquiryId, newStatus) => {
  try {
    await api.patch(`/admin/inquiries/${inquiryId}/status`, { status: newStatus })
    const inquiry = inquiries.value.find(i => i.inquiryId === inquiryId)
    if (inquiry) inquiry.status = newStatus
  } catch (error) {
    console.error('Failed to update status:', error)
    alert('Failed to update status')
  }
}

onMounted(() => {
  fetchInquiries(true)
})

watch(() => [filters.value.status, filters.value.orderType], () => {
  fetchInquiries(true)
}, { deep: true })

const getOrderTypeLabel = (type) => {
  const labels = { team: 'Sports/Team', corporate: 'Corporate', school: 'Institutional', other: 'Event/Other' }
  return labels[type] || 'Other'
}

const getOrderTypeColor = (type) => {
  switch (type) {
    case 'team': return 'bg-orange-50 text-orange-600 border border-orange-100'
    case 'corporate': return 'bg-indigo-50 text-indigo-600 border border-indigo-100'
    case 'school': return 'bg-amber-50 text-amber-600 border border-amber-100'
    default: return 'bg-slate-50 text-slate-600 border border-slate-100'
  }
}

const formatDate = (ts) => {
  if (!ts) return 'N/A'
  const date = new Date(ts)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusColor = (status) => {
  switch (status) {
    case 'New': return 'bg-blue-500 text-white shadow-blue-500/20'
    case 'In Progress': return 'bg-amber-500 text-white shadow-amber-500/20'
    case 'Completed': return 'bg-emerald-500 text-white shadow-emerald-500/20'
    default: return 'bg-slate-500 text-white shadow-slate-500/20'
  }
}
</script>

<template>
  <div class="px-8 py-4 space-y-4 animate-in slide-in-from-bottom-4 duration-1000">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-4xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-3">
          Bulk Order <span class="text-blue-600">Leads</span>
        </h1>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
           <Package size="12" /> High-Scale Inquiry Portal
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-6">
          <div class="text-center">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total</p>
            <h3 class="text-xl font-black italic">{{ stats.total }}+</h3>
          </div>
          <div class="w-px h-8 bg-slate-100"></div>
          <div class="text-center">
            <p class="text-[9px] font-black uppercase text-blue-500 tracking-widest">New</p>
            <h3 class="text-xl font-black italic">{{ stats.new }}</h3>
          </div>
          <div class="w-px h-8 bg-slate-100"></div>
          <div class="text-center">
            <p class="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Done</p>
            <h3 class="text-xl font-black italic">{{ stats.completed }}</h3>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
      <div class="flex items-center gap-4 flex-1 w-full lg:max-w-2xl">
        <div class="relative flex-1 group">
          <Filter class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size="18" />
          <select v-model="filters.status" class="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all appearance-none cursor-pointer">
            <option value="">Filter by Status</option>
            <option value="New">New Inquiry</option>
            <option value="In Progress">Working On It</option>
            <option value="Completed">Completed Lead</option>
          </select>
        </div>
        <div class="relative flex-1 group">
          <Layers class="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size="18" />
          <select v-model="filters.orderType" class="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-14 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all appearance-none cursor-pointer">
            <option value="">Filter by Category</option>
            <option value="team">Sports/Team</option>
            <option value="corporate">Corporate</option>
            <option value="school">Institutional</option>
            <option value="other">Others</option>
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button class="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95 flex items-center gap-3">
          <TrendingUp size="16" /> Analytics
        </button>
      </div>
    </div>

    <!-- Data Table Container -->
    <div class="bg-white rounded border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[600px] flex flex-col">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50/50 border-b border-slate-100">
          <tr>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] w-12">#</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Organization / Team</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Primary Contact</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Date</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Qty Required</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Category</th>
            <th class="px-10 py-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] text-center">Workflow</th>
            <th class="px-10 py-6 w-12"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="(o, i) in inquiries" :key="o.inquiryId" class="group hover:bg-slate-50/50 transition-all duration-300">
            <td class="px-10 py-4 text-xs font-black text-slate-900">{{ (currentPageIndex * 7) + i + 1 }}</td>
            <td class="px-10 py-4">
              <div class="flex flex-col">
                <span class="text-sm font-black uppercase italic text-slate-900 tracking-tight transition-colors">{{ o.orgName }}</span>
                <div class="flex items-center gap-2 mt-1.5 opacity-60">
                  <Building2 size="12" class="text-blue-500" />
                  <span class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{{ o.fullName || 'Individual Contact' }}</span>
                </div>
              </div>
            </td>
            <td class="px-10 py-4">
              <div class="flex flex-col gap-1">
                <div class="flex items-center gap-3">
                  <div class="p-1 bg-blue-50 rounded-lg text-blue-600 transition-colors">
                    <Mail size="10" />
                  </div>
                  <span class="text-[11px] font-bold text-slate-700">{{ o.email }}</span>
                </div>
                <div class="flex items-center gap-3">
                  <div class="p-1 bg-slate-50 rounded-lg text-slate-400">
                    <Phone size="10" />
                  </div>
                  <span class="text-[11px] font-bold text-slate-500 tracking-tight">{{ o.phone }}</span>
                </div>
              </div>
            </td>
            <td class="px-10 py-4 text-center">
              <span class="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                {{ formatDate(o.createdAt) }}
              </span>
            </td>
            <td class="px-10 py-4 text-center">
              <div class="inline-flex flex-col items-center">
                <span class="px-4 py-1.5 bg-slate-100 rounded-2xl text-[12px] font-black font-mono text-slate-900 border border-slate-200/50">
                  {{ o.estimatedQty }}
                </span>
                <span class="text-[8px] font-black text-slate-300 uppercase mt-0.5 tracking-widest">Approx Units</span>
              </div>
            </td>
            <td class="px-10 py-4 text-center uppercase tracking-widest">
              <span :class="['px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all', getOrderTypeColor(o.orderType)]">
                {{ getOrderTypeLabel(o.orderType) }}
              </span>
            </td>
            <td class="px-10 py-4 text-center">
              <div class="relative inline-block w-40">
                <select 
                  :value="o.status" 
                  @change="updateStatus(o.inquiryId, $event.target.value)"
                  :class="['w-full text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-2xl border-none shadow-sm outline-none cursor-pointer appearance-none transition-all text-center', getStatusColor(o.status)]"
                >
                  <option value="New">New Inquiry</option>
                  <option value="In Progress">Working</option>
                  <option value="Completed">Finished</option>
                </select>
                <ChevronRight class="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-white pointer-events-none" size="14" />
              </div>
            </td>
            <td class="px-10 py-4 text-right">
              <button class="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all active:scale-90">
                <MoreHorizontal size="18" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div v-if="inquiries.length === 0 && !loading" class="flex-1 flex flex-col items-center justify-center py-32 text-slate-200">
        <Package size="120" stroke-width="0.5" class="mb-6 opacity-20" />
        <h3 class="text-xl font-black uppercase tracking-[0.3em]">No Leads Found</h3>
        <p class="text-[10px] font-bold uppercase tracking-widest mt-2 opacity-50">Adjust filters or check back later</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-20 flex flex-col items-center gap-6">
        <div class="w-12 h-12 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Synchronizing Data Hub...</span>
      </div>

      <!-- Pagination Controls -->
      <div class="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <div class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          Showing <span class="text-slate-900">{{ inquiries.length }}</span> records | Page <span class="text-blue-600">{{ currentPageIndex + 1 }}</span>
        </div>
        
        <div class="flex items-center gap-3">
          <button 
            @click="prevPage" 
            :disabled="currentPageIndex === 0 || loading"
            class="px-6 py-3 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:border-blue-600 disabled:opacity-30 transition-all flex items-center gap-2"
          >
            <ChevronRight class="rotate-180" size="14" /> Previous
          </button>

          <button 
            @click="nextPage" 
            :disabled="!hasNextPage || loading"
            class="px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black disabled:opacity-30 transition-all flex items-center gap-2"
          >
            Next <ChevronRight size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.italic {
  font-style: italic;
}
</style>
