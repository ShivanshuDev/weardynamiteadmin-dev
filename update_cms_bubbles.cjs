const fs = require('fs');
let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// 1. In Collections tab save handler, add saving for home.categoryBubbles
content = content.replace(
  /await adminStore\.updateCmsSection\('home\.productSections', sections\)/g,
  `await adminStore.updateCmsSection('home.productSections', sections)\n      await adminStore.updateCmsSection('home.categoryBubbles', adminStore.siteContent.home?.categoryBubbles || [])`
);

// 2. Add an init check in onMounted or when rendering to make sure categoryBubbles exists
// We can just rely on (adminStore.siteContent.home.categoryBubbles || []) in the template.

// 3. Add the UI block for Category Bubbles right after the Gender Collection Studio (after </div>\n       </div>\n    </div> for the Collections tab? Wait. Gender Collection Studio ends at line 856.
// Let's insert before `<!-- TAB: BRAND HOOKS (TRUST & NARRATIVE) -->`
const categoryBubblesUI = `
       <!-- Dynamic Category Bubbles -->
       <div class="bg-white p-8 rounded-2xl border border-slate-200/75 shadow-sm space-y-10 mt-10">
          <div class="flex items-center justify-between border-b border-slate-100 pb-8">
             <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600">
                   <Layers size="24" />
                </div>
                <div>
                   <h3 class="text-sm font-semibold tracking-tight text-slate-900">Dynamic Taxonomy (Category Bubbles)</h3>
                   <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manage global categories like Westernwear, Shoes, Watches</p>
                </div>
             </div>
             <div class="flex gap-4">
                <button @click="() => { if(!adminStore.siteContent.home.categoryBubbles) adminStore.siteContent.home.categoryBubbles = []; adminStore.siteContent.home.categoryBubbles.push({name: 'New Category', image: '', link: '/shop'}); }" class="bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                   + Add Category
                </button>
                <button @click="handleSaveSection('home.categoryBubbles')" class="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2">
                   <Save size="16" />
                   Save Categories
                </button>
             </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
             <div v-for="(bubble, bIdx) in (adminStore.siteContent.home.categoryBubbles || [])" :key="bIdx" class="space-y-4 p-4 border border-slate-200 rounded-2xl relative group">
                <button @click="adminStore.siteContent.home.categoryBubbles.splice(bIdx, 1)" class="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10">
                   <X size="14" stroke-width="3" />
                </button>
                
                <div class="aspect-square rounded-full overflow-hidden relative group/bubble shadow-md bg-slate-50 border border-slate-100 mx-auto w-32 h-32">
                   <img v-if="bubble.image" :src="adminStore.resolveImageUrl(bubble.image)" class="w-full h-full object-cover" />
                   <div v-else class="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon size="24" />
                   </div>
                   <div class="absolute inset-0 bg-black/60 opacity-0 group-hover/bubble:opacity-100 transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer" @click="triggerSlideUpload(\`bubble_\${bIdx}\`)">
                      <UploadCloud size="20" class="text-white mb-1" />
                      <span class="text-[8px] font-black uppercase text-white">Upload</span>
                   </div>
                </div>

                <div class="space-y-3">
                   <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category Name</label>
                      <input v-model="bubble.name" class="w-full bg-white px-3 py-2 rounded-lg text-slate-900 font-medium border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                   </div>
                   <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shop Link</label>
                      <input v-model="bubble.link" class="w-full bg-white px-3 py-2 rounded-lg text-slate-900 font-medium border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                   </div>
                </div>
             </div>
          </div>
       </div>
`;

content = content.replace('<!-- TAB: BRAND HOOKS (TRUST & NARRATIVE) -->', categoryBubblesUI + '\n\n    <!-- TAB: BRAND HOOKS (TRUST & NARRATIVE) -->');

// 4. Update the triggerSlideUpload logic to handle 'bubble_'
content = content.replace(
  /const isDynamic = typeof id === 'string' && id\.startsWith\('dyn_'\)/g,
  `const isDynamic = typeof id === 'string' && id.startsWith('dyn_')\n      const isBubble = typeof id === 'string' && id.startsWith('bubble_')`
);
content = content.replace(
  /let folder = isVideo \? 'cms\/branding' : \(isCategory \? 'cms\/categories' : \(isPromo \? 'cms\/promos' : \(isProcessHero \? 'cms\/process' : \(isGallery \? 'cms\/gallery' : \(isTopBanner \? 'cms\/banners' : \(isDynamic \? 'cms\/dynamic' : 'cms\/carousel'\)\)\)\)\)\)\)/g,
  `let folder = isVideo ? 'cms/branding' : (isCategory ? 'cms/categories' : (isPromo ? 'cms/promos' : (isProcessHero ? 'cms/process' : (isGallery ? 'cms/gallery' : (isTopBanner ? 'cms/banners' : (isDynamic ? 'cms/dynamic' : (isBubble ? 'cms/taxonomy' : 'cms/carousel')))))))`
);

content = content.replace(
  /} else if \(isDynamic\) {/g,
  `} else if (isBubble) {\n         const idx = parseInt(id.split('_')[1])\n         adminStore.siteContent.home.categoryBubbles[idx].image = fileKey\n      } else if (isDynamic) {`
);

fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('ContentManager updated to support dynamic categories.');
