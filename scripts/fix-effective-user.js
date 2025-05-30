const fs = require('fs');
const path = require('path');

// Pattern to find effectiveUser null checks
const pattern = /if\s*\(\s*effectiveUser\.role\s*!==\s*(Role\.ADMIN|'ADMIN'|"ADMIN")\s*\)\s*{/g;
const replacement = 'if (!effectiveUser || effectiveUser.role !== $1) {';

let filesFixed = 0;

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const newContent = content.replace(pattern, replacement);
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Fixed: ${filePath}`);
    filesFixed++;
  }
}

// Find all TypeScript files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = findFiles(srcDir);

files.forEach(file => {
  if (fs.readFileSync(file, 'utf8').includes('effectiveUser')) {
    fixFile(file);
  }
});

console.log(`\n✅ Fixed ${filesFixed} files with effectiveUser null checks.`);