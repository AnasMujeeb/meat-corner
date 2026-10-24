import 'dotenv/config';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
const del = process.argv.includes('--delete');
const rx = /^smoke_\d+/i;
await mongoose.connect(uri);
const db = mongoose.connection.db;
console.log('Database:', db.databaseName, del ? '(DELETE mode)' : '(dry run)');
for (const { name } of await db.listCollections().toArray()) {
  const col = db.collection(name);
  const q = { $or: [{ name: rx }, { slug: rx }, { title: rx }] };
  const found = await col.find(q, { projection: { name: 1, slug: 1 } }).toArray();
  if (!found.length) continue;
  console.log(name, found.length, found.slice(0, 5).map(d => d.name || d.slug));
  if (del) console.log('  deleted', (await col.deleteMany(q)).deletedCount);
}
await mongoose.disconnect();