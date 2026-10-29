/**
 * Bulk menu import service.
 *
 * Accepts a Buffer for either .csv or .xlsx files.
 * Expected columns (case-insensitive headers):
 *   name, category, description, price, calories, fat, protein,
 *   carbs, fiber, allergens (comma-separated), tags (comma-separated), available
 *
 * Returns:
 *   { created, updated, skipped, errors: [{ row, message }], newCategories: [string] }
 */

import ExcelJS from 'exceljs';
import { toSlug, uniqueSlug } from '../utils/slug.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeKey(key) {
  return String(key ?? '').trim().toLowerCase();
}

function splitCSV(str) {
  if (!str) return [];
  return String(str)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNum(val) {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = parseFloat(val);
  return isNaN(n) ? undefined : n;
}

/**
 * Parse a Buffer (xlsx or csv) into an array of plain row objects.
 * Returns [ { colName: cellValue, ... }, ... ]
 */
async function parseBuffer(buffer) {
  const wb = new ExcelJS.Workbook();

  // ExcelJS can read xlsx from buffer
  await wb.xlsx.load(buffer);

  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows = [];
  let headers = [];

  ws.eachRow((row, rowNum) => {
    const values = row.values.slice(1); // ExcelJS rows are 1-indexed; index 0 is always undefined

    if (rowNum === 1) {
      // Header row
      headers = values.map((v) => normalizeKey(v));
      return;
    }

    const obj = {};
    headers.forEach((h, i) => {
      const cell = values[i];
      // Flatten rich-text or formula results to plain strings/numbers
      if (cell && typeof cell === 'object' && cell.result !== undefined) {
        obj[h] = cell.result;
      } else if (cell && typeof cell === 'object' && cell.text !== undefined) {
        obj[h] = cell.text;
      } else {
        obj[h] = cell ?? '';
      }
    });

    rows.push(obj);
  });

  return rows;
}

/**
 * Parse a CSV buffer into rows (no dependency, just split).
 */
function parseCSVBuffer(buffer) {
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');

  if (lines.length < 2) return [];

  function parseLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === ',' && !inQuote) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]).map(normalizeKey);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

// ─── Public function ──────────────────────────────────────────────────────────

export async function importMenuItems(buffer, mimetype) {
  const isCSV =
    mimetype === 'text/csv' ||
    mimetype === 'application/csv';

  let rawRows;
  if (isCSV) {
    rawRows = parseCSVBuffer(buffer);
  } else {
    rawRows = await parseBuffer(buffer);
  }

  const summary = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    newCategories: [],
  };

  // Pre-load category map (lowercase name -> document)
  const categoryMap = new Map();
  const existingCategories = await Category.find().lean();
  for (const cat of existingCategories) {
    categoryMap.set(cat.name.toLowerCase(), cat);
  }

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // 1-based; +1 for header
    const row = rawRows[i];

    try {
      const name = String(row.name ?? '').trim();
      if (!name) {
        summary.errors.push({ row: rowNum, message: 'Missing required field: name' });
        summary.skipped++;
        continue;
      }

      const categoryName = String(row.category ?? '').trim();
      if (!categoryName) {
        summary.errors.push({ row: rowNum, message: 'Missing required field: category' });
        summary.skipped++;
        continue;
      }

      const price = parseNum(row.price);
      if (price === undefined || price < 0) {
        summary.errors.push({ row: rowNum, message: 'Invalid or missing price' });
        summary.skipped++;
        continue;
      }

      // Resolve or create category
      let category = categoryMap.get(categoryName.toLowerCase());
      if (!category) {
        const slug = await uniqueSlug(Category, toSlug(categoryName));
        category = await Category.create({ name: categoryName, slug });
        categoryMap.set(categoryName.toLowerCase(), category);
        summary.newCategories.push(categoryName);
      }

      // Build nutrition object (only include defined values)
      const nutrition = {};
      const calVal = parseNum(row.calories);   if (calVal  !== undefined) nutrition.calories = calVal;
      const fatVal = parseNum(row.fat);        if (fatVal  !== undefined) nutrition.fat      = fatVal;
      const proteinVal = parseNum(row.protein);if (proteinVal !== undefined) nutrition.protein = proteinVal;
      const carbsVal = parseNum(row.carbs);    if (carbsVal !== undefined) nutrition.carbs   = carbsVal;
      const fiberVal = parseNum(row.fiber);    if (fiberVal !== undefined) nutrition.fiber   = fiberVal;

      const allergens = splitCSV(row.allergens);
      const tags = splitCSV(row.tags);
      const ALLOWED_BADGES = ['wagyu', 'chicken', 'healthy', 'fish'];
      const hasBadgesCol = row.badges !== undefined && row.badges !== '';
      const badges = splitCSV(row.badges)
        .map((b) => b.toLowerCase())
        .filter((b) => ALLOWED_BADGES.includes(b));
      const isAvailable =
        String(row.available ?? 'true').trim().toLowerCase() !== 'false';

      const baseSlug = toSlug(name);
      const existingItem = await MenuItem.findOne({ slug: baseSlug }).lean();

      if (existingItem) {
        const updateFields = {
          name,
          description: String(row.description ?? '').trim(),
          category: category._id,
          price,
          nutrition,
          allergens,
          tags,
          isAvailable,
        };
        if (hasBadgesCol) {
          updateFields.badges = badges;
        }
        await MenuItem.findByIdAndUpdate(existingItem._id, {
          $set: updateFields,
        });
        summary.updated++;
      } else {
        const slug = await uniqueSlug(MenuItem, baseSlug);
        await MenuItem.create({
          name,
          slug,
          description: String(row.description ?? '').trim(),
          category: category._id,
          price,
          nutrition,
          allergens,
          tags,
          badges,
          isAvailable,
        });
        summary.created++;
      }
    } catch (err) {
      summary.errors.push({ row: rowNum, message: err.message });
      summary.skipped++;
    }
  }

  return summary;
}

// ─── Template generation ──────────────────────────────────────────────────────

export async function generateImportTemplate() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Menu Items');

  const headers = [
    'name', 'category', 'description', 'price',
    'calories', 'fat', 'protein', 'carbs', 'fiber',
    'allergens', 'tags', 'badges', 'available',
  ];

  ws.columns = headers.map((h) => ({
    header: h,
    key: h,
    width: Math.max(h.length + 2, 18),
  }));

  // Style header row
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD4A853' }, // Meat Corner brand amber
  };

  // Sample data row
  ws.addRow({
    name: 'Classic Smash Burger',
    category: 'Burgers',
    description: 'Two smashed beef patties, cheddar, pickles, special sauce',
    price: 48,
    calories: 820,
    fat: 42,
    protein: 38,
    carbs: 54,
    fiber: 3,
    allergens: 'gluten, dairy, eggs',
    tags: 'featured, kids',
    badges: 'wagyu',
    available: 'true',
  });

  return wb.xlsx.writeBuffer();
}
