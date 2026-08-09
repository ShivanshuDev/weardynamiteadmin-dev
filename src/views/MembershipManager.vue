<script setup>
import { ref, onMounted } from 'vue'
import { Search, Edit2, Trash2, Crown, Save, Loader2, IndianRupee, MapPin } from 'lucide-vue-next'
import api from '../utils/api'

const activeTab = ref('LIST') // LIST | PRICING
const memberships = ref([])
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')

const pricing = ref({
  '1_month': 0,
  '3_months': 0,
  '6_months': 0,
  '1_year': 0,
  '3_years': 0,
  '6_years': 0
})

const selectedMember = ref(null)
const showModal = ref(false)

const fetchMemberships = async () => {
  try {
    loading.value = true
    const res = await api.get('/memberships/admin/list')
    memberships.value = Array.isArray(res.data) ? res.data : (res.data.memberships || [])
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchPricing = async () => {
  try {
    loading.value = true
    const res = await api.get('/config/membership-pricing')
    if (res.data && res.data.pricing) {
      pricing.value = { ...pricing.value, ...res.data.pricing }
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const savePricing = async () => {
  try {
    saving.value = true
    await api.put('/config/membership-pricing', pricing.value)
    alert('Pricing updated successfully')
  } catch (e) {
    console.error(e)
    alert(`Failed to update pricing: ${e.response?.data?.message || e.message}`)
  } finally {
    saving.value = false
  }
}

const openDetails = (member) => {
  selectedMember.value = member
  showModal.value = true
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  return new Date(dateStr).toLocaleDateString()
}

onMounted(() => {
  fetchMemberships()
  fetchPricing()
})
</script>

<template>
  <div class="membership-manager p-6 lg:p-10 max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
      <div>
        <h1 class="text-4xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
          <Crown class="text-purple-600 w-10 h-10" />
          Dynamite Club
        </h1>
        <p class="text-slate-500 mt-2 font-medium">Manage memberships and configure pricing.</p>
      </div>
      
      <div class="flex gap-4 p-2 bg-white rounded-2xl shadow-sm border border-slate-100">
        <button @click="activeTab = 'LIST'" :class="['px-6 py-3 rounded-xl font-bold text-sm transition-all', activeTab === 'LIST' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50']">Members List</button>
        <button @click="activeTab = 'PRICING'" :class="['px-6 py-3 rounded-xl font-bold text-sm transition-all', activeTab === 'PRICING' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-50']">Pricing Config</button>
      </div>
    </div>

    <!-- Pricing Tab -->
    <div v-if="activeTab === 'PRICING'" class="animate-fade-in">
      <div class="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
        <div class="flex items-center gap-3 mb-8">
          <IndianRupee class="text-purple-600" />
          <h2 class="text-xl font-black uppercase tracking-tight text-slate-900">Membership Pricing</h2>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div v-for="(val, key) in pricing" :key="key" class="space-y-2">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest">{{ key.replace('_', ' ') }}</label>
            <div class="relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
              <input v-model.number="pricing[key]" type="number" class="w-full bg-slate-50 border-0 rounded-xl py-4 pl-10 pr-4 text-slate-900 font-bold focus:ring-2 focus:ring-purple-600 outline-none" />
            </div>
          </div>
        </div>
        
        <button @click="savePricing" :disabled="saving" class="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-4 rounded-xl flex items-center gap-2 transition-all">
          <Loader2 v-if="saving" class="animate-spin w-5 h-5" />
          <Save v-else class="w-5 h-5" />
          Save Pricing Configuration
        </button>
      </div>
    </div>

    <!-- List Tab -->
    <div v-if="activeTab === 'LIST'" class="animate-fade-in space-y-6">
      
      <div v-if="loading" class="flex justify-center py-20">
        <Loader2 class="animate-spin text-purple-600 w-10 h-10" />
      </div>

      <div v-else class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                <th class="p-6">Member</th>
                <th class="p-6">Duration</th>
                <th class="p-6">Status</th>
                <th class="p-6">Joined Date</th>
                <th class="p-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="text-sm font-medium text-slate-700">
              <tr v-for="member in memberships" :key="member.PK" class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" @click="openDetails(member)">
                <td class="p-6">
                  <p class="font-bold text-slate-900">{{ member.user?.name || 'Unknown' }}</p>
                  <p class="text-xs text-slate-500">{{ member.PK.replace('USER#', '') }}</p>
                </td>
                <td class="p-6">
                  <span class="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-wider">
                    {{ member.duration?.replace('_', ' ') || 'N/A' }}
                  </span>
                </td>
                <td class="p-6">
                  <span :class="member.status === 'active' ? 'text-emerald-600' : 'text-slate-400'" class="font-bold flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    <div :class="member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'" class="w-2 h-2 rounded-full"></div>
                    {{ member.status || 'Active' }}
                  </span>
                </td>
                <td class="p-6 text-slate-500">{{ formatDate(member.startDate) }}</td>
                <td class="p-6 text-right">
                  <button class="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase tracking-widest" @click.stop="openDetails(member)">View</button>
                </td>
              </tr>
              <tr v-if="!memberships.length">
                <td colspan="5" class="p-10 text-center text-slate-400 font-bold">No memberships found.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Details Modal -->
    <div v-if="showModal && selectedMember" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-up">
        <div class="sticky top-0 bg-white/80 backdrop-blur-md p-6 border-b border-slate-100 flex justify-between items-center z-10">
          <h3 class="text-xl font-black text-slate-900 flex items-center gap-2"><Crown class="text-purple-600 w-5 h-5"/> Member Details</h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-900 transition-colors font-bold text-xl">&times;</button>
        </div>
        
        <div class="p-8 space-y-8">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Name</label>
              <p class="font-bold text-slate-900">{{ selectedMember.user?.name || 'N/A' }}</p>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Phone</label>
              <p class="font-bold text-slate-900">{{ selectedMember.user?.phone || 'N/A' }}</p>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Date of Birth</label>
              <p class="font-bold text-slate-900">{{ selectedMember.user?.dob || 'N/A' }}</p>
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Interests</label>
              <p class="font-bold text-slate-900">{{ selectedMember.user?.interests || 'N/A' }}</p>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-8">
            <h4 class="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Membership Info</h4>
            <div class="grid grid-cols-2 gap-6">
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</label>
                <p class="font-bold text-purple-600">{{ selectedMember.duration?.replace('_', ' ') || 'N/A' }}</p>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Price Paid</label>
                <p class="font-bold text-slate-900">₹{{ selectedMember.pricePaid || 0 }}</p>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Joined Date</label>
                <p class="font-bold text-slate-900">{{ formatDate(selectedMember.startDate) }}</p>
              </div>
            </div>
          </div>

          <div class="border-t border-slate-100 pt-8">
            <h4 class="text-sm font-black uppercase tracking-widest text-slate-900 mb-4">Preferences & Kit</h4>
            <ul class="space-y-3">
              <li class="flex items-center gap-2 font-bold text-sm" :class="selectedMember.receivesBlogs ? 'text-emerald-600' : 'text-slate-400'">
                <div class="w-4 h-4 rounded-full flex items-center justify-center" :class="selectedMember.receivesBlogs ? 'bg-emerald-100' : 'bg-slate-100'">&check;</div> Member Blogs
              </li>
              <li class="flex items-center gap-2 font-bold text-sm" :class="selectedMember.receivesNotifications ? 'text-emerald-600' : 'text-slate-400'">
                <div class="w-4 h-4 rounded-full flex items-center justify-center" :class="selectedMember.receivesNotifications ? 'bg-emerald-100' : 'bg-slate-100'">&check;</div> Priority Notifications
              </li>
              <li class="flex items-center gap-2 font-bold text-sm" :class="selectedMember.kitDelivery ? 'text-emerald-600' : 'text-slate-400'">
                <div class="w-4 h-4 rounded-full flex items-center justify-center" :class="selectedMember.kitDelivery ? 'bg-emerald-100' : 'bg-slate-100'">&check;</div> Kit Delivery
              </li>
            </ul>
            <div v-if="selectedMember.kitDelivery && selectedMember.kitAddress" class="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <label class="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2"><MapPin size="12"/> Delivery Address</label>
              <p class="font-bold text-slate-700 text-sm leading-relaxed">{{ selectedMember.kitAddress }}</p>
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
.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleUp {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
