const fs = require('fs');
let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// Reset to a clean, crisp "Vercel/Linear" style aesthetic

// Root div
content = content.replace(
  /<div class="space-y-10 min-h-screen relative pb-20 px-8 py-10 bg-\[#FAFAFA\] text-slate-800">/g,
  '<div class="space-y-12 min-h-screen relative pb-24 px-8 py-12 bg-slate-50 text-slate-900 font-sans">'
);
content = content.replace(
  /<h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">/g,
  '<h1 class="text-3xl font-bold tracking-tight text-slate-900">'
);

// Cards: change from big rounded to sleek rounded-xl with crisp shadows
content = content.replace(/bg-white p-10 rounded-\[2rem\] border border-slate-100\/80 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'bg-white p-8 rounded-2xl border border-slate-200/75 shadow-sm');
content = content.replace(/bg-slate-50\/50 p-6 rounded-2xl border border-slate-100/g, 'bg-slate-50/50 p-6 rounded-xl border border-slate-200/75');
content = content.replace(/bg-slate-50\/50 rounded-2xl border border-slate-100/g, 'bg-slate-50/50 rounded-xl border border-slate-200/75');
content = content.replace(/bg-slate-50\/50 p-4 rounded-xl border border-slate-100/g, 'bg-slate-50/50 p-4 rounded-xl border border-slate-200/75');
content = content.replace(/bg-white p-6 rounded-\[2rem\] border border-slate-100\/80 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\]/g, 'bg-white p-6 rounded-2xl border border-slate-200/75 shadow-sm');
content = content.replace(/bg-white p-4 rounded-2xl border border-slate-100 shadow-sm/g, 'bg-white p-4 rounded-xl border border-slate-200/75 shadow-sm');
content = content.replace(/bg-white p-5 rounded-2xl border border-slate-100 shadow-sm/g, 'bg-white p-5 rounded-xl border border-slate-200/75 shadow-sm');

// Form Inputs: Sleek, crisp borders, minimal padding, rounded-lg
content = content.replace(/class="w-full bg-slate-50\/80 px-4 py-3 rounded-2xl text-slate-800 font-medium placeholder-slate-400 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500\/10 transition-all outline-none"/g, 'class="w-full bg-white px-3 py-2.5 rounded-lg text-slate-900 font-medium placeholder-slate-400 border border-slate-200/80 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all outline-none"');

content = content.replace(/class="px-4 py-2\.5 rounded-xl border border-slate-200 bg-slate-50\/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500\/10 transition-all outline-none"/g, 'class="px-4 py-2 rounded-lg border border-slate-200/80 bg-white text-slate-900 font-medium placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all outline-none"');

content = content.replace(/class="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50\/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500\/10 transition-all outline-none text-sm"/g, 'class="px-3 py-2 rounded-lg border border-slate-200/80 bg-white text-slate-900 font-medium placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all outline-none text-sm"');

content = content.replace(/class="px-3 py-2\.5 rounded-xl border border-slate-200 bg-slate-50\/80 text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500\/10 transition-all outline-none"/g, 'class="px-3 py-2 rounded-lg border border-slate-200/80 bg-white text-slate-900 font-medium placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all outline-none"');

// Save buttons: Black buttons with slight shadow, rounded-lg
content = content.replace(/bg-slate-900 text-white px-6 shadow-xl shadow-slate-900\/10 hover:shadow-slate-900\/20 hover:scale-105 hover:-translate-y-0\.5 active:scale-95 transition-all/g, 'bg-slate-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 active:bg-slate-950 transition-colors flex items-center gap-2');

// Tab pills
content = content.replace(/bg-white p-2 rounded-full border border-slate-100 shadow-\[0_2px_15px_rgb\(0,0,0,0\.03\)\]/g, 'bg-slate-200/50 p-1.5 rounded-xl border border-slate-200/50 flex gap-1');

content = content.replace(/bg-slate-900 text-white shadow-md shadow-slate-900\/10/g, 'bg-white text-slate-900 shadow-sm rounded-lg');

// Typography adjustments
// "font-black uppercase tracking-widest text-slate-800" -> "font-semibold tracking-tight text-slate-900"
content = content.replace(/font-black uppercase tracking-widest text-slate-800/g, 'font-semibold tracking-tight text-slate-900');
content = content.replace(/font-black uppercase tracking-\[0\.2em\]/g, 'font-medium uppercase tracking-wider text-xs');
content = content.replace(/font-bold uppercase tracking-widest/g, 'font-medium text-slate-500');

// General text colors
content = content.replace(/text-slate-800/g, 'text-slate-900');
content = content.replace(/text-slate-400/g, 'text-slate-500');

fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('UI Reverted to Crisp Vercel-like Aesthetic');
