<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { Activity, Search, Eye, MousePointerClick, TrendingUp, IndianRupee, RotateCcw, ShoppingCart, Users, Layers, Zap, Clock, Smartphone, Globe } from 'lucide-vue-next'
import { Pie, Bar, Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'
import api from '../utils/api'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement)

const loading = ref(true)
const selectedTimeframe = ref('Last 7 Days')
const timeframes = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'This Year']

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

const fetchAnalytics = async () => {
  loading.value = true
  try {
    const res = await api.get(`/analytics/admin/overview?timeframe=${selectedTimeframe.value}`)
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

watch(selectedTimeframe, () => {
  fetchAnalytics()
})

const formatCurrency = (val) => `₹${Number(val).toLocaleString()}`

const topProductsWithDetails = computed(() => {
  return analyticsData.value.mostDemanded || []
})

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
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Advanced Analytics</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Platform Performance & Insights</p>
      </div>
      <div class="flex items-center gap-4">
        <select v-model="selectedTimeframe" class="bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest outline-none shadow-sm cursor-pointer">
          <option v-for="t in timeframes" :key="t" :value="t">{{ t }}</option>
        </select>
        <button @click="fetchAnalytics" class="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30">
          Refresh Data
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-slate-500 font-bold uppercase text-xs mt-4 tracking-widest">Processing Intelligence...</p>
    </div>
    
    <div v-else class="space-y-10">
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
    </div>
  </div>
</template>
