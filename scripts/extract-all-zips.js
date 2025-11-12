const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const dataDir = path.join(__dirname, '../Data');
const extractedDir = path.join(dataDir, 'extracted');

const zipFiles = [
  'barber-motorsports-park.zip',
  'circuit-of-the-americas.zip',
  'indianapolis.zip',
  'road-america.zip',
  'sebring.zip',
  'sonoma.zip',
  'virginia-international-raceway.zip'
];

// Create extracted directory if it doesn't exist
if (!fs.existsSync(extractedDir)) {
  fs.mkdirSync(extractedDir, { recursive: true });
}

console.log('🗜️  Extracting All Track ZIP Files\n');
console.log('='.repeat(60));

zipFiles.forEach((zipFileName, index) => {
  const zipPath = path.join(dataDir, zipFileName);
  
  if (!fs.existsSync(zipPath)) {
    console.log(`\n${index + 1}. ⚠️  ${zipFileName}`);
    console.log(`   Status: File not found - skipping`);
    return;
  }

  console.log(`\n${index + 1}. 📦 ${zipFileName}`);
  
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    const zipSizeMB = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
    console.log(`   Size: ${zipSizeMB} MB`);
    console.log(`   Files: ${entries.length}`);
    
    // Extract to a subfolder named after the track
    const trackName = zipFileName.replace('.zip', '');
    const outputPath = path.join(extractedDir, trackName);
    
    // Check if already extracted
    if (fs.existsSync(outputPath)) {
      const existingFiles = fs.readdirSync(outputPath, { recursive: true });
      const csvCount = existingFiles.filter(f => f.toLowerCase().endsWith('.csv')).length;
      
      if (csvCount > 0) {
        console.log(`   ✓ Already extracted (${csvCount} CSV files)`);
        console.log(`   Location: ${outputPath}`);
        return;
      }
    }
    
    console.log(`   🔄 Extracting...`);
    zip.extractAllTo(outputPath, true);
    
    // Count extracted CSV files
    const extractedFiles = fs.readdirSync(outputPath, { recursive: true });
    const csvFiles = extractedFiles.filter(f => f.toLowerCase().endsWith('.csv'));
    
    console.log(`   ✅ Extracted ${csvFiles.length} CSV files`);
    console.log(`   Location: ${outputPath}`);
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('✅ Extraction Complete!');
console.log(`\nNext steps:`);
console.log(`  1. Run: npm run convert-csv`);
console.log(`  2. Run: npm run convert-large-csv`);
console.log('='.repeat(60));
