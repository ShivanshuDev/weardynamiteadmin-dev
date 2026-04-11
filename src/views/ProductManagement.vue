<script setup>
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Plus, Search, Filter, MoreVertical, Edit2, Trash2, Eye, 
  X, ChevronLeft, ChevronRight, Image as ImageIcon, 
  DollarSign, Layers, Settings, Globe, Tag, Info, List,
  BarChart3, Download, FileText, Camera, Upload, RefreshCw,
  ShoppingCart, Check, Zap
} from 'lucide-vue-next'
import { QuillEditor } from '@vueup/vue-quill'
import AnalyticsModal from '../components/AnalyticsModal.vue'
import { PRODUCT_TAXONOMY, GENDERS } from '../data/categories'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()

// Search & Filter State
const searchQuery = ref('')
const filterCategory = ref('')
const startDate = ref('')
const endDate = ref('')
const statusFilter = ref('All')
const statusTabs = ['All', 'Draft', 'Active', 'Under Review', 'Inactive', 'Sold', 'Return']
const bulkStatuses = [
  { id: 'Active', label: 'Activate', icon: Check, color: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' },
  { id: 'Draft', label: 'Move to Draft', icon: RefreshCw, color: 'bg-slate-600 hover:bg-slate-700 shadow-slate-900/20' },
  { id: 'Under Review', label: 'Review', icon: Zap, color: 'bg-orange-600 hover:bg-orange-700 shadow-orange-900/20' },
  { id: 'Sold', label: 'Mark as Sold', icon: ShoppingCart, color: 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20' },
  { id: 'Return', label: 'Process Return', icon: RefreshCw, color: 'bg-purple-600 hover:bg-purple-700 shadow-purple-900/20' },
  { id: 'Inactive', label: 'Deactivate', icon: X, color: 'bg-red-600 hover:bg-red-700 shadow-red-900/20' }
]

// Utility Formatting
const formatDate = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Computed Filtering
const filteredProducts = computed(() => {
  return adminStore.products.filter(p => {
    const s = searchQuery.value.toLowerCase()
    // "Filter by all row" (Global search across columns)
    const matchesSearch = (p.name || '').toLowerCase().includes(s) || 
                          (p.id || '').toString().includes(s) ||
                          (p.sku && p.sku.toLowerCase().includes(s)) ||
                          (p.category && p.category.toLowerCase().includes(s)) ||
                          (p.status && p.status.toLowerCase().includes(s)) ||
                          (p.gender && p.gender.toLowerCase().includes(s)) ||
                          (p.brand && p.brand.toLowerCase().includes(s))

    const matchesCategory = filterCategory.value === '' || p.category === filterCategory.value
    const matchesStatus = statusFilter.value === 'All' || p.status === statusFilter.value
    
    // Date Range Filtering
    const matchesStartDate = !startDate.value || p.created_at >= new Date(startDate.value).getTime()
    const matchesEndDate = !endDate.value || p.created_at <= new Date(endDate.value).setHours(23, 59, 59, 999)

    return matchesSearch && matchesCategory && matchesStatus && matchesStartDate && matchesEndDate
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

// selection state
const selectedProductIds = ref([])
const showBulkConfirm = ref(false)
const bulkStatusTarget = ref('')

const isAllSelected = computed({
  get: () => paginatedProducts.value.length > 0 && paginatedProducts.value.every(p => selectedProductIds.value.includes(p.id)),
  set: (val) => {
    if (val) {
      const idsToAdd = paginatedProducts.value.map(p => p.id)
      const newSelected = new Set([...selectedProductIds.value, ...idsToAdd])
      if (newSelected.size > 50) {
        adminStore.showNotification('Selection Limit', 'For processing integrity, maximum 50 items can be selected for bulk update.', 'warning')
        selectedProductIds.value = Array.from(newSelected).slice(0, 50)
      } else {
        selectedProductIds.value = Array.from(newSelected)
      }
    } else {
      const idsToRemove = paginatedProducts.value.map(p => p.id)
      selectedProductIds.value = selectedProductIds.value.filter(id => !idsToRemove.includes(id))
    }
  }
})

const toggleSelectAll = (event) => {
  isAllSelected.value = event.target.checked
}

const toggleSelectProduct = (id) => {
  const index = selectedProductIds.value.indexOf(id)
  if (index === -1) {
    if (selectedProductIds.value.length >= 50) {
      adminStore.showNotification('Selection Limit', 'Institutional limit reached: Maximum 50 items can be selected for bulk update.', 'warning')
      return
    }
    selectedProductIds.value.push(id)
  } else {
    selectedProductIds.value.splice(index, 1)
  }
}

const handleBulkStatusUpdate = async (status) => {
  if (!selectedProductIds.value.length) return
  
  try {
    await adminStore.bulkUpdateProductStatus(selectedProductIds.value, status)
    selectedProductIds.value = []
    showBulkConfirm.value = false
    // Refresh items to show new status
    await adminStore.fetchProducts() 
  } catch (err) {
    console.error('Bulk update failed:', err)
    adminStore.showNotification('Operational Failure', 'Failed to update some items. Please check the logs.', 'error')
  }
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
  gender: 'Men',
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
  specs: [],
  aboutThisItem: [],
  image: '',
  isReturnable: true,
  returnDays: 7,
  codAvailable: false,
  codCouponApplicable: false,
  isFreshArrival: false,
  isMostPopular: false
})

// Taxonomy Logic Helpers
const getCategoriesForGender = (gender) => {
  if (!gender || !PRODUCT_TAXONOMY[gender]) return []
  return Object.keys(PRODUCT_TAXONOMY[gender])
}

const getSubCategoriesForCategory = (item) => {
  const gender = item.gender
  const category = item.category
  if (!gender || !category || !PRODUCT_TAXONOMY[gender] || !PRODUCT_TAXONOMY[gender][category]) return []
  return PRODUCT_TAXONOMY[gender][category]
}

const handleGenderChange = () => {
  newProduct.value.category = ''
  newProduct.value.subCategory = ''
}

const handleCategoryChange = () => {
  newProduct.value.subCategory = ''
}



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
      adminStore.showNotification('Purge Failed', 'Institutional delete failed. Please verify server connectivity.', 'error')
    } finally {
      isDeleting.value = false
    }
  }
}

const activePreviewImage = ref('')

const validateProduct = () => {
  const p = newProduct.value
  const errors = []

  if (!p.name?.trim()) errors.push('Product Name is required.')
  if (!p.brand?.trim()) errors.push('Brand is required.')
  if (!p.category?.trim()) errors.push('Category is required.')
  if (!p.subCategory?.trim()) errors.push('Sub-Category is required.')
  if (!p.description?.trim()) errors.push('Description is required.')
  if (!p.sku?.trim()) errors.push('SKU is required.')
  if (!p.barcode?.trim()) errors.push('Barcode is required.')
  
  if (Number(p.mrp) <= 0) errors.push('MRP must be greater than 0.')
  if (Number(p.salePrice) <= 0) errors.push('Sale Price must be greater than 0.')
  
  // Clean empty images
  const validImages = (p.images || []).filter(img => img && img.trim() !== '')
  if (validImages.length < 3) {
    errors.push('Institutional Standard: Minimum 3 product images are required.')
  }

  // Variant validation
  const hasValidVariant = p.variants?.some(v => v.color && v.sizes?.some(s => s.size && Number(s.stock) >= 0))
  if (!hasValidVariant) {
    errors.push('At least one valid color variant with stock is required.')
  }

  return errors
}

const openAddModal = () => {
  modalMode.value = 'add'
  activeTab.value = 'general'
  activePreviewImage.value = ''
  // Reset newProduct with explicit boolean defaults
  newProduct.value = {
    name: '', brand: 'Wear Dynamite', status: 'Draft', category: '', subCategory: '', gender: 'Men', description: '',
    mrp: 0, salePrice: 0, purchasePrice: 0, taxPercent: 18, isTaxable: true, discountPercentage: 0, promotionType: 'None', discountCoupon: '',
    sku: '', barcode: '', stock: 0, lowStockAlert: 10,
    primaryColor: '', primarySize: '', fit: '', neckType: '', occasion: '', images: [''], variants: [{ color: '', sizes: [{ size: '', stock: 0 }] }],
    keywords: [], seoTitle: '', seoDescription: '', urlHandle: '', specs: [], aboutThisItem: [], image: '',
    isReturnable: true, returnDays: 7, codAvailable: false, codCouponApplicable: false,
    isFreshArrival: false, isMostPopular: false
  }
  showAddModal.value = true
}

const openEditModal = (product) => {
  modalMode.value = 'edit'
  activeTab.value = 'general'
  const p = JSON.parse(JSON.stringify(product))
  
  // Hardening media: Merge singular 'image' into 'images' array if missing
  if (!p.images || !p.images.length || (p.images.length === 1 && !p.images[0])) {
    p.images = p.image ? [p.image] : ['']
  } else if (p.image && !p.images.includes(p.image)) {
    p.images.unshift(p.image)
  }
  
  // Clean up duplicates and empty strings
  p.images = Array.from(new Set(p.images.filter(img => img && img.trim() !== '')))
  if (p.images.length === 0) p.images = ['']

  if (!p.variants || !p.variants.length) p.variants = [{ color: '', sizes: [{ size: '', stock: 0 }] }]
  if (!p.specs) p.specs = []
  if (!p.aboutThisItem) p.aboutThisItem = []
  if (!p.keywords) p.keywords = []
  
  newProduct.value = p
  activePreviewImage.value = p.images[0] || ''
  showAddModal.value = true
}

const openViewModal = (product) => {
  modalMode.value = 'view'
  activeTab.value = 'general'
  const p = JSON.parse(JSON.stringify(product))

  // Hardening media: Merge singular 'image' into 'images' array if missing
  if (!p.images || !p.images.length || (p.images.length === 1 && !p.images[0])) {
    p.images = p.image ? [p.image] : ['']
  } else if (p.image && !p.images.includes(p.image)) {
    p.images.unshift(p.image)
  }

  // Clean up duplicates
  p.images = Array.from(new Set(p.images.filter(img => img && img.trim() !== '')))
  if (p.images.length === 0) p.images = ['']

  if (!p.variants || !p.variants.length) p.variants = [{ color: '', sizes: [{ size: '', stock: 0 }] }]
  if (!p.specs) p.specs = []
  if (!p.aboutThisItem) p.aboutThisItem = []
  if (!p.keywords) p.keywords = []

  newProduct.value = p
  activePreviewImage.value = p.images[0] || ''
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
  // Ensure the primary image field stays in sync if the first image was removed
  if (index === 0) {
    newProduct.value.image = newProduct.value.images[0] || ''
  }
}

const moveImage = (index, direction) => {
  const targetIndex = index + direction
  if (targetIndex < 0 || targetIndex >= newProduct.value.images.length) return
  
  const currentImgs = [...newProduct.value.images]
  const temp = currentImgs[index]
  currentImgs[index] = currentImgs[targetIndex]
  currentImgs[targetIndex] = temp
  
  newProduct.value.images = currentImgs
  
  // Sync primary image if position 0 was moved
  if (index === 0 || targetIndex === 0) {
    newProduct.value.image = newProduct.value.images[0] || ''
  }
}

// Media Upload Logic
const isUploadingMedia = ref(false)
const handleProductImageUpload = async (event, index = null) => {
  const files = event.target.files ? Array.from(event.target.files) : []
  if (!files.length) return
  
  isUploadingMedia.value = true
  
  // If editing/replacing a specific slot, only take the first file
  if (index !== null) {
    await uploadFileToStore(files[0], index)
  } else {
    // Sequential upload for multiple files
    for (const file of files) {
      await uploadFileToStore(file)
    }
  }
  
  event.target.value = ''
  isUploadingMedia.value = false
}

const uploadFileToStore = async (file, index = null) => {
  isUploadingMedia.value = true
  try {
    // 1. Get Presigned URL
    const { uploadUrl, fileKey } = await adminStore.getPresignedUrl(file.name, file.type, 'products')
    
    // 2. Upload to S3
    await adminStore.uploadToS3(uploadUrl, file)

    // 3. Update state
    if (index !== null && index < newProduct.value.images.length) {
      newProduct.value.images.splice(index, 1, fileKey)
    } else {
      // Replace placeholder if present
      if (newProduct.value.images.length === 1 && !newProduct.value.images[0]) {
        newProduct.value.images.splice(0, 1, fileKey)
      } else {
        newProduct.value.images.push(fileKey)
      }
    }
    
    // Sync primary image if this was the first one
    if (index === 0 || (!newProduct.value.image && fileKey)) {
      newProduct.value.image = newProduct.value.images[0] || fileKey
    }
  } catch (error) {
    console.error('Product Media Upload Failed:', error)
    adminStore.showNotification('Media Error', 'Failed to upload asset to the vault. Please check your connectivity and try again.', 'error')
  } finally {
    isUploadingMedia.value = false
  }
}

const saveProduct = async () => {
  const errors = validateProduct()
  if (errors.length > 0) {
    adminStore.showNotification('Validation Required', 'Please correct following before committing:\n\n• ' + errors.join('\n• '), 'warning')
    return
  }

  const totalVariantStock = newProduct.value.variants.reduce((acc, colorGroup) => {
    return acc + colorGroup.sizes.reduce((sAcc, s) => sAcc + (Number(s.stock) || 0), 0)
  }, 0)

  try {
    if (modalMode.value === 'add') {
      const productToSave = {
        ...newProduct.value,
        id: Date.now(),
        salePrice: Number(newProduct.value.salePrice) || 0,
        purchasePrice: Number(newProduct.value.purchasePrice) || 0,
        stock: totalVariantStock,
        image: newProduct.value.images.filter(i => i)[0] || ''
      }
      await adminStore.addProduct(productToSave)
    } else if (modalMode.value === 'edit') {
      const updatedProduct = {
        ...newProduct.value,
        salePrice: Number(newProduct.value.salePrice) || 0,
        purchasePrice: Number(newProduct.value.purchasePrice) || 0,
        stock: totalVariantStock,
        image: newProduct.value.images.filter(i => i)[0] || ''
      }
      await adminStore.updateProduct(updatedProduct)
    }
    
    showAddModal.value = false
    activeTab.value = 'general'
    adminStore.showNotification('Success', 'Product vault updated successfully.', 'success')
  } catch (error) {
    console.error('Save failed:', error)
    adminStore.showNotification('Vault Update Failed', error.message || 'Server connection error', 'error')
  }
}

// Export State
const isExporting = ref(false)

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
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
    adminStore.showNotification('Export Failed', 'Catalog manifest generation failed. Technical logs have been recorded.', 'error')
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
    adminStore.showNotification('Export Failed', 'Excel generation was interrupted by a system error.', 'error')
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
      
      <!-- Date Range Filter -->
      <div class="flex items-center gap-3 px-6 py-4 bg-white border border-slate-100 rounded-2xl shadow-sm group focus-within:border-blue-500 transition-all">
        <div class="flex flex-col">
          <span class="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em] leading-none mb-1">Added Range</span>
          <div class="flex items-center gap-2">
            <input 
              v-model="startDate" 
              type="date" 
              class="bg-transparent outline-none text-[10px] font-bold text-slate-600 cursor-pointer focus:text-blue-600 transition-colors" 
            />
            <span class="text-slate-200 text-xs">-</span>
            <input 
              v-model="endDate" 
              type="date" 
              class="bg-transparent outline-none text-[10px] font-bold text-slate-600 cursor-pointer focus:text-blue-600 transition-colors" 
            />
          </div>
        </div>
        <button 
          v-if="startDate || endDate" 
          @click="startDate = ''; endDate = ''"
          class="text-slate-300 hover:text-red-500 transition-colors"
        >
          <X size="14" />
        </button>
      </div>
    </div>

     <!-- Table -->
     <div class="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-x-auto min-h-[600px] flex flex-col">
       <table class="w-full text-left min-w-[1400px]">
         <thead>
           <tr class="bg-slate-50/50">
             <th class="px-6 py-4 w-12">
               <div class="flex items-center justify-center">
                 <input 
                   type="checkbox" 
                   :checked="isAllSelected"
                   @change="toggleSelectAll"
                   class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 />
               </div>
             </th>
             <th class="px-6 py-4 text-[10px] font-black uppercase text-slate-500 w-16 text-center">No.</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Identity</th>

             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Category</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Gender</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Status</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">MRP</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Sale</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Tax %</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Disc %</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500">Promo / Coupon</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Stock</th>
             <th class="px-3 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Fresh</th>
             <th class="px-3 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Popular</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Features</th>
             <th class="px-4 py-4 text-[10px] font-black uppercase text-slate-500 text-center">Added Date</th>
             <th class="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Actions</th>
           </tr>
         </thead>
        <tbody class="divide-y divide-slate-50 flex-1">
           <tr v-for="(p, idx) in paginatedProducts" :key="p.id" class="hover:bg-slate-50/50 transition-colors group h-14 overflow-hidden border-b border-slate-50 cursor-pointer" @click="openViewModal(p)">
             <td class="px-6 w-12" @click.stop>
               <div class="flex items-center justify-center">
                 <input 
                   type="checkbox" 
                   :checked="selectedProductIds.includes(p.id)"
                   @change="toggleSelectProduct(p.id)"
                   class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 />
               </div>
             </td>
             <td class="px-6 text-center font-black text-[10px] text-slate-400 font-mono">
               {{ (currentPage - 1) * itemsPerPage + idx + 1 }}
             </td>
             <td class="px-4">
              <div class="flex items-center gap-3">
                 <img :src="adminStore.resolveImageUrl(p.image)" class="w-9 h-9 rounded-lg object-cover bg-slate-100 shadow-sm border border-slate-100" />
                 <div class="flex flex-col gap-0.5">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter font-mono leading-none">{{ p.sku || p.id }}</span>
                    <p class="text-[11px] font-black text-slate-900 truncate max-w-[150px] italic leading-tight">{{ p.name }}</p>
                 </div>
              </div>
            </td>
            <td class="px-4">
               <div class="flex flex-col">
                  <span class="text-[10px] font-black text-slate-600 uppercase">{{ p.category }}</span>
               </div>
            </td>
            <td class="px-4 text-center">
               <span class="text-[10px] font-black text-blue-500">{{ (p.gender || 'U').charAt(0).toUpperCase() }}</span>
            </td>
            <td class="px-4 text-center">
               <span 
                 class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border"
                 :class="{
                    'bg-slate-50 text-slate-400 border-slate-100': !p.status || ['Draft', 'draft'].includes(p.status),
                    'bg-emerald-50 text-emerald-600 border-emerald-100': ['Active', 'active'].includes(p.status),
                    'bg-orange-50 text-orange-600 border-orange-100': ['Under Review', 'under_review'].includes(p.status),
                    'bg-blue-50 text-blue-600 border-blue-100': ['Sold', 'sold'].includes(p.status),
                    'bg-purple-50 text-purple-600 border-purple-100': ['Return', 'return'].includes(p.status),
                    'bg-red-50 text-red-600 border-red-100': ['Inactive', 'inactive'].includes(p.status)
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
               <div class="inline-flex flex-col items-center">
                  <span class="text-[11px] font-black" :class="p.stock <= (p.lowStockAlert || 10) ? 'text-red-500' : 'text-slate-800'">{{ p.stock }}</span>
                  <div v-if="p.stock <= (p.lowStockAlert || 10)" class="w-1 h-1 rounded-full bg-red-500 mt-0.5 animate-pulse"></div>
               </div>
            </td>
            <td class="px-3 text-center" @click.stop>
               <button 
                 @click="adminStore.updateProduct({ id: p.id, isFreshArrival: !p.isFreshArrival })"
                 class="w-8 h-4 rounded-full transition-all relative"
                 :class="p.isFreshArrival ? 'bg-blue-600' : 'bg-slate-200'"
               >
                 <div class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" :style="{ left: p.isFreshArrival ? '18px' : '2px' }"></div>
               </button>
            </td>
            <td class="px-3 text-center" @click.stop>
               <button 
                 @click="adminStore.updateProduct({ id: p.id, isMostPopular: !p.isMostPopular })"
                 class="w-8 h-4 rounded-full transition-all relative"
                 :class="p.isMostPopular ? 'bg-orange-500' : 'bg-slate-200'"
               >
                 <div class="absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all" :style="{ left: p.isMostPopular ? '18px' : '2px' }"></div>
               </button>
            </td>
            <td class="px-4 text-center">
               <div class="flex items-center justify-center gap-2">
                  <div v-if="p.codAvailable" class="p-1.5 bg-emerald-50 text-emerald-600 rounded-md shadow-sm border border-emerald-100/50" title="COD Available">
                    <DollarSign size="12" />
                  </div>
                  <div v-if="p.isReturnable" class="p-1.5 bg-blue-50 text-blue-600 rounded-md shadow-sm border border-blue-100/50 flex items-center gap-1.5" :title="`Returnable (${p.returnDays || 7} days)`">
                    <RefreshCw size="12" />
                    <span class="text-[9px] font-black">{{ p.returnDays || 7 }}d</span>
                  </div>
                  <div v-if="!p.codAvailable && !p.isReturnable" class="text-slate-200 text-[10px]">-</div>
               </div>
            </td>
            <td class="px-4 text-center">
               <span class="text-[10px] font-black text-slate-400 font-mono tracking-tighter">{{ formatDate(p.created_at) }}</span>
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

    <!-- Floating Bulk Actions Manifest -->
    <Transition
      enter-active-class="transform transition ease-out duration-500"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transform transition ease-in duration-300"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="selectedProductIds.length > 0" class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[90] w-full max-w-4xl px-4">
        <div class="bg-black/90 backdrop-blur-xl border border-white/10 rounded-[4px] shadow-2xl p-6 flex items-center justify-between gap-8">
            <div class="flex items-center gap-6">
                <div class="flex flex-col">
                  <span class="text-[8px] font-black uppercase text-slate-500 tracking-[0.3em] leading-none mb-1.5">Administrative Selection</span>
                  <div class="flex items-center gap-2">
                    <span class="text-white text-2xl font-black italic">{{ selectedProductIds.length }}</span>
                    <span class="text-white/40 text-[10px] font-black uppercase tracking-widest pt-1">Units Selected</span>
                  </div>
                </div>
                <div class="h-10 w-[1px] bg-white/10 mx-2"></div>
                <button @click="selectedProductIds = []" class="text-white/60 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
                    <X size="14"/> Deselect All
                </button>
            </div>

            <div class="flex items-center gap-2">
                <div class="flex flex-wrap items-center gap-2 justify-end">
                    <button 
                      v-for="status in bulkStatuses" 
                      :key="status.id"
                      @click="handleBulkStatusUpdate(status.id)"
                      class="px-4 py-2.5 rounded-sm text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                      :class="[status.color, 'text-white']"
                    >
                      <component :is="status.icon" size="14"/>
                      {{ status.label }}
                    </button>
                </div>
            </div>
        </div>
     </div>
    </Transition>

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

          <!-- Modal Body with Bifurcated Layout -->
          <div v-if="modalMode === 'add' || modalMode === 'edit'" class="flex-1 flex overflow-hidden">
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
                         <input v-model="newProduct.name" type="text" placeholder="e.g. Essential Heavyweight Hoodie" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all shadow-sm" />
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Brand Identity</label>
                         <input v-model="newProduct.brand" type="text" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all shadow-sm" />
                      </div>
                   </div>


                   <div class="grid grid-cols-3 gap-8">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Gender / Segment</label>
                         <select v-model="newProduct.gender" @change="handleGenderChange" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all shadow-sm">
                            <option v-for="g in GENDERS" :key="g" :value="g">{{ g }}</option>
                         </select>
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Category Selection</label>
                         <select v-model="newProduct.category" @change="handleCategoryChange" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all shadow-sm">
                            <option value="">Select Category</option>
                            <option v-for="cat in getCategoriesForGender(newProduct.gender)" :key="cat" :value="cat">{{ cat }}</option>
                         </select>
                      </div>
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-slate-400">Sub-Category</label>
                         <select v-model="newProduct.subCategory" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm appearance-none transition-all shadow-sm">
                            <option value="">Select Sub-Category</option>
                            <option v-for="sub in getSubCategoriesForCategory(newProduct)" :key="sub" :value="sub">{{ sub }}</option>
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

                    <!-- Feature Flag Integration -->
                    <div class="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                       <div class="space-y-4">
                          <label class="text-[10px] font-black uppercase text-blue-500 tracking-widest">Homepage Visibility</label>
                          <div class="flex items-center gap-6">
                             <label class="flex items-center gap-3 cursor-pointer group">
                                <div 
                                   @click="newProduct.isFreshArrival = !newProduct.isFreshArrival"
                                   class="w-10 h-5 rounded-full transition-all relative"
                                   :class="newProduct.isFreshArrival ? 'bg-blue-600' : 'bg-slate-200'"
                                >
                                   <div class="absolute top-1 w-3 h-3 rounded-full bg-white transition-all" :style="{ left: newProduct.isFreshArrival ? '24px' : '4px' }"></div>
                                </div>
                                <span class="text-[11px] font-black uppercase tracking-widest group-hover:text-blue-600 transition-colors" :class="newProduct.isFreshArrival ? 'text-blue-600' : 'text-slate-400'">Fresh Arrival</span>
                             </label>
                             
                             <label class="flex items-center gap-3 cursor-pointer group">
                                <div 
                                   @click="newProduct.isMostPopular = !newProduct.isMostPopular"
                                   class="w-10 h-5 rounded-full transition-all relative"
                                   :class="newProduct.isMostPopular ? 'bg-orange-500' : 'bg-slate-200'"
                                >
                                   <div class="absolute top-1 w-3 h-3 rounded-full bg-white transition-all" :style="{ left: newProduct.isMostPopular ? '24px' : '4px' }"></div>
                                </div>
                                <span class="text-[11px] font-black uppercase tracking-widest group-hover:text-orange-600 transition-colors" :class="newProduct.isMostPopular ? 'text-orange-500' : 'text-slate-400'">Most Popular</span>
                             </label>
                          </div>
                          <p class="text-[9px] text-slate-400 font-bold uppercase italic tracking-tight">Enabling these flags promotes the item to targeted high-visibility sections on the main storefront.</p>
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
                            <input v-model="newProduct.mrp" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full pl-10 pr-4 py-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all shadow-sm" />
                         </div>
                      </div>
                      <div class="space-y-2 text-blue-600">
                         <label class="text-[10px] font-black uppercase text-blue-400">Sale Price (₹)</label>
                         <div class="relative">
                            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 font-bold">₹</span>
                            <input v-model="newProduct.salePrice" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full pl-10 pr-4 py-4 bg-blue-50/50 rounded-xl border border-blue-100 focus:border-blue-600 outline-none font-bold text-sm transition-all shadow-sm" />
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
                         <input v-model="newProduct.taxPercent" :disabled="modalMode === 'view'" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all" />
                      </div>
                    </div>

                    <div class="grid grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                      <div class="space-y-2">
                         <label class="text-[10px] font-black uppercase text-orange-400">Discount (%)</label>
                         <input v-model="newProduct.discountPercentage" :disabled="modalMode === 'view'" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" placeholder="0" class="w-full p-4 bg-orange-50/30 rounded-xl border border-transparent focus:border-orange-500 outline-none font-bold text-sm transition-all" />
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

                    <!-- Transaction Features Row -->
                    <div class="pt-8 border-t border-slate-100 space-y-6">
                        <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Transaction Features</h3>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <!-- COD Toggle -->
                           <button 
                              @click="newProduct.codAvailable = !newProduct.codAvailable"
                              class="flex flex-col items-start p-4 rounded-2xl border transition-all text-left group"
                              :class="newProduct.codAvailable ? 'bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500/10' : 'bg-slate-50 border-transparent hover:border-slate-200'"
                           >
                              <div class="flex items-center justify-between w-full mb-2">
                                 <div class="p-2 rounded-lg" :class="newProduct.codAvailable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'">
                                    <DollarSign size="16" />
                                 </div>
                                 <div class="w-8 h-4 rounded-full relative transition-colors duration-300" :class="newProduct.codAvailable ? 'bg-emerald-500' : 'bg-slate-300'">
                                    <div class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300" :class="newProduct.codAvailable ? 'left-4.5' : 'left-0.5'"></div>
                                 </div>
                              </div>
                              <span class="text-[10px] font-black uppercase tracking-wider" :class="newProduct.codAvailable ? 'text-emerald-900' : 'text-slate-700'">Enable COD</span>
                              <p class="text-[9px] font-bold mt-1" :class="newProduct.codAvailable ? 'text-emerald-600' : 'text-slate-400'">Allow Cash on Delivery</p>
                           </button>

                           <!-- Returns Toggle & Days -->
                           <div class="space-y-4">
                              <button 
                                 @click="newProduct.isReturnable = !newProduct.isReturnable"
                                 class="w-full flex flex-col items-start p-4 rounded-2xl border transition-all text-left group"
                                 :class="newProduct.isReturnable ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' : 'bg-slate-50 border-transparent hover:border-slate-200'"
                              >
                                 <div class="flex items-center justify-between w-full mb-2">
                                    <div class="p-2 rounded-lg" :class="newProduct.isReturnable ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'">
                                       <RefreshCw size="16" />
                                    </div>
                                    <div class="w-8 h-4 rounded-full relative transition-colors duration-300" :class="newProduct.isReturnable ? 'bg-blue-500' : 'bg-slate-300'">
                                       <div class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300" :class="newProduct.isReturnable ? 'left-4.5' : 'left-0.5'"></div>
                                    </div>
                                 </div>
                                 <span class="text-[10px] font-black uppercase tracking-wider" :class="newProduct.isReturnable ? 'text-blue-900' : 'text-slate-700'">Allow Returns</span>
                                 <p class="text-[9px] font-bold mt-1" :class="newProduct.isReturnable ? 'text-blue-600' : 'text-slate-400'">Orders can be returned</p>
                              </button>

                              <!-- Return Days Input (Visible only if returnable) -->
                              <Transition
                                 enter-active-class="transform transition ease-out duration-300"
                                 enter-from-class="-translate-y-2 opacity-0"
                                 enter-to-class="translate-y-0 opacity-100"
                              >
                                 <div v-if="newProduct.isReturnable" class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-2">
                                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                       Return window (Days)
                                    </label>
                                    <div class="relative">
                                       <input 
                                          v-model="newProduct.returnDays" 
                                          type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()"
                                          class="w-full p-3 bg-slate-50 rounded-xl border border-transparent focus:border-blue-500 outline-none font-black text-sm transition-all"
                                          placeholder="7"
                                       />
                                       <span class="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Days</span>
                                    </div>
                                 </div>
                              </Transition>
                           </div>

                           <!-- COD Coupon Toggle -->
                           <button 
                              v-if="newProduct.codAvailable"
                              @click="newProduct.codCouponApplicable = !newProduct.codCouponApplicable"
                              class="flex flex-col items-start p-4 rounded-2xl border transition-all text-left group animate-in slide-in-from-top-2 duration-300"
                              :class="newProduct.codCouponApplicable ? 'bg-purple-50 border-purple-200 ring-2 ring-purple-500/10' : 'bg-slate-50 border-transparent hover:border-slate-200'"
                           >
                              <div class="flex items-center justify-between w-full mb-2">
                                 <div class="p-2 rounded-lg" :class="newProduct.codCouponApplicable ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'">
                                    <Tag size="16" />
                                 </div>
                                 <div class="w-8 h-4 rounded-full relative transition-colors duration-300" :class="newProduct.codCouponApplicable ? 'bg-purple-500' : 'bg-slate-300'">
                                    <div class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300" :class="newProduct.codCouponApplicable ? 'left-4.5' : 'left-0.5'"></div>
                                 </div>
                              </div>
                              <span class="text-[10px] font-black uppercase tracking-wider" :class="newProduct.codCouponApplicable ? 'text-purple-900' : 'text-slate-700'">COD Coupons</span>
                              <p class="text-[9px] font-bold mt-1" :class="newProduct.codCouponApplicable ? 'text-purple-600' : 'text-slate-400'">Allow coupons for COD</p>
                           </button>
                        </div>
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
                         <input v-model="newProduct.stock" :disabled="modalMode === 'view'" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                      </div>
                      <div class="space-y-2 text-orange-600">
                         <label class="text-[10px] font-black uppercase text-orange-400">Low Stock Threshold</label>
                         <input v-model="newProduct.lowStockAlert" :disabled="modalMode === 'view'" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full p-4 bg-orange-50/50 rounded-xl border border-orange-100 focus:border-orange-600 outline-none font-bold text-sm transition-all disabled:opacity-70" />
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
                                  <input v-model="s.stock" :disabled="modalMode === 'view'" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full p-3 bg-white border border-slate-100 rounded-xl outline-none font-bold text-xs disabled:opacity-70" />
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
                   <div class="flex items-center justify-between mb-2">
                       <div>
                           <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">Media Vault</h3>
                           <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Photography & Promotional Videos</p>
                       </div>
                       <div class="flex items-center gap-3">
                           <button 
                               @click="$refs.bulkFileRef.click()" 
                               :disabled="modalMode === 'view' || isUploadingMedia"
                               class="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50"
                           >
                               <Upload v-if="!isUploadingMedia" size="14"/>
                               <RefreshCw v-else size="14" class="animate-spin" />
                               {{ isUploadingMedia ? 'Uploading...' : 'Bulk Upload Assets' }}
                           </button>
                           <input type="file" ref="bulkFileRef" class="hidden" multiple accept="image/*,video/*" @change="handleProductImageUpload" />
                       </div>
                   </div>

                   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div v-for="(img, idx) in newProduct.images" :key="`${idx}-${img}`" class="aspect-square bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative group overflow-hidden transition-all hover:border-blue-400">
                         <!-- Media Rendering -->
                         <template v-if="img">
                             <video v-if="adminStore.isVideo(img)" :src="adminStore.resolveImageUrl(img)" muted playsinline loop class="w-full h-full object-cover" onmouseenter="this.play()" onmouseleave="this.pause()"></video>
                             <img v-else :src="adminStore.resolveImageUrl(img)" class="w-full h-full object-cover" />
                         </template>
                         <div v-else class="text-center p-4">
                            <ImageIcon size="32" class="text-slate-300 mx-auto" stroke-width="1.5" />
                            <p class="text-[9px] font-black uppercase text-slate-400 mt-2">No Asset Linked</p>
                          </div>

                          <!-- Overlays -->
                          <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4 z-10">
                              <div class="flex items-center gap-3">
                                  <button 
                                      v-if="idx > 0"
                                      @click.stop="moveImage(idx, -1)"
                                      class="p-2.5 bg-white/20 text-white rounded-full hover:bg-white hover:text-black transition-all backdrop-blur-md"
                                      title="Move Left"
                                  >
                                      <ChevronLeft size="18" />
                                  </button>
                                  <button 
                                      @click="$refs[`fileInput_${idx}`][0].click()" 
                                      :disabled="modalMode === 'view'"
                                      class="p-3 bg-white text-black rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-xl"
                                      title="Update Asset"
                                  >
                                      <Camera size="20" />
                                  </button>
                                  <button 
                                      v-if="idx < newProduct.images.length - 1"
                                      @click.stop="moveImage(idx, 1)"
                                      class="p-2.5 bg-white/20 text-white rounded-full hover:bg-white hover:text-black transition-all backdrop-blur-md"
                                      title="Move Right"
                                  >
                                      <ChevronRight size="18" />
                                  </button>
                              </div>
                              <input type="file" :ref="`fileInput_${idx}`" class="hidden" accept="image/*,video/*" @change="(e) => handleProductImageUpload(e, idx)" />
                              <input v-model="newProduct.images[idx]" :disabled="modalMode === 'view'" placeholder="Or Paste URL..." class="mx-4 p-2.5 bg-white/95 backdrop-blur shadow-2xl rounded-xl text-[10px] outline-none border border-slate-100 font-bold w-4/5 text-center transition-all focus:ring-2 focus:ring-blue-500/20" />
                          </div>

                         <!-- Badge / Delete -->
                         <div v-if="idx === 0 && img" class="absolute top-3 left-3 px-2 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest rounded shadow-lg">Primary</div>
                         <button v-if="newProduct.images.length > 1" @click.stop="removeImageField(idx)" :disabled="modalMode === 'view'" class="absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 z-30 shadow-lg">
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
                    
                    <div class="mt-10 pt-10 border-t border-slate-100">
                      <div class="flex items-center justify-between mb-6">
                         <div>
                            <h3 class="text-sm font-black uppercase tracking-widest text-slate-700">About this Item</h3>
                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Add bullet points of features</p>
                         </div>
                         <button @click="newProduct.aboutThisItem.push('')" :disabled="modalMode === 'view'" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 disabled:opacity-70 disabled:cursor-not-allowed">
                            <Plus size="14"/> Add Bullet
                         </button>
                      </div>
                      <div class="space-y-4">
                          <div v-for="(bullet, bIdx) in newProduct.aboutThisItem" :key="'bullet-'+bIdx" class="flex items-center gap-4 group">
                             <div class="w-2 h-2 rounded-full bg-slate-300"></div>
                             <input v-model="newProduct.aboutThisItem[bIdx]" :disabled="modalMode === 'view'" placeholder="e.g. Machine wash cold" class="flex-1 p-4 bg-slate-50 rounded-xl border border-transparent focus:border-black outline-none font-bold text-sm transition-all disabled:opacity-70" />
                             <button v-if="modalMode !== 'view'" @click="newProduct.aboutThisItem.splice(bIdx, 1)" class="p-2 text-slate-200 hover:text-red-500 transition-colors">
                                <X size="18" />
                             </button>
                           </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Immersive eCommerce Preview Layout (View Mode) -->
          <div v-else class="flex-1 overflow-hidden bg-white flex flex-col lg:flex-row">
             <!-- Media Section (Left) -->
             <div class="lg:w-3/5 bg-slate-50 flex flex-col p-6 border-r border-slate-100 overflow-y-auto custom-scrollbar">
                <div class="relative aspect-square rounded-[3rem] overflow-hidden bg-white shadow-2xl shadow-slate-200/50 flex items-center justify-center group border border-slate-100 transition-all duration-500 hover:shadow-blue-900/10">
                   <template v-if="activePreviewImage">
                      <video 
                        v-if="adminStore.isVideo(activePreviewImage)" 
                        :src="adminStore.resolveImageUrl(activePreviewImage)" 
                        controls 
                        autoplay 
                        muted 
                        loop 
                        class="w-full h-full object-cover"
                      ></video>
                      <img 
                        v-else 
                        :src="adminStore.resolveImageUrl(activePreviewImage)" 
                        class="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                      />
                   </template>
                   <div v-else class="flex flex-col items-center gap-4 text-slate-300">
                      <ImageIcon size="80" stroke-width="1" class="opacity-20" />
                      <p class="text-[10px] font-black uppercase tracking-[0.3em] italic opacity-40">Zero Assets Found</p>
                   </div>
                   
                   <!-- Asset Indicator -->
                   <div v-if="newProduct.images && newProduct.images.length > 1" class="absolute bottom-10 right-10 bg-black/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <ImageIcon size="12" />
                      {{ newProduct.images.indexOf(activePreviewImage) + 1 }} / {{ newProduct.images.length }}
                   </div>
                </div>

                <!-- Thumbnails Carousel -->
                <div v-if="newProduct.images && newProduct.images.length > 1" class="flex flex-wrap items-center gap-4 mt-8 px-2">
                   <button 
                     v-for="(img, idx) in newProduct.images" 
                     :key="idx"
                     @click="activePreviewImage = img"
                     class="group relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all duration-300 bg-white shadow-md active:scale-95"
                     :class="activePreviewImage === img ? 'border-blue-600 scale-105' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'"
                   >
                      <video v-if="adminStore.isVideo(img)" :src="adminStore.resolveImageUrl(img)" class="w-full h-full object-cover"></video>
                      <img v-else :src="adminStore.resolveImageUrl(img)" class="w-full h-full object-cover" />
                      <div v-if="activePreviewImage === img" class="absolute inset-0 bg-blue-600/10 flex items-center justify-center">
                         <div class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping"></div>
                      </div>
                   </button>
                </div>
             </div>

             <!-- Info Section (Right) -->
             <div class="lg:w-2/5 p-12 flex flex-col h-full bg-white overflow-y-auto custom-scrollbar">
                <div class="flex-1">
                   <!-- Breadcrumb & Brand -->
                   <div class="flex items-center gap-3 mb-4">
                      <span class="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">{{ newProduct.brand || 'DYNAMITE PRO' }}</span>
                      <ChevronRight size="12" class="text-slate-300" />
                      <span class="text-[10px] font-black uppercase text-slate-400 tracking-widest">{{ newProduct.category }}</span>
                   </div>

                   <!-- Title & Identity -->
                   <div class="space-y-4 mb-8">
                      <h1 class="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-[1.1]">{{ newProduct.name }}</h1>
                      <div class="flex flex-wrap items-center gap-4">
                         <div class="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                            <span class="text-[9px] font-black uppercase text-slate-400 font-mono">SKU</span>
                            <span class="text-[11px] font-black text-slate-900 font-mono">{{ newProduct.sku || 'N/A' }}</span>
                         </div>
                         <div 
                           class="px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border italic"
                           :class="{
                              'bg-slate-50 text-slate-400 border-slate-100': !newProduct.status || ['Draft', 'draft'].includes(newProduct.status),
                              'bg-emerald-50 text-emerald-600 border-emerald-100': ['Active', 'active'].includes(newProduct.status),
                              'bg-orange-50 text-orange-600 border-orange-100': ['Under Review', 'under_review'].includes(newProduct.status),
                              'bg-red-50 text-red-600 border-red-100': ['Inactive', 'inactive'].includes(newProduct.status)
                           }"
                         >
                           {{ newProduct.status || 'Draft' }} Phase
                         </div>
                      </div>
                   </div>

                   <!-- Commercial Hub (Price & Stock) -->
                   <div class="grid grid-cols-1 gap-6 mb-10">
                      <div class="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                         <div class="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
                         <p class="text-[10px] font-black uppercase text-white/40 mb-3 tracking-[0.2em] flex items-center gap-2">
                           <DollarSign size="12" /> Commercial Ledger
                         </p>
                         <div class="flex items-baseline gap-4 mb-6">
                            <h4 class="text-5xl font-black italic tracking-tighter">₹{{ Number(newProduct.salePrice || 0).toLocaleString() }}</h4>
                            <span v-if="newProduct.mrp > newProduct.salePrice" class="text-xl font-bold text-white/30 line-through tracking-tighter">₹{{ Number(newProduct.mrp || 0).toLocaleString() }}</span>
                         </div>
                         <div class="flex items-center gap-6 pt-6 border-t border-white/5">
                            <div>
                               <p class="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Global Stock</p>
                               <p class="text-xl font-black">{{ newProduct.stock || 0 }} <span class="text-[10px] text-white/40">Units</span></p>
                            </div>
                            <div class="w-px h-8 bg-white/5"></div>
                            <div>
                               <p class="text-[8px] font-black uppercase text-white/30 tracking-widest mb-1">Taxation</p>
                               <p class="text-xl font-black">{{ newProduct.taxPercent || 0 }}% <span class="text-[10px] text-white/40">GST</span></p>
                            </div>
                         </div>
                      </div>
                   </div>

                   <!-- Narrative / Description -->
                   <div v-if="newProduct.description" class="mb-10">
                      <h3 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <Info size="14"/> The Curation Narrative
                      </h3>
                      <div class="prose prose-slate max-w-none font-medium text-slate-600 leading-relaxed text-sm italic" v-html="newProduct.description"></div>
                   </div>

                   <!-- Variant Architecture -->
                   <div class="space-y-8 mb-10">
                      <div v-for="(v, vIdx) in (newProduct.variants || []).filter(v => v.color)" :key="vIdx" class="space-y-4">
                         <div class="flex items-center justify-between">
                            <h4 class="text-[10px] font-black uppercase tracking-widest text-slate-400">{{ v.color }} Dimensons</h4>
                            <span class="text-[9px] font-bold text-slate-300 uppercase">{{ v.sizes.length }} Variations</span>
                         </div>
                         <div class="flex flex-wrap gap-3">
                            <div v-for="(s, sIdx) in v.sizes" :key="sIdx" class="px-5 py-3 bg-white border border-slate-100 rounded-2xl flex items-center gap-6 shadow-sm group hover:border-blue-600 transition-all cursor-default">
                               <div class="flex flex-col">
                                  <span class="text-[8px] font-black uppercase text-slate-400 leading-none mb-1">Size</span>
                                  <span class="text-[13px] font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase leading-none">{{ s.size || 'N/A' }}</span>
                               </div>
                               <div class="w-px h-6 bg-slate-100"></div>
                               <div class="flex flex-col">
                                  <span class="text-[8px] font-black uppercase text-slate-400 leading-none mb-1">Onhand</span>
                                  <div class="flex items-center gap-2 leading-none">
                                     <div class="w-1.5 h-1.5 rounded-full" :class="s.stock > 0 ? 'bg-emerald-500' : 'bg-red-500'"></div>
                                     <span class="text-[11px] font-bold text-slate-900">{{ s.stock }}</span>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   <!-- Technical Specifications Table -->
                   <div v-if="newProduct.specs && newProduct.specs.length > 0" class="mb-10">
                      <h3 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                         <List size="14" /> Technical Parameters
                      </h3>
                      <div class="border border-slate-100 rounded-3xl overflow-hidden divide-y divide-slate-50">
                         <div v-for="(spec, idx) in newProduct.specs" :key="idx" class="flex items-center p-4 hover:bg-slate-50 transition-colors">
                            <div class="w-1/3 text-[10px] font-black uppercase text-slate-400 tracking-wider">{{ spec.key }}</div>
                            <div class="w-2/3 text-[11px] font-black text-slate-800 italic uppercase">{{ spec.value }}</div>
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Attributes Summary Footer (View Perspective) -->
                <div class="mt-auto pt-10 grid grid-cols-2 gap-4">
                   <div class="p-5 bg-slate-50 rounded-3xl border border-slate-100 transition-all group">
                      <p class="text-[8px] font-black uppercase text-slate-400 mb-1 group-hover:text-blue-600 tracking-widest">Fit Segment</p>
                      <p class="text-xs font-black text-slate-900 uppercase italic">{{ newProduct.fit || 'Regular Segment' }}</p>
                   </div>
                   <div class="p-5 bg-slate-50 rounded-3xl border border-slate-100 transition-all group">
                      <p class="text-[8px] font-black uppercase text-slate-400 mb-1 group-hover:text-blue-600 tracking-widest">Logic Tier</p>
                      <p class="text-xs font-black text-slate-900 uppercase italic">{{ (newProduct.status || 'Draft').toUpperCase() }}</p>
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

    <!-- Global API Loader -->
    <GlobalLoader />
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

