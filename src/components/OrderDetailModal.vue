<script setup>
import { ref, watch } from 'vue'
import { 
  ShoppingCart, Package, Truck, CheckCircle, Clock, 
  X, User, Mail, Phone, MapPin, CreditCard, Download, 
  ExternalLink, Hash, Calendar, Copy, Check, Edit3, Trash2
} from 'lucide-vue-next'
import { useAdminStore } from '../stores/adminStore'
import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()

const props = defineProps({
  show: Boolean,
  order: Object
})

const emit = defineEmits(['close'])

const isGeneratingPdf = ref(false)
const copied = ref(false)
const isUpdating = ref(false)

// Edit States
const editMode = ref({
  address: false,
  status: false,
  tracking: false
})

const editedAddress = ref({
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'INDIA'
})

const editedStatus = ref('')
const editedTracking = ref({
  trackingNumber: '',
  courier: ''
})

// Initialize edit states when order changes
watch(() => props.order, (newOrder) => {
  if (newOrder) {
    editedAddress.value = {
      street: newOrder.address?.street || newOrder.shipping_address?.street || '',
      city: newOrder.address?.city || newOrder.shipping_address?.city || '',
      state: newOrder.address?.state || newOrder.shipping_address?.state || '',
      zip: newOrder.address?.zip || newOrder.shipping_address?.zip || '',
      country: newOrder.address?.country || newOrder.shipping_address?.country || 'INDIA'
    }
    editedStatus.value = newOrder.status || 'Pending'
    editedTracking.value = {
      trackingNumber: newOrder.tracking_number || '',
      courier: newOrder.courier || ''
    }
  }
}, { immediate: true })

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

const updateStatus = async () => {
  isUpdating.value = true
  try {
    await adminStore.updateOrderStatus(props.order.id, editedStatus.value)
    editMode.value.status = false
    adminStore.showNotification('Status Updated', `Order ${props.order.order_number || props.order.id} is now ${editedStatus.value}.`, 'success')
  } catch (err) {
    adminStore.showNotification('Update Failed', 'Operational Failure: Unable to update order status. Please verify connectivity.', 'error')
  } finally {
    isUpdating.value = false
  }
}

const updateTracking = async () => {
  isUpdating.value = true
  try {
    // We'll need a new action in adminStore for this
    await adminStore.updateOrderTracking(props.order.id, editedTracking.value.trackingNumber, editedTracking.value.courier)
    editMode.value.tracking = false
    // Also update local status to Shipped if tracking is added
    props.order.status = 'Shipped'
    adminStore.showNotification('Logistics Updated', 'Tracking information has been successfully committed to the order.', 'success')
  } catch (err) {
    adminStore.showNotification('Logistics Failure', 'Failed to update tracking information. Please check the AWB format.', 'error')
  } finally {
    isUpdating.value = false
  }
}

const cleanPrice = (val) => {
  return String(val || '0').replace(/[^0-9.]/g, '')
}

const downloadInvoice = async (orderId) => {
  if (!props.order) return
  
  try {
    isGeneratingPdf.value = true
    const order = props.order
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // ... (Keep existing PDF generation logic, updated with underscore fields)
    // 1. Header
    doc.setFillColor(0, 0, 0); doc.rect(20, 20, 10, 10, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('D', 24, 27)

    doc.setTextColor(0, 0, 0); doc.setFontSize(20); doc.setFont('helvetica', 'bolditalic')
    doc.text('WEAR DYNAMITE', 35, 28)

    doc.setFontSize(32); doc.setTextColor(240, 240, 240); doc.setFont('helvetica', 'bolditalic')
    doc.text('ORDER INVOICE', 100, 45)

    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(`${order.order_number || order.id}`, 190, 52, { align: 'right' })
    doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text(`${order.date}`, 190, 58, { align: 'right' })

    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.line(20, 65, 190, 65)

    // Addressing
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.text('BILLING TO', 110, 80)
    doc.setTextColor(0, 0, 0); doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic')
    doc.text(`${(order.customer_name || 'Guest').toUpperCase()}`, 110, 87)

    // Items
    let yPos = 130
    const colX = { desc: 20, qty: 105, price: 130, total: 170, end: 195 }
    doc.setFillColor(245, 245, 245); doc.rect(colX.desc, yPos, colX.end - colX.desc, 10, 'F')
    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
    doc.text('DESCRIPTION', colX.desc + 2, yPos + 6)
    doc.text('QTY', colX.qty + 5, yPos + 6, { align: 'center' })
    doc.text('PRICE', colX.price + 10, yPos + 6, { align: 'center' })
    doc.text('TOTAL', colX.total + 10, yPos + 6, { align: 'center' })

    yPos += 10
    const items = order.items || []
    items.forEach(item => {
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.rect(colX.desc, yPos, colX.end - colX.desc, 10)
      doc.text(`${item.product_name || item.name}`, colX.desc + 2, yPos + 6)
      doc.text(`${item.quantity}`, colX.qty + 5, yPos + 6, { align: 'center' })
      doc.text(`${Number(item.price).toFixed(2)}`, colX.price + 18, yPos + 6, { align: 'right' })
      doc.setFont('helvetica', 'bold'); doc.text(`${Number(item.total_price || item.price * item.quantity).toFixed(2)}`, colX.end - 2, yPos + 6, { align: 'right' })
      yPos += 10
    })

    // Totals
    const subtotal = Number(order.subtotal || 0)
    const tax = Number(order.tax_total || 0)
    const shipping = Number(order.shipping_total || 0)
    const discount = Number(order.discount_total || 0)
    const grandTotal = Number(order.total_amount || order.total || 0)

    doc.setFontSize(8); doc.setFont('helvetica', 'normal')
    doc.text('SUBTOTAL', colX.total - 10, yPos + 6)
    doc.text(`${subtotal.toFixed(2)}`, colX.end - 2, yPos + 6, { align: 'right' })
    yPos += 7
    doc.text('TAX', colX.total - 10, yPos + 6)
    doc.text(`${tax.toFixed(2)}`, colX.end - 2, yPos + 6, { align: 'right' })
    yPos += 7
    doc.text('DISCOUNT', colX.total - 10, yPos + 6)
    doc.text(`-${discount.toFixed(2)}`, colX.end - 2, yPos + 6, { align: 'right' })
    yPos += 7
    
    doc.setFont('helvetica', 'bold'); doc.rect(colX.desc, yPos, colX.end - colX.desc, 10)
    doc.text('GRAND TOTAL (INR)', colX.total - 10, yPos + 6.5)
    doc.text(`${grandTotal.toFixed(2)}`, colX.end - 2, yPos + 6.5, { align: 'right' })

    doc.save(`Invoice_${orderId}.pdf`)
  } catch (error) {
    console.error('PDF Generation Error:', error)
  } finally {
    isGeneratingPdf.value = false
  }
}
</script>

<template>
  <div v-if="show && order" class="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-10 lg:p-20 transition-all">
     <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md pointer-events-auto" @click="emit('close')"></div>
     <div class="relative bg-white w-full max-w-7xl h-full rounded-[4px] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-400">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-8 border-b border-slate-100 flex-shrink-0 bg-white/80 backdrop-blur-xl sticky top-0 z-20">
           <div class="flex items-center gap-5">
              <div class="bg-black text-white p-4 rounded-2xl shadow-xl shadow-black/20 transform -rotate-3 hover:rotate-0 transition-transform">
                <ShoppingCart size="28"/>
              </div>
              <div>
                 <div class="flex items-center gap-3 group cursor-pointer" @click="copyToClipboard(order?.order_number || order?.id)">
                    <h2 class="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Order: {{ order?.order_number || order?.id }}</h2>
                    <div class="p-1.5 rounded-lg bg-slate-100 text-slate-400 group-hover:text-black group-hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">
                       <Check v-if="copied" size="14" class="text-emerald-500" />
                       <Copy v-else size="14" />
                    </div>
                 </div>
                 <p class="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-3 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    Summary + Items Performance Optimized Architecture
                 </p>
              </div>
           </div>
           <div class="flex items-center gap-4">
              <button 
                @click="downloadInvoice(order?.order_number || order?.id)"
                :disabled="isGeneratingPdf"
                class="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download v-if="!isGeneratingPdf" size="20" />
                <Clock v-else size="20" class="animate-spin" />
                {{ isGeneratingPdf ? 'Generating...' : 'Download Invoice' }}
              </button>
              <button @click="emit('close')" class="p-4 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-black border border-transparent hover:border-slate-200">
                 <X size="28" />
              </button>
           </div>
        </div>

        <!-- Modal Body -->
        <div class="flex-1 overflow-y-auto p-10 custom-scrollbar bg-slate-50/10">
           <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <!-- Left Column: Manifest & Economics -->
              <div class="lg:col-span-8 space-y-10">
                 
                 <!-- Manifest Grid -->
                 <div class="bg-white rounded-[4px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative">
                       <div class="flex items-center gap-3">
                          <Package size="20" class="text-black" />
                          <h3 class="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Product Manifest Audit</h3>
                       </div>
                       <span class="text-[10px] font-black uppercase text-blue-700 px-5 py-2 bg-blue-50 rounded-full border border-blue-100 shadow-sm">{{ order?.items?.length || 0 }} Items Indexed</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                       <div v-for="item in order?.items" :key="item.SK" class="p-8 flex items-center gap-10 group hover:bg-slate-50/50 transition-all border-l-8 border-transparent hover:border-black">
                          <div class="relative w-24 h-24 shrink-0">
                             <img 
                               :src="adminStore.resolveImageUrl(item.image)" 
                               class="w-full h-full rounded-3xl object-cover bg-slate-100 shadow-xl" 
                             />
                             <div class="absolute -top-3 -right-3 bg-black text-white text-xs font-black px-3 py-1.5 rounded-xl border-4 border-white shadow-2xl">x{{ item.quantity }}</div>
                          </div>
                          <div class="flex-1 min-w-0">
                             <div class="flex items-start justify-between gap-6">
                                <div>
                                   <p class="text-lg font-black text-slate-950 uppercase italic leading-none tracking-tight">{{ item.product_name }}</p>
                                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">UUID: {{ item.SK.split('#')[1] }}</p>
                                </div>
                                <div class="text-right">
                                   <p class="text-2xl font-black text-slate-950 tracking-tighter italic">₹{{ Number(item.price).toLocaleString() }}</p>
                                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">ATTR: {{ item.size }} / {{ item.color }}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <!-- Economics -->
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="bg-white p-10 rounded-[4px] border border-slate-100 shadow-sm space-y-8">
                       <h3 class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em]">Administrative Economics</h3>
                       <div class="space-y-5">
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Raw Subtotal</span>
                             <span class="text-slate-900 italic">₹{{ Number(cleanPrice(order?.subtotal)).toLocaleString() }}</span>
                          </div>
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Statutory Tax</span>
                             <span class="text-slate-900 italic">₹{{ Number(cleanPrice(order?.tax_total)).toLocaleString() }}</span>
                          </div>
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Shipping Ledger</span>
                             <span class="text-slate-900 italic">₹{{ Number(cleanPrice(order?.shipping_total)).toLocaleString() }}</span>
                          </div>
                          <div class="pt-8 mt-4 border-t-4 border-double border-slate-100 flex justify-between items-end">
                             <span class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em]">Grand Settlement</span>
                             <span class="text-4xl font-black text-slate-950 tracking-tighter italic leading-none">₹{{ Number(cleanPrice(order?.total_amount || order?.total)).toLocaleString() }}</span>
                          </div>
                       </div>
                    </div>

                    <div class="bg-white p-10 rounded-[4px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                       <div class="absolute right-0 top-0 p-8 flex flex-col items-end gap-2">
                           <button @click="editMode.status = !editMode.status" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
                              <Edit3 size="18" :class="editMode.status ? 'text-blue-600' : 'text-slate-400'" />
                           </button>
                       </div>
                       <h3 class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em] mb-8">Workflow Status</h3>
                       
                       <div v-if="editMode.status" class="space-y-4">
                          <select v-model="editedStatus" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                             <option value="Pending">Pending</option>
                             <option value="Processing">Processing</option>
                             <option value="Shipped">Shipped</option>
                             <option value="Delivered">Delivered</option>
                             <option value="Cancelled">Cancelled</option>
                          </select>
                          <button @click="updateStatus" :disabled="isUpdating" class="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                             Commit Status Change
                          </button>
                       </div>
                       <div v-else class="flex items-center gap-5">
                           <div class="p-6 bg-slate-900 text-white rounded-3xl shadow-2xl">
                              <CheckCircle v-if="order.status === 'Delivered'" size="32" />
                              <Clock v-else size="32" />
                           </div>
                           <div>
                              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Current Phase</p>
                              <p class="text-2xl font-black uppercase italic text-slate-900 leading-none">{{ order.status }}</p>
                           </div>
                       </div>
                    </div>
                 </div>
              </div>

              <!-- Right Column: Infrastructure & Tracking -->
              <div class="lg:col-span-4 space-y-10">
                 
                 <!-- Customer Info -->
                 <div class="bg-black text-white p-12 rounded-[4px] relative overflow-hidden group">
                    <div class="relative z-10 space-y-8">
                       <h3 class="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">Identity Protocol</h3>
                       <div class="flex items-center gap-6">
                          <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-3xl font-black italic">{{ (order.customer?.name || order.customer_name || 'U').charAt(0) }}</div>
                          <div>
                             <h4 class="text-2xl font-black italic uppercase leading-none">{{ order.customer?.name || order.customer_name || 'Guest' }}</h4>
                             <p class="text-[10px] font-medium text-slate-400 mt-2">Member ID: {{ order.user_id?.slice(-8) }}</p>
                          </div>
                       </div>
                       <div class="space-y-4 pt-6 border-t border-white/10 text-sm font-bold">
                          <div class="flex items-center gap-4 text-slate-400"><Mail size="16"/> {{ order.customer?.email || order.customer_email || 'N/A' }}</div>
                          <div class="flex items-center gap-4 text-slate-400"><Phone size="16"/> {{ order.customer?.phone || order.customer_phone || 'N/A' }}</div>
                          <div class="flex items-center gap-4 text-slate-400"><CreditCard size="16"/> Method: {{ order.payment_method }}</div>
                       </div>
                    </div>
                 </div>

                 <!-- Shipping Manifold -->
                 <div class="bg-white p-12 rounded-[4px] border border-slate-100 shadow-sm space-y-10">
                    <div class="flex items-center justify-between">
                       <div class="flex items-center gap-4">
                          <div class="p-3 bg-black text-white rounded-2xl">
                             <MapPin size="20" />
                          </div>
                          <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-950">Shipping Geometry</h3>
                       </div>
                       <!-- Address editing placeholder - can be implemented similarly to status -->
                    </div>
                    <div class="space-y-4">
                       <p class="text-lg font-black text-slate-950 uppercase italic leading-tight">{{ order.address?.street || 'N/A' }}</p>
                       <p class="text-[12px] font-black text-slate-500 uppercase tracking-widest italic">{{ order.address?.city }}, {{ order.address?.state }}</p>
                       <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest">{{ order.address?.zip }}, INDIA</p>
                    </div>
                 </div>

                 <!-- Logistics Protocol (Tracking) -->
                 <div class="bg-white p-12 rounded-[4px] border border-slate-100 shadow-sm space-y-10">
                    <div class="flex items-center justify-between">
                       <div class="flex items-center gap-4">
                          <div class="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20">
                             <Truck size="20" />
                          </div>
                          <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-950">Logistics Protocol</h3>
                       </div>
                       <button @click="editMode.tracking = !editMode.tracking" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
                          <Edit3 size="18" :class="editMode.tracking ? 'text-blue-600' : 'text-slate-400'" />
                       </button>
                    </div>

                    <div v-if="editMode.tracking" class="space-y-4">
                       <div class="space-y-2">
                          <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">AWB / Airway Bill</label>
                          <input v-model="editedTracking.trackingNumber" placeholder="Enter Tracking ID" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase italic tracking-widest" />
                       </div>
                       <div class="space-y-2">
                          <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Logistics Partner</label>
                          <select v-model="editedTracking.courier" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest">
                             <option value="">Select Courier</option>
                             <option value="BlueDart">BlueDart</option>
                             <option value="Delhivery">Delhivery</option>
                             <option value="Ecom Express">Ecom Express</option>
                          </select>
                       </div>
                       <button @click="updateTracking" :disabled="isUpdating" class="w-full py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">
                          Commit Logistics Data
                       </button>
                    </div>
                    <div v-else class="space-y-6">
                       <div v-if="order.tracking_number" class="space-y-6">
                          <div class="p-6 bg-slate-50 border border-slate-100 rounded-3xl relative">
                             <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest absolute -top-2 left-6 bg-white px-2">Tracking ID</span>
                             <p class="text-xl font-black font-mono text-slate-900 tracking-tighter">{{ order.tracking_number }}</p>
                          </div>
                          <div class="flex items-center justify-between">
                             <div class="flex items-center gap-3">
                                <Package size="16" class="text-blue-600" />
                                <span class="text-[10px] font-black uppercase text-slate-600 tracking-widest">{{ order.courier }}</span>
                             </div>
                             <a :href="'#'" class="text-[9px] font-black text-blue-600 border-b border-blue-600 tracking-widest">TRACE PACKAGE</a>
                          </div>
                       </div>
                       <div v-else class="text-center py-6 border-2 border-dashed border-slate-100 rounded-3xl">
                          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Awaiting Fulfillment</p>
                       </div>
                    </div>
                 </div>

              </div>
           </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-10 border-t border-slate-100 bg-white sticky bottom-0 z-20 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
           <div class="flex items-center gap-5 text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100"><Hash size="16" /></div>
              PERSISTENCE KEY: {{ order.id?.slice(0, 8) }}
           </div>
           <div class="flex items-center gap-6 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] bg-slate-50 px-8 py-4 rounded-3xl border border-slate-200">
              <Calendar size="18" />
              CONFIRMED {{ order.date }}
           </div>
        </div>
     </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.97) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
.animate-in { animation-fill-mode: forwards; }
.fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.zoom-in { animation: zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.italic { font-style: italic !important; }
</style>
