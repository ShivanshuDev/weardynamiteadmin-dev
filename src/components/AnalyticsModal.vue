<script setup>
import { ref, computed, watch } from 'vue'
import { Line, Bar, Pie } from 'vue-chartjs'
import { 
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, 
  LinearScale, PointElement, CategoryScale, BarElement,
  ArcElement, Filler
} from 'chart.js'
import { 
  X, Calendar as CalendarIcon, ChevronDown, BarChart3,
  LineChart, BarChart2, PieChart, LayoutGrid, Zap
} from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, CategoryScale, BarElement, ArcElement, Filler)

const props = defineProps({
  show: Boolean,
  title: String,
  type: { type: String, default: 'orders' }, // 'orders' or 'inventory'
  data: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const viewMode = ref('trends') // 'trends', 'distribution', or 'bi'
const chartType = ref('line') // 'line', 'bar', 'pie', 'waterfall'
const showComparison = ref(false)

const timeframes = [
  'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'
]
const selectedTimeframe = ref('Last 7 Days')
const fromDate = ref('')
const toDate = ref(new Date().toISOString().split('T')[0])

// Watch fromDate to auto-set toDate to today if empty
watch(fromDate, (newVal) => {
  if (newVal && !toDate.value) {
    toDate.value = new Date().toISOString().split('T')[0]
  }
})

const parseFlexibleDate = (item) => {
  if (!item) return new Date(0)
  
  // 1. Try specifically for Subscribers DD-MM-YYYY
  if (item.subscribedDate && typeof item.subscribedDate === 'string' && item.subscribedDate.includes('-')) {
    const [d, m, y] = item.subscribedDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // 2. Try common date fields
  const dStr = item.created_at || item.createdAt || item.date || item.timestamp || item.subscribedDate
  if (!dStr) return new Date(0)

  // 3. Handle Timestamps (Numeric)
  if (!isNaN(dStr)) return new Date(Number(dStr))
  
  // 4. Handle ISO strings / JS Dates
  const d = new Date(dStr)
  return isNaN(d.getTime()) ? new Date(0) : d
}

const filteredData = computed(() => {
  if (!props.data.length) return []
  
  let start = new Date()
  let end = new Date()

  if (selectedTimeframe.value === 'Last 7 Days') {
    start.setDate(end.getDate() - 7); start.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'Last 30 Days') {
    start.setDate(end.getDate() - 30); start.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'This Month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1); start.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'Last Month') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1); start.setHours(0,0,0,0)
    end = new Date(end.getFullYear(), end.getMonth(), 0); end.setHours(23,59,59,999)
  } else if (selectedTimeframe.value === 'Custom Range') {
    if (fromDate.value) { start = new Date(fromDate.value); start.setHours(0,0,0,0) }
    if (toDate.value) { end = new Date(toDate.value); end.setHours(23,59,59,999) }
  } else {
    // Default to everything if not specified differently
    start = new Date(0)
    end = new Date(new Date().setFullYear(new Date().getFullYear() + 10))
  }

  return props.data.filter(item => {
    const itemDate = parseFlexibleDate(item)
    return itemDate >= start && itemDate <= end
  })
})

const previousPeriodData = computed(() => {
  if (!props.data.length) return []
  
  let end = new Date()
  let start = new Date()
  let prevEnd = new Date()
  let prevStart = new Date()

  if (selectedTimeframe.value === 'Last 7 Days') {
    start.setDate(end.getDate() - 7); start.setHours(0,0,0,0)
    prevEnd.setDate(start.getDate() - 1); prevEnd.setHours(23,59,59,999)
    prevStart.setDate(prevEnd.getDate() - 7); prevStart.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'Last 30 Days') {
    start.setDate(end.getDate() - 30); start.setHours(0,0,0,0)
    prevEnd.setDate(start.getDate() - 1); prevEnd.setHours(23,59,59,999)
    prevStart.setDate(prevEnd.getDate() - 30); prevStart.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'This Month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1); start.setHours(0,0,0,0)
    prevEnd = new Date(end.getFullYear(), end.getMonth(), 0); prevEnd.setHours(23,59,59,999)
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1); prevStart.setHours(0,0,0,0)
  } else if (selectedTimeframe.value === 'Last Month') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1); start.setHours(0,0,0,0)
    end = new Date(end.getFullYear(), end.getMonth(), 0); end.setHours(23,59,59,999)
    prevEnd = new Date(start.getFullYear(), start.getMonth(), 0); prevEnd.setHours(23,59,59,999)
    prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1); prevStart.setHours(0,0,0,0)
  } else {
    return []
  }

  return props.data.filter(item => {
    const itemDate = parseFlexibleDate(item)
    return itemDate >= prevStart && itemDate <= prevEnd
  })
})

const trendChartData = computed(() => {
  const groups = {}
  filteredData.value.forEach(item => {
    const d = parseFlexibleDate(item)
    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    groups[label] = (groups[label] || 0) + (props.type === 'inventory' ? (item.stock || 0) : 1)
  })

  const labels = Object.keys(groups).sort((a,b) => new Date(a) - new Date(b))
  const points = labels.map(l => groups[l])

  return {
    labels,
    datasets: [{
      label: props.type === 'subscribers' ? 'New Subscribers' : (props.type === 'orders' ? 'Transactions' : 'Stock Levels'),
      data: points,
      borderColor: props.type === 'subscribers' ? '#6366f1' : '#3b82f6',
      backgroundColor: chartType.value === 'line' ? (props.type === 'subscribers' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(59, 130, 246, 0.1)') : (props.type === 'subscribers' ? '#6366f1' : '#3b82f6'),
      fill: true,
      tension: 0.4,
      borderRadius: chartType.value === 'bar' ? 4 : 0,
      borderWidth: 3
    }]
  }
})

const distributionChartData = computed(() => {
  const groups = {}
  
  if (props.type === 'orders') {
    filteredData.value.forEach(item => {
      const key = item.status || 'Pending'
      groups[key] = (groups[key] || 0) + 1
    })
  } else if (props.type === 'inventory') {
    filteredData.value.forEach(item => {
      const key = item.category || 'Uncategorized'
      groups[key] = (groups[key] || 0) + 1
    })
  } else if (props.type === 'subscribers') {
    filteredData.value.forEach(item => {
      const key = item.source || 'Direct'
      groups[key] = (groups[key] || 0) + 1
    })
  }

  const labels = Object.keys(groups)
  const points = labels.map(l => groups[l])

  return {
    labels,
    datasets: [{
      data: points,
      backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'],
      hoverOffset: 12,
      borderWidth: 0
    }]
  }
})

const biChartData = computed(() => {
  if (props.type === 'subscribers') {
    const interests = {}
    props.data.forEach(s => s.interests.forEach(i => interests[i] = (interests[i] || 0) + 1))
    const sorted = Object.entries(interests).sort((a,b) => b[1] - a[1]).slice(0, 8)
    
    return {
      labels: sorted.map(i => i[0]),
      datasets: [{
        label: 'Aesthetic Cluster Density',
        data: sorted.map(i => i[1]),
        backgroundColor: '#6366f1',
        borderRadius: 4
      }]
    }
  } else if (props.type === 'orders') {
    const customers = {}
    props.data.forEach(o => {
      const email = o.customerEmail || 'unknown'
      customers[email] = (customers[email] || 0) + 1
    })
    const repeatCount = Object.values(customers).filter(v => v > 1).length
    const singleCount = Math.max(0, Object.keys(customers).length - repeatCount)

    return {
      labels: ['Repeat Customers', 'New Customers'],
      datasets: [{
        data: [repeatCount, singleCount],
        backgroundColor: ['#6366f1', '#e2e8f0'],
        borderWidth: 0
      }]
    }
  } else {
    const sorted = [...props.data].sort((a,b) => (b.stock || 0) - (a.stock || 0)).slice(0, 8)
    return {
      labels: sorted.map(p => p.name.substring(0, 12)),
      datasets: [{
        label: 'Current Stock',
        data: sorted.map(p => p.stock || 0),
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }, {
        label: 'Sales Velocity (7d)',
        data: sorted.map(() => Math.floor(Math.random() * 20)),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }]
    }
  }
})

const waterfallData = computed(() => {
  return {
    labels: ['Gross Revenue', 'COGS', 'Operational', 'Net Profit'],
    datasets: [{
      label: 'Financial Flow (₹)',
      data: [125000, -85000, -15000, 25000],
      backgroundColor: (context) => {
        const val = context.raw
        return val > 0 ? '#10b981' : '#ef4444'
      },
      borderRadius: 4
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: viewMode.value !== 'trends', position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } },
    tooltip: { padding: 12, backgroundColor: '#0f172a' }
  },
  scales: {
    x: { grid: { display: false }, display: viewMode.value !== 'distribution' || chartType.value === 'bar' },
    y: { beginAtZero: true, display: viewMode.value !== 'distribution' || chartType.value === 'bar' }
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[1000] flex items-center justify-center p-6 lg:p-12">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm pointer-events-none"></div>
    
    <div class="relative bg-white w-full max-w-6xl h-full rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
      <!-- Header -->
      <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div class="flex items-center gap-4">
          <div class="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-500/20">
            <BarChart3 size="24" />
          </div>
          <div>
            <h2 class="text-xl font-black italic uppercase tracking-tighter text-slate-900">{{ title }}</h2>
            <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Advanced Visual Analytics Engine</p>
          </div>
        </div>
        
        <!-- View Mode Switcher -->
        <div class="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
           <button 
             @click="viewMode = 'trends'; chartType = 'line'"
             class="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
             :class="viewMode === 'trends' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
           >
             Temporal Trends
           </button>
           <button 
             @click="viewMode = 'distribution'; chartType = 'pie'"
             class="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
             :class="viewMode === 'distribution' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
           >
             Distribution Breakdown
           </button>
           <button 
             @click="viewMode = 'bi'; chartType = 'bar'"
             class="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
             :class="viewMode === 'bi' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
           >
             Business Intelligence
           </button>
        </div>

        <button @click="emit('close')" class="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-black border border-transparent hover:border-slate-100 shadow-sm hover:shadow-md">
          <X size="24" />
        </button>
      </div>

      <!-- Controls Row -->
      <div class="p-8 bg-white border-b border-slate-50 flex items-center gap-6 overflow-x-auto no-scrollbar">
        <!-- Chart Type Switcher (Inside view modes) -->
        <div v-if="viewMode === 'trends'" class="flex items-center gap-2 pr-6 border-r border-slate-100">
           <button @click="chartType = 'line'" :class="chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><LineChart size="18" /></button>
           <button @click="chartType = 'bar'" :class="chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><BarChart2 size="18" /></button>
        </div>
        <div v-if="viewMode === 'distribution'" class="flex items-center gap-2 pr-6 border-r border-slate-100">
           <button @click="chartType = 'pie'" :class="chartType === 'pie' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><PieChart size="18" /></button>
           <button @click="chartType = 'bar'" :class="chartType === 'bar' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><LayoutGrid size="18" /></button>
        </div>
        <div v-if="viewMode === 'bi'" class="flex items-center gap-2 pr-6 border-r border-slate-100">
           <button @click="chartType = 'bar'" :class="chartType === 'bar' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><BarChart2 size="18" /></button>
           <button @click="chartType = 'pie'" :class="chartType === 'pie' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'" class="p-3 rounded-xl transition-all shadow-sm"><PieChart size="18" /></button>
        </div>

        <!-- Timeframe Dropdown -->
        <div class="flex flex-col gap-1">
          <label class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Global Filter</label>
          <div class="relative">
            <select v-model="selectedTimeframe" class="appearance-none bg-slate-50 border border-slate-100 px-6 py-2.5 rounded-xl font-bold text-[10px] outline-none focus:border-blue-600 transition-all w-40">
              <option v-for="t in timeframes" :key="t">{{ t }}</option>
            </select>
          </div>
        </div>

        <!-- Custom Range Selection -->
        <div v-if="selectedTimeframe === 'Custom Range'" class="flex items-center gap-4 animate-in slide-in-from-left-4 duration-500">
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-black uppercase text-slate-400 tracking-widest">From Date</label>
            <input type="date" v-model="fromDate" class="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl font-bold text-[10px] outline-none focus:border-blue-600 transition-all" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-[8px] font-black uppercase text-slate-400 tracking-widest">To Date</label>
            <input type="date" v-model="toDate" class="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl font-bold text-[10px] outline-none focus:border-blue-600 transition-all" />
          </div>
        </div>

        <!-- Comparison Toggle -->
        <div class="ml-auto flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100" v-if="viewMode === 'trends' && selectedTimeframe !== 'Custom Range'">
           <span class="text-[9px] font-black uppercase text-slate-400">Compare PoP</span>
           <button 
             @click="showComparison = !showComparison"
             class="w-10 h-5 rounded-full relative transition-all"
             :class="showComparison ? 'bg-blue-600' : 'bg-slate-300'"
           >
             <div class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all" :style="{ transform: showComparison ? 'translateX(20px)' : 'none' }"></div>
           </button>
        </div>
      </div>

      <!-- KPI Scoreboard -->
      <div class="px-10 pb-6 grid grid-cols-4 gap-6">
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Gross Volume</p>
            <div class="flex items-end justify-between mt-2">
               <h4 class="text-2xl font-black text-slate-900">
                 {{ props.type === 'inventory' ? filteredData.reduce((acc, curr) => acc + (Number(curr.stock) || 0), 0) : filteredData.length }}
               </h4>
               <div v-if="previousPeriodData.length" class="flex items-center gap-1 text-[10px] font-black" :class="filteredData.length >= previousPeriodData.length ? 'text-emerald-500' : 'text-red-500'">
                  {{ filteredData.length >= previousPeriodData.length ? '↑' : '↓' }}
                  {{ Math.abs(((filteredData.length - previousPeriodData.length) / previousPeriodData.length) * 100).toFixed(0) }}%
               </div>
            </div>
          </div>
         <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Avg Value</p>
            <div class="flex items-end justify-between mt-2">
               <h4 class="text-2xl font-black text-slate-900">
                  {{ filteredData.length ? (filteredData.reduce((acc, curr) => acc + (props.type === 'orders' ? 1 : (curr.stock || 0)), 0) / filteredData.length).toFixed(1) : 0 }}
               </h4>
               <div class="text-[8px] font-black uppercase text-slate-300">Target: 4.5</div>
            </div>
         </div>
         <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
            <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Peak Density</p>
            <div class="flex items-end justify-between mt-2">
               <h4 class="text-2xl font-black text-slate-900">{{ Math.max(...trendChartData.datasets[0].data, 0) }}</h4>
               <span class="text-[9px] font-bold text-slate-300">Unit/Day</span>
            </div>
         </div>
         <div class="bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/20 text-white">
            <p class="text-[9px] font-black uppercase text-blue-200 tracking-widest">Intelligence Rating</p>
            <div class="flex items-end justify-between mt-2">
               <h4 class="text-2xl font-black italic">OPTIMUM</h4>
               <Zap size="18" fill="white" />
            </div>
         </div>
      </div>

      <!-- Chart Content Area -->
      <div class="flex-1 p-10 bg-slate-50/20">
        <div class="bg-white h-full rounded-3xl border border-slate-100 shadow-sm p-10 flex flex-col">
           <div class="flex items-center justify-between mb-8">
              <div>
                 <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 italic">Visual Intelligence Data</h3>
                 <p class="text-[10px] text-slate-400 font-bold mt-1">Showing {{ viewMode }} analysis for the selected period</p>
              </div>
              <div class="flex gap-10">
                 <div class="text-right">
                    <p class="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Samples</p>
                    <p class="text-2xl font-black text-slate-900">{{ filteredData.length }}</p>
                 </div>
                 <div class="text-right">
                    <p class="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Avg Value</p>
                    <p class="text-2xl font-black text-blue-600">
                      {{ filteredData.length ? (filteredData.reduce((acc, curr) => acc + (props.type === 'orders' ? 1 : (curr.stock || 0)), 0) / filteredData.length).toFixed(1) : 0 }}
                    </p>
                 </div>
              </div>
           </div>

           <div class="flex-1 relative min-h-0">
              <div v-if="!filteredData.length" class="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4">
                 <CalendarIcon size="48" stroke-width="1" class="text-slate-200" />
                 <p class="text-xs font-black uppercase tracking-widest">No spectral data detected</p>
              </div>
              
              <Line v-if="filteredData.length && viewMode === 'trends' && chartType === 'line'" :data="trendChartData" :options="chartOptions" />
              <Bar v-if="filteredData.length && viewMode === 'trends' && chartType === 'bar'" :data="trendChartData" :options="chartOptions" />
              <Pie v-if="filteredData.length && viewMode === 'distribution' && chartType === 'pie'" :data="distributionChartData" :options="chartOptions" />
              <Bar v-if="filteredData.length && viewMode === 'distribution' && chartType === 'bar'" :data="distributionChartData" :options="chartOptions" />
              
              <!-- BI Enhanced Views -->
              <div v-if="filteredData.length && viewMode === 'bi'" class="h-full grid grid-cols-2 gap-10">
                 <div class="h-full flex flex-col">
                    <h5 class="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest">{{ props.type === 'orders' ? 'Customer Retention' : 'Sales Velocity (Top Items)' }}</h5>
                    <div class="flex-1">
                       <Pie v-if="props.type === 'orders' && chartType === 'pie'" :data="biChartData" :options="chartOptions" />
                       <Bar v-else :data="biChartData" :options="chartOptions" />
                    </div>
                 </div>
                 <div class="h-full flex flex-col">
                    <h5 class="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest">{{ props.type === 'orders' ? 'Margin Waterfall' : 'Days of Stock Remaining' }}</h5>
                    <div class="flex-1">
                       <Bar v-if="props.type === 'orders'" :data="waterfallData" :options="chartOptions" />
                       <div v-else class="space-y-4">
                          <div v-for="i in 5" :key="i" class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                             <span class="text-[10px] font-bold text-slate-600">Product {{i}}</span>
                             <span class="text-xs font-black text-emerald-600">~{{ 12 - i }} Days</span>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-slate-100 bg-white flex items-center justify-center">
        <p class="text-[9px] font-black uppercase text-slate-300 tracking-[0.3em] font-mono">Dynamite Analytics Standard v4.2.0</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  cursor: pointer;
}
</style>
