import mongoose from 'mongoose';

const optionLibraryItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    category: {
      type: String,
      enum: ['sauce', 'side', 'other'],
      default: 'sauce',
      index: true,
    },
    image: {
      url: { type: String, default: '' },
      thumbUrl: { type: String, default: '' },
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
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

optionLibraryItemSchema.index({ category: 1, order: 1, name: 1 });

const OptionLibraryItem = mongoose.model('OptionLibraryItem', optionLibraryItemSchema);
export default OptionLibraryItem;
