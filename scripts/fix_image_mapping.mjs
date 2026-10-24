/**
 * fix_image_mapping.mjs
 *
 * Corrects the image assignments in server/src/seed/master_seed_data.json.
 * Run from the workspace root: node scripts/fix_image_mapping.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── 1. Build the index of available WebP slugs ─────────────────────────────
const processedDir = path.join(ROOT, 'server', 'uploads', 'processed');
const availableSlugs = new Set(
  fs.readdirSync(processedDir)
    .filter(f => f.endsWith('.webp') && !f.includes('_thumb'))
    .map(f => f.replace('.webp', ''))
);

function imgEntry(slug) {
  return {
    url: `/uploads/processed/${slug}.webp`,
    thumbUrl: `/uploads/processed/${slug}_thumb.webp`,
    alt: slug.replace(/-/g, ' '),
  };
}

// ── 2. Curated manual overrides (item slug → image slug or null) ──────────
const MANUAL_OVERRIDES = {
  'rib-eye-wagyu-6-to-7':                      'wagyu-ribeye-entrecote-steak',
  'wagyu-striploin-entrecote-steak-meat':       'wagyu-striploin-entrecote-steak',
  '1-kg-wagyu-tomahawk-steak':                  'wagyu-striploin-entrecote-steak',
  'wagyu-premium-espetada':                     'wagyu-kofta-with-cheese',
  'luxurious-wagyu-tenderloin-mb-4-to-5':       'wagyu-kofta-with-cheese',
  'wagyu-burger':                               'wagyu-kofta-with-cheese',
  'wagyu-truffle-mushroom-burger':              'truffle-mushroom-sandwich',
  'premium-wagyu-striploin-mb-6-to-7':         'wagyu-striploin-entrecote-steak',
  'wagyu-beef-quesadilla':                      'wagyu-minced-beef-nachos',
  'swiss-mushroom-burger':                      'truffle-mushroom-sandwich',
  'american-classic-beef-burger':               'angus-kofta-with-cheese',
  'grilled-chicken-burger':                     'flamed-grilled-chicken-breast-220g',
  'chicken-quesadilla':                         'tenderloin-beef-shawarma-bowl',
  'beef-short-ribs-burger':                     'short-ribs-nachos',
  'angus-bbq-short-ribs':                       'short-ribs-nachos',
  'beef-loaded-sweet-potato':                   'cheesy-baked-potato',
  'shredded-corn-with-cheetos':                 'cajun-potato-wedges',
  'shredded-corn':                              'cajun-potato-wedges',
  'side-salad':                                 'meat-corner-salad',
  'white-steamed-rice':                         'mexican-rice',
  'baked-sweet-potato':                         'cheesy-baked-potato',
  'sweet-fries':                                'potato-fries',
  'saut-ed-vegetables':                         'sauted-vegetables',
  'creamy-mushroom-chicken-sauce-with-mashed-potato': 'mushroom-sauce',
  'mushroom-sauce-beef-with-mashed-potato':     'mushroom-sauce',
  'grilled-beef-tenderloin':                    'shashlik-tenderloin',
  'grilled-chicken-breast':                     'flamed-grilled-chicken-breast-220g',
  'baked-salmon':                               'classic-salmon',
  'healthy-chicken-shawarma':                   'chicken-shawarma-bowl',
  'healthy-beef-tendeloin-shawarma-wrap':       'tenderloin-beef-shawarma-bowl',
  'grilled-chicken-mac-cheese':                 'mac-cheese',
  'homemade-jalape-o':                          'homemade-jalapeno',
  'tahini-sauce':                               'spicy-tahina',
  'homemade-pickled-onion':                     'homemade-pickled-onions',
  'entrec-te-sauce':                            'entrecote-sauce',
  'chimichurri-sauce':                          'chimichuri-sauce',
  'cowboy-giant-plate-with-grilled-meats':      'ribeye-steak',
  'supreme-entrec-te-steak':                    'black-angus-ribeye-entrecote-steak',
  'santorini-striploin':                        'striploin-steak',
  'mushroom-and-truffle-steak':                 'mushroom-truffle-sauce',
  'tenderloin-steak-box-200-g':                'shashlik-tenderloin',
  'energy-date-balls':                          null,
  'banana-pudding':                             null,
};

// ── 3. Auto-match (conservative: score >= 0.5) ─────────────────────────────
function autoMatch(itemSlug) {
  if (availableSlugs.has(itemSlug)) return itemSlug;
  const tokens = new Set(itemSlug.split('-').filter(t => t.length > 2));
  let best = null, bestScore = 0;
  for (const imgSlug of availableSlugs) {
    const imgTokens = new Set(imgSlug.split('-').filter(t => t.length > 2));
    const intersection = [...tokens].filter(t => imgTokens.has(t)).length;
    if (intersection === 0) continue;
    const score = intersection / Math.max(tokens.size, imgTokens.size);
    if (score > bestScore) { bestScore = score; best = imgSlug; }
  }
  return bestScore >= 0.5 ? best : null;
}

// ── 4. Patch seed JSON ───────────────────────────────────────────────────────
const seedPath = path.join(ROOT, 'server', 'src', 'seed', 'master_seed_data.json');
const data = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
let matched = 0, manual = 0, noImage = 0;

data.menuItems = data.menuItems.map(item => {
  const slug = item.slug;
  if (Object.prototype.hasOwnProperty.call(MANUAL_OVERRIDES, slug)) {
    const imgSlug = MANUAL_OVERRIDES[slug];
    manual++;
    if (!imgSlug || !availableSlugs.has(imgSlug)) { noImage++; return { ...item, images: [] }; }
    return { ...item, images: [imgEntry(imgSlug)] };
  }
  if (availableSlugs.has(slug)) { matched++; return { ...item, images: [imgEntry(slug)] }; }
  const auto = autoMatch(slug);
  if (auto) { matched++; return { ...item, images: [imgEntry(auto)] }; }
  noImage++;
  return { ...item, images: [] };
});

fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ master_seed_data.json patched');
console.log('   Auto-matched :', matched);
console.log('   Manual overrides:', manual);
console.log('   No image (placeholder):', noImage);
console.log('\nFinal assignments:');
data.menuItems.forEach(it => {
  const url = (it.images || [])[0]?.url || '(placeholder)';
  console.log(' ', it.slug.padEnd(52), '->', url.split('/').pop());
});
