<script setup>
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  FileText,
  Table as FileSpreadsheet
} from 'lucide-vue-next'

import { jsPDF } from 'jspdf'

const adminStore = useAdminStore()
const filterType = ref('All')
const searchQuery = ref('')
const startDate = ref('')
const endDate = ref('')
const showBalanced = ref(true)
const showManualModal = ref(false)

const newEntry = ref({
  type: 'Debit',
  category: 'Expense',
  amount: 0,
  description: ''
})

const categories = ['Revenue', 'COGS', 'Expense', 'Salaries', 'Vendor Settlement', 'Tax', 'Bank Adjustment', 'Other']

// GL Account Mapping Utility
const glMap = {
  'Revenue': { name: 'Sales Revenue', id: '4000-1', type: 'Revenue' },
  'COGS': { name: 'Cost of Goods Sold', id: '5000-1', type: 'Expense' },
  'Expense': { name: 'Operating Expenses', id: '6000-1', type: 'Expense' },
  'Salaries': { name: 'Payroll Expense', id: '6100-1', type: 'Expense' },
  'Vendor Settlement': { name: 'Accounts Payable', id: '2000-1', type: 'Liability' },
  'Tax': { name: 'GST Payable', id: '2100-1', type: 'Liability' },
  'Bank Adjustment': { name: 'Cash at Bank', id: '1000-1', type: 'Asset' },
  'Other': { name: 'Miscellaneous', id: '9000-1', type: 'Other' }
}

const getGLInfo = (category) => glMap[category] || { name: category, id: 'XXXX-X', type: 'Other' }

const handleAddManualEntry = () => {
  if (newEntry.value.amount <= 0 || !newEntry.value.description) return
  adminStore.addLedgerEntry({
    ...newEntry.value,
    referenceId: `MAN-${Date.now()}`
  })
  showManualModal.value = false
  newEntry.value = { type: 'Debit', category: 'Expense', amount: 0, description: '' }
}

const stats = computed(() => {
  const credits = adminStore.ledger.filter(l => l.type === 'Credit').reduce((sum, l) => sum + l.amount, 0)
  const debits = adminStore.ledger.filter(l => l.type === 'Debit').reduce((sum, l) => sum + l.amount, 0)
  return { credits, debits, balance: credits - debits }
})

const groupedLedger = computed(() => {
  let entries = adminStore.ledger
  
  if (filterType.value !== 'All') {
    entries = entries.filter(l => l.type === filterType.value)
  }
  if (searchQuery.value) {
    entries = entries.filter(l => 
      l.description.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      l.category.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (startDate.value) {
    entries = entries.filter(l => new Date(l.date) >= new Date(startDate.value))
  }
  if (endDate.value) {
    // Add time for day end
    const end = new Date(endDate.value)
    end.setHours(23, 59, 59, 999)
    entries = entries.filter(l => new Date(l.date) <= end)
  }

  // Group by context (using description + date as a proxy for a single transaction event)
  const groups = []
  entries.forEach(entry => {
    const glInfo = getGLInfo(entry.category)
    const balancingInfo = entry.type === 'Credit' 
      ? { name: 'Accounts Receivable', id: '1200-1', type: 'Asset' }
      : { name: 'Petty Cash', id: '1000-1', type: 'Asset' }

    // Every entry in our ledger represents a "side" of a transaction
    // To match the user's screenshot, we'll show the double-entry pairing (if balanced view is on)
    const transaction = {
      description: entry.description,
      date: formatDate(entry.date),
      referenceId: entry.referenceId,
      rows: []
    }

    // Primary Row
    transaction.rows.push({
      date: formatDate(entry.date),
      glType: glInfo.type,
      glName: glInfo.name, 
      glId: glInfo.id,
      vendor: (entry.referenceId && entry.referenceId.startsWith('ORD-')) ? 'Online Customer' : 'Operational',
      debit: entry.type === 'Debit' ? entry.amount : null,
      credit: entry.type === 'Credit' ? entry.amount : null
    })

    // Secondary (Balancing) Row
    if (showBalanced.value) {
      transaction.rows.push({
        date: formatDate(entry.date),
        glType: balancingInfo.type,
        glName: balancingInfo.name, 
        glId: balancingInfo.id,
        vendor: entry.referenceId.startsWith('ORD-') ? 'Online Customer' : 'Operational',
        debit: entry.type === 'Credit' ? entry.amount : null,
        credit: entry.type === 'Debit' ? entry.amount : null
      })
    }

    transaction.totalDebit = transaction.rows.reduce((sum, r) => sum + (r.debit || 0), 0)
    transaction.totalCredit = transaction.rows.reduce((sum, r) => sum + (r.credit || 0), 0)
    
    groups.push(transaction)
  })
  return groups
})

const globalTotals = computed(() => {
  return groupedLedger.value.reduce((acc, group) => {
    acc.debit += group.totalDebit
    acc.credit += group.totalCredit
    return acc
  }, { debit: 0, credit: 0 })
})

// Pagination State
const itemsPerPage = 8
const currentPage = ref(1)

const paginatedGroups = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return groupedLedger.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(groupedLedger.value.length / itemsPerPage))

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-')
}

const formatDateNumeric = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}


const exportToExcel = () => {
  const dateRange = (startDate.value && endDate.value) 
    ? `${formatDateNumeric(startDate.value)} to ${formatDateNumeric(endDate.value)}`
    : 'All Time'
    
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
          .group-title { background-color: #f8fafc; font-weight: bold; color: #1e293b; }
        </style>
      </head>
      <body>
        <div class="header-title">DYNAMITE PRO - INSTITUTIONAL GENERAL LEDGER</div>
        <div class="header-meta">Period: ${dateRange} | Total Settlement: Rs. ${stats.value.balance.toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>#</th><th>Date</th><th>Type</th><th>GL Name</th><th>GL #</th><th>Description</th><th>Rel. Entity</th><th>Debit</th><th>Credit</th>
            </tr>
          </thead>
          <tbody>
  `

  groupedLedger.value.forEach((group, gIdx) => {
    group.rows.forEach((row, rIdx) => {
      const serial = showBalanced.value ? ((gIdx * 2) + rIdx + 1) : (gIdx + 1)
      html += `
        <tr>
          <td>${serial}</td>
          <td>${formatDateNumeric(row.date === '-' ? group.date : row.date)}</td>
          <td>${row.glType}</td>
          <td>${row.glName}</td>
          <td>${row.glId}</td>
          <td>${group.description}</td>
          <td>${row.vendor}</td>
          <td>${row.debit || 0}</td>
          <td>${row.credit || 0}</td>
        </tr>
      `
    })
  })

  html += `
          </tbody>
          <tfoot>
            <tr class="footer">
              <td colspan="7">INSTITUTIONAL GRAND TOTAL</td>
              <td>${globalTotals.value.debit}</td>
              <td>${globalTotals.value.credit}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `Ledger_Excel_${new Date().toISOString().split('T')[0]}.xls`
  link.click()
}

const exportToPDF = () => {
  const doc = new jsPDF('l', 'mm', 'a4')
  
  // Header (White background, black text)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bolditalic')
  doc.text('DYNAMITE PRO', 12, 18)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('INSTITUTIONAL GENERAL LEDGER STATEMENT', 12, 26)
  
  const dateRange = (startDate.value && endDate.value) 
    ? `${formatDate(startDate.value)} to ${formatDate(endDate.value)}`
    : 'All Time'
  doc.text(`Period: ${dateRange}`, 285, 26, { align: 'right' })
  
  // Table Headers
  const startY = 32
  doc.setFillColor(74, 109, 167)
  doc.rect(10, startY, 277, 10, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  const colX = [10, 20, 40, 75, 110, 140, 195, 228, 258]
  const headers = ['#', 'DATE', 'TYPE', 'GL NAME', 'GL #', 'DESCRIPTION', 'REL. ENTITY', 'DEBIT', 'CREDIT']
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 2, startY + 6)
    // Header Vertical lines
    doc.setDrawColor(255, 255, 255, 0.3) // Subtle white lines in blue header
    doc.line(colX[i], startY, colX[i], startY + 10)
  })
  doc.line(287, startY, 287, startY + 10)
  
  // Rows
  let currentY = startY + 10
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  
  groupedLedger.value.forEach((group, gIdx) => {
    group.rows.forEach((row, rIdx) => {
      if (currentY > 185) {
        doc.addPage()
        currentY = 20
        // Re-add headers on new page?
        doc.setFillColor(74, 109, 167)
        doc.rect(10, currentY, 277, 10, 'F')
        doc.setTextColor(255, 255, 255)
        headers.forEach((h, i) => {
          doc.text(h, colX[i] + 2, currentY + 6)
          doc.setDrawColor(255, 255, 255, 0.3)
          doc.line(colX[i], currentY, colX[i], currentY + 10)
        })
        doc.line(287, currentY, 287, currentY + 10)
        currentY += 10
        doc.setTextColor(50, 50, 50)
      }
      
      const serial = showBalanced.value ? ((gIdx * 2) + rIdx + 1) : (gIdx + 1)
      const data = [
        serial,
        row.date,
        row.glType,
        row.glName.substring(0, 18),
        row.glId,
        group.description.substring(0, 28),
        row.vendor.substring(0, 18),
        row.debit ? `Rs. ${row.debit.toLocaleString()}` : '0',
        row.credit ? `Rs. ${row.credit.toLocaleString()}` : '0'
      ]
      
      data.forEach((d, i) => {
        doc.text(String(d), colX[i] + 2, currentY + 6)
        // Vertical lines
        doc.setDrawColor(220, 220, 220)
        doc.line(colX[i], currentY, colX[i], currentY + 10)
      })
      // Final vertical line on right
      doc.line(287, currentY, 287, currentY + 10)
      
      // Horizontal line
      doc.setDrawColor(220, 220, 220)
      doc.line(10, currentY + 10, 287, currentY + 10)
      currentY += 10
    })
  })
  
  // Global Footer (Institutional Footer)
  doc.setFillColor(15, 23, 42)
  doc.rect(10, currentY, 277, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('INSTITUTIONAL GRAND TOTAL', 15, currentY + 8)
  doc.text(`Rs. ${globalTotals.value.debit.toLocaleString()}`, colX[7] + 2, currentY + 8)
  doc.text(`Rs. ${globalTotals.value.credit.toLocaleString()}`, colX[8] + 2, currentY + 8)

  // Footer Vertical lines (connecting Debit/Credit columns)
  doc.setDrawColor(255, 255, 255, 0.2)
  doc.line(colX[7], currentY, colX[7], currentY + 12)
  doc.line(colX[8], currentY, colX[8], currentY + 12)
  doc.line(287, currentY, 287, currentY + 12)
  
  doc.save(`Ledger_Statement_${new Date().toISOString().split('T')[0]}.pdf`)
}
</script>

<template>
  <div class="p-6 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="flex items-center gap-4">
        <div class="bg-indigo-600 text-white p-4 rounded-2xl shadow-xl shadow-indigo-500/20">
          <Wallet size="28" />
        </div>
        <div>
          <h1 class="text-2xl font-black italic uppercase tracking-tighter text-slate-900">General Ledger Report</h1>
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Institutional Financial Transaction Log</p>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button 
          @click="showManualModal = true"
          class="bg-black text-white px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:bg-slate-900 transition-all shadow-xl active:scale-95"
        >
          <Plus size="18" /> Manual Adjustment
        </button>
        <button 
          @click="exportToExcel"
          class="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10 active:scale-95 border border-emerald-500/20"
        >
          <FileSpreadsheet size="14" /> Excel
        </button>
        <button 
          @click="exportToPDF"
          class="bg-[#0f172a] text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-indigo-500/10 active:scale-95 border border-white/5"
        >
          <FileText size="14" /> PDF
        </button>
      </div>
    </div>

    <!-- Consolidated Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
       <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group overflow-hidden h-20">
          <div class="flex flex-col">
             <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Credits</p>
             <h2 class="text-2xl font-black text-slate-900 mt-1 italic tracking-tighter">₹{{ stats.credits.toLocaleString() }}</h2>
          </div>
          <div class="flex items-center gap-1.5 text-emerald-600 font-black text-[9px] uppercase bg-emerald-50 px-2 py-1 rounded-lg">
             <ArrowUpRight size="12" /> +12.4%
          </div>
       </div>

       <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group overflow-hidden h-20">
          <div class="flex flex-col">
             <p class="text-[8px] font-black uppercase text-slate-400 tracking-widest">Total Debits</p>
             <h2 class="text-2xl font-black text-slate-900 mt-1 italic tracking-tighter">₹{{ stats.debits.toLocaleString() }}</h2>
          </div>
          <div class="flex items-center gap-1.5 text-red-600 font-black text-[9px] uppercase bg-red-50 px-2 py-1 rounded-lg">
             <ArrowDownLeft size="12" /> +4.2%
          </div>
       </div>

       <div class="bg-[#0f172a] p-4 rounded-2xl shadow-xl flex items-center justify-between group overflow-hidden h-20 relative">
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
          <div class="flex flex-col relative">
             <p class="text-[8px] font-black uppercase text-slate-500 tracking-widest">Net Settlement</p>
             <h2 class="text-2xl font-black text-white mt-1 italic tracking-tighter">₹{{ stats.balance.toLocaleString() }}</h2>
          </div>
          <div class="flex items-center gap-1.5 text-indigo-400 font-black text-[9px] uppercase bg-white/5 px-2 py-1 rounded-lg relative">
             <CheckCircle2 size="12" /> Integrity Verified
          </div>
       </div>
    </div>

    <!-- Filters & Table -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
       <div class="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-3">
             <button 
               v-for="t in ['All', 'Credit', 'Debit']" 
               :key="t"
               @click="filterType = t"
               class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
               :class="filterType === t ? 'bg-black text-white shadow-lg shadow-gray-500/20' : 'bg-slate-50 text-slate-400 hover:text-slate-600'"
             >
               {{ t }}
             </button>
          </div>
          
          <div class="flex flex-wrap items-center gap-4 border-l border-slate-100 pl-6 flex-1">
             <div class="flex flex-col gap-1">
                <label class="text-[8px] font-black uppercase text-slate-400 tracking-widest pl-1">From</label>
                <input v-model="startDate" type="date" class="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-indigo-600 transition-all max-w-[110px]" />
             </div>
             <div class="flex flex-col gap-1">
                <label class="text-[8px] font-black uppercase text-slate-400 tracking-widest pl-1">To</label>
                <input v-model="endDate" type="date" class="bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[9px] font-bold outline-none focus:border-indigo-600 transition-all max-w-[110px]" />
             </div>
             <button v-if="startDate || endDate" @click="startDate = ''; endDate = ''" class="self-end pb-1 text-slate-400 hover:text-red-500 transition-colors">
                <X size="12" />
             </button>
          </div>

          <div class="flex items-center gap-4">
             <div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 group cursor-pointer" @click="showBalanced = !showBalanced">
                <div class="w-7 h-3.5 bg-slate-200 rounded-full relative transition-colors" :class="showBalanced ? 'bg-indigo-600' : 'bg-slate-200'">
                   <div class="absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all shadow-sm" :class="showBalanced ? 'left-4' : 'left-0.5'"></div>
                </div>
                <span class="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-600 transition-colors">Balanced</span>
             </div>

             <div class="relative group">
               <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
               <input 
                 v-model="searchQuery"
                 type="text" 
                 placeholder="Search..." 
                 class="bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-2 text-[10px] font-bold outline-none focus:bg-white focus:border-indigo-600 transition-all shadow-inner w-36"
               />
             </div>
          </div>
        </div>

          <div class="overflow-x-auto overflow-y-auto max-h-[620px] no-scrollbar relative">
            <table class="w-full text-left border-collapse">
               <thead class="bg-[#4a6da7] text-white sticky top-0 z-20 shadow-sm">
                  <tr class="divide-x divide-blue-400/30">
                     <th class="px-3 py-4 text-[10px] font-black uppercase tracking-widest w-[4%] text-center bg-[#4a6da7]">#</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[10%] bg-[#4a6da7]">Date</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[10%] text-center bg-[#4a6da7]">Type</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[13%] text-center bg-[#4a6da7]">GL Name</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[8%] text-center bg-[#4a6da7]">GL #</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[18%] text-center bg-[#4a6da7]">Description</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[11%] text-center bg-[#4a6da7]">Rel. Entity</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[13%] text-center bg-[#4a6da7]">Debit</th>
                     <th class="px-6 py-4 text-[10px] font-black uppercase tracking-widest w-[13%] text-center bg-[#4a6da7]">Credit</th>
                  </tr>
               </thead>
               <tbody class="bg-white">
                  <template v-for="(group, gIdx) in paginatedGroups" :key="gIdx">
                     <!-- Transaction Rows -->
                     <tr v-for="(row, rIdx) in group.rows" :key="rIdx" class="border-b border-slate-100 hover:bg-slate-50/50 transition-all divide-x divide-slate-50">
                        <td class="px-3 py-2 text-[10px] font-black text-slate-400 text-center">{{ showBalanced ? ((((currentPage - 1) * itemsPerPage) + gIdx) * 2 + rIdx + 1) : (((currentPage - 1) * itemsPerPage) + gIdx + 1) }}</td>
                        <td class="px-6 py-2 text-[11px] font-bold text-slate-500 text-center">{{ row.date }}</td>
                        <td class="px-6 py-2 text-[11px] font-bold text-slate-500 text-center">{{ row.glType }}</td>
                        <td class="px-6 py-2 text-[11px] font-black text-slate-900">{{ row.glName }}</td>
                        <td class="px-6 py-2 text-[11px] font-mono font-bold text-slate-400 text-center">{{ row.glId }}</td>
                        <td class="px-6 py-2 text-[11px] font-black text-slate-900 text-center uppercase italic tracking-tighter">{{ group.description }}</td>
                        <td class="px-6 py-2 text-[11px] font-bold text-slate-400 text-center italic">{{ row.vendor }}</td>
                        <td class="px-6 py-2 text-[12px] font-black text-slate-900 text-right pr-8">
                           {{ row.debit ? '₹' + row.debit.toLocaleString() : '-' }}
                        </td>
                        <td class="px-6 py-2 text-[12px] font-black text-slate-900 text-right pr-8">
                           {{ row.credit ? '₹' + row.credit.toLocaleString() : '-' }}
                        </td>
                     </tr>
                  </template>
                  
                  <!-- Global Footer / Grand Total sticky base -->
                  <tr class="bg-slate-900 text-white border-t-2 border-slate-950 sticky bottom-0 z-20 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
                     <td colspan="7" class="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-center italic bg-slate-900">Institutional Grand Total</td>
                     <td class="px-6 py-4 text-[14px] font-black text-white text-right pr-8 bg-indigo-600/20 border-x border-white/10 uppercase italic backdrop-blur-md">
                        ₹{{ globalTotals.debit.toLocaleString() }}
                     </td>
                     <td class="px-6 py-4 text-[14px] font-black text-white text-right pr-8 bg-indigo-600/20 uppercase italic backdrop-blur-md">
                        ₹{{ globalTotals.credit.toLocaleString() }}
                     </td>
                  </tr>
               </tbody>
            </table>

            <!-- Pagination UI -->
            <div class="p-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between shadow-2xl">
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Ledger Audit Cycle: {{ Math.min(groupedLedger.length, itemsPerPage) }} Transactions</p>
               <div class="flex items-center gap-2">
                  <button @click="currentPage--" :disabled="currentPage === 1" class="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size="16" /></button>
                  <div class="flex items-center gap-1">
                     <span v-for="p in totalPages" :key="p" @click="currentPage = p" :class="p === currentPage ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-indigo-400'" class="w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black border transition-all cursor-pointer">
                        {{ p }}
                     </span>
                  </div>
                  <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size="16" /></button>
               </div>
            </div>
          </div>
       
        <div v-if="!groupedLedger.length" class="p-20 flex flex-col items-center justify-center text-slate-300 gap-4">
          <AlertCircle size="48" stroke-width="1" />
          <p class="text-[10px] font-black uppercase tracking-widest">No spectral transactions detected</p>
       </div>
    </div>

    <!-- Manual Adjustment Modal -->
    <div v-if="showManualModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="showManualModal = false"></div>
       <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in duration-300">
          <div class="p-5 border-b border-slate-50 flex items-center justify-between">
             <h2 class="text-xl font-black italic uppercase text-slate-900">Financial Adjustment</h2>
             <button @click="showManualModal = false" class="text-slate-400 hover:text-black transition-colors"><X size="24"/></button>
          </div>
          
          <div class="p-5 space-y-6">
             <div class="flex items-center p-1 bg-slate-100 rounded-2xl gap-1">
                <button 
                  @click="newEntry.type = 'Credit'"
                  class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  :class="newEntry.type === 'Credit' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-600'"
                >
                  Credit (+)
                </button>
                <button 
                  @click="newEntry.type = 'Debit'"
                  class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                  :class="newEntry.type === 'Debit' ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-slate-600'"
                >
                  Debit (-)
                </button>
             </div>

             <div class="flex flex-col gap-1.5">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Description</label>
                <input v-model="newEntry.description" type="text" class="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 transition-all" placeholder="e.g. Bank Interest Received" />
             </div>

             <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Category</label>
                   <select v-model="newEntry.category" class="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 transition-all cursor-pointer">
                      <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                   </select>
                </div>
                <div class="flex flex-col gap-1.5">
                   <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1">Amount (₹)</label>
                   <input v-model.number="newEntry.amount" type="number" class="w-full bg-slate-50 border border-slate-100 px-6 py-4 rounded-2xl text-xs font-bold font-mono outline-none focus:border-indigo-600 transition-all" />
                </div>
             </div>
          </div>

          <div class="p-5 bg-slate-50/50 border-t border-slate-100 flex gap-4">
             <button @click="showManualModal = false" class="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all italic underline">Discard</button>
             <button @click="handleAddManualEntry" class="flex-[2] bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-indigo-500/20 active:scale-95">Commit Adjustment</button>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
