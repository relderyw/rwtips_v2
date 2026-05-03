const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./components');
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let updated = false;

    // Reduce text-7xl to text-5xl and text-6xl to text-4xl
    const sizeRegex = /className="([^"]*text-[67]xl[^"]*)"/g;
    content = content.replace(sizeRegex, (match, p1) => {
        if (p1.includes('text-7xl')) {
            updated = true;
            p1 = p1.replace(/text-7xl/g, 'text-5xl');
        }
        if (p1.includes('text-6xl')) {
            updated = true;
            p1 = p1.replace(/text-6xl/g, 'text-4xl');
        }
        return `className="${p1}"`;
    });

    if (updated) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Reduced font sizes in ' + file);
        changedFiles++;
    }
});

console.log('Total files changed: ' + changedFiles);
