import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const pages = [
  { name: 'Home', url: 'http://localhost:4173/' },
  { name: 'Menu', url: 'http://localhost:4173/menu' },
  { name: 'MenuDetail', url: 'http://localhost:4173/menu' },
  { name: 'Catering', url: 'http://localhost:4173/catering' },
  { name: 'Contact', url: 'http://localhost:4173/contact' },
];

mkdirSync('reports/baseline', { recursive: true });

const results = [];

for (const page of pages) {
  console.log(`\nRunning Lighthouse for ${page.name} (${page.url})...`);
  const reportPath = resolve(`reports/baseline/${page.name}.json`);
  const cmd = `npx lighthouse "${page.url}" --preset=perf --form-factor=mobile --only-categories=performance --output=json --output-path="${reportPath}" --chrome-flags="--headless=new --no-sandbox"`;

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 90000 });
    const raw = JSON.parse(execSync(`node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('${reportPath.replace(/\\/g, '/')}'))))"`, { maxBuffer: 50 * 1024 * 1024 }));
    
    const perfScore = Math.round((raw.categories?.performance?.score || 0) * 100);
    const lcp = raw.audits?.['largest-contentful-paint']?.displayValue || `${raw.audits?.['largest-contentful-paint']?.numericValue} ms`;
    const cls = raw.audits?.['cumulative-layout-shift']?.displayValue || `${raw.audits?.['cumulative-layout-shift']?.numericValue}`;
    const tbt = raw.audits?.['total-blocking-time']?.displayValue || `${raw.audits?.['total-blocking-time']?.numericValue} ms`;
    const totalByteWeight = raw.audits?.['total-byte-weight']?.numericValue || 0;
    const networkRequests = raw.audits?.['network-requests']?.details?.items?.length || 0;

    results.push({
      page: page.name,
      perfScore,
      lcp,
      cls,
      tbt,
      transferKb: (totalByteWeight / 1024).toFixed(1),
      requests: networkRequests,
    });
    console.log(`✅ ${page.name}: Score=${perfScore}, LCP=${lcp}, CLS=${cls}, TBT=${tbt}, Transfer=${(totalByteWeight / 1024).toFixed(1)} KB, Req=${networkRequests}`);
  } catch (err) {
    console.error(`❌ Failed ${page.name}:`, err.message);
  }
}

console.log('\n=== LIGHTHOUSE BASELINE RESULTS ===');
console.table(results);
writeFileSync('reports/baseline/summary.json', JSON.stringify(results, null, 2));
