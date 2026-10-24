import { readFileSync } from 'fs';

for (const name of ['Home', 'Menu']) {
  console.log(`\n=== 15 HEAVIEST FILES ON ${name.toUpperCase()} ===`);
  const data = JSON.parse(readFileSync(`reports/baseline/${name}.json`, 'utf8'));
  const networkItems = data.audits?.['network-requests']?.details?.items || [];
  
  const sorted = networkItems
    .map(item => ({
      url: item.url.replace('http://localhost:4173', ''),
      resourceType: item.resourceType,
      transferSizeKB: (item.transferSize / 1024).toFixed(1),
      resourceSizeKB: (item.resourceSize / 1024).toFixed(1),
    }))
    .sort((a, b) => parseFloat(b.resourceSizeKB) - parseFloat(a.resourceSizeKB))
    .slice(0, 15);

  console.table(sorted);

  // Check oversized images audit
  const oversized = data.audits?.['uses-responsive-images']?.details?.items || [];
  if (oversized.length > 0) {
    console.log(`\nOversized images on ${name}:`);
    console.table(oversized.map(img => ({
      url: img.url.replace('http://localhost:4173', ''),
      totalBytesKB: (img.totalBytes / 1024).toFixed(1),
      wastedBytesKB: (img.wastedBytes / 1024).toFixed(1),
    })));
  }
}
