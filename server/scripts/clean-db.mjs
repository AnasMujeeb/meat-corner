/**
 * Database Cleanup Script for Meat Corner
 * server/scripts/clean-db.mjs
 *
 * Drops/clears dummy collections:
 *   - MenuItems
 *   - Categories
 *   - Branches
 *   - Submissions
 *
 * Keeps:
 *   - Admin users (credentials retained)
 *   - SiteSettings (brand settings, socials, logos retained)
 *
 * Run: node scripts/clean-db.mjs
 *   or npm run clean
 */

import 'dotenv/config';
import { connectDB, disconnectDB } from '../src/config/database.js';
import MenuItem from '../src/models/MenuItem.js';
import Category from '../src/models/Category.js';
import Branch from '../src/models/Branch.js';
import Submission from '../src/models/Submission.js';
import Admin from '../src/models/Admin.js';
import SiteSettings from '../src/models/SiteSettings.js';

function section(title) {
  console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 40 - title.length))}`);
}

async function cleanDatabase() {
  console.log('\n🧹  Meat Corner – Database Cleanup Script');
  console.log('═'.repeat(45));

  await connectDB();

  section('Current Collection Counts (Before Cleanup)');
  const beforeCounts = {
    menuItems: await MenuItem.countDocuments(),
    categories: await Category.countDocuments(),
    branches: await Branch.countDocuments(),
    submissions: await Submission.countDocuments(),
    admins: await Admin.countDocuments(),
    siteSettings: await SiteSettings.countDocuments(),
  };

  console.log(`  • MenuItems:    ${beforeCounts.menuItems}`);
  console.log(`  • Categories:   ${beforeCounts.categories}`);
  console.log(`  • Branches:     ${beforeCounts.branches}`);
  console.log(`  • Submissions:  ${beforeCounts.submissions}`);
  console.log(`  • Admins:       ${beforeCounts.admins} (will be preserved)`);
  console.log(`  • SiteSettings: ${beforeCounts.siteSettings} (will be preserved)`);

  section('Purging Demo / Dummy Collections');

  const menuDeleteRes = await MenuItem.deleteMany({});
  console.log(`  🗑️  Cleared MenuItems:   ${menuDeleteRes.deletedCount} removed`);

  const catDeleteRes = await Category.deleteMany({});
  console.log(`  🗑️  Cleared Categories:  ${catDeleteRes.deletedCount} removed`);

  const branchDeleteRes = await Branch.deleteMany({});
  console.log(`  🗑️  Cleared Branches:    ${branchDeleteRes.deletedCount} removed`);

  const subDeleteRes = await Submission.deleteMany({});
  console.log(`  🗑️  Cleared Submissions: ${subDeleteRes.deletedCount} removed`);

  section('Post-Cleanup Verification');
  const afterCounts = {
    menuItems: await MenuItem.countDocuments(),
    categories: await Category.countDocuments(),
    branches: await Branch.countDocuments(),
    submissions: await Submission.countDocuments(),
    admins: await Admin.countDocuments(),
    siteSettings: await SiteSettings.countDocuments(),
  };

  console.log(`  • MenuItems:    ${afterCounts.menuItems} (clean: ${afterCounts.menuItems === 0 ? '✅' : '❌'})`);
  console.log(`  • Categories:   ${afterCounts.categories} (clean: ${afterCounts.categories === 0 ? '✅' : '❌'})`);
  console.log(`  • Branches:     ${afterCounts.branches} (clean: ${afterCounts.branches === 0 ? '✅' : '❌'})`);
  console.log(`  • Submissions:  ${afterCounts.submissions} (clean: ${afterCounts.submissions === 0 ? '✅' : '❌'})`);
  console.log(`  • Admins:       ${afterCounts.admins} (intact: ${afterCounts.admins > 0 ? '✅' : '⚠️'})`);
  console.log(`  • SiteSettings: ${afterCounts.siteSettings} (intact: ${afterCounts.siteSettings > 0 ? '✅' : '⚠️'})`);

  const allClean =
    afterCounts.menuItems === 0 &&
    afterCounts.categories === 0 &&
    afterCounts.branches === 0 &&
    afterCounts.submissions === 0;

  console.log('\n' + '═'.repeat(45));
  if (allClean) {
    console.log('✅  SUCCESS: All demo data wiped clean! Database is ready for Master Menu population.\n');
  } else {
    console.warn('⚠️  WARNING: Some items may still remain in the database.\n');
  }

  await disconnectDB();
  process.exit(allClean ? 0 : 1);
}

cleanDatabase().catch(async (err) => {
  console.error('\n❌  Cleanup failed:', err);
  try {
    await disconnectDB();
  } catch (_) {}
  process.exit(1);
});
