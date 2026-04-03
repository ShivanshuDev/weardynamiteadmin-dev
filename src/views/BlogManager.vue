<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { Plus, Search, Edit2, Trash2, Eye, Calendar, User, Image as ImageIcon, Save, ChevronLeft, BookOpen, ChevronRight, LayoutGrid, List } from 'lucide-vue-next'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

const adminStore = useAdminStore()
const isEditing = ref(false)
const currentBlog = ref({ title: '', author: 'Shivanshu', content: '', image: '', status: 'Draft' })

// Search, Filter & View State
const searchQuery = ref('')
const viewMode = ref('grid') // 'grid' | 'table'
const activeStatus = ref('All')
const statuses = ['All', 'Published', 'Under Review', 'Draft', 'Scheduled', 'Inactive']
const itemsPerPage = 8
const currentPage = ref(1)

const filteredBlogs = computed(() => {
  let result = adminStore.blogs
  
  // Status Filter
  if (activeStatus.value !== 'All') {
    result = result.filter(b => b.status === activeStatus.value)
  }

  // Search Filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(b => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
  }
  return result
})

const paginatedBlogs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredBlogs.value.slice(start, start + itemsPerPage)
})

const totalPages = computed(() => Math.ceil(filteredBlogs.value.length / itemsPerPage))

const editorOptions = {
  theme: 'snow',
  modules: {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub' }, { 'script': 'super' }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }, { 'align': [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean']
    ]
  },
  placeholder: 'Tell your story with rich details...'
}

const startNew = () => {
  currentBlog.value = { title: '', author: 'Shivanshu', content: '', image: '', status: 'Draft' }
  isEditing.value = true
}

const editBlog = (blog) => {
  currentBlog.value = { ...blog }
  isEditing.value = true
}

const saveBlog = () => {
  if (currentBlog.value.id) {
    adminStore.updateBlog(currentBlog.value)
  } else {
    adminStore.addBlog(currentBlog.value)
  }
  isEditing.value = false
}

onMounted(() => {
  adminStore.fetchBlogs()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Blog Engine</h1>
        <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">Create & Manage Brand Narratives</p>
      </div>
      <button 
        v-if="!isEditing"
        @click="startNew"
        class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
      >
        <Plus size="18" /> New Article
      </button>
      <button 
        v-else
        @click="isEditing = false"
        class="text-slate-400 hover:text-black flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-colors"
      >
        <ChevronLeft size="18" /> Back to list
      </button>
    </div>

    <!-- Search, Tabs & View Toggles -->
    <div v-if="!isEditing" class="space-y-4">
       <!-- Segmented Pill Control Tabs -->
       <div class="flex items-center justify-between gap-6">
          <div class="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1">
             <button 
               v-for="status in statuses" 
               :key="status"
               @click="activeStatus = status; currentPage = 1"
               :class="activeStatus === status ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500 hover:text-slate-900 hover:bg-white/50'"
               class="px-5 py-2 text-[9px] font-black uppercase tracking-widest transition-all rounded-xl flex items-center gap-2"
             >
                {{ status }}
                <span :class="activeStatus === status ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'" class="px-1.5 py-0.5 rounded-md text-[8px]">{{ adminStore.blogs.filter(b => status === 'All' ? true : b.status === status).length }}</span>
             </button>
          </div>
          
          <div class="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl">
             <button 
               @click="viewMode = 'grid'"
               :class="viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
               class="p-2 rounded-xl transition-all"
               title="Grid View"
             >
                <LayoutGrid size="16" />
             </button>
             <button 
               @click="viewMode = 'table'"
               :class="viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'"
               class="p-2 rounded-xl transition-all"
               title="Table View"
             >
                <List size="16" />
             </button>
          </div>
       </div>

       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="relative flex-1 max-w-md">
             <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="18" />
             <input 
               v-model="searchQuery"
               type="text" 
               placeholder="Search narratives..." 
               class="w-full pl-12 pr-6 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-black uppercase outline-none focus:border-blue-600 transition-all shadow-sm"
             />
          </div>
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ paginatedBlogs.length }} of {{ filteredBlogs.length }} Visible</p>
       </div>
    </div>

    <!-- Blog List Container -->
    <div v-if="!isEditing" class="space-y-8">
       
       <!-- Conditional View Rendering -->
       <template v-if="paginatedBlogs.length">
          <!-- Grid View -->
          <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div 
              v-for="blog in paginatedBlogs" 
              :key="blog.id"
              class="bg-white rounded border border-slate-100 shadow-sm overflow-hidden group hover:shadow-2xl transition-all h-full flex flex-col"
             >
                <div class="aspect-[4/3] relative overflow-hidden flex-shrink-0">
                   <img :src="blog.image" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div class="absolute top-4 left-4">
                      <span class="bg-black/40 backdrop-blur-md text-white border border-white/20 text-[9px] font-black uppercase px-3 py-1 rounded-lg tracking-widest">{{ blog.status }}</span>
                   </div>
                </div>
                <div class="p-6 space-y-4 flex-1 flex flex-col">
                   <div class="flex items-center justify-between text-[9px] font-black uppercase text-slate-400 tracking-widest">
                      <div class="flex items-center gap-1"><Calendar size="12"/> {{ blog.date }}</div>
                      <div class="flex items-center gap-1 truncate max-w-[80px]"><User size="12"/> {{ blog.author }}</div>
                   </div>
                   <h3 class="text-sm font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 h-10 italic tracking-tight">{{ blog.title }}</h3>
                   <div class="flex items-center gap-2 pt-2 mt-auto">
                      <button @click="editBlog(blog)" class="flex-1 py-2.5 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Configure</button>
                      <button @click="adminStore.deleteBlog(blog.id)" class="p-2.5 border border-slate-100 hover:bg-red-50 text-red-500 rounded-xl transition-all"><Trash2 size="14"/></button>
                   </div>
                </div>
             </div>
          </div>

          <!-- Table View (Standardized h-14) -->
          <div v-else class="bg-white rounded-[0.4rem] border border-slate-100 shadow-sm overflow-hidden">
             <table class="w-full border-collapse">
                <thead>
                   <tr class="bg-slate-50/50 border-b border-slate-100">
                      <th class="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16">Sr. No</th>
                      <th class="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Story Brief</th>
                      <th class="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Assignee</th>
                      <th class="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Metrics</th>
                      <th class="text-left px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Lifecycle</th>
                      <th class="text-right px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                   </tr>
                </thead>
                <tbody>
                   <tr v-for="(blog, index) in paginatedBlogs" :key="blog.id" class="border-b border-slate-50 hover:bg-slate-50/80 transition-all h-14 group">
                      <td class="px-6 text-[10px] font-black text-slate-400 font-mono">
                         {{ ((currentPage - 1) * itemsPerPage) + index + 1 }}
                      </td>
                      <td class="px-6">
                         <div class="flex items-center gap-3">
                            <img :src="blog.image" class="w-8 h-8 rounded-lg object-cover shadow-sm" />
                            <span class="text-[10px] font-black text-slate-900 truncate max-w-[300px] italic tracking-tight">{{ blog.title }}</span>
                         </div>
                      </td>
                      <td class="px-6 text-[10px] font-black text-slate-500 uppercase">{{ blog.author }}</td>
                      <td class="px-6 text-[10px] font-black text-slate-400">{{ blog.date }}</td>
                      <td class="px-6">
                         <span :class="{
                            'bg-blue-100 text-blue-600': blog.status === 'Published',
                            'bg-orange-100 text-orange-600': blog.status === 'Under Review',
                            'bg-purple-100 text-purple-600': blog.status === 'Scheduled',
                            'bg-amber-100 text-amber-600': blog.status === 'Draft',
                            'bg-slate-100 text-slate-500': blog.status === 'Inactive'
                         }" class="text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-widest">
                            {{ blog.status }}
                         </span>
                      </td>
                      <td class="px-6 text-right">
                         <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button @click="editBlog(blog)" class="p-2 text-slate-400 hover:text-blue-600"><Edit2 size="14"/></button>
                            <button @click="adminStore.deleteBlog(blog.id)" class="p-2 text-slate-400 hover:text-red-600"><Trash2 size="14"/></button>
                         </div>
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>
       </template>

       <!-- Empty State -->
       <div v-else class="p-20 flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-[3rem]">
          <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
             <BookOpen size="40" />
          </div>
          <div class="text-center">
             <p class="text-[10px] font-black uppercase tracking-widest">No matching narratives found</p>
             <p class="text-[9px] font-bold text-slate-400 uppercase mt-1">Try adjusting your filters or create a new story</p>
          </div>
       </div>

       <!-- Pagination Footer -->
       <div v-if="totalPages > 1" class="bg-white px-6 py-4 rounded-[0.4rem] border border-slate-100 flex items-center justify-between shadow-sm">
          <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Showing {{ Math.min(filteredBlogs.length, itemsPerPage) }} Narratives per Cycle</p>
          <div class="flex items-center gap-2">
             <button @click="currentPage--" :disabled="currentPage === 1" class="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft size="14" /></button>
             <div class="flex items-center gap-1">
                <span v-for="p in totalPages" :key="p" @click="currentPage = p" :class="p === currentPage ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20' : 'bg-white text-slate-400 border-slate-200 hover:border-blue-400'" class="w-7 h-7 flex items-center justify-center rounded-lg text-[10px] font-black border transition-all cursor-pointer">
                   {{ p }}
                </span>
             </div>
             <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight size="14" /></button>
          </div>
       </div>
    </div>

    <!-- Enhanced Editor Overlay -->
    <div v-else class="bg-white p-10 rounded-[3px] border border-slate-100 shadow-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div class="flex items-center justify-between border-b border-slate-50 pb-8">
          <div class="flex items-center gap-6">
             <div class="bg-blue-600 text-white p-4 rounded-xl shadow-xl shadow-blue-600/20"><Edit2 size="24"/></div>
             <div>
                <h2 class="text-2xl font-black italic uppercase tracking-tighter">Compose Story</h2>
                <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Rich Text Narratives & Visual Storytelling</p>
             </div>
          </div>
          <div class="flex items-center gap-4">
             <button @click="isEditing = false" class="text-xs font-black uppercase text-slate-400 hover:text-black">Discard Changes</button>
             <button @click="saveBlog" class="bg-blue-600 text-white px-8 py-3 rounded-[3px] font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-600/20 hover:bg-black transition-all">
                <Save size="18"/> {{ currentBlog.id ? 'Update Article' : 'Publish Story' }}
             </button>
          </div>
       </div>

       <div class="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <!-- Main Editor Area -->
          <div class="lg:col-span-3 space-y-10">
             <div class="space-y-2 border-b-2 border-slate-50 pb-4">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Captivating Headline</label>
                <input v-model="currentBlog.title" type="text" placeholder="THE UNTOLD STORY OF DYNAMITE..." class="w-full text-5xl font-black italic tracking-tighter outline-none border-none placeholder:text-slate-100 uppercase" />
             </div>
             
             <div class="quill-editor-container">
                <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Article Content</label>
                <QuillEditor 
                   v-model:content="currentBlog.content" 
                   content-type="html" 
                   :options="editorOptions" 
                   class="min-h-[600px] text-lg font-medium leading-relaxed"
                />
             </div>
          </div>
          
          <!-- Sidebar Controls -->
          <div class="space-y-8">
             <div class="bg-slate-50 p-8 rounded-[3px] border border-slate-100 space-y-8 sticky top-8">
                <div class="space-y-4">
                   <div class="flex items-center gap-2">
                      <ImageIcon size="14" class="text-blue-600" />
                      <label class="text-[9px] font-black uppercase text-slate-800 tracking-widest">Featured Metadata</label>
                   </div>
                   <div class="aspect-video bg-white rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 overflow-hidden relative group">
                      <img v-if="currentBlog.image" :src="currentBlog.image" class="w-full h-full object-cover" />
                      <div v-else class="flex flex-col items-center">
                        <ImageIcon size="30" />
                        <span class="text-[9px] font-black uppercase mt-2">Upload Preview</span>
                      </div>
                      <input v-model="currentBlog.image" type="text" placeholder="Paste Cover Image URL..." class="absolute bottom-4 left-4 right-4 p-3 bg-white/95 backdrop-blur-md rounded-xl text-[9px] font-bold border border-slate-200 outline-none focus:border-blue-600 transition-colors" />
                   </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-slate-200">
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Assign Author</label>
                      <input v-model="currentBlog.author" class="w-full p-4 bg-white rounded-xl border border-slate-100 text-xs font-bold outline-none focus:border-blue-600 transition-colors" />
                   </div>
                   
                   <div class="space-y-2">
                      <label class="text-[9px] font-black uppercase text-slate-400 tracking-widest">Publication Status</label>
                      <select v-model="currentBlog.status" class="w-full p-4 bg-white rounded-xl border border-slate-100 text-xs font-bold outline-none cursor-pointer focus:border-blue-600 transition-colors">
                         <option>Draft</option>
                         <option>Published</option>
                         <option>Scheduled</option>
                         <option>Under Review</option>
                         <option>Inactive</option>
                      </select>
                   </div>
                </div>

                <div class="bg-blue-600/5 p-6 rounded-3xl border border-blue-100">
                   <h4 class="text-[10px] font-black uppercase text-blue-900 tracking-widest mb-2 flex items-center gap-2">
                      <Eye size="14"/> Preview Note
                   </h4>
                   <p class="text-[10px] font-medium text-blue-600 leading-relaxed">Your edits are live within the editor. Press Publish to commit changes to the global brand narrative.</p>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style>
/* Quill Theme Customization to match reduced radius and premium aesthetic */
.quill-editor-container .ql-toolbar.ql-snow {
  border: 1px solid #f1f5f9;
  background: #f8fafc;
  border-radius: 3px 3px 0 0;
  padding: 12px;
}

.quill-editor-container .ql-container.ql-snow {
  border: 1px solid #f1f5f9;
  border-top: none;
  border-radius: 0 0 3px 3px;
  font-family: inherit;
  font-size: 1.1rem;
}

.ql-editor {
  min-height: 600px;
  padding: 40px;
}

.ql-editor.ql-blank::before {
  color: #e2e8f0;
  font-style: italic;
  left: 40px;
}

/* Image alignment & Resizing CSS supports */
.ql-editor img {
  border-radius: 3px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.ql-editor img:hover {
  outline: 4px solid #3b82f6;
}

.ql-editor img.ql-align-center {
  margin: 20px auto;
  display: block;
}

.ql-editor img.ql-align-right {
  margin: 20px 0 20px 20px;
  float: right;
}

.ql-editor img.ql-align-left {
  margin: 20px 20px 20px 0;
  float: left;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slide-in-from-bottom {
  from { transform: translateY(10px); }
  to { transform: translateY(0); }
}
.animate-in {
  animation: fade-in 0.5s ease-out, slide-in-from-bottom 0.5s ease-out;
}
</style>

