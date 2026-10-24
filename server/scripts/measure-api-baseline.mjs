import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

const endpoints = [
  '/api/public/categories',
  '/api/public/menu',
  '/api/public/menu?category=burgers',
  '/api/public/menu?tag=featured',
  '/api/public/menu/classic-smash-burger',
  '/api/public/settings',
  '/api/public/branches',
];

console.log('=== API BASELINE MEASUREMENTS ===');
for (const ep of endpoints) {
  const url = `http://localhost:5000${ep}`;
  const start = performance.now();
  const res = await fetch(url);
  const duration = (performance.now() - start).toFixed(1);
  const text = await res.text();
  const size = Buffer.byteLength(text, 'utf8');

  console.log(`\nEndpoint: ${ep}`);
  console.log(`Status: ${res.status}`);
  console.log(`Time: ${duration} ms`);
  console.log(`Payload size: ${(size / 1024).toFixed(2)} KB (${size} bytes)`);
  console.log(`Content-Encoding: ${res.headers.get('content-encoding') || 'NONE (uncompressed)'}`);
  console.log(`ETag: ${res.headers.get('etag') || 'NONE'}`);
  console.log(`Cache-Control: ${res.headers.get('cache-control') || 'NONE'}`);
}

console.log('\n=== DATABASE INDEXES & EXPLAIN() ===');
await mongoose.connect(env.MONGODB_URI);
const db = mongoose.connection.db;

const menuItemIndexes = await db.collection('menuitems').indexes();
console.log('\nMenuItem indexes:');
console.log(JSON.stringify(menuItemIndexes, null, 2));

const categoryIndexes = await db.collection('categories').indexes();
console.log('\nCategory indexes:');
console.log(JSON.stringify(categoryIndexes, null, 2));

// Run explain on typical queries
const explainMenu = await db.collection('menuitems')
  .find({ isAvailable: true })
  .sort({ order: 1 })
  .explain('executionStats');

console.log('\nExplain { isAvailable: true } sort { order: 1 }:');
console.log('Stage:', explainMenu.executionStats?.executionStages?.stage);
console.log('TotalDocsExamined:', explainMenu.executionStats?.totalDocsExamined);
console.log('NReturned:', explainMenu.executionStats?.nReturned);

const explainCatFilter = await db.collection('menuitems')
  .find({ isAvailable: true, category: new mongoose.Types.ObjectId() })
  .sort({ order: 1 })
  .explain('executionStats');

console.log('\nExplain { isAvailable: true, category: id } sort { order: 1 }:');
console.log('Stage:', explainCatFilter.executionStats?.executionStages?.stage);
console.log('TotalDocsExamined:', explainCatFilter.executionStats?.totalDocsExamined);

await mongoose.disconnect();
process.exit(0);
