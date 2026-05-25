const fs = require('fs');

const d3code  = fs.readFileSync('data/d3.min.js', 'utf8');
const csvData = fs.readFileSync('data/ae-perf-0520.csv', 'utf8');
let   html    = fs.readFileSync('ae-perf-leadership.html', 'utf8');

// 1. Inline D3
const cdnTag = '<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>';
if (!html.includes(cdnTag)) { console.error('CDN tag not found'); process.exit(1); }
html = html.replace(cdnTag, `<script>${d3code}</script>`);

// 2. Embed CSV using JSON.stringify — handles ALL escaping safely
//    Replace the fetch() + .then(r => ...) block with Promise.resolve(jsonString)
const fetchBlock = `fetch('./data/ae-perf-0520.csv')
  .then(r => { if (!r.ok) throw new Error(\`HTTP \${r.status}\`); return r.text(); })`;

if (!html.includes(fetchBlock)) { console.error('fetch block not found in source'); process.exit(1); }

// JSON.stringify produces a valid JS string literal — no backtick or escaping issues
const inlineCSV = `Promise.resolve(${JSON.stringify(csvData)})`;
html = html.replace(fetchBlock, inlineCSV);

// 3. Safety check — no raw </script> inside the data (JSON escapes the slash, so this is safe)
const dataIdx  = html.indexOf(inlineCSV.slice(0, 40));
const afterData = html.indexOf('.then(csvText =>', dataIdx);
const embedded  = html.slice(dataIdx, afterData);
if (embedded.includes('</script>')) {
  console.error('WARNING: raw </script> found in embedded data — aborting');
  process.exit(1);
}

fs.mkdirSync('leadership', { recursive: true });
fs.writeFileSync('leadership/index.html', html, 'utf8');
const kb = (fs.statSync('leadership/index.html').size / 1024).toFixed(1);
console.log(`Done. leadership/index.html is ${kb} KB — fully standalone.`);
