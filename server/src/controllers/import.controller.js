import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { importMenuItems, generateImportTemplate } from '../services/import.service.js';

const ALLOWED_IMPORT_MIMES = [
  'text/csv',
  'application/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const importMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const isAllowed =
      ALLOWED_IMPORT_MIMES.includes(file.mimetype) ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx');

    if (isAllowed) {
      cb(null, true);
    } else {
      cb(createError(400, 'Only .csv and .xlsx files are accepted for import.'));
    }
  },
});

export const importUpload = importMulter.single('file');

export const importMenu = asyncHandler(async (req, res) => {
  if (!req.file) throw createError(400, 'No file provided.');

  const summary = await importMenuItems(req.file.buffer, req.file.mimetype);

  res.json({ success: true, data: summary });
});

export const downloadImportTemplate = asyncHandler(async (_req, res) => {
  const buffer = await generateImportTemplate();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="meat-corner-menu-import-template.xlsx"');
  res.send(buffer);
});
