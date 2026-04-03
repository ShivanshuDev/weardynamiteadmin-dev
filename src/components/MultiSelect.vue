<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ChevronDown, X, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: {
    type: [Array, String],
    default: () => []
  },
  options: {
    type: Array,
    required: true
  },
  placeholder: {
    type: String,
    default: 'Select options'
  },
  multiple: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const containerRef = ref(null)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const selectOption = (option) => {
  if (!props.multiple) {
    emit('update:modelValue', option.value)
    isOpen.value = false
    return
  }

  const newValue = [...props.modelValue]
  const index = newValue.findIndex(v => v === option.value)
  
  if (index === -1) {
    newValue.push(option.value)
  } else {
    newValue.splice(index, 1)
  }
  
  emit('update:modelValue', newValue)
}

const isSelected = (value) => {
  if (props.multiple) {
    return props.modelValue.includes(value)
  }
  return props.modelValue === value
}

const showOption = (option) => {
  return !isSelected(option.value)
}

const removeValue = (value) => {
  if (props.multiple) {
    const newValue = props.modelValue.filter(v => v !== value)
    emit('update:modelValue', newValue)
  } else {
    emit('update:modelValue', '')
  }
}

const getLabel = (value) => {
  return props.options.find(o => o.value === value)?.label || value
}

const getColor = (value) => {
  return props.options.find(o => o.value === value)?.color || null
}

// Click outside to close
const handleClickOutside = (event) => {
  if (containerRef.value && !containerRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="relative w-full" ref="containerRef">
    <!-- Trigger / Value Display -->
    <div 
      @click="toggleDropdown"
      :class="[
        'w-full bg-slate-50 border border-slate-100 rounded-xl min-h-[48px] p-2 flex flex-wrap gap-2 items-center cursor-pointer transition-all hover:border-blue-600/30 overflow-hidden',
        isOpen ? 'ring-2 ring-blue-600/10 border-blue-600' : ''
      ]"
    >
      <!-- Placeholder -->
      <div v-if="multiple ? modelValue.length === 0 : !modelValue" class="px-2 text-slate-400 text-xs font-bold whitespace-nowrap">
        {{ placeholder }}
      </div>
      
      <!-- Multi-Select Display -->
      <template v-if="multiple">
        <!-- Collapsed View: 1st Chip + Count -->
        <template v-if="!isOpen && modelValue.length > 1">
          <div 
            class="bg-white border px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm"
            :style="getColor(modelValue[0]) ? { borderColor: `${getColor(modelValue[0])}20`, color: getColor(modelValue[0]) } : {}"
          >
            <span v-if="getColor(modelValue[0])" class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getColor(modelValue[0]) }"></span>
            <span class="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">{{ getLabel(modelValue[0]) }}</span>
            <button @click.stop="removeValue(modelValue[0])" class="text-slate-400 hover:text-red-500 transition-colors">
              <X size="12" />
            </button>
          </div>
          <div class="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm shadow-blue-200">
            +{{ modelValue.length - 1 }} More
          </div>
        </template>
        
        <!-- Expanded View: All Chips -->
        <template v-else>
          <div 
            v-for="value in modelValue" 
            :key="value"
            class="bg-white border px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-sm animate-in zoom-in duration-200 max-w-full"
            :style="getColor(value) ? { borderColor: `${getColor(value)}20`, color: getColor(value) } : { borderColor: '#e2e8f0' }"
          >
            <span v-if="getColor(value)" class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: getColor(value) }"></span>
            <span class="text-[10px] font-black uppercase tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">{{ getLabel(value) }}</span>
            <button 
              @click.stop="removeValue(value)"
              class="text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size="12" />
            </button>
          </div>
        </template>
      </template>

      <!-- Single-Select Display -->
      <template v-else-if="modelValue">
        <div class="px-2 text-xs font-black uppercase tracking-widest text-blue-600 truncate max-w-[80%]">
          {{ getLabel(modelValue) }}
        </div>
      </template>

      <div class="ml-auto pr-2 shrink-0">
        <ChevronDown 
          :size="16" 
          :class="['text-slate-400 transition-transform duration-300', isOpen ? 'rotate-180 text-blue-600' : '']" 
        />
      </div>
    </div>

    <!-- Dropdown Panel -->
    <div 
      v-if="isOpen"
      class="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 p-2 animate-in fade-in zoom-in duration-200 max-h-60 overflow-y-auto custom-scrollbar"
    >
      <div v-if="options.length === 0" class="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
        No options available
      </div>
      
      <div 
        v-for="option in options" 
        :key="option.value"
        @click="selectOption(option)"
        :class="[
          'flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all mb-1',
          isSelected(option.value) ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'
        ]"
      >
        <span class="text-xs font-black uppercase tracking-widest">{{ option.label }}</span>
        <Check v-if="isSelected(option.value)" size="14" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
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
.fade-in { animation: fade-in 0.2s ease-out; }
.zoom-in { animation: zoom-in 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
