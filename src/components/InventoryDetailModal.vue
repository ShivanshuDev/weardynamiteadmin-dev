<script setup>
import { computed, ref } from 'vue'
import { 
  X, 
  Package, 
  Layers, 
  ArrowUpRight, 
  CheckCircle2, 
  FileText,
  Table as FileSpreadsheet,
  ChevronDown
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import { useAdminStore } from '../stores/adminStore'

const props = defineProps({
  show: Boolean,
  product: Object,
  allInventory: Array
})

const emit = defineEmits(['close'])
const adminStore = useAdminStore()
const showStatusDropdown = ref(false)

const statuses = ['Active', 'Draft', 'Under Review', 'Low', 'Critical', 'Archived']

const relatedProducts = computed(() => {
  if (!props.product || !props.allInventory) return []
  const base = props.product.base_product_name || props.product.name?.split(' (')[0] || ''
  if (!base) return []
  
  return props.allInventory.filter(item => {
    const itemBase = item.base_product_name || item.name?.split(' (')[0] || ''
    return itemBase && itemBase.toLowerCase() === base.toLowerCase() && item.inventory_id !== props.product.inventory_id
  })
})

const updateStatus = async (newStatus) => {
  try {
    const invoiceId = props.product.invoice_number
    const inventoryId = props.product.inventory_id
    if (invoiceId && inventoryId) {
      await adminStore.updateInventoryItemStatus(invoiceId, inventoryId, newStatus)
      showStatusDropdown.value = false
    }
  } catch (error) {
    console.error('Failed to update status:', error)
  }
}

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr || new Date())
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const exportToPDF = () => {
  const doc = new jsPDF('p', 'mm', 'a4')
  
  // Header
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('DYNAMITE PRO', 12, 18)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`PRODUCT INTELLIGENCE: ${props.product.sku}`, 12, 26)
  
  const dateStr = formatDateNumeric(new Date())
  doc.text(`Report Date: ${dateStr}`, 198, 26, { align: 'right' })
  
  // SKU Summary
  doc.setFillColor(248, 250, 252)
  doc.rect(10, 32, 190, 20, 'F')
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(8)
  doc.text(`Primary Category: ${props.product.category.toUpperCase()}`, 15, 36)
  doc.text(`Total SKU Quantity: ${props.product.totalQuantity}`, 15, 42)
  doc.text(`Valuation: Rs. ${Number(props.product.totalValuation || 0).toLocaleString()}`, 110, 42)
  doc.text(`Location: ${props.product.location}`, 150, 46)

  // Table Headers
  const startY = 60
  doc.setFillColor(74, 109, 167)
  doc.rect(10, startY, 190, 10, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  const colX = [10, 20, 80, 115, 155]
  const headers = ['#', 'RELATED VARIANT / SKU', 'STOCK LEVEL', 'STATUS', 'LOCATION']
  
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 2, startY + 6)
    doc.setDrawColor(255, 255, 255, 0.3)
    doc.line(colX[i], startY, colX[i], startY + 10)
  })
  doc.line(200, startY, 200, startY + 10)
  
  // Rows
  let currentY = startY + 10
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  
  relatedProducts.value.forEach((item, idx) => {
    const data = [
      idx + 1,
      `${item.name} (${item.sku})`,
      `${item.stock} Units`,
      item.status,
      item.location
    ]
    
    data.forEach((d, i) => {
      let txt = String(d)
      if (i === 4 || i === 5) txt = `Rs. ${Number(d || 0).toLocaleString()}`
      doc.text(txt, colX[i] + 2, currentY + 6)
      doc.setDrawColor(220, 220, 220)
      doc.line(colX[i], currentY, colX[i], currentY + 10)
    })
    doc.line(200, currentY, 200, currentY + 10) // Right edge
    
    doc.setDrawColor(220, 220, 220)
    doc.line(10, currentY + 10, 200, currentY + 10) // Horizontal line
    currentY += 10
  })

  doc.save(`Product_Intel_${props.product.sku}_${new Date().toISOString().split('T')[0]}.pdf`)
}

const exportToExcel = () => {
  let html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; font-family: sans-serif; }
          th { background-color: #4a6da7; color: white; padding: 12px; font-size: 14px; text-transform: uppercase; border: 1px solid #3b5a8a; }
          td { padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; }
          .header-title { font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 5px; }
          .header-meta { font-size: 14px; color: #64748b; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header-title">DYNAMITE PRO - PRODUCT INTELLIGENCE</div>
        <div class="header-meta">SKU: ${props.product.sku} | Category: ${props.product.category} | Valuation: Rs. ${Number(props.product.totalValuation || 0).toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Related Variant / SKU</th><th>Stock Level</th><th>Status</th><th>Location</th>
            </tr>
          </thead>
          <tbody>
  `

  relatedProducts.value.forEach((rel, idx) => {
    html += `
      <tr>
        <td>${idx + 1}</td>
        <td>${rel.name}</td>
        <td>${rel.sku}</td>
        <td>${rel.stock || 0}</td>
        <td>Rs. ${Number(rel.price || 0).toLocaleString()}</td>
        <td>Rs. ${Number((rel.stock || 0) * (rel.price || 0)).toLocaleString()}</td>
      </tr>
    `
  })

  html += `</tbody></table></body></html>`

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Product_Intel_${props.product.sku}_${new Date().toISOString().split('T')[0]}.xls`
  link.click()
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" @click="emit('close')"></div>
    
    <div class="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="bg-indigo-600 px-8 py-6 text-white flex items-center justify-between">
         <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
               <Layers size="24" />
            </div>
            <div>
               <h2 class="text-xl font-black italic uppercase tracking-tighter">Product Intelligence</h2>
               <p class="text-[10px] font-black uppercase text-indigo-100/60 tracking-widest mt-0.5">Cluster Analysis & SKU Manifest</p>
            </div>
         </div>
         <button @click="emit('close')" class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-black transition-all">
            <X size="20" />
         </button>
      </div>

      <div class="p-8 space-y-8 max-h-[85vh] overflow-y-auto no-scrollbar">
         <!-- Selection Overview -->
         <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
               <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Base Product</p>
               <h3 class="text-xs font-black text-slate-900 mt-1 uppercase truncate">{{ product?.base_product_name || product?.name?.split(' (')[0] }}</h3>
            </div>
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
               <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Active SKU</p>
               <h3 class="text-xs font-black text-slate-900 mt-1 italic">{{ product?.sku }}</h3>
            </div>
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center">
               <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Current Stock</p>
               <h3 class="text-xs font-black text-blue-600 mt-1">{{ product?.stock }} Units</h3>
            </div>
            <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center relative">
               <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Health Status</p>
               <div 
                 @click="showStatusDropdown = !showStatusDropdown"
                 class="flex items-center justify-between gap-2 mt-1 cursor-pointer hover:bg-slate-200 transition-all p-1 -m-1 rounded-lg"
               >
                  <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 rounded-full" :class="product?.status === 'Healthy' ? 'bg-emerald-500' : 'bg-orange-500'"></div>
                    <h3 class="text-xs font-black text-slate-900 italic lowercase first-letter:uppercase">{{ product?.status || 'Active' }}</h3>
                  </div>
                  <ChevronDown size="12" class="text-slate-400" />
               </div>

               <!-- Status Dropdown -->
               <div v-if="showStatusDropdown" class="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 shadow-2xl rounded-xl z-50 overflow-hidden py-1">
                  <button 
                    v-for="s in statuses" 
                    :key="s"
                    @click="updateStatus(s)"
                    class="w-full px-4 py-2 text-left text-[9px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  >
                    {{ s }}
                  </button>
               </div>
            </div>
            <div class="bg-[#0f172a] p-4 rounded-2xl shadow-xl flex flex-col justify-center">
               <p class="text-[8px] font-black uppercase text-slate-500 tracking-widest">Location</p>
               <h3 class="text-[11px] font-black text-white mt-1 italic tracking-tighter truncate">{{ product?.location }}</h3>
            </div>
         </div>

         <!-- Related Products Table -->
         <div class="space-y-4">
            <div class="flex items-center justify-between">
               <h3 class="text-xs font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                  <Package size="14" class="text-indigo-600" /> Related Product Cluster
               </h3>
               <div class="flex items-center gap-2">
                  <button @click="exportToExcel" class="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95">
                     <FileSpreadsheet size="14" /> Download Excel
                  </button>
                  <button @click="exportToPDF" class="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl active:scale-95">
                     <FileText size="14" /> Download PDF
                  </button>
               </div>
            </div>

            <div class="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden shadow-inner-sm">
               <table class="w-full text-left border-collapse">
                  <thead class="bg-[#4a6da7] text-white">
                     <tr class="divide-x divide-blue-400/30">
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">#</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Related Variant / SKU</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Stock Level</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-center">Status</th>
                        <th class="px-6 py-4 text-[9px] font-black uppercase tracking-widest">Location</th>
                     </tr>
                  </thead>
                  <tbody class="divide-y-2 divide-slate-100">
                     <tr v-for="(item, idx) in relatedProducts" :key="item.sku" class="divide-x divide-slate-100 hover:bg-slate-50 transition-all">
                        <td class="px-6 py-4 text-[10px] font-black text-slate-400">{{ idx + 1 }}</td>
                        <td class="px-6 py-4">
                           <div class="flex flex-col">
                              <span class="text-xs font-black text-slate-900 uppercase italic tracking-tight">{{ item.name }}</span>
                              <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{{ item.sku }}</span>
                           </div>
                        </td>
                        <td class="px-6 py-4">
                           <span class="text-sm font-black text-slate-900">{{ item.stock }}</span>
                           <span class="text-[8px] font-black text-slate-400 uppercase ml-1">Units</span>
                        </td>
                        <td class="px-6 py-4 text-center">
                           <span 
                             class="px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border mx-auto"
                             :class="item.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'"
                           >
                             {{ item.status }}
                           </span>
                        </td>
                        <td class="px-6 py-4">
                           <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-lg">{{ item.location }}</span>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
         </div>

         <!-- Footer Verification -->
         <div class="flex items-center justify-between pt-6 border-t border-slate-100">
            <div class="flex items-center gap-3 text-indigo-600 font-black text-[10px] uppercase tracking-widest">
               <CheckCircle2 size="16" /> Institutional Integrity Verified
            </div>
            <div class="flex items-center gap-2 text-slate-400 font-black text-[9px] uppercase tracking-widest">
               Report Timestamp: {{ formatDateNumeric(new Date()) }}
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
