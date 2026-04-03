<script setup>
import { ref, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  Users, Calendar, CreditCard, Plus, Search, Filter, 
  MoreVertical, Edit2, Trash2, Eye, UserPlus, 
  CheckCircle2, XCircle, Clock, DollarSign, ArrowUpRight
} from 'lucide-vue-next'

const adminStore = useAdminStore()
const activeTab = ref('employees')
const searchQuery = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const showAddModal = ref(false)
const showHistoryModal = ref(false)
const selectedEmployeeForHistory = ref(null)
const modalMode = ref('add') // 'add', 'edit'

const tabs = [
  { id: 'employees', label: 'Workforce', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: Calendar },
  { id: 'payroll', label: 'Payroll', icon: CreditCard }
]

const statusOptions = [
  { id: 'Present', color: 'bg-emerald-500', text: 'text-emerald-500' },
  { id: 'Absent', color: 'bg-red-500', text: 'text-red-500' },
  { id: 'Overtime', color: 'bg-blue-500', text: 'text-blue-500' },
  { id: 'Halfday', color: 'bg-amber-500', text: 'text-amber-500' },
  { id: 'Compoff', color: 'bg-purple-500', text: 'text-purple-500' },
  { id: 'Leave', color: 'bg-slate-500', text: 'text-slate-500' },
  { id: 'Paid Leave', color: 'bg-cyan-500', text: 'text-cyan-500' }
]

const stats = computed(() => {
  const totalSal = adminStore.employees.reduce((sum, e) => sum + e.salary, 0)
  const presentToday = adminStore.attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === 'Present').length
  return [
    { label: 'Total Workforce', value: adminStore.employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Monthly Payroll', value: `₹${totalSal.toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Present Today', value: presentToday, icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' }
  ]
})

const filteredEmployees = computed(() => {
  return adminStore.employees.filter(e => 
    e.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.role.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const currentAttendance = computed(() => {
  return adminStore.employees.map(e => {
    const record = adminStore.attendance.find(a => a.employeeId === e.id && a.date === selectedDate.value)
    return {
      ...e,
      attendanceStatus: record?.status || 'Not Marked',
      clockIn: record?.clockIn || '-',
      clockOut: record?.clockOut || '-',
      editCount: record?.editCount || 0,
      lastModified: record?.lastModified || '-'
    }
  })
})

const employeeHistory = computed(() => {
  if (!selectedEmployeeForHistory.value) return []
  return adminStore.attendance
    .filter(a => a.employeeId === selectedEmployeeForHistory.value.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const employeeAuditLogs = computed(() => {
  if (!selectedEmployeeForHistory.value) return []
  return adminStore.attendanceAuditLog
    .filter(l => l.employeeId === selectedEmployeeForHistory.value.id)
    .sort((a, b) => b.id - a.id)
})

const newEmployee = ref({
  name: '',
  role: '',
  email: '',
  phone: '',
  salary: 0,
  joinDate: new Date().toISOString().split('T')[0],
  status: 'Active'
})

const openAddModal = () => {
  modalMode.value = 'add'
  newEmployee.value = { name: '', role: '', email: '', phone: '', salary: 0, joinDate: new Date().toISOString().split('T')[0], status: 'Active' }
  showAddModal.value = true
}

const openHistoryModal = (emp) => {
  selectedEmployeeForHistory.value = emp
  showHistoryModal.value = true
}

const saveEmployee = () => {
  if (modalMode.value === 'add') {
    adminStore.addEmployee(newEmployee.value)
  } else {
    adminStore.updateEmployee(newEmployee.value)
  }
  showAddModal.value = false
}

const markStatus = (empId, status) => {
  adminStore.markAttendance(empId, status, selectedDate.value)
}
</script>

<template>
  <div class="space-y-8 animate-in fade-in duration-500">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-black italic uppercase tracking-tighter text-slate-900">
          Workforce Hub <span class="text-blue-600 text-sm not-italic align-middle ml-2">v4.0</span>
        </h1>
        <p class="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Manage Personnel, Attendance & Payroll</p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="openAddModal" class="bg-black text-white px-6 py-3 rounded-[4px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl shadow-black/10">
          <UserPlus size="16" />
          Onboard Employee
        </button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="s in stats" :key="s.label" class="bg-white p-6 rounded-[4px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
        <div class="flex items-center justify-between">
          <div :class="[s.bg, s.color, 'p-3 rounded-xl transition-transform group-hover:scale-110']">
            <component :is="s.icon" size="24" />
          </div>
          <ArrowUpRight class="text-slate-200 group-hover:text-slate-400 transition-colors" size="20" />
        </div>
        <div class="mt-4">
          <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">{{ s.label }}</p>
          <p class="text-2xl font-black text-slate-900 mt-1">{{ s.value }}</p>
        </div>
      </div>
    </div>

    <!-- Main Section -->
    <div class="bg-white rounded-[4px] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      <!-- Tabs Header -->
      <div class="px-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div class="flex items-center gap-8">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            class="py-6 text-[10px] font-black uppercase tracking-widest relative transition-all"
            :class="activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-black'"
          >
            <div class="flex items-center gap-2">
              <component :is="tab.icon" size="14" />
              {{ tab.label }}
            </div>
            <div v-if="activeTab === tab.id" class="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>
          </button>
        </div>
        <div class="flex items-center gap-4 py-4">
           <div class="relative group">
              <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size="14" />
              <input 
                v-model="searchQuery"
                type="text" 
                placeholder="Search personnel..."
                class="bg-white border border-slate-200 rounded-[4px] py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-blue-500 transition-all w-64"
              />
           </div>
           <button class="p-2 bg-white border border-slate-200 rounded-[4px] text-slate-400 hover:text-black transition-all">
              <Filter size="14" />
           </button>
        </div>
      </div>

      <!-- Tab Content -->
      <div class="flex-1 overflow-x-auto">
        <!-- Workforce Tab -->
        <table v-if="activeTab === 'employees'" class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Designation</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Remuneration</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Onboarding</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="emp in filteredEmployees" :key="emp.id" class="hover:bg-slate-50/30 transition-colors group">
              <td class="px-8 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                    {{ emp.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-900">{{ emp.name }}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ emp.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-8 py-4">
                <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                  {{ emp.role }}
                </span>
              </td>
              <td class="px-8 py-4 text-sm font-black text-slate-900">₹{{ emp.salary.toLocaleString() }}</td>
              <td class="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{{ emp.joinDate }}</td>
              <td class="px-8 py-4">
                <div :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                  emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                ]">
                  <div :class="['w-1.5 h-1.5 rounded-full', emp.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse']"></div>
                  {{ emp.status }}
                </div>
              </td>
              <td class="px-8 py-4 text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button class="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-all"><Edit2 size="14"/></button>
                  <button class="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-all"><Trash2 size="14"/></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Attendance Tab -->
        <div class="flex items-center gap-8 px-8 py-4 bg-white border-b border-slate-100">
           <div class="flex items-center gap-2">
              <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Target Date:</label>
              <input 
                v-model="selectedDate"
                type="date" 
                class="bg-slate-50 border border-slate-200 rounded-[4px] py-2 px-3 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all"
              />
           </div>
           <div class="h-4 w-[1px] bg-slate-200"></div>
           <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Managing records for <span class="text-blue-600 underline">{{ selectedDate }}</span>
           </p>
        </div>

        <table v-if="activeTab === 'attendance'" class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status Matrix</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Audit Info</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Quick Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="emp in currentAttendance" :key="emp.id" class="hover:bg-slate-50/30 transition-colors group">
              <td class="px-8 py-4">
                <button @click="openHistoryModal(emp)" class="flex items-center gap-3 text-left hover:text-blue-600 transition-colors group/name">
                  <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs group-hover/name:bg-blue-600 group-hover/name:text-white transition-all">
                    {{ emp.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-900 group-hover/name:text-blue-600">{{ emp.name }}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Click for history</p>
                  </div>
                </button>
              </td>
              <td class="px-8 py-4 text-center">
                <div class="inline-flex items-center p-1 bg-slate-100 rounded-lg gap-1">
                  <button 
                    v-for="opt in statusOptions" 
                    :key="opt.id"
                    @click="markStatus(emp.id, opt.id)"
                    :class="[
                      'px-2 py-1.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter transition-all',
                      emp.attendanceStatus === opt.id ? `${opt.color} text-white shadow-lg` : 'text-slate-400 hover:bg-white hover:text-slate-600'
                    ]"
                    :title="opt.id"
                  >
                    {{ opt.id.charAt(0) }}
                  </button>
                </div>
              </td>
              <td class="px-8 py-4">
                 <div class="space-y-1">
                    <p class="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
                       <Clock size="12" class="text-slate-400" /> {{ emp.lastModified }}
                    </p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                       Revision: <span class="text-blue-600">{{ emp.editCount }}</span> edits
                    </p>
                 </div>
              </td>
              <td class="px-8 py-4 text-right">
                <div v-if="emp.attendanceStatus === 'Not Marked'" class="flex items-center justify-end gap-2 animate-pulse">
                   <div class="w-2 h-2 bg-amber-500 rounded-full"></div>
                   <span class="text-[9px] font-black text-amber-500 uppercase tracking-widest">Pending</span>
                </div>
                <div v-else class="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-500 uppercase italic">
                   Verified <CheckCircle2 size="10" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Payroll Tab -->
        <table v-if="activeTab === 'payroll'" class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Period</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Amount</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">State</th>
              <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <!-- Pending Payroll (Calculated from Employees) -->
            <tr v-for="emp in adminStore.employees" :key="`pending-${emp.id}`" class="hover:bg-slate-50/30 transition-colors bg-blue-50/20">
              <td class="px-8 py-4 text-[10px] font-black text-blue-600 uppercase tracking-widest">Current Month</td>
              <td class="px-8 py-4">
                <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ emp.name }}</p>
              </td>
              <td class="px-8 py-4 text-center text-sm font-black text-slate-900 tracking-tighter">₹{{ emp.salary.toLocaleString() }}</td>
              <td class="px-8 py-4 text-center">
                <span class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">Pending</span>
              </td>
              <td class="px-8 py-4 text-right">
                <button 
                  v-if="!adminStore.payroll.find(p => p.employeeId === emp.id && p.month === 'March 2026')"
                  @click="adminStore.disbursePayroll(emp.id, 'March 2026')"
                  class="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all"
                >
                  Disburse
                </button>
                <span v-else class="text-[9px] font-black text-emerald-500 uppercase italic">Settled <CheckCircle2 size="10" class="inline" /></span>
              </td>
            </tr>

            <!-- Historical Payroll -->
            <tr v-for="pay in adminStore.payroll" :key="pay.id" class="hover:bg-slate-50/30 transition-colors opacity-60">
              <td class="px-8 py-4 text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ pay.month }}</td>
              <td class="px-8 py-4">
                <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                  {{ adminStore.employees.find(e => e.id === pay.employeeId)?.name }}
                </p>
              </td>
              <td class="px-8 py-4 text-center text-sm font-black text-emerald-600 tracking-tighter">₹{{ pay.amount.toLocaleString() }}</td>
              <td class="px-8 py-4 text-center">
                <span class="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                  {{ pay.status }}
                </span>
              </td>
              <td class="px-8 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paid: {{ pay.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Onboarding Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" @click="showAddModal = false"></div>
       <div class="relative bg-white w-full max-w-lg rounded-[4px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
          <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
             <div>
                <h3 class="text-xl font-black uppercase italic tracking-tighter">Personnel Onboarding</h3>
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Add new member to the dynamite collective</p>
             </div>
             <button @click="showAddModal = false" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><XCircle size="20" /></button>
          </div>
          
          <div class="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
             <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Full Name</label>
                   <input v-model="newEmployee.name" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="Enter name">
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Designation Role</label>
                   <input v-model="newEmployee.role" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="e.g. Designer">
                </div>
             </div>
             <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Official Email</label>
                   <input v-model="newEmployee.email" type="email" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="name@weardynamite.com">
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Contact Number</label>
                   <input v-model="newEmployee.phone" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all" placeholder="+91 XXXX XXX XXX">
                </div>
             </div>
             <div class="grid grid-cols-2 gap-6">
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly CTC (₹)</label>
                   <input v-model.number="newEmployee.salary" type="number" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all">
                </div>
                <div class="space-y-2">
                   <label class="text-[10px] font-black uppercase tracking-widest text-slate-500">Onboarding Date</label>
                   <input v-model="newEmployee.joinDate" type="date" class="w-full bg-slate-50 border border-slate-200 rounded-[4px] py-4 px-4 text-sm font-bold outline-none focus:border-blue-500 transition-all">
                </div>
             </div>
          </div>

          <div class="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-4">
             <button @click="showAddModal = false" class="text-[10px] font-black uppercase text-slate-400 hover:text-black tracking-widest">Cancel</button>
             <button @click="saveEmployee" class="bg-black text-white px-10 py-4 rounded-[4px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 shadow-xl shadow-black/10 transition-all">
                Commit Personnel to Vault
             </button>
          </div>
       </div>
    </div>

    <!-- History Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
       <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-md" @click="showHistoryModal = false"></div>
       <div class="relative bg-white w-full max-w-4xl rounded-[4px] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col h-[80vh]">
          <!-- Modal Header -->
          <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center font-black text-xl">
                   {{ selectedEmployeeForHistory?.name.charAt(0) }}
                </div>
                <div>
                   <h3 class="text-xl font-black uppercase italic tracking-tighter">{{ selectedEmployeeForHistory?.name }}</h3>
                   <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{{ selectedEmployeeForHistory?.role }} • Personnel Ledger</p>
                </div>
             </div>
             <button @click="showHistoryModal = false" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><XCircle size="24" /></button>
          </div>

          <div class="flex-1 flex overflow-hidden">
             <!-- Left: Historical List -->
             <div class="w-1/2 border-r border-slate-100 p-8 overflow-y-auto custom-scrollbar">
                <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Attendance Archive</h4>
                <div class="space-y-3">
                   <div v-for="rec in employeeHistory" :key="rec.date" class="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-center justify-between">
                      <div>
                         <p class="text-[10px] font-black text-slate-900 uppercase tracking-widest">{{ rec.date }}</p>
                         <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            Shift: {{ rec.clockIn }} - {{ rec.clockOut }}
                         </p>
                      </div>
                      <div :class="[
                        'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                        statusOptions.find(o => o.id === rec.status)?.color || 'bg-slate-500',
                        'text-white'
                      ]">
                         {{ rec.status }}
                      </div>
                   </div>
                   <div v-if="employeeHistory.length === 0" class="text-center py-20">
                      <Calendar class="mx-auto text-slate-200 mb-2" size="40" />
                      <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">No historical data available.</p>
                   </div>
                </div>
             </div>

             <!-- Right: Audit Trail -->
             <div class="w-1/2 bg-slate-50 p-8 overflow-y-auto custom-scrollbar">
                <h4 class="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 px-1 flex items-center justify-between">
                   System Audit Trail
                   <span class="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-[8px]">{{ employeeAuditLogs.length }} Changes</span>
                </h4>
                <div class="space-y-6 relative border-l-2 border-slate-200 ml-2">
                   <div v-for="log in employeeAuditLogs" :key="log.id" class="pl-6 relative">
                      <div class="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-600"></div>
                      <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                         <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ log.timestamp }}</p>
                         <p class="text-[10px] font-black text-slate-900 uppercase mt-1">Manual status override for <span class="text-blue-600">{{ log.date }}</span></p>
                         <div class="flex items-center gap-2 mt-2">
                            <span class="text-[8px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-400 uppercase line-through">{{ log.oldStatus }}</span>
                            <ArrowUpRight size="10" class="text-slate-300" />
                            <span class="text-[8px] font-black px-2 py-0.5 rounded bg-blue-600 text-white uppercase">{{ log.newStatus }}</span>
                         </div>
                      </div>
                   </div>
                   <div v-if="employeeAuditLogs.length === 0" class="text-center py-20 -ml-6">
                      <ShieldAlert class="mx-auto text-slate-200 mb-2" size="40" />
                      <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record integrity verified. No manual edits.</p>
                   </div>
                </div>
             </div>
          </div>

          <div class="p-8 border-t border-slate-100 flex items-center justify-end bg-white">
             <button @click="showHistoryModal = false" class="bg-black text-white px-10 py-4 rounded-[4px] font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all">Close Personnel Records</button>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
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

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.animate-in {
  animation-fill-mode: forwards;
}
.fade-in { animation: fade-in 0.4s ease-out; }
.zoom-in { animation: zoom-in 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
</style>
