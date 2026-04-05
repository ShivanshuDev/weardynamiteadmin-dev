<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAdminStore } from '../stores/adminStore'
import { Plus, Search, Edit2, Trash2, Eye, Calendar, User, Image as ImageIcon, Save, ChevronLeft, BookOpen, ChevronRight, LayoutGrid, List, CheckCircle, Clock, AlertCircle } from 'lucide-vue-next'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import '../assets/blog-preview.css'

const adminStore = useAdminStore()
const activeView = ref('LIST') // 'LIST' | 'EDIT' | 'PREVIEW'
const currentBlog = ref({ title: '', author: 'Shivanshu', content: '', image: '', status: 'Draft' })
const tagString = ref('')

// Search, Filter & View State
const searchQuery = ref('')
const viewMode = ref('grid') // 'grid' | 'table'
const activeStatus = ref('All')
const statuses = ['All', 'Live', 'Under Review', 'Draft', 'Inactive']
const itemsPerPage = 8
const currentPage = ref(1)

const filteredBlogs = computed(() => {
  let result = (adminStore.blogs || []).map(b => ({
    ...b,
    id: b.blogId || b.id,
    uniqueUiId: `${b.blogId || b.id}-${b.status || b.SK}`
  }))
  
  // Status Filter
  if (activeStatus.value !== 'All') {
    const filterStatus = activeStatus.value
    result = result.filter(b => {
      const s = b.status || b.SK || ''
      if (filterStatus === 'Live') return s === 'Live' || s === 'VERSION#LIVE'
      return s === filterStatus
    })
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

const editorOptions = {
  theme: 'snow',
  modules: {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image']
    ]
  },
  placeholder: 'Tell your story with rich details...'
}

const getStatusClass = (status) => {
  return {
    'bg-blue-600 text-white': status === 'VERSION#LIVE' || status === 'Live',
    'bg-orange-500 text-white': status === 'Under Review',
    'bg-slate-200 text-slate-600': status === 'Draft',
    'bg-slate-400 text-white': status === 'Inactive'
  }
}

const startNew = () => {
  currentBlog.value = { title: '', author: 'Shivanshu', content: '', image: '', status: 'Draft' }
  tagString.value = ''
  activeView.value = 'EDIT'
}

const editBlog = (blog) => {
  const isLive = blog.status === 'Live' || blog.status === 'VERSION#LIVE'
  currentBlog.value = { 
    ...blog, 
    id: blog.id || blog.blogId,
    status: isLive ? 'Under Review' : (blog.status || 'Draft'),
    _clonedFrom: isLive ? blog.title : null // Track the original live title for UI context
  }
  tagString.value = blog.tags ? blog.tags.join(', ') : ''
  activeView.value = 'EDIT'
}

const previewBlog = (blog) => {
  currentBlog.value = { ...blog, id: blog.id || blog.blogId }
  activeView.value = 'PREVIEW'
}

const deleteBlog = (blog) => {
  const id = blog.id || blog.blogId
  if (confirm('Delete this article and all versions permanently?')) {
    adminStore.deleteBlog(id)
  }
}

const saveBlog = async () => {
  const blogData = { ...currentBlog.value, tags: tagString.value.split(',').map(t => t.trim()) }
  if (blogData.id) {
    await adminStore.updateBlog(blogData)
  } else {
    await adminStore.addBlog(blogData)
  }
  activeView.value = 'LIST'
}

const deployBlog = async (blog) => {
   const id = blog.id || blog.blogId
   try {
     await adminStore.publishBlog(id)
     if (activeView.value !== 'LIST') activeView.value = 'LIST'
   } catch (error) {
     console.error('Deployment Failed')
   }
}

onMounted(() => {
  adminStore.fetchBlogs()
})
</script>

<template>
  <div class="blog-design-root">
    <div class="p-6 space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
           <h1 class="text-3xl font-black italic uppercase tracking-tighter">Narrative Archives</h1>
           <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Staging & Production Pipeline Manager</p>
        </div>
        <button v-if="activeView === 'LIST'" @click="startNew" class="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl">
           <Plus :size="18" /> New Story
        </button>
        <button v-else @click="activeView = 'LIST'" class="flex items-center gap-2 text-slate-400 hover:text-black text-xs font-black uppercase tracking-widest transition-all">
           <ChevronLeft :size="18" /> Back to Archives
        </button>
      </div>

      <!-- VIEW 1: LIST -->
      <div v-if="activeView === 'LIST'" class="space-y-8 animate-in">
         <!-- Status Filters -->
         <div class="flex items-center justify-between gap-6">
            <div class="flex bg-slate-100/50 p-1 rounded-full border border-slate-100 overflow-x-auto">
               <button 
                 v-for="status in statuses" 
                 :key="status"
                 @click="activeStatus = status; currentPage = 1"
                 :class="activeStatus === status ? 'bg-black text-white px-8' : 'text-slate-500 hover:text-black px-6'"
                 class="py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-3 whitespace-nowrap"
               >
                  {{ status }}
                  <span :class="activeStatus === status ? 'bg-white/20' : 'bg-slate-200'" class="px-2 py-0.5 rounded-full text-[8px]">
                     {{ status === 'All' ? (adminStore.blogs || []).length : (adminStore.blogs || []).filter(b => {
                        const s = b.status || b.SK || '';
                        if (status === 'Live') return s === 'Live' || s === 'VERSION#LIVE';
                        return s === status;
                     }).length }}
                  </span>
               </button>
            </div>
            
            <div class="flex bg-slate-100/50 p-1 rounded-full border border-slate-100 shrink-0">
               <button @click="viewMode = 'grid'" :class="viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'" class="p-2.5 rounded-full transition-all"><LayoutGrid size="18" /></button>
               <button @click="viewMode = 'table'" :class="viewMode === 'table' ? 'bg-white text-blue-600 shadow-xl' : 'text-slate-400'" class="p-2.5 rounded-full transition-all"><List size="18" /></button>
            </div>
         </div>

         <!-- Narrative Grid -->
         <div v-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div v-for="blog in paginatedBlogs" :key="blog.uniqueUiId" class="group bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col">
               <div class="aspect-[16/10] relative overflow-hidden">
                  <img :src="blog.image" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div class="absolute top-4 left-4">
                     <span :class="getStatusClass(blog.status)" class="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl border border-white/10">
                        {{ blog.status === 'VERSION#LIVE' ? 'LIVE' : blog.status }}
                     </span>
                  </div>
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <button @click="previewBlog(blog)" class="p-4 bg-white rounded-full hover:bg-black hover:text-white transition-all transform hover:scale-110" title="Preview"><Eye :size="20"/></button>
                     <button @click="editBlog(blog)" class="p-4 bg-white rounded-full hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110" title="Edit"><Edit2 :size="20"/></button>
                     <button @click="deleteBlog(blog)" class="p-4 bg-white rounded-full hover:bg-red-600 hover:text-white transition-all transform hover:scale-110" title="Delete"><Trash2 :size="20"/></button>
                  </div>
               </div>
               <div class="p-8 space-y-4 flex-1 flex flex-col">
                  <h3 class="font-black italic uppercase tracking-tighter text-sm mb-auto line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">{{ blog.title }}</h3>
                  <div class="flex items-center justify-between pt-6 border-t border-slate-50">
                     <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar :size="14" /> {{ blog.date }}</span>
                     <button v-if="blog.status !== 'Live' && blog.status !== 'VERSION#LIVE'" @click="deployBlog(blog)" class="text-[9px] font-black uppercase text-blue-600 hover:tracking-[0.2em] transition-all flex items-center gap-1">DEPLOY <ChevronRight :size="14"/></button>
                     <span v-else class="text-[9px] font-black uppercase text-green-500 flex items-center gap-1"><CheckCircle :size="14" /> LIVE</span>
                  </div>
               </div>
            </div>
         </div>

         <!-- Table View Integration -->
         <div v-else class="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
            <table class="w-full text-left">
               <thead class="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                     <th class="px-8 py-5">Article Headline</th>
                     <th class="px-8 py-5">Author</th>
                     <th class="px-8 py-5">Status</th>
                     <th class="px-8 py-5">Actions</th>
                  </tr>
               </thead>
               <tbody class="divide-y divide-slate-50">
                  <tr v-for="blog in paginatedBlogs" :key="blog.id" class="hover:bg-slate-50 transition-all group">
                     <td class="px-8 py-5 font-black italic uppercase tracking-tighter text-sm">{{ blog.title }}</td>
                     <td class="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase">{{ blog.author }}</td>
                     <td class="px-8 py-5">
                       <span :class="getStatusClass(blog.status)" class="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                          {{ blog.status === 'VERSION#LIVE' ? 'LIVE' : blog.status }}
                       </span>
                     </td>
                     <td class="px-8 py-5">
                        <div class="flex items-center gap-3">
                           <button @click="previewBlog(blog)" class="text-slate-400 hover:text-black" title="Preview"><Eye :size="18"/></button>
                           <button @click="editBlog(blog)" class="text-slate-400 hover:text-blue-600" title="Edit"><Edit2 :size="18"/></button>
                           <button @click="deleteBlog(blog)" class="text-slate-400 hover:text-red-500" title="Delete"><Trash2 :size="18"/></button>
                        </div>
                     </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>

      <!-- VIEW 2: EDIT (Studio) -->
      <div v-else-if="activeView === 'EDIT'" class="space-y-12 animate-in pb-32">
         <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-6">
               <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Edit2 :size="24" />
               </div>
               <div>
                  <div class="flex items-center gap-3">
                     <span class="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Configuration Studio</span>
                     <span v-if="currentBlog._clonedFrom" class="bg-blue-600 text-white text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg">Editing Story Version</span>
                  </div>
                  <h2 class="text-2xl font-black italic uppercase tracking-tighter mt-1">{{ currentBlog.id ? 'Refine Narrative' : 'Initialize New Story' }}</h2>
                  <p v-if="currentBlog._clonedFrom" class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">Note: The live version of "{{ currentBlog._clonedFrom }}" remains active on site.</p>
               </div>
            </div>
            <div class="flex gap-4">
               <button @click="saveBlog" class="flex items-center gap-2 bg-black text-white px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all">
                  <Save :size="18" /> Save Working Version
               </button>
               <button v-if="currentBlog.id" @click="deployBlog(currentBlog)" class="flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl">
                  Push to Production
               </button>
            </div>
         </div>

         <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <!-- Sidebar: Metadata -->
            <aside class="lg:col-span-4 space-y-6">
               <div class="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                  <h2 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">Global Attributes</h2>
                  
                  <div class="space-y-6">
                     <!-- Lifecycle Status -->
                     <div class="space-y-3">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                           Lifecycle Status
                           <div v-if="currentBlog._clonedFrom" class="group relative cursor-help">
                              <AlertCircle :size="12" class="text-blue-500" />
                              <div class="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[8px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                 A staging copy of this live article is being created.
                              </div>
                           </div>
                        </label>
                        <select v-model="currentBlog.status" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer">
                           <option value="Draft">Draft (Internal)</option>
                           <option value="Under Review">Under Review (Staging)</option>
                           <option value="Inactive">Inactive (Archived/Hidden)</option>
                        </select>
                        <div v-if="currentBlog._clonedFrom" class="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
                           <p class="text-[8px] text-blue-600 leading-relaxed font-bold uppercase tracking-widest italic">
                              <Clock :size="10" class="inline mb-0.5 mr-1" /> This new version will automatically target "Under Review" to keep the live version safe.
                           </p>
                        </div>
                     </div>

                     <div class="space-y-2">
                        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Story Headline</label>
                        <input v-model="currentBlog.title" type="text" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-600/10 outline-none" placeholder="Enter high-impact headline..." />
                     </div>

                     <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Author</label>
                           <input v-model="currentBlog.author" type="text" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" />
                        </div>
                        <div class="space-y-2">
                           <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Labels (CSV)</label>
                           <input v-model="tagString" type="text" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" placeholder="Style, Fashion..." />
                        </div>
                     </div>

                     <div class="space-y-2">
                        <label class="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Hero Asset URL</label>
                        <input v-model="currentBlog.image" type="text" class="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" placeholder="https://..." />
                     </div>
                  </div>

                  <div class="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                     <AlertCircle class="text-amber-600 shrink-0" :size="20" />
                     <p class="text-[9px] font-bold text-amber-900/70 leading-relaxed italic uppercase tracking-wider">Warning: If this article is already Live, saving as "Inactive" will stage a hidden version. The current version stays published until you Deploy the replacement.</p>
                  </div>
               </div>
            </aside>

            <!-- Main Content: Quill Form -->
            <main class="lg:col-span-8">
               <div class="bg-white rounded-[4rem] border border-slate-100 shadow-2xl overflow-hidden min-h-[800px]">
                  <div class="bg-slate-50/80 px-8 py-3 border-b border-slate-100 flex items-center justify-between">
                     <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] font-mono italic">rich_text_editor.sys</span>
                  </div>
                  <div class="p-4 h-full">
                     <QuillEditor 
                       v-model:content="currentBlog.content" 
                       contentType="html" 
                       :options="editorOptions" 
                       class="min-h-[700px]"
                     />
                  </div>
               </div>
            </main>
         </div>
      </div>

      <!-- VIEW 3: PREVIEW (Website Mirror) -->
      <div v-else-if="activeView === 'PREVIEW'" class="space-y-8 animate-in">
         <div class="bg-white rounded-[4rem] border border-slate-100 shadow-3xl overflow-hidden min-h-[900px]">
            <div class="bg-slate-50/80 px-8 py-4 border-b border-slate-100 flex items-center justify-between">
               <div class="flex gap-2">
                  <div class="w-3 h-3 rounded-full bg-red-400"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div class="w-3 h-3 rounded-full bg-green-400"></div>
               </div>
               <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Full Fidelity Website Mirror</span>
               <button @click="activeView = 'EDIT'" class="text-[10px] bg-black text-white px-6 py-2 rounded-full font-black uppercase tracking-widest hover:bg-blue-600 transition-all">Switch to Editor</button>
            </div>

            <!-- Unified Website Styling Wrapper (Read Only) -->
            <div class="p-16 article-detail max-w-5xl mx-auto">
               <header class="blog-hero">
                  <div class="card-meta">
                     <span><Calendar :size="12" /> April 5, 2026</span>
                     <span><User :size="12" /> BY {{ currentBlog.author }}</span>
                  </div>
                  <h1>{{ currentBlog.title || 'Untitled Narrative' }}</h1>
                  <div class="accent-line"></div>
               </header>

               <div class="card-image mb-16 shadow-2xl rounded-lg overflow-hidden">
                  <img v-if="currentBlog.image" :src="currentBlog.image" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-[400px] bg-slate-50 flex flex-col items-center justify-center text-slate-200">
                     <ImageIcon :size="64" />
                     <span class="text-[10px] font-black uppercase mt-6 tracking-widest">Narrative Asset Not Defined</span>
                  </div>
               </div>

               <!-- Article Content Render -->
               <article class="article-content" v-html="currentBlog.content || '<p>No content defined for this narrative yet.</p>'"></article>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<style>
.ql-toolbar.ql-snow { border: none !important; border-bottom: 2px solid #f8fafc !important; background: #fff; padding: 24px !important; margin-bottom: 20px; }
.ql-container.ql-snow { border: none !important; }

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

