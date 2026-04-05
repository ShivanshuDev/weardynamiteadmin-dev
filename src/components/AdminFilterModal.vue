<script setup>
import { ref, watch } from 'vue'
import { 
  X, Filter, RotateCcw, Search, Calendar, 
  Tag, Layers, Users, Zap, Check 
} from 'lucide-vue-next'

const props = defineProps({
  show: Boolean,
  initialFilters: Object
})

const emit = defineEmits(['close', 'apply'])

const filters = ref({
  searchQuery: '',
  category: 'All',
  status: 'All',
  gender: 'All',
  startDate: '',
  endDate: ''
})

// Sync with initial filters when modal opens
watch(() => props.show, (isShowing) => {
  if (isShowing && props.initialFilters) {
    filters.value = { ...filters.value, ...props.initialFilters }
  }
})

const resetFilters = () => {
  filters.value = {
    searchQuery: '',
    category: 'All',
    status: 'All',
    gender: 'All',
    startDate: '',
    endDate: ''
  }
}

const applyFilters = () => {
  emit('apply', { ...filters.value })
  emit('close')
}

const categories = ['All', 'Apparel', 'Accessories', 'Footwear']
const statuses = ['All', 'Draft', 'Active', 'Under Review', 'Inactive', 'Sold', 'Return']
const genders = ['All', 'Men', 'Women', 'Unisex']

</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div 
        class="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300"
        @click.stop
      >
        <!-- Header -->
        <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Filter size="20" />
            </div>
            <div>
              <h3 class="text-lg font-black text-slate-900 tracking-tight italic uppercase">Advanced Query</h3>
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Refine Vault Results</p>
            </div>
          </div>
          <button 
            @click="emit('close')"
            class="p-2 hover:bg-slate-200/50 rounded-xl transition-all text-slate-400 hover:text-slate-900"
          >
            <X size="20" />
          </button>
        </div>

        <!-- Body -->
        <div class="p-8 space-y-8">
          <!-- Keyword Matrix -->
          <div class="space-y-3">
            <label class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              <Search size="12" /> Keyword Identification
            </label>
            <div class="relative group">
              <input 
                v-model="filters.searchQuery"
                type="text"
                placeholder="Search by name, ID, or SKU..."
                class="w-full pl-5 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white transition-all text-sm font-bold text-slate-900 placeholder:text-slate-300"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6">
            <!-- Market Segment -->
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                <Layers size="12" /> Category
              </label>
              <select 
                v-model="filters.category"
                class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white transition-all text-xs font-black uppercase tracking-widest text-slate-900 appearance-none"
              >
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>

            <!-- Identity -->
            <div class="space-y-3">
              <label class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
                <Users size="12" /> Target Segment
              </label>
              <select 
                v-model="filters.gender"
                class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white transition-all text-xs font-black uppercase tracking-widest text-slate-900 appearance-none"
              >
                <option v-for="g in genders" :key="g" :value="g">{{ g }}</option>
              </select>
            </div>
          </div>

          <!-- Lifecycle Cohort -->
          <div class="space-y-3">
            <label class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              <Zap size="12" /> Lifecycle Status
            </label>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="status in statuses" 
                :key="status"
                @click="filters.status = status"
                class="px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all"
                :class="filters.status === status 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-900'"
              >
                {{ status }}
              </button>
            </div>
          </div>

          <!-- Temporal Persistence -->
          <div class="space-y-3">
            <label class="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">
              <Calendar size="12" /> Registration Window
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div class="relative group">
                <input 
                  v-model="filters.startDate"
                  type="date"
                  class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white transition-all text-xs font-bold text-slate-900 cursor-pointer"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px] font-black uppercase">Start</span>
              </div>
              <div class="relative group">
                <input 
                  v-model="filters.endDate"
                  type="date"
                  class="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 focus:bg-white transition-all text-xs font-bold text-slate-900 cursor-pointer"
                />
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[8px] font-black uppercase">End</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center gap-4">
          <button 
            @click="resetFilters"
            class="flex items-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200/50 transition-all active:scale-95"
          >
            <RotateCcw size="16" /> Restore Defaults
          </button>
          <button 
            @click="applyFilters"
            class="flex-1 bg-black text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-900/40 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Launch Filter Query <Zap size="16" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
