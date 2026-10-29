import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    thumbUrl: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const nutritionSchema = new mongoose.Schema(
  {
    calories: { type: Number }, // kcal
    fat: { type: Number },      // grams
    protein: { type: Number },  // grams
    carbs: { type: Number },    // grams
    fiber: { type: Number },    // grams
  },
  { _id: false }
);

const choiceSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    extraPrice: { type: Number, default: 0 },
    image: {
      url: { type: String, default: '' },
      thumbUrl: { type: String, default: '' },
    },
    libraryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OptionLibraryItem',
      default: null,
    },
  },
  { _id: false }
);

const optionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['single', 'multiple'], required: true },
    groupType: { type: String, enum: ['text', 'photo'], default: 'text' },
    maxSelections: { type: Number, default: 1 },
    required: { type: Boolean, default: false },
    choices: { type: [choiceSchema], default: [] },
  },
  { _id: false }
);

const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    nutrition: {
      type: nutritionSchema,
      default: {},
    },
    allergens: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index for public listing: available items ordered within category
menuItemSchema.index({ isAvailable: 1, category: 1, order: 1 });

// Full-text search on name and description
menuItemSchema.index({ name: 'text', description: 'text' });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
export default MenuItem;
