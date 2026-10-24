import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Save, AlertTriangle } from 'lucide-react';
import { settingsApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import SingleImageUploader from '../components/SingleImageUploader.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import {
  optionalImageSourceSchema,
  // heroVideoUrlSchema, // Temporarily disabled — uncomment when needed
  optionalAbsoluteUrlSchema,
  isValidAbsoluteUrl,
} from '../utils/validation.js';

function isValidWhatsapp(val) {
  if (val === undefined || val === '' || val === null) return true;
  if (isValidAbsoluteUrl(val)) return true;
  if (/^wa\.me\/[0-9]+$/i.test(val.trim())) return true;
  if (/^\+?[0-9\s\-()]{6,30}$/.test(val.trim())) return true;
  return false;
}

const schema = z.object({
  brandName: z.string().min(1, 'Brand name is required.').max(100),
  logo: optionalImageSourceSchema,
  // heroVideoUrl: heroVideoUrlSchema, // Temporarily disabled — uncomment when needed
  // heroPoster: optionalImageSourceSchema, // Temporarily disabled — uncomment when needed
  contactPhone: z.string().max(30).optional().default(''),
  contactEmail: z.union([
    z.string().email('Invalid email address.').max(150),
    z.literal(''),
  ]).optional().default(''),
  aboutText: z.string().max(5000).optional().default(''),
  socials: z.object({
    instagram: optionalAbsoluteUrlSchema,
    tiktok: optionalAbsoluteUrlSchema,
    whatsapp: z
      .string()
      .max(100)
      .optional()
      .default('')
      .refine(isValidWhatsapp, {
        message: 'Must be a valid URL, wa.me link, phone number, or empty.',
      }),
    talabat: optionalAbsoluteUrlSchema,
    snoonu: optionalAbsoluteUrlSchema,
  }).optional().default({}),
});

function SocialField({ id, label, register, errors, placeholder = 'https://…' }) {
  const parts = id.split('.');
  let fieldError = errors;
  for (const part of parts) {
    fieldError = fieldError?.[part];
  }
  const errorMessage = fieldError?.message;

  return (
    <div className="form-group">
      <Input
        id={id}
        label={label}
        placeholder={placeholder}
        error={errorMessage}
        {...register(id)}
      />
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get(),
  });

  const settings = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      brandName: 'Meat Corner',
      logo: '',
      // heroVideoUrl: '', // Temporarily disabled — uncomment when needed
      // heroPoster: '', // Temporarily disabled — uncomment when needed
      contactPhone: '',
      contactEmail: '',
      aboutText: '',
      socials: {
        instagram: '',
        tiktok: '',
        whatsapp: '',
        talabat: '',
        snoonu: '',
      },
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        brandName: settings.brandName || 'Meat Corner',
        logo: settings.logo || '',
        // heroVideoUrl: settings.heroVideoUrl || '', // Temporarily disabled — uncomment when needed
        // heroPoster: settings.heroPoster || '', // Temporarily disabled — uncomment when needed
        contactPhone: settings.contactPhone || '',
        contactEmail: settings.contactEmail || '',
        aboutText: settings.aboutText || '',
        socials: {
          instagram: settings.socials?.instagram || '',
          tiktok: settings.socials?.tiktok || '',
          whatsapp: settings.socials?.whatsapp || '',
          talabat: settings.socials?.talabat || '',
          snoonu: settings.socials?.snoonu || '',
        },
      });
    }
  }, [settings, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (formData) => {
      const payload = {
        brandName: formData.brandName,
        logo: formData.logo,
        // heroVideoUrl: formData.heroVideoUrl, // Temporarily disabled — uncomment when needed
        // heroPoster: formData.heroPoster, // Temporarily disabled — uncomment when needed
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
        aboutText: formData.aboutText,
        socials: {
          instagram: formData.socials?.instagram ?? '',
          tiktok: formData.socials?.tiktok ?? '',
          whatsapp: formData.socials?.whatsapp ?? '',
          talabat: formData.socials?.talabat ?? '',
          snoonu: formData.socials?.snoonu ?? '',
        },
      };
      return settingsApi.update(payload);
    },
    onSuccess: (res) => {
      toast.success('Settings saved.');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      // Reset dirty state with new values
      const s = res?.data;
      if (s) {
        reset({
          brandName: s.brandName || '',
          logo: s.logo || '',
          // heroVideoUrl: s.heroVideoUrl || '', // Temporarily disabled — uncomment when needed
          // heroPoster: s.heroPoster || '', // Temporarily disabled — uncomment when needed
          contactPhone: s.contactPhone || '',
          contactEmail: s.contactEmail || '',
          aboutText: s.aboutText || '',
          socials: {
            instagram: s.socials?.instagram || '',
            tiktok: s.socials?.tiktok || '',
            whatsapp: s.socials?.whatsapp || '',
            talabat: s.socials?.talabat || '',
            snoonu: s.socials?.snoonu || '',
          },
        });
      }
    },
    onError: (err) => {
      toast.error(err.message || 'Save failed.');
    },
  });

  const onInvalid = (fieldErrors) => {
    const messages = [];
    const collect = (obj) => {
      if (!obj) return;
      if (typeof obj === 'object') {
        if (obj.message && typeof obj.message === 'string') {
          messages.push(obj.message);
        } else {
          for (const v of Object.values(obj)) {
            collect(v);
          }
        }
      }
    };
    collect(fieldErrors);
    toast.error(messages.length > 0 ? messages.slice(0, 3).join(' · ') : 'Please fix the errors in the form.');
  };

  if (isLoading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-left">
            <h1 className="page-title">Site Settings</h1>
          </div>
        </div>
        <div className="card card-body" style={{ marginBottom: 20 }}>
          <SkeletonCard height={300} />
        </div>
      </div>
    );
  }

  return (
    <div>
      {isDirty && (
        <div className="unsaved-bar" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          You have unsaved changes.
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Site Settings</h1>
          <p className="page-subtitle">Brand, hero media, social links, and contact info</p>
        </div>
        <div className="page-actions">
          <Button
            variant="primary"
            onClick={handleSubmit((data) => save(data), onInvalid)}
            isLoading={isPending}
            disabled={isPending}
            id="settings-save-btn"
          >
            <Save size={14} />
            {isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit((data) => save(data), onInvalid)} noValidate>
        {/* ── Brand ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="section-title">Brand</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <Input
                  id="settings-brandName"
                  label="Brand Name *"
                  error={errors.brandName?.message}
                  {...register('brandName')}
                />
              </div>
              <div className="form-group">
                <Controller
                  name="logo"
                  control={control}
                  render={({ field }) => (
                    <SingleImageUploader
                      label="Logo"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.logo && <p className="field-error" style={{ marginTop: 6 }}>{errors.logo.message}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Hero Media — Temporarily disabled — uncomment block below when needed ── */}
        {/* <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="section-title">Hero Media</h2>
          </div>
          <div className="card-body">
            <div className="form-group">
              <Input
                id="settings-heroVideoUrl"
                label="Hero Video URL"
                placeholder="https://…"
                error={errors.heroVideoUrl?.message}
                {...register('heroVideoUrl')}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <Controller
                name="heroPoster"
                control={control}
                render={({ field }) => (
                  <SingleImageUploader
                    label="Hero Poster (fallback image)"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.heroPoster && <p className="field-error" style={{ marginTop: 6 }}>{errors.heroPoster.message}</p>}
            </div>
          </div>
        </div> */}

        {/* ── Contact ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="section-title">Contact</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group">
                <Input
                  id="settings-contactPhone"
                  label="Contact Phone"
                  placeholder="+974 XXXX XXXX"
                  error={errors.contactPhone?.message}
                  {...register('contactPhone')}
                />
              </div>
              <div className="form-group">
                <Input
                  id="settings-contactEmail"
                  label="Contact Email"
                  type="email"
                  placeholder="hello@meatcorner.qa"
                  error={errors.contactEmail?.message}
                  {...register('contactEmail')}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label" htmlFor="settings-aboutText">About Text</label>
              <textarea
                id="settings-aboutText"
                className="textarea"
                rows={5}
                placeholder="Tell your story…"
                {...register('aboutText')}
              />
            </div>
          </div>
        </div>

        {/* ── Socials ── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2 className="section-title">Social Links / Handles</h2>
          </div>
          <div className="card-body">
            <div className="form-row">
              <SocialField
                id="socials.instagram"
                label="Instagram"
                placeholder="https://instagram.com/..."
                register={register}
                errors={errors}
              />
              <SocialField
                id="socials.tiktok"
                label="TikTok"
                placeholder="https://tiktok.com/@..."
                register={register}
                errors={errors}
              />
            </div>
            <div className="form-row">
              <SocialField
                id="socials.whatsapp"
                label="WhatsApp"
                placeholder="wa.me/..., phone number, or URL"
                register={register}
                errors={errors}
              />
            </div>
            <div className="form-row">
              <SocialField
                id="socials.talabat"
                label="Talabat"
                placeholder="https://..."
                register={register}
                errors={errors}
              />
              <SocialField
                id="socials.snoonu"
                label="Snoonu"
                placeholder="https://..."
                register={register}
                errors={errors}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <Button
            variant="primary"
            type="submit"
            isLoading={isPending}
            disabled={isPending}
            id="settings-save-btn-bottom"
          >
            <Save size={14} />
            {isPending ? 'Saving…' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
