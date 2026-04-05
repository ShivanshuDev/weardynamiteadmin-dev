<script setup>
import { onMounted, ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { UserPlus, Download, Trash2, Mail, Calendar, Users, Zap, TrendingUp, Phone, Activity, Tag, FileText, Table as FileSpreadsheet, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import AnalyticsModal from '../components/AnalyticsModal.vue'

const adminStore = useAdminStore()

// CRM State
const itemsPerPage = 8
const currentPage = ref(1)
const showAnalyticsModal = ref(false)

// Filter State
const searchQuery = ref('')
const selectedInterest = ref('')
const selectedSource = ref('')
const startDate = ref('')
const endDate = ref('')

onMounted(() => {
  adminStore.fetchSubscribers()
})

// Utility: Parse DD-MM-YYYY to Date
const parseDate = (dStr) => {
  if (!dStr) return new Date(0)
  const [d, m, y] = dStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Logic: Latest First + Filtered
const filteredSubscribers = computed(() => {
  let list = [...adminStore.subscribers]
  
  // Sorting: Latest Join Date First
  list.sort((a, b) => parseDate(b.subscribedDate) - parseDate(a.subscribedDate))
  
  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => 
      (s.name?.toLowerCase() || '').includes(q) || 
      (s.email?.toLowerCase() || '').includes(q) || 
      (s.phone || '').includes(q)
    )
  }
  
  // Filter: Interest
  if (selectedInterest.value) {
    list = list.filter(s => (s.interests || []).includes(selectedInterest.value))
  }
  
  // Filter: Source
  if (selectedSource.value) {
    list = list.filter(s => s.source === selectedSource.value)
  }
  
  // Filter: Date Range
  if (startDate.value) {
    list = list.filter(s => parseDate(s.subscribedDate) >= new Date(startDate.value))
  }
  if (endDate.value) {
    list = list.filter(s => parseDate(s.subscribedDate) <= new Date(endDate.value))
  }
  
  return list
})

// Pagination Logic
const paginatedSubscribers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredSubscribers.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(filteredSubscribers.value.length / itemsPerPage))

const availableInterests = computed(() => {
  const all = adminStore.subscribers.flatMap(s => s.interests)
  return [...new Set(all)].sort()
})

const availableSources = computed(() => {
  return [...new Set(adminStore.subscribers.map(s => s.source))].sort()
})

const exportSubscribersToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
  const dataset = filteredSubscribers.value

  const drawBranding = (pageNo, totalPages) => {
    // Branding only on first page
    if (pageNo === 1) {
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bolditalic')
      doc.text('DYNAMITE CLUB', 12, 18)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('VIP COMMUNITY ANALYTICAL MANIFEST', 12, 26)
      doc.text(`Generated: ${dateStr}`, 285, 26, { align: 'right' })
    }

    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${pageNo} of ${totalPages}`, 285, 12, { align: 'right' })
  }

  // Calculate Total Pages (pre-run)
  let rowCount = 0
  let pageEstimate = 1
  dataset.forEach(() => {
    rowCount++
    if (rowCount > 18) { rowCount = 0; pageEstimate++ }
  })
  pageEstimate += 1 // For summary page

  // Table Setup
  const startY = 35
  const colX = [10, 18, 55, 100, 140, 180, 215, 250]
  const headers = ['#', 'ID', 'NAME / IDENTITY', 'EMAIL / CONTACT', 'PHONE', 'INTERESTS', 'LAST ACTIVE', 'SOURCE']

  let currentY = startY
  let currentPage = 1

  const drawTableHeader = (y) => {
    doc.setFillColor(15, 23, 42)
    doc.rect(10, y, 277, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    headers.forEach((h, i) => doc.text(h, colX[i] + 2, y + 6))
  }

  drawBranding(currentPage, pageEstimate)
  drawTableHeader(currentY)
  currentY += 10

  dataset.forEach((sub, idx) => {
    if (currentY > 180) {
      doc.addPage()
      currentPage++
      currentY = 35
      drawBranding(currentPage, pageEstimate)
      drawTableHeader(currentY - 10)
    }
    
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'normal')
    const data = [idx + 1, sub.id, sub.name, sub.email, sub.phone, sub.interests.join(', '), sub.lastActive, sub.source]
    data.forEach((d, i) => {
      doc.text(String(d), colX[i] + 2, currentY + 6)
      doc.setDrawColor(241, 245, 249).line(colX[i], currentY, colX[i], currentY + 8)
    })
    doc.line(10, currentY + 8, 287, currentY + 8).line(287, currentY, 287, currentY + 8)
    currentY += 8
  })

  // Executive Analytical Summary Page
  doc.addPage()
  currentPage++
  drawBranding(currentPage, pageEstimate)
  
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text('EXECUTIVE ANALYTICAL SUMMARY', 12, 45)
  doc.setDrawColor(15, 23, 42).line(12, 48, 285, 48)

  // Distribution by Source (Analytical Table)
  const sourceStats = {}
  dataset.forEach(s => sourceStats[s.source] = (sourceStats[s.source] || 0) + 1)
  
  doc.setFontSize(10).text('LEAD SOURCE ATTRIBUTION', 12, 60)
  let statsY = 68
  doc.setFillColor(248, 250, 252).rect(12, statsY - 5, 80, 8 * Object.keys(sourceStats).length + 5, 'F')
  Object.keys(sourceStats).sort().forEach(src => {
    doc.setTextColor(100, 116, 139).text(src, 15, statsY)
    doc.setTextColor(15, 23, 42).text(`${sourceStats[src]} Subscribers`, 60, statsY)
    statsY += 8
  })

  // Interest Cluster Analytics
  const interestStats = {}
  dataset.forEach(s => s.interests.forEach(i => interestStats[i] = (interestStats[i] || 0) + 1))
  
  doc.setTextColor(15, 23, 42).text('AESTHETIC INTEREST CLUSTERING', 110, 60)
  statsY = 68
  doc.setFillColor(248, 250, 252).rect(110, statsY - 5, 80, 8 * Object.keys(interestStats).length + 5, 'F')
  Object.keys(interestStats).sort().forEach(intr => {
    doc.setTextColor(100, 116, 139).text(intr, 113, statsY)
    doc.setTextColor(15, 23, 42).text(`${interestStats[intr]} Accounts`, 158, statsY)
    statsY += 8
  })

  // Retention Pulse Manifest
  const total = dataset.length
  doc.setTextColor(15, 23, 42).text('COMMUNITY HEALTH METRICS', 210, 60)
  doc.setFontSize(30).text(`${total}`, 210, 78)
  doc.setFontSize(9).setTextColor(100, 116, 139).text('TOTAL VIP AUDIENCE', 210, 84).text('100% RETENTION PULSE', 210, 89)

  doc.save(`Dynamite_Club_Analytical_Manifest_${dateStr}.pdf`)
}

const exportSubscribersToExcel = () => {
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
  const dataset = filteredSubscribers.value
  
  let html = `<html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; border: 1px solid #cbd5e1; font-family: sans-serif; } th { background-color: #1e293b; color: white; padding: 12px; font-size: 14px; text-transform: uppercase; border: 1px solid #0f172a; } td { padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; } .header-title { font-size: 28px; font-weight: bold; color: #0f172a; margin-bottom: 2px; } .header-meta { font-size: 14px; color: #64748b; margin-bottom: 25px; border-bottom: 2px solid #1e293b; padding-bottom: 10px; } .summary-box { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }</style></head><body><div class="header-title">DYNAMITE CLUB</div><div class="header-meta">VIP COMMUNITY ANALYTICAL MANIFEST | Generated: ${dateStr}</div><div class="summary-box"><strong>EXECUTIVE SUMMARY:</strong> Total Verified Profiles: ${dataset.length} | Audit Period: Institutional Standard FY24</div><table><thead><tr><th>#</th><th>Sub ID</th><th>Subscriber Name</th><th>Email / Identity</th><th>Phone</th><th>Aesthetic Interests</th><th>Last Active</th><th>Lead Source</th></tr></thead><tbody>`
  dataset.forEach((sub, idx) => {
    html += `<tr><td>${idx + 1}</td><td>${sub.id}</td><td><b>${sub.name}</b></td><td>${sub.email}</td><td>${sub.phone}</td><td>${sub.interests.join(', ')}</td><td>${sub.lastActive}</td><td>${sub.source}</td></tr>`
  })
  html += `</tbody></table><div style="margin-top:20px; font-size:10px; color:#64748b; text-align:right;">Dynamite Pro Administrative CRM System Export</div></body></html>`
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = `Dynamite_Club_Excel_Export_${dateStr}.xls`; link.click()
}
</script>

<template>
  <div class="space-y-4 relative min-h-screen">
    <!-- UI Status Overlay -->
    <div v-if="adminStore.error" class="bg-red-50 border border-red-100 p-6 rounded-3xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
      <div class="flex items-center gap-4">
         <div class="bg-red-500 text-white p-2 rounded-xl"><Activity size="20" class="animate-pulse"/></div>
         <p class="text-xs font-bold text-red-600 uppercase tracking-widest">{{ adminStore.error }}</p>
      </div>
      <button @click="adminStore.fetchSubscribers" class="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-red-100 hover:bg-red-600 hover:text-white transition-all">Retry Sync</button>
    </div>
    <!-- Compact Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 italic uppercase leading-none">Dynamite Club</h1>
        <p class="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">Institutional VIP Community CRM</p>
      </div>
      <div class="flex gap-2">
        <button @click="showAnalyticsModal = true" class="bg-white text-slate-900 border border-slate-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm active:scale-95">
          <BarChart3 size="14" class="text-blue-600" /> VIEW ANALYTICS
        </button>
        <button @click="exportSubscribersToExcel" class="bg-emerald-600/10 text-emerald-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100 flex items-center gap-2">
          <FileSpreadsheet size="14" /> EXCEL
        </button>
        <button @click="exportSubscribersToPDF" class="bg-blue-600/10 text-blue-600 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-2">
          <FileText size="14" /> PDF
        </button>
      </div>
    </div>

    <!-- Institutional Stats Manifold (Compressed) -->
    <div class="bg-white border border-slate-100 rounded-2xl shadow-sm flex items-stretch divide-x divide-slate-50 overflow-hidden h-16">
       <div class="flex-1 px-5 flex items-center gap-3">
          <div class="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center"><Users size="16" /></div>
          <div><p class="text-[8px] font-black uppercase text-slate-400 leading-none">Audience</p><h2 class="text-xl font-black tracking-tighter text-slate-900">{{ filteredSubscribers.length }}</h2></div>
       </div>
       <div class="flex-1 px-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
             <div class="w-8 h-8 bg-[#0f172a] text-blue-400 rounded-lg flex items-center justify-center"><Zap size="16" /></div>
             <div><p class="text-[8px] font-black uppercase text-slate-400 leading-none">Growth</p><h2 class="text-xl font-black tracking-tighter text-slate-900">+12.5%</h2></div>
          </div>
          <div class="flex items-end gap-0.5 h-6">
             <div v-for="h in [2,4,8,6,10]" :key="h" :style="{height: h+'px'}" class="w-1 bg-blue-500 rounded-full"></div>
          </div>
       </div>
       <div class="flex-1 px-5 flex items-center gap-3">
          <div class="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center border border-slate-100"><Activity size="16" /></div>
          <div><p class="text-[8px] font-black uppercase text-slate-400 leading-none">Pulse</p><h2 class="text-xl font-black tracking-tighter text-slate-900">94.2%</h2></div>
       </div>
    </div>

    <!-- Filtering Manifold (High-Density) -->
    <div class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm flex flex-wrap gap-2 items-center">
       <div class="relative flex-1 min-w-[200px]">
          <Search size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="Search Identity, Email or Phone..." class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
       </div>
       <select v-model="selectedInterest" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none">
          <option value="">All Interests</option>
          <option v-for="i in availableInterests" :key="i" :value="i">{{ i }}</option>
       </select>
       <select v-model="selectedSource" class="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none">
          <option value="">All Sources</option>
          <option v-for="s in availableSources" :key="s" :value="s">{{ s }}</option>
       </select>
       <div class="flex items-center gap-2">
          <input type="date" v-model="startDate" class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none" />
          <span class="text-slate-300 font-black">→</span>
          <input type="date" v-model="endDate" class="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none" />
       </div>
    </div>

    <!-- Subscriber Manifest Table -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[550px] flex flex-col justify-between">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="pl-6 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">#</th>
              <th class="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Identity</th>
              <th class="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Contact</th>
              <th class="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Interests</th>
              <th class="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Last Active</th>
              <th class="px-4 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right pr-6">Source</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <!-- Loading Skeletons -->
            <template v-if="adminStore.loading && !paginatedSubscribers.length">
              <tr v-for="i in 5" :key="i" class="animate-pulse">
                <td class="pl-6 py-4"><div class="h-2 w-4 bg-slate-100 rounded"></div></td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-slate-100 rounded-lg"></div>
                    <div class="space-y-2">
                       <div class="h-2 w-24 bg-slate-100 rounded"></div>
                       <div class="h-2 w-32 bg-slate-50 rounded"></div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4"><div class="h-2 w-20 bg-slate-50 rounded"></div></td>
                <td class="px-4 py-4">
                  <div class="flex gap-1">
                    <div class="h-4 w-12 bg-slate-50 rounded"></div>
                    <div class="h-4 w-12 bg-slate-100 rounded"></div>
                  </div>
                </td>
                <td class="px-4 py-4"><div class="h-2 w-16 bg-slate-50 rounded"></div></td>
                <td class="px-4 py-4 text-right pr-6"><div class="h-4 w-16 bg-slate-50 rounded ml-auto"></div></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="!paginatedSubscribers.length">
              <td colspan="6" class="py-24 text-center">
                <div class="flex flex-col items-center justify-center space-y-4">
                  <div class="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center">
                    <Users size="32" />
                  </div>
                  <div>
                    <h3 class="text-sm font-black uppercase tracking-widest text-slate-900">No Profiles Found</h3>
                    <p class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Adjust your filters or synchronize the vault</p>
                  </div>
                  <button @click="searchQuery = ''; selectedInterest = ''; selectedSource = ''" class="text-[10px] font-black text-blue-600 uppercase tracking-widest underline decoration-2 underline-offset-4">Reset Parameters</button>
                </div>
              </td>
            </tr>

            <tr v-for="(sub, idx) in paginatedSubscribers" :key="sub.email" class="hover:bg-slate-50/50 transition-all group">
              <td class="pl-6 py-1.5 text-[10px] font-bold text-slate-300 italic">{{ String((currentPage-1)*itemsPerPage + idx + 1).padStart(2, '0') }}</td>
              <td class="px-4 py-1.5">
                <div class="flex items-center gap-2">
                   <div class="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center font-black text-[10px] group-hover:bg-blue-600 transition-all">
                     {{ (sub.name || 'A')[0].toUpperCase() }}
                   </div>
                   <div class="flex flex-col">
                      <p class="text-[11px] font-black text-slate-900 uppercase tracking-tight">{{ sub.name || 'Anonymous Member' }}</p>
                      <p class="text-[9px] font-bold text-slate-400 lowercase tracking-tighter">{{ sub.email }}</p>
                   </div>
                </div>
              </td>
              <td class="px-4 py-1.5">
                 <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                    <Phone size="10" class="text-slate-300" />
                    {{ sub.phone || 'N/A' }}
                 </div>
              </td>
              <td class="px-4 py-1.5">
                <div class="flex flex-wrap gap-1">
                  <span v-for="interest in (sub.interests || [])" :key="interest" class="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded">
                    {{ interest }}
                  </span>
                  <span v-if="!(sub.interests?.length)" class="text-[8px] font-bold text-slate-300 italic">No clusters yet</span>
                </div>
              </td>
              <td class="px-4 py-1.5 text-[10px] font-bold text-slate-500">{{ sub.lastActive || 'Never' }}</td>
              <td class="px-4 py-1.5 text-right pr-6">
                <span class="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">{{ sub.source || 'Direct' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination & Status -->
      <div class="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
         <div class="flex items-center gap-4">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Showing {{ paginatedSubscribers.length }} of {{ filteredSubscribers.length }} Audit-Ready Profiles</p>
         </div>
         <div class="flex items-center gap-2">
            <button @click="currentPage--" :disabled="currentPage === 1" class="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size="16" /></button>
            <div class="flex items-center gap-1">
               <span v-for="p in totalPages" :key="p" @click="currentPage = p" :class="p === currentPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'" class="w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all cursor-pointer">
                  {{ p }}
               </span>
            </div>
            <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size="16" /></button>
         </div>
      </div>
    </div>
  </div>
</template>
