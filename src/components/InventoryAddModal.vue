<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { X, Plus, Trash2, Save, FileText, User, ShoppingBag, Calendar, Info, Camera, Upload, Check, Layers } from 'lucide-vue-next'
import { useAdminStore } from '../stores/adminStore'
import { PRODUCT_TAXONOMY, GENDERS } from '../data/categories'

const props = defineProps(['show', 'editInvoice'])
const emit = defineEmits(['close', 'save', 'update'])
const adminStore = useAdminStore()

const availableSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '28', '30', '32', '34', '36', '38', 'Free Size']
const availableColors = ['Black', 'White', 'Navy', 'Grey', 'Red', 'Emerald', 'Beige', 'Royal Blue', 'Maroon', 'Olive']

const isEditMode = computed(() => !!props.editInvoice)

const invoiceForm = reactive({
  invoiceNumber: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  vendorName: '',
  addedBy: 'Admin', // Default or from auth
  items: [
    { 
      productName: '', 
      price: 0, 
      variants: [
        { size: 'M', colors: [], quantity: 0 }
      ],
      fabric: '',
      category: '',
      subCategory: '',
      gender: 'Men',
      occasion: '',
      images: [],
      orderId: '', 
      orderDate: new Date().toISOString().split('T')[0] 
    }
  ]
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

const handleGenderChange = (item) => {
  item.category = ''
  item.subCategory = ''
}

const handleCategoryChange = (item) => {
  item.subCategory = ''
}

const addItem = () => {
  if (invoiceForm.items.length < 200) {
    invoiceForm.items.unshift({ 
      productName: '', 
      price: 0, 
      variants: [
        { size: 'M', colors: [], quantity: 0 }
      ],
      fabric: '', 
      category: '',
      subCategory: '',
      gender: 'Men',
      occasion: '',
      images: [],
      orderId: '', 
      orderDate: new Date().toISOString().split('T')[0] 
    })
  }
}

const addVariant = (item) => {
  item.variants.push({ size: 'M', colors: [], quantity: 0 })
}

const removeVariant = (item, vIndex) => {
  if (item.variants.length > 1) {
    item.variants.splice(vIndex, 1)
  }
}

const removeItem = (index) => {
  if (invoiceForm.items.length > 1) {
    invoiceForm.items.splice(index, 1)
  }
}

const toggleColor = (variant, color) => {
  if (!variant.colors) variant.colors = []
  const idx = variant.colors.indexOf(color)
  if (idx > -1) {
    variant.colors.splice(idx, 1)
  } else {
    variant.colors.push(color)
  }
}

const handleFileUpload = async (event, index) => {
  const files = Array.from(event.target.files)
  if (!invoiceForm.items[index].images) invoiceForm.items[index].images = []
  
  for (const file of files) {
    try {
      // 1. Get Presigned URL
      const { uploadUrl, fileKey } = await adminStore.getPresignedUrl(file.name, file.type, 'inventory')
      
      // 2. Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })

      // 3. Store only the Key
      invoiceForm.items[index].images.push(fileKey)
    } catch (error) {
      console.error('S3 Upload Failed:', error)
      adminStore.showNotification('Media Error', `Failed to upload ${file.name}. Please try again.`, 'error')
    }
  }
}

const removeImage = (item, imgIndex) => {
  item.images.splice(imgIndex, 1)
}

const handleSave = () => {
  if (!invoiceForm.invoiceNumber || !invoiceForm.vendorName) {
    adminStore.showNotification('Entry Incomplete', 'Professional Requirement: Please fill in both Invoice Number and Vendor Name before finalizing.', 'warning')
    return
  }
  
  if (isEditMode.value) {
    emit('update', props.editInvoice.id, JSON.parse(JSON.stringify(invoiceForm)))
  } else {
    emit('save', JSON.parse(JSON.stringify(invoiceForm)))
  }
  resetForm()
}

const resetForm = () => {
  invoiceForm.invoiceNumber = ''
  invoiceForm.vendorName = ''
  invoiceForm.items = [
    { 
      productName: '', 
      price: 0, 
      variants: [ { size: 'M', colors: [], quantity: 0 } ],
      fabric: '', 
      category: '',
      subCategory: '',
      gender: 'Unisex',
      occasion: '',
      images: [],
      orderId: '', 
      orderDate: new Date().toISOString().split('T')[0] 
    }
  ]
}

// Watch for editInvoice change to populate form
watch(() => props.editInvoice, (newInv) => {
  if (newInv) {
    invoiceForm.invoiceNumber = newInv.invoiceNumber
    invoiceForm.invoiceDate = newInv.invoiceDate
    invoiceForm.vendorName = newInv.vendorName
    invoiceForm.addedBy = newInv.addedBy
    invoiceForm.items = JSON.parse(JSON.stringify(newInv.items))
  } else {
    resetForm()
  }
}, { immediate: true })

const totalInvoiceValue = computed(() => {
  return invoiceForm.items.reduce((sum, item) => {
    const itemQty = item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0)
    return sum + (Number(item.price) * itemQty)
  }, 0)
})

</script>

<template>
  <div v-if="show" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" @click="emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative bg-white w-full max-w-[98%] max-h-[90vh] rounded-[3px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300">
      <!-- Header -->
      <div class="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h2 class="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <ShoppingBag class="text-blue-600" />
            {{ isEditMode ? 'Edit' : 'New' }} Inventory Entry
          </h2>
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Add items from external invoices to your core stock</p>
        </div>
        <div class="flex items-center gap-6">
           <div class="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm">
              <span class="text-[9px] font-black uppercase tracking-widest">Initial Status:</span>
              <span class="text-[10px] font-black uppercase tracking-widest">{{ editInvoice?.status || 'Draft' }}</span>
           </div>
           <button @click="emit('close')" class="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-red-500">
             <X size="20" />
           </button>
        </div>
      </div>

      <!-- Scrollable Form -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <!-- Invoice Details Section -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div class="space-y-3">
            <label class="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <FileText size="14" /> Invoice Number
            </label>
            <input v-model="invoiceForm.invoiceNumber" type="text" placeholder="e.g. INV/2026/101" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:font-normal" />
          </div>
          <div class="space-y-3">
            <label class="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Calendar size="14" /> Invoice Date
            </label>
            <input v-model="invoiceForm.invoiceDate" type="date" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all font-inter" />
          </div>
          <div class="space-y-3">
            <label class="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <User size="14" /> Vendor Name
            </label>
            <input v-model="invoiceForm.vendorName" type="text" placeholder="e.g. Cotton Traders" class="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder:font-normal" />
          </div>
          <div class="space-y-3">
            <label class="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <User size="14" /> Added By
            </label>
            <input v-model="invoiceForm.addedBy" type="text" class="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3.5 text-sm font-bold opacity-70 cursor-not-allowed" readonly />
          </div>
        </div>

        <!-- Items Table Section -->
        <div class="space-y-4">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
              <div class="w-1.5 h-6 bg-blue-600 rounded-full"></div>
              Invoice Line Items ({{ invoiceForm.items.length }}/200)
            </h3>
            <button @click="addItem" class="text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-blue-100 shadow-sm">
              <Plus size="16" /> Add Another Row
            </button>
          </div>

          <!-- Items Grid -->
          <div class="space-y-6">
            <div v-for="(item, index) in invoiceForm.items" :key="index" class="relative bg-white border border-slate-100 rounded-[3px] p-6 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all animate-in slide-in-from-top-2 duration-300 mb-6 group">
              <!-- Item Header / Delete -->
              <div class="absolute -top-3 -right-3 h-8 w-8 bg-white shadow-lg border border-slate-100 rounded-full flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click="removeItem(index)" class="text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 size="14" />
                </button>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- COL 1: PRODUCT CORE (4/12) -->
                <div class="lg:col-span-4 space-y-5 pr-6 border-r border-slate-50">
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-1 h-5 bg-blue-600 rounded-full"></div>
                    <span class="text-xs font-black uppercase tracking-widest text-slate-900">Product Specifications</span>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-5">
                    <div class="space-y-2 col-span-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Product Name</span>
                      <input v-model="item.productName" type="text" placeholder="e.g. Premium Crew T-Shirt" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all font-inter placeholder:font-normal" />
                    </div>
                    
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Gender / Segment</span>
                      <select v-model="item.gender" @change="handleGenderChange(item)" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_8px_center] bg-no-repeat">
                        <option v-for="g in GENDERS" :key="g" :value="g">{{ g }}</option>
                      </select>
                    </div>
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Category</span>
                      <select v-model="item.category" @change="handleCategoryChange(item)" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_8px_center] bg-no-repeat">
                        <option value="">Select Category</option>
                        <option v-for="cat in getCategoriesForGender(item.gender)" :key="cat" :value="cat">{{ cat }}</option>
                      </select>
                    </div>
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Sub-Category</span>
                      <select v-model="item.subCategory" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_8px_center] bg-no-repeat">
                        <option value="">Select Sub-Category</option>
                        <option v-for="sub in getSubCategoriesForCategory(item)" :key="sub" :value="sub">{{ sub }}</option>
                      </select>
                    </div>
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Occasion</span>
                      <input v-model="item.occasion" type="text" placeholder="e.g. Casual" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all font-inter placeholder:font-normal" />
                    </div>
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Unit Price</span>
                      <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₹</span>
                        <input v-model="item.price" type="number" class="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-sm font-black outline-none focus:border-blue-600 focus:bg-white transition-all" />
                      </div>
                    </div>
                    <div class="space-y-2">
                      <span class="text-[11px] font-black uppercase text-slate-400 tracking-tight">Fabric</span>
                      <input v-model="item.fabric" type="text" placeholder="Cotton" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:font-normal" />
                    </div>
                  </div>
                </div>

                <!-- COL 2: STOCK VARIANTS (4/12) -->
                <div class="lg:col-span-4 space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-3">
                       <Layers size="16" class="text-blue-600" />
                       <span class="text-xs font-black uppercase text-slate-900 tracking-widest">Stock Matrix</span>
                    </div>
                    <button @click="addVariant(item)" class="text-[10px] font-black uppercase text-blue-600 hover:bg-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 border border-blue-100 shadow-sm">
                      <Plus size="12" /> Add Size Block
                    </button>
                  </div>

                  <div class="space-y-4 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    <div v-for="(variant, vIdx) in item.variants" :key="vIdx" class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 relative group/var">
                      <button v-if="item.variants.length > 1" @click="removeVariant(item, vIdx)" class="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/var:opacity-100">
                        <Trash2 size="14" />
                      </button>

                      <div class="space-y-2">
                        <span class="text-[11px] font-black uppercase text-slate-400 block flex items-center gap-2">
                           <div class="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                           Variant Identity & Stock (Batch Colors)
                        </span>

                        <div class="flex items-end gap-3">
                          <div class="w-24">
                             <span class="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Size</span>
                             <select v-model="variant.size" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-2.5 text-sm font-black outline-none focus:border-blue-600 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_6px_center] bg-no-repeat transition-all">
                               <option v-for="sz in availableSizes" :key="sz" :value="sz">{{ sz }}</option>
                             </select>
                          </div>
                          
                          <div class="flex-1">
                             <span class="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Color</span>
                             <select 
                               @change="(e) => { if(e.target.value) { toggleColor(variant, e.target.value); e.target.value = ''; } }"
                               class="w-full bg-slate-100/50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/5 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:18px_18px] bg-[right_8px_center] bg-no-repeat transition-all"
                             >
                                <option value="">Select color...</option>
                                <option v-for="clr in availableColors" :key="clr" :value="clr">{{ clr }}</option>
                             </select>
                          </div>

                          <div class="w-24">
                             <span class="text-[10px] font-black uppercase text-slate-400 mb-1.5 block">Qty</span>
                             <input v-model="variant.quantity" type="number" placeholder="0" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-sm font-black outline-none focus:border-blue-600 focus:bg-white transition-all transition-all" />
                          </div>
                        </div>
                      </div>

                      <div class="space-y-2">

                        <!-- Selected Color Chips -->
                        <div v-if="variant.colors && variant.colors.length" class="flex flex-wrap gap-2 mt-2">
                           <div
                             v-for="clr in variant.colors"
                             :key="clr"
                             class="flex items-center gap-2 pl-2 pr-1.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-800 shadow-sm"
                           >
                              <div class="h-2 w-2 rounded-full border border-white/20" :style="{ backgroundColor: clr }"></div>
                              {{ clr }}
                              <button @click="toggleColor(variant, clr)" class="p-0.5 hover:bg-white/20 rounded-md transition-colors">
                                 <X size="10" />
                              </button>
                           </div>
                        </div>
                        <div v-else class="text-[10px] font-bold text-slate-300 italic px-1">
                           No colors selected for this batch
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- COL 3: MEDIA & AUDIT (4/12) -->
                <div class="lg:col-span-4 space-y-5">
                  <div class="space-y-3">
                    <div class="flex items-center justify-between">
                       <span class="text-xs font-black uppercase text-slate-400 tracking-tighter">Product Gallery</span>
                       <span class="text-[10px] font-bold text-slate-300">{{ item.images?.length || 0 }} images</span>
                    </div>
                    <div class="flex flex-wrap gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 min-h-[100px]">
                       <div 
                         v-for="(img, imgIdx) in item.images" 
                         :key="imgIdx" 
                         class="relative group/img h-16 w-16 rounded-xl overflow-hidden border border-slate-200 bg-white cursor-zoom-in shadow-sm hover:shadow-md transition-all"
                         @click="adminStore.openImagePreview(item.images, imgIdx)"
                       >
                          <img :src="adminStore.resolveImageUrl(img)" class="w-full h-full object-cover" />
                          <button @click.stop="removeImage(item, imgIdx)" class="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                             <Trash2 size="16" />
                          </button>
                       </div>
                       <button
                          @click="$refs[`file_${index}`][0].click()"
                          class="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-white hover:shadow-sm transition-all flex flex-col items-center justify-center text-slate-300 hover:text-blue-500"
                       >
                          <Plus size="20" />
                          <span class="text-[9px] font-black uppercase mt-1">Add</span>
                       </button>
                    </div>
                    <input
                       type="file"
                       :ref="`file_${index}`"
                       class="hidden"
                       accept="image/*"
                       multiple
                       @change="(e) => handleFileUpload(e, index)"
                    />
                  </div>

                  <div class="grid grid-cols-2 gap-4 pt-2">
                    <div class="space-y-2">
                      <span class="text-xs font-black uppercase text-slate-400 tracking-tighter">Order ID</span>
                      <input v-model="item.orderId" type="text" placeholder="PO-XXXX" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:font-normal" />
                    </div>
                    <div class="space-y-2">
                      <span class="text-xs font-black uppercase text-slate-400 tracking-tighter">Order Date</span>
                      <input v-model="item.orderDate" type="date" class="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-blue-600 focus:bg-white transition-all font-inter" />
                    </div>
                  </div>

                  <!-- Line Total -->
                  <div class="mt-4 p-5 rounded-2xl bg-blue-600 text-white flex items-center justify-between shadow-lg shadow-blue-600/20 animate-in fade-in slide-in-from-right-2 duration-500">
                    <div class="flex flex-col">
                      <span class="text-[10px] font-black uppercase opacity-60">Line Valuation</span>
                      <span class="text-base font-black">
                        ₹{{ (item.price * item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0)).toLocaleString() }}
                      </span>
                    </div>
                    <div class="flex flex-col items-end">
                      <span class="text-[10px] font-black uppercase opacity-60">Total Units</span>
                      <span class="text-base font-black">
                        {{ item.variants.reduce((s, v) => s + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div class="flex items-center gap-8">
          <div class="flex flex-col">
            <span class="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Total Items</span>
            <span class="text-2xl font-black text-slate-900 leading-tight">
              {{ invoiceForm.items.reduce((s, i) => s + i.variants.reduce((sv, v) => sv + (Number(v.quantity || 0) * (v.colors?.length || 1)), 0), 0) }}
            </span>
          </div>
          <div class="w-[1px] h-10 bg-slate-200"></div>
          <div class="flex flex-col">
            <span class="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Invoice Total</span>
            <span class="text-2xl font-black text-blue-600 leading-tight">₹{{ totalInvoiceValue.toLocaleString() }}</span>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <button @click="emit('close')" class="px-8 py-4 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all">
            Discard
          </button>
          <button @click="handleSave" class="px-10 py-5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-slate-900/10 flex items-center gap-3 transition-all">
            <Save size="20" /> Save & Finalize Invoice
          </button>
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
  background: #f8fafc;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
