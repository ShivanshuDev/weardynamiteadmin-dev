<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Activity, Search, Eye, MousePointerClick, TrendingUp, IndianRupee, RotateCcw, ShoppingCart, Users, Layers, Zap, Clock, Smartphone, Globe, FileDown, FileSpreadsheet } from 'lucide-vue-next'
import { Pie, Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import api from '../utils/api'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const loading = ref(true)
const selectedTimeframe = ref('Last 7 Days')
const customStartDate = ref('')
const customEndDate = ref('')
const timeframes = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'This Year', 'Custom']

const analyticsData = ref({
  totalVisits: 0,
  totalProductViews: 0,
  revenue: 0,
  aov: 0,
  retentionRate: 0,
  cartAbandonmentRate: 0,
  devices: {},
  sources: {},
  hours: {},
  topSearches: [],
  mostDemanded: []
})
const aiInsights = ref([])
const loadingInsights = ref(false)

const aiChatQuery = ref('')
const aiChatAnswer = ref('')
const loadingChat = ref(false)

const fetchAIInsights = async () => {
  loadingInsights.value = true
  try {
    const res = await api.post('/analytics/admin/ai-insights', { analyticsData: analyticsData.value })
    aiInsights.value = res.data.insights || []
  } catch(err) {
    console.error(err)
    aiInsights.value = [`Error: ${err.response?.data?.message || err.message || 'Unable to load AI insights at this time.'}`]
  } finally {
    loadingInsights.value = false
  }
}

const askAI = async () => {
  if (!aiChatQuery.value.trim()) return
  loadingChat.value = true
  aiChatAnswer.value = ''
  try {
    const res = await api.post('/analytics/admin/ai-chat', { analyticsData: analyticsData.value, query: aiChatQuery.value })
    aiChatAnswer.value = res.data.answer
  } catch(err) {
    aiChatAnswer.value = `Error: ${err.response?.data?.message || err.message || 'Sorry, failed to connect to AI.'}`
  } finally {
    loadingChat.value = false
  }
}
const fetchAnalytics = async () => {
  loading.value = true
  aiInsights.value = [] // Clear previous insights when data changes
  currentPage.value = 1 // Reset pagination
  try {
    let url = `/analytics/admin/overview?timeframe=${selectedTimeframe.value}`
    if (selectedTimeframe.value === 'Custom' && customStartDate.value && customEndDate.value) {
      url += `&startDate=${customStartDate.value}&endDate=${customEndDate.value}`
    }
    const res = await api.get(url)
    analyticsData.value = res.data
  } catch (err) {
    console.error('Error fetching analytics overview:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAnalytics()
})

watch(selectedTimeframe, (newVal) => {
  if (newVal !== 'Custom') {
    fetchAnalytics()
  }
})

watch([customStartDate, customEndDate], () => {
  if (selectedTimeframe.value === 'Custom' && customStartDate.value && customEndDate.value) {
    fetchAnalytics()
  }
})

const formatCurrency = (val) => `₹${Number(val).toLocaleString()}`

const formatDateTime = (dateString) => {
  if (!dateString) return 'Unknown'
  const date = new Date(dateString)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

const currentPage = ref(1)
const itemsPerPage = 13

const paginatedVisits = computed(() => {
  if (!analyticsData.value.recentVisits) return []
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return analyticsData.value.recentVisits.slice(start, end)
})

const totalPages = computed(() => {
  if (!analyticsData.value.recentVisits) return 0
  return Math.ceil(analyticsData.value.recentVisits.length / itemsPerPage)
})

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const topProductsWithDetails = computed(() => {
  return analyticsData.value.mostDemanded || []
})

const downloadPDF = () => {
  if (!analyticsData.value.recentVisits) return
  const doc = new jsPDF()
  doc.text('Visitor Details Report', 14, 15)
  const tableData = analyticsData.value.recentVisits.map((v, index) => [
    index + 1,
    formatDateTime(v.timestamp),
    v.location,
    v.device,
    v.os,
    v.browser
  ])
  autoTable(doc, {
    head: [['S.No', 'Date / Time', 'Location', 'Device', 'OS', 'Browser']],
    body: tableData,
    startY: 20,
    didDrawPage: (data) => {
      // Add page number at the bottom
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(10)
      const pageString = `Page ${data.pageNumber} of ${pageCount}`
      doc.text(pageString, data.settings.margin.left, doc.internal.pageSize.height - 10)
    }
  })
  doc.save('visitor_details.pdf')
}

const downloadExcel = () => {
  if (!analyticsData.value.recentVisits) return
  const formattedData = analyticsData.value.recentVisits.map((v, index) => ({
    'S.No': index + 1,
    'Date / Time': formatDateTime(v.timestamp),
    'Location': v.location,
    'Device': v.device,
    'OS': v.os,
    'Browser': v.browser
  }))
  const worksheet = XLSX.utils.json_to_sheet(formattedData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Visitors")
  XLSX.writeFile(workbook, "visitor_details.xlsx")
}

// Chart configs
const deviceChartData = computed(() => {
  const data = analyticsData.value.devices || {}
  return {
    labels: Object.keys(data),
    datasets: [{
      data: Object.values(data),
      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b']
    }]
  }
})

const sourceChartData = computed(() => {
  const data = analyticsData.value.sources || {}
  return {
    labels: Object.keys(data),
    datasets: [{
      label: 'Visits by Source',
      data: Object.values(data),
      backgroundColor: '#8b5cf6',
      borderRadius: 4
    }]
  }
})

const timeChartData = computed(() => {
  const data = analyticsData.value.hours || {}
  const labels = Array.from({length: 24}, (_, i) => String(i).padStart(2, '0') + ':00')
  const points = labels.map(l => data[l.substring(0, 2)] || 0)
  
  return {
    labels,
    datasets: [{
      label: 'Visits by Hour',
      data: points,
      backgroundColor: '#f43f5e',
      borderRadius: 4
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
  }
}

</script>

<template>
  <div class="space-y-10 pb-10">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-2">
      <div>
        <h1 class="text-3xl font-black italic uppercase tracking-tight text-slate-900">Advanced Analytics</h1>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Performance & Insights</p>
      </div>
      <div class="flex gap-4 items-center">
        <div v-if="selectedTimeframe === 'Custom'" class="flex items-center gap-2">
          <input type="date" v-model="customStartDate" class="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
          <span class="text-xs font-bold text-slate-400 uppercase">TO</span>
          <input type="date" v-model="customEndDate" class="bg-white border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm" />
        </div>
        <select v-model="selectedTimeframe" class="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm">
          <option v-for="t in timeframes" :key="t" :value="t">{{ t }}</option>
        </select>
        <button @click="fetchAnalytics" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md shadow-blue-600/20 active:scale-95">
          Refresh Data
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-slate-500 font-bold uppercase text-xs mt-4 tracking-widest">Processing Intelligence...</p>
    </div>
    
    <div v-else class="space-y-10">
      
      <!-- AI Chat with Data -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg flex gap-4 items-center">
        <Zap class="text-yellow-300 flex-shrink-0" size="24" />
        <div class="flex-1">
          <div class="flex gap-2">
            <input v-model="aiChatQuery" @keyup.enter="askAI" type="text" placeholder="Ask AI about your data... (e.g. 'Why did revenue drop?')" class="w-full bg-white/10 text-white placeholder-blue-200 border border-white/20 px-4 py-2 rounded-xl outline-none focus:bg-white/20 transition-all" :disabled="loadingChat" />
            <button @click="askAI" class="bg-white text-blue-700 px-6 py-2 rounded-xl font-bold hover:bg-blue-50 transition-colors whitespace-nowrap disabled:opacity-50" :disabled="loadingChat || !aiChatQuery.trim()">Ask</button>
          </div>
          <div v-if="loadingChat" class="text-blue-200 text-sm mt-3 animate-pulse">Thinking...</div>
          <div v-else-if="aiChatAnswer" class="mt-3 text-white bg-black/20 p-4 rounded-xl text-sm leading-relaxed border border-white/10 whitespace-pre-wrap">
            {{ aiChatAnswer }}
          </div>
        </div>
      </div>

      <!-- AI Insights Panel -->
      <div class="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
        <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Activity class="text-indigo-600" size="20" />
            <h2 class="font-black italic uppercase tracking-widest text-sm text-slate-900">Automated AI Insights</h2>
          </div>
          <button v-if="aiInsights.length === 0 && !loadingInsights" @click="fetchAIInsights" class="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-bold transition-colors">
            Generate Insights
          </button>
        </div>
        <div v-if="loadingInsights" class="text-slate-400 text-sm animate-pulse">Analyzing dashboard data...</div>
        <ul v-else-if="aiInsights.length > 0" class="space-y-3">
          <li v-for="(insight, idx) in aiInsights" :key="idx" class="flex gap-3 text-sm text-slate-700">
            <span class="text-indigo-500">✦</span>
            {{ insight }}
          </li>
        </ul>
        <div v-else class="text-slate-400 text-xs">
          Click generate to get an AI analysis of your current metrics.
        </div>
      </div>

      <!-- KPIs Grid -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gross Revenue</p>
            <div class="bg-emerald-50 p-2 rounded-lg text-emerald-600"><IndianRupee size="16" /></div>
          </div>
          <h3 class="text-3xl font-black text-slate-900 mt-4">{{ formatCurrency(analyticsData.revenue) }}</h3>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Order Value</p>
            <div class="bg-blue-50 p-2 rounded-lg text-blue-600"><Layers size="16" /></div>
          </div>
          <h3 class="text-3xl font-black text-slate-900 mt-4">{{ formatCurrency(analyticsData.aov) }}</h3>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Retention Rate</p>
            <div class="bg-purple-50 p-2 rounded-lg text-purple-600"><RotateCcw size="16" /></div>
          </div>
          <h3 class="text-3xl font-black text-slate-900 mt-4">{{ (analyticsData.retentionRate || 0).toFixed(1) }}%</h3>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:-translate-y-1 transition-transform">
          <div class="flex items-center justify-between">
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cart Abandonment</p>
            <div class="bg-orange-50 p-2 rounded-lg text-orange-600"><ShoppingCart size="16" /></div>
          </div>
          <h3 class="text-3xl font-black text-slate-900 mt-4">{{ (analyticsData.cartAbandonmentRate || 0).toFixed(1) }}%</h3>
        </div>
      </div>

      <!-- Traffic & Demographics Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 class="text-sm font-black italic uppercase tracking-widest mb-6 flex items-center gap-2"><Smartphone size="16" class="text-blue-500" /> Device Distribution</h2>
          <div class="flex-1 min-h-[200px] relative">
            <Doughnut v-if="Object.keys(analyticsData.devices).length" :data="deviceChartData" :options="chartOptions" />
            <div v-else class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">No Data</div>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 class="text-sm font-black italic uppercase tracking-widest mb-6 flex items-center gap-2"><Globe size="16" class="text-purple-500" /> Traffic Sources</h2>
          <div class="flex-1 min-h-[200px] relative">
            <Bar v-if="Object.keys(analyticsData.sources).length" :data="sourceChartData" :options="chartOptions" />
            <div v-else class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">No Data</div>
          </div>
        </div>

        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col">
          <h2 class="text-sm font-black italic uppercase tracking-widest mb-6 flex items-center gap-2"><Clock size="16" class="text-rose-500" /> Time of Day</h2>
          <div class="flex-1 min-h-[200px] relative">
            <Bar v-if="Object.keys(analyticsData.hours).length" :data="timeChartData" :options="{ ...chartOptions, scales: { x: { display: false } } }" />
            <div v-else class="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">No Data</div>
          </div>
        </div>
        
      </div>

      <!-- Detail Grids -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Top Searches -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div class="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
            <div class="bg-orange-100 text-orange-600 p-3 rounded-xl"><Search size="20"/></div>
            <div>
              <h2 class="text-lg font-black italic uppercase tracking-tight">Top Searches</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Most Demanded Keywords</p>
            </div>
          </div>
          <div class="p-6 h-[400px] overflow-y-auto">
            <div v-if="!analyticsData.topSearches || analyticsData.topSearches.length === 0" class="text-center py-10 text-slate-500 font-bold uppercase text-xs tracking-widest">
              No search data available
            </div>
            <ul v-else class="space-y-4">
              <li v-for="(search, index) in analyticsData.topSearches" :key="index" class="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <span class="font-bold text-slate-700 capitalize">{{ search.keyword }}</span>
                <span class="text-xs font-black bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm text-slate-600">{{ search.count }} searches</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Top Viewed Products / Sales Velocity -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div class="p-8 border-b border-slate-50 flex items-center gap-4 bg-slate-50/50">
            <div class="bg-emerald-100 text-emerald-600 p-3 rounded-xl"><TrendingUp size="20"/></div>
            <div>
              <h2 class="text-lg font-black italic uppercase tracking-tight">Sales Velocity</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Highest Views & Demand</p>
            </div>
          </div>
          <div class="p-6 h-[400px] overflow-y-auto">
            <div v-if="!topProductsWithDetails || topProductsWithDetails.length === 0" class="text-center py-10 text-slate-500 font-bold uppercase text-xs tracking-widest">
              No product data available
            </div>
            <div v-else class="space-y-4">
              <div v-for="prod in topProductsWithDetails" :key="prod.id" class="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                    <img v-if="prod.image" :src="prod.image" class="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h4 class="font-bold text-slate-900 text-sm line-clamp-1">{{ prod.name }}</h4>
                    <p class="text-[10px] font-black uppercase text-slate-500 mt-1">{{ prod.category || 'Uncategorized' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200" title="Views">
                    <Eye size="12" class="text-slate-400" />
                    <span class="text-[10px] font-black">{{ prod.views || 0 }}</span>
                  </div>
                  <div class="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200" title="Clicks">
                    <MousePointerClick size="12" class="text-slate-400" />
                    <span class="text-[10px] font-black">{{ prod.clicks || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Visitor Details Table -->
      <div class="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-4">
            <div class="bg-indigo-100 text-indigo-600 p-3 rounded-xl"><Users size="20"/></div>
            <div>
              <h2 class="text-lg font-black italic uppercase tracking-tight">Visitor Details</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent traffic system information</p>
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="downloadExcel" class="flex items-center gap-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors border border-emerald-100">
              <FileSpreadsheet size="14" />
              Excel
            </button>
            <button @click="downloadPDF" class="flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-xs transition-colors border border-red-100">
              <FileDown size="14" />
              PDF
            </button>
          </div>
        </div>
        <div class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-500">
                <th class="px-6 py-4 font-black">S.No</th>
                <th class="px-6 py-4 font-black">Date / Time</th>
                <th class="px-6 py-4 font-black">Location</th>
                <th class="px-6 py-4 font-black">Device</th>
                <th class="px-6 py-4 font-black">OS</th>
                <th class="px-6 py-4 font-black">Browser</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!analyticsData.recentVisits || analyticsData.recentVisits.length === 0">
                <td colspan="6" class="px-6 py-10 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No visitor data available</td>
              </tr>
              <tr v-for="(visit, idx) in paginatedVisits" :key="idx" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                <td class="px-6 py-4 font-bold text-slate-400">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
                <td class="px-6 py-4 font-medium">{{ formatDateTime(visit.timestamp) }}</td>
                <td class="px-6 py-4">{{ visit.location }}</td>
                <td class="px-6 py-4 font-bold">{{ visit.device }}</td>
                <td class="px-6 py-4">{{ visit.os }}</td>
                <td class="px-6 py-4">{{ visit.browser }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/30">
          <button 
            @click="prevPage" 
            :disabled="currentPage === 1"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-colors"
            :class="currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'"
          >
            Previous
          </button>
          
          <div class="text-xs font-bold text-slate-500 tracking-widest uppercase">
            Page {{ currentPage }} of {{ totalPages }}
          </div>
          
          <button 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
            class="px-4 py-2 text-xs font-bold rounded-lg transition-colors"
            :class="currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'"
          >
            Next
          </button>
        </div>
      </div>

      <!-- Chatbot Insights Table -->
      <div class="mt-8 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-4">
            <div class="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
            </div>
            <div>
              <h2 class="text-lg font-black italic uppercase tracking-tight">Chatbot Insights</h2>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent AI Assistant Conversations</p>
            </div>
          </div>
        </div>
        <div class="p-0 overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-500">
                <th class="px-6 py-4 font-black">Date / Time</th>
                <th class="px-6 py-4 font-black w-2/3">Customer Query</th>
                <th class="px-6 py-4 font-black">Detected Intent</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!analyticsData.chatInsights || analyticsData.chatInsights.length === 0">
                <td colspan="3" class="px-6 py-10 text-center text-slate-500 font-bold uppercase text-xs tracking-widest">No chat data available</td>
              </tr>
              <tr v-for="(chat, idx) in analyticsData.chatInsights" :key="idx" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors text-sm text-slate-700">
                <td class="px-6 py-4 font-medium whitespace-nowrap">{{ formatDateTime(chat.timestamp) }}</td>
                <td class="px-6 py-4 text-slate-800 font-bold">{{ chat.query }}</td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg uppercase tracking-wider">{{ chat.intent }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>
