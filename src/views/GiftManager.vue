<script setup>
import { ref, onMounted } from 'vue'
import { Search, Loader2, Gift, CreditCard } from 'lucide-vue-next'
import api from '../utils/api'

const gifts = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedGift = ref(null)
const showModal = ref(false)

const fetchGifts = async () => {
  try {
    loading.value = true
    const res = await api.get('/gift/admin/list')
    gifts.value = Array.isArray(res.data) ? res.data : (res.data.gifts || [])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const openDetails = (gift) => {
  selectedGift.value = gift
  showModal.value = true
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleString()
}

onMounted(() => {
  fetchGifts()
})
</script>

<template>
  <div class="gift-manager p-6 lg:p-10 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
      <div>
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
          <Gift class="text-pink-600 w-10 h-10" />
          Gift Studio
        </h1>
        <p class="text-slate-500 mt-2 font-medium">Manage and audit all purchased gifts and virtual vouchers.</p>
      </div>
    </div>

    <!-- List -->
    <div class="animate-fade-in space-y-6">
      <div v-if="loading" class="flex justify-center py-20">
        <Loader2 class="animate-spin text-pink-600 w-10 h-10" />
      </div>

      <div v-else class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <th class="p-6">Transaction / Type</th>
                <th class="p-6">Buyer (From)</th>
                <th class="p-6">Beneficiary (To)</th>
                <th class="p-6">Amount</th>
                <th class="p-6">Status</th>
                <th class="p-6 text-right">Date</th>
              </tr>
            </thead>
            <tbody class="text-sm font-medium text-slate-700">
              <tr v-for="gift in gifts" :key="gift.PK" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" @click="openDetails(gift)">
                <td class="p-6">
                  <p class="font-bold text-slate-900">{{ gift.txnid || gift.PK.replace('GIFT#', '').substring(0,8) }}</p>
                  <span class="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-[10px] font-bold uppercase tracking-wider mt-1 text-slate-600">
                    {{ gift.giftType?.replace('_', ' ') || 'Unknown' }}
                  </span>
                </td>
                <td class="p-6">
                  <p class="font-bold text-slate-900">{{ gift.sender?.name || 'Unknown' }}</p>
                  <p class="text-xs text-slate-500">{{ gift.sender?.email }}</p>
                </td>
                <td class="p-6">
                  <p class="font-bold text-slate-900">{{ gift.recipient?.name || 'Unknown' }}</p>
                  <p class="text-xs text-slate-500">{{ gift.recipient?.email }}</p>
                </td>
                <td class="p-6 font-bold text-slate-900">
                  ₹{{ gift.amount }}
                </td>
                <td class="p-6">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        :class="{
                          'bg-green-50 text-green-700': gift.status === 'DELIVERED' || gift.status === 'Paid',
                          'bg-amber-50 text-amber-700': gift.status === 'SCHEDULED_PENDING' || gift.status === 'Pending'
                        }">
                    {{ gift.status || 'Unknown' }}
                  </span>
                </td>
                <td class="p-6 text-right text-slate-500 text-xs font-medium">
                  {{ formatDate(gift.createdAt) }}
                </td>
              </tr>
              <tr v-if="!gifts.length">
                <td colspan="6" class="p-10 text-center text-slate-400 font-bold">No gifts found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showModal && selectedGift" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
      
      <div class="relative bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div class="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
          <h3 class="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2">
            <Gift class="text-pink-600 w-5 h-5" /> Gift Details
          </h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">&times;</button>
        </div>
        
        <div class="p-6 space-y-6">
          <div class="bg-slate-50 rounded-2xl p-6 border border-slate-100">
            <h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><CreditCard size="14"/> Payment Info</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400">Transaction ID (TxnId)</p>
                <p class="font-bold text-slate-900">{{ selectedGift.txnid || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400">PayU Payment ID (Mihpayid)</p>
                <p class="font-bold text-slate-900">{{ selectedGift.payuId || 'N/A' }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
                <p class="font-bold text-pink-600 text-lg">₹{{ selectedGift.amount }}</p>
              </div>
              <div>
                <p class="text-[10px] uppercase font-bold text-slate-400">Status</p>
                <p class="font-bold text-slate-900">{{ selectedGift.status }}</p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Sender (Buyer)</h4>
              <div class="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <p class="font-bold text-slate-900">{{ selectedGift.sender?.name }}</p>
                <p class="text-sm text-slate-500 mt-1">{{ selectedGift.sender?.email }}</p>
                <p class="text-sm text-slate-500 mt-1">{{ selectedGift.sender?.phone }}</p>
                <p class="text-xs text-slate-400 mt-3 break-all">ID: {{ selectedGift.senderId }}</p>
              </div>
            </div>
            
            <div>
              <h4 class="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Beneficiary (Recipient)</h4>
              <div class="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <p class="font-bold text-slate-900">{{ selectedGift.recipient?.name }}</p>
                <p class="text-sm text-slate-500 mt-1">{{ selectedGift.recipient?.email }}</p>
                <p class="text-sm text-slate-500 mt-1">{{ selectedGift.recipient?.phone }}</p>
                <div v-if="selectedGift.recipient?.address" class="mt-3 text-xs bg-slate-50 p-2 rounded text-slate-600">
                  <strong>Shipping Address:</strong><br/>
                  {{ selectedGift.recipient.address }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedGift.recipient?.message" class="bg-amber-50 border border-amber-100 rounded-xl p-5">
            <h4 class="text-xs font-black uppercase tracking-widest text-amber-600/70 mb-2">Personal Message</h4>
            <p class="text-amber-900 italic">"{{ selectedGift.recipient.message }}"</p>
          </div>
          
          <div v-if="selectedGift.scheduledDate" class="bg-blue-50 border border-blue-100 rounded-xl p-5 flex justify-between items-center">
            <div>
              <h4 class="text-xs font-black uppercase tracking-widest text-blue-600/70 mb-1">Scheduled Delivery</h4>
              <p class="text-blue-900 font-medium">{{ new Date(selectedGift.scheduledDate).toLocaleString() }}</p>
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom Scrollbar for Modal */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 20px;
}
</style>
