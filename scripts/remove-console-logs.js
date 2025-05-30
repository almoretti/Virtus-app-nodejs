const fs = require('fs');
const path = require('path');

// Directories to scan
const dirsToScan = ['src'];

// File extensions to process
const extensions = ['.ts', '.tsx', '.js', '.jsx'];

// Counter for replaced statements
let replacedCount = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Skip files that already import logger
  const hasLogger = content.includes("from '@/lib/logger'");
  
  // Replace console.log statements
  content = content.replace(/console\.log\s*\([^)]*\);?/g, (match) => {
    replacedCount++;
    return '// ' + match.trim();
  });
  
  // Replace console.error statements with logger.error
  if (hasLogger) {
    content = content.replace(/console\.error\s*\(([^)]+)\);?/g, (match, args) => {
      replacedCount++;
      // Simple heuristic: if args contains a comma, treat first as message, rest as error
      if (args.includes(',')) {
        return `logger.error(${args});`;
      } else {
        return `logger.error('Error occurred', undefined, { details: ${args} });`;
      }
    });
  } else {
    // Just comment out console.error if logger not imported
    content = content.replace(/console\.error\s*\([^)]*\);?/g, (match) => {
      replacedCount++;
      return '// ' + match.trim();
    });
  }
  
  // Replace console.warn statements
  content = content.replace(/console\.warn\s*\([^)]*\);?/g, (match) => {
    replacedCount++;
    return '// ' + match.trim();
  });
  
  // Replace console.debug statements
  content = content.replace(/console\.debug\s*\([^)]*\);?/g, (match) => {
    replacedCount++;
    return '// ' + match.trim();
  });
  
  // Only write if changes were made
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Processed: ${filePath}`);
  }
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath);
    } else if (stat.isFile() && extensions.includes(path.extname(file))) {
      processFile(filePath);
    }
  }
}

console.log('🔍 Scanning for console statements...\n');

for (const dir of dirsToScan) {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
}

console.log(`\n✅ Complete! Replaced ${replacedCount} console statements.`);
console.log('\n⚠️  Note: Review the changes and manually update complex console.error statements to use proper logger methods.');