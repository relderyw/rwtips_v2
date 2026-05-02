const fs = require('fs');

function test() {
    const html = fs.readFileSync('drafted_raw.html', 'utf8');
    // Find timestamps. App router JSON usually contains strings like "2026-05-02T..." or unix epoch
    const isoDates = html.match(/202[4-9]-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?/g) || [];
    console.log("ISO Dates found:", new Set(isoDates));
}
test();
