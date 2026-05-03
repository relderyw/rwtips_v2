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
    let originalContent = content;

    // 1. Replace hardcoded dark backgrounds with glass backgrounds
    content = content.replace(/bg-\[#(111115|16161b|1a1a1f|131316|1A1D20|101014)\]\s+border\s+border-\[#25252a\]/g, 'bg-white/[0.02] border border-white/[0.05] backdrop-blur-md');
    
    // Sometimes they are flipped
    content = content.replace(/border\s+border-\[#25252a\]\s+bg-\[#(111115|16161b|1a1a1f|131316|1A1D20|101014)\]/g, 'bg-white/[0.02] border border-white/[0.05] backdrop-blur-md');

    // Lone background replacements
    content = content.replace(/bg-\[#(111115|16161b|1a1a1f|131316|1A1D20|101014)\](?!\/)/g, 'bg-white/[0.02]');
    content = content.replace(/border-\[#25252a\]/g, 'border-white/[0.05]');
    content = content.replace(/divide-\[#25252a\]/g, 'divide-white/[0.05]');
    
    // 2. Remove 'card-glow' to prevent messy shadows
    content = content.replace(/\bcard-glow\b/g, 'shadow-2xl shadow-black/40');

    // 3. Ensure consistent transitions
    // Adding transition-all duration-300 to buttons if they have hover but no transition
    const buttonRegex = /<button[^>]*className="([^"]*hover:[^"]*)"/g;
    content = content.replace(buttonRegex, (match, classes) => {
        if (!classes.includes('transition')) {
            const newClasses = classes + ' transition-all duration-300 ease-in-out';
            return match.replace(classes, newClasses);
        }
        return match;
    });

    if (content !== originalContent) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Applied Glassmorphism to ' + file);
        changedFiles++;
    }
});

console.log('Total files changed: ' + changedFiles);
