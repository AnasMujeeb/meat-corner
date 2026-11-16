import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      default: '',
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
    descriptionAr: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String, // URL
      default: '',
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (this.sortOrder !== undefined && (this.order === undefined || this.order === 0)) {
    this.order = this.sortOrder;
  } else if (this.order !== undefined && (this.sortOrder === undefined || this.sortOrder === 0)) {
    this.sortOrder = this.order;
  }
  next();
});

categorySchema.index({ sortOrder: 1, createdAt: 1 });
categorySchema.index({ order: 1 });
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ isActive: 1, order: 1 });

const Category = mongoose.model('Category', categorySchema);
export default Category;
