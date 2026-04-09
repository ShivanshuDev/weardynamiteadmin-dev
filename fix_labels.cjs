const fs = require('fs');
const file = 'h:/weardynamite/admin/src/views/ContentManager.vue';
let content = fs.readFileSync(file, 'utf8');

// Replace standard single-digit px labels like text-[8px], text-[9px], text-[7px]
content = content.replace(/<label class="([^"]*)text-\[\dpx\]([^"]*)"/g, '<label class="$1text-xs$2"');
content = content.replace(/<label class="([^"]*)text-\[\d\dpx\]([^"]*)"/g, '<label class="$1text-xs$2"');

fs.writeFileSync(file, content);
console.log('Replaced all label text-[Xpx] with text-xs');
