const fs = require('fs');
const content = fs.readFileSync('src/components/Portfolio.tsx', 'utf8');
const lines = content.split('\n');
// export default Portfolio; が L551 (0-indexed: 550) なので、552行まで保持
const exportIdx = lines.findIndex(l => l.trim() === 'export default Portfolio;');
if (exportIdx >= 0) {
  const validLines = lines.slice(0, exportIdx + 2); // export行 + 空行1つ
  fs.writeFileSync('src/components/Portfolio.tsx', validLines.join('\n') + '\n');
  console.log('OK: Truncated from', lines.length, 'to', validLines.length + 1, 'lines');
} else {
  console.log('ERROR: Could not find export line');
}
