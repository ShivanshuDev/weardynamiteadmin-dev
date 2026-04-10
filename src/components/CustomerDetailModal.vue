<script setup>
import { ref, onMounted } from 'vue'
import { 
  X, User, Mail, Phone, MapPin, 
  ShoppingCart, Calendar, Clock, 
  ChevronRight, ExternalLink, Hash,
  Smartphone, History, Heart
} from 'lucide-vue-next'
import api from '../utils/api'

const props = defineProps({
  show: Boolean,
  customer: Object
})

const emit = defineEmits(['close', 'viewOrder'])

const orders = ref([])
const loading = ref(false)

const fetchCustomerOrders = async () => {
  if (!props.customer?.id) return
  loading.value = true
  try {
    const response = await api.get('/admin/orders', { 
      params: { customerId: props.customer.id } 
    })
    orders.value = response.data
  } catch (error) {
    console.error('Failed to fetch customer orders:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCustomerOrders()
})

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-slate-100 text-slate-600'
    case 'processing': return 'bg-orange-100 text-orange-600'
    case 'shipped': return 'bg-blue-100 text-blue-600'
    case 'delivered': return 'bg-emerald-100 text-emerald-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}
</script>

<template>
  <div v-if="show && customer" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 transition-all">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="emit('close')"></div>
    <div class="relative bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
      
      <!-- Header -->
      <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <User size="24" />
          </div>
          <div>
            <h2 class="text-xl font-black uppercase tracking-tighter italic">Customer Profile</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Dynamite Member Identification</p>
          </div>
        </div>
        <button @click="emit('close')" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black">
          <X size="24" />
        </button>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 p-6 md:p-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left: Profile Info -->
          <div class="lg:col-span-1 space-y-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center">
              <img :src="`https://ui-avatars.com/api/?name=${customer.name}&background=f1f5f9&color=3b82f6&size=128`" class="w-24 h-24 rounded-full mx-auto border-4 border-white shadow-xl" />
              <h3 class="text-xl font-black mt-4 uppercase italic tracking-tight">{{ customer.name }}</h3>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verified Customer</p>
              
              <div class="mt-8 space-y-4 text-left border-t border-slate-50 pt-6">
                <div class="flex items-center gap-3 text-slate-600">
                  <Mail size="16" class="text-slate-300" />
                  <span class="text-xs font-bold truncate">{{ customer.email }}</span>
                </div>
                <div class="flex items-center gap-3 text-slate-600">
                  <Phone size="16" class="text-slate-300" />
                  <span class="text-xs font-bold">{{ customer.phone || 'N/A' }}</span>
                </div>
                <div v-if="customer.phoneSecondary" class="flex items-center gap-3 text-slate-600">
                  <Smartphone size="16" class="text-slate-300" />
                  <span class="text-xs font-bold">{{ customer.phoneSecondary }}</span>
                </div>
                <div class="flex items-center gap-3 text-slate-600">
                  <Calendar size="16" class="text-slate-300" />
                  <span class="text-xs font-bold uppercase">Joined {{ customer.createdAt?.split('T')[0] }}</span>
                </div>
                <div v-if="customer.dob" class="flex items-center gap-3 text-slate-600">
                  <History size="16" class="text-slate-300" />
                  <span class="text-xs font-bold uppercase">DOB: {{ new Date(customer.dob).toLocaleDateString() }}</span>
                </div>
                <div v-if="customer.interests" class="pt-2">
                   <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                     <Heart size="10" /> Interests
                   </p>
                   <div class="flex flex-wrap gap-2">
                      <span v-for="tag in customer.interests.split(',')" :key="tag" class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100 italic">
                        {{ tag.trim() }}
                      </span>
                   </div>
                </div>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p class="text-[9px] font-black text-slate-400 uppercase">Total Orders</p>
                <p class="text-xl font-black mt-1">{{ orders.length }}</p>
              </div>
              <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                <p class="text-[9px] font-black text-slate-400 uppercase">Status</p>
                <p class="text-xs font-black mt-2 uppercase text-emerald-600 bg-emerald-50 py-1 rounded-full">Active</p>
              </div>
            </div>
          </div>

          <!-- Right: Order History -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]">
              <div class="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h3 class="text-xs font-black uppercase text-slate-900 tracking-widest">Order History</h3>
                <ShoppingCart size="18" class="text-slate-300" />
              </div>

              <div v-if="loading" class="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <Clock size="40" class="animate-spin mb-4 opacity-20" />
                <p class="text-xs font-bold uppercase tracking-widest">Scanning History...</p>
              </div>

              <div v-else-if="orders.length === 0" class="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                <ShoppingCart size="40" class="mb-4 opacity-20" />
                <p class="text-xs font-bold uppercase tracking-widest">No orders recorded yet</p>
              </div>

              <div v-else class="divide-y divide-slate-50 overflow-y-auto">
                <div v-for="order in orders" :key="order.id" class="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      <Hash size="18" />
                    </div>
                    <div>
                      <p class="text-sm font-black text-slate-900 uppercase italic tracking-tighter">{{ order.orderNumber || order.id }}</p>
                      <p class="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{{ order.createdAt?.split('T')[0] }} • {{ order.items?.length }} Items</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-6">
                    <div class="text-right">
                      <p class="text-sm font-black text-slate-900">₹{{ order.totalAmount }}</p>
                      <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full" :class="getStatusColor(order.status)">{{ order.status }}</span>
                    </div>
                    <button 
                      @click="emit('viewOrder', order)"
                      class="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm"
                    >
                      <ChevronRight size="16" />
                    </button>
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

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
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

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.animate-in {
  animation-fill-mode: forwards;
}
.fade-in { animation: fade-in 0.3s ease-out; }
.zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
