const fs = require('fs');

let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// The block for category bubbles currently looks like:
// <div class="space-y-3">
//    <div class="space-y-1">
//       <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category Name</label>
//       <input v-model="bubble.name" class="..." />
//    </div>
//    <div class="space-y-1">
//       <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Shop Link</label>
//       <input v-model="bubble.link" class="..." />
//    </div>
// </div>

const subCatBlock = `
                   <div class="space-y-1">
                      <label class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sub-Categories (comma separated)</label>
                      <input v-model="bubble.subCategoriesText" placeholder="e.g. Shirts, Pants, Outerwear" class="w-full bg-white px-3 py-2 rounded-lg text-slate-900 font-medium border border-slate-200/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all outline-none text-sm" />
                   </div>
`;

content = content.replace(
  /<div class="space-y-1">\s*<label class="text-\[10px\] font-bold uppercase tracking-widest text-slate-500">Shop Link<\/label>\s*<input v-model="bubble\.link" class="[^"]+" \/>\s*<\/div>/m,
  `$&` + '\n' + subCatBlock
);

// We should also seed the `subCategoriesText` in the initial seed array, but it's optional (empty by default is fine, users can add them). Let's update the seed block we inserted previously just to be safe.
content = content.replace(
  /{ name: 'Men', image: 'https:\/\/images.unsplash.com\/photo-1617137968427-85924c800a22\?q=80&w=200', link: '\/shop\?gender=Men', visible: true }/g,
  `{ name: 'Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=200', link: '/shop?gender=Men', visible: true, subCategoriesText: 'Shirts, T-Shirts, Jackets, Jeans, Trousers' }`
);
content = content.replace(
  /{ name: 'Westernwear', image: 'https:\/\/images.unsplash.com\/photo-1509631179647-0177331693ae\?q=80&w=200', link: '\/shop\?category=Topwear', visible: true }/g,
  `{ name: 'Westernwear', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200', link: '/shop?category=Topwear', visible: true, subCategoriesText: 'Dresses, Tops, Jeans' }`
);

fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('ContentManager.vue updated with subCategoriesText.');
