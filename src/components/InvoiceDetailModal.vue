<script setup>
import { ref, computed } from 'vue'
import { X, Package, Calendar, User, ShoppingBag, DollarSign, Layers, Edit3, ChevronRight, FileText, Tag, Hash, Table as FileSpreadsheet } from 'lucide-vue-next'
import { useAdminStore } from '../stores/adminStore'
import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()

const props = defineProps(['show', 'invoice'])
const emit = defineEmits(['close', 'edit'])

const totalQuantity = computed(() => {
  if (!props.invoice) return 0
  // Handle both backend total_quantity and frontend calculation
  if (props.invoice.total_quantity || props.invoice.totalQuantity) {
     return props.invoice.total_quantity || props.invoice.totalQuantity
  }
  return (props.invoice.items || []).reduce((sum, item) => {
    return sum + (item.variants ? item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0) : Number(item.quantity || item.qty || 0))
  }, 0)
})

const statusOptions = [
  { label: 'Draft', color: 'bg-slate-100 text-slate-500 border-slate-200' },
  { label: 'Active', color: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
  { label: 'Under Review', color: 'bg-orange-100 text-orange-600 border-orange-200' },
  { label: 'Inactive', color: 'bg-red-100 text-red-600 border-red-200' }
]

const updateStatus = (status) => {
  adminStore.updateInventoryStatus(props.invoice.id, status)
}

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const exportToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('DYNAMITE PRO', 12, 18)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  const invNum = props.invoice.invoice_number || props.invoice.invoiceNumber || 'N/A'
  doc.text(`INVOICE STATEMENT: ${invNum}`, 12, 26)
  
  const dateStr = formatDateNumeric(props.invoice.invoice_date || props.invoice.invoiceDate)
  doc.text(`Billing Date: ${dateStr}`, 285, 26, { align: 'right' })
  
  const truncate = (text, maxWidth) => {
    const txt = String(text || '-')
    const textWidth = doc.getTextWidth(txt)
    if (textWidth <= maxWidth) return txt
    
    let truncated = txt
    while (doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1)
    }
    return truncated + '...'
  }

  const startY = 60
  doc.setFillColor(74, 109, 167)
  doc.rect(10, startY, 277, 10, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(6)
  const colX = [10, 18, 55, 90, 125, 170, 205, 225, 245, 265]
  const colWidths = [8, 37, 35, 35, 45, 35, 20, 20, 20, 22]
  const headers = ['#', 'PRODUCT NAME / SKU', 'REF / ORDER ID', 'CAT / SUB', 'GENDER / FABRIC / OCC', 'SIZE', 'COLORS', 'QTY', 'PRICE', 'TOTAL']
  
  headers.forEach((h, i) => {
    doc.text(truncate(h, colWidths[i] - 2), colX[i] + 2, startY + 6)
    doc.setDrawColor(255, 255, 255, 0.3)
    doc.line(colX[i], startY, colX[i], startY + 10)
  })
  doc.line(287, startY, 287, startY + 10)
  
  let currentY = startY + 10
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  
  let rowIdx = 1
  props.invoice.items.forEach((item) => {
    const variants = item.variants || [{ size: 'N/A', quantity: (item.quantity || 0), colors: [] }]
    
    variants.forEach((v) => {
      const price = item.cost_price || item.price || 0
      const qty = v.quantity || 0
      const lineTotal = price * (qty * (v.colors?.length || 1))
      const colorStr = v.colors ? v.colors.join(', ') : (item.color || '-')
      const specStr = `${item.gender || '-'}/${item.fabric || '-'}/${item.occasion || '-'}`
      const catStr = `${item.category || '-'}/${item.sub_category || item.subCategory || '-'}`
      
      const data = [
        rowIdx++,
        `${item.product_name || item.productName} (${item.sku || 'N/A'})`,
        item.order_id || item.orderId || '-',
        catStr,
        specStr,
        v.size,
        colorStr,
        qty * (v.colors?.length || 1),
        price,
        lineTotal
      ]
      
      data.forEach((d, i) => {
        const txt = truncate(d, colWidths[i] - 2)
        doc.text(txt, colX[i] + 2, currentY + 6)
        doc.setDrawColor(220, 220, 220)
        doc.line(colX[i], currentY, colX[i], currentY + 10)
      })
      doc.line(287, currentY, 287, currentY + 10)
      doc.setDrawColor(220, 220, 220)
      doc.line(10, currentY + 10, 287, currentY + 10)
      
      currentY += 10
      if (currentY > 185) {
        doc.addPage()
        currentY = 20
      }
    })
  })

  doc.setFillColor(15, 23, 42)
  doc.rect(10, currentY, 277, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('GRAND TOTAL VALUATION', 15, currentY + 6)
  doc.text(`Rs. ${Number(props.invoice.total_amount || props.invoice.totalAmount || 0).toLocaleString()}`, 250, currentY + 6)

  doc.save(`Invoice_INT_${invNum.replace(/\//g, '-')}.pdf`)
}

const exportToExcel = () => {
  const invNum = props.invoice.invoice_number || props.invoice.invoiceNumber || 'N/A'
  const vendor = props.invoice.vendor_name || props.invoice.vendorName || 'N/A'
  const dateStr = formatDateNumeric(props.invoice.invoice_date || props.invoice.invoiceDate)
  const totalAmt = Number(props.invoice.total_amount || props.invoice.totalAmount || 0).toLocaleString()

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
          .footer { background-color: #0f172a; color: white; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header-title">DYNAMITE PRO - INVOICE STATEMENT</div>
        <div class="header-meta">Invoice: ${invNum} | Vendor: ${vendor} | Date: ${dateStr}</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Product Name (SKU)</th><th>Reference / Order ID</th><th>Category / Sub</th><th>Gender / Fabric / Occasion</th><th>Size</th><th>Colors</th><th>Quantity</th><th>Unit Price</th><th>Line Total</th>
            </tr>
          </thead>
          <tbody>
  `

  let rowIdx = 1
  props.invoice.items.forEach((item) => {
    const variants = item.variants || [{ size: 'N/A', quantity: (item.quantity || 0), colors: [] }]
    variants.forEach((v) => {
      const price = item.cost_price || item.price || 0
      const qty = v.quantity || 0
      const lineTotal = price * (qty * (v.colors?.length || 1))
      const colorStr = v.colors ? v.colors.join(', ') : (item.color || '-')
      const specStr = `${item.gender || '-'}/${item.fabric || '-'}/${item.occasion || '-'}`
      const catStr = `${item.category || '-'}/${item.sub_category || item.subCategory || '-'}`
      html += `
        <tr>
          <td>${rowIdx++}</td>
          <td>${item.product_name || item.productName} (${item.sku || 'N/A'})</td>
          <td>${item.order_id || item.orderId || '-'}</td>
          <td>${catStr}</td>
          <td>${specStr}</td>
          <td>${v.size}</td>
          <td>${colorStr}</td>
          <td>${qty * (v.colors?.length || 1)}</td>
          <td>${price}</td>
          <td>${lineTotal}</td>
        </tr>
      `
    })
  })

  html += `
          </tbody>
          <tfoot>
            <tr class="footer">
              <td colspan="9">GRAND TOTAL VALUATION</td>
              <td>Rs. ${totalAmt}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Invoice_Excel_${invNum.replace(/\//g, '-')}.xls`
  link.click()
}
</script>

<template>
  <div v-if="show && invoice" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-slate-900">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" @click="emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative bg-white w-full max-w-[98%] max-h-[90vh] rounded-[3px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
      <!-- Top Banner / Invoice Header -->
      <div class="p-8 bg-slate-900 text-white flex items-start justify-between">
        <div class="space-y-4">
          <div class="flex items-center gap-3">
             <div class="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <ShoppingBag class="text-blue-400" :size="24" />
             </div>
             <div>
                <h2 class="text-3xl font-black tracking-tighter italic uppercase leading-none">Invoice Details</h2>
                <p class="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1 opacity-70">Purchase Record & Stock Attribution</p>
             </div>
          </div>
          
          <div class="flex flex-wrap gap-8">
            <div class="flex flex-col">
              <span class="text-[9px] font-black uppercase text-white/40 tracking-widest">Invoice Number</span>
              <span class="text-lg font-black tracking-tight">{{ invoice.invoice_number || invoice.invoiceNumber }}</span>
            </div>
            <div class="flex flex-col border-l border-white/10 pl-8">
              <span class="text-[9px] font-black uppercase text-white/40 tracking-widest">Billing Date</span>
              <span class="text-lg font-black tracking-tight">{{ formatDateNumeric(invoice.invoice_date || invoice.invoiceDate) }}</span>
            </div>
             <div class="flex flex-col border-l border-white/10 pl-8">
              <span class="text-[9px] font-black uppercase text-white/40 tracking-widest">Vendor / Source</span>
              <span class="text-lg font-black tracking-tight uppercase italic">{{ invoice.vendor_name || invoice.vendorName }}</span>
            </div>
          </div>
        </div>
        
        <div class="flex items-center gap-3">
          <button @click="exportToExcel" class="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 border border-emerald-500/20">
            <FileSpreadsheet size="14" /> Excel
          </button>
          <button @click="exportToPDF" class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl active:scale-95 border border-white/5">
            <FileText size="14" /> PDF
          </button>
          <button @click="emit('edit', invoice)" class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 border border-blue-500">
            <Edit3 size="14" /> Edit
          </button>
          <button @click="emit('close')" class="p-2.5 hover:bg-white/10 rounded-xl transition-all text-white/40 hover:text-red-400 border border-white/5">
            <X size="20" />
          </button>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="px-8 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-12">
         <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
               <Package size="18" class="text-slate-400" />
            </div>
            <div class="flex flex-col">
               <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unique SKUs</span>
               <span class="text-sm font-black text-slate-900 leading-none">{{ invoice.total_items_count || invoice.itemsCount || (invoice.items ? invoice.items.length : 0) }}</span>
            </div>
         </div>
         <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
               <Layers size="18" class="text-slate-400" />
            </div>
            <div class="flex flex-col">
               <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Quantity</span>
               <span class="text-sm font-black text-slate-900 leading-none">{{ totalQuantity }} Units</span>
            </div>
         </div>
         <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center border border-slate-100">
               <DollarSign size="18" class="text-emerald-500" />
            </div>
            <div class="flex flex-col">
               <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</span>
               <span class="text-sm font-black text-emerald-600 leading-none">₹{{ (invoice.total_amount || invoice.totalAmount || 0).toLocaleString() }}</span>
            </div>
         </div>

         <!-- Status Management Section -->
         <div class="ml-auto flex items-center gap-3 bg-white px-6 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Workflow Status</span>
            <div class="flex items-center gap-1">
               <button 
                 v-for="opt in statusOptions" 
                 :key="opt.label"
                 @click="updateStatus(opt.label)"
                 class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border"
                 :class="[
                    (invoice.status || 'Draft') === opt.label 
                      ? opt.color
                      : 'bg-transparent text-slate-300 border-transparent hover:border-slate-100 hover:text-slate-400'
                 ]"
               >
                 {{ opt.label }}
               </button>
            </div>
         </div>
      </div>

      <!-- Line Items List -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
          <ChevronRight size="12" /> Recorded Entries for this Invoice
        </h4>
        
        <div class="space-y-2">
          <div v-for="item in invoice.items" :key="item.id" class="p-4 border border-slate-100 rounded-2xl hover:border-blue-200 hover:shadow-xl transition-all flex items-start gap-8 group bg-white shadow-sm overflow-hidden">
             <!-- Col 1: High Fidelity Media -->
             <div v-if="(item.images && item.images.length) || item.image" class="flex-shrink-0 flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-100 min-w-[70px] cursor-zoom-in">
               <div 
                 v-if="item.images && item.images.length" 
                 v-for="(img, idx) in item.images.slice(0, 3)" 
                 :key="idx" 
                 class="h-16 w-16 rounded-xl overflow-hidden border border-white shadow-sm transition-transform hover:scale-105"
                 @click="adminStore.openImagePreview(item.images, idx)"
               >
                 <img :src="adminStore.resolveImageUrl(img)" class="w-full h-full object-cover" />
               </div>
               <div 
                 v-else-if="item.image" 
                 class="h-16 w-16 rounded-xl overflow-hidden border border-white shadow-sm transition-transform hover:scale-105"
                 @click="adminStore.openImagePreview([item.image], 0)"
               >
                 <img :src="adminStore.resolveImageUrl(item.image)" class="w-full h-full object-cover" />
               </div>
               <div v-if="item.images && item.images.length > 3" class="h-16 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-[11px] font-black text-slate-400">
                 +{{ item.images.length - 3 }}
               </div>
             </div>

             <!-- Col 2: Product Specifications (30% Width) -->
             <div class="w-[28%] shrink-0">
                <h4 class="text-base font-black text-slate-900 tracking-tight leading-none uppercase italic mb-3">{{ item.product_name || item.productName }}</h4>
                <div class="flex flex-wrap gap-2 mb-4">
                   <span v-if="item.category" class="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{{ item.category }}</span>
                   <span v-if="item.gender" class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{{ item.gender }}</span>
                   <span v-if="item.fabric" class="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{{ item.fabric }}</span>
                   <span v-if="item.occasion" class="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{{ item.occasion }}</span>
                </div>
                <div class="space-y-1.5 opacity-60">
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Tag size="10" class="shrink-0"/> Sub: {{ item.sub_category || item.subCategory || 'N/A' }}</p>
                   <p v-if="item.order_id || item.orderId" class="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash size="10" class="shrink-0"/> Ref: {{ item.order_id || item.orderId }}</p>
                </div>
             </div>

             <!-- Col 3: Variant Audit Table (Flexible Middle) -->
             <div class="flex-1 min-w-0">
                <div v-if="item.variants && item.variants.length" class="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/50 hover:bg-white/80 transition-colors">
                   <table class="w-full text-left border-collapse">
                      <thead>
                         <tr class="bg-slate-100/30 border-b border-slate-100">
                            <th class="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Size Label</th>
                            <th class="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colors</th>
                            <th class="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Units</th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr v-for="(v, vIdx) in item.variants" :key="vIdx" class="border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                            <td class="px-4 py-2.5 align-top">
                               <span class="text-xs font-black text-slate-900">{{ v.size }}</span>
                            </td>
                            <td class="px-4 py-2.5 align-top">
                               <div class="flex flex-wrap gap-1.5">
                                  <div v-if="v.colors && v.colors.length" v-for="c in v.colors" :key="c" class="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                     <div class="h-1.5 w-1.5 rounded-full border border-black/5" :style="{ backgroundColor: c }"></div>
                                     <span class="text-[8px] font-bold text-slate-500 uppercase tracking-tight">{{ c }}</span>
                                  </div>
                                  <div v-else-if="v.color" class="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                                     <div class="h-1.5 w-1.5 rounded-full border border-black/5" :style="{ backgroundColor: v.color }"></div>
                                     <span class="text-[8px] font-bold text-slate-500 uppercase tracking-tight">{{ v.color }}</span>
                                  </div>
                               </div>
                            </td>
                            <td class="px-4 py-2.5 text-right align-top">
                               <span class="text-xs font-black text-blue-600">x{{ v.quantity }}</span>
                            </td>
                         </tr>
                      </tbody>
                   </table>
                </div>
                <!-- Legacy/Fallback -->
                <div v-else class="flex flex-wrap gap-2 px-4 py-3 bg-slate-50/50 rounded-xl border border-dotted border-slate-200">
                   <span v-if="item.sizes && item.sizes.length" v-for="sz in item.sizes" :key="sz" class="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-400 uppercase tracking-widest">{{ sz }}</span>
                   <span v-else-if="item.size" class="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-black text-slate-400 uppercase tracking-widest">{{ item.size }}</span>
                   <span class="text-[11px] font-black text-slate-300 uppercase tracking-widest ml-4 self-center">/ {{ item.color }}</span>
                </div>
             </div>

             <!-- Col 4: Audit Financials (Right Side) -->
             <div class="w-[280px] shrink-0 pl-10 border-l border-slate-100 pr-4">
                <div class="space-y-6">
                   <div class="flex justify-between items-center group/price">
                       <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</span>
                       <span class="text-lg font-black text-slate-950">₹{{ (item.cost_price || item.price || 0).toLocaleString() }}</span>
                    </div>
                   <div class="flex justify-between items-center">
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch Total Qty</span>
                      <span class="text-lg font-black text-slate-900">
                         {{ item.variants ? item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0) : (item.quantity || 0) }}
                      </span>
                   </div>
                   <div class="h-[1px] bg-slate-50"></div>
                   <div class="flex justify-between items-center">
                      <span class="text-[9px] font-black text-blue-400 uppercase tracking-widest">Line Total</span>
                      <span class="text-xl font-black text-blue-600">
                         ₹{{ (item.total_cost || ( (item.cost_price || item.price || 0) * (item.variants ? item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0) : (item.quantity || 0)) )).toLocaleString() }}
                      </span>
                   </div>
                   <!-- Row Action Area -->
                   <div class="flex justify-end pt-2 flex gap-4">
                      <button @click="emit('edit', invoice)" class="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100">
                         <Edit3 size="14" />
                         Quick Edit
                      </button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
         <div class="flex items-center gap-2">
            <User size="16" class="text-slate-400" />
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approved & Recorded By:</span>
            <span class="text-xs font-black text-slate-900 uppercase italic">{{ invoice.created_by || invoice.addedBy }}</span>
         </div>
         <button @click="emit('close')" class="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">
           Close Document
         </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
</style>
