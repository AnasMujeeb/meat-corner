import mongoose from 'mongoose';

const socialsSchema = new mongoose.Schema(
  {
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' },
    whatsapp: { type: String, default: '' },
    talabat: { type: String, default: '' },
    snoonu: { type: String, default: '' },
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    // Singleton – enforced via the seed and the service layer
    brandName: {
      type: String,
      default: 'Meat Corner',
      trim: true,
    },
    logo: {
      type: String, // URL
      default: '',
    },
    heroVideoUrl: {
      type: String,
      default: '',
    },
    heroPoster: {
      type: String, // URL
      default: '',
    },
    socials: {
      type: socialsSchema,
      default: {},
    },
    contactPhone: {
      type: String,
      default: '',
    },
    contactEmail: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
    },
    aboutText: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
export default SiteSettings;
