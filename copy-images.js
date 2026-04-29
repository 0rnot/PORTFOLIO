const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/81901/.gemini/antigravity/brain/701f4a7a-16df-48f8-bc0c-2b9a2bc22b45';
const destDir = 's:/kaihatu/kabuka/public/images';

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = fs.readdirSync(srcDir);
files.forEach(file => {
  if (file.endsWith('.png')) {
    fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
    console.log(`Copied ${file}`);
  }
});
