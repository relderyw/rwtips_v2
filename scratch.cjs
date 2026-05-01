const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('drafted.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

// Find all match containers. From the snippet: "grid grid-cols-3 items-center w-full"
const matches = document.querySelectorAll('.grid.grid-cols-3.items-center.w-full');
console.log("Found matches containers:", matches.length);

const results = [];
matches.forEach((matchEl) => {
    // The player names have class "uppercase text-3.5xl"
    // Since class names with dots are tricky with querySelector, let's use startsWith or includes
    // Or just querySelectorAll('div.uppercase')
    const uppercaseDivs = Array.from(matchEl.querySelectorAll('div.uppercase'));
    
    // The ones we want have "text-3.5xl". Let's filter manually:
    const playerDivs = uppercaseDivs.filter(d => d.className.includes('text-3.5xl') && !d.className.includes('vs'));
    
    if (playerDivs.length >= 2) {
        const p1 = playerDivs[0].textContent.trim();
        const p2 = playerDivs[1].textContent.trim();
        
        // Find date. It is in a div with "font-nunito" and "items-center"
        // Wait, looking at snippet: `<div class="flex flex-col items-center font-nunito">`
        const dateDiv = matchEl.querySelector('div.flex.flex-col.items-center.font-nunito');
        let dateStr = "";
        if (dateDiv) {
            // The structure: <div class="text-xs">Match...</div>30/04/2026 21:34<div>vs</div>
            // The date is a text node.
            Array.from(dateDiv.childNodes).forEach(node => {
                if (node.nodeType === 3) { // Text node
                    const text = node.textContent.trim();
                    if (text.match(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/)) {
                        dateStr = text;
                    }
                }
            });
        }
        
        results.push({ p1, p2, dateStr });
    }
});

console.log("Extracted matches:", results.length);
if(results.length > 0) {
    console.log(results.slice(0, 3));
}
