const fs = require('fs');
let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// 1. Add Default Seed logic in onMounted or when accessing categories
// In ContentManager.vue, we have `onMounted` where we can seed.
const seedCode = `
  if (!adminStore.siteContent.home.categoryBubbles || adminStore.siteContent.home.categoryBubbles.length === 0) {
    adminStore.siteContent.home.categoryBubbles = [
      { name: 'Westernwear', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=200', link: '/shop?category=Topwear', visible: true },
      { name: 'Indianwear', image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=200', link: '/shop?category=Ethnic%20Wear', visible: true },
      { name: 'Men', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=200', link: '/shop?gender=Men', visible: true },
      { name: 'Sportswear', image: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=200', link: '/shop?category=Outerwear', visible: true },
      { name: 'Kids', image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=200', link: '/shop?gender=Kids', visible: true },
      { name: 'Watches', image: '', link: '/shop?category=Watches', visible: true },
      { name: 'Shoes', image: '', link: '/shop?category=Shoes', visible: true },
      { name: 'Electronics', image: '', link: '/shop?category=Electronics', visible: true },
      { name: 'Mobile', image: '', link: '/shop?category=Mobile', visible: true }
    ]
  }`;

content = content.replace(
  /if \(!adminStore\.siteContent\.home\?\.carousel\?\.length\) \{/g,
  seedCode + '\n  if (!adminStore.siteContent.home?.carousel?.length) {'
);

// 2. Add visibility toggle in the categoryBubbles UI
// Find where we added the close/delete button and add a toggle next to it
const toggleCode = `
                <div class="absolute top-2 right-2 flex flex-col gap-2 z-10">
                   <button @click="bubble.visible = bubble.visible === false ? true : false" class="bg-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center w-8 h-8" :class="bubble.visible === false ? 'text-slate-400' : 'text-green-500'">
                      <Eye v-if="bubble.visible !== false" size="14" stroke-width="3" />
                      <EyeOff v-else size="14" stroke-width="3" />
                   </button>
                   <button @click="adminStore.siteContent.home.categoryBubbles.splice(bIdx, 1)" class="bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center w-8 h-8">
                      <X size="14" stroke-width="3" />
                   </button>
                </div>
`;

// Replace the old delete button with the new grouped buttons
content = content.replace(
  /<button @click="adminStore\.siteContent\.home\.categoryBubbles\.splice\(bIdx, 1\)" class="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-10">\s*<X size="14" stroke-width="3" \/>\s*<\/button>/m,
  toggleCode
);

// We need to import Eye and EyeOff if they aren't imported
if (!content.includes('EyeOff')) {
  content = content.replace(/import {([^}]+)} from 'lucide-vue-next'/, (match, imports) => {
    return `import {${imports}, Eye, EyeOff} from 'lucide-vue-next'`;
  });
}

// Ensure the new category initialization adds visible: true
content = content.replace(
  /adminStore\.siteContent\.home\.categoryBubbles\.push\(\{name: 'New Category', image: '', link: '\/shop'\}\)/g,
  `adminStore.siteContent.home.categoryBubbles.push({name: 'New Category', image: '', link: '/shop', visible: true})`
);

fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('ContentManager updated for category visibility and seeding.');
