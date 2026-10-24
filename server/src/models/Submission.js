import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['contact', 'catering'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // Catering-specific fields (optional for contact)
    eventDate: {
      type: Date,
      default: null,
    },
    guestCount: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['new', 'read', 'done'],
      default: 'new',
      index: true,
    },
  },
  { timestamps: true }
);

submissionSchema.index({ type: 1, status: 1, createdAt: -1 });

const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;
