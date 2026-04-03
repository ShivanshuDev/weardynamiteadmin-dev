<script setup>
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, 
  X, ChevronLeft, ChevronRight, Image as ImageIcon, 
  DollarSign, Layers, Settings, Globe, Tag, Info, List,
  BarChart3, Download, FileText
} from 'lucide-vue-next'
import { QuillEditor } from '@vueup/vue-quill'
import AnalyticsModal from '../components/AnalyticsModal.vue'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()

// Search & Filter State
const searchQuery = ref('')
const filterCategory = ref('')
const statusFilter = ref('All')
const statusTabs = ['All', 'Draft', 'Active', 'Under Review', 'Inactive']

// Computed Filtering
const filteredProducts = computed(() => {
  return adminStore.products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          p.id.toString().includes(searchQuery.value) ||
                          (p.sku && p.sku.toLowerCase().includes(searchQuery.value.toLowerCase()))
    const matchesCategory = filterCategory.value === '' || p.category === filterCategory.value
    const matchesStatus = statusFilter.value === 'All' || p.status === statusFilter.value
    return matchesSearch && matchesCategory && matchesStatus
  })
})

// Pagination State
const currentPage = ref(1)
const itemsPerPage = 8
const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredProducts.value.slice(start, end)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

// Modal State
const showAddModal = ref(false)
const modalMode = ref('add') // 'add', 'edit', 'view'
const activeTab = ref('general')
const tabs = [
  { id: 'general', label: 'General Info', icon: Info },
  { id: 'pricing', label: 'Pricing & Tax', icon: DollarSign },
  { id: 'inventory', label: 'Inventory', icon: Layers },
  { id: 'variants', label: 'Variants', icon: List },
  { id: 'media', label: 'Media Gallery', icon: ImageIcon },
  { id: 'seo', label: 'SEO Settings', icon: Globe }
]

const showAnalyticsModal = ref(false)

const newProduct = ref({
  name: '',
  brand: 'Wear Dynamite',
  status: 'Draft',
  category: '',
  subCategory: '',
  gender: 'Unisex',
  description: '',
  mrp: 0,
  salePrice: 0,
  purchasePrice: 0,
  taxPercent: 18,
  sku: '',
  barcode: '',
  stock: 0,
  lowStockAlert: 10,
  isTaxable: true,
  discountPercentage: 0,
  promotionType: 'None',
  discountCoupon: '',
  primaryColor: '',
  primarySize: '',
  fit: '',
  neckType: '',
  occasion: '',
  images: [''],
  variants: [
    { color: '', sizes: [{ size: '', stock: 0 }] }
  ],
  keywords: [],
  seoTitle: '',
  seoDescription: '',
  urlHandle: '',
  specs: []
})

// Delete Confirmation State
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)
const productToDelete = ref(null)

const confirmDelete = (product) => {
  console.log('[Institutional Sync] Confirming Delete for SKU:', product.sku || product.id)
  productToDelete.value = product
  showDeleteConfirm.value = true
}

const executeDelete = async () => {
  if (productToDelete.value) {
    console.log('[Delete Diagnostic] Target:', productToDelete.value.id || productToDelete.value.productId)
    isDeleting.value = true
    try {
      await adminStore.deleteProduct(productToDelete.value.id)
      showDeleteConfirm.value = false
      productToDelete.value = null
      
      // Adjust pagination if page becomes empty
      if (currentPage.value > 1 && paginatedProducts.value.length === 0) {
        currentPage.value--
      }
    } catch (error) {
      console.error('[Delete Error] Failed to purge product:', error)
      alert('Institutional delete failed. Please verify server connectivity.')
    } finally {
      isDeleting.value = false
    }
  }
}

const openAddModal = () => {
  modalMode.value = 'add'
  // Reset newProduct
  newProduct.value = {
    name: '', brand: 'Wear Dynamite', status: 'Draft', category: '', subCategory: '', gender: 'Unisex', description: '',
    mrp: 0, salePrice: 0, purchasePrice: 0, taxPercent: 18, isTaxable: true, discountPercentage: 0, promotionType: 'None', discountCoupon: '',
    sku: '', barcode: '', stock: 0, lowStockAlert: 10,
    primaryColor: '', primarySize: '', fit: '', neckType: '', occasion: '', images: [''], variants: [{ color: '', sizes: [{ size: '', stock: 0 }] }],
    keywords: [], seoTitle: '', seoDescription: '', urlHandle: '', specs: []
  }
  showAddModal.value = true
}

const openEditModal = (product) => {
  modalMode.value = 'edit'
  newProduct.value = JSON.parse(JSON.stringify(product))
  showAddModal.value = true
}

const openViewModal = (product) => {
  modalMode.value = 'view'
  newProduct.value = JSON.parse(JSON.stringify(product))
  showAddModal.value = true
}

const addColorVariant = () => {
  newProduct.value.variants.push({ color: '', sizes: [{ size: '', stock: 0 }] })
}

const addSizeToColor = (colorIndex) => {
  newProduct.value.variants[colorIndex].sizes.push({ size: '', stock: 0 })
}

const removeSizeFromColor = (colorIndex, sizeIndex) => {
  newProduct.value.variants[colorIndex].sizes.splice(sizeIndex, 1)
}

const removeColorVariant = (index) => {
  newProduct.value.variants.splice(index, 1)
}

const addImageField = () => {
  newProduct.value.images.push('')
}

const removeImageField = (index) => {
  newProduct.value.images.splice(index, 1)
}

const saveProduct = () => {
  const totalVariantStock = newProduct.value.variants.reduce((acc, colorGroup) => {
    return acc + colorGroup.sizes.reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0)
  }, 0)

  if (modalMode.value === 'add') {
    const productToSave = {
      ...newProduct.value,
      id: Date.now(),
      salePrice: Number(newProduct.value.salePrice) || 0,
      purchasePrice: Number(newProduct.value.purchasePrice) || 0,
      stock: totalVariantStock || newProduct.value.stock,
      image: newProduct.value.images[0] || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200'
    }
    adminStore.addProduct(productToSave)
  } else if (modalMode.value === 'edit') {
    const updatedProduct = {
      ...newProduct.value,
      salePrice: Number(newProduct.value.salePrice) || 0,
      purchasePrice: Number(newProduct.value.purchasePrice) || 0,
      stock: totalVariantStock || newProduct.value.stock
    }
    adminStore.updateProduct(updatedProduct)
  }
  
  showAddModal.value = false
  activeTab.value = 'general'
}

// Export State
const isExporting = ref(false)

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

const exportProductsToPDF = async () => {
  try {
    isExporting.value = true
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    const now = new Date()
    
    const truncate = (str, len) => (str && str.length > len) ? str.substring(0, len - 3) + '...' : (str || '-')
    const colX = [10, 18, 48, 88, 110, 125, 145, 160, 175, 185, 200, 220, 240, 255]
    const colWidths = [8, 30, 40, 22, 15, 20, 15, 15, 10, 15, 20, 20, 15, 32]
    const headers = ['#', 'IDENTITY', 'PRODUCT NAME', 'CAT.', 'GEN.', 'STATUS', 'MRP', 'SALE', 'TAX', 'DISC', 'PROMO', 'COUPON', 'STOCK', 'VALUATION']

    const drawBranding = () => {
      doc.setTextColor(15, 23, 42)
      doc.setFontSize(22); doc.setFont('helvetica', 'bolditalic')
      doc.text('DYNAMITE PRO', 12, 18)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('INSTITUTIONAL PRODUCT CATALOG MANIFEST [V2.0]', 12, 26)
      doc.text(`Generated: ${formatDateNumeric(now)}`, 285, 26, { align: 'right' })
      return 35
    }

    const drawHeader = (y) => {
      doc.setFillColor(74, 109, 167); doc.rect(10, y, 277, 10, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(6)
      headers.forEach((h, i) => {
        doc.text(truncate(h, colWidths[i] - 1), colX[i] + 1, y + 6.5)
        doc.setDrawColor(255, 255, 255, 0.3); doc.line(colX[i], y, colX[i], y + 10)
      })
      doc.line(287, y, 287, y + 10)
      return y + 10
    }

    let currentY = drawBranding()
    currentY = drawHeader(currentY)

    doc.setTextColor(50, 50, 50); doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5)
    
    filteredProducts.value.forEach((p, idx) => {
      if (currentY > 185) {
        doc.addPage(); currentY = drawHeader(10); doc.setTextColor(50, 50, 50); doc.setFontSize(5.5)
      }
      
      const priceVal = p.salePrice || 0
      const valuation = priceVal * (p.stock || 0)
      const data = [
        idx + 1,
        p.sku || p.id,
        p.name,
        p.category || '-',
        (p.gender || 'U').charAt(0).toUpperCase(),
        (p.status || 'DRAFT').toUpperCase(),
        `Rs. ${Number(p.mrp || 0).toLocaleString()}`,
        `Rs. ${Number(priceVal).toLocaleString()}`,
        `${p.taxPercent}%`,
        `${p.discountPercentage || 0}%`,
        p.promotionType || '-',
        p.discountCoupon || '-',
        p.stock || 0,
        `Rs. ${Number(valuation).toLocaleString()}`
      ]

      doc.setDrawColor(240, 240, 240); doc.line(10, currentY, 287, currentY)
      data.forEach((val, i) => {
        let text = String(val)
        let align = (i >= 6 && i !== 10 && i !== 11) ? 'right' : 'left'
        let xPos = (align === 'right') ? colX[i] + colWidths[i] - 1 : colX[i] + 1
        doc.text(truncate(text, colWidths[i] - 1), xPos, currentY + 6, { align })
      })
      currentY += 8
    })

    doc.save(`Product_Vault_Manifest_${formatDateNumeric(now)}.pdf`)
  } catch (error) {
    console.error('PDF Export Error:', error)
    alert('Catalog export failed. Please try again.')
  } finally {
    isExporting.value = false
  }
}

const exportProductsToExcel = () => {
  try {
    isExporting.value = true
    const now = new Date()
    const filename = `Product_Catalog_${formatDateNumeric(now)}.xls`
    
    // Grouping for Summary
    const statusCounts = filteredProducts.value.reduce((acc, p) => {
      const s = p.status || 'Draft'; acc[s] = (acc[s] || 0) + 1; return acc
    }, {})
    const catCounts = filteredProducts.value.reduce((acc, p) => {
      const c = p.category || 'Uncategorized'; acc[c] = (acc[c] || 0) + 1; return acc
    }, {})
    const totalAssetValuation = filteredProducts.value.reduce((acc, p) => acc + (Number(p.salePrice || 0) * Number(p.stock || 0)), 0)

    const generateSummaryRows = (counts) => Object.entries(counts).map(([k, v]) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:4px; padding-bottom:4px; border-bottom:1px solid #f1f5f9;">
        <span style="color:#64748b;">${k.toUpperCase()}</span>
        <span style="color:#0f172a; font-weight:bold;">${v} SKUs</span>
      </div>
    `).join('')

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background: #4a6da7; color: white; padding: 12px; font-size: 11px; border: 1px solid #ffffff; }
          td { padding: 10px; border: 1px solid #f1f5f9; font-size: 10px; color: #334155; }
          .summary-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; }
        </style>
      </head>
      <body>
        <table>
          <tr style="background:#0f172a; color:white;">
            <th colspan="10" style="padding:20px; font-size:18px; text-align:left;">DYNAMITE PRO | PRODUCT VAULT INTELLIGENCE</th>
          </tr>
          <tr style="background:#f1f5f9;">
            <td colspan="4" class="summary-card">
               <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">LIFECYCLE COHORTS</div>
               ${generateSummaryRows(statusCounts)}
            </td>
            <td colspan="3" class="summary-card">
               <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">CATEGORY VOLUME</div>
               ${generateSummaryRows(catCounts)}
            </td>
            <td colspan="3" class="summary-card" align="right">
               <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">TOTAL ASSET VALUATION</div>
               <div style="font-size:24px; font-weight:bold; color:#0f172a;">Rs. ${totalAssetValuation.toLocaleString()}</div>
               <div style="color:#64748b; font-size:10px; margin-top:5px;">Based on ${filteredProducts.value.length} SKUs in Vault</div>
            </td>
          </tr>
        </table>
        <div style="height:20px;"></div>
        <table class="w-full text-left report-table" border="1" style="border-collapse:collapse; width:100%;">
          <thead>
            <tr>
              <th>#</th><th>ID/SKU</th><th>Product Name</th><th>Category</th><th>Gender</th><th>Status</th><th>MRP</th><th>Sale Price</th><th>Tax %</th><th>Discount %</th><th>Promotion</th><th>Coupon Code</th><th>Total Stock</th><th>Total Manifest Value</th>
            </tr>
          </thead>
          <tbody>
    `

    filteredProducts.value.forEach((p, idx) => {
      const val = (p.salePrice || 0) * (p.stock || 0)
      html += `
        <tr>
          <td align="center">${idx + 1}</td>
          <td><b>${p.sku || p.id}</b></td>
          <td>${p.name}</td>
          <td>${p.category || '-'}</td>
          <td>${p.gender || 'Unisex'}</td>
          <td align="center"><b>${(p.status || 'Draft').toUpperCase()}</b></td>
          <td align="right">Rs. ${Number(p.mrp || 0).toLocaleString()}</td>
          <td align="right">Rs. ${Number(p.salePrice || 0).toLocaleString()}</td>
          <td align="center">${p.taxPercent || 0}%</td>
          <td align="center">${p.discountPercentage || 0}%</td>
          <td>${p.promotionType || '-'}</td>
          <td>${p.discountCoupon || '-'}</td>
          <td align="center">${p.stock || 0}</td>
          <td align="right"><b>Rs. ${val.toLocaleString()}</b></td>
        </tr>
      `
    })

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  } catch (error) {
    console.error('Excel Export Error:', error)
    alert('Excel export failed.')
  } finally {
    isExporting.value = false
  }
}

import { onMounted } from 'vue'
onMounted(() => {
  adminStore.fetchProducts()
})
</script>

<template>
  <div class="space-y-8 relative">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Product Vault</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Manage Catalog & Inventory</p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="exportProductsToPDF"
          :disabled="isExporting"
          class="bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Download size="18" /> Catalog (PDF)
        </button>
        <button 
          @click="exportProductsToExcel"
          :disabled="isExporting"
          class="bg-white text-emerald-600 border border-emerald-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <FileText size="18" /> Export (XLS)
        </button>
        <button 
          @click="showAnalyticsModal = true"
          class="bg-white text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 flex items-center gap-2 transition-all shadow-sm"
        >
          <BarChart3 size="18" /> Inventory Insights
        </button>
        <button 
          @click="openAddModal"
          class="bg-black text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-900/20"
        >
          <Plus size="18" /> Add Product
        </button>
      </div>
    </div>
    
    <!-- Status Filtering Tabs -->
    <div class="flex items-center gap-1 border-b border-slate-100 pb-1">
      <button 
        v-for="status in statusTabs" 
        :key="status"
        @click="statusFilter = status; currentPage = 1"
        class="px-6 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group"
        :class="statusFilter === status ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'"
      >
        {{ status }}
        <div v-if="statusFilter === status" class="absolute bottom-0 left-6 right-6 h-0.5 bg-blue-600 animate-in fade-in slide-in-from-bottom-1 duration-300"></div>
      </button>
    </div>

    <!-- Filters & Search -->
    <div class="flex items-center gap-1">
      <div class="flex-1 relative group">
        <Search size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name, ID, or SKU..." 
          class="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-sm shadow-sm"
        />
      </div>
      <div class="relative group">
        <Filter size="18" class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <select 
          v-model="filterCategory"
          class="pl-12 pr-8 py-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-[10px] uppercase tracking-widest shadow-sm appearance-none min-w-[180px]"
        >
          <option value="">All Categories</option>
          <option>Apparel</option>
          <option>Accessories</option>
          <option>Footwear</option>
        </select>
      </div>
    </div>

     <!-- Table -->
     <div class="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-x-auto min-h-[600px] flex flex-col">
       <table class="w-full text-left min-w-[1400px]">
         <thead>
           <tr class="bg-slate-50/50">
             <th class="px-6 py-4 text-[10px] font-black uppercase text-slate-500 w-16 text-center">No.</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Identity</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Product Name</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Category</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Gen</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Status</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">MRP</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Sale</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Tax %</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Disc %</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Promo / Coupon</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Stock</th>
             <th class="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Actions</th>
           </tr>
         </thead>
        <tbody class="divide-y divide-slate-50 flex-1">
          <tr v-for="(p, idx) in paginatedProducts" :key="p.id" class="hover:bg-slate-50/30 transition-colors group h-14 overflow-hidden border-b border-slate-50">
            <td class="px-6 text-center font-black text-[10px] text-slate-400 font-mono">
              {{ (currentPage - 1) * itemsPerPage + idx + 1 }}
            </td>
            <td class="px-4">
              <div class="flex items-center gap-3">
                 <img :src="p.image" class="w-8 h-8 rounded-lg object-cover bg-slate-100 shadow-sm" />
                 <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ p.sku || p.id }}</span>
              </div>
            </td>
            <td class="px-4">
               <p class="text-[11px] font-black text-slate-900 truncate max-w-[150px] italic">{{ p.name }}</p>
            </td>
            <td class="px-4">
               <span class="text-[10px] font-black text-slate-600 uppercase">{{ p.category }}</span>
            </td>
            <td class="px-4 text-center">
               <span class="text-[10px] font-black text-blue-500">{{ (p.gender || 'U').charAt(0).toUpperCase() }}</span>
            </td>
            <td class="px-4 text-center">
               <span 
                 class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border"
                 :class="{
                   'bg-slate-50 text-slate-400 border-slate-100': !p.status || p.status === 'Draft',
                   'bg-emerald-50 text-emerald-600 border-emerald-100': p.status === 'Active',
                   'bg-orange-50 text-orange-600 border-orange-100': p.status === 'Under Review',
                   'bg-red-50 text-red-600 border-red-100': p.status === 'Inactive'
                 }"
               >
                 {{ p.status || 'Draft' }}
               </span>
            </td>
            <td class="px-4 text-center">
               <span class="text-[11px] font-black text-slate-400 line-through">₹{{ Number(p.mrp || 0).toLocaleString() }}</span>
            </td>
            <td class="px-4 text-center">
               <span class="text-[11px] font-black text-slate-900">₹{{ Number(p.salePrice || 0).toLocaleString() }}</span>
            </td>
            <td class="px-4 text-center font-bold text-slate-500 text-[11px]">{{ p.taxPercent }}%</td>
            <td class="px-4 text-center">
               <span class="text-emerald-600 text-[11px] font-black">{{ p.discountPercentage || 0 }}%</span>
            </td>
            <td class="px-4">
               <div class="flex flex-col">
                  <span v-if="p.promotionType && p.promotionType !== 'None'" class="text-[9px] font-black uppercase text-orange-600 italic leading-none">{{ p.promotionType }}</span>
                  <span v-if="p.discountCoupon" class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ p.discountCoupon }}</span>
                  <span v-if="!p.discountCoupon && (!p.promotionType || p.promotionType === 'None')" class="text-slate-200 text-[10px]">-</span>
               </div>
            </td>
            <td class="px-4 text-center">
               <span class="text-[11px] font-black text-slate-800" :class="p.stock < 10 ? 'text-red-500' : ''">{{ p.stock }}</span>
            </td>
            <td class="px-6 text-right">
              <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <button @click.stop="openEditModal(p)" class="p-1 hover:text-blue-600 transition-colors"><Edit2 size="14"/></button>
                  <button @click.stop="openViewModal(p)" class="p-1 hover:text-emerald-600 transition-colors"><Eye size="14"/></button>
                  <button @click.stop="confirmDelete(p)" class="p-1 hover:text-red-600 transition-colors"><Trash2 size="14"/></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <!-- Table Pagination Footer -->
      <div class="mt-auto border-t border-slate-50 bg-slate-50/30 p-4 flex items-center justify-between">
         <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Showing {{ (currentPage-1)*itemsPerPage + 1 }} to {{ Math.min(currentPage*itemsPerPage, filteredProducts.length) }} of {{ filteredProducts.length }} Products
         </p>
         <div class="flex items-center gap-2">
            <button 
              @click="prevPage" 
              :disabled="currentPage === 1"
              class="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-black hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size="16" />
            </button>
            <div class="flex items-center gap-1">
               <span class="text-xs font-black px-3 py-1 bg-black text-white rounded-lg">{{ currentPage }}</span>
               <span class="text-[10px] font-black text-slate-300 uppercase px-2">of</span>
               <span class="text-xs font-black text-slate-500">{{ totalPages }}</span>
            </div>
            <button 
              @click="nextPage" 
              :disabled="currentPage === totalPages"
              class="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-black hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size="16" />
            </button>
         </div>
      </div>
    </div>

    <!-- Advanced Add Product Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 lg:p-20 transition-all">
       <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showAddModal = false"></div>
       <div class="relative bg-white w-full max-w-6xl h-full rounded-[3px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300">
          <!-- Modal Header -->
          <div class="flex items-center justify-between p-8 border-b border-slate-100 flex-shrink-0">
             <div class="flex items-center gap-4">
                <div class="bg-black text-white p-3 rounded-xl">
                  <Plus v-if="modalMode === 'add'" size="20"/>
                  <Edit2 v-else-if="modalMode === 'edit'" size="20"/>
                  <Eye v-else size="20"/>
                </div>
                <div>
                   <h2 class="text-xl font-black italic uppercase tracking-tighter">
                    {{ modalMode === 'add' ? 'New Product Entry' : modalMode === 'edit' ? 'Edit Specifications' : 'Product Details' }}
                   </h2>
                   <div class="flex items-center gap-2 mt-0.5">
                       <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Commercial Listing Specification</p>
                       <span v-if="newProduct.status" class="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-md border border-blue-100 italic">{{ newProduct.status }}</span>
                    </div>
                </div>
             </div>
             <button @click="showAddModal = false" class="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black">
                <X size="24" />
             </button>
          </div>

          <!-- Modal Body with Tabs -->
          <div class="flex-1 flex overflow-hidden">
             <!-- Tabs Sidebar -->
             <div class="w-64 border-r border-slate-100 bg-slate-50/50 p-6 space-y-2 overflow-y-auto hidden md:block">
                <button 
                  v-for="tab in tabs" 
                  :key="tab.id"
                  @click="activeTab = tab.id"
                  class="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  :class="activeTab === tab.id ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100/80'"
                >
                  <component :is="tab.icon" size="16" />
                  {{ tab.label }}
                </button>
                <button 
                  @click="activeTab = 'specs'"
                  class="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all mt-4 border-t border-slate-200 pt-6"
                  :class="activeTab === 'specs' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100/80'"
                >
                  <List size="16" />
                  Specifications
                </button>
             </div>

             <!-- Tab Content Area -->
             <div class="flex-1 p-10 overflow-y-auto bg-white custom-scrollbar">
                <!-- General Info Tab -->
                <div v-if="activeTab === 'general'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Product Title</label>
                         <input v-model="newProduct.name" :disabled="modalMode === 'view'" type="text" placeholder="e.g. Essential Heavyweight Hoodie" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Brand Identity</label>
                         <input v-model="newProduct.brand" :disabled="modalMode === 'view'" type="text" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                   </div>
                   <div class="grid grid-cols-3 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Category Selection</label>
                         <select v-model="newProduct.category" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all disabled:opacity-70">
                            <option value="">Select Category</option>
                            <option>Apparel</option>
                            <option>Accessories</option>
                            <option>Footwear</option>
                         </select>
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Sub-Category</label>
                         <input v-model="newProduct.subCategory" :disabled="modalMode === 'view'" type="text" placeholder="e.g. T-Shirts" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Gender Preference</label>
                         <select v-model="newProduct.gender" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all disabled:opacity-70">
                            <option>Unisex</option>
                            <option>Men</option>
                            <option>Women</option>
                         </select>
                      </div>
                   </div>
                    <!-- Lifecycle Status Integration -->
                    <div class="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                       <div class="col-span-2 space-y-4">
                          <label class="text-[10px] font-black uppercase text-blue-500 tracking-widest">Lifecycle Status</label>
                          <div class="flex flex-wrap gap-2">
                             <button 
                                v-for="status in ['Draft', 'Active', 'Under Review', 'Inactive']" 
                                :key="status"
                                @click="newProduct.status = status"
                                :disabled="modalMode === 'view'"
                                class="px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all"
                                :class="newProduct.status === status ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'"
                             >
                                {{ status }}
                             </button>
                          </div>
                          <p class="text-[9px] text-slate-400 font-bold uppercase italic tracking-tight">Changing status directly influences the product's commercial visibility across the platform ecosystem.</p>
                       </div>
                    </div>

                    <!-- Added New Row for Primary Attributes -->
                    <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Primary Color</label>
                         <input v-model="newProduct.primaryColor" :disabled="modalMode === 'view'" type="text" placeholder="e.g. Jet Black" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Fit Segment</label>
                         <select v-model="newProduct.fit" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70 appearance-none">
                            <option value="">Select Fit</option>
                            <option>Oversized</option>
                            <option>Regular Fit</option>
                            <option>Slim Fit</option>
                            <option>Boxy Fit</option>
                            <option>Relaxed Fit</option>
                         </select>
                      </div>
                   </div>
                   <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Neck Type</label>
                         <select v-model="newProduct.neckType" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70 appearance-none">
                            <option value="">Select Neck Type</option>
                            <option>Crew Neck</option>
                            <option>V-Neck</option>
                            <option>Polo Collar</option>
                            <option>High Neck</option>
                            <option>Hooded</option>
                            <option>Round Neck</option>
                         </select>
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Occasion</label>
                         <select v-model="newProduct.occasion" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70 appearance-none">
                            <option value="">Select Occasion</option>
                            <option>Casual Wear</option>
                            <option>Partywear</option>
                            <option>Streetwear</option>
                            <option>Gym & Sports</option>
                            <option>Semi-Formal</option>
                            <option>Office Wear</option>
                            <option>Regular Use</option>
                         </select>
                      </div>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[10px] font-black uppercase text-slate-400">Detailed Description</label>
                      <div class="border rounded-xl overflow-hidden min-h-[300px]" :class="modalMode === 'view' ? 'pointer-events-none opacity-80' : ''">
                        <QuillEditor v-model:content="newProduct.description" content-type="html" :readOnly="modalMode === 'view'" theme="snow" class="min-h-[250px]" />
                      </div>
                   </div>
                </div>

                <!-- Pricing & Tax Tab -->
                <div v-if="activeTab === 'pricing'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl">
                    <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">MRP (₹)</label>
                         <div class="relative">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">₹</span>
                            <input v-model="newProduct.mrp" :disabled="modalMode === 'view'" type="number" class="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                         </div>
                      </div>
                      <div class="space-y-2 text-blue-600">
                         <label class="text-[10px] font-black uppercase text-blue-400">Sale Price (₹)</label>
                         <div class="relative">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-bold">₹</span>
                            <input v-model="newProduct.salePrice" :disabled="modalMode === 'view'" type="number" class="w-full pl-10 pr-4 py-4 bg-blue-50/50 rounded-xl border border-blue-100 focus:border-blue-600 outline-none font-bold text-sm transition-all disabled:opacity-70" />
                         </div>
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Tax Status</label>
                         <select v-model="newProduct.isTaxable" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all">
                            <option :value="true">Taxable (GST)</option>
                            <option :value="false">Non-Taxable</option>
                         </select>
                      </div>
                      <div class="space-y-2" v-if="newProduct.isTaxable">
                         <label class="text-[10px] font-black uppercase text-slate-400">Tax Percent (%)</label>
                         <input v-model="newProduct.taxPercent" :disabled="modalMode === 'view'" type="number" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-orange-400">Discount (%)</label>
                         <input v-model="newProduct.discountPercentage" :disabled="modalMode === 'view'" type="number" placeholder="0" class="w-full p-4 bg-orange-50/30 rounded-xl border border-transparent focus:border-orange-500 outline-none font-bold text-sm transition-all" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Promotion Type</label>
                         <select v-model="newProduct.promotionType" :disabled="modalMode === 'view'" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all">
                            <option value="None">No Promotion</option>
                            <option value="B1G1">Buy 1 Get 1 Free</option>
                            <option value="B2G1">Buy 2 Get 1 Free</option>
                         </select>
                      </div>
                    </div>

                    <div class="space-y-2">
                       <label class="text-[10px] font-black uppercase text-slate-400">Product Discount Coupon</label>
                       <input v-model="newProduct.discountCoupon" :disabled="modalMode === 'view'" type="text" placeholder="e.g. SUMMER20" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all" />
                    </div>

                    <div class="bg-emerald-50 p-6 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div>
                         <p class="text-[10px] font-black uppercase text-emerald-800 tracking-widest">Est. Final Price</p>
                         <p class="text-xs font-bold text-emerald-600 mt-1">Calculated based on sale price & discount</p>
                      </div>
                      <h4 class="text-2xl font-black text-emerald-700 leading-none">₹{{ (newProduct.salePrice * (1 - (newProduct.discountPercentage || 0) / 100)).toFixed(2) }}</h4>
                    </div>
                </div>

                <!-- Inventory Tab -->
                <div v-if="activeTab === 'inventory'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-2xl">
                   <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">SKU Number</label>
                         <input v-model="newProduct.sku" :disabled="modalMode === 'view'" type="text" placeholder="DYN-SH-001" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Barcode / EAN</label>
                         <input v-model="newProduct.barcode" :disabled="modalMode === 'view'" type="text" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                   </div>
                   <div class="grid grid-cols-2 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Total Stock</label>
                         <input v-model="newProduct.stock" :disabled="modalMode === 'view'" type="number" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2 text-orange-600">
                         <label class="text-[10px] font-black uppercase text-orange-400">Low Stock Threshold</label>
                         <input v-model="newProduct.lowStockAlert" :disabled="modalMode === 'view'" type="number" class="w-full p-4 bg-orange-50/50 rounded-xl border border-orange-100 focus:border-orange-600 outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                   </div>
                </div>

                <!-- Variants Tab -->
                <div v-if="activeTab === 'variants'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div class="flex items-center justify-between">
                      <div>
                        <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">Product Configurations</h3>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Grouped by Color Dimensions</p>
                      </div>
                      <button @click="addColorVariant" :disabled="modalMode === 'view'" class="px-4 py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                         <Plus size="14"/> Add Color View
                      </button>
                   </div>
                   
                   <div class="space-y-10">
                      <div v-for="(colorGroup, cIdx) in newProduct.variants" :key="cIdx" class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                         <div class="bg-slate-50 p-6 flex items-center justify-between border-b border-slate-100">
                            <div class="flex items-center gap-4 flex-1">
                               <div class="space-y-1 max-w-xs w-full">
                                  <label class="text-[8px] font-black uppercase text-slate-400">Base Color Name</label>
                                  <input v-model="colorGroup.color" :disabled="modalMode === 'view'" type="text" placeholder="Midnight Black" class="w-full p-2 bg-white rounded-lg border border-slate-100 outline-none font-black text-xs disabled:opacity-70" />
                               </div>
                               <div class="w-[1px] h-10 bg-slate-200 mx-4"></div>
                               <p class="text-[9px] font-black uppercase text-slate-300">{{ colorGroup.sizes.length }} Size Mappings</p>
                            </div>
                            <button @click="removeColorVariant(cIdx)" :disabled="modalMode === 'view'" class="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                               <Trash2 size="18"/>
                            </button>
                         </div>
                         
                         <div class="p-6 space-y-4 bg-white/50">
                            <div v-for="(s, sIdx) in colorGroup.sizes" :key="sIdx" class="grid grid-cols-12 gap-4 items-end">
                               <div class="col-span-4 space-y-1">
                                  <label class="text-[8px] font-black uppercase text-slate-400">Size Label</label>
                                  <select v-model="s.size" :disabled="modalMode === 'view'" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-xs appearance-none disabled:opacity-70">
                                     <option value="">Select Size</option>
                                     <option>Free Size</option>
                                     <option>Oversized XL</option>
                                     <option>Oversized L</option>
                                     <option>Oversized M</option>
                                     <option>S</option>
                                     <option>M</option>
                                     <option>L</option>
                                     <option>XL</option>
                                     <option>XXL</option>
                                     <option>Custom</option>
                                  </select>
                               </div>
                               <div class="col-span-4 space-y-1">
                                  <label class="text-[8px] font-black uppercase text-slate-400">Stock Quantity</label>
                                  <input v-model="s.stock" :disabled="modalMode === 'view'" type="number" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-xs disabled:opacity-70" />
                               </div>
                               <div class="col-span-3 pb-0.5">
                                  <div class="flex items-center gap-2">
                                     <div class="w-2 h-2 rounded-full" :class="s.stock > 10 ? 'bg-emerald-500' : 'bg-orange-500'"></div>
                                     <span class="text-[9px] font-black uppercase text-slate-400">{{ s.stock > 10 ? 'Level: OK' : 'Level: LOW' }}</span>
                                  </div>
                               </div>
                               <div class="col-span-1 flex justify-end pb-3">
                                  <button v-if="colorGroup.sizes.length > 1" @click="removeSizeFromColor(cIdx, sIdx)" :disabled="modalMode === 'view'" class="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                                     <X size="16"/>
                                  </button>
                               </div>
                            </div>
                            <button @click="addSizeToColor(cIdx)" :disabled="modalMode === 'view'" class="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors group/btn disabled:opacity-70 disabled:cursor-not-allowed">
                               <div class="p-1 bg-blue-50 group-hover/btn:bg-blue-100 rounded-md transition-all"><Plus size="10"/></div>
                               Add Another Size dimension
                            </button>
                         </div>
                      </div>
                   </div>
                   
                   <div v-if="newProduct.variants.length === 0" class="p-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                      <div class="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                         <List size="32" stroke-width="1" />
                      </div>
                      <h4 class="text-sm font-black uppercase text-slate-700">No Custom Variatons</h4>
                      <p class="text-xs text-slate-400 mt-2">Add color-based groups to specify different size and stock levels</p>
                      <button @click="addColorVariant" :disabled="modalMode === 'view'" class="mt-6 px-10 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-70 disabled:cursor-not-allowed">Start Mapping</button>
                   </div>
                </div>

                <!-- Media Gallery Tab -->
                <div v-if="activeTab === 'media'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div v-for="(img, idx) in newProduct.images" :key="idx" class="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative group overflow-hidden">
                         <img v-if="img" :src="img" class="w-full h-full object-cover" />
                         <div v-else class="text-center p-4">
                            <ImageIcon size="32" class="text-slate-300 mx-auto" stroke-width="1.5" />
                            <p class="text-[9px] font-black uppercase text-slate-400 mt-2">Upload or Paste URL</p>
                          </div>
                          <input v-model="newProduct.images[idx]" :disabled="modalMode === 'view'" placeholder="Paste Image URL..." class="absolute bottom-3 left-3 right-3 p-2 bg-white/95 backdrop-blur shadow-xl rounded-lg text-[9px] outline-none border border-slate-100 font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0" />
                         <button v-if="newProduct.images.length > 1" @click="removeImageField(idx)" :disabled="modalMode === 'view'" class="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed">
                            <X size="14" />
                         </button>
                      </div>
                      <button @click="addImageField" :disabled="modalMode === 'view'" class="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 hover:border-black hover:bg-white transition-all flex flex-col items-center justify-center text-slate-300 hover:text-black disabled:opacity-70 disabled:cursor-not-allowed">
                         <Plus size="32" stroke-width="1.5" />
                         <p class="text-[9px] font-black uppercase mt-2 tracking-widest">New View Slot</p>
                      </button>
                   </div>
                </div>

                <!-- SEO Settings Tab -->
                <div v-if="activeTab === 'seo'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl">
                   <div class="space-y-2">
                       <label class="text-[10px] font-black uppercase text-slate-400">Meta Title</label>
                       <input v-model="newProduct.seoTitle" :disabled="modalMode === 'view'" type="text" placeholder="Organic Cotton Tee - Wear Dynamite" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                       <p class="text-[9px] text-slate-400 font-medium">{{ newProduct.seoTitle.length }}/60 Characters recommended</p>
                   </div>
                   <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-slate-400">Meta Description</label>
                        <textarea v-model="newProduct.seoDescription" :disabled="modalMode === 'view'" rows="4" placeholder="Explore the latest in sustainable fashion with our Dynamite Club collection..." class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all resize-none disabled:opacity-70"></textarea>
                    </div>
                    <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-slate-400">Search Keywords (Comma Separated)</label>
                        <input :value="newProduct.keywords?.join(', ')" @input="newProduct.keywords = $event.target.value.split(',').map(k => k.trim())" :disabled="modalMode === 'view'" type="text" placeholder="streetwear, oversized, summer, black" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                    </div>
                   <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase text-slate-400">URL Handle Identifier</label>
                        <div class="flex items-center gap-1 bg-slate-50 p-4 rounded-xl text-sm font-bold border border-transparent focus-within:border-black transition-all" :class="modalMode === 'view' ? 'opacity-70' : ''">
                           <span class="text-slate-300">weardynamite.com/product/</span>
                           <input v-model="newProduct.urlHandle" :disabled="modalMode === 'view'" type="text" placeholder="unique-slug-path" class="bg-transparent outline-none flex-1" />
                        </div>
                   </div>
                   <!-- Preview Card -->
                   <div class="mt-10 border border-slate-100 p-8 rounded-2xl bg-slate-50 shadow-inner">
                      <p class="text-[9px] font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-2 italic">
                         <Globe size="12" /> Google Search Preview
                      </p>
                      <h4 class="text-blue-600 text-xl font-medium hover:underline cursor-pointer">{{ newProduct.seoTitle || 'Product Preview Title' }}</h4>
                      <p class="text-emerald-700 text-sm mt-1">weardynamite.com/product/{{ newProduct.urlHandle || 'slug-placeholder' }}</p>
                      <p class="text-slate-500 text-xs mt-2 leading-relaxed line-clamp-2">{{ newProduct.seoDescription || 'Optimize your meta description to increase click-through rates and brand visibility across search engines.' }}</p>
                   </div>
                </div>

                <!-- Specifications Tab -->
                <div v-if="activeTab === 'specs'" class="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div class="flex items-center justify-between">
                      <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">Technical Attributes</h3>
                      <button @click="newProduct.specs.push({ key: '', value: '' })" :disabled="modalMode === 'view'" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 disabled:opacity-70 disabled:cursor-not-allowed">
                         <Plus size="14"/> Add Specification
                      </button>
                   </div>
                   <div class="space-y-4">
                       <div v-for="(spec, idx) in newProduct.specs" :key="idx" class="grid grid-cols-2 gap-4 items-center group">
                          <input v-model="spec.key" :disabled="modalMode === 'view'" placeholder="Key (e.g. Material)" class="p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-[10px] uppercase tracking-wider transition-all disabled:opacity-70" />
                          <div class="flex items-center gap-4">
                             <input v-model="spec.value" :disabled="modalMode === 'view'" placeholder="Value (e.g. 100% Organic Cotton)" class="flex-1 p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                             <button v-if="modalMode !== 'view'" @click="newProduct.specs.splice(idx, 1)" class="p-2 text-slate-200 hover:text-red-500 transition-colors">
                                <X size="18" />
                             </button>
                          </div>
                       </div>
                   </div>
                   <div class="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
                      <div class="p-3 bg-blue-600 text-white rounded-xl h-fit"><Info size="18"/></div>
                      <div>
                         <h4 class="text-xs font-black uppercase text-blue-900">Pro Tip</h4>
                         <p class="text-xs text-blue-700 mt-1 leading-relaxed">Adding technical specifications like GSM, weave pattern, or washing instructions helps increase customer trust and reduces return rates by up to 24%.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
             <div class="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <Tag size="14" />
                DYNAMITE CONTROL CENTER V2.0
             </div>
             <div class="flex items-center gap-4">
                <button @click="showAddModal = false" class="text-xs font-black uppercase text-slate-400 hover:text-black">Cancel</button>
                <button v-if="modalMode !== 'view'" @click="saveProduct" class="bg-black text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 shadow-xl shadow-black/10 transition-all flex items-center gap-2">
                   <Plus v-if="modalMode === 'add'" size="18" />
                   <Edit2 v-else size="18" />
                   {{ modalMode === 'add' ? 'Commit to Vault' : 'Update Specs' }}
                </button>
             </div>
          </div>
       </div>
    </div>

    <!-- Custom Delete Confirmation Modal (Moved to root for clarity) -->
    <div v-if="showDeleteConfirm" class="fixed inset-0 z-[9999] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-900/80 backdrop-blur-md" @click="showDeleteConfirm = false"></div>
       <div class="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div class="p-10 text-center">
             <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size="32" stroke-width="1.5" />
             </div>
             <h3 class="text-xl font-black uppercase italic tracking-tighter">Confirm Deletion</h3>
             <p class="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 px-8">Are you sure you want to remove <span class="text-red-600 underline">"{{ productToDelete?.name }}"</span> from the vault?</p>
             <p class="text-[9px] text-slate-400 font-bold uppercase mt-4 tracking-tighter">This action is permanent and cannot be undone.</p>
             
             <div class="grid grid-cols-2 gap-4 mt-10">
                <button @click="showDeleteConfirm = false" class="py-4 rounded-xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
                   No, Keep Product
                </button>
                 <button 
                  @click="executeDelete" 
                  :disabled="isDeleting"
                  class="bg-red-600 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-900/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                 >
                    <span v-if="isDeleting" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {{ isDeleting ? 'Purging...' : 'Yes, Delete Permanently' }}
                 </button>
             </div>
          </div>
       </div>
    </div>
     <!-- Custom Date Range Analytics Modal -->
     <AnalyticsModal 
       :show="showAnalyticsModal" 
       title="Inventory Performance Analytics"
       type="inventory"
       :data="adminStore.products"
       @close="showAnalyticsModal = false"
     />
  </div>
</template>

<style>
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
@keyframes slide-in-from-right { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.animate-in {
  animation-fill-mode: forwards;
}
.fade-in { animation: fade-in 0.3s ease-out; }
.zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.slide-in-from-right-4 { animation: slide-in-from-right 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
</style>

