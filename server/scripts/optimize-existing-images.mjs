import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROCESSED_DIR = path.resolve(__dirname, '../uploads/processed');

const isApply = process.argv.includes('--apply');
console.log(`=== OPTIMIZE EXISTING IMAGES (${isApply ? 'APPLY MODE' : 'DRY RUN - use --apply to execute'}) ===\n`);

try {
  const files = await fs.readdir(PROCESSED_DIR);
  const webpFiles = files.filter(f => f.endsWith('.webp') && !f.endsWith('_thumb.webp'));

  console.log(`Found ${webpFiles.length} full-size WebP images in ${PROCESSED_DIR}\n`);

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let oversizedCount = 0;

  for (const file of webpFiles) {
    const fullPath = path.join(PROCESSED_DIR, file);
    const stat = await fs.stat(fullPath);
    totalOriginalBytes += stat.size;

    const metadata = await sharp(fullPath).metadata();
    const isOversized = metadata.width > 1600 || stat.size > 150 * 1024;

    if (isOversized) oversizedCount++;

    // Test compression
    const optimizedBuffer = await sharp(fullPath)
      .resize({ width: Math.min(metadata.width || 1200, 1600), withoutEnlargement: true })
      .webp({ quality: 78, effort: 4 })
      .toBuffer();

    totalOptimizedBytes += optimizedBuffer.length;

    const savedKb = ((stat.size - optimizedBuffer.length) / 1024).toFixed(1);
    const pct = (((stat.size - optimizedBuffer.length) / stat.size) * 100).toFixed(1);

    if (isOversized || isApply) {
      console.log(`${file}: ${metadata.width}x${metadata.height}, ${(stat.size / 1024).toFixed(1)} KB -> ${(optimizedBuffer.length / 1024).toFixed(1)} KB (-${savedKb} KB, -${pct}%)`);
    }

    if (isApply) {
      await fs.writeFile(fullPath, optimizedBuffer);

      // Also ensure thumb exists and is optimized
      const thumbFile = file.replace(/\.webp$/, '_thumb.webp');
      const thumbPath = path.join(PROCESSED_DIR, thumbFile);
      const thumbBuffer = await sharp(fullPath)
        .resize({ width: 480, withoutEnlargement: true })
        .webp({ quality: 75, effort: 4 })
        .toBuffer();
      await fs.writeFile(thumbPath, thumbBuffer);
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total images scanned: ${webpFiles.length}`);
  console.log(`Oversized (>1600px or >150KB): ${oversizedCount}`);
  console.log(`Total original size: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Total optimized size: ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Potential savings: ${((totalOriginalBytes - totalOptimizedBytes) / (1024 * 1024)).toFixed(2)} MB`);
} catch (err) {
  console.error('Error scanning images:', err);
}
