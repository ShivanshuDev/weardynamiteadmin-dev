<script setup>
import { ref, computed, onMounted } from 'vue'
import { Boxes, Package, RefreshCw, AlertTriangle, FileText, Plus, Search, ChevronLeft, ChevronRight, User, Calendar, Trash2, Eye, History, Layers, Check, X as CloseIcon, MousePointerClick, Download, FileSpreadsheet, Filter, X, Zap } from 'lucide-vue-next'
import { useAdminStore } from '../stores/adminStore'
import InventoryAddModal from '../components/InventoryAddModal.vue'
import InvoiceDetailModal from '../components/InvoiceDetailModal.vue'
import InventoryDetailModal from '../components/InventoryDetailModal.vue'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.fetchInventoryReport()
  adminStore.fetchInventoryInvoices()
})

const activeTab = ref('stock')
const showAddModal = ref(false)
const showDetailModal = ref(false)
const selectedInvoice = ref(null)
const editingInvoice = ref(null)
const statusFilter = ref('All')

// Filtering Logic
const showFilters = ref(false)
const filters = ref({
  sku: '',
  name: '',
  status: 'All',
  condition: 'All',
  location: '',
  startDate: '',
  endDate: '',
  minAge: ''
})

const statusTabs = ['All', 'Draft', 'Active', 'Under Review', 'Inactive']
const conditionOptions = ['All', 'Healthy', 'Low', 'Critical']

const showIntelligenceModal = ref(false)
const selectedSkuProduct = ref(null)

// Selection State
const selectedItems = ref([])

// Pagination State (Local)
const itemsPerPage = 10
const inventoryPage = ref(1)

const handleLoadMore = () => {
  const filterData = formatFilterData()
  adminStore.fetchInventoryReport(filterData, true)
}

const formatFilterData = () => {
  const filterData = { ...filters.value }
  if (filterData.startDate) filterData.startDate = new Date(filterData.startDate).getTime()
  if (filterData.endDate) filterData.endDate = new Date(filterData.endDate).getTime()
  return filterData
}

const applyFilters = () => {
  inventoryPage.value = 1 // Reset to first page on filter
  const filterData = formatFilterData()
  adminStore.fetchInventoryReport(filterData, false)
}

const resetFilters = () => {
  filters.value = {
    sku: '',
    name: '',
    status: 'All',
    condition: 'All',
    location: '',
    startDate: '',
    endDate: '',
    minAge: ''
  }
  applyFilters()
}

const toggleSelection = (itemId) => {
  const idx = selectedItems.value.indexOf(itemId)
  if (idx > -1) selectedItems.value.splice(idx, 1)
  else selectedItems.value.push(itemId)
}

const toggleSelectAll = () => {
  if (selectedItems.value.length === paginatedInventory.value.length) {
    selectedItems.value = []
  } else {
    selectedItems.value = paginatedInventory.value.map(i => i.inventory_id)
  }
}

const handleBulkUpdateStatus = async (status) => {
  if (selectedItems.value.length === 0) return
  
  const updates = selectedItems.value.map(id => {
    const item = inventoryData.value.find(i => i.inventory_id === id)
    if (!item) return null;
    return {
      invoiceNumber: item.invoice_number,
      inventoryId: item.inventory_id,
      status: status
    }
  }).filter(u => u !== null);

  if (updates.length === 0) return;

  try {
    const res = await adminStore.bulkUpdateInventoryStatus(updates)
    selectedItems.value = []
    adminStore.showNotification('Bulk Update Success', `${updates.length} items marked as ${status} successfully in the vault.`, 'success')
  } catch (error) {
    adminStore.showNotification('Bulk Update Failed', `Operational Failure: ${error.message}`, 'error')
  }
}

const downloadExcel = () => {
  const data = inventoryData.value.map((i, index) => ({
    'S.No.': index + 1,
    'SKU': i.sku,
    'Product': i.name,
    'Available Stock': i.stock,
    'Health': i.healthStatus,
    'Workflow Status': i.status || 'Draft',
    'Location': i.location,
    'Unit Cost (INR)': i.cost_price || 0,
    'Total Valuation (INR)': i.total_cost || 0,
    'Vendor': i.vendor_name || 'N/A',
    'Date Added': i.addedDate,
    'Stock Age (Days)': i.stockAge
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'RealTimeStock')
  XLSX.writeFile(wb, `Dynamite_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`)
}

const downloadPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  doc.setFontSize(22)
  doc.setTextColor(37, 99, 235)
  doc.text('DYNAMITE PRO | INVENTORY CORE', 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  doc.text(`Official Stock Audit Report | Generated on ${new Date().toLocaleString()}`, 14, 30)

  const columns = ['S.No.', 'SKU', 'Product', 'Stock', 'Health', 'Workflow', 'Added Date', 'Age', 'Location', 'Valuation']
  const rows = inventoryData.value.map((i, index) => [
    index + 1,
    i.sku,
    i.name,
    i.stock,
    i.healthStatus,
    i.status || 'Draft',
    i.addedDate,
    `${i.stockAge}d`,
    i.location,
    `INR ${(i.total_cost || 0).toLocaleString()}`
  ])

  autoTable(doc, {
    startY: 40,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 25 },
      2: { cellWidth: 35 },
      3: { cellWidth: 15 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 15 },
      9: { halign: 'right', fontStyle: 'bold' }
    }
  })

  doc.save(`Dynamite_Stock_Audit_${new Date().toISOString().split('T')[0]}.pdf`)
}

const inventoryData = computed(() => {
  if (!adminStore.inventoryReport || !adminStore.inventoryReport.records) return []
  return adminStore.inventoryReport.records.map(r => ({
    ...r,
    name: r.product_name,
    sku: r.inventory_id || r.invoice_number,
    stock: r.quantity || 0,
    healthStatus: (r.quantity || 0) <= 5 ? 'Critical' : (r.quantity || 0) <= 20 ? 'Low' : 'Healthy',
    location: r.vendor_name || 'Main Warehouse',
    addedDate: (() => {
      const d = new Date(r.created_at)
      if (isNaN(d.getTime())) return '-'
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    })(),
    stockAge: (() => {
      if (!r.created_at) return 0
      const d = new Date(r.created_at)
      if (isNaN(d.getTime())) return 0
      const diff = new Date() - d
      return Math.floor(diff / (1000 * 60 * 60 * 24))
    })()
  }))
})

const paginatedInventory = computed(() => {
  const start = (inventoryPage.value - 1) * itemsPerPage
  return inventoryData.value.slice(start, start + itemsPerPage)
})

const inventoryTotalPages = computed(() => Math.ceil(inventoryData.value.length / itemsPerPage))

// Local Pagination for Invoices
const itemsPerPageInvoices = 10
const invoicePage = ref(1)

const allInvoices = computed(() => {
  const invoices = adminStore.inventoryInvoices || [];
  if (statusFilter.value === 'All') return invoices
  return invoices.filter(inv => inv.status === statusFilter.value)
})

const paginatedInvoices = computed(() => {
  const start = (invoicePage.value - 1) * itemsPerPageInvoices
  return allInvoices.value.slice(start, start + itemsPerPageInvoices)
})

const invoiceTotalPages = computed(() => Math.ceil(allInvoices.value.length / itemsPerPageInvoices))

const openAddModal = () => { showAddModal.value = true }
const handleOpenDetail = async (invoice) => {
  const invoiceId = invoice.invoice_number || invoice.PK?.split('#')[1]
  if (invoiceId) {
    const res = await adminStore.fetchInvoiceDetail(invoiceId)
    if (res && res.summary) {
      selectedInvoice.value = { ...res.summary, items: res.items || [] }
    } else {
      selectedInvoice.value = invoice
    }
  } else {
    selectedInvoice.value = invoice
  }
  showDetailModal.value = true
}

const handleCloseDetail = () => {
  showDetailModal.value = false
  selectedInvoice.value = null
}

const openEditModal = (invoice) => {
  editingInvoice.value = invoice
  showDetailModal.value = false
  showAddModal.value = true
}

const handleCloseAddModal = () => {
  showAddModal.value = false
  editingInvoice.value = null
}

const handleSaveInvoice = (data) => {
  adminStore.addInventoryInvoice(data)
  handleCloseAddModal()
}

const handleUpdateInvoice = (id, data) => {
  adminStore.updateInventoryInvoice(id, data)
  handleCloseAddModal()
}
</script>

<template>
  <div class="space-y-10 text-slate-900 pb-32">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
           <Boxes class="text-blue-600" :size="40" />
           Inventory Core
        </h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1 text-xs">Stock Control & Warehouse Management</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button @click="downloadExcel" class="bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white flex items-center gap-2 transition-all shadow-sm">
          <FileSpreadsheet size="18" /> Excel
        </button>
        <button @click="downloadPDF" class="bg-red-50 text-red-600 border border-red-100 px-5 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white flex items-center gap-2 transition-all shadow-sm">
          <Download size="18" /> PDF Report
        </button>
        <button @click="openAddModal" class="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black flex items-center gap-3 transition-all shadow-xl shadow-blue-200 ml-2">
          <Plus size="18" /> New Stock Invoice
        </button>
      </div>
    </div>

    <!-- View Toggle & Filter -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button @click="activeTab = 'stock'" :class="['px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', activeTab === 'stock' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600']"><div class="flex items-center gap-2"><Layers size="14" /> Real-time Stock</div></button>
        <button @click="activeTab = 'invoices'" :class="['px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all', activeTab === 'invoices' ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600']"><div class="flex items-center gap-2"><History size="14" /> Purchase Invoices</div></button>
      </div>
      <button v-if="activeTab === 'stock'" @click="showFilters = !showFilters" :class="showFilters ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'" class="flex items-center gap-2 px-6 py-3 rounded-2xl border border-slate-200 font-black text-[10px] uppercase tracking-widest transition-all hover:border-blue-600"><Filter size="16" /> Advanced Filters</button>
    </div>

    <!-- Filter Panel -->
    <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="transform -translate-y-4 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform -translate-y-4 opacity-0">
      <div v-if="showFilters && activeTab === 'stock'" class="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl space-y-6">
         <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">SKU ID</label><input v-model="filters.sku" type="text" placeholder="Search SKU..." class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Product Name</label><input v-model="filters.name" type="text" placeholder="Search Product..." class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all" /></div>
            <div class="space-y-2">
               <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Status</label>
               <select v-model="filters.status" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all"><option v-for="s in statusTabs" :key="s" :value="s">{{ s }}</option></select>
            </div>
            <div class="space-y-2">
               <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Stock Condition</label>
               <select v-model="filters.condition" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all"><option v-for="c in conditionOptions" :key="c" :value="c">{{ c }}</option></select>
            </div>
         </div>
         <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Location / Vendor</label><input v-model="filters.location" type="text" placeholder="Search Location..." class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all" /></div>
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Min Stock Age (Days)</label><input v-model="filters.minAge" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" placeholder="e.g. 30" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all" /></div>
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">Start Date</label><input v-model="filters.startDate" type="date" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all" /></div>
            <div class="space-y-2"><label class="text-[9px] font-black uppercase text-slate-400 tracking-widest px-1">End Date</label><input v-model="filters.endDate" type="date" class="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold transition-all" /></div>
            <div class="flex items-end gap-3"><button @click="applyFilters" class="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"><Zap size="14" /> Apply Intelligence</button><button @click="resetFilters" class="px-5 bg-slate-100 text-slate-400 py-3 rounded-xl hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"><X size="14" /></button></div>
         </div>
      </div>
    </Transition>

    <!-- Main Content Area -->
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div v-if="activeTab === 'stock'" class="bg-white rounded-[3px] border border-slate-100 shadow-inner-sm overflow-hidden pb-1 relative">
        <table class="w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400">
            <tr>
              <th class="px-6 py-3 w-10">
                <div @click="toggleSelectAll" class="w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all" :class="selectedItems.length === paginatedInventory.length && paginatedInventory.length > 0 ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white'">
                  <Check v-if="selectedItems.length === paginatedInventory.length && paginatedInventory.length > 0" size="14" />
                </div>
              </th>
              <th class="px-4 py-3 w-12 text-center">S.No.</th>
              <th class="px-8 py-3">SKU / Item</th>
              <th class="px-8 py-3">Level</th>
              <th class="px-8 py-3 text-center">Condition</th>
              <th class="px-8 py-3 text-center">Workflow</th>
              <th class="px-8 py-3 text-center">Added Date</th>
              <th class="px-8 py-3 text-center">Stock Age</th>
              <th class="px-8 py-3">Location</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="(i, idx) in paginatedInventory" :key="i.inventory_id" class="hover:bg-slate-50/50 h-14 transition-all">
              <td class="px-6 py-1"><div @click.stop="toggleSelection(i.inventory_id)" class="w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all" :class="selectedItems.includes(i.inventory_id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white'"><Check v-if="selectedItems.includes(i.inventory_id)" size="14" /></div></td>
              <td class="px-4 py-1 text-center font-black text-[10px] text-slate-400">{{ (inventoryPage - 1) * itemsPerPage + idx + 1 }}</td>
              <td class="px-8 py-1"><div class="flex flex-col truncate"><span class="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">{{ i.name }}</span><span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{{ i.sku }}</span></div></td>
              <td class="px-8 py-1"><div class="flex items-baseline gap-1"><span class="text-xl font-black" :class="i.stock < 20 ? 'text-red-600' : 'text-slate-900'">{{ (i.stock || 0) }}</span><span class="text-[8px] text-slate-400 font-bold uppercase">Units</span></div></td>
              <td class="px-8 py-1 text-center"><span class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest inline-flex border" :class="{'bg-emerald-50 text-emerald-600 border-emerald-100': i.healthStatus === 'Healthy', 'bg-orange-50 text-orange-600 border-orange-100': i.healthStatus === 'Low', 'bg-red-50 text-red-600 border-red-100 animate-pulse': i.healthStatus === 'Critical'}">{{ i.healthStatus }}</span></td>
              <td class="px-8 py-1 text-center"><span class="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">{{ i.status || 'Draft' }}</span></td>
              <td class="px-8 py-1 text-center"><span class="text-[10px] font-black text-slate-400 uppercase">{{ i.addedDate }}</span></td>
              <td class="px-8 py-1 text-center">
                 <div class="flex flex-col items-center">
                    <span class="text-sm font-black text-slate-900">{{ i.stockAge }}</span>
                    <span class="text-[8px] font-bold text-slate-400 uppercase">Days</span>
                 </div>
              </td>
              <td class="px-8 py-1"><span class="text-[10px] font-black text-slate-400 uppercase border border-slate-100 px-3 py-1 rounded-lg">{{ i.location }}</span></td>
            </tr>
          </tbody>
        </table>

        <!-- Load More + Multi-Page Pagination -->
        <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col items-center gap-6">
           <!-- Page Numbers -->
           <div class="flex items-center gap-4 w-full justify-between">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sourced: {{ inventoryData.length }} SKUs</p>
              <div class="flex items-center gap-2">
                 <button @click="inventoryPage--" :disabled="inventoryPage === 1" class="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronLeft size="16" /></button>
                 <div class="flex items-center gap-1">
                    <span v-for="p in inventoryTotalPages" :key="p" @click="inventoryPage = p" :class="p === inventoryPage ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200'" class="w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border cursor-pointer">{{ p }}</span>
                 </div>
                 <button @click="inventoryPage++" :disabled="inventoryPage === inventoryTotalPages" class="p-2 border rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all"><ChevronRight size="16" /></button>
              </div>
           </div>

           <!-- Server Load More -->
           <button v-if="adminStore.inventoryReport.summary.hasMore" @click="handleLoadMore" :disabled="adminStore.loading" class="bg-blue-600 text-white px-12 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-200">
             <span v-if="adminStore.loading">Fetching Sequence...</span><span v-else>Load More Server Data</span>
           </button>
        </div>

        <!-- Bulk Bar (Matches) -->
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="transform translate-y-full opacity-0 scale-95" enter-to-class="transform translate-y-0 opacity-100 scale-100" leave-active-class="transition duration-200 ease-in" leave-from-class="transform translate-y-0 opacity-100 scale-100" leave-to-class="transform translate-y-full opacity-0 scale-95">
          <div v-if="selectedItems.length > 0" class="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
             <div class="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 p-6 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] flex items-center gap-8 text-white min-w-[750px]">
                <div class="flex items-center gap-5 border-r border-slate-700/50 pr-8">
                   <div class="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center"><MousePointerClick size="22" class="text-white" /></div>
                   <div><p class="text-2xl font-black italic tracking-tighter leading-none">{{ selectedItems.length }} Units</p><p class="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mt-1.5 opacity-70">Bulk Status Pipeline</p></div>
                </div>
                <div class="flex-1 flex items-center gap-2">
                   <button @click="handleBulkUpdateStatus('Active')" class="flex-1 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase border border-emerald-600/20">Active</button>
                   <button @click="handleBulkUpdateStatus('Draft')" class="flex-1 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase border border-slate-700">Draft</button>
                   <button @click="handleBulkUpdateStatus('Under Review')" class="flex-1 bg-orange-600/10 text-orange-500 hover:bg-orange-600 hover:text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase border border-orange-600/20">Review</button>
                   <button @click="handleBulkUpdateStatus('Inactive')" class="flex-1 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-4 py-3 rounded-2xl font-black text-[9px] uppercase border border-red-600/20">Inactive</button>
                </div>
                <button @click="selectedItems = []" class="p-4 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all ml-2"><CloseIcon size="20" /></button>
             </div>
          </div>
        </Transition>
      </div>

      <!-- Invoices -->
      <div v-else class="space-y-6 pb-20">
        <div class="bg-white rounded-[3px] border border-slate-100 shadow-inner-sm overflow-hidden">
           <table class="w-full text-left">
              <thead class="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400">
                <tr>
                  <th class="px-4 py-3 w-12 text-center">S.No.</th>
                  <th class="px-8 py-3">Invoice Ref</th>
                  <th class="px-8 py-3">Date</th>
                  <th class="px-8 py-3">Vendor</th>
                  <th class="px-8 py-3 text-center">Qty / Items</th>
                  <th class="px-8 py-3 text-right">Amount</th>
                  <th class="px-8 py-3 text-center">Status</th>
                  <th class="px-8 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="(inv, idx) in paginatedInvoices" :key="inv.id" class="hover:bg-slate-50/50 h-16 transition-all cursor-pointer group" @click="handleOpenDetail(inv)">
                   <td class="px-4 py-1 text-center font-black text-[10px] text-slate-400">{{ (invoicePage - 1) * itemsPerPageInvoices + idx + 1 }}</td>
                   <td class="px-8 py-1">
                     <span class="text-sm font-black text-blue-600 tracking-tighter uppercase">{{ inv.invoice_number }}</span>
                   </td>
                   <td class="px-8 py-1">
                      <span class="text-[10px] font-bold text-slate-500 uppercase">{{ 
                        (() => {
                          const dateVal = inv.invoice_date || inv.created_at
                          if (!dateVal) return 'N/A'
                          const d = new Date(dateVal)
                          if (isNaN(d.getTime())) return 'N/A'
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                        })()
                      }}</span>
                   </td>
                   <td class="px-8 py-1">
                     <span class="text-[11px] font-black text-slate-900 uppercase truncate block max-w-[150px]">{{ inv.vendor_name || 'Direct Entry' }}</span>
                   </td>
                   <td class="px-8 py-1 text-center">
                      <div class="flex flex-col items-center leading-none">
                        <span class="text-xs font-black text-slate-900">{{ inv.total_quantity || 0 }}</span>
                        <span class="text-[8px] font-bold text-slate-400 uppercase mt-1">Units ({{ inv.total_items_count || 0 }})</span>
                      </div>
                   </td>
                   <td class="px-8 py-1 text-right">
                     <span class="text-xs font-black text-slate-900">₹{{ (inv.total_amount || 0).toLocaleString() }}</span>
                   </td>
                   <td class="px-8 py-1 text-center">
                     <span class="px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">{{ inv.status || 'Draft' }}</span>
                   </td>
                   <td class="px-8 py-1 text-right">
                     <button class="p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 group-hover:rotate-6">
                       <Eye size="16" />
                     </button>
                   </td>
                </tr>
              </tbody>
           </table>
           <div class="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {{ Math.min(allInvoices.length, itemsPerPageInvoices) }} Invoices</p>
              <div class="flex items-center gap-2">
                 <button @click="invoicePage--" :disabled="invoicePage === 1" class="p-2 border rounded-xl disabled:opacity-30 transition-all"><ChevronLeft size="16" /></button>
                 <button @click="invoicePage++" :disabled="invoicePage === invoiceTotalPages" class="p-2 border rounded-xl disabled:opacity-30 transition-all"><ChevronRight size="16" /></button>
              </div>
           </div>
        </div>
      </div>
    </div>

    <InventoryAddModal :show="showAddModal" :editInvoice="editingInvoice" @close="handleCloseAddModal" @save="handleSaveInvoice" @update="handleUpdateInvoice" />
    <InvoiceDetailModal :show="showDetailModal" :invoice="selectedInvoice" @close="handleCloseDetail" @edit="openEditModal" />
  </div>
</template>

<style scoped>
.shadow-inner-sm { box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.02); }
</style>
