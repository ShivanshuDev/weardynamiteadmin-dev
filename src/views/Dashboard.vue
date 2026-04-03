<script setup>
import { ref, onMounted, computed } from 'vue'
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock
} from 'lucide-vue-next'
import { useAdminStore } from '../stores/adminStore'
import OrderDetailModal from '../components/OrderDetailModal.vue'
import DashboardCharts from '../components/DashboardCharts.vue'

const adminStore = useAdminStore()

// Modal State
const showModal = ref(false)
const selectedOrder = ref(null)

const openOrderDetail = (order) => {
  selectedOrder.value = order
  showModal.value = true
}

const dynamicStats = computed(() => {
  const revenue = adminStore.orders.reduce((sum, o) => sum + (Number(o.totalAmount) || Number(o.total) || 0), 0)
  const expenses = adminStore.expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const customers = adminStore.customers.length
  const stock = adminStore.products.reduce((sum, p) => sum + (p.totalStock || 0), 0)

  return [
    { name: 'Gross Revenue', value: `₹${revenue.toLocaleString()}`, change: 'Real-time', trend: 'neutral', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Orders', value: adminStore.orders.length.toString(), change: 'Live', trend: 'neutral', icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Total Burn', value: `₹${expenses.toLocaleString()}`, change: 'Real-time', trend: 'neutral', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Current Stock', value: stock.toLocaleString(), change: 'Stable', trend: 'neutral', icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]
})

const lowStockItems = computed(() => {
  if (!adminStore.inventoryReport || !adminStore.inventoryReport.records) return []
  return adminStore.inventoryReport.records
    .filter(item => item.stock <= 20)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 3)
})

// Use orders from store for consistency
const recentOrders = computed(() => (adminStore.orders || []).slice(0, 4))

onMounted(async () => {
  if (adminStore.products.length === 0) await adminStore.fetchProducts()
  await adminStore.fetchOrders()
  await adminStore.fetchSubscribers()
  await adminStore.fetchInventoryReport()
})
</script>

<template>
  <div class="space-y-10">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Dashboard</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Global Performance Overview</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Clock size="16" class="text-slate-400" />
          <span class="text-xs font-bold text-slate-600 uppercase">Last Sync: {{ new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="s in dynamicStats" 
        :key="s.name"
        class="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
      >
        <div class="flex items-center justify-between mb-4">
          <div :class="[s.bg, s.color, 'p-4 rounded-2xl group-hover:scale-110 transition-transform']">
            <component :is="s.icon" size="24" />
          </div>
          <div 
            class="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full"
            :class="s.trend === 'up' ? 'bg-emerald-50 text-emerald-600' : (s.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400')"
          >
            <ArrowUpRight v-if="s.trend === 'up'" size="12" />
            <ArrowDownRight v-if="s.trend === 'down'" size="12" />
            {{ s.change }}
          </div>
        </div>
        <p class="text-gray-400 text-[10px] font-black uppercase tracking-widest">{{ s.name }}</p>
        <h3 class="text-2xl font-black text-slate-900 mt-1">{{ s.value }}</h3>
      </div>
    </div>

    <!-- Dashboard Analytics Section -->
    <DashboardCharts 
      :orders="adminStore.orders" 
      :products="adminStore.products" 
      :subscribers="adminStore.subscribers" 
    />

    <!-- Main Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Recent Orders (Table) -->
      <div class="lg:col-span-2 bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
         <div class="p-8 border-b border-slate-50 flex items-center justify-between">
            <h2 class="text-lg font-black italic uppercase tracking-tight">Recent Fulfillment</h2>
            <button class="text-[10px] font-black uppercase text-blue-600 hover:tracking-[0.2em] transition-all">View All Orders</button>
         </div>
         <div class="flex-1 overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-slate-50/50">
                  <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Order ID</th>
                  <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Customer</th>
                  <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Product</th>
                  <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                  <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Amount</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-slate-50/30 transition-colors">
                  <td class="px-8 py-3">
                    <button @click="openOrderDetail(order)" class="text-xs font-black text-blue-600 hover:underline">
                      {{ order.orderNumber || order.orderId || order.id }}
                    </button>
                  </td>
                  <td class="px-8 py-3 text-xs font-bold text-slate-700">{{ order.customer?.name || 'Guest' }}</td>
                  <td class="px-8 py-3 text-xs font-medium text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap max-w-[150px]">
                    {{ order.items?.[0]?.name || 'No items' }}
                  </td>
                  <td class="px-8 py-3">
                    <span 
                      class="text-[9px] font-black uppercase tracking-tighter px-2 py-1 rounded-full border"
                      :class="{
                        'bg-orange-50 text-orange-600 border-orange-100': order.status === 'Processing',
                        'bg-blue-50 text-blue-600 border-blue-100': order.status === 'Shipped',
                        'bg-emerald-50 text-emerald-600 border-emerald-100': order.status === 'Delivered',
                        'bg-slate-50 text-slate-500 border-slate-100': order.status === 'Pending'
                      }"
                    >
                      {{ order.status }}
                    </span>
                  </td>
                  <td class="px-8 py-3 text-xs font-black text-slate-900">₹{{ order.totalAmount || order.total }}</td>
                </tr>
              </tbody>
            </table>
         </div>
      </div>

     <!-- Order Detail Modal -->
     <OrderDetailModal 
       v-if="showModal && selectedOrder"
       :key="selectedOrder?.id"
       :show="showModal" 
       :order="selectedOrder" 
       @close="showModal = false" 
     />

      <!-- Inventory Alert (Right) -->
      <div class="bg-[#0f172a] text-white rounded-[3px] p-8 space-y-8 flex flex-col justify-between shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
         <div class="absolute -right-20 -top-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] group-hover:bg-blue-600/30 transition-all duration-700"></div>
         
         <div class="relative">
            <h2 class="text-xl font-black italic uppercase italic tracking-tighter">Inventory Health</h2>
            <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Action Required</p>
         </div>

         <div class="space-y-4 relative">
            <div v-for="item in lowStockItems" :key="item.sku" class="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center justify-between hover:bg-slate-800 transition-all">
               <div>
                  <p class="text-xs font-bold text-white">{{ item.name }}</p>
                  <p class="text-[9px] font-black uppercase tracking-widest" :class="item.stock <= 5 ? 'text-red-400' : 'text-orange-400'">
                     {{ item.stock <= 5 ? 'Critical' : 'Low' }} Stock: {{ item.stock }} units
                  </p>
               </div>
               <button class="bg-blue-600 p-2 rounded-lg text-white" @click="$router.push('/inventory')"><ArrowUpRight size="14"/></button>
            </div>
            
            <div v-if="lowStockItems.length === 0" class="py-10 text-center">
               <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest">All Stock Levels Healthy</p>
            </div>
         </div>

         <button class="w-full py-4 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all relative z-10">
            Open Inventory Manager
         </button>
      </div>

    </div>
  </div>
</template>
