<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import api from '../utils/api'
import { 
  Users, Calendar, CreditCard, Plus, Search, Filter, 
  MoreVertical, Edit2, Trash2, Eye, UserPlus, 
  CheckCircle2, XCircle, Clock, DollarSign, ArrowUpRight,
  ChevronLeft, ChevronRight, Camera, ShieldCheck, FileDown,
  Info, Briefcase, IdCard, Database, UserCheck, X, ChevronDown, ShieldAlert, Mail
} from 'lucide-vue-next'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const adminStore = useAdminStore()
const activeTab = ref('employees')
const searchQuery = ref('')
const selectedDate = ref(new Date().toISOString().split('T')[0])
const attendanceView = ref('daily') // 'daily', 'matrix'
const showAddModal = ref(false)
const showHistoryModal = ref(false)
const selectedEmployeeForHistory = ref(null)
const modalMode = ref('add') // 'add', 'edit'
const editId = ref(null)
const activeDropdownCell = ref(null) // { empId, date }
const activeHeaderDropdown = ref(null) // { date }
const dropdownPosition = ref({ top: 0, left: 0, direction: 'down' })
const isOvertimeInput = ref(false)
const overtimeHours = ref(0)

// Advanced Payroll State
const showPaymentModal = ref(false)
const selectedEmployeeForPayment = ref(null)
const paymentForm = reactive({
  amount: 0,
  isAdvance: false,
  month: 'April 2026',
  note: '',
  paymentMethod: 'Cash',
  transactionId: '',
  receiptUrl: ''
})

const showDetailsModal = ref(false)
const selectedEmployeeForDetails = ref(null)
const showPayrollHistoryModal = ref(false)
const selectedEmployeeForPayroll = ref(null)
const historyFilters = reactive({
  search: '',
  month: 'All'
})
const sendingEmail = ref(false)

const openPayrollHistory = (emp) => {
  selectedEmployeeForPayroll.value = emp
  historyFilters.search = ''
  historyFilters.month = 'All'
  showPayrollHistoryModal.value = true
}

const payrollByEmployee = computed(() => {
  const groups = {}
  adminStore.payroll.forEach(p => {
    // Aggressive normalization: Strip all WDTH/EMPLOYEE prefixes and compare raw numeric/ID strings
    const rawId = String(p.employeeId || p.PK || p.id || '')
      .replace('EMPLOYEE#', '')
      .replace('WDTH', '')
      .trim();
    
    if (!groups[rawId]) groups[rawId] = []
    groups[rawId].push(p)
  })
  return groups
})

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
  { id: 'Paid Leave', color: 'bg-cyan-500', text: 'text-cyan-500' },
  { id: 'Holiday', color: 'bg-indigo-500', text: 'text-indigo-500' }
]

const designations = [
  'Fabric Designer', 'Pattern Maker', 'Tailor Master', 'Quality Checker', 
  'Warehouse Executive', 'Sales Representative', 'Admin Executive', 
  'Marketing Manager', 'Production Head', 'Support Staff'
]

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const employeeTypes = ['Full-Time', 'Contract', 'Part-Time', 'Intern']
const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed']
const experienceLevels = ['Fresher', 'Experienced']

const filteredPayoutHistory = computed(() => {
  if (!selectedEmployeeForPayroll.value) return []
  const eid = String(selectedEmployeeForPayroll.value.employeeId || selectedEmployeeForPayroll.value.id || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim()
  
  return adminStore.payroll
    .filter(p => {
       const pEid = String(p.employeeId || p.PK || p.id || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim()
       const matchesEmp = pEid === eid
       const matchesSearch = !historyFilters.search || 
                             p.month.toLowerCase().includes(historyFilters.search.toLowerCase()) ||
                             (p.transactionId && p.transactionId.toLowerCase().includes(historyFilters.search.toLowerCase()))
       const matchesMonth = historyFilters.month === 'All' || p.month === historyFilters.month
       return matchesEmp && matchesSearch && matchesMonth
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

const historyMonths = computed(() => {
  if (!selectedEmployeeForPayroll.value) return []
  const eid = String(selectedEmployeeForPayroll.value.employeeId || selectedEmployeeForPayroll.value.id || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim()
  const months = new Set()
  adminStore.payroll.forEach(p => {
      const pEid = String(p.employeeId || p.PK || p.id || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim()
      if (pEid === eid) months.add(p.month)
  })
  return Array.from(months).sort()
})

const downloadPayrollPDF = (emp, records) => {
  const doc = new jsPDF()
  
  // Header Minimalist (White background, Slate-Black text)
  doc.setFillColor(255, 255, 255) 
  doc.rect(0, 0, 210, 25, 'F')
  
  doc.setTextColor(15, 23, 42) // Slate 900
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('WEARDYNAMITE', 20, 18)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139) // Slate 500
  doc.text('INSTITUTIONAL PAYROLL LEDGER', 20, 26)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 140, 26)
  
  // Personnel Details (Shifted up due to reduced header)
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Personnel: ${emp.name}`, 20, 45)
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105) // Slate 600
  doc.text(`Employee ID: ${emp.employeeId || 'N/A'}`, 20, 51)
  doc.text(`Active Role: ${emp.role || 'Personnel'}`, 20, 57)
  doc.text(`Bank Status: Account Linked`, 20, 63)
  
  // Table Data
  const tableData = records.map(r => [
    r.month,
    r.isAdvance ? 'Advance' : 'Settlement',
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : (r.date || '-'),
    r.paymentMethod || 'Cash',
    r.transactionId || '-',
    `INR ${r.amount.toLocaleString()}`
  ])
  
  autoTable(doc, {
    startY: 75,
    head: [['Period', 'Type', 'Date', 'Method', 'Reference ID', 'Amount']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      5: { halign: 'right', fontStyle: 'bold' }
    }
  })
  
  // Total Summary
  const total = records.reduce((sum, r) => sum + Number(r.amount || 0), 0)
  const finalY = doc.lastAutoTable.finalY + 10
  
  doc.setFont('helvetica', 'bold')
  doc.text(`Total Disbursed: INR ${total.toLocaleString()}`, 140, finalY)
  
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text('This is a computer generated document. Verifiability is maintained in the central vault.', 20, 280)
  
  doc.save(`Payroll_${emp.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`)
  adminStore.showNotification('Success', 'Payout record exported to PDF.', 'success')
}

const sendLedgerEmail = async (emp) => {
  if (sendingEmail.value) return
  sendingEmail.value = true
  try {
    const eid = String(emp.employeeId || emp.id || '').replace('EMPLOYEE#', '').trim()
    await api.post(`/admin/employees/${eid}/payroll/send-ledger`)
    adminStore.showNotification('Email Sent', `Institutional ledger dispatched to ${emp.email}`, 'success')
  } catch (error) {
    adminStore.showNotification('Email Failed', 'Vault communications failure. Please try again.', 'error')
  } finally {
    sendingEmail.value = false
  }
}

const stats = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  const currentMonthPrefix = today.substring(0, 7)
  const daysInMonth = getDaysInMonth(today)
  
  const presentToday = adminStore.attendance.filter(a => a.date === today && (a.status === 'Present' || a.status === 'Overtime')).length
  
  const totalPayout = adminStore.employees.reduce((sum, e) => {
    const presentDays = adminStore.attendance.filter(a => 
      String(a.employeeId) === String(e.id || e.employeeId) && 
      a.date.startsWith(currentMonthPrefix) && 
      (a.status === 'Present' || a.status === 'Overtime')
    ).length
    const dayRate = (e.salary || 0) / daysInMonth
    return sum + (dayRate * presentDays)
  }, 0)

  return [
    { label: 'Total Workforce', value: adminStore.employees.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Projected Payroll', value: `₹${Math.round(totalPayout).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
    const eid = String(e.id || e.employeeId)
    const record = adminStore.attendance.find(a => String(a.employeeId) === eid && a.date === selectedDate.value)
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
  const eid = String(selectedEmployeeForHistory.value.id || selectedEmployeeForHistory.value.employeeId)
  return adminStore.attendance
    .filter(a => String(a.employeeId) === eid)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const employeeAuditLogs = computed(() => {
  if (!selectedEmployeeForHistory.value) return []
  const eid = String(selectedEmployeeForHistory.value.id || selectedEmployeeForHistory.value.employeeId)
  return adminStore.attendanceAuditLog
    .filter(l => String(l.employeeId) === eid)
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
})

const onboardingTab = ref('personal') // 'personal', 'professional', 'documents'
const isUploading = ref(false)

const newEmployee = ref({
  id: '', // Used for S3 folder isolation
  name: '',
  role: '',
  email: '',
  phone: '',
  salary: 0,
  joinDate: new Date().toISOString().split('T')[0],
  status: 'Active',
  // Personal & Family
  motherName: '',
  fatherName: '',
  address: '',
  maritalStatus: 'Single',
  spouseName: '',
  bloodGroup: 'O+',
  // Professional
  designation: 'Designation Role',
  employeeType: 'Full-Time',
  experienceLevel: 'Fresher',
  experienceYears: 0,
  drivingLicense: '',
  // KYC & Docs
  aadharNumber: '',
  panNumber: '',
  photoUrl: '',
  aadharUrl: '',
  panUrl: '',
  otherDocUrl: ''
})

const openAddModal = () => {
  modalMode.value = 'add'
  editId.value = null
  onboardingTab.value = 'personal'
  
  const tempId = 'emp_' + Math.random().toString(36).substr(2, 9)
  
  newEmployee.value = { 
    id: tempId,
    name: '', role: '', email: '', phone: '', 
    salary: 0, joinDate: new Date().toISOString().split('T')[0], 
    status: 'Active',
    motherName: '', fatherName: '', address: '', maritalStatus: 'Single',
    spouseName: '', bloodGroup: 'O+', designation: designations[0],
    employeeType: 'Full-Time', experienceLevel: 'Fresher', experienceYears: 0,
    drivingLicense: '', aadharNumber: '', panNumber: '',
    photoUrl: '', aadharUrl: '', panUrl: '', otherDocUrl: ''
  }
  showAddModal.value = true
}

const openEditModal = (emp) => {
  modalMode.value = 'edit'
  editId.value = emp.id || emp.employeeId
  onboardingTab.value = 'personal'
  newEmployee.value = { 
    ...emp,
    id: emp.id || emp.employeeId, // Maintain ID for S3 folder consistency
    // Ensure default values for new fields if editing old records
    motherName: emp.motherName || '',
    fatherName: emp.fatherName || '',
    address: emp.address || '',
    maritalStatus: emp.maritalStatus || 'Single',
    spouseName: emp.spouseName || '',
    bloodGroup: emp.bloodGroup || 'O+',
    designation: emp.designation || emp.role || designations[0],
    employeeType: emp.employeeType || 'Full-Time',
    experienceLevel: emp.experienceLevel || 'Fresher',
    experienceYears: emp.experienceYears || 0,
    drivingLicense: emp.drivingLicense || '',
    aadharNumber: emp.aadharNumber || '',
    panNumber: emp.panNumber || '',
    photoUrl: emp.photoUrl || '',
    aadharUrl: emp.aadharUrl || '',
    panUrl: emp.panUrl || '',
    otherDocUrl: emp.otherDocUrl || ''
  }
  showAddModal.value = true
}

const openHistoryModal = async (emp) => {
  selectedEmployeeForHistory.value = emp
  const id = emp.id || emp.employeeId
  showHistoryModal.value = true
  await Promise.all([
    adminStore.fetchEmployeeHistory(id),
    adminStore.fetchEmployeeAuditLog(id)
  ])
}

const confirmModal = ref({ show: false, title: '', message: '', action: null })

const requestConfirmation = (title, message, action) => {
  confirmModal.value = { show: true, title, message, action }
}

const confirmDelete = (emp) => {
  requestConfirmation(
    'Verify Removal',
    `Are you sure you want to remove ${emp.name} from the collective? This action is permanent.`,
    async () => {
      await adminStore.deleteEmployee(emp.id || emp.employeeId)
    }
  )
}

const handleFileUpload = async (event, fieldName) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploading.value = true
  try {
    const folder = `employees/${newEmployee.value.id}`
    const fileName = `${fieldName}_${Date.now()}`
    const { uploadUrl, publicUrl } = await adminStore.getPresignedUrl(fileName, file.type, folder)
    await adminStore.uploadToS3(uploadUrl, file)
    newEmployee.value[fieldName] = publicUrl
    adminStore.showNotification('Success', `${fieldName.replace('Url', '')} uploaded successfully.`, 'success')
  } catch (error) {
    console.error('Upload error:', error)
    adminStore.showNotification('Upload Error', 'Failed to store document in vault.', 'error')
  } finally {
    isUploading.value = false
  }
}

const handlePayrollAttachment = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploading.value = true
  try {
    const eid = String(selectedEmployeeForPayment.value.employeeId || selectedEmployeeForPayment.value.id || '').replace('EMPLOYEE#', '')
    const folder = `payroll/${eid}/${paymentForm.month.replace(/\s+/g, '_')}`
    const fileName = `receipt_${Date.now()}`
    const { uploadUrl, publicUrl } = await adminStore.getPresignedUrl(fileName, file.type, folder)
    await adminStore.uploadToS3(uploadUrl, file)
    paymentForm.receiptUrl = publicUrl
    adminStore.showNotification('Success', 'Payment receipt uploaded successfully.', 'success')
  } catch (error) {
    console.error('Upload error:', error)
    adminStore.showNotification('Upload Error', 'Failed to store digital receipt.', 'error')
  } finally {
    isUploading.value = false
  }
}

const openDetailsModal = (emp) => {
  selectedEmployeeForDetails.value = emp
  showDetailsModal.value = true
}

const downloadEmployeePDF = async (empId, name) => {
  try {
    const response = await api.get(`/admin/employees/${empId}/download-form`, {
      responseType: 'blob'
    })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Personnel_Form_${name.replace(/\s+/g, '_')}.pdf`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    adminStore.showNotification('Success', 'Personnel form downloaded.', 'success')
  } catch (error) {
    console.error('PDF Download error:', error)
    adminStore.showNotification('Error', 'Failed to generate PDF.', 'error')
  }
}

const saveEmployee = async () => {
  // Regex Definitions
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phoneRegex = /^\d{10}$/

  // Field Validation (Legal Name and Email are mandatory)
  if (!newEmployee.value.name) {
    onboardingTab.value = 'personal'
    return adminStore.showNotification('Validation Error', 'Legal Name is required.', 'warning')
  }

  if (!newEmployee.value.email || !emailRegex.test(newEmployee.value.email)) {
    onboardingTab.value = 'professional'
    return adminStore.showNotification('Validation Error', 'A valid official email address is required.', 'warning')
  }

  // Contact Number Validation (Must be exactly 10 digits)
  const cleanPhone = newEmployee.value.phone.replace(/\D/g, '')
  if (!phoneRegex.test(cleanPhone)) {
    onboardingTab.value = 'professional'
    return adminStore.showNotification('Validation Error', 'Contact number must be exactly 10 digits.', 'warning')
  }

  // Ensure 'role' matches 'designation' for UI consistency in the workforce list
  newEmployee.value.role = newEmployee.value.designation

  try {
    if (modalMode.value === 'add') {
      const saved = await adminStore.addEmployee(newEmployee.value)
      // Trigger Welcome Email & PDF generation in secondary thread
      if (saved && saved.employeeId) {
        adminStore.sendEmployeeWelcome(saved.employeeId)
      }
    } else {
      await adminStore.updateEmployee(editId.value, newEmployee.value)
    }
    showAddModal.value = false
  } catch (error) {
    // Error notification logic is centralized in the adminStore
  }
}

const markStatus = async (empId, status, targetDate = null, extra = {}) => {
  await adminStore.markAttendance({
    employeeId: empId,
    status: status,
    date: targetDate || selectedDate.value,
    markedBy: 'admin',
    ...extra
  })
  activeDropdownCell.value = null
  isOvertimeInput.value = false
  overtimeHours.value = 0
}

const toggleCellDropdown = (e, empId, date) => {
  e.stopPropagation()
  isOvertimeInput.value = false
  
  if (activeDropdownCell.value?.empId === empId && activeDropdownCell.value?.date === date) {
    activeDropdownCell.value = null
  } else {
    activeDropdownCell.value = { empId, date }
    
    // Calculate position
    const rect = e.currentTarget.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const direction = spaceBelow < 250 ? 'up' : 'down'
    
    dropdownPosition.value = {
      top: direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY,
      left: rect.left + (rect.width / 2) + window.scrollX,
      direction: direction
    }
  }
}

const toggleHeaderDropdown = (e, date) => {
  e.stopPropagation()
  isOvertimeInput.value = false
  activeDropdownCell.value = null
  
  if (activeHeaderDropdown.value?.date === date) {
    activeHeaderDropdown.value = null
  } else {
    activeHeaderDropdown.value = { date }
    const rect = e.currentTarget.getBoundingClientRect()
    dropdownPosition.value = {
      top: rect.bottom + window.scrollY,
      left: rect.left + (rect.width / 2) + window.scrollX,
      direction: 'down'
    }
  }
}

const bulkMarkStatus = async (date, status) => {
  requestConfirmation(
    'Bulk Update Confirmation',
    `You are about to apply the "${status}" status to EVERY employee in the workforce for ${date}. Proceed?`,
    async () => {
      const promises = adminStore.employees.map(emp => 
        adminStore.markAttendance({
          employeeId: emp.id || emp.employeeId,
          status: status,
          date: date,
          markedBy: 'admin'
        })
      )
      
      await Promise.all(promises)
      activeHeaderDropdown.value = null
      adminStore.showNotification('Success', `Bulk attendance updated for ${date}.`, 'success')
    }
  )
}

const getDropdownDirection = () => {
  return dropdownPosition.value.direction === 'up' ? 'bottom-full mb-4' : 'top-full mt-4'
}

const initiateOvertime = (e) => {
  e.stopPropagation()
  isOvertimeInput.value = true
}

const calculatePrevMonthPaid = (emp, monthStr) => {
  try {
    const [mName, y] = monthStr.split(' ')
    const targetDate = new Date(`${mName} 1, ${y}`)
    targetDate.setMonth(targetDate.getMonth() - 1)
    const prevMonthStr = `${targetDate.toLocaleString('default', { month: 'short' })} ${targetDate.getFullYear()}`
    
    const eid = String(emp.id || emp.employeeId).replace('EMPLOYEE#', '').replace('WDTH', '').trim()
    const matchingPayrolls = adminStore.payroll.filter(p => {
       const pEid = String(p.employeeId || p.PK || p.id || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim()
       return pEid === eid && p.month === prevMonthStr
    })
    
    // If no data exists for the previous month, we don't assume a due
    if (matchingPayrolls.length === 0) return null
    return matchingPayrolls.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  } catch (e) {
    return 0
  }
}

const calculateDues = (emp, monthStr) => {
  const daysInMonth = getDaysInMonth(selectedDate.value)
  const [y, m] = selectedDate.value.split('-')
  const monthIdx = parseInt(m)
  const monthPrefix = `${y}-${String(monthIdx).padStart(2, '0')}`
  
  const presentDays = adminStore.attendance.filter(a => 
    String(a.employeeId || '').replace('EMPLOYEE#', '').replace('WDTH', '').trim() === String(emp.id || emp.employeeId).replace('EMPLOYEE#', '').replace('WDTH', '').trim() && 
    a.date.startsWith(monthPrefix) && 
    (a.status === 'Present' || a.status === 'Overtime')
  ).length

  const currentEarnings = Math.round(((emp.salary || 0) / daysInMonth) * presentDays)
  const totalPaidPrev = calculatePrevMonthPaid(emp, monthStr)
  
  // CarryForward Logic: Balanced based on Monthly CTC pool
  const dueBalance = totalPaidPrev !== null ? (emp.salary - totalPaidPrev) : 0
  
  return {
    gross: currentEarnings,
    balance: dueBalance,
    net: Math.max(0, currentEarnings + dueBalance)
  }
}

const markAllPresent = async () => {
  const promises = adminStore.employees.map(emp => 
    adminStore.markAttendance({
      employeeId: emp.id || emp.employeeId,
      status: 'Present',
      date: selectedDate.value,
      markedBy: 'admin'
    })
  )
  await Promise.all(promises)
  adminStore.showNotification('Success', `All personnel marked present for ${selectedDate.value}.`, 'success')
}

const getAttendanceRecord = (emp, d) => {
  const dateStr = `${selectedDate.value.substring(0, 8)}${String(d).padStart(2, '0')}`
  const eid = String(emp.id || emp.employeeId)
  return adminStore.attendance.find(a => String(a.employeeId) === eid && a.date === dateStr)
}

const isSunday = (d) => {
  const date = new Date(`${selectedDate.value.substring(0, 8)}${String(d).padStart(2, '0')}`)
  return date.getDay() === 0
}

const openPaymentModal = (emp, month) => {
  const dues = calculateDues(emp, month)
  selectedEmployeeForPayment.value = emp
  paymentForm.amount = dues.net
  paymentForm.isAdvance = false
  paymentForm.month = month
  paymentForm.note = `Standard Salary Disbursement - ${month}`
  showPaymentModal.value = true
}

const submitPayment = async () => {
  if (paymentForm.amount <= 0) {
    return adminStore.showNotification('Validation Error', 'Disbursement amount must be greater than zero.', 'warning')
  }

  const empId = selectedEmployeeForPayment.value.employeeId || selectedEmployeeForPayment.value.id || selectedEmployeeForPayment.value.PK?.split('#')[1];

  // Strict Policy: Total disbursement must not exceed CTC
  if (paymentForm.amount > Number(selectedEmployeeForPayment.value.salary || 0)) {
     return adminStore.showNotification('Vault Compliance Warning', `Transaction amount (₹${paymentForm.amount}) violates policy. Maximum allowed is Monthly CTC (₹${selectedEmployeeForPayment.value.salary || 0}).`, 'error')
  }

  try {
    const payload = {
      employeeId: empId,
      month: paymentForm.month,
      amount: paymentForm.amount,
      isAdvance: paymentForm.isAdvance,
      note: paymentForm.note,
      paymentMethod: paymentForm.paymentMethod,
      transactionId: paymentForm.transactionId,
      receiptUrl: paymentForm.receiptUrl
    }
    
    console.log('[PAYROLL ACTION] Submitting Payment Payload:', JSON.stringify(payload, null, 2));
    
    await adminStore.disbursePayroll(payload)
    showPaymentModal.value = false
  } catch (error) {
    console.error('[PAYROLL ACTION] Submission failed:', error);
  }
}

const getDaysInMonth = (dateStr) => {
  const [y, m] = dateStr.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

const getMonthName = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleString('default', { month: 'short' }).toUpperCase()
}

const changeMonth = (delta) => {
  const date = new Date(selectedDate.value)
  // To avoid issues with 31st vs 30th (e.g. March 31 -> Feb), 
  // we set day to 1 before moving month, then restore day if possible or just stay at 1
  date.setDate(1) 
  date.setMonth(date.getMonth() + delta)
  selectedDate.value = date.toISOString().split('T')[0]
}



onMounted(() => {
  adminStore.fetchEmployees()
  adminStore.fetchPayroll()
  
  const d = new Date(selectedDate.value)
  adminStore.fetchAttendanceMatrix(d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'))
  
  window.addEventListener('click', () => {
    activeDropdownCell.value = null
  })
})

watch(selectedDate, (newDate, oldDate) => {
  const nM = newDate.substring(0, 7)
  const oM = oldDate?.substring(0, 7)
  if (nM !== oM) {
    const d = new Date(newDate)
    adminStore.fetchAttendanceMatrix(d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'))
  }
})
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

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div v-for="s in stats" :key="s.label" class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex items-center gap-4">
        <div :class="[s.bg, s.color, 'p-3 rounded-xl transition-transform group-hover:scale-110 flex-shrink-0 shadow-lg']">
          <component :is="s.icon" size="20" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] truncate">{{ s.label }}</p>
          <p class="text-lg font-black text-slate-900 tracking-tight">{{ s.value }}</p>
        </div>
        <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
           <ArrowUpRight size="16" class="text-slate-300" />
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
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest w-12">S.N.</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest w-32">Emp ID</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Personnel</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Designation</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Remuneration</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Joined</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
              <th class="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="(emp, index) in filteredEmployees" :key="emp.id" class="hover:bg-slate-50/30 transition-colors group">
              <td class="px-6 py-1.5 text-[10px] font-black text-slate-400">{{ index + 1 }}</td>
              <td class="px-6 py-1.5">
                 <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{{ emp.employeeId || 'UUID' }}</span>
              </td>
              <td class="px-6 py-1.5">
                <button @click="openDetailsModal(emp)" class="flex items-center gap-3 text-left group/name hover:text-blue-600 transition-all">
                  <div class="w-9 h-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black group-hover/name:bg-blue-600 group-hover/name:text-white transition-all">
                    {{ emp.name.charAt(0) }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-slate-900 group-hover/name:text-blue-600">{{ emp.name }}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ emp.email }}</p>
                  </div>
                </button>
              </td>
              <td class="px-6 py-1.5">
                <span class="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">
                  {{ emp.role }}
                </span>
              </td>
              <td class="px-6 py-1.5 text-sm font-black text-slate-900">₹{{ emp.salary.toLocaleString() }}</td>
              <td class="px-6 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{{ emp.joinDate }}</td>
              <td class="px-6 py-1.5">
                <div :class="[
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                  emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                ]">
                  <div :class="['w-1.5 h-1.5 rounded-full', emp.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-600 animate-pulse']"></div>
                  {{ emp.status }}
                </div>
              </td>
              <td class="px-6 py-2.5 text-right">
                <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="downloadEmployeePDF(emp.employeeId || emp.id, emp.name)" class="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-black rounded-md transition-all" title="Download Form"><FileDown size="14"/></button>
                  <button @click="openEditModal(emp)" class="p-1.5 hover:bg-blue-50 text-blue-600 rounded-md transition-all"><Edit2 size="14"/></button>
                  <button @click="confirmDelete(emp)" class="p-1.5 hover:bg-red-50 text-red-600 rounded-md transition-all"><Trash2 size="14"/></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Attendance Tab -->
        <div v-if="activeTab === 'attendance'" class="p-6 border-b border-slate-100 bg-white flex items-center gap-4">
           <div class="flex p-1 bg-slate-100 rounded-lg">
              <button 
                @click="attendanceView = 'daily'"
                class="px-3 py-1.5 text-[9px] font-black uppercase rounded-[4px] transition-all"
                :class="attendanceView === 'daily' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
              >Daily</button>
              <button 
                @click="attendanceView = 'matrix'; adminStore.fetchAttendanceMatrix(selectedDate.split('-')[0], selectedDate.split('-')[1])"
                class="px-3 py-1.5 text-[9px] font-black uppercase rounded-[4px] transition-all"
                :class="attendanceView === 'matrix' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
              >Grid / Monthly</button>
           </div>
           <div class="h-4 w-[1px] bg-slate-200"></div>
           <div class="flex items-center gap-1">
               <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest mr-1">Target Date:</label>
               <button 
                 @click="changeMonth(-1)"
                 class="p-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-400 hover:text-black transition-all hover:bg-white"
               >
                 <ChevronLeft size="14" />
               </button>
               <input 
                 v-model="selectedDate"
                 type="date" 
                 class="bg-slate-50 border border-slate-200 rounded-[4px] py-1.5 px-3 text-[10px] font-black uppercase outline-none focus:border-blue-500 transition-all font-mono"
               />
               <button 
                 @click="changeMonth(1)"
                 class="p-1.5 bg-slate-50 border border-slate-200 rounded-[4px] text-slate-400 hover:text-black transition-all hover:bg-white"
               >
                 <ChevronRight size="14" />
               </button>
            </div>
           <div class="h-4 w-[1px] bg-slate-200"></div>
           <button 
             v-if="attendanceView === 'daily'"
             @click="markAllPresent"
             class="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-[4px] font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all"
           >Mark All Present</button>
        </div>

        <table v-if="activeTab === 'attendance' && attendanceView === 'daily'" class="w-full text-left">
          <!-- (Keep existing table content) -->
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
                    @click="markStatus(emp.id || emp.employeeId, opt.id)"
                    :class="[
                      'px-2 py-1.5 rounded-[4px] text-[8px] font-black uppercase tracking-tighter transition-all',
                      emp.attendanceStatus === opt.id ? `${opt.color} text-white shadow-lg` : 'text-slate-400 hover:bg-white hover:text-slate-600'
                    ]"
                  >
                    {{ opt.id.charAt(0) }}
                  </button>
                </div>
              </td>
              <td class="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase">
                Modified: {{ emp.lastModified }} / {{ emp.editCount }} edits
              </td>
              <td class="px-8 py-4 text-right">
                <div v-if="emp.attendanceStatus === 'Not Marked'" class="flex items-center justify-end gap-2 text-amber-500 animate-pulse">
                   <div class="w-2 h-2 bg-amber-500 rounded-full"></div>
                   <span class="text-[9px] font-black uppercase">Pending</span>
                </div>
                <div v-else class="flex items-center justify-end gap-1 text-[9px] font-black text-emerald-500 uppercase italic">
                   Verified <CheckCircle2 size="10" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Attendance Matrix (Grid) -->
        <div v-if="activeTab === 'attendance' && attendanceView === 'matrix'" class="h-full overflow-hidden flex flex-col">
          <div class="overflow-auto custom-scrollbar flex-1">
            <table class="w-full text-left border-collapse min-w-[1200px]">
              <thead class="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
                <tr>
                  <th class="p-4 bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-r border-slate-100 sticky left-0 z-20 min-w-[180px]">Personnel</th>
                  <th v-for="d in getDaysInMonth(selectedDate)" :key="d" 
                    :class="[
                      'p-3 text-center border-r border-slate-100 min-w-[55px] cursor-pointer hover:bg-slate-100 transition-colors group/th relative',
                      isSunday(d) ? 'bg-rose-50/50' : 'bg-slate-50/30'
                    ]"
                    @click="toggleHeaderDropdown($event, `${selectedDate.substring(0, 8)}${String(d).padStart(2, '0')}`)"
                  >
                    <div :class="[
                      'absolute inset-x-0 bottom-0 h-0.5 transition-all',
                      activeHeaderDropdown?.date === `${selectedDate.substring(0, 8)}${String(d).padStart(2, '0')}` ? 'bg-blue-500' : 'bg-transparent group-hover/th:bg-slate-300'
                    ]"></div>
                    <p class="text-[11px] font-black text-slate-800 uppercase tracking-tighter">{{ d }}</p>
                    <p class="text-[8px] font-black text-blue-500/60 uppercase tracking-widest">{{ getMonthName(selectedDate) }}</p>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="(emp, empIndex) in adminStore.employees" :key="emp.id" class="hover:bg-slate-50/50 transition-all group">
                  <td class="p-4 border-r border-slate-100 sticky left-0 z-10 bg-white group-hover:bg-slate-50 shadow-[4px_0_15px_rgba(0,0,0,0.02)] min-w-[180px]">
                    <p class="text-[11px] font-black text-slate-900 uppercase tracking-widest">{{ emp.name }}</p>
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{{ emp.role }}</p>
                  </td>
                  <td v-for="d in getDaysInMonth(selectedDate)" :key="d" 
                    :class="[
                      'p-2 border-r border-slate-100 text-center relative min-w-[55px]',
                      isSunday(d) ? 'bg-slate-50/50' : ''
                    ]"
                  >
                    <div 
                      class="w-10 h-10 rounded-lg flex items-center justify-center mx-auto text-[11px] font-black cursor-pointer transition-all hover:scale-110 active:scale-95 group/cell relative"
                      @click="toggleCellDropdown($event, emp.id || emp.employeeId, `${selectedDate.substring(0, 8)}${String(d).padStart(2, '0')}`)"
                      :class="[
                        getAttendanceRecord(emp, d)?.status 
                        ? `${statusOptions.find(o => o.id === getAttendanceRecord(emp, d).status)?.color || 'bg-slate-500'} text-white shadow-lg`
                        : 'bg-slate-50 text-slate-400 group-hover:bg-white border border-slate-200'
                      ]"
                    >
                      <!-- Quick Stats Info inside cell -->
                      <div class="relative w-full h-full flex flex-col items-center justify-center">
                        <span class="text-[12px]">
                         {{ getAttendanceRecord(emp, d)?.status === 'Overtime' 
                            ? (getAttendanceRecord(emp, d)?.overtimeHours || 'OT') 
                            : (getAttendanceRecord(emp, d)?.status?.charAt(0) || '-') }}
                        </span>
                        <div v-if="getAttendanceRecord(emp, d)?.overtimeHours" class="absolute top-1 right-1 w-2 h-2 bg-white rounded-full border border-slate-400/30 animate-pulse"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
             <div class="flex items-center gap-6">
                <div class="flex items-center gap-2"><div class="w-3 h-3 bg-emerald-500 rounded"></div><span class="text-[8px] font-black uppercase">Present</span></div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 bg-rose-500 rounded"></div><span class="text-[8px] font-black uppercase">Absent</span></div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 bg-slate-200 rounded"></div><span class="text-[8px] font-black uppercase">Not Marked</span></div>
             </div>
             <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Note: Clicking a cell toggles "Present" status on the Universal Grid.</p>
          </div>
        </div>

        <!-- Teleported Bulk Header Actions Dropdown -->
        <Teleport to="body">
          <div v-if="activeHeaderDropdown" 
            class="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-200 w-56 py-3 animate-in fade-in zoom-in duration-200"
            :style="{ 
              top: `${dropdownPosition.top}px`, 
              left: `${dropdownPosition.left}px`,
              transform: 'translateX(-50%)'
            }"
          >
            <div class="px-4 pb-2 mb-2 border-b border-slate-100">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bulk Action: {{ activeHeaderDropdown.date }}</p>
            </div>
            
            <div class="px-2 space-y-1">
              <button 
                v-for="opt in statusOptions" 
                :key="opt.id"
                @click="bulkMarkStatus(activeHeaderDropdown.date, opt.id)"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group text-left"
              >
                <div :class="[opt.color, 'w-2 h-2 rounded-full']"></div>
                <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider group-hover:translate-x-1 transition-transform">{{ opt.id }}</span>
              </button>
            </div>
          </div>
        </Teleport>

        <!-- Teleported Premium Status Dropdown -->
        <Teleport to="body">
          <div 
            v-if="activeDropdownCell"
            class="fixed z-[999] w-48 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_30px_100px_rgba(15,23,42,0.25)] border border-white p-2 animate-in fade-in zoom-in duration-300 pointer-events-auto"
            :style="{ 
              top: `${dropdownPosition.direction === 'down' ? dropdownPosition.top : dropdownPosition.top - 20}px`,
              left: `${dropdownPosition.left}px`,
              transform: `translateX(-50%) ${dropdownPosition.direction === 'up' ? 'translateY(-100%)' : ''}`
            }"
            @click.stop
          >
             <!-- Pointer Beak -->
             <div 
               class="absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-100 rotate-45 z-[-1]"
               :class="dropdownPosition.direction === 'down' ? '-top-2' : '-bottom-2 border-b border-r border-l-0 border-t-0'"
             ></div>

             <!-- Standard List Mode -->
             <div v-if="!isOvertimeInput" class="max-h-[220px] overflow-y-auto custom-scrollbar space-y-0.5">
                <p class="px-3 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 mb-1">Set Quick Status</p>
                <button 
                  v-for="opt in statusOptions" 
                  :key="opt.id"
                  @click="opt.id === 'Overtime' ? initiateOvertime($event) : markStatus(activeDropdownCell.empId, opt.id, activeDropdownCell.date)"
                  class="w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group/row transition-all relative overflow-hidden mb-1 border border-transparent hover:border-slate-200"
                  :class="[
                    adminStore.attendance.find(a => String(a.employeeId) === String(activeDropdownCell.empId) && a.date === activeDropdownCell.date)?.status === opt.id 
                    ? 'bg-slate-50 border-slate-200 shadow-sm' 
                    : 'hover:bg-slate-50/50'
                  ]"
                >
                   <div class="flex items-center gap-3">
                      <div :class="['w-3 h-3 rounded-lg shadow-sm', opt.color]"></div>
                      <span class="text-[11px] font-black uppercase tracking-widest" :class="adminStore.attendance.find(a => String(a.employeeId) === String(activeDropdownCell.empId) && a.date === activeDropdownCell.date)?.status === opt.id ? 'text-blue-600' : 'text-slate-600 group-hover/row:text-black'">{{ opt.id }}</span>
                   </div>
                   <div v-if="adminStore.attendance.find(a => String(a.employeeId) === String(activeDropdownCell.empId) && a.date === activeDropdownCell.date)?.status === opt.id" class="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                   <Plus v-if="opt.id === 'Overtime'" size="14" class="text-slate-300 group-hover/row:text-blue-400 group-hover/row:rotate-90 transition-all" />
                </button>
             </div>

             <!-- Overtime Hour Input Mode -->
             <div v-else class="p-4 space-y-5">
                <div class="flex items-center justify-between">
                   <div class="flex items-center gap-2">
                      <div class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></div>
                      <p class="text-[10px] font-black uppercase text-blue-600 tracking-[0.1em]">Overtime Entry</p>
                   </div>
                   <button @click="isOvertimeInput = false" class="text-slate-300 hover:text-red-500 transition-all"><XCircle size="20" /></button>
                </div>
                <div class="relative">
                   <input 
                     v-model.number="overtimeHours" 
                     type="number" 
                     min="0"
                     step="0.5"
                     placeholder="DAILY HRS" 
                     class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 text-base font-black text-center outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                     @focus="$event.target.select()"
                     @click.stop
                   />
                </div>
                <button 
                  @click="markStatus(activeDropdownCell.empId, 'Overtime', activeDropdownCell.date, { overtimeHours: overtimeHours })"
                  class="w-full py-5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl shadow-blue-500/30 active:scale-95"
                >Finalize OT</button>
             </div>
          </div>
        </Teleport>

        <!-- Payroll Tab: Nested View -->
        <table v-if="activeTab === 'payroll'" class="w-full text-left">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest w-48">Personnel</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Period</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Gross Earned</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Prev Balance</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Net Payable</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Status</th>
               <th class="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <template v-for="emp in adminStore.employees" :key="emp.id">
              <!-- Employee Main Row -->
              <tr 
                class="hover:bg-slate-50/50 transition-all cursor-pointer group"
                @click="openPayrollHistory(emp)"
              >
                <td class="px-8 py-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-black text-[10px] group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">
                       {{ emp.name.charAt(0) }}
                    </div>
                    <div>
                      <p class="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">{{ emp.name }}</p>
                      <p class="text-[9px] font-bold text-slate-500 uppercase tracking-widest"> {{ emp.employeeId || 'WDTHXXX' }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-8 py-3">
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">April 2026</span>
                </td>
                <td class="px-8 py-3 text-center">
                   <p class="text-[12px] font-black text-slate-900 tracking-tighter">₹{{ calculateDues(emp, getMonthName(selectedDate)).gross.toLocaleString() }}</p>
                </td>
                <td class="px-8 py-3 text-center">
                   <div class="flex flex-col items-center">
                      <p :class="[
                        'text-[12px] font-black tracking-tighter',
                        calculateDues(emp, getMonthName(selectedDate)).balance > 0 ? 'text-blue-600' : (calculateDues(emp, getMonthName(selectedDate)).balance < 0 ? 'text-rose-600' : 'text-slate-400')
                      ]">
                        {{ calculateDues(emp, getMonthName(selectedDate)).balance > 0 ? '+' : '' }}{{ calculateDues(emp, getMonthName(selectedDate)).balance.toLocaleString() }}
                      </p>
                      <span class="text-[8px] font-black uppercase text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">CarryForward</span>
                   </div>
                </td>
                <td class="px-8 py-3 text-center">
                   <div class="inline-block px-4 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
                      <p class="text-[13px] font-black text-emerald-600 tracking-tighter">₹{{ calculateDues(emp, getMonthName(selectedDate)).net.toLocaleString() }}</p>
                   </div>
                </td>
                <td class="px-8 py-3 text-center">
                  <div v-if="adminStore.payroll.find(p => String(p.employeeId) === String(emp.id) && p.month === 'April 2026' && !p.isAdvance)" class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                    Settled <CheckCircle2 size="10" />
                  </div>
                  <div v-else class="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">
                    Calculated
                  </div>
                </td>
                <td class="px-8 py-3 text-right">
                  <button 
                    @click.stop="openPaymentModal(emp, 'April 2026')"
                    class="bg-blue-600 text-white px-5 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-blue-500/20"
                  >
                    Issue Payment
                  </button>
                </td>
              </tr>

              </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Payroll History Modal -->
    <Teleport to="body">
      <div v-if="showPayrollHistoryModal && selectedEmployeeForPayroll" class="fixed inset-0 z-[130] flex items-center justify-center p-6">
         <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-md" @click="showPayrollHistoryModal = false"></div>
         <div class="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[85vh]">
            <!-- Header -->
            <div class="p-8 pb-6 flex items-center justify-between bg-slate-50/50 border-b border-slate-100">
               <div class="flex items-center gap-4">
                  <div class="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black text-xl italic shadow-2xl shadow-black/20">
                     {{ selectedEmployeeForPayroll.name.charAt(0) }}
                  </div>
                  <div>
                     <h3 class="text-xl font-black uppercase italic tracking-tighter text-slate-900">{{ selectedEmployeeForPayroll.name }}</h3>
                      <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                        Disbursement Archive • ID: {{ selectedEmployeeForPayroll.employeeId }} 
                        <span class="text-slate-300 ml-2">Total Records: {{ adminStore.payroll.length }}</span>
                      </p>
                  </div>
               </div>
               <div class="flex items-center gap-3">
                  <button 
                     @click="sendLedgerEmail(selectedEmployeeForPayroll)"
                     :disabled="sendingEmail"
                     class="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                     title="Send Ledger via Email"
                  >
                     <Mail v-if="!sendingEmail" size="18" />
                     <Clock v-else size="18" class="animate-spin" />
                  </button>
                  <button 
                     @click="downloadPayrollPDF(selectedEmployeeForPayroll, filteredPayoutHistory)"
                     class="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-blue-500/20"
                     title="Export Ledger to PDF"
                  >
                     <FileDown size="18" />
                  </button>
                  <button @click="showPayrollHistoryModal = false" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><XCircle size="32" /></button>
               </div>
            </div>

            <!-- Filters -->
            <div class="px-8 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center gap-4">
               <div class="relative flex-1">
                  <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="16" />
                  <input 
                     v-model="historyFilters.search"
                     type="text" 
                     placeholder="Search reference or month..."
                     class="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
               </div>
               <select 
                  v-model="historyFilters.month"
                  class="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
               >
                  <option value="All">All Periods</option>
                  <option v-for="m in historyMonths" :key="m" :value="m">{{ m }}</option>
               </select>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4">
               <div class="space-y-4">
                  <div v-if="filteredPayoutHistory.length > 0" class="space-y-3">
                     <div 
                        v-for="pay in filteredPayoutHistory" 
                        :key="pay.id"
                        class="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col shadow-sm hover:border-blue-200 transition-all hover:translate-x-1"
                      >
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-8">
                            <div class="flex flex-col">
                              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Type & Method</p>
                              <div class="flex items-center gap-1.5">
                                <span :class="[
                                  'inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase border',
                                  pay.isAdvance ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                ]">
                                  {{ pay.isAdvance ? 'Advance' : 'Settlement' }}
                                </span>
                                <span v-if="pay.paymentMethod" class="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                  {{ pay.paymentMethod }}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Period</p>
                              <p class="text-[11px] font-black text-slate-900 uppercase italic">{{ pay.month }}</p>
                            </div>
                            <div>
                              <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Settlement Date</p>
                              <p class="text-[11px] font-black text-slate-900 uppercase">
                                {{ pay.createdAt ? new Date(pay.createdAt).toLocaleDateString() : (pay.date || '-') }}
                              </p>
                            </div>
                          </div>
                          <div class="text-right">
                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount Paid</p>
                            <p class="text-base font-black text-slate-900 tracking-tighter">₹{{ pay.amount.toLocaleString() }}</p>
                          </div>
                        </div>
                        
                        <!-- Transaction Reference & Receipt Attachment -->
                        <div v-if="pay.transactionId || pay.receiptUrl" class="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                          <div v-if="pay.transactionId" class="flex items-center gap-2">
                             <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                             <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref:</span>
                             <span class="text-[10px] font-bold text-slate-600 tracking-tight">{{ pay.transactionId }}</span>
                          </div>
                          <a 
                            v-if="pay.receiptUrl" 
                            :href="pay.receiptUrl" 
                            target="_blank"
                            class="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors border border-blue-100"
                          >
                             <Paperclip size="12" />
                             <span class="text-[9px] font-black uppercase tracking-widest">View Receipt</span>
                          </a>
                        </div>
                      </div>
                  </div>
                  <div v-else class="text-center py-20 px-10">
                     <div class="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-100">
                        <CreditCard size="32" />
                     </div>
                     <p class="text-xs font-black text-slate-400 uppercase tracking-[0.1em]">No Transaction Records Found</p>
                     <p class="text-[10px] text-slate-300 uppercase tracking-widest mt-2 leading-relaxed">This employee has no historical settlements in the Dynamite vault for previous periods.</p>
                  </div>
               </div>
            </div>

            <!-- Footer -->
            <div class="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
               <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Institutional Payroll Ledger • Secure Access Only</p>
               <button @click="showPayrollHistoryModal = false" class="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10">Close Record</button>
            </div>
         </div>
      </div>
    </Teleport>

  

    <!-- Advanced Onboarding Modal -->
    <Teleport to="body">
      <div v-if="showAddModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
         <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-md" @click="showAddModal = false"></div>
         <div class="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <!-- Header -->
            <div class="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
               <div>
                  <h3 class="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Personnel Dossier</h3>
                  <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{{ modalMode === 'add' ? 'Onboarding New Collective Member' : 'Updating Active Personnel Record' }}</p>
               </div>
               <button @click="showAddModal = false" class="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-300 hover:text-rose-500"><XCircle size="24" /></button>
            </div>

            <!-- Tab Navigation -->
            <div class="flex items-center px-8 bg-slate-50/50 border-b border-slate-100 gap-8">
               <button 
                 v-for="t in [
                   { id: 'personal', label: 'Identity & Family', icon: UserPlus },
                   { id: 'professional', label: 'Professional Profile', icon: CreditCard },
                   { id: 'documents', label: 'Digital KYC Vault', icon: ShieldCheck }
                 ]"
                 :key="t.id"
                 @click="onboardingTab = t.id"
                 class="py-5 text-[10px] font-black uppercase tracking-widest relative transition-all"
                 :class="onboardingTab === t.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'"
               >
                 <span class="flex items-center gap-2">
                   <component :is="t.icon" size="14" />
                   {{ t.label }}
                 </span>
                 <div v-if="onboardingTab === t.id" class="absolute bottom-0 inset-x-0 h-1 bg-blue-600 rounded-t-full"></div>
               </button>
            </div>
            
            <!-- Tab Content Area -->
            <div class="flex-1 p-10 overflow-y-auto custom-scrollbar bg-white">
               
               <!-- TAB 1: PERSONAL & FAMILY -->
               <div v-if="onboardingTab === 'personal'" class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Full Name</label>
                        <input v-model="newEmployee.name" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="e.g. ARYA SHARMA">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Group</label>
                        <select v-model="newEmployee.bloodGroup" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                           <option v-for="bg in bloodGroups" :key="bg" :value="bg">{{ bg }}</option>
                        </select>
                     </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Mother's Name</label>
                        <input v-model="newEmployee.motherName" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Enter name">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Father's (or Guardian) Name</label>
                        <input v-model="newEmployee.fatherName" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Enter name">
                     </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Marital Status</label>
                        <select v-model="newEmployee.maritalStatus" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                           <option v-for="ms in maritalStatuses" :key="ms" :value="ms">{{ ms }}</option>
                        </select>
                     </div>
                     <div v-if="newEmployee.maritalStatus === 'Married'" class="space-y-2 animate-in zoom-in duration-300">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Spouse / Husband Name</label>
                        <input v-model="newEmployee.spouseName" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Enter spouse name">
                     </div>
                  </div>

                  <div class="space-y-2">
                     <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Residential Address</label>
                     <textarea v-model="newEmployee.address" rows="3" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all custom-scrollbar" placeholder="Enter complete physical address"></textarea>
                  </div>
               </div>

               <!-- TAB 2: PROFESSIONAL PROFILE -->
               <div v-if="onboardingTab === 'professional'" class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Workforce Designation</label>
                        <select v-model="newEmployee.designation" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                           <option v-for="des in designations" :key="des" :value="des">{{ des }}</option>
                        </select>
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee Type</label>
                        <select v-model="newEmployee.employeeType" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                           <option v-for="et in employeeTypes" :key="et" :value="et">{{ et }}</option>
                        </select>
                     </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience Level</label>
                        <select v-model="newEmployee.experienceLevel" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                           <option v-for="el in experienceLevels" :key="el" :value="el">{{ el }}</option>
                        </select>
                     </div>
                     <div v-if="newEmployee.experienceLevel === 'Experienced'" class="space-y-2 animate-in zoom-in duration-300">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Years of Experience</label>
                        <input v-model.number="newEmployee.experienceYears" type="number" min="0" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                     </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Compensation (₹)</label>
                        <input v-model.number="newEmployee.salary" type="number" min="0" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Joining Date</label>
                        <input v-model="newEmployee.joinDate" type="date" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all">
                     </div>
                  </div>

                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</label>
                        <input v-model="newEmployee.phone" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="+91 XXXX XXX XXX">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Email</label>
                        <input v-model="newEmployee.email" type="email" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="name@weardynamite.com">
                     </div>
                  </div>
               </div>

               <!-- TAB 3: DIGITAL KYC VAULT -->
               <div v-if="onboardingTab === 'documents'" class="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div class="grid grid-cols-2 gap-8">
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Aadhaar Card Number</label>
                        <input v-model="newEmployee.aadharNumber" type="text" maxlength="12" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="XXXX XXXX XXXX">
                     </div>
                     <div class="space-y-2">
                        <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">PAN Card Number</label>
                        <input v-model="newEmployee.panNumber" type="text" maxlength="10" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="ABCDE1234F">
                     </div>
                  </div>

                  <!-- Multi-File Upload Grid -->
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     <!-- Photo -->
                     <div class="space-y-3">
                        <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Profile Portrait</p>
                        <div class="relative group/up w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden hover:border-blue-500 transition-all">
                           <img v-if="newEmployee.photoUrl" :src="newEmployee.photoUrl" class="w-full h-full object-cover">
                           <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                              <Camera size="24" />
                              <span class="text-[8px] font-black mt-1">UPLOAD PHOTO</span>
                           </div>
                           <input type="file" @change="handleFileUpload($event, 'photoUrl')" class="absolute inset-0 opacity-0 cursor-pointer">
                           <div v-if="isUploading" class="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                              <div class="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                           </div>
                        </div>
                     </div>

                     <!-- Aadhaar Photo -->
                     <div class="space-y-3">
                        <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Aadhaar Card</p>
                        <div class="relative group/up w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden hover:border-blue-500 transition-all">
                           <img v-if="newEmployee.aadharUrl" :src="newEmployee.aadharUrl" class="w-full h-full object-cover">
                           <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                              <ShieldCheck size="24" />
                              <span class="text-[8px] font-black mt-1">UPLOAD FRONT/BACK</span>
                           </div>
                           <input type="file" @change="handleFileUpload($event, 'aadharUrl')" class="absolute inset-0 opacity-0 cursor-pointer">
                        </div>
                     </div>

                     <!-- PAN Photo -->
                     <div class="space-y-3">
                        <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">PAN Card</p>
                        <div class="relative group/up w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden hover:border-blue-500 transition-all">
                           <img v-if="newEmployee.panUrl" :src="newEmployee.panUrl" class="w-full h-full object-cover">
                           <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                              <CreditCard size="24" />
                              <span class="text-[8px] font-black mt-1">UPLOAD COPY</span>
                           </div>
                           <input type="file" @change="handleFileUpload($event, 'panUrl')" class="absolute inset-0 opacity-0 cursor-pointer">
                        </div>
                     </div>

                     <!-- Other Docs -->
                     <div class="space-y-3">
                        <p class="text-[9px] font-black uppercase text-slate-400 tracking-widest text-center">Other Logs</p>
                        <div class="relative group/up w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden hover:border-blue-500 transition-all">
                           <img v-if="newEmployee.otherDocUrl" :src="newEmployee.otherDocUrl" class="w-full h-full object-cover">
                           <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                              <Plus size="24" />
                              <span class="text-[8px] font-black mt-1">UPLOAD MISC</span>
                           </div>
                           <input type="file" @change="handleFileUpload($event, 'otherDocUrl')" class="absolute inset-0 opacity-0 cursor-pointer">
                        </div>
                     </div>
                  </div>

                  <div class="space-y-2">
                     <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Driving License (Optional)</label>
                     <input v-model="newEmployee.drivingLicense" type="text" class="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white transition-all" placeholder="Enter license number">
                  </div>
               </div>

            </div>

            <!-- Footer Footer (Actions) -->
            <div class="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
               <div class="flex items-center gap-2">
                  <div class="flex -space-x-2">
                    <div v-for="i in 3" :key="i" class="w-6 h-6 rounded-full border-2 border-white" :class="onboardingTab === ['personal','professional','documents'][i-1] ? 'bg-blue-600' : 'bg-slate-200'"></div>
                  </div>
                  <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Section {{ onboardingTab === 'personal' ? '1' : onboardingTab === 'professional' ? '2' : '3' }} of 3</p>
               </div>
               
               <div class="flex items-center gap-4">
                  <button @click="showAddModal = false" class="text-[10px] font-black uppercase text-slate-400 hover:text-rose-500 tracking-widest">Discard Form</button>
                  <button 
                    v-if="onboardingTab === 'documents'"
                    @click="saveEmployee" 
                    :disabled="isUploading"
                    class="bg-black text-white px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-blue-600 shadow-2xl shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    Commit to Workforce Vault
                  </button>
                  <button 
                    v-else
                    @click="onboardingTab = onboardingTab === 'personal' ? 'professional' : 'documents'"
                    class="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all"
                  >
                    Next Concept Phase
                  </button>
               </div>
            </div>
         </div>
      </div>
    </Teleport>

    <!-- Personnel Details Modal -->
    <Teleport to="body">
      <div v-if="showDetailsModal && selectedEmployeeForDetails" class="fixed inset-0 z-[120] flex items-center justify-center p-6">
         <div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" @click="showDetailsModal = false"></div>
         <div class="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
            <!-- Modal Header -->
            <div class="p-8 pb-4 flex items-center justify-between">
               <div>
                  <h2 class="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Personnel Dossier</h2>
                  <div class="flex items-center gap-3 mt-1">
                     <span class="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 tracking-widest">{{ selectedEmployeeForDetails.employeeId }}</span>
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">• Official Collective Record</span>
                  </div>
               </div>
               <button @click="showDetailsModal = false" class="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><XCircle size="32" /></button>
            </div>

            <div class="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0">
               <div class="grid grid-cols-12 gap-10">
                  <!-- Left Pane: Identification -->
                  <div class="col-span-12 lg:col-span-4 space-y-8">
                     <div class="relative rounded-3xl overflow-hidden aspect-square shadow-2xl border-4 border-white">
                        <img :src="selectedEmployeeForDetails.photoUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop'" class="w-full h-full object-cover">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div class="absolute bottom-4 left-4 right-4">
                           <p class="text-lg font-black text-white italic tracking-tighter uppercase leading-none">{{ selectedEmployeeForDetails.name }}</p>
                           <p class="text-[9px] font-black text-white/70 uppercase tracking-widest mt-1">{{ selectedEmployeeForDetails.role }}</p>
                        </div>
                     </div>

                     <div class="bg-slate-50 p-6 rounded-3xl space-y-4">
                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-2">
                           <Info size="12" /> Primary Contact
                        </h4>
                        <div class="space-y-3">
                           <div>
                              <p class="text-[8px] font-black text-slate-400 uppercase">Personal Email</p>
                              <p class="text-xs font-bold text-slate-700">{{ selectedEmployeeForDetails.email }}</p>
                           </div>
                           <div>
                              <p class="text-[8px] font-black text-slate-400 uppercase">Contact Number</p>
                              <p class="text-xs font-bold text-slate-700">+91 {{ selectedEmployeeForDetails.phone }}</p>
                           </div>
                           <div>
                              <p class="text-[8px] font-black text-slate-400 uppercase">Current Address</p>
                              <p class="text-xs font-bold text-slate-700 leading-relaxed">{{ selectedEmployeeForDetails.address }}</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <!-- Right Pane: Professional & KYC -->
                  <div class="col-span-12 lg:col-span-8 space-y-10">
                     <!-- Professional Insights -->
                     <div class="space-y-6">
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-3 flex items-center justify-between">
                           <span>SECTION 01: Professional Metric</span>
                           <Briefcase size="14" class="text-slate-300" />
                        </h4>
                        <div class="grid grid-cols-3 gap-6">
                           <div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monthly CTC</p>
                              <p class="text-lg font-black text-slate-900 mt-1">₹{{ selectedEmployeeForDetails.salary.toLocaleString() }}</p>
                           </div>
                           <div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Employee Type</p>
                              <p class="text-lg font-black text-slate-900 mt-1 italic">{{ selectedEmployeeForDetails.employeeType }}</p>
                           </div>
                           <div class="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                              <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Joinee Date</p>
                              <p class="text-lg font-black text-slate-900 mt-1">{{ selectedEmployeeForDetails.joinDate }}</p>
                           </div>
                        </div>
                        <div class="grid grid-cols-2 gap-6">
                           <div class="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm"><Database size="18" /></div>
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Experience</p>
                                 <p class="text-xs font-black uppercase tracking-widest text-slate-700">{{ selectedEmployeeForDetails.experienceLevel || 'Fresher' }} ({{ selectedEmployeeForDetails.experienceYears || 0 }}Y)</p>
                              </div>
                           </div>
                           <div class="bg-slate-50 p-4 rounded-2xl flex items-center gap-4">
                              <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><UserCheck size="18" /></div>
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">System Status</p>
                                 <p class="text-xs font-black uppercase tracking-widest text-emerald-600">{{ selectedEmployeeForDetails.status }}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <!-- Identity Registry -->
                     <div class="space-y-6">
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-indigo-600 pl-3 flex items-center justify-between">
                           <span>SECTION 02: Biological Registry</span>
                           <IdCard size="14" class="text-slate-300" />
                        </h4>
                        <div class="grid grid-cols-2 gap-6 bg-slate-50 rounded-3xl p-6">
                           <div class="space-y-4">
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Mother's Name</p>
                                 <p class="text-xs font-black uppercase text-slate-700">{{ selectedEmployeeForDetails.motherName || 'N/A' }}</p>
                              </div>
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Father's Name</p>
                                 <p class="text-xs font-black uppercase text-slate-700">{{ selectedEmployeeForDetails.fatherName || 'N/A' }}</p>
                              </div>
                           </div>
                           <div class="space-y-4">
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Blood Group</p>
                                 <p class="text-xs font-black uppercase text-slate-700">{{ selectedEmployeeForDetails.bloodGroup || 'N/A' }}</p>
                              </div>
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Marital Status</p>
                                 <p class="text-xs font-black uppercase text-slate-700">{{ selectedEmployeeForDetails.maritalStatus }} {{ selectedEmployeeForDetails.spouseName ? `(${selectedEmployeeForDetails.spouseName})` : '' }}</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <!-- KYC Ledger -->
                     <div class="space-y-6">
                        <h4 class="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-emerald-600 pl-3 flex items-center justify-between">
                           <span>SECTION 03: Digital KYC Ledger</span>
                           <ShieldCheck size="14" class="text-slate-300" />
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group/kyc">
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">Aadhaar Vault</p>
                                 <p class="text-sm font-black tracking-widest text-slate-900">{{ selectedEmployeeForDetails.aadharNumber ? selectedEmployeeForDetails.aadharNumber.replace(/(\d{4})/g, '$1 ') : 'NOT SET' }}</p>
                              </div>
                              <button v-if="selectedEmployeeForDetails.aadharUrl" @click="window.open(selectedEmployeeForDetails.aadharUrl)" class="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg group-hover/kyc:scale-110 transition-all"><Eye size="16" /></button>
                           </div>
                           <div class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group/kyc">
                              <div>
                                 <p class="text-[8px] font-black text-slate-400 uppercase">PAN Vault</p>
                                 <p class="text-sm font-black tracking-widest text-slate-900">{{ selectedEmployeeForDetails.panNumber || 'NOT SET' }}</p>
                              </div>
                              <button v-if="selectedEmployeeForDetails.panUrl" @click="window.open(selectedEmployeeForDetails.panUrl)" class="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg group-hover/kyc:scale-110 transition-all"><Eye size="16" /></button>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- Modal Footer -->
            <div class="p-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
               <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] italic">DYNAMITE COLLECTIVE PERSONNEL SYSTEM • DATA ENCRYPTED</p>
               <div class="flex items-center gap-4">
                  <button @click="downloadEmployeePDF(selectedEmployeeForDetails.employeeId || selectedEmployeeForDetails.id, selectedEmployeeForDetails.name)" class="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-500/20 flex items-center gap-2">
                     <FileDown size="16" />
                     Download Official Dossier
                  </button>
                  <button @click="openEditModal(selectedEmployeeForDetails)" class="bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-black/10">
                     Edit Metadata
                  </button>
               </div>
            </div>
         </div>
      </div>
    </Teleport>

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

    <!-- Custom Confirmation Modal Overlay -->
    <Teleport to="body">
      <div v-if="confirmModal.show" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" @click="confirmModal.show = false"></div>
        <div class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
          <div class="p-8">
            <div class="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6">
              <Plus class="w-8 h-8 text-rose-500 rotate-45" />
            </div>
            <h1 class="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">{{ confirmModal.title }}</h1>
            <p class="text-slate-500 text-[13px] font-medium leading-relaxed">{{ confirmModal.message }}</p>
          </div>
          <div class="p-6 bg-slate-50 flex gap-3">
            <button 
              @click="confirmModal.show = false"
              class="flex-1 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-[12px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              @click="async () => { await confirmModal.action(); confirmModal.show = false; }"
              class="flex-1 px-6 py-3.5 rounded-2xl bg-slate-900 text-white text-[12px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
     </Teleport>

     <!-- Salary Disbursement Modal -->
     <Teleport to="body">
       <div v-if="showPaymentModal && selectedEmployeeForPayment" class="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md" @click="showPaymentModal = false"></div>
          <div class="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
             <!-- Modal Header -->
             <div class="p-8 pb-0 flex items-center justify-between">
                <div>
                   <h3 class="text-xl font-black uppercase italic tracking-tighter text-slate-900">Financial Disbursement</h3>
                   <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Personnel: {{ selectedEmployeeForPayment.name }}</p>
                </div>
                <button @click="showPaymentModal = false" class="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size="24" /></button>
             </div>

             <div class="p-8 space-y-6">
                <!-- Amount Entry -->
                <div class="space-y-2">
                   <div class="flex items-center justify-between">
                      <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Payout Amount (₹)</label>
                      <span class="text-[9px] font-black text-blue-600 uppercase">CTC Limit: ₹{{ selectedEmployeeForPayment.salary.toLocaleString() }}</span>
                   </div>
                   <input 
                      v-model.number="paymentForm.amount"
                      type="number" 
                      class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-2xl font-black text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="0.00"
                   />
                   <p v-if="paymentForm.amount > selectedEmployeeForPayment.salary" class="text-[9px] font-black text-rose-500 uppercase mt-1 italic">
                     Warning: Disbursement exceeds Monthly CTC threshold.
                   </p>
                </div>

                <!-- Payment Method -->
                 <div class="grid grid-cols-2 gap-4">
                    <button 
                       @click="paymentForm.paymentMethod = 'Cash'"
                       :class="[
                          'p-4 rounded-2xl border transition-all flex flex-col items-center gap-2',
                          paymentForm.paymentMethod === 'Cash' ? 'bg-black border-black text-white shadow-xl scale-[1.02]' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                       ]"
                    >
                       <DollarSign size="20" />
                       <span class="text-[10px] font-black uppercase tracking-widest">Cash Payment</span>
                    </button>
                    <button 
                       @click="paymentForm.paymentMethod = 'Online'"
                       :class="[
                          'p-4 rounded-2xl border transition-all flex flex-col items-center gap-2',
                          paymentForm.paymentMethod === 'Online' ? 'bg-blue-600 border-blue-600 text-white shadow-xl scale-[1.02]' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                       ]"
                    >
                       <Briefcase size="20" />
                       <span class="text-[10px] font-black uppercase tracking-widest">Online Transfer</span>
                    </button>
                 </div>

                 <!-- Online Specifics -->
                 <div v-if="paymentForm.paymentMethod === 'Online'" class="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div class="space-y-2">
                       <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Transaction Reference</label>
                       <input 
                          v-model="paymentForm.transactionId"
                          type="text" 
                          class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                          placeholder="Bank UTR / Transaction ID"
                       />
                    </div>
                 </div>

                 <!-- Attachment / Receipt -->
                 <div class="space-y-4">
                    <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Payment Evidence / Receipt</label>
                    <div class="flex items-center gap-4">
                       <div 
                          class="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 group relative cursor-pointer"
                          @click="$refs.receiptUpload.click()"
                       >
                          <img v-if="paymentForm.receiptUrl" :src="paymentForm.receiptUrl" class="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          <div v-else class="flex flex-col items-center gap-1 text-slate-400">
                             <Camera size="20" />
                             <span class="text-[8px] font-black uppercase">Attach</span>
                          </div>
                          <div v-if="isUploading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                             <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                       </div>
                       <div class="flex-1">
                          <p class="text-[10px] font-black text-slate-900 uppercase">Screenshot or PDF</p>
                          <p class="text-[9px] text-slate-400 font-medium uppercase mt-1 leading-relaxed">Securely stored in central vault for audit transparency.</p>
                          <input type="file" ref="receiptUpload" class="hidden" @change="handlePayrollAttachment" accept="image/*,application/pdf" />
                       </div>
                    </div>
                 </div>

                 <!-- Salary Advance? -->
                 <div class="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 flex items-center justify-between">
                    <div>
                       <h4 class="text-[11px] font-black text-indigo-900 uppercase tracking-tight">Salary Advance?</h4>
                       <p class="text-[9px] text-indigo-400 font-black uppercase mt-0.5 tracking-tighter">If enabled, this will reduce from next month's salary.</p>
                    </div>
                    <button 
                       @click="paymentForm.isAdvance = !paymentForm.isAdvance"
                       :class="[
                          'w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner',
                          paymentForm.isAdvance ? 'bg-indigo-600' : 'bg-slate-200'
                       ]"
                    >
                       <div 
                          :class="[
                             'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all duration-300 transform shadow-md',
                             paymentForm.isAdvance ? 'translate-x-6' : 'translate-x-0'
                          ]"
                       ></div>
                    </button>
                 </div>

                <!-- Narrative Memo -->
                <div class="space-y-2">
                   <label class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Transaction Memo</label>
                   <textarea 
                      v-model="paymentForm.note"
                      rows="2"
                      class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all resize-none"
                      placeholder="Add institutional narrative..."
                   ></textarea>
                </div>

                <button 
                   @click="submitPayment"
                   class="w-full bg-black text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-3"
                   :disabled="adminStore.loading"
                >
                   <CreditCard size="18" />
                   Confirm Disbursement
                </button>
             </div>
          </div>
       </div>
     </Teleport>
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
