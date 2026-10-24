#!/usr/bin/env node
/**
 * Meat Corner – Smoke Test
 * server/scripts/smoke.mjs
 *
 * Run: node scripts/smoke.mjs
 * Requires: server running on http://localhost:5000
 *            ADMIN_EMAIL and ADMIN_PASSWORD in process.env (loaded from .env)
 *
 * No extra dependencies. Uses Node 18+ built-in fetch + sharp (already installed).
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { unlink as unlinkAsync } from 'fs/promises';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// ─── Load .env manually ───────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? resolve(__dirname, '..', process.env.UPLOAD_DIR)
  : resolve(__dirname, '../uploads');

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌  ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
  process.exit(1);
}

// ─── Unique run ID (timestamp) so names never collide across runs ─────────────
const RUN_ID = Date.now();
const SMOKE_PREFIX = `Smoke_${RUN_ID}`;

// ─── State ────────────────────────────────────────────────────────────────────
let cookieHeader = '';
let createdCategoryId = '';
let createdItemId = '';
let createdAdminFormItemId = '';
let uploadedUrl = '';
let uploadedThumbUrl = '';

const results = [];
let passCount = 0;
let failCount = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pass(name) {
  console.log(`  ✅ PASS  ${name}`);
  results.push({ name, status: 'PASS' });
  passCount++;
}

function fail(name, reason) {
  console.error(`  ❌ FAIL  ${name}`);
  console.error(`          ${reason}`);
  results.push({ name, status: 'FAIL', reason });
  failCount++;
}

async function req(method, path, { body, headers = {}, binary = false, noCookie = false } = {}) {
  const url = `${BASE}${path}`;
  const reqHeaders = {
    ...(noCookie ? {} : cookieHeader ? { Cookie: cookieHeader } : {}),
    ...headers,
  };

  const options = { method, headers: reqHeaders };
  if (body && !(body instanceof FormData)) {
    options.body = JSON.stringify(body);
    reqHeaders['Content-Type'] = 'application/json';
  } else if (body instanceof FormData) {
    options.body = body;
  }

  const response = await fetch(url, options);

  const setCookie = response.headers.get('set-cookie');
  if (setCookie && setCookie.includes('token=')) {
    cookieHeader = setCookie.split(';')[0];
  }

  if (binary) {
    const buf = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, body: buf };
  }

  let json = null;
  try { json = await response.json(); } catch { /* non-JSON */ }
  return { status: response.status, headers: response.headers, body: json };
}

function check(name, condition, reason = '') {
  if (condition) pass(name);
  else fail(name, reason || 'Condition was false');
}

// ─── Pre-run cleanup: delete any leftover "Smoke" documents ──────────────────

async function sweepSmokeData() {
  // Login first if not already (called before testAuth sometimes)
  if (!cookieHeader) {
    const login = await req('POST', '/api/auth/login', {
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    if (login.status !== 200) return; // can't sweep without auth
  }

  // Delete menu items whose name starts with "Smoke"
  const allMenu = await req('GET', '/api/admin/menu?limit=200');
  const smokeItems = (allMenu.body?.data ?? []).filter(i => i.name?.startsWith('Smoke'));
  for (const item of smokeItems) {
    await req('DELETE', `/api/admin/menu/${item._id}`);
  }

  // Delete categories whose name starts with "Smoke"
  const allCats = await req('GET', '/api/admin/categories');
  const smokeCats = (allCats.body?.data ?? []).filter(c => c.name?.startsWith('Smoke'));
  for (const cat of smokeCats) {
    // Delete items in that category first
    const catItems = await req('GET', `/api/admin/menu?limit=200&category=${cat.slug}`);
    for (const item of (catItems.body?.data ?? [])) {
      await req('DELETE', `/api/admin/menu/${item._id}`);
    }
    await req('DELETE', `/api/admin/categories/${cat._id}`);
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

async function testHealth() {
  console.log('\n── Health ──────────────────────────────────────────');
  const r = await req('GET', '/api/health');
  check('GET /api/health returns 200 + success', r.status === 200 && r.body?.success === true, JSON.stringify(r.body));
}

async function testAuth() {
  console.log('\n── Auth ────────────────────────────────────────────');

  const badLogin = await req('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: 'wrong-password-12345' },
  });
  check('Login with wrong password → 401', badLogin.status === 401, JSON.stringify(badLogin.body));

  const badFormat = await req('POST', '/api/auth/login', {
    body: { email: 'not-an-email', password: 'x' },
  });
  check('Login with bad email format → 400', badFormat.status === 400, JSON.stringify(badFormat.body));

  cookieHeader = '';
  const goodLogin = await req('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  check('Login with correct credentials → 200', goodLogin.status === 200 && goodLogin.body?.success === true, JSON.stringify(goodLogin.body));
  check('Login sets JWT cookie', cookieHeader.startsWith('token='), `Cookie: "${cookieHeader}"`);

  const me = await req('GET', '/api/auth/me');
  check('GET /api/auth/me with cookie → 200', me.status === 200 && me.body?.data?.email === ADMIN_EMAIL, JSON.stringify(me.body));

  const noCookieReq = await req('GET', '/api/admin/categories', { noCookie: true });
  check('Admin route without cookie → 401', noCookieReq.status === 401, JSON.stringify(noCookieReq.body));
}

async function testCategories() {
  console.log('\n── Categories ──────────────────────────────────────');

  const catName = `${SMOKE_PREFIX}_Category`;
  const create = await req('POST', '/api/admin/categories', {
    body: { name: catName, description: 'Created by smoke test', order: 99 },
  });
  check('POST /api/admin/categories → 201', create.status === 201 && !!create.body?.data?._id, JSON.stringify(create.body));
  createdCategoryId = create.body?.data?._id;

  const badCreate = await req('POST', '/api/admin/categories', { body: { description: 'No name' } });
  check('POST categories without name → 400', badCreate.status === 400, JSON.stringify(badCreate.body));

  const update = await req('PUT', `/api/admin/categories/${createdCategoryId}`, {
    body: { description: 'Updated by smoke test' },
  });
  check('PUT /api/admin/categories/:id → 200', update.status === 200 && update.body?.data?.description === 'Updated by smoke test', JSON.stringify(update.body));

  const reorder = await req('PATCH', '/api/admin/categories/reorder', {
    body: { ids: [createdCategoryId] },
  });
  check('PATCH /api/admin/categories/reorder → 200', reorder.status === 200 && reorder.body?.success === true, JSON.stringify(reorder.body));

  const badId = await req('GET', '/api/admin/categories/not-a-valid-id');
  check('GET /api/admin/categories/bad-id → 422', badId.status === 422, JSON.stringify(badId.body));

  const list = await req('GET', '/api/admin/categories');
  check('GET /api/admin/categories returns array', list.status === 200 && Array.isArray(list.body?.data), JSON.stringify(list.body));
}

async function testUpload() {
  console.log('\n── Upload ──────────────────────────────────────────');

  const testImagePath = resolve(__dirname, '../uploads/_smoke_test_img.png');
  await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 50, b: 50 } },
  }).png().toFile(testImagePath);

  const form = new FormData();
  const imgBuffer = readFileSync(testImagePath);
  form.append('image', new Blob([imgBuffer], { type: 'image/png' }), 'test.png');

  const upload = await req('POST', '/api/admin/upload', { body: form });
  check('POST /api/admin/upload → 201', upload.status === 201 && upload.body?.success === true, JSON.stringify(upload.body));
  check('Upload returns url ending in .webp', upload.body?.data?.url?.endsWith('.webp') === true, upload.body?.data?.url);
  check('Upload returns thumbUrl ending in .webp', upload.body?.data?.thumbUrl?.endsWith('.webp') === true, upload.body?.data?.thumbUrl);

  uploadedUrl = upload.body?.data?.url || '';
  uploadedThumbUrl = upload.body?.data?.thumbUrl || '';

  if (uploadedUrl) {
    const urlRes = await req('GET', uploadedUrl);
    check('Uploaded main WebP is GET-reachable', urlRes.status === 200, `Status: ${urlRes.status}`);
    const thumbRes = await req('GET', uploadedThumbUrl);
    check('Uploaded thumb WebP is GET-reachable', thumbRes.status === 200, `Status: ${thumbRes.status}`);
  }

  const badForm = new FormData();
  badForm.append('image', new Blob(['not an image'], { type: 'text/plain' }), 'file.txt');
  const badUpload = await req('POST', '/api/admin/upload', { body: badForm });
  check('Upload non-image file → 400', badUpload.status === 400, JSON.stringify(badUpload.body));

  const emptyForm = new FormData();
  const noFileUpload = await req('POST', '/api/admin/upload', { body: emptyForm });
  check('Upload with no file → 400', noFileUpload.status === 400, JSON.stringify(noFileUpload.body));

  if (existsSync(testImagePath)) unlinkSync(testImagePath);
}

async function testMenuItems() {
  console.log('\n── Menu Items ──────────────────────────────────────');

  const itemName = `${SMOKE_PREFIX}_Burger`;
  const create = await req('POST', '/api/admin/menu', {
    body: {
      name: itemName,
      category: createdCategoryId,
      description: 'A burger created by smoke test',
      price: 42,
      images: [{ url: uploadedUrl, thumbUrl: uploadedThumbUrl, alt: 'Smoke burger' }],
      tags: ['featured', 'kids'],
      allergens: ['gluten', 'dairy'],
      nutrition: { calories: 750, fat: 35, protein: 30, carbs: 60, fiber: 3 },
      options: [{
        name: 'Doneness',
        type: 'single',
        required: true,
        choices: [{ label: 'Medium', extraPrice: 0 }, { label: 'Well Done', extraPrice: 0 }],
      }],
    },
  });
  check('POST /api/admin/menu → 201', create.status === 201 && !!create.body?.data?._id, JSON.stringify(create.body));
  check('Menu item has uploaded image', create.body?.data?.images?.[0]?.url === uploadedUrl, JSON.stringify(create.body?.data?.images));
  check('Menu item has nutrition', create.body?.data?.nutrition?.calories === 750, JSON.stringify(create.body?.data?.nutrition));
  check('Menu item has options array', Array.isArray(create.body?.data?.options) && create.body?.data?.options?.length === 1, JSON.stringify(create.body?.data?.options));
  createdItemId = create.body?.data?._id;
  const createdItemSlug = create.body?.data?.slug;

  // Admin-form-like menu creation payload with empty nutrition strings and uploaded image
  const adminFormItem = await req('POST', '/api/admin/menu', {
    body: {
      name: `${SMOKE_PREFIX}_AdminFormItem`,
      category: createdCategoryId,
      description: '',
      price: 35,
      images: [{ url: uploadedUrl, thumbUrl: uploadedThumbUrl, alt: '' }],
      nutrition: { calories: '', fat: 12, protein: '' },
      allergens: [],
      tags: [],
      options: [],
    },
  });
  check('POST admin-form-like menu payload → 201', adminFormItem.status === 201 && !!adminFormItem.body?.data?._id, JSON.stringify(adminFormItem.body));
  createdAdminFormItemId = adminFormItem.body?.data?._id;

  // Category with uploaded image path
  const updateCatImage = await req('PUT', `/api/admin/categories/${createdCategoryId}`, {
    body: { image: uploadedUrl },
  });
  check('PUT category with uploaded image url → 200', updateCatImage.status === 200 && updateCatImage.body?.data?.image === uploadedUrl, JSON.stringify(updateCatImage.body));

  const badCatImage = await req('PUT', `/api/admin/categories/${createdCategoryId}`, {
    body: { image: '/invalid/image.png' },
  });
  check('PUT category with invalid image url → 400', badCatImage.status === 400, JSON.stringify(badCatImage.body));

  // Settings with uploaded logo & heroPoster
  const updateSettingsLogo = await req('PUT', '/api/admin/settings', {
    body: { logo: uploadedUrl, heroPoster: uploadedUrl, heroVideoUrl: '/uploads/hero.mp4' },
  });
  check('PUT settings with uploaded logo/poster/video → 200', updateSettingsLogo.status === 200 && updateSettingsLogo.body?.data?.logo === uploadedUrl, JSON.stringify(updateSettingsLogo.body));

  const badSettingsLogo = await req('PUT', '/api/admin/settings', {
    body: { logo: 'not-a-valid-url-or-upload' },
  });
  check('PUT settings with invalid logo → 400', badSettingsLogo.status === 400, JSON.stringify(badSettingsLogo.body));

  // Menu item with invalid image URL → 400, never 500
  const badImage = await req('POST', '/api/admin/menu', {
    body: {
      name: `${SMOKE_PREFIX}_BadImage`,
      category: createdCategoryId,
      price: 20,
      images: [{ url: '/not-an-upload/img.jpg', thumbUrl: 'ftp://bad' }],
    },
  });
  check('POST menu item with invalid image url → 400', badImage.status === 400, JSON.stringify(badImage.body));

  const badCat = await req('POST', '/api/admin/menu', {
    body: { name: `${SMOKE_PREFIX}_Bad`, category: '000000000000000000000000', price: 10 },
  });
  check('Create item with non-existent category → 404', badCat.status === 404, JSON.stringify(badCat.body));

  const toggle1 = await req('PATCH', `/api/admin/menu/${createdItemId}/availability`);
  check('PATCH availability toggle → 200', toggle1.status === 200, JSON.stringify(toggle1.body));
  check('After toggle, isAvailable is false', toggle1.body?.data?.isAvailable === false, JSON.stringify(toggle1.body?.data));

  const publicMiss = await req('GET', `/api/public/menu/${createdItemSlug}`);
  check('Unavailable item not visible on public menu/:slug → 404', publicMiss.status === 404, JSON.stringify(publicMiss.body));

  const toggle2 = await req('PATCH', `/api/admin/menu/${createdItemId}/availability`);
  check('Toggle back ON → isAvailable true', toggle2.body?.data?.isAvailable === true, JSON.stringify(toggle2.body?.data));

  const publicHit = await req('GET', `/api/public/menu/${createdItemSlug}`);
  check('Re-enabled item visible on public menu/:slug → 200', publicHit.status === 200, JSON.stringify(publicHit.body));

  const update = await req('PUT', `/api/admin/menu/${createdItemId}`, {
    body: { price: 55, description: 'Updated description' },
  });
  check('PUT /api/admin/menu/:id → 200', update.status === 200 && update.body?.data?.price === 55, JSON.stringify(update.body));

  const noPrice = await req('POST', '/api/admin/menu', {
    body: { name: `${SMOKE_PREFIX}_NoPrice`, category: createdCategoryId },
  });
  check('Create item without price → 400', noPrice.status === 400, JSON.stringify(noPrice.body));
}

async function testPublicEndpoints() {
  console.log('\n── Public Endpoints ────────────────────────────────');

  const cats = await req('GET', '/api/public/categories');
  check('GET /api/public/categories → 200', cats.status === 200 && Array.isArray(cats.body?.data), JSON.stringify(cats.body));

  const menu = await req('GET', '/api/public/menu');
  check('GET /api/public/menu → 200', menu.status === 200 && Array.isArray(menu.body?.data), JSON.stringify(menu.body));
  check('Menu has total field', typeof menu.body?.total === 'number', JSON.stringify(menu.body));

  const menuByCat = await req('GET', '/api/public/menu?category=burgers&page=1&limit=5');
  check('GET /api/public/menu?category=burgers → 200', menuByCat.status === 200, JSON.stringify(menuByCat.body));

  const menuByTag = await req('GET', '/api/public/menu?tag=featured');
  check('GET /api/public/menu?tag=featured → 200', menuByTag.status === 200, JSON.stringify(menuByTag.body));

  const menuSearch = await req('GET', '/api/public/menu?q=burger');
  check('GET /api/public/menu?q=burger → 200', menuSearch.status === 200, JSON.stringify(menuSearch.body));

  const slug = await req('GET', '/api/public/menu/classic-smash-burger');
  check('GET /api/public/menu/:slug → 200', slug.status === 200 && slug.body?.data?.slug === 'classic-smash-burger', JSON.stringify(slug.body));

  const badSlug = await req('GET', '/api/public/menu/this-slug-does-not-exist');
  check('GET /api/public/menu/nonexistent-slug → 404', badSlug.status === 404, JSON.stringify(badSlug.body));

  const branches = await req('GET', '/api/public/branches');
  check('GET /api/public/branches → 200', branches.status === 200 && Array.isArray(branches.body?.data), JSON.stringify(branches.body));
  check('Branches includes Madinat Khalifa', branches.body?.data?.some(b => b.name === 'Madinat Khalifa'), JSON.stringify(branches.body?.data?.map(b => b.name)));

  const settings = await req('GET', '/api/public/settings');
  check('GET /api/public/settings → 200', settings.status === 200 && settings.body?.data?.brandName === 'Meat Corner', JSON.stringify(settings.body));
}

async function testCacheHeaders() {
  console.log('\n── Cache Headers & ETag / 304 ──────────────────────');

  const r1 = await req('GET', '/api/public/settings');
  const etag = r1.headers.get('etag');
  const cacheControl = r1.headers.get('cache-control');

  check('Public endpoint has Cache-Control header', !!cacheControl, `Cache-Control: "${cacheControl}"`);
  check('Cache-Control is public', cacheControl?.includes('public'), `Cache-Control: "${cacheControl}"`);
  check('Public endpoint has ETag', !!etag, `ETag: "${etag}"`);

  if (etag) {
    const r2 = await fetch(`${BASE}/api/public/settings`, {
      headers: {
        'If-None-Match': etag,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });
    check('Repeated request with ETag → 304 Not Modified', r2.status === 304, `Status: ${r2.status}`);
  } else {
    fail('ETag 304 check skipped (no ETag)', 'No ETag header returned');
  }
}

async function testSettings() {
  console.log('\n── Site Settings & Socials ────────────────────────');

  const initial = await req('GET', '/api/admin/settings');
  check('GET /api/admin/settings → 200', initial.status === 200, JSON.stringify(initial.body));

  const smokeInstagram = `https://instagram.com/meatcorner_${RUN_ID}`;
  const smokeWhatsapp = '+97455556666';
  const smokePhone = '+97444445555';
  const smokeAbout = `Smoke test about text ${RUN_ID}`;

  const updateRes = await req('PUT', '/api/admin/settings', {
    body: {
      brandName: 'Meat Corner',
      contactPhone: smokePhone,
      contactEmail: 'contact@meatcorner.qa',
      aboutText: smokeAbout,
      socials: {
        instagram: smokeInstagram,
        whatsapp: smokeWhatsapp,
      },
    },
  });
  check('PUT /api/admin/settings with nested socials → 200', updateRes.status === 200, JSON.stringify(updateRes.body));

  const pubSettings = await req('GET', '/api/public/settings');
  check('GET /api/public/settings has saved socials & phone',
    pubSettings.status === 200 &&
    pubSettings.body?.data?.socials?.instagram === smokeInstagram &&
    pubSettings.body?.data?.socials?.whatsapp === smokeWhatsapp &&
    pubSettings.body?.data?.contactPhone === smokePhone,
    JSON.stringify(pubSettings.body?.data?.socials)
  );

  const updatedPhone = '+97477778888';
  const partialRes = await req('PUT', '/api/admin/settings', {
    body: {
      contactPhone: updatedPhone,
    },
  });
  check('Partial PUT /api/admin/settings with only contactPhone → 200', partialRes.status === 200, JSON.stringify(partialRes.body));

  const afterPartial = await req('GET', '/api/admin/settings');
  check('Partial update did not erase socials or aboutText',
    afterPartial.body?.data?.contactPhone === updatedPhone &&
    afterPartial.body?.data?.socials?.instagram === smokeInstagram &&
    afterPartial.body?.data?.socials?.whatsapp === smokeWhatsapp &&
    afterPartial.body?.data?.aboutText === smokeAbout,
    `phone: ${afterPartial.body?.data?.contactPhone}, socials: ${JSON.stringify(afterPartial.body?.data?.socials)}`
  );

  const clearRes = await req('PUT', '/api/admin/settings', {
    body: {
      socials: {
        instagram: '',
      },
    },
  });
  check('PUT /api/admin/settings clearing instagram with "" → 200', clearRes.status === 200, JSON.stringify(clearRes.body));

  const afterClear = await req('GET', '/api/admin/settings');
  check('Instagram cleared to "" while WhatsApp remains intact',
    afterClear.body?.data?.socials?.instagram === '' &&
    afterClear.body?.data?.socials?.whatsapp === smokeWhatsapp,
    JSON.stringify(afterClear.body?.data?.socials)
  );
}

async function testContactAndCatering() {
  console.log('\n── Contact & Catering Forms ────────────────────────');

  const contact = await req('POST', '/api/public/contact', {
    body: {
      name: 'Smoke Tester',
      email: 'smoke@test.com',
      message: 'This is a smoke test contact message.',
    },
  });
  check('POST /api/public/contact valid → 201', contact.status === 201 && contact.body?.success === true, JSON.stringify(contact.body));

  const badContact = await req('POST', '/api/public/contact', {
    body: { name: 'Tester', email: 'x@x.com' },
  });
  check('POST /api/public/contact missing message → 400', badContact.status === 400, JSON.stringify(badContact.body));

  const badEmail = await req('POST', '/api/public/contact', {
    body: { name: 'Tester', email: 'not-an-email', message: 'Hello there.' },
  });
  check('POST /api/public/contact bad email → 400', badEmail.status === 400, JSON.stringify(badEmail.body));

  const honeypot = await req('POST', '/api/public/contact', {
    body: {
      name: 'Bot',
      email: 'bot@evil.com',
      message: 'Spam message',
      website: 'http://spam.com',
    },
  });
  check('POST /api/public/contact with honeypot → 200 (silent)', honeypot.status === 200 && honeypot.body?.success === true, JSON.stringify(honeypot.body));

  const catering = await req('POST', '/api/public/catering', {
    body: {
      name: 'Event Planner',
      email: 'events@company.com',
      message: 'We need catering for 200 guests.',
      eventDate: '2027-03-15',
      guestCount: 200,
    },
  });
  check('POST /api/public/catering valid → 201', catering.status === 201 && catering.body?.success === true, JSON.stringify(catering.body));

  const badCatering = await req('POST', '/api/public/catering', {
    body: { name: 'X', email: 'x@x.com', guestCount: 50 },
  });
  check('POST /api/public/catering missing message → 400', badCatering.status === 400, JSON.stringify(badCatering.body));

  const cateringHoneypot = await req('POST', '/api/public/catering', {
    body: {
      name: 'Bot',
      email: 'bot@evil.com',
      message: 'Spam catering',
      website: 'http://spam.com',
    },
  });
  check('POST /api/public/catering with honeypot → 200 (silent)', cateringHoneypot.status === 200, JSON.stringify(cateringHoneypot.body));
}

async function testSubmissions() {
  console.log('\n── Submissions (Admin) ─────────────────────────────');

  const list = await req('GET', '/api/admin/submissions');
  check('GET /api/admin/submissions → 200', list.status === 200 && Array.isArray(list.body?.data), JSON.stringify(list.body));
  check('Submissions list has total', typeof list.body?.total === 'number', JSON.stringify(list.body));

  const contactList = await req('GET', '/api/admin/submissions?type=contact');
  check('GET /api/admin/submissions?type=contact → 200', contactList.status === 200 && Array.isArray(contactList.body?.data), JSON.stringify(contactList.body));

  const submissionId = list.body?.data?.[0]?._id;

  if (submissionId) {
    const statusUpdate = await req('PATCH', `/api/admin/submissions/${submissionId}/status`, {
      body: { status: 'read' },
    });
    check('PATCH /api/admin/submissions/:id/status → 200', statusUpdate.status === 200 && statusUpdate.body?.data?.status === 'read', JSON.stringify(statusUpdate.body));

    const badStatus = await req('PATCH', `/api/admin/submissions/${submissionId}/status`, {
      body: { status: 'invalid-status' },
    });
    check('PATCH status with invalid value → 400', badStatus.status === 400, JSON.stringify(badStatus.body));

    const del = await req('DELETE', `/api/admin/submissions/${submissionId}`);
    check('DELETE /api/admin/submissions/:id → 200', del.status === 200 && del.body?.success === true, JSON.stringify(del.body));
  } else {
    fail('Submissions status/delete tests skipped', 'No submission found to test with');
  }
}

async function testImport() {
  console.log('\n── Import (XLSX + CSV) ─────────────────────────────');

  const templateRes = await req('GET', '/api/admin/menu/import/template', { binary: true });
  check('GET /api/admin/menu/import/template → 200', templateRes.status === 200, `Status: ${templateRes.status}`);
  check('Template is a non-empty buffer', templateRes.body instanceof Buffer && templateRes.body.length > 0, `Length: ${templateRes.body?.length}`);

  const templatePath = resolve(__dirname, '../uploads/_smoke_template.xlsx');
  writeFileSync(templatePath, templateRes.body);

  const importForm = new FormData();
  importForm.append('file', new Blob([templateRes.body], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), 'template.xlsx');

  const importRes = await req('POST', '/api/admin/menu/import', { body: importForm });
  check('POST /api/admin/menu/import XLSX → 200', importRes.status === 200 && importRes.body?.success === true, JSON.stringify(importRes.body));
  check('Import summary has created/updated/skipped/errors keys',
    'created' in (importRes.body?.data ?? {}) &&
    'updated' in (importRes.body?.data ?? {}) &&
    'skipped' in (importRes.body?.data ?? {}) &&
    'errors' in (importRes.body?.data ?? {}),
    JSON.stringify(importRes.body?.data));

  // CSV: use unique SMOKE_PREFIX names so cleanup works reliably
  const csvCatName = `${SMOKE_PREFIX}_CSV_Cat`;
  const csvItemName = `${SMOKE_PREFIX}_CSV_Burger`;
  const csvContent = [
    'name,category,description,price,calories,fat,protein,carbs,fiber,allergens,tags,available',
    `${csvItemName},${csvCatName},A test burger from CSV,38,700,30,28,50,2,"gluten,dairy","featured",true`,
    ',BadRow,No name here,25,,,,,,,,true',  // bad row: no name
  ].join('\n');

  const csvForm = new FormData();
  csvForm.append('file', new Blob([csvContent], { type: 'text/csv' }), 'test.csv');

  const csvImport = await req('POST', '/api/admin/menu/import', { body: csvForm });
  check('POST /api/admin/menu/import CSV → 200', csvImport.status === 200 && csvImport.body?.success === true, JSON.stringify(csvImport.body));

  const summary = csvImport.body?.data;
  check('CSV import: created = 1', summary?.created === 1, JSON.stringify(summary));
  check('CSV import: skipped = 1 (bad row)', summary?.skipped === 1, JSON.stringify(summary));
  check('CSV import: errors has 1 entry', summary?.errors?.length === 1, JSON.stringify(summary?.errors));
  check(`CSV import: newCategories has "${csvCatName}"`,
    summary?.newCategories?.includes(csvCatName),
    JSON.stringify(summary?.newCategories));

  if (existsSync(templatePath)) unlinkSync(templatePath);
}

async function testEdgeCases() {
  console.log('\n── Edge Cases ──────────────────────────────────────');

  const badObjId = await req('GET', '/api/admin/menu/definitely-not-an-objectid');
  check('Bad ObjectId in /menu/:id → 422', badObjId.status === 422, JSON.stringify(badObjId.body));

  const bigPayload = { name: 'x'.repeat(3 * 1024 * 1024) };
  let bigBodyStatus;
  try {
    const bigRes = await fetch(`${BASE}/api/admin/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(bigPayload),
    });
    bigBodyStatus = bigRes.status;
  } catch (e) {
    bigBodyStatus = 'network error';
  }
  check('Very large JSON body → 413', bigBodyStatus === 413, `Status: ${bigBodyStatus}`);

  const badFileForm = new FormData();
  badFileForm.append('image', new Blob(['PDF content'], { type: 'application/pdf' }), 'doc.pdf');
  const badFileRes = await req('POST', '/api/admin/upload', { body: badFileForm });
  check('Non-image file to /upload → 400', badFileRes.status === 400, JSON.stringify(badFileRes.body));
}

async function testStats() {
  console.log('\n── Stats ───────────────────────────────────────────');

  const r = await req('GET', '/api/admin/stats');
  check('GET /api/admin/stats → 200', r.status === 200 && r.body?.success === true, JSON.stringify(r.body));
  check('Stats has categories count', typeof r.body?.data?.categories === 'number', JSON.stringify(r.body?.data));
  check('Stats has menuItems count', typeof r.body?.data?.menuItems === 'number', JSON.stringify(r.body?.data));
  check('Stats has availableItems count', typeof r.body?.data?.availableItems === 'number', JSON.stringify(r.body?.data));
  check('Stats has unavailableItems count', typeof r.body?.data?.unavailableItems === 'number', JSON.stringify(r.body?.data));
  check('Stats has newSubmissions count', typeof r.body?.data?.newSubmissions === 'number', JSON.stringify(r.body?.data));
  check('Stats availableItems + unavailableItems = menuItems',
    r.body?.data?.availableItems + r.body?.data?.unavailableItems === r.body?.data?.menuItems,
    JSON.stringify(r.body?.data));

  const noAuth = await req('GET', '/api/admin/stats', { noCookie: true });
  check('GET /api/admin/stats without auth → 401', noAuth.status === 401, JSON.stringify(noAuth.body));
}

async function testDeleteUpload() {
  console.log('\n── Delete Upload (Security) ────────────────────────');

  // ── Canary file: a real file outside the uploads dir that must survive ────
  const canaryPath = join(UPLOAD_DIR, '..', `_smoke_canary_${RUN_ID}.txt`);
  writeFileSync(canaryPath, 'canary');

  // ── Traversal variants — every one must be 400 ───────────────────────────
  const traversalCases = [
    { url: '/uploads/../.env',               label: 'dotdot traversal' },
    { url: '/uploads/..%2f.env',             label: 'percent-encoded slash traversal' },
    { url: '/uploads/../../package.json',    label: 'double dotdot traversal' },
    { url: '/uploads/..\\.env',              label: 'backslash traversal' },
    { url: 'http://x/uploads/a.webp',        label: 'absolute http URL' },
    { url: '/uploads/a.png',                 label: 'non-webp extension (.png)' },
  ];

  for (const { url, label } of traversalCases) {
    const r = await req('DELETE', '/api/admin/upload', { body: { url } });
    check(`DELETE /upload "${label}" → 400`, r.status === 400, `Status: ${r.status}  body: ${JSON.stringify(r.body)}`);
  }

  // ── Canary must still exist ───────────────────────────────────────────────
  check('Canary file outside uploads still exists after traversal attempts',
    existsSync(canaryPath),
    `Missing: ${canaryPath}`);
  try { await unlinkAsync(canaryPath); } catch { /* ignore locking on Windows */ }

  // ── Standard error cases ─────────────────────────────────────────────────
  const wrongPath = await req('DELETE', '/api/admin/upload', { body: { url: '/other/secret.webp' } });
  check('DELETE /upload with wrong root path → 400', wrongPath.status === 400, JSON.stringify(wrongPath.body));

  const noUrl = await req('DELETE', '/api/admin/upload', { body: {} });
  check('DELETE /upload with no url → 400', noUrl.status === 400, JSON.stringify(noUrl.body));

  // ── Missing (non-existent) file → 404 ────────────────────────────────────
  const notExists = await req('DELETE', '/api/admin/upload', { body: { url: '/uploads/img_0000000_000000.webp' } });
  check('DELETE /upload non-existent file → 404', notExists.status === 404, JSON.stringify(notExists.body));

  if (!uploadedUrl) {
    fail('DELETE /api/admin/upload valid-url tests skipped', 'No uploadedUrl from testUpload()');
    return;
  }

  // ── Valid delete ──────────────────────────────────────────────────────────
  const del = await req('DELETE', '/api/admin/upload', { body: { url: uploadedUrl } });
  check('DELETE /api/admin/upload valid url → 200', del.status === 200 && del.body?.success === true, JSON.stringify(del.body));

  const gone = await req('GET', uploadedUrl);
  check('Deleted upload is no longer GET-reachable → 404', gone.status === 404, `Status: ${gone.status}`);

  uploadedUrl = '';
  uploadedThumbUrl = '';
}

async function cleanup() {
  console.log('\n── Cleanup ─────────────────────────────────────────');

  if (createdAdminFormItemId) {
    const del = await req('DELETE', `/api/admin/menu/${createdAdminFormItemId}`);
    check('Deleted smoke test admin form menu item', del.status === 200, JSON.stringify(del.body));
    createdAdminFormItemId = '';
  }

  if (createdItemId) {
    const del = await req('DELETE', `/api/admin/menu/${createdItemId}`);
    check('Deleted smoke test menu item', del.status === 200, JSON.stringify(del.body));
    createdItemId = '';
  }

  if (createdCategoryId) {
    const del = await req('DELETE', `/api/admin/categories/${createdCategoryId}`);
    check('Deleted smoke test category', del.status === 200, JSON.stringify(del.body));
    createdCategoryId = '';
  }

  // Sweep any remaining Smoke* documents (e.g. from CSV import)
  await sweepSmokeData();

  if (uploadedUrl) {
    await req('DELETE', '/api/admin/upload', { body: { url: uploadedUrl } });
    console.log(`  ℹ️  Cleaned up test upload: ${uploadedUrl}`);
    uploadedUrl = '';
    uploadedThumbUrl = '';
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═'.repeat(55));
  console.log('  Meat Corner – Smoke Test');
  console.log(`  Target: ${BASE}  |  Run: ${RUN_ID}`);
  console.log('═'.repeat(55));

  // Pre-run sweep of stale smoke data
  try {
    await sweepSmokeData();
    console.log('  ℹ️  Pre-run sweep done.');
  } catch { /* server may not be authenticated yet — sweepSmokeData handles it */ }

  try {
    await testHealth();
    await testAuth();
    await testCategories();
    await testUpload();
    await testMenuItems();
    await testPublicEndpoints();
    await testCacheHeaders();
    await testSettings();
    await testContactAndCatering();
    await testSubmissions();
    await testImport();
    await testEdgeCases();
    await testStats();
    await testDeleteUpload();
  } finally {
    // Cleanup always runs even if a test throws
    try { await cleanup(); } catch (cleanupErr) {
      console.error('  ⚠️  Cleanup error:', cleanupErr.message);
    }
  }

  console.log('\n' + '═'.repeat(55));
  console.log(`  Results: ${passCount} PASS  |  ${failCount} FAIL`);
  console.log('═'.repeat(55) + '\n');

  if (failCount > 0) {
    console.log('FAILED checks:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.reason) console.log(`     → ${r.reason}`);
    });
    process.exit(1);
  } else {
    console.log('All checks passed! ✅');
    process.exit(0);
  }
}

main();
