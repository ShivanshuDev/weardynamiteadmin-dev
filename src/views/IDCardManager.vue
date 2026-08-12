<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { 
  School, 
  User, 
  Phone, 
  MapPin, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  Printer, 
  RefreshCw, 
  Layers, 
  Image as ImageIcon,
  ChevronDown,
  Eye,
  Settings
} from 'lucide-vue-next'

const adminStore = useAdminStore()

// Toggle states for Collapsing Sections
const isSettingsExpanded = ref(true)
const isTemplateExpanded = ref(true)
const isFormExpanded = ref(true)

// State
const isUploadingTemplate = ref(false)
const isUploadingPhoto = ref(false)
const isUploadingSignature = ref(false)
const editingIndex = ref(null)

const schoolDetails = ref({
  schoolId: 'shaheed_inter_college',
  name: 'शहीद इण्टर कालेज',
  address: 'मधुबन- मऊ, 221603',
  phone: '9415843245',
  session: '2026-27',
  principalTitle: 'Principal',
  startSrNo: '0001', // Customizable starting serial number
  showHeader: false, // Default false: template already contains header, session, signature, and principal title
  templateUrl: '', 
  signatureUrl: '' 
})

const studentForm = ref({
  name: '',
  srNo: '',
  fatherName: '',
  class: '',
  section: '',
  dob: '',
  phone: '',
  address: '',
  photoUrl: ''
})

const studentsList = ref([])
const selectedStudentIndex = ref(0)

const filters = ref({
  class: '',
  section: '',
  name: '',
  phone: '',
  fatherName: ''
})

// Computed
const selectedStudent = computed(() => {
  if (!studentsList.value || studentsList.value.length === 0) return null
  return studentsList.value[selectedStudentIndex.value] || studentsList.value[0] || null
})

// Dynamic real-time preview computation
const activePreviewStudent = computed(() => {
  const form = studentForm.value || {}
  const school = schoolDetails.value || {}
  
  // Check if any field in studentForm is currently filled/active
  const isFormActive = form.name || 
                       form.srNo || 
                       form.fatherName || 
                       form.class || 
                       form.section || 
                       form.dob || 
                       form.phone || 
                       form.address || 
                       form.photoUrl
                       
  if (isFormActive) {
    return {
      name: form.name || 'STUDENT NAME',
      srNo: form.srNo || school.startSrNo || '0001',
      fatherName: form.fatherName || "FATHER'S NAME",
      class: form.class || 'CLASS',
      section: form.section || 'SEC',
      dob: form.dob || 'DD/MM/YYYY',
      phone: form.phone || 'MOBILE NO',
      address: form.address || 'STUDENT ADDRESS',
      photoUrl: form.photoUrl || ''
    }
  }
  
  if (selectedStudent.value) {
    return {
      name: selectedStudent.value.name || 'STUDENT NAME',
      srNo: selectedStudent.value.srNo || school.startSrNo || '0001',
      fatherName: selectedStudent.value.fatherName || "FATHER'S NAME",
      class: selectedStudent.value.class || 'CLASS',
      section: selectedStudent.value.section || 'SEC',
      dob: selectedStudent.value.dob || 'DD/MM/YYYY',
      phone: selectedStudent.value.phone || 'MOBILE NO',
      address: selectedStudent.value.address || 'STUDENT ADDRESS',
      photoUrl: selectedStudent.value.photoUrl || ''
    }
  }
  
  // Default fallback placeholders
  return {
    name: 'STUDENT NAME',
    srNo: school.startSrNo || '0001',
    fatherName: "FATHER'S NAME",
    class: 'CLASS',
    section: 'SEC',
    dob: 'DD/MM/YYYY',
    phone: 'MOBILE NO',
    address: 'STUDENT ADDRESS',
    photoUrl: ''
  }
})

// Database fetch logic
const fetchStudents = async () => {
  const payload = {
    schoolId: schoolDetails.value.schoolId,
    class: filters.value.class,
    section: filters.value.section,
    name: filters.value.name,
    phone: filters.value.phone,
    fatherName: filters.value.fatherName
  }
  
  // Remove empty values
  Object.keys(payload).forEach(key => {
    if (payload[key] === undefined || payload[key] === '') {
      delete payload[key]
    }
  })

  try {
    const list = await adminStore.fetchIdCardStudents(payload)
    studentsList.value = list
  } catch (e) {
    console.error('Failed to load students list:', e)
  }
}

let fetchTimeout = null
const debouncedFetch = () => {
  if (fetchTimeout) clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => {
    fetchStudents()
  }, 400)
}

let configTimeout = null
const autoSaveConfig = () => {
  if (configTimeout) clearTimeout(configTimeout)
  configTimeout = setTimeout(async () => {
    try {
      await adminStore.saveIdCardConfig(schoolDetails.value.schoolId, schoolDetails.value)
    } catch (e) {
      console.error('Failed to auto-save school settings:', e)
    }
  }, 1000)
}

// Methods
const handleTemplateUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploadingTemplate.value = true
  const localPreview = URL.createObjectURL(file)
  schoolDetails.value.templateUrl = localPreview

  try {
    const fileName = `idcard_template_${Date.now()}`
    const { uploadUrl, fileUrl } = await adminStore.getPresignedUrl(fileName, file.type, 'id-cards/templates')
    await adminStore.uploadToS3(uploadUrl, file)
    schoolDetails.value.templateUrl = fileUrl
    adminStore.showNotification('Success', 'ID Card template uploaded successfully.', 'success')
    autoSaveConfig()
  } catch (error) {
    console.error('Template upload failed:', error)
    adminStore.showNotification('Upload Error', 'Failed to store template in S3. Using local preview.', 'warning')
  } finally {
    isUploadingTemplate.value = false
  }
}

const handlePhotoUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploadingPhoto.value = true
  const localPreview = URL.createObjectURL(file)
  studentForm.value.photoUrl = localPreview

  try {
    const fileName = `student_photo_${Date.now()}`
    const { uploadUrl, fileUrl } = await adminStore.getPresignedUrl(fileName, file.type, 'id-cards/photos')
    await adminStore.uploadToS3(uploadUrl, file)
    studentForm.value.photoUrl = fileUrl
    adminStore.showNotification('Success', 'Student photo uploaded successfully.', 'success')
  } catch (error) {
    console.error('Photo upload failed:', error)
    adminStore.showNotification('Upload Error', 'Failed to store photo in S3. Using local preview.', 'warning')
  } finally {
    isUploadingPhoto.value = false
  }
}

const handleRowPhotoUpload = async (event, index) => {
  const file = event.target.files[0]
  if (!file) return
  
  const localPreview = URL.createObjectURL(file)
  studentsList.value[index].photoUrl = localPreview
  
  try {
    const fileName = `student_photo_${Date.now()}`
    const { uploadUrl, fileUrl } = await adminStore.getPresignedUrl(fileName, file.type, 'id-cards/photos')
    await adminStore.uploadToS3(uploadUrl, file)
    studentsList.value[index].photoUrl = fileUrl
    
    // Save student update to database
    await adminStore.saveIdCardStudent(schoolDetails.value.schoolId, studentsList.value[index])
    adminStore.showNotification('Success', 'Student photo updated successfully in database.', 'success')
  } catch (error) {
    console.error('Row photo upload failed:', error)
    adminStore.showNotification('Upload Error', 'Failed to store photo in S3. Using local preview.', 'warning')
  }
}

const handleSignatureUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploadingSignature.value = true
  const localPreview = URL.createObjectURL(file)
  schoolDetails.value.signatureUrl = localPreview

  try {
    const fileName = `principal_signature_${Date.now()}`
    const { uploadUrl, fileUrl } = await adminStore.getPresignedUrl(fileName, file.type, 'id-cards/signatures')
    await adminStore.uploadToS3(uploadUrl, file)
    schoolDetails.value.signatureUrl = fileUrl
    adminStore.showNotification('Success', 'Signature uploaded successfully.', 'success')
    autoSaveConfig()
  } catch (error) {
    console.error('Signature upload failed:', error)
    adminStore.showNotification('Upload Error', 'Failed to store signature in S3. Using local preview.', 'warning')
  } finally {
    isUploadingSignature.value = false
  }
}

const addStudent = async () => {
  // Validate that all fields are mandatory
  if (
    !studentForm.value.name ||
    !studentForm.value.fatherName ||
    !studentForm.value.class ||
    !studentForm.value.section ||
    !studentForm.value.dob ||
    !studentForm.value.phone ||
    !studentForm.value.address ||
    !studentForm.value.photoUrl
  ) {
    adminStore.showNotification(
      'Missing Fields', 
      'All student fields (Name, Father Name, Class, Section, D.O.B, Mobile, Address, and Photo) are mandatory.', 
      'error'
    )
    return
  }
  
  // Auto-generate Sr. No if empty
  let srNoVal = studentForm.value.srNo.trim()
  if (!srNoVal) {
    if (studentsList.value.length === 0) {
      srNoVal = schoolDetails.value.startSrNo || '0001'
    } else {
      let maxNum = 0
      let formatLength = 4
      studentsList.value.forEach(s => {
        const num = parseInt(s.srNo, 10)
        if (!isNaN(num)) {
          if (num > maxNum) {
            maxNum = num
            formatLength = s.srNo.length
          }
        }
      })
      
      if (maxNum === 0) {
        srNoVal = schoolDetails.value.startSrNo || '0001'
      } else {
        const nextNum = maxNum + 1
        srNoVal = String(nextNum).padStart(formatLength, '0')
      }
    }
  }
  
  const studentData = { 
    ...studentForm.value,
    srNo: srNoVal 
  }
  
  try {
    const saved = await adminStore.saveIdCardStudent(schoolDetails.value.schoolId, studentData)
    if (editingIndex.value !== null) {
      studentsList.value[editingIndex.value] = saved
      editingIndex.value = null
      adminStore.showNotification('Success', 'Student record updated in database.', 'success')
    } else {
      studentsList.value.unshift(saved)
      selectedStudentIndex.value = 0
      adminStore.showNotification('Success', 'Student record added successfully.', 'success')
    }
    clearForm()
  } catch (e) {
    console.error('Failed to save student:', e)
  }
}

const editStudent = (index) => {
  editingIndex.value = index
  studentForm.value = { ...studentsList.value[index] }
  isFormExpanded.value = true // Ensure expanded when editing
  // Scroll to form
  const element = document.getElementById('student-form-section')
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const deleteStudent = async (index) => {
  const student = studentsList.value[index]
  if (!student || !student.studentId) return
  
  if (confirm('Are you sure you want to delete this student record?')) {
    try {
      await adminStore.deleteIdCardStudent(schoolDetails.value.schoolId, student.studentId)
      studentsList.value.splice(index, 1)
      if (selectedStudentIndex.value >= studentsList.value.length) {
        selectedStudentIndex.value = Math.max(0, studentsList.value.length - 1)
      }
    } catch (e) {
      console.error('Delete student failed:', e)
    }
  }
}

const clearForm = () => {
  studentForm.value = {
    name: '',
    srNo: '',
    fatherName: '',
    class: '',
    section: '',
    dob: '',
    phone: '',
    address: '',
    photoUrl: ''
  }
  editingIndex.value = null
}

const clearAllStudents = async () => {
  if (confirm('Are you sure you want to clear all student records? This cannot be undone.')) {
    try {
      adminStore.loading = true
      for (const s of studentsList.value) {
        if (s.studentId) {
          await adminStore.deleteIdCardStudent(schoolDetails.value.schoolId, s.studentId)
        }
      }
      studentsList.value = []
      selectedStudentIndex.value = 0
      adminStore.showNotification('Success', 'All records cleared from database.', 'success')
    } catch (e) {
      console.error('Failed to clear students:', e)
    } finally {
      adminStore.loading = false
    }
  }
}

const selectStudent = (index) => {
  selectedStudentIndex.value = index
  // Clear form fields when explicitly selecting a database row to inspect, so they don't block the preview
  clearForm()
}

const triggerPrint = () => {
  window.print()
}

// Load persisted data from backend database
onMounted(async () => {
  try {
    const config = await adminStore.fetchIdCardConfig(schoolDetails.value.schoolId)
    if (config) {
      schoolDetails.value = { ...schoolDetails.value, ...config }
    }
  } catch (e) {
    console.error('Error fetching school config:', e)
  }
  await fetchStudents()
})

const handleSync = async () => {
  await fetchStudents()
  adminStore.showNotification('Success', 'Records synced with central database.', 'success')
}
</script>

<template>
  <div class="space-y-8 min-h-screen relative p-6 bg-slate-50">
    
    <!-- Print Container (Calibrated for 5.2cm x 8.5cm grid layout on A4 landscape sheet) -->
    <div class="hidden-print-container print-page-layout">
      <!-- Split the students list into chunks of 10 to enforce page breaks between A4 sheets -->
      <div 
        v-for="pageIndex in Math.ceil(studentsList.length / 10)" 
        :key="pageIndex" 
        class="print-only-grid"
      >
        <div 
          v-for="student in studentsList.slice((pageIndex - 1) * 10, pageIndex * 10)" 
          :key="student.srNo" 
          class="print-card-badge"
          :style="schoolDetails.templateUrl ? { backgroundImage: `url(${schoolDetails.templateUrl})` } : {}"
        >
          <!-- School Header (Only rendered if showHeader toggle is checked) -->
          <div v-if="schoolDetails && schoolDetails.showHeader" class="print-card-header">
            <div class="print-school-name">{{ schoolDetails.name }}</div>
            <div class="print-school-address">{{ schoolDetails.address }}</div>
            <div class="print-school-phone">MOB- {{ schoolDetails.phone }}</div>
          </div>

          <!-- Sr. No Block (Always printed, positioned left of photo) -->
          <div class="print-sr-no-block">
            <div class="print-sr-no-lbl">Sr. No</div>
            <div class="print-sr-no-val">{{ student.srNo }}</div>
          </div>

          <!-- Student Photo (Fits exactly inside template frame without Y-overflow) -->
          <img 
            :src="student.photoUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop'" 
            class="print-student-photo"
          />

          <!-- Student Name (Centered under photo) -->
          <div class="print-student-name">{{ student.name }}</div>

          <!-- Student Details (Left-aligned details with red labels & black values perfectly aligned) -->
          <div class="print-details-container">
            <div class="print-info-row">
              <span class="print-info-lbl-fixed">F. Name</span>
              <span class="print-info-colon">:</span>
              <span class="print-info-val print-wrap-text">{{ student.fatherName }}</span>
            </div>
            
            <div class="print-info-row print-row-split-aligned">
              <div class="print-class-col">
                <span class="print-info-lbl-fixed">Class</span>
                <span class="print-info-colon">:</span>
                <span class="print-info-val">{{ student.class }}</span>
              </div>
              <div class="print-sec-col">
                <span class="print-info-lbl-sec">Sec.</span>
                <span class="print-info-colon-sec">:</span>
                <span class="print-info-val">{{ student.section }}</span>
              </div>
            </div>

            <div class="print-info-row">
              <span class="print-info-lbl-fixed">D.O.B</span>
              <span class="print-info-colon">:</span>
              <span class="print-info-val">{{ student.dob }}</span>
            </div>

            <div class="print-info-row">
              <span class="print-info-lbl-fixed">Mobile</span>
              <span class="print-info-colon">:</span>
              <span class="print-info-val">{{ student.phone }}</span>
            </div>

            <div class="print-info-row print-address-row">
              <span class="print-info-lbl-fixed">Address</span>
              <span class="print-info-colon">:</span>
              <span class="print-info-val print-wrap-text">{{ student.address }}</span>
            </div>
          </div>

          <!-- Bottom Row: Session and Signature (Only rendered if showHeader toggle is checked) -->
          <div v-if="schoolDetails && schoolDetails.showHeader" class="print-card-footer">
            <div class="print-session">Session- {{ schoolDetails.session }}</div>
            <div class="print-signature-box">
              <img 
                v-if="schoolDetails.signatureUrl" 
                :src="schoolDetails.signatureUrl" 
                class="print-sig-image"
              />
              <div class="print-sig-title">{{ schoolDetails.principalTitle }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Header (Hidden on print) -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">ID Card Generator</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Batch generate A4 sheets containing exactly 10 vertical cards</p>
      </div>
      <div class="flex items-center gap-3">
        <router-link
          to="/id-cards/builder"
          class="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20"
        >
          <Settings size="14" />
          Template Builder
        </router-link>
        <button 
          @click="handleSync"
          class="bg-slate-800 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 flex items-center gap-2 transition-all shadow-md shadow-slate-900/10"
        >
          <RefreshCw size="14" />
          Sync Sessions
        </button>
        <button 
          @click="triggerPrint"
          :disabled="studentsList.length === 0"
          class="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Printer size="14" />
          Print ID Cards ({{ studentsList.length }})
        </button>
      </div>
    </div>

    <!-- Main Workspace (Hidden on print) -->
    <div class="grid grid-cols-1 xl:grid-cols-3 gap-8 no-print">
      
      <!-- LEFT COLUMN: Forms & Customizations -->
      <div class="xl:col-span-2 space-y-8">
        
        <!-- CARD 1: School/Institution Details -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-slate-50 pb-4">
            <div class="flex items-center gap-3">
              <div class="bg-blue-50 text-blue-600 p-2.5 rounded-xl">
                <School size="20" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">1. Institution & Signature Settings</h3>
                <p class="text-slate-400 text-xs font-semibold">Branding, session years, and principal authorization signature</p>
              </div>
            </div>
            
            <div class="flex items-center gap-4">
              <!-- Show Header toggle -->
              <label class="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  v-model="schoolDetails.showHeader"
                  @change="autoSaveConfig"
                  class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span class="text-xs font-black uppercase tracking-wider text-slate-500">Overlay Header & Footer</span>
              </label>

              <!-- Collapse Trigger Arrow -->
              <button 
                @click="isSettingsExpanded = !isSettingsExpanded" 
                class="text-slate-400 hover:text-slate-600 transition-colors"
                title="Toggle Section Visibility"
              >
                <ChevronDown 
                  class="transition-transform duration-200" 
                  :class="isSettingsExpanded ? 'rotate-180' : ''" 
                  size="20" 
                />
              </button>
            </div>
          </div>

          <div v-show="isSettingsExpanded" class="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all duration-200">
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">School Name</label>
              <input 
                v-model="schoolDetails.name"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="Enter School Name"
              />
            </div>
            
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">School Address</label>
              <input 
                v-model="schoolDetails.address"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="Enter Address"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact Number</label>
              <input 
                v-model="schoolDetails.phone"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="Enter Contact Number"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Session</label>
              <input 
                v-model="schoolDetails.session"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. 2026-27"
              />
            </div>

            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Signature Title</label>
              <input 
                v-model="schoolDetails.principalTitle"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. Principal"
              />
            </div>

            <!-- Auto-increment starting number config -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Serial No (Default)</label>
              <input 
                v-model="schoolDetails.startSrNo"
                @input="autoSaveConfig"
                class="w-full bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                placeholder="e.g. 0001"
              />
            </div>

            <!-- Upload Signature -->
            <div class="space-y-1">
              <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Authorization Signature</label>
              <div class="relative flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100/70 transition-all cursor-pointer overflow-hidden">
                <input 
                  type="file" 
                  accept="image/*"
                  @change="handleSignatureUpload"
                  class="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div v-if="isUploadingSignature" class="flex items-center gap-2">
                  <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-[9px] font-black uppercase text-slate-400">Uploading</span>
                </div>
                <div v-else class="flex items-center justify-between w-full">
                  <span class="text-xs font-bold text-slate-600 truncate">
                    {{ schoolDetails.signatureUrl ? 'Change Signature' : 'Upload Signature' }}
                  </span>
                  <img 
                    v-if="schoolDetails.signatureUrl" 
                    :src="schoolDetails.signatureUrl" 
                    class="h-6 object-contain bg-white rounded border px-1"
                  />
                  <Upload v-else size="14" class="text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 2: ID Card Template Background Upload -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-slate-50 pb-4">
            <div class="flex items-center gap-3">
              <div class="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                <Layers size="20" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">2. ID Card Template (Background)</h3>
                <p class="text-slate-400 text-xs font-semibold">Upload vertical template card design (Ratio matching uploaded template: ~1 : 1.63)</p>
              </div>
            </div>

            <!-- Collapse Trigger Arrow -->
            <button 
              @click="isTemplateExpanded = !isTemplateExpanded" 
              class="text-slate-400 hover:text-slate-600 transition-colors"
              title="Toggle Section Visibility"
            >
              <ChevronDown 
                class="transition-transform duration-200" 
                :class="isTemplateExpanded ? 'rotate-180' : ''" 
                size="20" 
              />
            </button>
          </div>

          <div v-show="isTemplateExpanded" class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center transition-all duration-200">
            <!-- Drag & Drop Uploader -->
            <div class="relative group border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl p-6 transition-all bg-slate-50/50 hover:bg-slate-50 text-center flex flex-col items-center justify-center cursor-pointer">
              <input 
                type="file" 
                accept="image/*"
                @change="handleTemplateUpload"
                class="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div v-if="isUploadingTemplate" class="space-y-2">
                <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p class="text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse">Uploading template...</p>
              </div>
              <div v-else class="space-y-2 text-slate-500 group-hover:text-indigo-600 transition-colors">
                <Upload size="28" class="mx-auto group-hover:scale-110 transition-transform" />
                <div>
                  <span class="text-xs font-black uppercase tracking-wider block">Upload Template Image</span>
                  <span class="text-[9px] font-medium text-slate-400 block mt-1">Vertical layout. Standard dimensions ~334x546px</span>
                </div>
              </div>
            </div>

            <!-- Preview Card -->
            <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-center min-h-[140px] relative overflow-hidden">
              <img 
                v-if="schoolDetails.templateUrl" 
                :src="schoolDetails.templateUrl" 
                class="max-h-[120px] rounded-lg object-contain shadow-sm"
              />
              <div v-else class="text-center text-slate-400 text-xs space-y-2">
                <ImageIcon size="24" class="mx-auto text-slate-300" />
                <p class="font-bold uppercase tracking-widest text-[9px]">No template uploaded</p>
                <p class="text-[9px] font-medium text-slate-400 leading-tight px-6">Upload background design above.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 3: Student Details Form -->
        <div id="student-form-section" class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6">
          <div class="flex items-center justify-between border-b border-slate-50 pb-4">
            <div class="flex items-center gap-3">
              <div class="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
                <User size="20" />
              </div>
              <div>
                <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">
                  {{ editingIndex !== null ? 'Modify Student Details' : '3. Add Student Records' }}
                </h3>
                <p class="text-slate-400 text-xs font-semibold">Enter student credentials (All fields are mandatory)</p>
              </div>
            </div>

            <div class="flex items-center gap-4">
              <button 
                v-if="editingIndex !== null" 
                @click="clearForm"
                class="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 mr-2"
              >
                <X size="14" /> Cancel Edit
              </button>

              <!-- Collapse Trigger Arrow -->
              <button 
                @click="isFormExpanded = !isFormExpanded" 
                class="text-slate-400 hover:text-slate-600 transition-colors"
                title="Toggle Section Visibility"
              >
                <ChevronDown 
                  class="transition-transform duration-200" 
                  :class="isFormExpanded ? 'rotate-180' : ''" 
                  size="20" 
                />
              </button>
            </div>
          </div>

          <div v-show="isFormExpanded" class="grid grid-cols-1 md:grid-cols-4 gap-6 transition-all duration-200">
            
            <!-- Photo Upload Box -->
            <div class="md:col-span-1 flex flex-col items-center justify-center">
              <label class="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2 self-start md:self-center">Student Photo *</label>
              <div class="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center group shadow-inner">
                <img 
                  v-if="studentForm.photoUrl" 
                  :src="studentForm.photoUrl" 
                  class="w-full h-full object-cover" 
                />
                <div v-else class="text-center text-slate-300 group-hover:text-emerald-500 transition-colors">
                  <User size="32" class="mx-auto group-hover:scale-105 transition-transform" />
                  <span class="text-[9px] font-black uppercase tracking-widest block mt-2">Upload Photo</span>
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  @change="handlePhotoUpload"
                  class="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <!-- Loader overlay -->
                <div v-if="isUploadingPhoto" class="absolute inset-0 bg-white/95 flex flex-col items-center justify-center space-y-1">
                  <div class="w-5 h-5 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span class="text-[8px] font-bold uppercase tracking-wider text-emerald-600 animate-pulse">Uploading</span>
                </div>
              </div>
            </div>

            <!-- Form Fields (Marked as Mandatory) -->
            <div class="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Student Name *</label>
                <input 
                  v-model="studentForm.name"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Full Name"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Sr. No (Leave blank for auto)</label>
                <input 
                  v-model="studentForm.srNo"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Auto-increment or custom"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Father's Name *</label>
                <input 
                  v-model="studentForm.fatherName"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Father's Name"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Class *</label>
                <input 
                  v-model="studentForm.class"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. 9"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Section *</label>
                <input 
                  v-model="studentForm.section"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. B"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Date of Birth (D.O.B) *</label>
                <input 
                  v-model="studentForm.dob"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. 27/01/2011"
                />
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Mobile Number *</label>
                <input 
                  v-model="studentForm.phone"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Mobile"
                />
              </div>
              
              <div class="sm:col-span-2 space-y-1">
                <label class="text-[10px] font-black uppercase tracking-widest text-rose-500">Student Address *</label>
                <input 
                  v-model="studentForm.address"
                  class="w-full bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:bg-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="Ahirauli, Madhuban, Mau -221603"
                />
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div v-show="isFormExpanded" class="flex items-center justify-end gap-3 pt-2">
            <button 
              @click="clearForm"
              class="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear Form
            </button>
            <button 
              @click="addStudent"
              class="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-md shadow-emerald-500/10"
            >
              <Plus size="14" />
              {{ editingIndex !== null ? 'Save Changes' : 'Add Student Row' }}
            </button>
          </div>
        </div>

      </div>

      <!-- RIGHT COLUMN: Realtime Live Badge Preview (Styled exactly to User's vertical layout template) -->
      <div class="xl:col-span-1">
        <div class="sticky top-6 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 flex flex-col items-center">
          <div class="w-full border-b border-slate-50 pb-4 text-center">
            <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">Live Badge Preview</h3>
            <p class="text-slate-400 text-xs font-semibold mt-0.5">Vertical badge aligned to school template</p>
          </div>

          <!-- Live Card Badge UI (Vertical screen preview, aspect ratio calibrated to template 52x85) -->
          <div v-if="activePreviewStudent" class="relative w-[216px] h-[353px] rounded-xl shadow-2xl overflow-hidden border border-slate-300 flex flex-col bg-white select-none transition-all duration-300 print-card-badge-base">
            <!-- Custom Template Background -->
            <div 
              v-if="schoolDetails && schoolDetails.templateUrl" 
              class="absolute inset-0 bg-cover bg-center z-0" 
              :style="{ backgroundImage: `url(${schoolDetails.templateUrl})` }"
            ></div>
            
            <!-- Fallback design overlay if no template -->
            <div v-else class="absolute inset-0 z-0 bg-gradient-to-b from-[#1e3a8a] via-[#1e40af] to-white flex flex-col justify-between">
              <div class="h-24 bg-[#1e3a8a] border-b border-amber-500/30"></div>
              <!-- Fallback photo frame outline -->
              <div class="absolute top-[24.1%] left-1/2 -translate-x-1/2 w-[66px] h-[77px] rounded border border-blue-900 bg-white"></div>
            </div>

            <!-- Card Header (Only visible if showHeader toggle is checked) -->
            <div v-if="schoolDetails && schoolDetails.showHeader" class="relative z-10 text-center text-white px-2 pt-2.5 space-y-0.5">
              <h4 class="screen-card-text font-black uppercase leading-tight line-clamp-2">
                {{ schoolDetails.name }}
              </h4>
              <p class="screen-card-text font-bold opacity-80 leading-none truncate">
                {{ schoolDetails.address }}
              </p>
              <p class="screen-card-text font-semibold opacity-70 leading-none">
                MOB- {{ schoolDetails.phone }}
              </p>
            </div>

            <!-- Sr. No Block (Always printed, positioned left of photo) -->
            <div class="absolute top-[32%] left-[6%] z-10 text-left font-sans leading-none">
              <div class="screen-card-text font-bold text-slate-700">Sr. No</div>
              <div class="screen-card-text font-black text-slate-900 mt-0.5">{{ activePreviewStudent.srNo }}</div>
            </div>

            <!-- Student Photo (Fits inside outline frame with 3px gap on all sides) -->
            <img 
              :src="activePreviewStudent.photoUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop'" 
              class="absolute top-[24.1%] left-1/2 -translate-x-1/2 w-[66px] h-[77px] object-cover rounded bg-white z-10 shadow-sm"
              style="border: none !important; outline: none !important; border-radius: 8px !important;"
            />

            <!-- Student Name (Centered right under photo) -->
            <div class="absolute top-[48.5%] left-0 right-0 text-center screen-card-text font-black uppercase text-black leading-none z-10">
              {{ activePreviewStudent.name }}
            </div>

            <!-- Student Details Container (Left-aligned details with red labels & black values perfectly aligned) -->
            <div class="absolute top-[53%] left-[8%] right-[8%] text-left font-sans z-10 space-y-1">
              <div class="flex items-center leading-tight">
                <span class="screen-info-lbl-fixed">F. Name</span>
                <span class="screen-info-colon">:</span>
                <span class="screen-card-text font-extrabold text-black truncate flex-1">{{ activePreviewStudent.fatherName }}</span>
              </div>
              
              <div class="flex items-center leading-tight justify-between">
                <div class="flex items-center">
                  <span class="screen-info-lbl-fixed">Class</span>
                  <span class="screen-info-colon">:</span>
                  <span class="screen-card-text font-extrabold text-black">{{ activePreviewStudent.class }}</span>
                </div>
                <div class="flex items-center pr-2">
                  <span class="text-rose-600 font-extrabold screen-card-text">Sec.</span>
                  <span class="text-rose-600 font-extrabold screen-info-colon mx-1">:</span>
                  <span class="screen-card-text font-extrabold text-black">{{ activePreviewStudent.section }}</span>
                </div>
              </div>
              
              <div class="flex items-center leading-tight">
                <span class="screen-info-lbl-fixed">D.O.B</span>
                <span class="screen-info-colon">:</span>
                <span class="screen-card-text font-extrabold text-black">{{ activePreviewStudent.dob }}</span>
              </div>

              <div class="flex items-center leading-tight">
                <span class="screen-info-lbl-fixed">Mobile</span>
                <span class="screen-info-colon">:</span>
                <span class="screen-card-text font-extrabold text-black truncate flex-1">{{ activePreviewStudent.phone }}</span>
              </div>

              <div class="flex items-start leading-tight">
                <span class="screen-info-lbl-fixed mt-0.5">Address</span>
                <span class="screen-info-colon mt-0.5">:</span>
                <span class="screen-card-text font-extrabold text-slate-800 print-wrap-text flex-1">{{ activePreviewStudent.address }}</span>
              </div>
            </div>

            <!-- Bottom Row: Session and Signature (Only rendered if showHeader toggle is checked) -->
            <div v-if="schoolDetails && schoolDetails.showHeader" class="absolute bottom-[3.5%] left-[8%] right-[8%] flex items-end justify-between z-10 font-bold text-slate-800">
              <div class="pb-0.5 text-black font-extrabold screen-card-text">Session- {{ schoolDetails.session }}</div>
              <div class="flex flex-col items-center justify-end h-8 w-[60px]">
                <img 
                  v-if="schoolDetails.signatureUrl" 
                  :src="schoolDetails.signatureUrl" 
                  class="h-5 object-contain mix-blend-multiply bg-transparent" 
                />
                <div class="w-full border-t border-slate-300 mt-0.5 pt-0.5 text-center screen-card-text font-black uppercase text-slate-600 leading-none">
                  {{ schoolDetails.principalTitle }}
                </div>
              </div>
            </div>
          </div>

          <!-- Empty Preview State -->
          <div v-else class="w-[216px] h-[353px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <User size="40" class="text-slate-300 animate-pulse mb-2" />
            <p class="font-black uppercase tracking-widest text-xs">No Records</p>
            <p class="text-[10px] font-medium text-slate-400 mt-1 px-4">Enter student credentials to generate preview card.</p>
          </div>
        </div>
      </div>

    </div>

    <!-- BOTTOM ROW: Student Records List (Hidden on print) -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 no-print">
      
      <!-- List Header & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
        <div>
          <h3 class="text-sm font-black uppercase tracking-wider text-slate-800">Student Database</h3>
          <p class="text-slate-400 text-xs font-semibold mt-0.5">Total records: {{ studentsList.length }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button 
            @click="clearAllStudents"
            :disabled="studentsList.length === 0"
            class="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear All Batch
          </button>
        </div>
      </div>

      <!-- No-scan query filters -->
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Search Name</label>
          <input 
            v-model="filters.name"
            @input="debouncedFetch"
            class="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
            placeholder="Name prefix..."
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile No</label>
          <input 
            v-model="filters.phone"
            @input="debouncedFetch"
            class="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
            placeholder="Exact phone..."
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Father's Name</label>
          <input 
            v-model="filters.fatherName"
            @input="debouncedFetch"
            class="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
            placeholder="Father's name..."
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Class</label>
          <input 
            v-model="filters.class"
            @input="debouncedFetch"
            class="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
            placeholder="e.g. 9"
          />
        </div>
        <div class="space-y-1">
          <label class="text-[10px] font-black uppercase tracking-widest text-slate-400">Section</label>
          <input 
            v-model="filters.section"
            @input="debouncedFetch"
            class="w-full bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:border-blue-500 outline-none transition-all"
            placeholder="e.g. B"
          />
        </div>
      </div>

      <!-- Student Records Table -->
      <div class="overflow-x-auto">
        <table class="w-full border-collapse">
          <thead>
            <tr class="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
              <th class="pb-3 pl-4">Record</th>
              <th class="pb-3">Sr. No</th>
              <th class="pb-3">Name</th>
              <th class="pb-3">Father's Name</th>
              <th class="pb-3">Class / Sec</th>
              <th class="pb-3">D.O.B</th>
              <th class="pb-3">Mobile</th>
              <th class="pb-3">Address</th>
              <th class="pb-3 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr 
              v-for="(student, idx) in studentsList" 
              :key="student.studentId || student.srNo" 
              class="group hover:bg-slate-50/50 transition-colors cursor-pointer"
              :class="selectedStudentIndex === idx ? 'bg-blue-50/20' : ''"
              @click="selectStudent(idx)"
            >
              <!-- Thumbnail photo / Interactive Direct Row Uploader -->
              <td class="py-4 pl-4" @click.stop>
                <div class="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-100 shadow-sm bg-slate-100 flex items-center justify-center group cursor-pointer" title="Click to Upload/Change Student Photo">
                  <img 
                    :src="student.photoUrl || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=150&h=150&fit=crop'" 
                    class="w-full h-full object-cover" 
                  />
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size="12" class="text-white" />
                  </div>
                  <input 
                    type="file" 
                    accept="image/*"
                    @change="(e) => handleRowPhotoUpload(e, idx)"
                    class="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                </div>
              </td>
              
              <!-- Sr. Number -->
              <td class="py-4 text-xs font-black text-slate-900">#{{ student.srNo }}</td>
              
              <!-- Name -->
              <td class="py-4 text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{{ student.name }}</td>
              
              <!-- Father's Name -->
              <td class="py-4 text-xs font-bold text-slate-600">{{ student.fatherName }}</td>

              <!-- Class & Sec -->
              <td class="py-4 text-xs font-bold text-slate-500">
                <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold">
                  Class {{ student.class || 'N/A' }}{{ student.section ? ` - ${student.section}` : '' }}
                </span>
              </td>
              
              <!-- D.O.B -->
              <td class="py-4 text-xs font-bold text-slate-500">{{ student.dob }}</td>
              
              <!-- Phone -->
              <td class="py-4 text-xs font-bold text-slate-500">{{ student.phone || 'N/A' }}</td>
              
              <!-- Address -->
              <td class="py-4 text-xs font-semibold text-slate-400 truncate max-w-[200px]">{{ student.address || 'N/A' }}</td>
              
              <!-- Actions -->
              <td class="py-4 text-right pr-4">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    @click.stop="selectStudent(idx)"
                    class="bg-white p-2 rounded-xl text-slate-600 border border-slate-200 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"
                    :class="selectedStudentIndex === idx ? 'text-indigo-600 border-indigo-200 bg-indigo-50/20' : ''"
                    title="Preview ID Card"
                  >
                    <Eye size="14" />
                  </button>
                  <button 
                    @click.stop="editStudent(idx)"
                    class="bg-white p-2 rounded-xl text-slate-600 border border-slate-200 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                    title="Edit Record"
                  >
                    <Edit3 size="14" />
                  </button>
                  <button 
                    @click.stop="deleteStudent(idx)"
                    class="bg-white p-2 rounded-xl text-red-500 border border-slate-200 hover:bg-red-500 hover:text-white shadow-sm transition-all"
                    title="Delete Record"
                  >
                    <Trash2 size="14" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty database table -->
            <tr v-if="studentsList.length === 0">
              <td colspan="9" class="text-center py-10 text-slate-400 font-bold text-xs">
                No matching records found.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<style>
/* Enforce Aptos Display / Aptos font family and size 9px on screen cards */
.print-card-badge-base {
  font-family: 'Aptos Display', 'Aptos', sans-serif !important;
  font-weight: bold !important;
}

.screen-card-text {
  font-size: 9px !important;
  font-family: 'Aptos Display', 'Aptos', sans-serif !important;
  font-weight: bold !important;
}

.screen-info-lbl-fixed {
  display: inline-block !important;
  width: 60px !important; /* Calibrated label width for 9px bold Aptos font */
  color: #e11d48 !important;
  font-weight: 800 !important;
  text-transform: none !important;
  font-size: 9px !important;
  font-family: 'Aptos Display', 'Aptos', sans-serif !important;
  flex-shrink: 0 !important;
}

.screen-info-colon {
  display: inline-block !important;
  width: 12px !important; /* Spaced out center colon */
  color: #e11d48 !important;
  font-weight: 800 !important;
  font-size: 9px !important;
  font-family: 'Aptos Display', 'Aptos', sans-serif !important;
  flex-shrink: 0 !important;
  text-align: center !important;
}

/* Printable layouts (Calibrated specifically for A4 Landscape with exactly 10 cards per page in a 5x2 grid) */
@media print {
  @page {
    size: A4 landscape;
    margin: 16mm 6.5mm 16mm 6.5mm; /* Calibrated margins for 52mm x 85mm grid layout */
  }

  body {
    background: #ffffff !important;
    color: #0f172a !important;
  }
  
  /* Hide all interactive screen panels & overlays */
  .no-print,
  main,
  aside,
  header,
  nav,
  button,
  .p-4,
  .bg-slate-950,
  .SplashScreen,
  #GlobalLoader,
  #NotificationModal,
  .p-6 {
    display: none !important;
  }

  /* Override parent screen constraints to allow natural multi-page flow */
  html, 
  body, 
  #app, 
  div[class*="h-screen"], 
  div[class*="overflow-hidden"], 
  main,
  div[class*="max-w-"] {
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    background: #ffffff !important;
    color: #0f172a !important;
    display: block !important;
    position: static !important;
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    box-shadow: none !important;
    transform: none !important;
  }

  /* Printable container visible */
  .hidden-print-container {
    display: block !important;
    width: 284mm !important; /* Fits 5 columns * 52mm + 4 gaps * 6mm exactly */
    height: 178mm !important; /* Fits 2 rows * 85mm + 1 gap * 8mm exactly */
    margin: 0 auto !important;
    padding: 0 !important;
    position: static !important;
  }

  /* Grid enforcing exactly 5 columns and 2 rows = 10 cards per sheet in landscape. Spacings and margins added exactly matching image 1 */
  .print-only-grid {
    display: grid !important;
    grid-template-columns: repeat(5, 52mm) !important;
    grid-template-rows: repeat(2, 85mm) !important;
    gap: 8mm 6mm !important; /* vertical gap 8mm, horizontal gap 6mm (spacing between cards) */
    width: 284mm !important;
    height: 178mm !important;
    justify-content: center !important;
    align-content: center !important;
    page-break-after: always !important; /* Forces new page after exactly 10 cards */
    margin: 0 auto !important;
    padding: 0 !important;
    box-sizing: border-box !important;
  }

  /* Vertical ID badge layout aligned exactly to user template aspect ratio */
  .print-card-badge {
    display: block !important;
    width: 52mm !important;
    height: 85mm !important;
    border: 1px solid #000000 !important; /* Standard black border line around each card */
    box-sizing: border-box !important;
    background-color: #ffffff !important;
    background-size: 100% 100% !important; /* Forces the background template to stretch exactly to margins, preventing cut-offs */
    background-repeat: no-repeat !important;
    background-position: center !important;
    color: #0f172a !important;
    position: relative !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    /* Enforced Aptos Font Family & Bold style on print card badges */
    font-family: 'Aptos Display', 'Aptos', sans-serif !important;
    font-weight: bold !important;
  }

  /* School Header */
  .print-card-header {
    position: absolute !important;
    top: 2.5mm !important;
    left: 2mm !important;
    right: 2mm !important;
    text-align: center !important;
    color: #ffffff !important;
    text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.5) !important;
  }

  .print-school-name {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 900 !important;
    text-transform: uppercase !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .print-school-address {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 700 !important;
    opacity: 0.85 !important;
    line-height: 1.1 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .print-school-phone {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 600 !important;
    opacity: 0.75 !important;
    line-height: 1.1 !important;
  }

  /* Sr. No Text (Left of the photo frame, centered vertically) */
  .print-sr-no-block {
    position: absolute !important;
    top: 27.5mm !important; /* Positioned slightly lower to align with photo frame center */
    left: 3.5mm !important;
    text-align: left !important;
    line-height: 1 !important;
    z-index: 10 !important;
  }

  .print-sr-no-lbl {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 700 !important;
    color: #000000 !important;
  }

  .print-sr-no-val {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 900 !important;
    color: #000000 !important;
    margin-top: 0.5mm !important;
  }

  /* Student Photo (Reduced size by 3px (0.75mm) from all sides to leave margin inside outline) */
  .print-student-photo {
    position: absolute !important;
    top: 20.75mm !important; /* Shifted down 0.75mm for vertical centering */
    left: 50% !important;
    transform: translateX(-50%) !important;
    width: 16.0mm !important; /* Reduced to 16.0mm (0.75mm inset from all sides) */
    height: 18.5mm !important; /* Reduced to 18.5mm (0.75mm inset from all sides) */
    object-fit: cover !important;
    border-radius: 2mm !important; /* Highly rounded corners matching user request */
    background: #ffffff !important;
    border: none !important; /* No extra border to prevent double-border overlap */
    outline: none !important;
  }

  /* Student name below photo (moved up to 42mm to reduce space between photo and name) */
  .print-student-name {
    position: absolute !important;
    top: 42mm !important;
    left: 0 !important;
    right: 0 !important;
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 900 !important;
    text-transform: uppercase !important;
    color: #000000 !important;
    text-align: center !important;
    line-height: 1.1 !important;
  }

  /* Student details section (moved up to 46.5mm to account for name shift) */
  .print-details-container {
    position: absolute !important;
    top: 46.5mm !important;
    left: 3.8mm !important;
    right: 3.8mm !important;
    text-align: left !important;
    box-sizing: border-box !important;
  }

  .print-info-row {
    display: flex !important;
    font-size: 9px !important; /* Enforced 9 font size */
    line-height: 1.35 !important;
    margin-bottom: 0.7mm !important;
    text-align: left !important;
  }

  .print-info-lbl-fixed {
    display: inline-block !important;
    width: 14.5mm !important; /* Calibrated fixed container width for size 9 ADDRESS label */
    color: #dc2626 !important;
    font-weight: 800 !important;
    text-transform: none !important;
    font-size: 9px !important; /* Enforced 9 font size */
    flex-shrink: 0 !important;
  }

  .print-info-colon {
    display: inline-block !important;
    width: 3mm !important; /* Spaced center colon */
    color: #dc2626 !important;
    font-weight: 800 !important;
    font-size: 9px !important; /* Enforced 9 font size */
    flex-shrink: 0 !important;
    text-align: center !important;
  }

  .print-info-lbl-sec {
    color: #dc2626 !important;
    font-weight: 800 !important;
    text-transform: none !important;
    font-size: 9px !important; /* Enforced 9 font size */
  }

  .print-info-colon-sec {
    color: #dc2626 !important;
    font-weight: 800 !important;
    margin-left: 1mm !important;
    margin-right: 1.5mm !important;
    font-size: 9px !important; /* Enforced 9 font size */
  }

  .print-row-split-aligned {
    display: flex !important;
    justify-content: space-between !important;
  }

  .print-class-col {
    display: flex !important;
    align-items: center !important;
  }

  .print-sec-col {
    display: flex !important;
    align-items: center !important;
    padding-right: 2mm !important;
  }

  .print-info-val {
    font-weight: 900 !important;
    color: #000000 !important; /* Black values */
    flex: 1 !important;
    font-size: 9px !important; /* Enforced 9 font size */
  }

  .print-wrap-text {
    white-space: normal !important;
    word-wrap: break-word !important;
    word-break: break-word !important;
    line-height: 1.25 !important;
  }

  .print-address-row {
    line-height: 1.25 !important;
  }
  
  .print-address-row .print-info-val {
    white-space: normal !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    overflow: hidden !important;
  }

  /* Bottom Row Footer */
  .print-card-footer {
    position: absolute !important;
    bottom: 2.5mm !important;
    left: 3.8mm !important;
    right: 3.8mm !important;
    display: flex !important;
    justify-content: justify !important;
    align-items: flex-end !important;
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 700 !important;
    color: #000000 !important;
  }

  .print-session {
    font-weight: 900 !important;
    text-transform: uppercase !important;
    font-size: 9px !important; /* Enforced 9 font size */
    color: #000000 !important;
  }

  .print-signature-box {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: flex-end !important;
    width: 15mm !important;
    margin-left: auto !important;
  }

  .print-sig-image {
    height: 4mm !important;
    object-fit: contain !important;
    background: transparent !important;
    mix-blend-multiply: multiply !important;
  }

  .print-sig-title {
    font-size: 9px !important; /* Enforced 9 font size */
    font-weight: 900 !important;
    text-transform: uppercase !important;
    color: #000000 !important;
    border-top: 0.3px solid #cbd5e1 !important;
    width: 100% !important;
    text-align: center !important;
    margin-top: 0.3mm !important;
    padding-top: 0.3mm !important;
    line-height: 1 !important;
  }
}

/* Screen Fallback */
.hidden-print-container {
  display: none;
}
</style>
