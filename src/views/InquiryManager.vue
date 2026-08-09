<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { Mail, Trash2, CheckCircle, MessageSquare, Clock, User, X, Phone, Calendar, ChevronRight, Download, FileJson } from 'lucide-vue-next'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const adminStore = useAdminStore()
const showDetails = ref(false)
const selectedInquiry = ref(null)
const isSaving = ref(false)
const currentTab = ref('All')
const tabs = ['All', 'Active', 'In Progress', 'On Hold', 'Resolved']

const downloadPDF = () => {
   // Switch to Landscape orientation to fit full message content
   const doc = new jsPDF('l', 'mm', 'a4')
   
   const tableData = filteredInquiries.value.map(i => [
     i.name || i.fullName,
     i.email,
     i.mobile || i.phone,
     i.status,
     i.message, // Removed truncation to show full customer narrative
     i.date || (i.createdAt ? new Date(i.createdAt).toLocaleDateString() : 'N/A')
   ])

   doc.text('WearDynamite - Inquiry Report', 14, 15)
   
   // Use standalone autoTable function for better compatibility
   autoTable(doc, {
     head: [['Name', 'Email', 'Mobile', 'Status', 'Message', 'Date']],
     body: tableData,
     startY: 20,
     theme: 'grid',
     headStyles: { fillColor: [0, 0, 0] }
   })
   
   doc.save(`Inquiries_${currentTab.value}_${new Date().toLocaleDateString()}.pdf`)
}

const downloadExcel = () => {
   const worksheet = XLSX.utils.json_to_sheet(filteredInquiries.value.map(i => ({
     Name: i.name || i.fullName,
     Email: i.email,
     Mobile: i.mobile || i.phone,
     Status: i.status,
     Message: i.message,
     Date: i.date || (i.createdAt ? new Date(i.createdAt).toLocaleDateString() : 'N/A')
   })))
   const workbook = XLSX.utils.book_new()
   XLSX.utils.book_append_sheet(workbook, worksheet, 'Inquiries')
   XLSX.writeFile(workbook, `Inquiries_${currentTab.value}_${new Date().toLocaleDateString()}.xlsx`)
}

const filteredInquiries = computed(() => {
  if (currentTab.value === 'All') return adminStore.inquiries
  return adminStore.inquiries.filter(i => i.status === currentTab.value)
})

const openInquiry = (inquiry) => {
  selectedInquiry.value = { ...inquiry }
  showDetails.value = true
}

const updateStatus = async (newStatus) => {
  if (!selectedInquiry.value || isSaving.value) return
  
  isSaving.value = true
  try {
    const targetId = selectedInquiry.value.id || selectedInquiry.value.inquiryId
    console.log(`[UI SYNC] Updating status for ${targetId} to ${newStatus}...`)
    
    // 1. Wait for actual API resolution
    await adminStore.updateInquiryStatus(targetId, newStatus)
    
    // 2. Synchronize local modal state
    selectedInquiry.value.status = newStatus
    
    // 3. Graceful closure only after absolute success
    setTimeout(() => {
      showDetails.value = false
      selectedInquiry.value = null
      isSaving.value = false
    }, 600) // Slightly longer for visual confirmation of the status change
    
  } catch (error) {
    console.error('Workflow interrupted during sync:', error)
    isSaving.value = false
  }
}

onMounted(() => {
  adminStore.fetchInquiries()
})
</script>

<template>
  <div class="space-y-6 relative min-h-screen">
    <!-- UI Status Overlay -->
    <div v-if="adminStore.error" class="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
      <div class="flex items-center gap-4">
         <div class="bg-red-500 text-white p-2 rounded-xl"><Mail size="20" class="animate-pulse"/></div>
         <p class="text-xs font-bold text-red-600 uppercase tracking-widest">{{ adminStore.error }}</p>
      </div>
      <button @click="adminStore.fetchInquiries" class="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">Retry Sync</button>
    </div>
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Inquiry Inbox</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Manage Customer Messages & Leads</p>
      </div>
      <div class="flex gap-4">
         <button 
          @click="downloadExcel"
          class="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
         >
           <Download size="14"/> Export Excel
         </button>
         <button 
          @click="downloadPDF"
          class="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
         >
           <Download size="14"/> Export PDF
         </button>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
       <div class="bg-white p-4 rounded-[3px] border border-slate-100 flex items-center gap-4 shadow-sm">
          <div class="bg-blue-50 text-blue-600 p-2.5 rounded-xl"><MessageSquare size="20"/></div>
          <div>
            <p class="text-[9px] font-black uppercase text-slate-400">Total Leads</p>
            <h3 class="text-xl font-black">{{ adminStore.inquiries.length }}</h3>
          </div>
       </div>
       <div class="bg-white p-4 rounded-[3px] border border-slate-100 flex items-center gap-4 shadow-sm">
          <div class="bg-orange-50 text-orange-600 p-2.5 rounded-xl"><Clock size="20"/></div>
          <div>
            <p class="text-[9px] font-black uppercase text-slate-400">Active Contacts</p>
            <h3 class="text-xl font-black">{{ adminStore.inquiries.filter(i => i.status === 'Active').length }}</h3>
          </div>
       </div>
       <div class="bg-white p-4 rounded-[3px] border border-slate-100 flex items-center gap-4 shadow-sm">
          <div class="bg-purple-50 text-purple-600 p-2.5 rounded-xl"><Clock size="20"/></div>
          <div>
            <p class="text-[9px] font-black uppercase text-slate-400">In Progress</p>
            <h3 class="text-xl font-black">{{ adminStore.inquiries.filter(i => i.status === 'In Progress').length }}</h3>
          </div>
       </div>
       <div class="bg-white p-4 rounded-[3px] border border-slate-100 flex items-center gap-4 shadow-sm">
          <div class="bg-amber-50 text-amber-600 p-2.5 rounded-xl"><Clock size="20"/></div>
          <div>
            <p class="text-[9px] font-black uppercase text-slate-400">On Hold</p>
            <h3 class="text-xl font-black">{{ adminStore.inquiries.filter(i => i.status === 'On Hold').length }}</h3>
          </div>
       </div>
       <div class="bg-white p-4 rounded-[3px] border border-slate-100 flex items-center gap-4 shadow-sm">
          <div class="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl"><CheckCircle size="20"/></div>
          <div>
            <p class="text-[9px] font-black uppercase text-slate-400">Resolved</p>
            <h3 class="text-xl font-black">{{ adminStore.inquiries.filter(i => i.status === 'Resolved').length }}</h3>
          </div>
       </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-8 border-b border-slate-100 mb-0">
       <button 
        v-for="tab in tabs" 
        :key="tab"
        @click="currentTab = tab"
        class="pb-4 px-2 text-[10px] font-black uppercase tracking-[0.2em] relative transition-all"
        :class="currentTab === tab ? 'text-black' : 'text-slate-400 hover:text-slate-600'"
       >
         {{ tab }}
         <div v-if="currentTab === tab" class="absolute bottom-0 left-0 w-full h-1 bg-black animate-in fade-in slide-in-from-bottom-1"></div>
       </button>
    </div>

    <!-- Inquiry List (Scrollable Container) -->
    <div class="space-y-3 max-h-[640px] overflow-y-auto pr-2 custom-scrollbar -mt-1 pt-4">
       <!-- Loading Skeletons -->
       <template v-if="adminStore.loading && !filteredInquiries.length">
         <div v-for="i in 3" :key="i" class="bg-white p-6 rounded-[3px] border border-slate-100 shadow-sm animate-pulse flex items-center gap-6">
            <div class="w-12 h-12 bg-slate-100 rounded-2xl"></div>
            <div class="space-y-3 flex-1">
               <div class="h-3 w-32 bg-slate-100 rounded"></div>
               <div class="h-2 w-64 bg-slate-50 rounded"></div>
            </div>
         </div>
       </template>

       <!-- Empty State -->
       <div v-else-if="!filteredInquiries.length" class="py-24 bg-white border border-slate-100 rounded-[3px] flex flex-col items-center justify-center space-y-4">
          <div class="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
             <MessageSquare size="32" />
          </div>
          <div class="text-center">
             <h3 class="text-sm font-black uppercase tracking-widest text-slate-900">Inbox is Clear</h3>
             <p class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">No inquiries match the current filter criteria</p>
          </div>
          <button @click="currentTab = 'All'" class="text-[10px] font-black text-blue-600 uppercase tracking-widest underline decoration-2 underline-offset-4">Show All Messages</button>
       </div>

       <div 
        v-for="inquiry in filteredInquiries" 
        :key="inquiry.id"
        @click="openInquiry(inquiry)"
        class="bg-white px-5 py-3 rounded-[3px] border border-slate-100 shadow-sm hover:shadow-lg hover:border-blue-100 transition-all group cursor-pointer relative"
       >
         <div v-if="inquiry.status === 'Active'" class="absolute left-0 top-0 w-1.5 h-full bg-blue-600"></div>
         
         <div class="flex items-center gap-6">
            <!-- User Info (Fixed Width) -->
            <div class="flex items-center gap-4 w-64 shrink-0">
               <div class="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                  <User size="20" />
               </div>
               <div class="min-w-0">
                  <h3 class="text-[13px] font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">{{ inquiry.name || inquiry.fullName }}</h3>
                  <div class="flex items-center gap-2">
                    <span 
                      class="text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest border"
                      :class="{
                        'bg-blue-50 text-blue-600 border-blue-100': inquiry.status === 'Active',
                        'bg-purple-50 text-purple-600 border-purple-100': inquiry.status === 'In Progress',
                        'bg-amber-50 text-amber-600 border-amber-100': inquiry.status === 'On Hold',
                        'bg-emerald-50 text-emerald-600 border-emerald-100': inquiry.status === 'Resolved',
                        'bg-slate-50 text-slate-400 border-slate-100': inquiry.status === 'Read'
                      }"
                    >
                      {{ inquiry.status }}
                    </span>
                  </div>
               </div>
            </div>

            <!-- Metadata (Email/Phone) -->
            <div class="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-72 shrink-0">
               <div class="flex items-center gap-2 truncate"><Mail size="12" class="text-slate-300"/> {{ inquiry.email }}</div>
               <div class="flex items-center gap-2 shrink-0"><Phone size="12" class="text-slate-300"/> {{ inquiry.mobile || inquiry.phone }}</div>
            </div>

            <!-- Message Preview (Flexible) -->
            <div class="flex-1 min-w-0 px-4">
              <p class="text-xs font-medium text-slate-500 italic truncate border-l-2 border-slate-100 pl-4 group-hover:border-blue-200 transition-colors">
                "{{ inquiry.message }}"
              </p>
            </div>

            <!-- Date & Actions -->
            <div class="flex items-center gap-8 shrink-0">
               <div class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase"><Calendar size="12" class="text-slate-300"/> {{ inquiry.date || inquiry.createdAt ? new Date(inquiry.createdAt).toLocaleDateString() : 'Today' }}</div>
               <div class="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <button 
                    @click.stop="adminStore.deleteInquiry(inquiry.id)"
                    class="bg-red-50 text-red-500 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                    title="Purge Inquiry"
                  >
                    <Trash2 size="14" />
                  </button>
                  <ChevronRight size="18" class="text-slate-200" />
               </div>
            </div>
         </div>
       </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showDetails" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
       <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm shadow-inner" @click="showDetails = false"></div>
       <div class="relative bg-white w-full max-w-2xl rounded-[3px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
          <!-- Modal Header -->
          <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
             <div class="flex items-center gap-5">
                <div class="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <User size="28"/>
                </div>
                <div>
                  <h2 class="text-xl font-black italic uppercase tracking-tighter">{{ selectedInquiry?.name }}</h2>
                  <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Corporate Inquiry Trace</p>
                </div>
             </div>
             <button @click="showDetails = false" class="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-black shadow-sm">
                <X size="24" />
             </button>
          </div>

          <!-- Modal Body -->
          <div class="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
             <div class="bg-blue-600/5 p-8 rounded-3xl border border-blue-100/50 flex items-center justify-between relative overflow-hidden">
                <!-- Saving Overlay -->
                <div v-if="isSaving" class="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex items-center justify-center animate-in fade-in duration-300">
                   <div class="flex items-center gap-3">
                      <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Synchronizing Data...</span>
                   </div>
                </div>

                <div>
                   <p class="text-[9px] font-black uppercase text-blue-900 tracking-widest mb-1">Current Lifecycle Phase</p>
                   <div class="flex items-center gap-2">
                       <span class="w-2 h-2 rounded-full animate-pulse" :class="selectedInquiry?.status === 'Resolved' ? 'bg-emerald-500' : 'bg-blue-500'"></span>
                       <span class="text-sm font-black text-blue-600 uppercase">{{ selectedInquiry?.status }}</span>
                   </div>
                </div>
                <div class="flex items-center gap-2">
                   <select 
                    :value="selectedInquiry?.status"
                    :disabled="isSaving"
                    @change="updateStatus($event.target.value)"
                    class="bg-white border border-blue-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-900 outline-none cursor-pointer hover:border-blue-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-wait"
                   >
                      <option>Active</option>
                      <option>In Progress</option>
                      <option>On Hold</option>
                      <option>Resolved</option>
                   </select>
                </div>
             </div>

             <!-- Contact Details Grid -->
             <div class="grid grid-cols-2 gap-8">
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase text-slate-400">Electronic Mail</label>
                   <p class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{{ selectedInquiry?.email }}</p>
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase text-slate-400">Mobile Identity</label>
                   <p class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{{ selectedInquiry?.mobile || selectedInquiry?.phone }}</p>
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase text-slate-400">Interaction Date</label>
                   <p class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{{ selectedInquiry?.date }}</p>
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase text-slate-400">Lead Classification</label>
                   <p class="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">{{ selectedInquiry?.subject || 'Direct Message' }}</p>
                </div>
             </div>

             <!-- Narrative Section -->
             <div class="space-y-4 pt-4 border-t border-slate-100">
                <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                  <MessageSquare size="14" class="text-blue-600"/> Customer Narrative
                </label>
                <div class="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                   <p class="text-base font-medium leading-relaxed italic text-slate-700">"{{ selectedInquiry?.message }}"</p>
                </div>
             </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size="12"/> Last Synchronized: Today, 00:20 AM
              </p>
              <div class="flex items-center gap-4">
                 <button @click="showDetails = false" class="px-8 py-3 bg-white border border-slate-200 rounded-[3px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all font-mono">Dismiss Trace</button>
                 <button class="px-8 py-3 bg-black text-white rounded-[3px] text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-black/10">Initiate Response</button>
              </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
