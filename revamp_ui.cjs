const fs = require('fs');
let content = fs.readFileSync('src/views/ContentManager.vue', 'utf8');

// Root div
content = content.replace(
  '<div class="space-y-10 min-h-screen relative pb-20">',
  '<div class="space-y-10 min-h-screen relative pb-20 p-8 bg-gradient-to-br from-slate-900 via-[#0a0f1c] to-indigo-950 rounded-tl-3xl text-slate-300 shadow-[inset_0_4px_30px_rgba(255,255,255,0.05)]">'
);

// Header text
content = content.replace(
  '<h1 class="text-3xl font-black tracking-tight text-slate-900 italic uppercase">',
  '<h1 class="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 italic uppercase drop-shadow-sm">'
);

// Panels
content = content.replace(/bg-white p-10 rounded-3xl border border-slate-100 shadow-sm/g, 'bg-white/5 backdrop-blur-3xl p-10 rounded-3xl border border-white/10 shadow-2xl');
content = content.replace(/bg-slate-50 p-6 rounded-2xl border border-slate-100/g, 'bg-black/20 p-6 rounded-2xl border border-white/5');
content = content.replace(/bg-slate-50 p-6 rounded-2xl/g, 'bg-black/20 p-6 rounded-2xl border border-white/5');
content = content.replace(/bg-slate-50 rounded-2xl border border-slate-200/g, 'bg-black/20 rounded-2xl border border-white/5');
content = content.replace(/bg-slate-50 p-4 rounded-xl border border-slate-100/g, 'bg-black/20 p-4 rounded-xl border border-white/5');
content = content.replace(/bg-white p-6 rounded-2xl border border-slate-100 shadow-sm/g, 'bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-xl');
content = content.replace(/bg-white p-4 rounded-xl border/g, 'bg-white/5 p-4 rounded-xl border border-white/10');
content = content.replace(/bg-white p-5 rounded-2xl border/g, 'bg-white/5 p-5 rounded-2xl border border-white/10');
content = content.replace(/bg-slate-100/g, 'bg-white/5'); // general light bg
content = content.replace(/bg-slate-50/g, 'bg-black/20'); // general light bg
content = content.replace(/bg-blue-50/g, 'bg-blue-500/10'); 
content = content.replace(/bg-indigo-50/g, 'bg-indigo-500/10'); 
content = content.replace(/bg-purple-50/g, 'bg-purple-500/10'); 

// Input fields
content = content.replace(/class="w-full bg-slate-50 px-4 py-3 rounded-xl/g, 'class="w-full bg-black/40 px-4 py-3 rounded-xl text-white placeholder-slate-500 border border-white/5 focus:border-indigo-500 transition-colors');
content = content.replace(/class="px-4 py-2 rounded border"/g, 'class="px-4 py-2 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors"');
content = content.replace(/class="px-3 py-1 rounded border text-sm/g, 'class="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors text-sm');
content = content.replace(/class="px-3 py-1.5 rounded border text-sm bg-white"/g, 'class="px-3 py-1.5 rounded-lg border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors text-sm"');
content = content.replace(/class="px-3 py-2 rounded border/g, 'class="px-3 py-2 rounded-lg border border-white/10 bg-black/40 text-white placeholder-slate-500 focus:border-indigo-500 transition-colors');
content = content.replace(/border-slate-50/g, 'border-white/5');
content = content.replace(/border-slate-100/g, 'border-white/10');
content = content.replace(/border-slate-200/g, 'border-white/20');

// Specific text colors
content = content.replace(/text-slate-800/g, 'text-white');
content = content.replace(/text-slate-900/g, 'text-white');
content = content.replace(/text-slate-500/g, 'text-slate-400');
content = content.replace(/text-slate-600/g, 'text-slate-300');
content = content.replace(/text-slate-700/g, 'text-slate-200');

// Save buttons
content = content.replace(/bg-slate-900 text-white px-5/g, 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-5 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 border border-white/10 transition-all hover:scale-105 active:scale-95');

// Tabs container
content = content.replace(/bg-black\/20 p-2 rounded-\[30px\]/g, 'bg-black/30 p-2 rounded-[30px] border border-white/10 backdrop-blur-md');
content = content.replace(/bg-white text-blue-600 shadow-sm/g, 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-blue-500/25');

// Main publish button
content = content.replace(/bg-blue-600 text-white px-8/g, 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 border border-white/10 transition-all hover:scale-105');

fs.writeFileSync('src/views/ContentManager.vue', content);
console.log('UI Revamp basic script applied');
