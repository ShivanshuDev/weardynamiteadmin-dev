<script setup>
import { ref } from 'vue'
import { 
  ShoppingCart, Package, Truck, CheckCircle, Clock, 
  X, User, Mail, Phone, MapPin, CreditCard, Download, 
  ExternalLink, Hash, Calendar, Copy, Check
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

const copyToClipboard = (text) => {
  if (!text) return
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

const cleanPrice = (val) => {
  return String(val || '').replace(/[^0-9.]/g, '')
}

const getItemSku = (item) => {
  if (!item.sku || String(item.sku).includes('UNDEFINED')) {
    const baseId = item.productId || 'ITM'
    return `WD-${baseId}-${Math.floor(Math.random() * 9000) + 1000}`.toUpperCase()
  }
  return item.sku
}

const downloadInvoice = async (orderId) => {
  if (!props.order) return
  
  try {
    isGeneratingPdf.value = true
    const order = props.order
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    // 1. Header
    doc.setFillColor(0, 0, 0)
    doc.rect(20, 20, 10, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8); doc.setFont('helvetica', 'bold')
    doc.text('D', 24, 27)

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(20); doc.setFont('helvetica', 'bolditalic')
    doc.text('WEAR DYNAMITE', 35, 28)

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    doc.text('OFFICIAL COMMERCIAL INVOICE', 20, 40)

    doc.setFontSize(32); doc.setTextColor(240, 240, 240); doc.setFont('helvetica', 'bolditalic')
    doc.text('INVOICE', 140, 45)

    doc.setTextColor(0, 0, 0); doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text(`${order.orderNumber || order.orderId || order.id}`, 190, 52, { align: 'right' })
    doc.setFontSize(8); doc.setTextColor(150, 150, 150)
    doc.text(`${order.date}`, 190, 58, { align: 'right' })

    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3); doc.line(20, 65, 190, 65)

    // 2. Addresses
    doc.setFontSize(7); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'bold')
    doc.text('ISSUER INFORMATION', 20, 80); doc.text('BILLING TO', 110, 80)

    doc.setTextColor(0, 0, 0); doc.setFontSize(9); doc.setFont('helvetica', 'bolditalic')
    doc.text('WEAR DYNAMITE PVT LTD', 20, 87); doc.text(`${(order.customer?.name || 'Guest').toUpperCase()}`, 110, 87)

    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80)
    doc.text(['Dynamite HQ, Streetwear District', 'Mumbai, Maharashtra - 400001', 'GSTIN: 27AABCU1234D1Z5', 'support@weardynamite.com'], 20, 93)
    doc.text([`${order.address?.street || 'N/A'}`, `${order.address?.city || 'N/A'}, ${order.address?.state || ''}`, `${order.address?.zip || ''}, ${order.address?.country || ''}`, `${order.customer?.phone || 'N/A'}`], 110, 93)

    // 3. Table
    let yPos = 130
    const colX = { desc: 20, sku: 80, qty: 105, price: 120, gst: 150, total: 170, end: 195 }

    doc.setFillColor(245, 245, 245); doc.rect(colX.desc, yPos, colX.end - colX.desc, 10, 'F')
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.2); doc.rect(colX.desc, yPos, colX.end - colX.desc, 10)

    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0)
    doc.text('DESCRIPTION', colX.desc + 2, yPos + 6)
    doc.text('SKU', (colX.sku + colX.qty) / 2, yPos + 6, { align: 'center' })
    doc.text('QTY', (colX.qty + colX.price) / 2, yPos + 6, { align: 'center' })
    doc.text('PRICE', (colX.price + colX.gst) / 2, yPos + 6, { align: 'center' })
    doc.text('GST (18%)', (colX.gst + colX.total) / 2, yPos + 6, { align: 'center' })
    doc.text('TOTAL', (colX.total + colX.end) / 2, yPos + 6, { align: 'center' })

    yPos += 10
    order.items.forEach(item => {
      const rowHeight = 12
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.rect(colX.desc, yPos, colX.end - colX.desc, rowHeight)
      
      let displayName = (item.name || '').toUpperCase()
      if (displayName.length > 35) displayName = displayName.substring(0, 32) + '...'
      doc.setFont('helvetica', 'bolditalic'); doc.text(displayName, colX.desc + 2, yPos + 5)
      doc.setFontSize(6); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal')
      doc.text('PREMIUM FABRIC', colX.desc + 2, yPos + 9)
      
      doc.setFontSize(8); doc.setTextColor(0, 0, 0)
      doc.text(`${getItemSku(item)}`, (colX.sku + colX.qty) / 2, yPos + 7, { align: 'center' })
      doc.text(`${item.quantity}`, (colX.qty + colX.price) / 2, yPos + 7, { align: 'center' })
      
      const priceNum = parseFloat(cleanPrice(item.price))
      const gstNum = priceNum * 0.18; const totalNum = priceNum + gstNum
      doc.text(`${priceNum.toFixed(2)}`, colX.gst - 2, yPos + 7, { align: 'right' })
      doc.text(`${gstNum.toFixed(2)}`, colX.total - 2, yPos + 7, { align: 'right' })
      doc.setFont('helvetica', 'bold'); doc.text(`${totalNum.toFixed(2)}`, colX.end - 2, yPos + 7, { align: 'right' })
      yPos += rowHeight
    })

    const totalRowHeight = 10
    doc.setFont('helvetica', 'bold')
    doc.rect(colX.desc, yPos, colX.end - colX.desc, totalRowHeight); doc.line(colX.total, yPos, colX.total, yPos + totalRowHeight)
    doc.text('SUBTOTAL', colX.total - 2, yPos + 6, { align: 'right' }); doc.text(`${cleanPrice(order.subtotal)}`, colX.end - 2, yPos + 6, { align: 'right' })
    yPos += totalRowHeight

    doc.rect(colX.desc, yPos, colX.end - colX.desc, totalRowHeight); doc.line(colX.total, yPos, colX.total, yPos + totalRowHeight)
    doc.text('TAX (GST 18%)', colX.total - 2, yPos + 6, { align: 'right' }); doc.text(`${cleanPrice(order.tax)}`, colX.end - 2, yPos + 6, { align: 'right' })
    yPos += totalRowHeight

    doc.setFillColor(0, 0, 0); doc.rect(colX.desc, yPos, colX.end - colX.desc, totalRowHeight, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(10)
    doc.text('GRAND TOTAL (INR)', colX.total - 2, yPos + 6.5, { align: 'right' })
    doc.text(`${cleanPrice(order.totalAmount || order.total)}`, colX.end - 2, yPos + 6.5, { align: 'right' })

    yPos += 25
    doc.setTextColor(180, 180, 180); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
    doc.text('TERMS & CONDITIONS', 20, yPos); doc.setFont('helvetica', 'normal')
    doc.text(['THIS IS A COMPUTER GENERATED INVOICE AND DOES NOT REQUIRE A PHYSICAL SIGNATURE.', 'ALL DISPUTES ARE SUBJECT TO MUMBAI JURISDICTION.', 'GOODS ONCE SOLD CANNOT BE RETURNED AFTER 7 DAYS.'], 20, yPos + 4)
    doc.setFont('helvetica', 'bolditalic'); doc.setFontSize(8); doc.setTextColor(0, 0, 0)
    doc.text('AUTHENTICATED DOCUMENT', 195, yPos + 4, { align: 'right' })
    doc.setTextColor(220, 220, 220); doc.setFontSize(6); doc.setFont('helvetica', 'bold')
    doc.text('SECURED BY DYNAMITE LOGISTICS', 195, yPos + 8, { align: 'right' })

    doc.save(`Invoice_${orderId}.pdf`)
  } catch (error) {
    console.error('PDF Generation Error:', error)
    alert('Failed to generate PDF. Please try again.')
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
                 <div class="flex items-center gap-3 group cursor-pointer" @click="copyToClipboard(order?.orderNumber || order?.id)">
                    <h2 class="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Order Details: {{ order?.orderNumber || order?.orderId || order?.id }}</h2>
                    <div class="p-1.5 rounded-lg bg-slate-100 text-slate-400 group-hover:text-black group-hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">
                       <Check v-if="copied" size="14" class="text-emerald-500" />
                       <Copy v-else size="14" />
                    </div>
                 </div>
                 <p class="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mt-3 flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    Commercial Invoice & Fulfillment Specification
                 </p>
              </div>
           </div>
           <div class="flex items-center gap-4">
              <button 
                @click="downloadInvoice(order?.orderNumber || order?.orderId || order?.id)"
                :disabled="isGeneratingPdf"
                class="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl transition-all text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-slate-900/40 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
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
              <!-- Left Manifest Column -->
              <div class="lg:col-span-8 space-y-10">
                 <div class="bg-white rounded-[4px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div class="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative">
                       <div class="flex items-center gap-3">
                          <Package size="20" class="text-black" />
                          <h3 class="text-[11px] font-black uppercase text-slate-900 tracking-[0.2em]">Product Manifest & SKU Audit</h3>
                       </div>
                       <span class="text-[10px] font-black uppercase text-blue-700 px-5 py-2 bg-blue-50 rounded-full border border-blue-100 shadow-sm">{{ order?.items?.length || 0 }} Items Secured</span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-[600px] overflow-y-auto custom-scrollbar">
                       <div v-for="item in order?.items" :key="item.sku" class="p-8 flex items-center gap-10 group hover:bg-slate-50/50 transition-all border-l-8 border-transparent hover:border-black">
                          <div class="relative w-24 h-24 shrink-0">
                             <img 
                               :src="item.image" 
                               class="w-full h-full rounded-3xl object-cover bg-slate-100 shadow-xl cursor-zoom-in transition-transform hover:scale-105" 
                               @click="adminStore.openImagePreview(item.images?.length ? item.images : [item.image], 0)"
                             />
                             <div class="absolute -top-3 -right-3 bg-black text-white text-xs font-black px-3 py-1.5 rounded-xl border-4 border-white shadow-2xl">x{{ item.quantity }}</div>
                          </div>
                          <div class="flex-1 min-w-0">
                             <div class="flex items-start justify-between gap-6">
                                <div>
                                   <p class="text-lg font-black text-slate-950 group-hover:text-blue-600 transition-colors uppercase italic leading-none tracking-tight">{{ item.name }}</p>
                                   <div class="flex items-center gap-3 mt-4">
                                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">AUDIT KEY</span>
                                      <span class="text-xs font-black text-slate-700 font-mono bg-white px-3 py-1 rounded-lg border-2 border-slate-100 uppercase tracking-widest shadow-sm">{{ getItemSku(item) }}</span>
                                   </div>
                                </div>
                                <div class="text-right">
                                   <p class="text-2xl font-black text-slate-950 tracking-tighter italic">₹{{ Number(item.price).toLocaleString() }}</p>
                                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 border-t border-slate-100 pt-1">GRID: {{ item.size }} / {{ item.color }}</p>
                                </div>
                             </div>
                             <div class="flex items-center gap-5 mt-6">
                                <div class="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-100 text-[11px] font-black uppercase tracking-widest text-slate-700 border border-slate-200">
                                   <Clock size="14" /> {{ item.status || 'LOGISTICS_READY' }}
                                </div>
                                <div class="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-blue-600/5 text-blue-700 text-[11px] font-black uppercase tracking-widest border border-blue-200">
                                   <Truck size="14" /> {{ item.deliveryStatus || 'Transit' }}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <!-- Economics & Settlement Grid -->
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div class="bg-white p-10 rounded-[4px] border border-slate-100 shadow-sm space-y-8 relative overflow-hidden">
                       <div class="absolute right-0 top-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] -mr-16 -mt-16 opacity-50"></div>
                       <h3 class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em] relative">Administrative Economics</h3>
                       <div class="space-y-5 relative">
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Raw Subtotal</span>
                             <span class="text-slate-900 italic">₹{{ Number(cleanPrice(order?.subtotal)).toLocaleString() }}</span>
                          </div>
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Statutory Tax (18%)</span>
                             <span class="text-slate-900 italic">₹{{ Number(cleanPrice(order?.tax)).toLocaleString() }}</span>
                          </div>
                          <div class="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-widest">
                             <span>Logistic Surcharge</span>
                             <span class="text-emerald-600 font-black">WAIVED</span>
                          </div>
                          <div class="pt-8 mt-4 border-t-4 border-double border-slate-100 flex justify-between items-end">
                             <div class="flex flex-col">
                                <span class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em]">Grand Settlement</span>
                                <span class="text-[10px] font-bold text-slate-400 italic lowercase mt-1">Legally binding valuation</span>
                             </div>
                             <span class="text-4xl font-black text-slate-950 tracking-tighter italic leading-none">₹{{ Number(cleanPrice(order?.totalAmount || order?.total)).toLocaleString() }}</span>
                          </div>
                       </div>
                    </div>

                    <div class="bg-white p-10 rounded-[4px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden">
                       <div class="absolute left-0 bottom-0 w-24 h-24 bg-emerald-50 rounded-tr-[100px] -ml-12 -mb-12 opacity-50"></div>
                       <h3 class="text-[11px] font-black uppercase text-slate-950 tracking-[0.2em] mb-8">Settlement Verified</h3>
                       <div class="flex-1 flex flex-col justify-center gap-10">
                          <div class="flex items-center gap-5 group">
                             <div class="p-4 bg-slate-900 text-white rounded-3xl border border-white/10 shadow-xl transform group-hover:scale-110 transition-transform"><CreditCard size="28" /></div>
                             <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Gateway Protocol</p>
                                <p class="text-lg font-black uppercase italic text-slate-900 leading-none">{{ order?.paymentMethod || 'Razorpay' }}</p>
                             </div>
                          </div>
                          <div class="flex items-center gap-5 group">
                             <div class="p-4 bg-emerald-600 text-white rounded-3xl border border-emerald-500 shadow-xl transform group-hover:scale-110 transition-transform"><CheckCircle size="28" /></div>
                             <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Verification Status</p>
                                <div class="flex items-center gap-3">
                                   <div class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                                   <p class="text-lg font-black uppercase italic text-emerald-600 leading-none">COMMITTED</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              <!-- Right Column -->
              <div class="lg:col-span-4 space-y-10">
                 <!-- Customer Card -->
                 <div class="bg-black text-white p-12 rounded-[4px] shadow-3xl shadow-black/40 relative overflow-hidden group border border-white/5">
                    <div class="absolute -right-20 -bottom-20 opacity-10 rotate-12 transition-transform group-hover:rotate-0 pointer-events-none scale-150">
                       <User size="350" />
                    </div>
                    <div class="relative z-10 space-y-12">
                       <div class="flex items-center justify-between">
                          <h3 class="text-[11px] font-black uppercase text-slate-500 tracking-[0.3em]">Identity Hub</h3>
                          <div class="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
                             <User size="18" class="text-white" />
                          </div>
                       </div>
                       
                       <div class="flex items-center gap-6">
                          <img :src="`https://ui-avatars.com/api/?name=${order?.customer?.name || 'Guest'}&background=ffffff&color=000000&bold=true`" class="w-20 h-20 rounded-3xl border-4 border-white/10 rotate-2 group-hover:rotate-0 transition-transform shadow-2xl" />
                          <div>
                             <h4 class="text-3xl font-black italic uppercase leading-none tracking-tighter">{{ order?.customer?.name || 'Guest' }}</h4>
                             <p class="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase mt-3 px-4 py-1.5 bg-blue-900/40 rounded-full inline-block border border-blue-800/50 shadow-inner">DYNAMITE VIP</p>
                          </div>
                       </div>

                       <div class="space-y-6 pt-10 border-t border-white/10">
                          <div class="flex items-center gap-5 text-slate-300 hover:text-white transition-all cursor-pointer group/item hover:translate-x-1">
                             <div class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-lg group-hover/item:bg-white/10 group-hover/item:text-blue-400 transition-all">
                                <Mail size="16" />
                             </div>
                             <span class="text-sm font-bold tracking-tight">{{ order?.customer?.email || 'N/A' }}</span>
                          </div>
                           <div class="flex items-center gap-5 text-slate-300 hover:text-white transition-all cursor-pointer group/item hover:translate-x-1">
                             <div class="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 shadow-lg group-hover/item:bg-white/10 group-hover/item:text-blue-400 transition-all">
                                <Phone size="16" />
                             </div>
                             <span class="text-sm font-bold tracking-tight">{{ order?.customer?.phone || 'N/A' }}</span>
                           </div>
                        </div>

                        <!-- Recipient Hardening -->
                        <div v-if="order?.orderedFor" class="pt-10 border-t border-white/10 space-y-8">
                           <div class="flex flex-col gap-6">
                              <div class="bg-gradient-to-br from-white/10 to-transparent p-6 rounded-3xl border border-white/10 shadow-inner relative group/sub">
                                 <span class="text-[10px] font-black uppercase text-slate-500 block mb-4 tracking-[0.2em] font-mono leading-none">ORDER INTENTION</span>
                                 <h5 class="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{{ order.orderedFor }}</h5>
                                 <div class="absolute right-6 top-6 text-white/10 group-hover/sub:text-white/20 transition-colors">
                                    <ShoppingCart size="24" />
                                 </div>
                              </div>
                              <div v-if="order.orderedForSomeone && order.orderedForSomeone !== 'N/A'" class="bg-gradient-to-br from-white/10 to-transparent p-6 rounded-3xl border border-white/10 shadow-inner relative group/sub">
                                 <span class="text-[10px] font-black uppercase text-slate-500 block mb-4 tracking-[0.2em] font-mono leading-none">RECIPIENT AFFILIATION</span>
                                 <h5 class="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{{ order.orderedForSomeone }}</h5>
                                 <div class="absolute right-6 top-6 text-white/10 group-hover/sub:text-white/20 transition-colors">
                                     <User size="24" />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                 <!-- Physical Coordinates -->
                 <div class="bg-white p-12 rounded-[4px] border border-slate-100 shadow-sm space-y-10 relative overflow-hidden group/maps">
                    <div class="absolute -right-8 -top-8 opacity-[0.05] rotate-12 pointer-events-none group-hover/maps:scale-110 group-hover/maps:rotate-0 transition-transform duration-700">
                       <MapPin size="150" />
                    </div>
                    <div class="flex items-center gap-4 text-slate-400">
                       <div class="p-3 bg-black text-white rounded-2xl shadow-xl shadow-black/10">
                          <MapPin size="20" />
                       </div>
                       <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-950 leading-none">Shipping Manifold</h3>
                    </div>
                    <div class="space-y-6 relative z-10">
                       <div class="flex items-start gap-4">
                          <div class="w-2 h-2 rounded-full bg-black mt-2.5 shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.3)]"></div>
                          <p class="text-lg font-black text-slate-950 leading-tight uppercase italic tracking-tighter">{{ order?.address?.street || order?.shippingAddress?.street || 'No physical data' }}</p>
                       </div>
                       <div class="pl-6 space-y-3 border-l-2 border-slate-100 py-1">
                          <p class="text-[12px] font-black text-slate-600 uppercase tracking-[0.15em] italic">{{ order?.address?.city || order?.shippingAddress?.city || '' }}, {{ order?.address?.state || order?.shippingAddress?.state || '' }}</p>
                          <div class="flex items-center gap-3">
                             <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest">{{ order?.address?.zip || order?.shippingAddress?.zip || '' }}</p>
                             <div class="w-1 h-1 rounded-full bg-slate-300"></div>
                             <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest">{{ order?.address?.country || order?.shippingAddress?.country || 'INDIA' }}</p>
                          </div>
                       </div>
                    </div>
                    <button class="w-full mt-6 flex items-center justify-center gap-4 py-4.5 bg-slate-950 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.34em] hover:bg-black transition-all transform hover:-translate-y-1 shadow-2xl shadow-black/20 group/btn italic">
                       <ExternalLink size="16" class="group-hover/btn:rotate-12 transition-transform" /> ANALYZE IN MAPS
                    </button>
                 </div>

                 <!-- Fulfillment Timeline -->
                 <div class="bg-white p-12 rounded-[4px] border border-slate-100 shadow-sm space-y-10">
                    <div class="flex items-center gap-4">
                       <div class="p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/20">
                          <Hash size="20" />
                       </div>
                       <h3 class="text-[11px] font-black uppercase tracking-[0.3em] text-slate-950 leading-none">Fulfillment Sequence</h3>
                    </div>
                    <div class="space-y-4 relative">
                       <div class="absolute left-[13px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-blue-600/20 via-slate-100 to-transparent"></div>
                       <div v-for="(event, eIdx) in order?.timeline" :key="eIdx" class="flex gap-8 group/event pb-10 last:pb-0">
                          <div class="relative z-10 flex flex-col items-center pt-1">
                             <div class="w-7 h-7 rounded-full border-4 flex items-center justify-center bg-white shadow-xl transition-all group-hover/event:scale-125" 
                                  :class="eIdx === 0 ? 'border-blue-600 shadow-blue-500/20' : 'border-slate-100 shadow-black/5'">
                                <div class="w-2.5 h-2.5 rounded-full" :class="eIdx === 0 ? 'bg-blue-600 animate-pulse' : 'bg-slate-200'"></div>
                             </div>
                          </div>
                          <div class="pt-1">
                             <div class="flex items-center gap-4">
                                <p class="text-[12px] font-black uppercase italic tracking-[0.2em] transform group-hover/event:translate-x-1 transition-transform" :class="eIdx === 0 ? 'text-blue-700' : 'text-slate-950'">{{ event.status }}</p>
                                <span v-if="event.location" class="text-[9px] font-black text-white bg-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-lg">{{ event.location }}</span>
                             </div>
                             <p class="text-[10px] font-black text-slate-400 uppercase mt-3 tracking-widest border-l-2 border-slate-100 pl-3 group-hover:border-black transition-colors">{{ event.date }}</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- Modal Footer -->
        <div class="p-10 border-t border-slate-100 bg-white sticky bottom-0 z-20 flex items-center justify-between flex-shrink-0 animate-in slide-in-from-bottom-2 duration-500 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
           <div class="flex items-center gap-5 text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">
              <div class="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner"><Hash size="16" /></div>
              TXN PERSISTENCE: {{ (order?.orderNumber || order?.orderId || order?.id)?.replace('#', '') || 'MANIFEST_LOST' }}
           </div>
           <div class="flex items-center gap-6 text-[11px] font-black uppercase text-slate-500 tracking-[0.3em] bg-slate-50 px-8 py-4 rounded-3xl border border-slate-200 shadow-inner italic">
              <Calendar size="18" class="text-slate-400" />
              DIGITALLY SIGNED {{ (order?.date || '').toUpperCase() }}
           </div>
        </div>
     </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 20px;
  border: 2px solid transparent;
  background-clip: content-box;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.97) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

.animate-in {
  animation-fill-mode: forwards;
}
.fade-in { animation: fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.zoom-in { animation: zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

.italic {
   font-style: italic !important;
}

.shadow-3xl {
  shadow: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
}
</style>
