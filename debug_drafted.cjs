const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('drafted.html', 'utf8');
const dom = new JSDOM(html);
const document = dom.window.document;

const matchEls = Array.from(document.querySelectorAll('.grid.grid-cols-3.items-center.w-full'));
console.log(`Containers: ${matchEls.length}`);

matchEls.forEach((el, i) => {
    console.log(`--- Match ${i} ---`);
    // Jogadores: procurar divs que tenham classes de texto grande e não sejam o "VS"
    const divs = Array.from(el.querySelectorAll('div'));
    const players = divs.filter(d => 
        d.textContent && 
        d.className.includes('text-3.5xl') && 
        !d.textContent.toLowerCase().includes('vs')
    ).map(d => d.textContent.trim());

    console.log(`Players: ${JSON.stringify(players)}`);

    // Data: Procurar por texto que pareça data DD/MM/YYYY HH:mm
    const text = el.textContent || "";
    const dateMatch = text.match(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/);
    console.log(`Date: ${dateMatch ? dateMatch[1] : 'NOT FOUND'}`);
});
