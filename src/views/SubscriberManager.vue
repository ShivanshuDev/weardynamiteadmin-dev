<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Users, Download, Trash2, Mail, Calendar, 
  CheckCircle2, XCircle, Clock, Zap, TrendingUp, 
  Phone, Activity, Tag, FileText, Table as FileSpreadsheet, 
  ChevronLeft, ChevronRight, Search, Filter, RefreshCw, BarChart3, UserCheck
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import api from '../utils/api'

const adminStore = useAdminStore()
const loading = ref(true)

// Utility: Date Formatting
const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Filter State
const searchQuery = ref('')
const statusFilter = ref('All')

onMounted(async () => {
  loading.value = true
  await adminStore.fetchSubscribers()
  loading.value = false
})

const filteredSubscribers = computed(() => {
  return adminStore.subscribers.filter(s => {
    const matchesSearch = 
      (s.email || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (s.name || '').toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (s.phone || '').includes(searchQuery.value)
      
    const matchesStatus = statusFilter.value === 'All' || s.emailStatus === statusFilter.value
    
    return matchesSearch && matchesStatus
  })
})

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = computed(() => Math.ceil(filteredSubscribers.value.length / itemsPerPage))
const paginatedSubscribers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredSubscribers.value.slice(start, start + itemsPerPage)
})

// Export Logic (Institutional Logic Restored)
const exportSubscribersToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  const now = new Date()
  const dateStr = formatDate(now)
  const dataset = filteredSubscribers.value

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('DYNAMITE CLUB VIP MANIFEST', 12, 18)
  
  // Table Meta
  doc.setFontSize(10)
  doc.text(`Total Verified Profiles: ${dataset.length}`, 12, 28)
  doc.text(`Generation Date: ${dateStr}`, 12, 34)

  // Simple High-Fidelity Table
  let currentY = 45
  doc.setFillColor(15, 23, 42)
  doc.rect(10, currentY, 277, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.text(['#', 'NAME', 'EMAIL', 'PHONE', 'STATUS', 'JOINED'], 15, currentY + 7)
  
  currentY += 10
  dataset.forEach((sub, i) => {
    doc.setTextColor(50, 50, 50)
    doc.text([
      String(i+1),
      String(sub.name || 'VIP').substring(0, 20),
      String(sub.email).substring(0, 30),
      String(sub.phone || 'N/A'),
      String(sub.emailStatus || 'Pending'),
      formatDate(sub.subscribedDate)
    ], 15, currentY + 7)
    currentY += 8
    if (currentY > 180) {
      doc.addPage()
      currentY = 20
    }
  })

  doc.save(`Dynamite_VIP_Manifest_${Date.now()}.pdf`)
}

const exportToExcel = () => {
  const dataset = filteredSubscribers.value
  let csv = 'Name,Email,Phone,Joined Date,Email Status\n'
  dataset.forEach(s => {
    csv += `${s.name},${s.email},${s.phone},${s.subscribedDate},${s.emailStatus}\n`
  })
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.setAttribute('href', url)
  a.setAttribute('download', `Subscribers_${Date.now()}.csv`)
  a.click()
}
</script>

<template>
  <div class="subscribers-view p-8">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
      <div>
        <div class="flex items-center gap-3 mb-2">
            <div class="p-2 bg-blue-600 rounded-lg text-white">
                <Users size="20" />
            </div>
            <h1 class="text-2xl font-black uppercase tracking-tighter">Dynamite Club</h1>
        </div>
        <p class="text-slate-400 text-sm font-medium">Manage your VIP community and monitor confirmation delivery.</p>
      </div>

      <div class="flex items-center gap-3">
        <button @click="adminStore.fetchSubscribers" class="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
          <RefreshCw size="18" :class="{ 'animate-spin': adminStore.loading }" />
        </button>
        <button @click="exportToExcel" class="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10">
          <FileSpreadsheet size="14" />
          Excel Export
        </button>
        <button @click="exportSubscribersToPDF" class="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-900/10">
          <FileText size="14" />
          PDF Manifest
        </button>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div class="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Members</p>
            <h3 class="text-3xl font-black">{{ adminStore.subscribers.length }}</h3>
        </div>
        <div class="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Successfully Verified</p>
            <h3 class="text-3xl font-black text-emerald-600">
                {{ adminStore.subscribers.filter(s => s.emailStatus === 'Sent').length }}
            </h3>
        </div>
        <div class="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Failed Deliveries</p>
            <h3 class="text-3xl font-black text-red-600">
                {{ adminStore.subscribers.filter(s => s.emailStatus === 'Failed').length }}
            </h3>
        </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="18" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name, email or phone..." 
          class="w-full pl-12 pr-4 py-3 bg-white border border-transparent focus:border-black rounded-xl outline-none font-bold text-sm transition-all shadow-sm"
        />
      </div>
      
      <div class="flex items-center gap-3">
        <select v-model="statusFilter" class="px-4 py-3 bg-white border border-transparent focus:border-black rounded-xl outline-none font-bold text-sm shadow-sm">
          <option value="All">All Delivery Status</option>
          <option value="Sent">Sent</option>
          <option value="Pending">Pending</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
    </div>

    <!-- Main Table Card -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-slate-50/50 border-b border-slate-100">
                        <th class="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Member Identity</th>
                        <th class="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Point</th>
                        <th class="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Arrival Date</th>
                        <th class="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Delivery Status</th>
                        <th class="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Platform Origin</th>
                    </tr>
                </thead>
                <tbody v-if="!adminStore.loading && paginatedSubscribers.length > 0">
                    <tr v-for="subscriber in paginatedSubscribers" :key="subscriber.email" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                        <td class="px-8 py-6">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-black group-hover:text-white transition-all font-black text-xs uppercase">
                                    {{ subscriber.name?.substring(0, 2) || 'VIP' }}
                                </div>
                                <div>
                                    <h4 class="font-black text-sm uppercase tracking-tight">{{ subscriber.name }}</h4>
                                    <div class="flex items-center gap-1 text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                                        <UserCheck size="10" /> VERIFIED VIP
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Mail size="14" class="text-slate-300" />
                                    {{ subscriber.email }}
                                </div>
                                <div class="flex items-center gap-2 text-[11px] font-medium text-slate-400">
                                    <Phone size="14" class="text-slate-300" />
                                    {{ subscriber.phone || 'N/A' }}
                                </div>
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <div class="flex items-center gap-2 text-sm font-bold text-slate-500">
                                <Calendar size="14" class="text-slate-300" />
                                {{ formatDate(subscriber.subscribedDate || subscriber.createdAt) }}
                            </div>
                        </td>
                        <td class="px-8 py-6">
                            <div class="flex justify-center">
                                <div 
                                    v-if="subscriber.emailStatus === 'Sent'" 
                                    class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                >
                                    <CheckCircle2 size="14" />
                                    Sent Successfully
                                </div>
                                <div 
                                    v-else-if="subscriber.emailStatus === 'Failed'" 
                                    class="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest cursor-help"
                                    :title="subscriber.deliveryError"
                                >
                                    <XCircle size="14" />
                                    Failed Dispatch
                                </div>
                                <div 
                                    v-else 
                                    class="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Clock size="14" />
                                    Pending Send
                                </div>
                            </div>
                        </td>
                        <td class="px-8 py-6 text-right pr-12">
                            <span class="px-3 py-1 bg-slate-100 rounded text-[9px] font-black uppercase tracking-widest text-slate-500">
                                {{ subscriber.source || 'Desktop Web' }}
                            </span>
                        </td>
                    </tr>
                </tbody>
                <!-- Loading & Empty States -->
                <tbody v-else-if="adminStore.loading">
                    <tr v-for="i in 5" :key="i">
                        <td colspan="5" class="px-8 py-6">
                            <div class="h-12 bg-slate-50 rounded-xl animate-pulse"></div>
                        </td>
                    </tr>
                </tbody>
                <tbody v-else>
                    <tr>
                        <td colspan="5" class="py-32 text-center">
                            <div class="max-w-xs mx-auto">
                                <Users size="48" class="mx-auto text-slate-200 mb-6" />
                                <h3 class="text-lg font-black uppercase tracking-tighter text-slate-400 leading-none">The Vault is Empty</h3>
                                <p class="text-slate-300 text-xs mt-2 uppercase font-bold tracking-widest">No matching subscribers found in the archives</p>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination Bar -->
        <div v-if="totalPages > 1" class="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">
                Manifest View: {{ ((currentPage-1) * itemsPerPage) + 1 }}-{{ Math.min(currentPage * itemsPerPage, filteredSubscribers.length) }} of {{ filteredSubscribers.length }} VIP Profiles
            </p>
            <div class="flex items-center gap-4">
                <button 
                    @click="currentPage--" 
                    :disabled="currentPage === 1"
                    class="p-2.5 bg-white rounded-xl border border-slate-200 disabled:opacity-30 transition-all hover:bg-slate-50 shadow-sm"
                >
                    <ChevronLeft size="18" />
                </button>
                <div class="flex items-center gap-2 font-black text-xs px-4 text-slate-900 bg-white border border-slate-100 px-4 py-2 rounded-xl">
                   PAGE {{ currentPage }} <span class="text-slate-300 mx-1">/</span> {{ totalPages }}
                </div>
                <button 
                    @click="currentPage++" 
                    :disabled="currentPage === totalPages"
                    class="p-2.5 bg-white rounded-xl border border-slate-200 disabled:opacity-30 transition-all hover:bg-slate-50 shadow-sm"
                >
                    <ChevronRight size="18" />
                </button>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.subscribers-view {
  animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
