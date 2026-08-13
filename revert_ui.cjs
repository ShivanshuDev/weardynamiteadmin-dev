const fs = require('fs');
let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// Revert Root div
content = content.replace(
  '<div class="space-y-10 min-h-screen relative pb-20 p-8 bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-indigo-950 rounded-tl-3xl text-slate-300 shadow-[inset_0_4px_30px_rgba(255,255,255,0.05)]">',
  '<div class="space-y-10 min-h-screen relative pb-20 px-8 py-10 bg-[#FAFAFA] text-slate-800">'
);

// Revert Header text
content = content.replace(
  '<h1 class="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 italic uppercase drop-shadow-sm">',
  '<h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">'
);

// Revert Panels (from dark glass to premium light cards)
content = content.replace(/bg-white\/5 backdrop-blur-3xl p-10 rounded-3xl border border-white\/10 shadow-2xl/g, 'bg-white p-10 rounded-[2rem] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]');
content = content.replace(/bg-black\/20 p-6 rounded-2xl border border-white\/5/g, 'bg-slate-50/50 p-6 rounded-2xl border border-slate-100');
content = content.replace(/bg-black\/20 rounded-2xl border border-white\/5/g, 'bg-slate-50/50 rounded-2xl border border-slate-100');
content = content.replace(/bg-black\/20 p-4 rounded-xl border border-white\/5/g, 'bg-slate-50/50 p-4 rounded-xl border border-slate-100');
content = content.replace(/bg-white\/5 backdrop-blur-xl p-6 rounded-2xl border border-white\/10 shadow-xl/g, 'bg-white p-6 rounded-[2rem] border border-slate-100/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]');
content = content.replace(/bg-white\/5 p-4 rounded-xl border border-white\/10/g, 'bg-white p-4 rounded-2xl border border-slate-100 shadow-sm');
content = content.replace(/bg-white\/5 p-5 rounded-2xl border border-white\/10/g, 'bg-white p-5 rounded-2xl border border-slate-100 shadow-sm');
content = content.replace(/bg-white\/5/g, 'bg-white'); 
content = content.replace(/bg-black\/20/g, 'bg-slate-50'); 
content = content.replace(/bg-blue-500\/10/g, 'bg-blue-50'); 
content = content.replace(/bg-indigo-500\/10/g, 'bg-indigo-50'); 
content = content.replace(/bg-purple-500\/10/g, 'bg-purple-50'); 

// Revert Input fields to premium light inputs
content = content.replace(/class="w-full bg-black\/40 px-4 py-3 rounded-xl text-white placeholder-slate-500 border border-white\/5 focus:border-indigo-500 transition-colors/g, 'class="w-full bg-slate-50/80 px-4 py-3 rounded-2xl text-slate-800 font-medium placeholder-slate-400 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none');
content = content.replace(/class="px-4 py-2 rounded-xl border border-white\/10 bg-black\/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"/g, 'class="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"');
content = content.replace(/class="px-3 py-1\.5 rounded-lg border border-white\/10 bg-black\/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors text-sm/g, 'class="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-sm');
content = content.replace(/class="px-3 py-2 rounded-lg border border-white\/10 bg-black\/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors/g, 'class="px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none');

content = content.replace(/border-white\/5/g, 'border-slate-100');
content = content.replace(/border-white\/10/g, 'border-slate-200');
content = content.replace(/border-white\/20/g, 'border-slate-300');

// Text colors (since I over-replaced earlier, I'll set everything back to slate-800/500/400)
// The text inside paragraphs/labels were text-slate-400, text-slate-300 etc.
content = content.replace(/text-slate-200/g, 'text-slate-600');
content = content.replace(/text-slate-300/g, 'text-slate-500');
content = content.replace(/text-slate-400/g, 'text-slate-400'); // Leave it or maybe it was 500
// Since I made text-white, let's replace text-white with text-slate-800 for headers and labels EXCEPT in buttons.
// Button texts are usually text-white.
content = content.replace(/text-white/g, 'TEXT_WHITE_PLACEHOLDER');
content = content.replace(/<([a-z1-6]+)([^>]*)class="([^"]*)TEXT_WHITE_PLACEHOLDER([^"]*)"/g, (match, tag, before, cls1, cls2) => {
  if (tag === 'button' || tag === 'div' && match.includes('bg-') && !match.includes('bg-white') && !match.includes('bg-slate')) {
    return `<${tag}${before}class="${cls1}text-white${cls2}"`;
  }
  return `<${tag}${before}class="${cls1}text-slate-800${cls2}"`;
});
// Revert the placeholder back if not replaced
content = content.replace(/TEXT_WHITE_PLACEHOLDER/g, 'text-white');

// Save buttons
// bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 transition-all hover:scale-105 active:scale-95
content = content.replace(/bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 shadow-lg shadow-indigo-500\/20 hover:shadow-indigo-500\/40 border border-slate-200 transition-all hover:scale-105 active:scale-95/g, 'bg-slate-900 text-white px-6 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all');
// Also if I missed the border replacement
content = content.replace(/bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 shadow-lg shadow-indigo-500\/20 hover:shadow-indigo-500\/40 border border-white\/10 transition-all hover:scale-105 active:scale-95/g, 'bg-slate-900 text-white px-6 shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all');

// Tabs container
content = content.replace(/bg-black\/30 p-2 rounded-\[30px\] border border-slate-200 backdrop-blur-md/g, 'bg-white p-2 rounded-full border border-slate-100 shadow-[0_2px_15px_rgb(0,0,0,0.03)]');
// If I missed border
content = content.replace(/bg-black\/30 p-2 rounded-\[30px\] border border-white\/10 backdrop-blur-md/g, 'bg-white p-2 rounded-full border border-slate-100 shadow-[0_2px_15px_rgb(0,0,0,0.03)]');
content = content.replace(/bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-blue-500\/25/g, 'bg-slate-900 text-white shadow-md shadow-slate-900/10');


fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('UI Reverted to Premium Light Mode');
