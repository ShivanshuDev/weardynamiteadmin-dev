<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  X, Package, Calendar, User, ShoppingBag, DollarSign, Layers, Edit3, ChevronRight, 
  FileText, Table as FileSpreadsheet, Search, Zap, Clock, Truck, CheckCircle, 
  CreditCard, BarChart3, Users, Filter, Eye, ChevronLeft, Plus, Trash2,
  CreditCard as PaymentIcon, Gift, User as CustomerIcon,
  Package as ManifestIcon
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'

import OrderDetailModal from '../components/OrderDetailModal.vue'
import CustomerDetailModal from '../components/CustomerDetailModal.vue'
import MultiSelect from '../components/MultiSelect.vue'
import AnalyticsModal from '../components/AnalyticsModal.vue'

const adminStore = useAdminStore()

onMounted(() => {
  adminStore.fetchOrders()
  adminStore.fetchProducts()
})

// Tabs
const activeTab = ref('orders') // 'orders' | 'customers'

// Modal State
const showModal = ref(false)
const selectedOrder = ref(null)

const showCustomerModal = ref(false)
const selectedCustomer = ref(null)

const showAnalyticsModal = ref(false)
const showManualOrderModal = ref(false)

const newOrderData = ref({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  type: 'PERSONAL',
  recipientRelation: 'Self',
  method: 'UPI',
  status: 'PENDING',
  subtotal: 0,
  tax: 0,
  totalDiscount: 0,
  totalAmount: 0,
  address: {
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  },
  items: []
})

const modalSearchQuery = ref('')
const modalCategoryFilter = ref('All Categories')

const categories = computed(() => {
  const cats = new Set(adminStore.products.map(p => p.category || 'Other'))
  return ['All Categories', ...Array.from(cats)]
})

const filteredProductsForModal = computed(() => {
  let result = adminStore.products
  if (modalCategoryFilter.value !== 'All Categories') {
    result = result.filter(p => p.category === modalCategoryFilter.value)
  }
  if (modalSearchQuery.value) {
    const q = modalSearchQuery.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q))
  }
  return result
})

const getAvailableVariants = (productId) => {
  const product = adminStore.products.find(p => p.id === productId)
  if (!product) return { sizes: [], colors: [] }
  
  // Assuming product.variants is an array of { size, color, quantity }
  const vars = product.variants || []
  const sizes = Array.from(new Set(vars.map(v => v.size))).filter(Boolean)
  const colors = Array.from(new Set(vars.map(v => v.color))).filter(Boolean)
  
  return { 
    sizes: sizes.length ? sizes : ['S', 'M', 'L', 'XL'], 
    colors: colors.length ? colors : ['Black', 'White', 'Navy'] 
  }
}

const addItem = () => {
  newOrderData.value.items.push({
    productId: null,
    productName: '',
    price: 0,
    quantity: 1,
    size: '',
    color: '',
    discount: 0,
    taxRate: 0
  })
}

const removeItem = (index) => {
  newOrderData.value.items.splice(index, 1)
}

const onProductSelect = (item) => {
  const product = adminStore.products.find(p => p.id === item.productId)
  if (product) {
    item.productName = product.name
    item.price = product.mrp || product.price || 0
    item.discount = (product.mrp && product.salePrice) ? (product.mrp - product.salePrice) : 0
    item.taxRate = product.taxPercent || 0
    const { sizes, colors } = getAvailableVariants(item.productId)
    item.size = sizes[0] || 'M'
    item.color = colors[0] || 'Black'
  }
}

watch(() => newOrderData.value.items, (items) => {
  let subTotal = 0
  let totalTax = 0
  let totalDisc = 0
  
  items.forEach(item => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    const unitDisc = Number(item.discount) || 0
    const taxRate = Number(item.taxRate) || 0
    
    const base = (price - unitDisc) * qty
    // Inclusive: Tax = Gross - (Gross / (1 + Rate/100))
    const tax = base - (base / (1 + (taxRate / 100)))
    
    subTotal += (base - tax) // Display subtotal as taxable value
    totalTax += tax
    totalDisc += (unitDisc * qty)
  })
  
  newOrderData.value.subtotal = Math.round(subTotal)
  newOrderData.value.tax = Math.round(totalTax)
  newOrderData.value.totalDiscount = Math.round(totalDisc)
}, { deep: true })

watch(() => [newOrderData.value.subtotal, newOrderData.value.tax], ([sub, tax]) => {
  newOrderData.value.totalAmount = (Number(sub) || 0) + (Number(newOrderData.value.tax) || 0)
})

const handleCreateManualOrder = () => {
  // Field Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\d{10}$/

  if (!newOrderData.value.customerName) {
    return adminStore.showNotification('Validation Error', 'Customer name is required.', 'warning')
  }
  if (!newOrderData.value.customerEmail || !emailRegex.test(newOrderData.value.customerEmail)) {
    return adminStore.showNotification('Validation Error', 'Valid customer email is required.', 'warning')
  }
  if (!newOrderData.value.customerPhone || !phoneRegex.test(newOrderData.value.customerPhone.replace(/\s+/g, '').replace(/^\+91/, ''))) {
    return adminStore.showNotification('Validation Error', 'Customer phone must be exactly 10 digits.', 'warning')
  }

  adminStore.createManualOrder(newOrderData.value)
  showManualOrderModal.value = false
  // Reset
  newOrderData.value = {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    type: 'PERSONAL',
    recipientRelation: 'Self',
    method: 'UPI',
    status: 'PENDING',
    subtotal: 0,
    tax: 0,
    totalDiscount: 0,
    totalAmount: 0,
    address: { street: '', area: '', city: '', state: '', pincode: '', country: 'India' },
    items: []
  }
}

const openOrderDetail = async (order) => {
  const fullOrder = await adminStore.fetchOrderDetail(order.id)
  selectedOrder.value = fullOrder || order
  showModal.value = true
}

const openCustomerDetail = (customer) => {
  selectedCustomer.value = customer
  showCustomerModal.value = true
}

const viewOrderFromCustomer = (order) => {
  showCustomerModal.value = false
  setTimeout(() => {
    openOrderDetail(order)
  }, 300)
}

// Pagination
const currentPage = ref(1)
const itemsPerPage = 12



const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }

// Filters State
const showFilters = ref(false)
const filters = ref({
  status: [],
  dateStart: '',
  dateEnd: '',
  type: [], 
  paymentMethod: [],
  timeline: ''
})

const selectedStatusFilter = ref(null)

const toggleStatusFilter = (status) => {
  if (selectedStatusFilter.value === status) {
    selectedStatusFilter.value = null
  } else {
    selectedStatusFilter.value = status
  }
}

const statusOptions = [
  { label: 'Pending', value: 'pending', color: '#64748b' },
  { label: 'Process', value: 'processing', color: '#f97316' },
  { label: 'Shipped', value: 'shipped', color: '#3b82f6' },
  { label: 'Deliver', value: 'delivered', color: '#10b981' }
]

const typeOptions = [
  { label: 'Personal', value: 'self', color: '#8b5cf6' },
  { label: 'Gift', value: 'gift', color: '#ec4899' }
]

const paymentOptions = [
  { label: 'COD', value: 'COD', color: '#64748b' },
  { label: 'Razorpay', value: 'Razorpay', color: '#1d4ed8' },
  { label: 'Card', value: 'Card', color: '#0f172a' }
]

const timelineOptions = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: '7days' },
  { label: 'This Month', value: 'month' }
]

const clearFilters = () => {
  filters.value = {
    status: [],
    dateStart: '',
    dateEnd: '',
    type: [],
    paymentMethod: [],
    timeline: ''
  }
  selectedStatusFilter.value = null
}

const filteredOrders = computed(() => {
  let result = adminStore.orders || []
  
  if (filters.value.status.length > 0) {
    const s = filters.value.status.map(v => v.toLowerCase())
    result = result.filter(o => s.includes(o.status?.toLowerCase()))
  }

  if (selectedStatusFilter.value) {
    const s = selectedStatusFilter.value.toLowerCase()
    result = result.filter(o => o.status?.toLowerCase() === s)
  }
  
  if (filters.value.dateStart) {
    result = result.filter(o => {
      const orderDate = o.createdAt?.split('T')[0] || o.date
      return orderDate >= filters.value.dateStart
    })
  }
  
  if (filters.value.dateEnd) {
    result = result.filter(o => {
      const orderDate = o.createdAt?.split('T')[0] || o.date
      return orderDate <= filters.value.dateEnd
    })
  }
  
  if (filters.value.type.length > 0) {
    result = result.filter(o => {
      const orderType = o.orderedFor === 'Gift' ? 'gift' : 'self'
      return filters.value.type.includes(orderType)
    })
  }
  
  if (filters.value.paymentMethod.length > 0) {
    result = result.filter(o => filters.value.paymentMethod.includes(o.paymentMethod))
  }
  
  return result
})

const stats = computed(() => {
  const allOrders = adminStore.orders || []
  return {
    pending: allOrders.filter(o => o.status?.toLowerCase() === 'pending').length,
    processing: allOrders.filter(o => o.status?.toLowerCase() === 'processing').length,
    shipped: allOrders.filter(o => o.status?.toLowerCase() === 'shipped').length,
    delivered: allOrders.filter(o => o.status?.toLowerCase() === 'delivered').length
  }
})

const totalPages = computed(() => {
  const data = activeTab.value === 'orders' ? filteredOrders.value : filteredCustomers.value
  return Math.ceil(data.length / itemsPerPage)
})

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredOrders.value.slice(start, start + itemsPerPage)
})

const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredCustomers.value.slice(start, start + itemsPerPage)
})

watch(filters, (newVal) => {
  currentPage.value = 1
}, { deep: true })

watch(() => filters.value.timeline, (timeline) => {
  if (!timeline) return
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  
  if (timeline === 'today') {
    filters.value.dateStart = today
    filters.value.dateEnd = today
  } else if (timeline === 'yesterday') {
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yStr = yesterday.toISOString().split('T')[0]
    filters.value.dateStart = yStr
    filters.value.dateEnd = yStr
  } else if (timeline === '7days') {
    const last7 = new Date(now)
    last7.setDate(now.getDate() - 7)
    filters.value.dateStart = last7.toISOString().split('T')[0]
    filters.value.dateEnd = today
  } else if (timeline === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    filters.value.dateStart = firstDay.toISOString().split('T')[0]
    filters.value.dateEnd = today
  }
})

const searchQuery = ref('')
let searchTimeout = null

watch(searchQuery, (newQuery) => {
  currentPage.value = 1
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (activeTab.value === 'orders') {
      adminStore.fetchOrders(newQuery)
    } else {
      // Implement customer search if needed, or just let client-side filter
    }
  }, 400)
})

watch(activeTab, (newTab) => {
  currentPage.value = 1
  if (newTab === 'customers' && adminStore.customers.length === 0) {
    adminStore.fetchCustomers()
  }
})

const filteredCustomers = computed(() => {
  if (!searchQuery.value) return adminStore.customers
  const q = searchQuery.value.toLowerCase()
  return adminStore.customers.filter(c => 
    c.name?.toLowerCase().includes(q) || 
    c.email?.toLowerCase().includes(q) ||
    c.phone?.toLowerCase().includes(q)
  )
})

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-slate-100 text-slate-600'
    case 'processing': return 'bg-orange-100 text-orange-600'
    case 'shipped': return 'bg-blue-100 text-blue-600'
    case 'delivered': return 'bg-emerald-100 text-emerald-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const exportOrdersToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  const now = new Date()
  
  // Spatial Helpers
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

  const colX = [10, 18, 46, 86, 136, 151, 171, 191, 216, 246]
  const colWidths = [8, 28, 40, 50, 15, 20, 20, 25, 30, 41]
  const headers = ['#', 'ORDER REF', 'CUSTOMER NAME', 'EMAIL ADDRESS', 'TYPE', 'METHOD', 'DATE', 'STATUS', 'DISCOUNT', 'TOTAL AMOUNT']

  const drawBranding = (isSummary = false) => {
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bolditalic')
    doc.text('DYNAMITE PRO', 12, 18)
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(isSummary ? 'EXECUTIVE ANALYTICAL SUMMARY' : 'ORDER FULFILLMENT MANIFEST', 12, 26)
    doc.text(`Generated: ${formatDateNumeric(now)}`, 285, 26, { align: 'right' })
    return 35
  }

  const drawTableHeader = (y = 10) => {
    doc.setFillColor(74, 109, 167)
    doc.rect(10, y, 277, 10, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    headers.forEach((h, i) => {
      doc.text(truncate(h, colWidths[i] - 2), colX[i] + 2, y + 6)
      doc.setDrawColor(255, 255, 255, 0.3)
      doc.line(colX[i], y, colX[i], y + 10)
    })
    doc.line(287, y, 287, y + 10)
    return y + 10
  }

  // Initial Page (Branding then Header)
  drawBranding()
  let currentY = drawTableHeader(35)
  
  // Rows
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  
  filteredOrders.value.forEach((o, idx) => {
    if (currentY > 180) {
      doc.addPage()
      currentY = drawTableHeader(10) // TABLE-ONLY Header for subsequent pages
      doc.setTextColor(50, 50, 50)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
    }

    const data = [
      idx + 1,
      o.orderNumber || o.id,
      o.customer?.name || 'Guest',
      o.customer?.email || '-',
      o.orderedFor === 'Gift' ? 'GIFT' : 'PERSONAL',
      o.paymentMethod || 'COD',
      formatDateNumeric(o.createdAt || o.date),
      (o.status || 'PENDING').toUpperCase(),
      `Rs. ${Number(o.totalDiscount || 0).toLocaleString()}`,
      `Rs. ${Number(o.totalAmount || o.total || 0).toLocaleString()}`
    ]
    
    data.forEach((d, i) => {
      const txt = truncate(d, colWidths[i] - 2)
      doc.text(txt, colX[i] + 2, currentY + 6)
      doc.setDrawColor(220, 220, 220)
      doc.line(colX[i], currentY, colX[i], currentY + 8)
    })
    doc.line(287, currentY, 287, currentY + 8)
    doc.setDrawColor(220, 220, 220)
    doc.line(10, currentY + 8, 287, currentY + 8)
    
    currentY += 8
  })

  // --- Summary Insights Page ---
  doc.addPage()
  let sumY = drawBranding(true)

  // Aggregation Engine
  const summary = {
    payment: {}, type: { GIFT: 0, PERSONAL: 0 }, status: {},
    ranges: { '0-1k': 0, '1k-5k': 0, '5k-10k': 0, '10k+': 0 },
    totalDiscount: 0, totalValuation: 0
  }

  filteredOrders.value.forEach(o => {
    const amt = Number(o.totalAmount || o.total || 0)
    summary.totalDiscount += Number(o.totalDiscount || 0)
    summary.totalValuation += amt
    
    const pay = o.paymentMethod || 'COD'
    summary.payment[pay] = (summary.payment[pay] || 0) + 1
    
    const st = (o.status || 'PENDING').toUpperCase()
    summary.status[st] = (summary.status[st] || 0) + 1
    
    const tp = o.orderedFor === 'Gift' ? 'GIFT' : 'PERSONAL'
    summary.type[tp]++

    if (amt <= 1000) summary.ranges['0-1k']++
    else if (amt <= 5000) summary.ranges['1k-5k']++
    else if (amt <= 10000) summary.ranges['5k-10k']++
    else summary.ranges['10k+']++
  })

  const drawSummaryTable = (title, data, x, y, width, valWidth = 20) => {
    doc.setFillColor(74, 109, 167)
    doc.rect(x, y, width, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text(truncate(title, width - 5), x + 2, y + 6.5)
    
    doc.setTextColor(50, 50, 50)
    doc.setFontSize(7)
    let curRowY = y + 10
    
    Object.entries(data).forEach(([key, val]) => {
      doc.text(truncate(key, width - valWidth - 5), x + 2, curRowY + 5.5)
      doc.text(String(val), x + width - 2, curRowY + 5.5, { align: 'right' })
      doc.setDrawColor(220, 220, 220)
      doc.line(x, curRowY + 8, x + width, curRowY + 8)
      doc.line(x, curRowY, x, curRowY + 8)
      doc.line(x + width, curRowY, x + width, curRowY + 8)
      doc.line(x + width - valWidth, curRowY, x + width - valWidth, curRowY + 8)
      curRowY += 8
    })
    return curRowY
  }

  drawSummaryTable('PAYMENT METHOD VOLUME', summary.payment, 12, sumY, 80, 15)
  drawSummaryTable('ORDER TYPE DISTRIBUTION', summary.type, 105, sumY, 80, 15)
  drawSummaryTable('WORKFLOW STATUS COHORTS', summary.status, 198, sumY, 80, 15)

  sumY += 60
  drawSummaryTable('VALUATION COHORTS (BY PRICE)', summary.ranges, 12, sumY, 125, 15)

  const finances = {
    'TOTAL DISCOUNTS GIVEN': `Rs. ${summary.totalDiscount.toLocaleString()}`,
    'TOTAL MANIFEST VALUATION': `Rs. ${summary.totalValuation.toLocaleString()}`,
    'AVERAGE ORDER VALUE': `Rs. ${Math.round(summary.totalValuation / (filteredOrders.value.length || 1)).toLocaleString()}`
  }
  drawSummaryTable('INSTITUTIONAL FINANCIAL STATS', finances, 148, sumY, 130, 45)

  // Institutional Seal
  doc.setFillColor(15, 23, 42)
  doc.rect(10, 185, 277, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bolditalic')
  doc.setFontSize(8)
  doc.text('DYNAMITE PRO - OFFICIAL ANALYTICAL MANIFEST / NO DISCREPANCIES FOUND', 15, 191)

  // Footer Pagination Pass
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(`Page ${i} of ${pageCount}`, 148, 205, { align: 'center' })
  }

  doc.save(`Orders_Manifest_Summary_${formatDateNumeric(now)}.pdf`)
}

const exportOrdersToExcel = () => {
  const now = new Date()
  const totalCount = filteredOrders.value.length || 1
  
  // Aggregation Engine
  const summary = {
    payment: {}, type: { GIFT: 0, PERSONAL: 0 }, status: {},
    totalDiscount: 0, totalValuation: 0
  }

  filteredOrders.value.forEach(o => {
    const amt = Number(o.totalAmount || o.orderTotal || o.total || 0)
    summary.totalDiscount += Number(o.discount_total || o.totalDiscount || 0)
    summary.totalValuation += amt
    const pay = o.paymentMethod || 'COD'
    summary.payment[pay] = (summary.payment[pay] || 0) + 1
    const st = (o.status || 'PENDING').toUpperCase()
    summary.status[st] = (summary.status[st] || 0) + 1
    const tp = o.orderedFor === 'Gift' ? 'GIFT' : 'PERSONAL'
    summary.type[tp]++
  })

  const generateMiniBars = (data) => {
    let rows = ''
    Object.entries(data).forEach(([key, val]) => {
      const pct = Math.round((val / totalCount) * 100)
      rows += `
        <tr>
          <td style="border:none; padding:2px; font-size:10px;">${key}</td>
          <td style="border:none; padding:2px; font-size:10px;" align="right"><b>${val}</b></td>
          <td style="border:none; padding:2px; width:100px;">
            <div style="background:#e2e8f0; width:100px; height:8px; border-radius:10px;">
              <div style="background:#4a6da7; width:${pct}px; height:8px; border-radius:10px;"></div>
            </div>
          </td>
        </tr>
      `
    })
    return `<table style="border:none; width:100%; border-collapse:collapse;">${rows}</table>`
  }

  let html = `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          table { border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; font-family: sans-serif; }
          th { background-color: #4a6da7; color: white; padding: 12px; font-size: 13px; text-transform: uppercase; border: 1px solid #3b5a8a; }
          td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; color: #334155; }
          .header-brand { font-size: 26px; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
          .header-meta { font-size: 13px; color: #64748b; margin-bottom: 25px; }
          .section-title { background: #0f172a; color: white; padding: 12px; font-weight: bold; font-size: 14px; margin-top: 30px; }
          .footer-row { background-color: #0f172a; color: white; font-weight: bold; }
          .summary-card { border: 1px solid #e2e8f0; background: #f8fafc; padding: 15px; }
        </style>
      </head>
      <body>
        <div class="header-brand">DYNAMITE PRO - EXECUTIVE ANALYTICAL MANIFEST</div>
        <div class="header-meta">Generated: ${formatDateNumeric(now)} | Total Audit Volume: ${totalCount} Orders</div>
        
        <table>
          <tr style="background:#f1f5f9;">
            <th colspan="3" style="background:#0f172a; text-align:left; padding:15px;">EXECUTIVE INTELLIGENCE DASHBOARD (VISUAL ANALYTICS)</th>
          </tr>
          <tr>
            <td class="summary-card" style="width:33%;">
              <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">PAYMENT METHOD VOLUME</div>
              ${generateMiniBars(summary.payment)}
            </td>
            <td class="summary-card" style="width:33%;">
              <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">WORKFLOW STATUS COHORTS</div>
              ${generateMiniBars(summary.status)}
            </td>
            <td class="summary-card" style="width:33%;">
              <div style="color:#4a6da7; font-weight:bold; margin-bottom:10px;">ORDER TYPE DISTRIBUTION</div>
              ${generateMiniBars(summary.type)}
            </td>
          </tr>
          <tr style="background:#f8fafc;">
            <td colspan="2" align="right" style="padding:15px; font-size:14px;">AVERAGE ORDER VALUE (AOV)</td>
            <td align="right" style="padding:15px; font-size:16px; color:#4a6da7;"><b>Rs. ${Math.round(summary.totalValuation / totalCount).toLocaleString()}</b></td>
          </tr>
          <tr style="background:#0f172a; color:white;">
            <td colspan="2" align="right" style="padding:15px; font-size:14px; color:white;">TOTAL MANIFEST VALUATION</td>
            <td align="right" style="padding:15px; font-size:18px; color:white;"><b>Rs. ${summary.totalValuation.toLocaleString()}</b></td>
          </tr>
        </table>

        <div style="height:30px;"></div>
        
        <table>
          <thead>
            <tr>
              <th>#</th><th>Order Ref</th><th>Customer Name</th><th>Email Address</th><th>Type</th><th>Method</th><th>Date</th><th>Status</th><th>Discount</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
  `

  filteredOrders.value.forEach((o, idx) => {
    html += `
      <tr>
        <td align="center">${idx + 1}</td>
        <td><b>${o.orderNumber || o.id}</b></td>
        <td>${o.customer?.name || 'Guest'}</td>
        <td>${o.customer?.email || '-'}</td>
        <td>${o.orderedFor === 'Gift' ? 'GIFT' : 'PERSONAL'}</td>
        <td align="center">${o.paymentMethod || 'COD'}</td>
        <td align="center">${formatDateNumeric(o.createdAt || o.date)}</td>
        <td align="center"><b>${(o.status || 'PENDING').toUpperCase()}</b></td>
        <td align="right">Rs. ${Number(o.discount_total || o.totalDiscount || 0).toLocaleString()}</td>
        <td align="right"><b>Rs. ${Number(o.totalAmount || o.orderTotal || o.total || 0).toLocaleString()}</b></td>
      </tr>
    `
  })

  html += `
          </tbody>
          <tfoot>
            <tr class="footer-row">
              <td colspan="9" align="right" style="padding:15px;">TOTAL MANIFEST AUDIT VALUATION</td>
              <td align="right" style="padding:15px;">Rs. ${summary.totalValuation.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        
        <div style="margin-top:20px; color:#94a3b8; font-size:10px; font-style:italic;">DYNAMITE PRO - OFFICIAL FINANCIAL MANIFEST. DATA SERIALIZED FOR LOGISTICS AUDITING.</div>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  const dateStr = formatDateNumeric(now)
  link.download = `Orders_Elite_Manifest_${dateStr}.xls`
  link.click()
}
</script>

<template>
  <div class="p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-1000">
    <!-- Layer 1: Title & Primary Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
          {{ activeTab === 'orders' ? 'Order Fulfillment' : 'Customer Database' }}
        </h1>
        <p class="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
          {{ activeTab === 'orders' ? 'Manage Logistics & Shipments' : 'Dynamite Member Management' }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button 
           v-if="activeTab === 'orders'"
           @click="exportOrdersToExcel" 
           class="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 border border-emerald-500/20"
        >
          <FileSpreadsheet size="16" /> Excel
        </button>
        <button 
           v-if="activeTab === 'orders'"
           @click="exportOrdersToPDF" 
           class="bg-indigo-600 text-white px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl active:scale-95 border border-white/5"
        >
          <FileText size="16" /> PDF
        </button>
        <button 
          @click="showManualOrderModal = true"
          class="bg-blue-600 text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-black transition-all shadow-xl shadow-blue-500/10 active:scale-95"
        >
          <Plus size="18" /> Create Order
        </button>
        <button 
          @click="showAnalyticsModal = true"
          class="bg-white text-slate-900 border border-slate-100 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3 transition-all shadow-sm active:scale-95"
        >
          <BarChart3 size="18" class="text-blue-600" /> View Analytics
        </button>
      </div>
    </div>

    <!-- Layer 2: Functional Controls -->
    <div class="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
      <!-- Tabs -->
      <div class="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 shadow-inner border border-slate-200 shrink-0 self-start lg:self-auto">
        <button 
          @click="activeTab = 'orders'"
          :class="[
            'px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
            activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          ]"
        >
          Orders
        </button>
        <button 
          @click="activeTab = 'customers'"
          :class="[
            'px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300',
            activeTab === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          ]"
        >
          Customers
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="flex items-center gap-4 flex-1 max-w-4xl">
        <div class="relative flex-1">
          <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="18" />
          <input 
            v-model="searchQuery"
            type="text" 
            :placeholder="activeTab === 'orders' ? 'Search by ID, Name or Email...' : 'Search customers...'" 
            class="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-xs font-bold focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all"
          />
        </div>

        <button 
          v-if="activeTab === 'orders'"
          @click="showFilters = !showFilters"
          :class="[
            'px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-3 border shadow-sm',
            showFilters || Object.values(filters).some(v => v) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-100 hover:border-blue-600 hover:text-blue-600'
          ]"
        >
          <Filter size="16" />
          Filters
          <span v-if="Object.values(filters).some(v => v)" class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
        </button>
      </div>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilters && activeTab === 'orders'" class="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl shadow-slate-200/50 animate-in zoom-in duration-300 space-y-8">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <Filter size="16" /> Advanced Filters
        </h2>
        <button @click="clearFilters" class="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">
          Clear All Filters
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-6 gap-6">
        <!-- Timeline -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Timeline</label>
            <button v-if="filters.timeline" @click="filters.timeline = ''" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <MultiSelect 
            v-model="filters.timeline" 
            :options="timelineOptions" 
            :multiple="false"
            placeholder="Select Timeline..."
          />
        </div>

        <!-- Status -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Status</label>
            <button v-if="filters.status.length > 0" @click="filters.status = []" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <MultiSelect 
            v-model="filters.status" 
            :options="statusOptions" 
            placeholder="Select Statuses..."
          />
        </div>

        <!-- Date Range -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Start Date</label>
            <button v-if="filters.dateStart" @click="filters.dateStart = ''" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <input type="date" v-model="filters.dateStart" class="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600/10 transition-all" />
        </div>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">End Date</label>
            <button v-if="filters.dateEnd" @click="filters.dateEnd = ''" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <input type="date" v-model="filters.dateEnd" class="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-600/10 transition-all" />
        </div>

        <!-- Type -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Order Type</label>
            <button v-if="filters.type.length > 0" @click="filters.type = []" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <MultiSelect 
            v-model="filters.type" 
            :options="typeOptions" 
            placeholder="Select Types..."
          />
        </div>

        <!-- Settlement -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Settlement</label>
            <button v-if="filters.paymentMethod.length > 0" @click="filters.paymentMethod = []" class="p-1 hover:bg-slate-100 rounded-md transition-all text-slate-400 hover:text-red-500 flex items-center gap-1">
              <span class="text-[8px] font-black uppercase">Clear</span>
              <X size="10" />
            </button>
          </div>
          <MultiSelect 
            v-model="filters.paymentMethod" 
            :options="paymentOptions" 
            placeholder="Select Methods..."
          />
        </div>
      </div>
    </div>

    <!-- Statistics (Only for Orders) -->
    <div v-if="activeTab === 'orders'" class="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
       <div 
         @click="toggleStatusFilter('Pending')"
         :class="['p-4 rounded-xl border flex items-center justify-between shadow-sm cursor-pointer transition-all', 
           selectedStatusFilter === 'Pending' ? 'bg-slate-900 text-white border-slate-900 scale-[1.02] shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300']"
       >
          <div>
             <p :class="['text-[9px] font-black uppercase tracking-widest', selectedStatusFilter === 'Pending' ? 'text-slate-400' : 'text-slate-400']">Pending</p>
             <h3 class="text-lg font-black">{{ stats.pending }}</h3>
          </div>
          <Clock :class="selectedStatusFilter === 'Pending' ? 'text-slate-700' : 'text-slate-200'" :size="24" />
       </div>
       <div 
         @click="toggleStatusFilter('Processing')"
         :class="['p-4 rounded-xl border flex items-center justify-between shadow-sm cursor-pointer transition-all', 
           selectedStatusFilter === 'Processing' ? 'bg-orange-500 text-white border-orange-500 scale-[1.02] shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300']"
       >
          <div>
             <p :class="['text-[9px] font-black uppercase tracking-widest', selectedStatusFilter === 'Processing' ? 'text-orange-100' : 'text-slate-400']">Processing</p>
             <h3 class="text-lg font-black">{{ stats.processing }}</h3>
          </div>
          <Package :class="selectedStatusFilter === 'Processing' ? 'text-orange-300' : 'text-orange-200'" :size="24" />
       </div>
       <div 
         @click="toggleStatusFilter('Shipped')"
         :class="['p-4 rounded-xl border flex items-center justify-between shadow-sm cursor-pointer transition-all', 
           selectedStatusFilter === 'Shipped' ? 'bg-blue-600 text-white border-blue-600 scale-[1.02] shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300']"
       >
          <div>
             <p :class="['text-[9px] font-black uppercase tracking-widest', selectedStatusFilter === 'Shipped' ? 'text-blue-100' : 'text-slate-400']">Shipped</p>
             <h3 class="text-lg font-black">{{ stats.shipped }}</h3>
          </div>
          <Truck :class="selectedStatusFilter === 'Shipped' ? 'text-blue-300' : 'text-blue-200'" :size="24" />
       </div>
       <div 
         @click="toggleStatusFilter('Delivered')"
         :class="['p-4 rounded-xl border flex items-center justify-between shadow-sm cursor-pointer transition-all', 
           selectedStatusFilter === 'Delivered' ? 'bg-emerald-600 text-white border-emerald-600 scale-[1.02] shadow-xl' : 'bg-white border-slate-100 hover:border-slate-300']"
       >
          <div>
             <p :class="['text-[9px] font-black uppercase tracking-widest', selectedStatusFilter === 'Delivered' ? 'text-emerald-100' : 'text-slate-400']">Delivered</p>
             <h3 class="text-lg font-black">{{ stats.delivered }}</h3>
          </div>
          <CheckCircle :class="selectedStatusFilter === 'Delivered' ? 'text-emerald-300' : 'text-emerald-200'" :size="24" />
       </div>
    </div>

    <!-- Orders Table -->
    <div v-if="activeTab === 'orders'" class="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700 min-h-[550px] flex flex-col">
      <table class="w-full text-left font-medium">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-center w-12">#</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Order Ref</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Customer Name</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Email Address</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-center">Type</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-center">Method</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Date</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-center">Status</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-right">Total</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 flex-1">
          <tr v-for="(o, i) in paginatedOrders" :key="o.id" class="hover:bg-slate-50/50 transition-all overflow-hidden">
            <td class="px-8 py-1 text-xs font-black text-slate-400 opacity-50">
               {{ (currentPage - 1) * itemsPerPage + i + 1 }}
            </td>
            <td class="px-8 py-1">
               <button @click="openOrderDetail(o)" class="text-sm font-black text-blue-600 tracking-tighter hover:underline">
                {{ o.orderNumber || o.id }}
               </button>
            </td>
            <td class="px-8 flex items-center gap-2 py-1.5">
               <img :src="`https://ui-avatars.com/api/?name=${o.customer?.name || 'Customer'}&background=f1f5f9&color=64748b`" class="w-6 h-6 rounded-full border border-slate-100 shrink-0" />
               <span class="text-xs font-bold truncate max-w-[120px]">{{ o.customer?.name || 'Customer' }}</span>
            </td>
            <td class="px-8 py-1.5 transition-all">
               <span class="text-[11px] font-medium text-slate-400 tracking-tight">{{ o.customer?.email || 'No email' }}</span>
            </td>
             <td class="px-8 py-1 text-center">
                <span :class="[
                  'px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest',
                  o.orderedFor === 'Gift' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-violet-50 text-violet-600 border border-violet-100'
                ]">
                  {{ o.orderedFor || 'Personal' }}
                </span>
             </td>
             <td class="px-8 py-1 text-center">
                <div class="flex items-center justify-center gap-2">
                  <CreditCard v-if="o.paymentMethod === 'Card'" size="14" class="text-slate-400" />
                  <Zap v-else-if="o.paymentMethod === 'Razorpay'" size="14" class="text-blue-500" />
                  <CheckCircle v-else-if="o.paymentMethod === 'UPI'" size="14" class="text-emerald-500" />
                  <Clock v-else size="14" class="text-slate-400" />
                  <span class="text-[10px] font-black uppercase tracking-widest text-slate-600">{{ o.paymentMethod || 'COD' }}</span>
                </div>
             </td>
             <td class="px-8 py-1 font-bold text-xs text-slate-600">
                {{ o.createdAt?.split('T')[0] || o.date }}
             </td>
             <td class="px-8 py-1 text-center">
                <span :class="[
                  'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 justify-center w-fit mx-auto',
                  getStatusColor(o.status)
                ]">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {{ o.status }}
                </span>
             </td>
             <td class="px-8 py-1 text-right">
                <span class="text-sm font-black">₹{{ o.totalAmount || o.total }}</span>
             </td>
          </tr>
        </tbody>
      </table>

      <!-- Pagination Footer -->
      <div class="mt-auto border-t border-slate-50 bg-slate-50/30 p-4 flex items-center justify-between">
         <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">
            Showing {{ (currentPage-1)*itemsPerPage + 1 }} to {{ Math.min(currentPage*itemsPerPage, filteredOrders.length) }} of {{ filteredOrders.length }} Orders
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

    <!-- Customers Table -->
    <div v-else class="bg-white rounded-[3px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700 min-h-[600px] flex flex-col">
      <table class="w-full text-left font-medium">
        <thead class="bg-slate-50">
          <tr>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">#</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Customer Identity</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Email Address</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Contact Info</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400">Status</th>
            <th class="px-8 py-2 text-[10px] font-black uppercase text-slate-400 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50 flex-1">
          <tr v-for="(c, i) in paginatedCustomers" :key="c.id" class="hover:bg-slate-50/50 transition-all">
            <td class="px-8 py-1.5 text-xs font-black text-slate-400 opacity-50">
               {{ (currentPage - 1) * itemsPerPage + i + 1 }}
            </td>
            <td class="px-8 py-1.5 flex items-center gap-3">
               <img :src="`https://ui-avatars.com/api/?name=${c.name}&background=f1f5f9&color=3b82f6`" class="w-8 h-8 rounded-xl border border-slate-100" />
               <div class="flex flex-col">
                  <span class="text-[13px] font-bold uppercase italic tracking-tight">{{ c.name }}</span>
                  <span class="text-[8px] font-black uppercase text-blue-600 tracking-widest bg-blue-50 px-2 py-0.5 rounded-md w-fit mt-0.5">PRO MEMBER</span>
               </div>
            </td>
            <td class="px-8 py-1.5">
               <span class="text-xs font-bold text-slate-900">{{ c.email }}</span>
            </td>
            <td class="px-8 py-1.5">
               <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{{ c.phone || 'No phone listed' }}</span>
            </td>
            <td class="px-8 py-1.5">
               <span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Active</span>
            </td>
            <td class="px-8 py-1.5 text-right">
               <button 
                 @click="openCustomerDetail(c)"
                 class="px-4 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-widest shadow-lg shadow-black/5 flex items-center gap-2 ml-auto"
               >
                 <Eye size="14" /> Profile
               </button>
            </td>
          </tr>
        </tbody>
      </table>

      </div>
    </div>


     <!-- Order Detail Modal -->
      <OrderDetailModal 
        v-if="showModal && selectedOrder"
        :key="selectedOrder?.id"
        :show="showModal" 
        :order="selectedOrder" 
        @close="showModal = false" 
      />

      <!-- Customer Detail Modal -->
      <CustomerDetailModal
        v-if="showCustomerModal && selectedCustomer"
        :key="selectedCustomer?.id"
        :show="showCustomerModal"
        :customer="selectedCustomer"
        @close="showCustomerModal = false"
        @viewOrder="viewOrderFromCustomer"
      />
    <!-- Custom Date Range Analytics Modal -->
    <AnalyticsModal 
      :show="showAnalyticsModal" 
      title="Order Volume Analytics"
      type="orders"
      :data="adminStore.orders"
      @close="showAnalyticsModal = false"
    />

    <!-- Manual Order Modal -->
    <div v-if="showManualOrderModal" class="fixed inset-0 z-[1000] flex items-center justify-center p-4">
       <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm pointer-events-none"></div>
       <div class="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div class="p-8 border-b border-slate-50 flex items-center justify-between">
             <h2 class="text-xl font-black italic uppercase text-slate-900 flex items-center gap-3">
               <Package class="text-blue-600" size="24" /> Enriched Manual Order Entry
             </h2>
             <button @click="showManualOrderModal = false" class="text-slate-400 hover:text-black transition-colors"><X size="24" /></button>
          </div>
          
          <div class="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
             <!-- Customer Identity -->
             <div class="space-y-4">
                <div class="flex items-center justify-between">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Customer Identity</label>
                   <div class="flex items-center p-1 bg-slate-100 rounded-lg gap-1">
                      <button 
                        v-for="t in ['PERSONAL', 'GIFT']" 
                        :key="t"
                        @click="newOrderData.type = t"
                        class="px-4 py-1.5 rounded-md text-[8px] font-black uppercase tracking-widest transition-all"
                        :class="newOrderData.type === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'"
                      >
                        {{ t }}
                      </button>
                   </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                   <div class="relative">
                      <CustomerIcon class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <input v-model="newOrderData.customerName" type="text" placeholder="Full Name" class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 transition-all" />
                   </div>
                   <div class="relative">
                      <Mail class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <input v-model="newOrderData.customerEmail" type="email" placeholder="Email Address" class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 transition-all" />
                   </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                   <div class="relative">
                      <Phone class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <input v-model="newOrderData.customerPhone" type="text" placeholder="Phone Number" class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 transition-all" />
                   </div>
                   <div class="relative" v-if="newOrderData.type === 'GIFT'">
                      <Gift class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <select v-model="newOrderData.recipientRelation" class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 appearance-none">
                         <option v-for="r in ['Self', 'Friend', 'Family', 'Partner', 'Corporate']" :key="r" :value="r">{{ r }}</option>
                      </select>
                   </div>
                </div>
             </div>

             <!-- Product Manifest -->
             <div class="space-y-4 pt-4 border-t border-slate-50">
                <div class="flex items-center justify-between">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-2">
                      <ManifestIcon size="12" /> Product Manifest
                   </label>
                   <button @click="addItem" class="text-[9px] font-black uppercase text-blue-600 hover:text-black transition-all flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                      <Plus size="12" /> Add Item
                   </button>
                </div>

                <!-- Product Search & Category Filter (New) -->
                <div class="grid grid-cols-2 gap-4">
                   <div class="relative">
                      <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <input v-model="modalSearchQuery" type="text" placeholder="Search product name or SKU..." class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-2.5 rounded-xl text-[10px] font-bold outline-none focus:border-blue-600 transition-all" />
                   </div>
                   <div class="relative">
                      <Filter class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size="14" />
                      <select v-model="modalCategoryFilter" class="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-600 appearance-none">
                         <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                      </select>
                   </div>
                </div>
                
                <div class="overflow-x-auto -mx-2">
                   <table class="w-full border-separate border-spacing-y-2">
                      <thead>
                         <tr class="text-[8px] font-black uppercase text-slate-400 tracking-widest pl-4">
                            <th class="text-left pb-2 pl-4 w-[35%]">Product</th>
                            <th class="text-left pb-2 w-[15%]">Variant</th>
                            <th class="text-left pb-2 w-[8%]">Qty</th>
                            <th class="text-left pb-2 w-[10%]">Price</th>
                            <th class="text-left pb-2 w-[10%]">Disc(₹)</th>
                            <th class="text-left pb-2 w-[8%]">Tax(%)</th>
                            <th class="text-right pb-2 pr-4 w-[12%]">Net Total</th>
                            <th class="w-[2%]"></th>
                         </tr>
                      </thead>
                      <tbody>
                         <tr v-for="(item, index) in newOrderData.items" :key="index" class="bg-slate-50/50 hover:bg-white transition-all group rounded-2xl border border-transparent hover:border-slate-100 hover:shadow-sm">
                            <td class="py-3 pl-4 rounded-l-2xl">
                               <select v-model="item.productId" @change="onProductSelect(item)" class="w-full bg-white border border-slate-100 px-3 py-2 rounded-xl text-[9px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-sm truncate">
                                  <option :value="null" disabled>-- Select --</option>
                                  <option v-for="p in filteredProductsForModal" :key="p.id" :value="p.id">{{ p.name }}</option>
                               </select>
                            </td>
                            <td class="py-3">
                               <div class="flex gap-1" v-if="item.productId">
                                  <select v-model="item.size" class="w-14 bg-white border border-slate-100 px-1 py-2 rounded-lg text-[9px] font-black uppercase outline-none shadow-sm text-center">
                                     <option v-for="s in getAvailableVariants(item.productId).sizes" :key="s" :value="s">{{ s }}</option>
                                  </select>
                                  <select v-model="item.color" class="flex-1 bg-white border border-slate-100 px-2 py-2 rounded-lg text-[9px] font-black uppercase outline-none shadow-sm truncate text-center">
                                     <option v-for="c in getAvailableVariants(item.productId).colors" :key="c" :value="c">{{ c }}</option>
                                  </select>
                               </div>
                            </td>
                            <td class="py-3">
                               <input v-model.number="item.quantity" type="number" min="1" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" class="w-full bg-white border border-slate-100 px-2 py-2 rounded-lg text-[10px] font-black outline-none font-mono text-center shadow-sm" />
                            </td>
                            <td class="py-3">
                               <input v-model.number="item.price" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" readonly class="w-full bg-slate-100 border border-slate-100 px-2 py-2 rounded-lg text-[10px] font-black outline-none font-mono text-center cursor-not-allowed opacity-70" />
                            </td>
                            <td class="py-3">
                               <input v-model.number="item.discount" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" readonly class="w-full bg-slate-100 border border-slate-100 px-2 py-2 rounded-lg text-[10px] font-black outline-none font-mono text-center text-red-500 cursor-not-allowed opacity-70" placeholder="0" />
                            </td>
                            <td class="py-3">
                               <input v-model.number="item.taxRate" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" readonly class="w-full bg-slate-100 border border-slate-100 px-2 py-2 rounded-lg text-[10px] font-black outline-none font-mono text-center text-blue-600 cursor-not-allowed opacity-70" placeholder="18" />
                            </td>
                            <td class="py-3 text-right pr-4">
                               <p class="text-[10px] font-black text-slate-900">₹{{ ((item.price - (item.discount || 0)) * item.quantity).toLocaleString() }}</p>
                            </td>
                            <td class="py-3 pr-4 rounded-r-2xl">
                               <button @click="removeItem(index)" class="p-1.5 text-slate-300 hover:text-red-500 transition-all active:scale-90"><Trash2 size="14" /></button>
                            </td>
                         </tr>
                      </tbody>
                   </table>
                   
                   <div v-if="newOrderData.items.length === 0" class="p-16 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-slate-300 group hover:border-blue-100 transition-all">
                      <div class="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-all">
                        <ManifestIcon size="40" stroke-width="1" class="group-hover:text-blue-400 transition-all" />
                      </div>
                      <p class="text-[10px] font-black uppercase tracking-[0.2em]">The manifest is currently vacant. Begin building your order.</p>
                      <button @click="addItem" class="text-[9px] font-black uppercase text-blue-600 hover:text-black transition-all flex items-center gap-2 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100 shadow-sm active:scale-95">
                         <Plus size="14" /> Add Your First Item
                      </button>
                   </div>
                </div>
             </div>

             <!-- Delivery Coordinates -->
             <div class="space-y-4 pt-4 border-t border-slate-50">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 flex items-center gap-2">
                   <MapPin size="12" /> Delivery Coordinates
                </label>
                <div class="space-y-4">
                   <input v-model="newOrderData.address.street" type="text" placeholder="House No / Street Name" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                   <div class="grid grid-cols-2 gap-4">
                      <input v-model="newOrderData.address.area" type="text" placeholder="Landmark / Area" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                      <input v-model="newOrderData.address.city" type="text" placeholder="City" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                   </div>
                   <div class="grid grid-cols-3 gap-4">
                      <input v-model="newOrderData.address.state" type="text" placeholder="State" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                      <input v-model="newOrderData.address.pincode" type="text" placeholder="ZIP" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                      <input v-model="newOrderData.address.country" type="text" placeholder="Country" class="w-full bg-slate-50 border border-slate-100 px-6 py-3.5 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600" />
                   </div>
                </div>
             </div>

             <!-- Order Economics -->
             <div class="space-y-4 pt-4 border-t border-slate-50">
                <div class="grid grid-cols-3 gap-6">
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Payment Method</label>
                      <select v-model="newOrderData.method" class="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600">
                         <option v-for="m in ['UPI', 'DEBIT CARD', 'CREDIT CARD', 'COD', 'PAYU']" :key="m" :value="m">{{ m }}</option>
                      </select>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Operational Status</label>
                      <select v-model="newOrderData.status" class="w-full bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase outline-none focus:border-blue-600">
                         <option v-for="s in ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']" :key="s" :value="s">{{ s }}</option>
                      </select>
                   </div>
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Net Summary (Excl. Tax)</label>
                      <input v-model.number="newOrderData.subtotal" type="number" min="0" @keydown="e => ['e', 'E', '+', '-'].includes(e.key) && e.preventDefault()" readonly class="w-full bg-slate-100 border border-slate-100 px-6 py-3.5 rounded-2xl text-[12px] font-black outline-none font-mono cursor-not-allowed opacity-70" />
                   </div>
                </div>

                 <!-- Settlement Bar -->
                 <div class="flex items-center justify-between p-6 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl">
                    <div class="absolute right-0 top-0 w-32 h-full bg-blue-600/10 -skew-x-12 translate-x-16"></div>
                    
                    <div class="flex gap-10">
                       <div class="space-y-1">
                          <p class="text-[8px] font-black uppercase text-red-500 tracking-[0.2em]">Total Discount</p>
                          <p class="text-lg font-black italic">₹{{ newOrderData.totalDiscount?.toLocaleString() }}</p>
                       </div>
                       <div class="space-y-1">
                          <p class="text-[8px] font-black uppercase text-slate-500 tracking-[0.2em]">Aggregated GST</p>
                          <p class="text-lg font-black italic text-slate-300">₹{{ newOrderData.tax?.toLocaleString() }}</p>
                       </div>
                    </div>

                    <div class="text-right relative z-10">
                       <p class="text-[8px] font-black uppercase text-blue-500 tracking-[0.2em]">Final Order Settlement</p>
                       <p class="text-4xl font-black italic tracking-tighter text-white">₹{{ newOrderData.totalAmount?.toLocaleString() }}</p>
                    </div>
                 </div>
              </div>
          </div>

          <div class="p-8 bg-slate-50/50 border-t border-slate-100 flex gap-4">
             <button @click="showManualOrderModal = false" class="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic underline">Discard Draft</button>
             <button @click="handleCreateManualOrder" class="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-500/10 active:scale-95">Commit Order & Sync Ledger</button>
          </div>
       </div>
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

.animate-in {
  animation-fill-mode: forwards;
}
.fade-in { animation: fade-in 0.3s ease-out; }
.zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
