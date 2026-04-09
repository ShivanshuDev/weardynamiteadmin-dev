const fs = require('fs');
const file = 'h:/weardynamite/admin/src/views/ContentManager.vue';
let content = fs.readFileSync(file, 'utf8');

const tags = ['input', 'textarea', 'select'];

tags.forEach(tag => {
    // Replace single digit text-[Xpx] and double digit text-[XXpx] with text-sm
    const regex1 = new RegExp(`<${tag}([^>]*)text-\\[\\dpx\\]([^>]*)>`, 'g');
    const regex2 = new RegExp(`<${tag}([^>]*)text-\\[\\d\\dpx\\]([^>]*)>`, 'g');
    const regex3 = new RegExp(`<${tag}([^>]*)text-xs([^>]*)>`, 'g');

    content = content.replace(regex1, `<${tag}$1text-sm$2>`);
    content = content.replace(regex2, `<${tag}$1text-sm$2>`);
    content = content.replace(regex3, `<${tag}$1text-sm$2>`);
});

fs.writeFileSync(file, content);
console.log('Replaced all input/textarea/select text-[Xpx]/text-xs with text-sm for better visibility');
