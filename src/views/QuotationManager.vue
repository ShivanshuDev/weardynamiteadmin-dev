<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import api from '../utils/api'
import { 
  Plus, Search, Filter, Edit2, Trash2, Eye, X, ChevronLeft, ChevronRight, 
  FileText, Check, Zap, RefreshCw, MoreVertical, Calendar, DollarSign, 
  User, Mail, Phone, ArrowUpRight, Printer, Download, CheckCircle2, AlertCircle, FileSpreadsheet
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()

// State
const quotations = ref([])
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = 10
const totalPages = ref(1)
const lastKey = ref(null)
const pageHistory = ref([null]) // For DynamoDB pagination

const searchQuery = ref('')
const statusFilter = ref('All')
const statusTabs = ['All', 'Draft', 'Sent', 'Approved', 'Rejected', 'Expired', 'Converted']

// Modal States
const showFormModal = ref(false)
const showViewModal = ref(false)
const isEditing = ref(false)
const selectedQuotation = ref(null)
const showPdfPreviewModal = ref(false)
const pdfPreviewUrl = ref('')

// Form State
const form = ref({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  companyName: '',
  billingAddress: {
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  },
  shippingAddress: {
    street: '',
    area: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  },
  items: [],
  subtotal: 0,
  discountTotal: 0,
  taxTotal: 0,
  shippingCharges: 0,
  grandTotal: 0,
  paymentTerms: '50% Advance, 50% on Delivery',
  deliveryTimeline: '10-15 business days',
  termsConditions: 'Prices valid for 15 days from issue date.',
  adminNotes: '',
  expiryDate: ''
})

// Methods
const fetchQuotations = async (reset = false) => {
  loading.value = true
  if (reset) {
    pageHistory.value = [null]
    currentPage.value = 1
    lastKey.value = null
  }

  try {
    const params = {
      limit: itemsPerPage,
      lastKey: lastKey.value ? JSON.stringify(lastKey.value) : undefined
    }

    if (statusFilter.value !== 'All') {
      params.status = statusFilter.value
    }

    if (searchQuery.value && searchQuery.value.includes('@')) {
      params.email = searchQuery.value
    }

    const { data } = await api.get('/admin/quotations', { params })
    quotations.value = data.items
    
    // Set up pagination pointers
    if (data.lastKey) {
      if (currentPage.value === pageHistory.value.length) {
        pageHistory.value.push(data.lastKey)
      }
    }
    
    // Total pages calculation (simplified since DynamoDB doesn't return count)
    totalPages.value = data.lastKey ? currentPage.value + 1 : currentPage.value
  } catch (error) {
    console.error('Failed to fetch quotations:', error)
    adminStore.showNotification('Error', 'Failed to retrieve quotations.', 'error')
  } finally {
    loading.value = false
  }
}

const nextPage = () => {
  if (currentPage.value < pageHistory.value.length) {
    lastKey.value = pageHistory.value[currentPage.value]
    currentPage.value++
    fetchQuotations()
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
    lastKey.value = pageHistory.value[currentPage.value - 1]
    fetchQuotations()
  }
}

// Watch filters
watch([statusFilter], () => {
  fetchQuotations(true)
})

watch(searchQuery, (newVal) => {
  if (!newVal || newVal.includes('@') || newVal.length === 0) {
    // Only fetch if empty or matches email pattern to leverage index
    fetchQuotations(true)
  }
})

// Helpers
const formatDate = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

const getStatusClass = (status) => {
  const mapping = {
    Draft: 'bg-slate-100 text-slate-700 border-slate-200',
    Sent: 'bg-blue-50 text-blue-700 border-blue-100',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    Expired: 'bg-amber-50 text-amber-700 border-amber-100',
    Converted: 'bg-purple-50 text-purple-700 border-purple-100'
  }
  return mapping[status] || 'bg-slate-100 text-slate-700'
}

// Form logic
const addRow = () => {
  form.value.items.unshift({
    productId: '',
    productName: '',
    sku: '',
    size: 'M',
    color: 'Standard',
    quantity: 10,
    unitPrice: 0,
    discount: 0,
    taxPercent: 12,
    total: 0,
    customizationDetails: {
      type: 'None',
      location: 'None',
      notes: ''
    }
  })
  recalculateTotals()
}

const removeRow = (index) => {
  form.value.items.splice(index, 1)
  recalculateTotals()
}

const onProductSelect = (index) => {
  const item = form.value.items[index]
  const product = adminStore.products.find(p => p.id === item.productId)
  if (product) {
    item.productName = product.product_name || product.name
    item.sku = product.sku || ''
    item.unitPrice = product.salePrice || product.mrp || 0
    item.taxPercent = product.taxPercent || 12
  }
  recalculateItemTotal(index)
}

const recalculateItemTotal = (index) => {
  const item = form.value.items[index]
  const qty = Number(item.quantity) || 0
  const price = Number(item.unitPrice) || 0
  const disc = Number(item.discount) || 0
  item.total = Math.max(0, (price - disc) * qty)
  recalculateTotals()
}

const recalculateTotals = () => {
  let sub = 0
  let disc = 0
  let tax = 0

  const taxApplicable = form.value.isTaxApplicable !== false
  const taxIncluded = form.value.isTaxIncluded === true

  form.value.items.forEach(item => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPrice) || 0
    const itemDisc = (Number(item.discount) || 0) * qty
    const itemSub = price * qty
    
    sub += itemSub
    disc += itemDisc

    if (taxApplicable) {
      const lineTotal = Math.max(0, itemSub - itemDisc)
      if (taxIncluded) {
        const base = lineTotal / (1 + (Number(item.taxPercent) || 0) / 100)
        tax += (lineTotal - base)
      } else {
        tax += lineTotal * ((Number(item.taxPercent) || 0) / 100)
      }
    }
  })

  form.value.subtotal = sub
  form.value.discountTotal = disc
  form.value.taxTotal = tax

  if (taxApplicable && !taxIncluded) {
    form.value.grandTotal = Math.max(0, sub - disc + tax + (Number(form.value.shippingCharges) || 0))
  } else {
    form.value.grandTotal = Math.max(0, sub - disc + (Number(form.value.shippingCharges) || 0))
  }
}

const copyBillingToShipping = () => {
  form.value.shippingAddress = { ...form.value.billingAddress }
}

const resetForm = () => {
  form.value = {
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    companyName: '',
    billingAddress: { street: '', area: '', city: '', state: '', pincode: '', country: 'India' },
    shippingAddress: { street: '', area: '', city: '', state: '', pincode: '', country: 'India' },
    items: [],
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    shippingCharges: 0,
    grandTotal: 0,
    isTaxApplicable: true,
    isTaxIncluded: false,
    paymentTerms: '50% Advance, 50% on Delivery',
    deliveryTimeline: '10-15 business days',
    termsConditions: 'Prices valid for 15 days from issue date.',
    adminNotes: '',
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }
  addRow()
}

const openCreate = () => {
  isEditing.value = false
  resetForm()
  showFormModal.value = true
}

const openEdit = (quote) => {
  isEditing.value = true
  selectedQuotation.value = quote
  form.value = {
    ...quote,
    isTaxApplicable: quote.isTaxApplicable !== false,
    isTaxIncluded: quote.isTaxIncluded === true,
    expiryDate: new Date(quote.expiryDate).toISOString().split('T')[0]
  }
  showFormModal.value = true
}

const saveQuotation = async (status = 'Draft') => {
  if (!form.value.customerEmail || !form.value.customerName) {
    adminStore.showNotification('Validation Error', 'Customer Name and Email are mandatory.', 'warning')
    return
  }

  if (form.value.items.length === 0) {
    adminStore.showNotification('Validation Error', 'At least one item must be added.', 'warning')
    return
  }

  try {
    loading.value = true
    const payload = {
      ...form.value,
      status,
      expiryDate: new Date(form.value.expiryDate).getTime()
    }

    if (isEditing.value) {
      await api.put(`/admin/quotations/${selectedQuotation.value.quotationId}`, payload)
      adminStore.showNotification('Success', 'Quotation updated successfully.', 'success')
    } else {
      await api.post('/admin/quotations', payload)
      adminStore.showNotification('Success', 'Quotation created successfully.', 'success')
    }

    showFormModal.value = false
    fetchQuotations(true)
  } catch (error) {
    console.error('Failed to save quotation:', error)
    adminStore.showNotification('Error', 'Failed to save quotation.', 'error')
  } finally {
    loading.value = false
  }
}

const updateQuoteStatus = async (quoteId, status) => {
  try {
    loading.value = true
    await api.patch(`/admin/quotations/${quoteId}/status`, { status })
    adminStore.showNotification('Success', `Quotation status updated to ${status}.`, 'success')
    fetchQuotations()
    if (showViewModal.value && selectedQuotation.value?.quotationId === quoteId) {
      selectedQuotation.value.status = status
    }
  } catch (error) {
    console.error('Failed to update status:', error)
    adminStore.showNotification('Error', 'Failed to update status.', 'error')
  } finally {
    loading.value = false
  }
}

const convertQuoteToOrder = async (quoteId) => {
  if (!confirm('Are you sure you want to convert this quotation into a live customer order? This will sync ledger balances.')) return
  try {
    loading.value = true
    const { data } = await api.post(`/admin/quotations/${quoteId}/convert`)
    adminStore.showNotification('Converted to Order', `Successfully created Order #${data.orderId}`, 'success')
    showViewModal.value = false
    fetchQuotations(true)
  } catch (error) {
    console.error('Failed to convert to order:', error)
    adminStore.showNotification('Error', error.response?.data?.message || 'Failed to convert to order.', 'error')
  } finally {
    loading.value = false
  }
}

const sendQuotationEmail = async (quoteId) => {
  try {
    loading.value = true
    const quote = quotations.value.find(q => q.quotationId === quoteId) || selectedQuotation.value
    let payload = {}
    if (quote) {
      const doc = generateQuotationPDF(quote)
      payload.pdfBase64 = doc.output('base64')
    }
    const { data } = await api.post(`/admin/quotations/${quoteId}/send`, payload)
    adminStore.showNotification('Email Dispatched', 'Successfully emailed the proforma quotation estimate to the client.', 'success')
    fetchQuotations()
    if (showViewModal.value && selectedQuotation.value?.quotationId === quoteId && data.quotation) {
      selectedQuotation.value.status = data.quotation.status
      selectedQuotation.value.isEmailed = data.quotation.isEmailed
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    adminStore.showNotification('Error', 'Failed to dispatch email quotation.', 'error')
  } finally {
    loading.value = false
  }
}
// PDF Exporter (jsPDF)
const generateQuotationPDF = (quote) => {
  const doc = new jsPDF()

  // Typography helpers
  const useBold = () => doc.setFont('Helvetica', 'bold')
  const useNormal = () => doc.setFont('Helvetica', 'normal')

  const drawHeader = () => {
    // Header Banner
    doc.setFillColor(255, 255, 255) // White
    doc.rect(0, 0, 210, 28, 'F') // Reduced height from 40 to 28

    // Accent Line under banner
    doc.setFillColor(234, 179, 8) // Gold-500
    doc.rect(0, 28, 210, 1.5, 'F') // Moved from 40 to 28

    // Logo & Title
    doc.setTextColor(15, 23, 42) // Slate-900 (Black)
    useBold()
    doc.setFontSize(22)
    doc.text('WEAR DYNAMITE', 15, 14) // Moved up from 22
    
    useNormal()
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105) // Slate-600
    doc.text('Enterprise Apparel & Custom Printing Studio', 15, 20) // Moved up from 28

    // Document Type Label Right Aligned
    useBold()
    doc.setFontSize(15)
    doc.setTextColor(15, 23, 42) // Slate-900 (Black)
    doc.text('PROFORMA QUOTATION', 195, 16, { align: 'right' }) // Moved up from 24
  }

  const drawQuoteInfo = (yPos) => {
    // Left Card: Quote Info
    doc.setFillColor(248, 250, 252) // slate-50
    doc.rect(15, yPos, 85, 34, 'F')
    doc.setFillColor(37, 99, 235) // primary-600
    doc.rect(15, yPos, 1.5, 34, 'F') // left border stripe
    
    // Left Card Content
    doc.setTextColor(15, 23, 42)
    useBold()
    doc.setFontSize(9)
    doc.text('QUOTATION ESTIMATE', 20, yPos + 6)
    
    useNormal()
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8.5)
    doc.text(`Reference ID:  ${quote.quotationId || 'DRAFT'}`, 20, yPos + 13)
    doc.text(`Date Issued:   ${formatDate(quote.createdAt || Date.now())}`, 20, yPos + 19)
    doc.text(`Valid Until:   ${formatDate(quote.expiryDate || (Date.now() + 15*24*60*60*1000))}`, 20, yPos + 25)
    doc.text(`Issued By:     ${quote.createdBy || 'Admin'}`, 20, yPos + 31)
  }

  const drawClientInfo = (yPos) => {
    // Right Card: Client Info
    doc.setFillColor(248, 250, 252)
    doc.rect(110, yPos, 85, 34, 'F')
    doc.setFillColor(37, 99, 235)
    doc.rect(110, yPos, 1.5, 34, 'F')

    // Right Card Content
    doc.setTextColor(15, 23, 42)
    useBold()
    doc.setFontSize(9)
    doc.text('CLIENT DETAILS', 115, yPos + 6)

    useNormal()
    doc.setTextColor(71, 85, 105)
    doc.setFontSize(8.5)
    doc.text(`Name:    ${quote.customerName}`, 115, yPos + 13)
    doc.text(`Email:   ${quote.customerEmail}`, 115, yPos + 19)
    if (quote.customerPhone) doc.text(`Phone:   ${quote.customerPhone}`, 115, yPos + 25)
    if (quote.companyName) doc.text(`Company: ${quote.companyName}`, 115, yPos + 31)
  }

  const drawTableHeader = (yPos) => {
    doc.setFillColor(30, 41, 59) // Slate-800
    doc.rect(15, yPos, 180, 9, 'F')
    
    useBold()
    doc.setFontSize(8.5)
    doc.setTextColor(255, 255, 255)
    doc.text('S.NO', 18, yPos + 6)
    doc.text('ITEM DESCRIPTION', 28, yPos + 6)
    doc.text('QTY', 115, yPos + 6, { align: 'right' })
    doc.text('RATE (INR)', 142, yPos + 6, { align: 'right' })
    doc.text('GST', 165, yPos + 6, { align: 'right' })
    doc.text('TOTAL (INR)', 192, yPos + 6, { align: 'right' })
  }

  const drawFooter = (pageNumber) => {
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text('This is a formal estimation quote generated digitally by Wear Dynamite Pro CMS.', 105, 282, { align: 'center' })
    doc.text('It does not constitute a legal tax invoice. Subject to stock availability.', 105, 287, { align: 'center' })
    doc.text(`Page ${pageNumber}`, 195, 287, { align: 'right' })
  }

  let y = 40 // Shifted up from 52

  drawHeader()
  drawQuoteInfo(y)
  drawClientInfo(y)

  y += 44

  // --- Address Blocks ---
  useBold()
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text('BILL TO', 15, y)
  doc.text('SHIP TO', 110, y)

  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(15, y + 2, 100, y + 2)
  doc.line(110, y + 2, 195, y + 2)

  useNormal()
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8.5)
  
  const bill = quote.billingAddress || {}
  const ship = quote.shippingAddress || {}
  
  const billLines = [
    bill.street || '',
    bill.area || '',
    `${bill.city || ''}, ${bill.state || ''} - ${bill.pincode || ''}`,
    bill.country || 'India'
  ].filter(Boolean)

  const shipLines = [
    ship.street || '',
    ship.area || '',
    `${ship.city || ''}, ${ship.state || ''} - ${ship.pincode || ''}`,
    ship.country || 'India'
  ].filter(Boolean)

  doc.text(billLines, 15, y + 7)
  doc.text(shipLines, 110, y + 7)

  y += Math.max(billLines.length, shipLines.length) * 5 + 10

  // --- Items Table ---
  drawTableHeader(y)
  y += 9
  doc.setTextColor(51, 65, 85)
  useNormal()

  let pageNum = 1
  let itemsOnCurrentPage = 0

  quote.items.forEach((item, idx) => {
    let maxItems = pageNum === 1 ? 16 : 22

    if (itemsOnCurrentPage >= maxItems) {
      drawFooter(pageNum)
      doc.addPage()
      pageNum++
      itemsOnCurrentPage = 0
      y = 40 // Shifted up from 52
      
      drawHeader()
      drawQuoteInfo(y)
      drawClientInfo(y) // Kept for symmetrical design
      
      y += 44
      drawTableHeader(y)
      y += 9
      doc.setTextColor(51, 65, 85)
      useNormal()
    }

    // Zebra Stripe background
    if (itemsOnCurrentPage % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(15, y, 180, 8.5, 'F')
    }
    
    // Bottom border row line
    doc.setDrawColor(241, 245, 249)
    doc.line(15, y + 8.5, 195, y + 8.5)

    doc.text(String(idx + 1), 18, y + 5.5)
    doc.text(`${item.productName} (${item.color || 'Std'} / ${item.size || 'M'})`, 28, y + 5.5)
    doc.text(String(item.quantity), 115, y + 5.5, { align: 'right' })
    doc.text(Number(item.unitPrice).toFixed(2), 142, y + 5.5, { align: 'right' })
    doc.text(`${item.taxPercent}%`, 165, y + 5.5, { align: 'right' })
    doc.text(Number(item.total).toFixed(2), 192, y + 5.5, { align: 'right' })
    
    y += 8.5
    itemsOnCurrentPage++
  })

  y += 10

  // If there is not enough space for totals block, move to new page
  if (y > 235) {
      drawFooter(pageNum)
      doc.addPage()
      pageNum++
      y = 40 // Shifted up from 52
      drawHeader()
      drawQuoteInfo(y)
      drawClientInfo(y)
      y += 44
  }

  // --- Terms & Totals block ---
  // Left: Business terms
  useBold()
  doc.setFontSize(9)
  doc.setTextColor(15, 23, 42)
  doc.text('Business Specifications:', 15, y)

  useNormal()
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8)
  
  doc.text(`Payment Terms:  ${quote.paymentTerms || '-'}`, 15, y + 6)
  doc.text(`Delivery Time:  ${quote.deliveryTimeline || '-'}`, 15, y + 11)
  if (quote.termsConditions) {
    doc.text(`Conditions:     ${quote.termsConditions}`, 15, y + 16)
  }

  // Right Side: Shaded Totals Callout Box
  const totalsY = y - 2
  doc.setFillColor(248, 250, 252)
  doc.rect(120, totalsY, 75, 36, 'F')
  doc.setFillColor(15, 23, 42)
  doc.rect(120, totalsY, 1.5, 36, 'F')

  useNormal()
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text('Subtotal:', 125, totalsY + 7)
  doc.text('Discount:', 125, totalsY + 13)
  
  let taxLabel = 'Tax (GST Excl):'
  if (quote.isTaxApplicable === false) {
    taxLabel = 'Tax (N/A):'
  } else if (quote.isTaxIncluded === true) {
    taxLabel = 'Tax (GST Incl):'
  }
  doc.text(taxLabel, 125, totalsY + 19)
  doc.text('Shipping:', 125, totalsY + 25)

  // Align total numbers right
  doc.setTextColor(15, 23, 42)
  doc.text(Number(quote.subtotal).toFixed(2), 190, totalsY + 7, { align: 'right' })
  doc.text(`-${Number(quote.discountTotal).toFixed(2)}`, 190, totalsY + 13, { align: 'right' })
  doc.text(Number(quote.taxTotal).toFixed(2), 190, totalsY + 19, { align: 'right' })
  doc.text(Number(quote.shippingCharges).toFixed(2), 190, totalsY + 25, { align: 'right' })

  // Separation Line inside totals card
  doc.setDrawColor(226, 232, 240)
  doc.line(125, totalsY + 28, 190, totalsY + 28)

  // Grand Total Highlight
  useBold()
  doc.setFontSize(10)
  doc.setTextColor(37, 99, 235) // Primary Blue
  doc.text('GRAND TOTAL:', 125, totalsY + 32)
  doc.text(`INR ${Number(quote.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, totalsY + 32, { align: 'right' })

  drawFooter(pageNum)

  return doc
}

const downloadQuotationPDF = (quote) => {
  const doc = generateQuotationPDF(quote)
  doc.save(`Quotation_${quote.quotationId || 'DRAFT'}.pdf`)
}

const previewQuotationPDF = (quote) => {
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value)
  }
  const doc = generateQuotationPDF(quote)
  const blob = doc.output('blob')
  pdfPreviewUrl.value = URL.createObjectURL(blob)
  showPdfPreviewModal.value = true
}

const closePreviewModal = () => {
  showPdfPreviewModal.value = false
  if (pdfPreviewUrl.value) {
    URL.revokeObjectURL(pdfPreviewUrl.value)
    pdfPreviewUrl.value = ''
  }
}

// Link client details from incoming Bulk inquiries
const linkBulkInquiryDetails = (inquiry) => {
  form.value.customerName = inquiry.fullName || inquiry.name || ''
  form.value.customerEmail = inquiry.email || ''
  form.value.customerPhone = inquiry.phone || ''
  form.value.companyName = inquiry.company || ''
  form.value.billingAddress = {
    street: inquiry.address || '',
    area: '',
    city: inquiry.city || '',
    state: inquiry.state || '',
    pincode: inquiry.pincode || '',
    country: 'India'
  }
  copyBillingToShipping()
  adminStore.showNotification('Inquiry Linked', 'Successfully loaded client info from inquiry.', 'info')
}

// Lifecycle
onMounted(() => {
  adminStore.fetchProducts()
  fetchQuotations(true)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header Block -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[1rem] border border-slate-100 shadow-xl shadow-slate-200/30">
      <div class="space-y-1">
        <h1 class="text-3xl font-black italic uppercase text-slate-900 tracking-tight flex items-center gap-3">
          <FileText class="text-blue-600 animate-pulse" size="32" /> Quotations
        </h1>
        <p class="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Bespoke pricing & bulk estimates panel</p>
      </div>

      <button 
        @click="openCreate"
        class="bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/10 hover:shadow-slate-950/20 active:scale-95 flex items-center justify-center gap-2 group self-start md:self-auto"
      >
        <Plus size="16" class="group-hover:rotate-90 transition-transform duration-300" /> Issue Quotation
      </button>
    </div>

    <!-- Filters and Table Card -->
    <div class="bg-white rounded-[1rem] border border-slate-100 shadow-2xl overflow-hidden">
      <!-- Search and Filter Bar -->
      <div class="p-6 border-b border-slate-50 flex flex-col lg:flex-row items-center justify-between gap-6">
        <div class="relative w-full lg:w-96 group">
          <Search class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size="18" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search by client email..." 
            class="w-full bg-slate-50 border border-slate-100 pl-14 pr-6 py-4 rounded-2xl text-[11px] font-bold outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
          />
        </div>

        <!-- Filter tabs -->
        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-2 lg:pb-0">
          <button 
            v-for="tab in statusTabs" 
            :key="tab"
            @click="statusFilter = tab"
            class="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
            :class="statusFilter === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-50 hover:bg-slate-100 text-slate-500'"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <!-- Data Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left divide-y divide-slate-100">
          <thead>
            <tr class="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-wider">
              <th class="px-6 py-3 text-center w-12">S.No.</th>
              <th class="px-6 py-3 text-center">Quote ID</th>
              <th class="px-6 py-3">Client</th>
              <th class="px-6 py-3">Valid Till</th>
              <th class="px-6 py-3 text-right">Grand Total</th>
              <th class="px-6 py-3 text-center">Status</th>
              <th class="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="(quote, index) in quotations" :key="quote.quotationId" class="hover:bg-slate-50/40 transition-colors">
              <td class="px-6 py-3 text-center text-xs font-black text-slate-400 w-12">{{ (currentPage - 1) * itemsPerPage + index + 1 }}</td>
              <td class="px-6 py-3 text-center font-mono font-black text-slate-900 text-xs">{{ quote.quotationId }}</td>
              <td class="px-6 py-3">
                <div class="flex flex-col">
                  <span class="text-xs font-black text-slate-800">{{ quote.customerName }}</span>
                  <span class="text-[10px] font-bold text-slate-400">{{ quote.customerEmail }}</span>
                </div>
              </td>
              <td class="px-6 py-3 text-xs font-bold text-slate-500">{{ formatDate(quote.expiryDate) }}</td>
              <td class="px-6 py-3 text-right font-mono font-black text-xs text-slate-900">₹{{ quote.grandTotal?.toLocaleString() }}</td>
              <td class="px-6 py-3 text-center">
                <div class="flex flex-col items-center justify-center gap-1">
                  <span :class="[getStatusClass(quote.status), 'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border']">
                    {{ quote.status }}
                  </span>
                  <span v-if="quote.isEmailed" class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 scale-90">
                    <Mail size="10" /> Emailed
                  </span>
                </div>
              </td>
              <td class="px-6 py-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <button @click="selectedQuotation = quote; showViewModal = true" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="View details"><Eye size="16" /></button>
                  <button v-if="quote.status === 'Draft'" @click="openEdit(quote)" class="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Edit draft"><Edit2 size="16" /></button>
                  <button @click="previewQuotationPDF(quote)" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Preview PDF"><Printer size="16" /></button>
                  <button @click="downloadQuotationPDF(quote)" class="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Download PDF"><Download size="16" /></button>
                  <button @click="sendQuotationEmail(quote.quotationId)" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Send Email"><Mail size="16" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="quotations.length === 0 && !loading">
              <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                <div class="flex flex-col items-center justify-center gap-2">
                  <AlertCircle size="32" stroke-width="1.5" />
                  <p class="text-[10px] font-black uppercase tracking-widest">No Quotations Found</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div class="p-6 border-t border-slate-100 flex items-center justify-between">
        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Current Cycle: Page {{ currentPage }}</p>
        <div class="flex items-center gap-2">
          <button 
            @click="prevPage" 
            :disabled="currentPage === 1 || loading" 
            class="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size="16" />
          </button>
          <button 
            @click="nextPage" 
            :disabled="quotations.length < itemsPerPage || loading" 
            class="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 disabled:opacity-40 disabled:hover:bg-slate-50 transition-all"
          >
            <ChevronRight size="16" />
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showFormModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="showFormModal = false"></div>
      <div class="relative bg-white w-full max-w-[92vw] lg:max-w-7xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <!-- Modal Header -->
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-black italic uppercase text-slate-900 tracking-tight">{{ isEditing ? 'Edit Quotation Draft' : 'Create Custom Quotation' }}</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Issue customized invoice estimations for bulk purchasers</p>
          </div>
          <button @click="showFormModal = false" class="text-slate-400 hover:text-black p-2 hover:bg-slate-50 rounded-xl transition-all"><X size="24"/></button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <!-- Client details section -->
          <div class="space-y-4">
            <h3 class="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-2">
              <User size="14" /> Client Identification
            </h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Client Full Name *</label>
                <input v-model="form.customerName" type="text" placeholder="John Doe" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Email Coordinates *</label>
                <input v-model="form.customerEmail" type="email" placeholder="john@company.com" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Phone Number</label>
                <input v-model="form.customerPhone" type="text" placeholder="+91 98765 43210" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all" />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Company / Organization</label>
                <input v-model="form.companyName" type="text" placeholder="Acme Corporation" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600 transition-all" />
              </div>
            </div>
          </div>

          <!-- Address Coordinates -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
            <!-- Billing -->
            <div class="space-y-4">
              <h3 class="text-xs font-black uppercase text-slate-600 tracking-wider">Billing Coordinates</h3>
              <div class="space-y-3">
                <input v-model="form.billingAddress.street" type="text" placeholder="Street Address / Building" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                <div class="grid grid-cols-2 gap-3">
                  <input v-model="form.billingAddress.area" type="text" placeholder="Area / Landmark" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.billingAddress.city" type="text" placeholder="City" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <input v-model="form.billingAddress.state" type="text" placeholder="State" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.billingAddress.pincode" type="text" placeholder="ZIP" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.billingAddress.country" type="text" placeholder="Country" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                </div>
              </div>
            </div>

            <!-- Shipping -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-black uppercase text-slate-600 tracking-wider">Shipping Coordinates</h3>
                <button @click="copyBillingToShipping" class="text-[9px] font-black uppercase text-blue-600 tracking-widest hover:underline">Same as Billing</button>
              </div>
              <div class="space-y-3">
                <input v-model="form.shippingAddress.street" type="text" placeholder="Street Address / Building" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                <div class="grid grid-cols-2 gap-3">
                  <input v-model="form.shippingAddress.area" type="text" placeholder="Area / Landmark" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.shippingAddress.city" type="text" placeholder="City" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                </div>
                <div class="grid grid-cols-3 gap-3">
                  <input v-model="form.shippingAddress.state" type="text" placeholder="State" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.shippingAddress.pincode" type="text" placeholder="ZIP" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  <input v-model="form.shippingAddress.country" type="text" placeholder="Country" class="w-full bg-slate-50 border border-slate-100 px-5 py-3 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <!-- Items list config -->
          <div class="space-y-4 pt-6 border-t border-slate-100">
            <div class="flex items-center justify-between">
              <h3 class="text-xs font-black uppercase text-blue-600 tracking-wider">Line Items Configuration</h3>
              <button @click="addRow" class="bg-blue-50 text-blue-600 font-black text-[9px] uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5"><Plus size="12"/> Add Item</button>
            </div>

            <div class="space-y-4">
              <div v-for="(item, idx) in form.items" :key="idx" class="p-5 bg-slate-50 border border-slate-100 rounded-2xl relative space-y-4">
                <button @click="removeRow(idx)" class="absolute right-4 top-4 text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"><Trash2 size="14" /></button>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pr-8">
                  <!-- Product Search Selection -->
                  <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Catalog Product</label>
                    <select v-model="item.productId" @change="onProductSelect(idx)" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600">
                      <option value="">-- Custom (Not in Catalog) --</option>
                      <option v-for="p in adminStore.products" :key="p.id" :value="p.id">{{ p.product_name || p.name }} (₹{{ p.salePrice }})</option>
                    </select>
                  </div>

                  <!-- Custom Name (if product not in catalog) -->
                  <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Item Title / Name</label>
                    <input v-model="item.productName" type="text" placeholder="Custom apparel description" :readonly="!!item.productId" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                  </div>

                  <!-- Specs / Color / Size -->
                  <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Color</label>
                      <input v-model="item.color" type="text" placeholder="Navy" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                    </div>
                    <div class="flex flex-col gap-1">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Size</label>
                      <select v-model="item.size" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600">
                        <option v-for="s in ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Custom']" :key="s" :value="s">{{ s }}</option>
                      </select>
                    </div>
                  </div>

                  <!-- Unit Price / Qty / Discount / Tax -->
                  <div class="grid grid-cols-12 gap-1.5">
                    <div class="flex flex-col gap-1 col-span-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 truncate whitespace-nowrap">Qty</label>
                      <input v-model.number="item.quantity" type="number" min="1" @input="recalculateItemTotal(idx)" class="w-full bg-white border border-slate-200 px-2.5 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                    </div>
                    <div class="flex flex-col gap-1 col-span-3">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 truncate whitespace-nowrap">Rate</label>
                      <input v-model.number="item.unitPrice" type="number" min="0" @input="recalculateItemTotal(idx)" class="w-full bg-white border border-slate-200 px-2.5 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                    </div>
                    <div class="flex flex-col gap-1 col-span-3">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 truncate whitespace-nowrap" title="Disc (Unit)">Disc (Unit)</label>
                      <input v-model.number="item.discount" type="number" min="0" @input="recalculateItemTotal(idx)" class="w-full bg-white border border-slate-200 px-2.5 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
                    </div>
                    <div class="flex flex-col gap-1 col-span-4">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 truncate whitespace-nowrap">Tax (GST)</label>
                      <select v-model.number="item.taxPercent" @change="recalculateTotals" class="w-full bg-white border border-slate-200 px-2 py-2.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600">
                        <option :value="0">0% (No Tax)</option>
                        <option :value="5">5%</option>
                        <option :value="12">12%</option>
                        <option :value="18">18%</option>
                        <option :value="28">28%</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Customization details inside row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100/60 pr-8">
                  <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Customization Type</label>
                    <select v-model="item.customizationDetails.type" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none">
                      <option value="None">None</option>
                      <option value="Printing">Printing / DTF</option>
                      <option value="Embroidery">Embroidery</option>
                      <option value="Custom Labeling">Custom Labeling</option>
                    </select>
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Position / Placement</label>
                    <input v-model="item.customizationDetails.location" type="text" placeholder="e.g. Left Chest, Back Shoulder" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Customization Notes</label>
                    <input v-model="item.customizationDetails.notes" type="text" placeholder="e.g. White threads only, logo dimensions 3x3" class="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold outline-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Business Terms / Notes -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Payment Settlement Terms</label>
              <textarea v-model="form.paymentTerms" rows="3" class="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-600"></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Delivery Timeframe Coordinate</label>
              <textarea v-model="form.deliveryTimeline" rows="3" class="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-600"></textarea>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Validity Notes & T&C</label>
              <textarea v-model="form.termsConditions" rows="3" class="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold outline-none focus:border-blue-600"></textarea>
            </div>
          </div>

          <!-- Expiry and Admin internal notes -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Expiry Date / Offer Valid Till</label>
              <input v-model="form.expiryDate" type="date" class="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Internal Operations Notes (Admin only)</label>
              <input v-model="form.adminNotes" type="text" placeholder="Confidential negotiations notes" class="w-full bg-slate-50 border border-slate-100 px-5 py-3.5 rounded-xl text-xs font-bold outline-none focus:border-blue-600" />
            </div>
          </div>

          <!-- Quotation Finance calculation board -->
          <div class="pt-6 border-t border-slate-100 space-y-4">
            <div class="flex flex-col md:flex-row items-end md:items-center justify-between gap-6 p-6 bg-slate-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
              <div class="absolute right-0 top-0 w-48 h-full bg-blue-600/15 -skew-x-12 translate-x-24"></div>
              
              <!-- Left settings: Shipping, Tax Toggle, Inclusive/Exclusive Toggle -->
              <div class="flex flex-wrap items-center gap-4 z-10 text-slate-900">
                <div class="flex flex-col gap-1 w-28">
                  <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Shipping (INR)</label>
                  <input v-model.number="form.shippingCharges" type="number" min="0" @input="recalculateTotals" class="bg-white/10 text-white border border-white/10 px-3 py-2 rounded-xl text-xs font-black font-mono outline-none focus:border-blue-500" />
                </div>
                
                <!-- Tax Applicable Toggle -->
                <div class="flex flex-col gap-1">
                  <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">GST Applicable</label>
                  <div class="flex bg-white/10 p-0.5 rounded-xl border border-white/10">
                    <button 
                      @click="form.isTaxApplicable = true; recalculateTotals()" 
                      type="button"
                      class="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      :class="form.isTaxApplicable !== false ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'"
                    >
                      Yes
                    </button>
                    <button 
                      @click="form.isTaxApplicable = false; recalculateTotals()" 
                      type="button"
                      class="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      :class="form.isTaxApplicable === false ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'"
                    >
                      No
                    </button>
                  </div>
                </div>

                <!-- Tax Included/Excluded Toggle -->
                <div v-if="form.isTaxApplicable !== false" class="flex flex-col gap-1">
                  <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Tax Mode</label>
                  <div class="flex bg-white/10 p-0.5 rounded-xl border border-white/10">
                    <button 
                      @click="form.isTaxIncluded = false; recalculateTotals()" 
                      type="button"
                      class="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      :class="form.isTaxIncluded !== true ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'"
                    >
                      Excl.
                    </button>
                    <button 
                      @click="form.isTaxIncluded = true; recalculateTotals()" 
                      type="button"
                      class="px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
                      :class="form.isTaxIncluded === true ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'"
                    >
                      Incl.
                    </button>
                  </div>
                </div>
              </div>

              <!-- Mid summaries -->
              <div class="flex flex-wrap gap-8 z-10">
                <div class="space-y-1">
                  <p class="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Subtotal</p>
                  <p class="text-md font-black italic">₹{{ form.subtotal?.toLocaleString() }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[8px] font-black uppercase text-red-400 tracking-[0.2em]">Total Discount</p>
                  <p class="text-md font-black italic text-red-300">₹{{ form.discountTotal?.toLocaleString() }}</p>
                </div>
                <div class="space-y-1">
                  <p class="text-[8px] font-black uppercase text-slate-400 tracking-[0.2em]">Aggregated GST</p>
                  <p class="text-md font-black italic text-slate-300">₹{{ form.taxTotal?.toLocaleString() }}</p>
                </div>
              </div>

              <!-- Grand Total -->
              <div class="text-right z-10">
                <p class="text-[8px] font-black uppercase text-blue-500 tracking-[0.2em]">Net Settlement Estimate</p>
                <p class="text-3xl font-black italic tracking-tighter text-white">₹{{ form.grandTotal?.toLocaleString() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button @click="showFormModal = false" class="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic underline">Discard Form</button>
          <button @click="saveQuotation('Draft')" class="flex-1 bg-slate-800 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">Save Draft</button>
          <button @click="saveQuotation('Sent')" class="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-500/10 active:scale-95">Save & Mark Sent</button>
        </div>
      </div>
    </div>

    <!-- Details View Modal -->
    <div v-if="showViewModal && selectedQuotation" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="showViewModal = false"></div>
      <div class="relative bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h2 class="text-xl font-black italic uppercase text-slate-900 tracking-tight">Quotation: {{ selectedQuotation.quotationId }}</h2>
              <span :class="[getStatusClass(selectedQuotation.status), 'px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border']">
                {{ selectedQuotation.status }}
              </span>
              <span v-if="selectedQuotation.isEmailed" class="bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                <Mail size="10" /> Emailed
              </span>
            </div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit log, items & pricing values</p>
          </div>
          <button @click="showViewModal = false" class="text-slate-400 hover:text-black p-2 hover:bg-slate-50 rounded-xl transition-all"><X size="24"/></button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <!-- Quick Status Actions -->
          <div class="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-500">Alter Operational State:</span>
            <div class="flex items-center gap-2">
              <button 
                v-if="selectedQuotation.status !== 'Converted' && selectedQuotation.status !== 'Approved'"
                @click="updateQuoteStatus(selectedQuotation.quotationId, 'Approved')"
                class="bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
              >
                Mark Approved
              </button>
              <button 
                v-if="selectedQuotation.status !== 'Converted' && selectedQuotation.status !== 'Rejected'"
                @click="updateQuoteStatus(selectedQuotation.quotationId, 'Rejected')"
                class="bg-rose-50 text-rose-600 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
              >
                Mark Rejected
              </button>
              <button 
                v-if="selectedQuotation.status === 'Approved'"
                @click="convertQuoteToOrder(selectedQuotation.quotationId)"
                class="bg-purple-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center gap-1.5"
              >
                <Zap size="12"/> Convert to Order
              </button>
              <button 
                @click="previewQuotationPDF(selectedQuotation)"
                class="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center gap-1.5"
              >
                <Printer size="12"/> Preview PDF
              </button>
              <button 
                @click="downloadQuotationPDF(selectedQuotation)"
                class="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all flex items-center gap-1.5"
              >
                <Download size="12"/> Download PDF
              </button>
              <button 
                @click="sendQuotationEmail(selectedQuotation.quotationId)"
                class="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-750 transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/10"
              >
                <Mail size="12"/> Email Quote
              </button>
            </div>
          </div>

          <!-- Customer details -->
          <div class="grid grid-cols-2 gap-6">
            <div class="p-5 border border-slate-100 rounded-2xl space-y-2">
              <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Client Coordinates</h4>
              <p class="text-xs font-black text-slate-800">{{ selectedQuotation.customerName }}</p>
              <p class="text-xs font-bold text-slate-500">{{ selectedQuotation.customerEmail }}</p>
              <p class="text-xs font-bold text-slate-500">{{ selectedQuotation.customerPhone || 'No Phone' }}</p>
              <p v-if="selectedQuotation.companyName" class="text-xs font-bold text-slate-500">Company: {{ selectedQuotation.companyName }}</p>
            </div>

            <div class="p-5 border border-slate-100 rounded-2xl space-y-2">
              <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-wider">Timeline details</h4>
              <p class="text-xs font-bold text-slate-500">Issued On: <span class="font-bold text-slate-800">{{ formatDate(selectedQuotation.createdAt) }}</span></p>
              <p class="text-xs font-bold text-slate-500">Expires On: <span class="font-bold text-slate-800">{{ formatDate(selectedQuotation.expiryDate) }}</span></p>
              <p class="text-xs font-bold text-slate-500">Payment: <span class="font-bold text-slate-800">{{ selectedQuotation.paymentTerms }}</span></p>
              <p class="text-xs font-bold text-slate-500">Delivery Estimate: <span class="font-bold text-slate-800">{{ selectedQuotation.deliveryTimeline }}</span></p>
            </div>
          </div>

          <!-- Items Table -->
          <div class="border border-slate-100 rounded-2xl overflow-hidden">
            <table class="w-full text-left divide-y divide-slate-100">
              <thead class="bg-slate-50">
                <tr class="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                  <th class="px-5 py-3">Description</th>
                  <th class="px-5 py-3 text-center">Qty</th>
                  <th class="px-5 py-3 text-right">Unit Price</th>
                  <th class="px-5 py-3 text-center">Tax %</th>
                  <th class="px-5 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                <tr v-for="(item, idx) in selectedQuotation.items" :key="idx">
                  <td class="px-5 py-4">
                    <div class="flex flex-col">
                      <span class="font-bold text-slate-800">{{ item.productName }}</span>
                      <span class="text-[10px] font-bold text-slate-400">Color: {{ item.color }} / Size: {{ item.size }}</span>
                      <span v-if="item.customizationDetails && item.customizationDetails.type !== 'None'" class="text-[9px] font-bold text-blue-600 mt-1">
                        🎨 {{ item.customizationDetails.type }} ({{ item.customizationDetails.location }}): {{ item.customizationDetails.notes }}
                      </span>
                    </div>
                  </td>
                  <td class="px-5 py-4 text-center font-bold text-slate-600">{{ item.quantity }}</td>
                  <td class="px-5 py-4 text-right font-mono font-bold text-slate-600">₹{{ item.unitPrice }}</td>
                  <td class="px-5 py-4 text-center font-mono font-bold text-slate-600">{{ item.taxPercent }}%</td>
                  <td class="px-5 py-4 text-right font-mono font-bold text-slate-800">₹{{ item.total }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Financial breakdown summary -->
          <div class="flex justify-end">
            <div class="w-80 p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 text-xs font-bold text-slate-500">
              <div class="flex justify-between">
                <span>Subtotal:</span>
                <span class="font-mono text-slate-800">₹{{ selectedQuotation.subtotal?.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between text-red-500">
                <span>Discount Total:</span>
                <span class="font-mono">- ₹{{ selectedQuotation.discountTotal?.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span>
                  GST Tax 
                  <span class="text-[9px] font-black uppercase text-slate-400">
                    ({{ selectedQuotation.isTaxApplicable === false ? 'N/A' : (selectedQuotation.isTaxIncluded ? 'Incl.' : 'Excl.') }})
                  </span>:
                </span>
                <span class="font-mono text-slate-800">₹{{ selectedQuotation.taxTotal?.toLocaleString() }}</span>
              </div>
              <div class="flex justify-between">
                <span>Shipping Charges:</span>
                <span class="font-mono text-slate-800">₹{{ selectedQuotation.shippingCharges?.toLocaleString() }}</span>
              </div>
              <div class="border-t border-slate-200/80 pt-3 flex justify-between text-slate-900 font-black text-sm">
                <span>Grand Total:</span>
                <span class="font-mono text-blue-600">₹{{ selectedQuotation.grandTotal?.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button @click="showViewModal = false" class="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-black transition-all">Close</button>
        </div>
      </div>
    </div>

    <!-- PDF Preview Modal -->
    <div v-if="showPdfPreviewModal" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-slate-950/50 backdrop-blur-md" @click="closePreviewModal"></div>
      <div class="relative bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
        <!-- Header -->
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-black italic uppercase text-slate-900 tracking-tight">Quotation PDF Preview</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 font-mono">Quotation ID: {{ selectedQuotation?.quotationId || 'DRAFT' }}</p>
          </div>
          <div class="flex items-center gap-4">
            <button 
              @click="downloadQuotationPDF(selectedQuotation || form)" 
              class="bg-blue-600 text-white px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-950 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/10"
            >
              <Download size="12"/> Download PDF
            </button>
            <button @click="closePreviewModal" class="text-slate-400 hover:text-black p-2 hover:bg-slate-50 rounded-xl transition-all"><X size="24"/></button>
          </div>
        </div>
        <!-- Preview Frame -->
        <div class="flex-1 bg-slate-100 p-4">
          <iframe :src="pdfPreviewUrl" class="w-full h-full rounded-2xl border-0 shadow-inner"></iframe>
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
