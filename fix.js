const fs = require('fs');
const content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');
const lines = content.split('\n');
const validLines = lines.slice(0, 552);
fs.writeFileSync('src/components/Portfolio.tsx', validLines.join('\n'));
console.log('Truncated from', lines.length, 'to', validLines.length, 'lines');
