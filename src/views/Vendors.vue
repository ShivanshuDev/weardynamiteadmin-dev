<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  CreditCard,
  MoreVertical,
  ExternalLink,
  CheckCircle2,
  Clock,
  LayoutGrid,
  List,
  History,
  TrendingDown,
  TrendingUp,
  X
} from 'lucide-vue-next'

const adminStore = useAdminStore()
const showAddModal = ref(false)
const showAccountModal = ref(false)

const selectedVendor = ref(null)
const searchQuery = ref('')
const viewMode = ref('card') // 'card' or 'table'

const categories = ['Fabric', 'Accessories', 'Packaging', 'Logistics', 'Marketing', 'Technology']

const newVendor = ref({
  name: '',
  category: 'Fabric',
  contact: '',
  email: '',
  initialBalance: 0,
  initialBalanceType: 'Payment', // Always Debit
  bankDetails: {
    account: '',
    ifsc: '',
    bank: ''
  }
})

const filteredVendors = computed(() => {
  const vendors = adminStore.vendors.map(v => ({
    ...v,
    balance: adminStore.getVendorBalance(v.id)
  }))

  if (!searchQuery.value) return vendors
  return vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    v.category.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const openAccount = (vendor) => {
  selectedVendor.value = vendor
  showAccountModal.value = true
}

const handleSettlement = (vendorId, amount) => {
  if (amount <= 0) return
  adminStore.payVendorSettlement(vendorId, amount)
}

const exportAccountStatement = () => {
  adminStore.showNotification('Report Generation', 'Institutional Report Generation: The Statement of Account for ' + selectedVendor.value.name + ' is being compiled for export.', 'info')
}

const handleAddVendor = async () => {
  // Field Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\d{10}$/

  if (!newVendor.value.name) {
    return adminStore.showNotification('Validation Error', 'Legal Entity Name is required.', 'warning')
  }
  if (!newVendor.value.email || !emailRegex.test(newVendor.value.email)) {
    return adminStore.showNotification('Validation Error', 'Please provide a valid email address.', 'warning')
  }
  if (!newVendor.value.contact || !phoneRegex.test(newVendor.value.contact.replace(/\s+/g, '').replace(/^\+91/, ''))) {
    return adminStore.showNotification('Validation Error', 'Primary Contact must be exactly 10 digits.', 'warning')
  }

  const vendor = await adminStore.registerVendor({ ...newVendor.value })
  showAddModal.value = false
  newVendor.value = {
    name: '',
    category: 'Fabric',
    contact: '',
    email: '',
    initialBalance: 0,
    initialBalanceType: 'Payment',
    bankDetails: { account: '', ifsc: '', bank: '' }
  }
}

onMounted(async () => {
  await adminStore.fetchVendors()
  // Fetch history for all vendors to ensure balance calculations are accurate
  for (const v of adminStore.vendors) {
     adminStore.fetchVendorHistory(v.id)
  }
})
</script>

<template>
  <div class="p-8 space-y-8 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-500/20">
          <Building2 size="28" />
        </div>
        <div>
          <h1 class="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Vendor Ecosystem</h1>
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Supply Chain & Partner Management</p>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <!-- View Toggle -->
        <div class="flex items-center p-1 bg-slate-100 rounded-2xl gap-1">
           <button 
            @click="viewMode = 'card'"
            class="p-2.5 rounded-xl transition-all"
            :class="viewMode === 'card' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
           >
             <LayoutGrid size="18" />
           </button>
           <button 
            @click="viewMode = 'table'"
            class="p-2.5 rounded-xl transition-all"
            :class="viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
           >
             <List size="18" />
           </button>
        </div>

        <div class="relative group">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size="18" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search partners..." 
            class="bg-white border border-slate-100 pl-12 pr-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition-all w-64 shadow-sm"
          />
        </div>
        <button 
          @click="showAddModal = true"
          class="bg-black text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl hover:shadow-blue-500/10 active:scale-95"
        >
          <Plus size="18" /> Register Partner
        </button>
      </div>
    </div>

    <!-- Vendor Views -->
    <div v-if="viewMode === 'card'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
       <div 
         v-for="vendor in filteredVendors" 
         :key="vendor.id"
         class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden"
       >
          <div class="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
             <button @click="openAccount(vendor)" class="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm" title="Statement of Account"><History size="18" /></button>
          </div>

          <div class="flex items-start gap-5">
             <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                {{ vendor.name.charAt(0) }}
             </div>
             <div class="flex-1 overflow-hidden">
                <div class="flex items-center gap-2">
                   <h3 class="font-black text-lg text-slate-900 truncate">{{ vendor.name }}</h3>
                   <CheckCircle2 v-if="vendor.status === 'Active'" size="16" class="text-emerald-500 shrink-0" />
                </div>
                <div class="flex items-center gap-2 mt-1">
                   <span class="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{{ vendor.category }}</span>
                   <span 
                    class="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border"
                    :class="vendor.balance > 0 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-100'"
                   >
                    {{ vendor.balance > 0 ? `₹${vendor.balance.toLocaleString()} Due` : 'Account Settled' }}
                   </span>
                </div>
             </div>
          </div>

          <div class="mt-6 space-y-3">
             <div class="flex items-center gap-4 text-[10px] font-bold text-slate-500 whitespace-nowrap overflow-hidden">
                <div class="flex items-center gap-2 max-w-[55%] truncate">
                   <Mail size="12" class="text-slate-300 shrink-0" /> {{ vendor.email }}
                </div>
                <div class="flex items-center gap-2">
                   <Phone size="12" class="text-slate-300 shrink-0" /> {{ vendor.contact }}
                </div>
             </div>
             
             <!-- Dynamic Settlement Input -->
             <div class="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between gap-4">
                <div class="flex-1 bg-slate-50 rounded-xl px-4 py-2.5 flex items-center gap-2 border border-slate-100 focus-within:border-blue-600 focus-within:bg-white transition-all">
                   <span class="text-[9px] font-black text-slate-400 italic">₹</span>
                   <input 
                     type="number" 
                     min="0"
                     @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()"
                     placeholder="Send Payment" 
                     class="bg-transparent w-full text-[11px] font-black outline-none placeholder:text-slate-400"
                     @keyup.enter="e => { if(e.target.value > 0) { handleSettlement(vendor.id, Number(e.target.value)); e.target.value = '' } }"
                   />
                </div>
                <button 
                   class="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-black transition-all shadow-lg shadow-blue-500/10 active:scale-90"
                   @click="e => { const input = e.currentTarget.previousElementSibling.querySelector('input'); if(input.value > 0) { handleSettlement(vendor.id, Number(input.value)); input.value = '' } }"
                >
                   <CheckCircle2 size="14" />
                </button>
             </div>

             <div class="pt-4 border-t border-slate-50 mt-2 bg-slate-50/50 -mx-8 -mb-8 p-8 flex items-center justify-between rounded-b-3xl">
                <div>
                   <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Bank Attached</p>
                   <p class="text-[10px] font-black text-slate-900 mt-1 uppercase">{{ vendor.bankDetails?.bank }}</p>
                </div>
                <button @click="openAccount(vendor)" class="text-blue-600 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 group/btn cursor-pointer">
                  View Account <ExternalLink size="12" class="group-hover/btn:translate-x-1 transition-transform" />
                </button>
             </div>
          </div>
       </div>

       <div v-if="!filteredVendors.length" class="col-span-full py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Building2 size="48" stroke-width="1" class="text-slate-300" />
          <p class="text-sm font-black uppercase tracking-widest italic">No partners found in the system</p>
       </div>
    </div>

    <!-- Table View -->
    <div v-else class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
       <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left">
             <thead class="bg-slate-50/50">
                <tr>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest">Partner Identity</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Category</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Contact Matrix</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Bank Mapping</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
                </tr>
             </thead>
             <tbody class="divide-y divide-slate-50">
                <tr v-for="vendor in filteredVendors" :key="vendor.id" class="hover:bg-slate-50/80 transition-all group">
                   <td class="px-8 py-4">
                      <div class="flex items-center gap-4">
                         <div class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-all">{{ vendor.name.charAt(0) }}</div>
                         <div class="flex flex-col">
                            <span class="text-sm font-black text-slate-900 italic tracking-tighter">{{ vendor.name }}</span>
                            <span class="text-[10px] font-bold text-slate-400">ID: VND-{{ 1000 + vendor.id }}</span>
                         </div>
                      </div>
                   </td>
                   <td class="px-8 py-3 text-center">
                       <span class="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{{ vendor.category }}</span>
                    </td>
                    <td class="px-8 py-3 text-center">
                       <div class="flex flex-col gap-0.5">
                          <span class="text-[10px] font-bold text-slate-800">{{ vendor.email }}</span>
                          <span class="text-[10px] font-black text-blue-600">{{ vendor.contact }}</span>
                       </div>
                    </td>
                    <td class="px-8 py-3 text-center">
                       <span class="text-[10px] font-black uppercase text-slate-900 border-b border-slate-100">{{ vendor.bankDetails?.bank }}</span>
                    </td>
                    <td class="px-8 py-3 text-right">
                       <div class="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                          <button @click="openAccount(vendor)" class="bg-blue-50 text-blue-600 p-2 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="View History"><History size="16"/></button>
                          <button class="bg-slate-50 text-slate-400 p-2 rounded-xl hover:bg-black hover:text-white transition-all"><MoreVertical size="16"/></button>
                       </div>
                    </td>
                </tr>
             </tbody>
          </table>
       </div>
    </div>

    <!-- Registration Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="showAddModal = false"></div>
       <div class="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div class="p-8 border-b border-slate-50 flex items-center justify-between">
             <h2 class="text-xl font-black italic uppercase text-slate-900">Partner Registration</h2>
             <button @click="showAddModal = false" class="text-slate-400 hover:text-black transition-colors"><Plus size="24" class="rotate-45" /></button>
          </div>
          
          <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
             <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Legal Entity Name</label>
                   <input v-model="newVendor.name" type="text" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="e.g. Dynamite Logistics" />
                </div>
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Partner Category</label>
                   <select v-model="newVendor.category" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all appearance-none cursor-pointer">
                      <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                   </select>
                </div>
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Primary Contact</label>
                   <input v-model="newVendor.contact" type="text" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="+91 00000 00000" />
                </div>
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Email Address</label>
                   <input v-model="newVendor.email" type="email" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="partner@example.com" />
                </div>
             </div>

             <div class="pt-6 border-t border-slate-50">
               <h4 class="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2"><History size="14"/> Opening Financial State</h4>
               <div class="grid grid-cols-2 gap-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed">
                  <div class="flex flex-col gap-1.5">
                     <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Opening Amount (₹)</label>
                     <input v-model.number="newVendor.initialBalance" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="bg-white border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-black outline-none focus:border-blue-600 transition-all font-mono" placeholder="0.00" />
                  </div>
                  <div class="flex flex-col gap-1.5">
                     <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Balance Status</label>
                     <div class="flex items-center p-4 bg-white rounded-2xl border border-slate-100 h-full">
                        <span class="text-[10px] font-black uppercase text-blue-600 tracking-widest italic">Funds Dispatched (Debit)</span>
                     </div>
                  </div>
               </div>
             </div>

             <div class="pt-6 border-t border-slate-50">
                <h4 class="text-[10px] font-black uppercase text-blue-600 tracking-widest mb-6 flex items-center gap-2"><CreditCard size="14"/> Settlement Details</h4>
                <div class="grid grid-cols-2 gap-6">
                   <div class="flex flex-col gap-1.5 col-span-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Bank Name</label>
                      <input v-model="newVendor.bankDetails.bank" type="text" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="e.g. HDFC Bank, Mumbai" />
                   </div>
                   <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Account Number</label>
                      <input v-model="newVendor.bankDetails.account" type="text" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="000000000000" />
                   </div>
                   <div class="flex flex-col gap-1.5">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">IFSC Code</label>
                      <input v-model="newVendor.bankDetails.ifsc" type="text" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all" placeholder="ABCD0000123" />
                   </div>
                </div>
             </div>
          </div>

          <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
             <button @click="showAddModal = false" class="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic underline">Cancel</button>
             <button @click="handleAddVendor" class="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Verify & Onboard Partner</button>
          </div>
       </div>
    </div>

    <!-- Vendor Account Statement Modal -->
    <div v-if="showAccountModal" class="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-20">
       <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showAccountModal = false"></div>
       <div class="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
             <div class="flex items-center gap-5">
                <div class="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 font-black text-xl">
                  {{ selectedVendor?.name.charAt(0) }}
                </div>
                <div>
                   <h2 class="text-xl font-black italic uppercase tracking-tighter">{{ selectedVendor?.name }}</h2>
                   <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Partner Statement of Account</p>
                </div>
             </div>
             <button @click="showAccountModal = false" class="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-black shadow-sm">
                <X size="24" />
             </button>
          </div>

          <!-- Account Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-slate-50/50">
             <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Initial Credit/Opening</p>
                <div class="flex items-center justify-between mt-1">
                   <h3 class="text-xl font-black text-slate-900 italic">₹{{ Number(selectedVendor?.initialBalance || 0).toLocaleString() }}</h3>
                   <div class="bg-amber-50 text-amber-600 p-2 rounded-lg"><TrendingUp size="16"/></div>
                </div>
             </div>
             <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Total Payments Sent</p>
                <div class="flex items-center justify-between mt-1">
                   <h3 class="text-xl font-black text-slate-900 italic">₹{{ adminStore.getVendorHistory(selectedVendor?.id).filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0).toLocaleString() }}</h3>
                   <div class="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><TrendingDown size="16"/></div>
                </div>
             </div>
             <div class="bg-black p-6 rounded-2xl shadow-xl flex flex-col justify-center">
                <p class="text-[9px] font-black uppercase text-slate-500 tracking-widest">Current Outstanding</p>
                <h3 class="text-2xl font-black text-white mt-1 italic tracking-tighter">₹{{ adminStore.getVendorBalance(selectedVendor?.id).toLocaleString() }}</h3>
             </div>
          </div>

          <!-- Transaction Ledger -->
          <div class="flex-1 overflow-y-auto p-8 pt-0 custom-scrollbar">
             <div class="sticky top-0 bg-white py-4 z-10 border-b border-slate-50 flex items-center justify-between mb-4">
                <h4 class="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em] flex items-center gap-2"><History size="14" class="text-blue-600"/> Transaction History</h4>
             </div>
             <div class="max-h-[380px] overflow-y-auto no-scrollbar border border-slate-50 rounded-2xl">
                <table class="w-full text-left">
                   <thead class="bg-slate-50/50 sticky top-0 z-10">
                      <tr>
                         <th class="px-6 py-4 text-[9px] font-black uppercase text-slate-400">S.No</th>
                         <th class="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Date</th>
                         <th class="px-6 py-4 text-[9px] font-black uppercase text-slate-400">Transaction Details</th>
                         <th class="px-6 py-4 text-[9px] font-black uppercase text-slate-400 text-center">Nature</th>
                         <th class="px-6 py-4 text-[9px] font-black uppercase text-slate-400 text-right">Amount</th>
                      </tr>
                   </thead>
                   <tbody class="divide-y divide-slate-50">
                      <tr v-for="(tx, idx) in adminStore.getVendorHistory(selectedVendor?.id)" :key="tx.id" class="hover:bg-slate-50/50 transition-colors">
                         <td class="px-6 py-3 text-[11px] font-black text-slate-900">#{{ idx + 1 }}</td>
                         <td class="px-6 py-3 text-[11px] font-bold text-slate-900 uppercase tracking-tighter">
                            {{ new Date(tx.date).toLocaleDateString('en-GB') }}
                         </td>
                         <td class="px-6 py-3">
                            <p class="text-[11px] font-black text-slate-900 italic uppercase tracking-tighter">{{ tx.description }}</p>
                            <p class="text-[9px] font-medium text-slate-400 font-mono">{{ tx.id }}</p>
                         </td>
                         <td class="px-6 py-3 text-center">
                            <span 
                             class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border"
                             :class="(tx.type === 'Bill' || tx.type === 'CREDIT') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'"
                            >
                             {{ tx.type }}
                            </span>
                         </td>
                         <td class="px-6 py-3 text-right">
                            <span class="text-[11px] font-black italic tracking-tighter" :class="(tx.type === 'Bill' || tx.type === 'CREDIT') ? 'text-slate-900' : 'text-blue-600'">
                              {{ (tx.type === 'Payment' || tx.type === 'DEBIT') ? '-' : '+' }}₹{{ tx.amount.toLocaleString() }}
                            </span>
                         </td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>

          <!-- Footer Actions -->
          <div class="p-8 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                <Clock size="12"/> Account reconciled Today, 01:05 AM
              </p>
              <div class="flex items-center gap-4">
                 <button @click="showAccountModal = false" class="px-8 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all italic">Dismiss Account</button>
                 <button @click="exportAccountStatement" class="px-8 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-black/10">Export Statement</button>
              </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
