const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const extractedDir = path.join(__dirname, '../Data/extracted');
const outputDir = path.join(__dirname, '../Data/json');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function getAllCsvFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      getAllCsvFiles(filePath, fileList);
    } else if (file.toLowerCase().endsWith('.csv')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function convertCsvToJson(csvPath) {
  console.log(`Converting: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  
  const result = Papa.parse(csvContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  
  if (result.errors.length > 0) {
    console.error(`  ⚠ Errors in ${csvPath}:`, result.errors);
  }
  
  // Create relative path structure
  const relativePath = path.relative(extractedDir, csvPath);
  const jsonPath = path.join(outputDir, relativePath.replace(/\.csv$/i, '.json'));
  
  // Create subdirectories if needed
  const jsonDir = path.dirname(jsonPath);
  if (!fs.existsSync(jsonDir)) {
    fs.mkdirSync(jsonDir, { recursive: true });
  }
  
  // Write JSON file
  fs.writeFileSync(jsonPath, JSON.stringify(result.data, null, 2));
  
  const fileSizeMB = (fs.statSync(csvPath).size / 1024 / 1024).toFixed(2);
  const jsonSizeMB = (fs.statSync(jsonPath).size / 1024 / 1024).toFixed(2);
  const rows = result.data.length;
  
  console.log(`  ✓ ${rows} rows | CSV: ${fileSizeMB} MB → JSON: ${jsonSizeMB} MB`);
  
  return {
    csvPath: relativePath,
    jsonPath: path.relative(outputDir, jsonPath),
    rows,
    csvSize: fileSizeMB,
    jsonSize: jsonSizeMB
  };
}

console.log('🔄 Converting CSV files to JSON...\n');

const csvFiles = getAllCsvFiles(extractedDir);
console.log(`Found ${csvFiles.length} CSV files\n`);

const results = [];
let totalCsvSize = 0;
let totalJsonSize = 0;

csvFiles.forEach(csvPath => {
  try {
    const result = convertCsvToJson(csvPath);
    results.push(result);
    totalCsvSize += parseFloat(result.csvSize);
    totalJsonSize += parseFloat(result.jsonSize);
  } catch (error) {
    console.error(`  ✗ Failed: ${error.message}`);
  }
});

console.log('\n✅ Conversion Complete!\n');
console.log(`Total files: ${results.length}`);
console.log(`Total CSV size: ${totalCsvSize.toFixed(2)} MB`);
console.log(`Total JSON size: ${totalJsonSize.toFixed(2)} MB`);
console.log(`Size increase: ${((totalJsonSize / totalCsvSize - 1) * 100).toFixed(1)}%`);
console.log(`\nJSON files saved to: ${outputDir}`);

// Create an index file
const indexPath = path.join(outputDir, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify({
  convertedAt: new Date().toISOString(),
  totalFiles: results.length,
  totalCsvSizeMB: parseFloat(totalCsvSize.toFixed(2)),
  totalJsonSizeMB: parseFloat(totalJsonSize.toFixed(2)),
  files: results
}, null, 2));

console.log(`📝 Index file created: ${indexPath}`);
