import Submission from '../models/Submission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { paginate } from '../utils/helpers.js';

// ─── Public ───────────────────────────────────────────────────────────────────

export const submitContact = asyncHandler(async (req, res) => {
  // Honeypot check (website field must be absent or empty)
  if (req.body.website) {
    // Silently succeed to confuse bots
    return res.json({ success: true, message: 'Message received.' });
  }

  const { website: _hp, ...data } = req.body;

  await Submission.create({ type: 'contact', ...data });
  res.status(201).json({ success: true, message: 'Thank you! We will get back to you soon.' });
});

export const submitCatering = asyncHandler(async (req, res) => {
  if (req.body.website) {
    return res.json({ success: true, message: 'Message received.' });
  }

  const { website: _hp, ...data } = req.body;
  await Submission.create({ type: 'catering', ...data });
  res.status(201).json({ success: true, message: 'Thank you! Our team will be in touch about your event.' });
});

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listSubmissions = asyncHandler(async (req, res) => {
  const { type, status, page, limit } = req.query;

  const filter = {};
  if (type && type !== 'all') filter.type = type;
  if (status && status !== 'all') filter.status = status;

  const result = await paginate({
    Model: Submission,
    filter,
    projection: {},
    sort: { createdAt: -1 },
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });

  res.json({ success: true, ...result });
});

export const updateSubmissionStatus = asyncHandler(async (req, res) => {
  const submission = await Submission.findByIdAndUpdate(
    req.params.id,
    { $set: { status: req.body.status } },
    { new: true, runValidators: true }
  ).lean();

  if (!submission) throw createError(404, 'Submission not found.');
  res.json({ success: true, data: submission });
});

export const deleteSubmission = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id);
  if (!submission) throw createError(404, 'Submission not found.');
  await submission.deleteOne();
  res.json({ success: true, message: 'Submission deleted.' });
});
