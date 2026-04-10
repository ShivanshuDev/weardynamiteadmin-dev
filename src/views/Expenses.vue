<script setup>
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Receipt, 
  Plus, 
  TrendingDown, 
  Calendar,
  Tag,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-vue-next'

const adminStore = useAdminStore()
const showAddModal = ref(false)

// Pagination State
const itemsPerPage = 8
const currentPage = ref(1)

const paginatedExpenses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return adminStore.expenses.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(adminStore.expenses.length / itemsPerPage))

const expenseCategories = ['Rent', 'Salaries', 'Marketing', 'Utilities', 'Logistics', 'Packaging', 'Tax', 'Miscellaneous']

const newExpense = ref({
  description: '',
  category: 'Marketing',
  amount: 0,
  date: new Date().toISOString().split('T')[0]
})

const stats = computed(() => {
  const total = adminStore.expenses.reduce((sum, e) => sum + e.amount, 0)
  const count = adminStore.expenses.length
  return { total, count }
})

const handleAddExpense = () => {
  if (newExpense.value.amount <= 0 || !newExpense.value.description) return
  adminStore.addExpense({ ...newExpense.value })
  showAddModal.value = false
  newExpense.value = {
    description: '',
    category: 'Marketing',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
</script>

<template>
  <div class="p-8 space-y-8 animate-in fade-in duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="bg-red-600 text-white p-4 rounded-2xl shadow-xl shadow-red-500/20">
          <Receipt size="28" />
        </div>
        <div>
          <h1 class="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Expense Tracking</h1>
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 text-xs">Operational Outflow Management</p>
        </div>
      </div>

      <button 
        @click="showAddModal = true"
        class="bg-black text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
      >
        <Plus size="18" /> Log Expense
      </button>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
       <div class="col-span-1 md:col-span-2 bg-[#0f172a] p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
          <div class="absolute right-0 top-0 p-8 opacity-10">
             <TrendingDown size="80" class="text-white" />
          </div>
          <p class="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Monthly Burn</p>
          <h2 class="text-4xl font-black text-white mt-2 italic tracking-tighter relative">₹{{ stats.total.toLocaleString() }}</h2>
          <div class="mt-4 flex items-center gap-4">
             <div class="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <CheckCircle2 size="12" /> All Paid
             </div>
             <div class="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <FileText size="12" /> {{ stats.count }} Vouchers
             </div>
          </div>
       </div>

       <div v-for="cat in ['Marketing', 'Salaries']" :key="cat" class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">{{ cat }}</p>
          <h3 class="text-2xl font-black text-slate-900 mt-2 italic tracking-tighter">
             ₹{{ adminStore.expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0).toLocaleString() }}
          </h3>
          <div class="w-full bg-slate-100 h-1.5 rounded-full mt-4">
             <div class="h-full bg-blue-600 rounded-full" style="width: 45%"></div>
          </div>
       </div>
    </div>

    <!-- Expense Table -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
       <div class="p-8 border-b border-slate-50">
          <h3 class="text-sm font-black uppercase italic tracking-tighter text-slate-900">Outflow Registry</h3>
       </div>

       <div class="overflow-x-auto no-scrollbar">
          <table class="w-full text-left">
             <thead class="bg-slate-50/50">
                <tr>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Date</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Description</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest italic">Category</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest italic text-right">Amount</th>
                   <th class="px-8 py-5 text-[9px] font-black uppercase text-slate-400 tracking-widest italic text-center">Status</th>
                </tr>
             </thead>
             <tbody class="divide-y divide-slate-50">
                <tr v-for="expense in paginatedExpenses" :key="expense.id" class="hover:bg-slate-50/80 transition-all group">
                   <td class="px-8 py-3 text-[11px] font-black text-slate-400 uppercase tracking-tighter">{{ formatDate(expense.date) }}</td>
                   <td class="px-8 py-3">
                      <span class="text-sm font-bold text-slate-900">{{ expense.description }}</span>
                   </td>
                   <td class="px-8 py-3">
                      <span class="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-slate-100 text-slate-500 tracking-widest">{{ expense.category }}</span>
                   </td>
                   <td class="px-8 py-3 text-right">
                      <span class="text-base font-black italic tracking-tighter text-slate-900">₹{{ expense.amount.toLocaleString() }}</span>
                   </td>
                   <td class="px-8 py-3 text-center">
                      <div class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600">
                         <CheckCircle2 size="12" />
                         <span class="text-[9px] font-black uppercase tracking-widest">Settled</span>
                      </div>
                   </td>
                </tr>
             </tbody>
          </table>

          <!-- Pagination UI -->
          <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
             <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Inventory Registry Cycle: {{ Math.min(adminStore.expenses.length, itemsPerPage) }} Records</p>
             <div class="flex items-center gap-2">
                <button @click="currentPage--" :disabled="currentPage === 1" class="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size="16" v-if="ChevronLeft"/></button>
                <div class="flex items-center gap-1">
                   <span v-for="p in totalPages" :key="p" @click="currentPage = p" :class="p === currentPage ? 'bg-black text-white border-black' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'" class="w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all cursor-pointer">
                      {{ p }}
                   </span>
                </div>
                <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size="16" v-if="ChevronRight"/></button>
             </div>
          </div>
       </div>

       <div v-if="!adminStore.expenses.length" class="p-20 flex flex-col items-center justify-center text-slate-300 gap-4">
          <Receipt size="48" stroke-width="1" />
          <p class="text-[10px] font-black uppercase tracking-widest italic">No expenses recorded yet</p>
       </div>
    </div>

    <!-- Add Expense Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="showAddModal = false"></div>
       <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div class="p-8 border-b border-slate-50 flex items-center justify-between">
             <h2 class="text-xl font-black italic uppercase text-slate-900">Log New Outflow</h2>
             <button @click="showAddModal = false" class="text-slate-400 hover:text-black transition-colors"><Plus size="24" class="rotate-45" /></button>
          </div>
          
          <div class="p-8 space-y-6">
             <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Description</label>
                <div class="relative">
                   <FileText class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="16" />
                   <input v-model="newExpense.description" type="text" class="w-full bg-slate-50 border border-slate-100 pl-12 pr-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all" placeholder="e.g. Monthly Server Costs" />
                </div>
             </div>

             <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Category</label>
                   <div class="relative">
                      <Tag class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="16" />
                      <select v-model="newExpense.category" class="w-full bg-slate-50 border border-slate-100 pl-12 pr-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all appearance-none cursor-pointer uppercase tracking-widest">
                         <option v-for="c in expenseCategories" :key="c" :value="c">{{ c }}</option>
                      </select>
                   </div>
                </div>
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Total Amount (₹)</label>
                   <input v-model.number="newExpense.amount" type="number" class="bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-xs font-bold font-mono outline-none focus:border-red-600 transition-all" placeholder="0.00" />
                </div>
             </div>

             <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Expense Date</label>
                <div class="relative">
                   <Calendar class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="16" />
                   <input v-model="newExpense.date" type="date" class="w-full bg-slate-50 border border-slate-100 pl-12 pr-6 py-3.5 rounded-2xl text-xs font-bold outline-none focus:border-red-600 transition-all" />
                </div>
             </div>
          </div>

          <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
             <button @click="showAddModal = false" class="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic underline">Cancel</button>
             <button @click="handleAddExpense" class="flex-[2] bg-red-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-red-500/20 active:scale-95">Record & Sync Ledger</button>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
input[type="date"]::-webkit-calendar-picker-indicator {
  opacity: 0;
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: auto;
  height: auto;
  cursor: pointer;
}
</style>
