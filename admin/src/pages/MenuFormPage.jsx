import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft } from 'lucide-react';

import { menuApi, categoriesApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Toggle from '../components/Toggle.jsx';
import ChipInput from '../components/ChipInput.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import { imageSourceSchema } from '../utils/validation.js';

// ─── Zod Schema (mirrors server validators exactly) ──────────────────────────

const imageSchema = z.object({
  url: imageSourceSchema,
  thumbUrl: imageSourceSchema,
  alt: z.string().optional().default(''),
});

const optionalNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  if (typeof val === 'string' && val.trim() === '') return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
}, z.number({ invalid_type_error: 'Must be a valid number.' }).min(0, 'Must be non-negative.').optional());

const nutritionSchema = z
  .object({
    calories: optionalNumber,
    fat:      optionalNumber,
    protein:  optionalNumber,
    carbs:    optionalNumber,
    fiber:    optionalNumber,
  })
  .nullable()
  .optional()
  .transform((v) => v ?? {});

const choiceSchema = z.object({
  label: z.string().min(1, 'Choice label is required.'),
  extraPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number({ invalid_type_error: 'Extra price must be a number.' }).min(0, 'Extra price must be non-negative.')
  ).optional().default(0),
});

const optionSchema = z.object({
  name: z.string().min(1, 'Option group name is required.'),
  type: z.enum(['single', 'multiple']),
  required: z.boolean().optional().default(false),
  choices: z.array(choiceSchema).min(1, 'Option group must have at least one choice.'),
});

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(200, 'Name cannot exceed 200 characters.'),
  category: z.string().min(1, 'Category is required.'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters.').nullable().optional().default(''),
  price: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: 'Price is required.', invalid_type_error: 'Price must be a valid number.' })
      .min(0, 'Price must be non-negative.')
  ),
  images: z.array(imageSchema).nullable().optional().default([]),
  nutrition: nutritionSchema,
  allergens: z.array(z.string()).nullable().optional().default([]),
  tags: z.array(z.string()).nullable().optional().default([]),
  options: z.array(optionSchema).nullable().optional().default([]),
  isAvailable: z.boolean().optional().default(true),
});

const ALLERGEN_SUGGESTIONS = [
  'Dairy', 'Gluten', 'Nuts', 'Peanuts', 'Eggs', 'Fish', 'Shellfish',
  'Soy', 'Sesame', 'Mustard', 'Celery', 'Tahini', 'Spicy',
];

const TAG_SUGGESTIONS = ['healthy', 'kids', 'featured'];

// ─── Options Builder ─────────────────────────────────────────────────────────

function OptionsBuilder({ control, register, errors }) {
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'options',
  });

  return (
    <div>
      {optionFields.map((optField, optIdx) => (
        <OptionGroup
          key={optField.id}
          optIdx={optIdx}
          control={control}
          register={register}
          errors={errors}
          onRemove={() => removeOption(optIdx)}
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          appendOption({ name: '', type: 'single', required: false, choices: [{ label: '', extraPrice: 0 }] })
        }
      >
        <Plus size={13} /> Add Option Group
      </Button>
    </div>
  );
}

function OptionGroup({ optIdx, control, register, errors, onRemove }) {
  const { fields: choiceFields, append: appendChoice, remove: removeChoice } = useFieldArray({
    control,
    name: `options.${optIdx}.choices`,
  });

  const optErrors = errors?.options?.[optIdx];

  return (
    <div className="options-group">
      <div className="options-group-header">
        <input
          className={`input${optErrors?.name ? ' error' : ''}`}
          placeholder="Group name (e.g. Size)"
          style={{ flex: 1 }}
          {...register(`options.${optIdx}.name`)}
          aria-label="Option group name"
        />
        <select
          className="select"
          style={{ width: '130px' }}
          {...register(`options.${optIdx}.type`)}
          aria-label="Selection type"
        >
          <option value="single">Single</option>
          <option value="multiple">Multiple</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" {...register(`options.${optIdx}.required`)} />
          Required
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} style={{ color: '#dc2626' }} aria-label="Remove option group">
          <Trash2 size={13} />
        </Button>
      </div>
      {optErrors?.name && <p className="field-error">{optErrors.name.message}</p>}

      <div className="options-choices">
        {choiceFields.map((cf, ci) => (
          <div key={cf.id} style={{ marginBottom: 8 }}>
            <div className="options-choice-row">
              <input
                className={`input${optErrors?.choices?.[ci]?.label ? ' error' : ''}`}
                placeholder="Choice label"
                {...register(`options.${optIdx}.choices.${ci}.label`)}
                aria-label="Choice label"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                className="input options-choice-price"
                placeholder="Extra QAR"
                {...register(`options.${optIdx}.choices.${ci}.extraPrice`)}
                aria-label="Extra price in QAR"
              />
              {choiceFields.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeChoice(ci)} aria-label="Remove choice">
                  <Trash2 size={13} />
                </Button>
              )}
            </div>
            {optErrors?.choices?.[ci]?.label && (
              <p className="field-error" style={{ marginTop: 4 }}>{optErrors.choices[ci].label.message}</p>
            )}
            {optErrors?.choices?.[ci]?.extraPrice && (
              <p className="field-error" style={{ marginTop: 4 }}>{optErrors.choices[ci].extraPrice.message}</p>
            )}
          </div>
        ))}
      </div>

      {optErrors?.choices?.message && (
        <p className="field-error" style={{ marginTop: 6 }}>{optErrors.choices.message}</p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => appendChoice({ label: '', extraPrice: 0 })}
        style={{ marginTop: '8px' }}
      >
        <Plus size={12} /> Add Choice
      </Button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MenuFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Load existing item when editing
  const { data: itemData, isLoading: isItemLoading } = useQuery({
    queryKey: ['menu-item', id],
    queryFn: () => menuApi.get(id),
    enabled: isEdit,
  });

  const { data: catsData, isLoading: isCatsLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categories = catsData?.data ?? [];

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      price: '',
      images: [],
      nutrition: {},
      allergens: [],
      tags: [],
      options: [],
      isAvailable: true,
    },
  });

  const { fields: optionFields } = useFieldArray({ control, name: 'options' });

  // Populate form when item loads
  useEffect(() => {
    const item = itemData?.data;
    if (item) {
      reset({
        name: item.name,
        category: item.category?._id || item.category || '',
        description: item.description || '',
        price: item.price,
        images: item.images || [],
        nutrition: item.nutrition || {},
        allergens: item.allergens || [],
        tags: item.tags || [],
        options: item.options || [],
        isAvailable: item.isAvailable,
      });
    }
  }, [itemData, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) =>
      isEdit ? menuApi.update(id, data) : menuApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Menu item updated.' : 'Menu item created.');
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      navigate('/menu');
    },
    onError: (err) => {
      toast.error(err.message || 'Save failed.');
    },
  });

  const onValid = (data) => {
    const payload = {
      name: data.name.trim(),
      category: data.category,
      price: Number(data.price),
      description: data.description ? data.description.trim() : '',
      images: Array.isArray(data.images) ? data.images : [],
      allergens: Array.isArray(data.allergens) ? data.allergens : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      isAvailable: data.isAvailable ?? true,
    };

    // Clean nutrition: only keep defined numeric values (empty-string/null converted to undefined)
    if (data.nutrition && typeof data.nutrition === 'object') {
      const cleanNutrition = {};
      for (const [k, v] of Object.entries(data.nutrition)) {
        if (v !== '' && v !== null && v !== undefined && !Number.isNaN(v)) {
          cleanNutrition[k] = Number(v);
        }
      }
      payload.nutrition = cleanNutrition;
    } else {
      payload.nutrition = {};
    }

    // Clean options
    if (Array.isArray(data.options)) {
      payload.options = data.options.map((opt) => ({
        name: opt.name.trim(),
        type: opt.type || 'single',
        required: !!opt.required,
        choices: (opt.choices || []).map((c) => ({
          label: c.label.trim(),
          extraPrice: c.extraPrice !== '' && c.extraPrice !== null && c.extraPrice !== undefined ? Number(c.extraPrice) : 0,
        })),
      }));
    } else {
      payload.options = [];
    }

    save(payload);
  };

  const onInvalid = (fieldErrors) => {
    if (fieldErrors.options) {
      setOptionsOpen(true);
    }

    const messages = [];
    const collect = (obj) => {
      if (!obj || typeof obj !== 'object') return;
      if (typeof obj.message === 'string' && obj.message) {
        messages.push(obj.message);
      }
      for (const v of Object.values(obj)) {
        if (typeof v === 'object') collect(v);
      }
    };
    collect(fieldErrors);

    const toastMsg = messages.length > 0
      ? messages.slice(0, 3).join(' · ')
      : 'Please fix the errors in the form.';
    toast.error(toastMsg);
  };

  // Unsaved changes warning
  useEffect(() => {
    const handler = (e) => {
      if (isDirty && !isPending) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, isPending]);

  if (isEdit && isItemLoading) {
    return (
      <div>
        <div style={{ marginBottom: 24 }}><SkeletonCard height={40} /></div>
        <SkeletonCard height={400} />
      </div>
    );
  }

  const catOptions = categories.map((c) => ({ value: c._id, label: c.name }));

  return (
    <div>
      {/* Unsaved bar */}
      {isDirty && !isPending && (
        <div className="unsaved-bar">
          ⚠️ You have unsaved changes.
        </div>
      )}

      <div className="page-header">
        <div className="page-header-left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link to="/menu">
            <Button variant="ghost" size="sm" aria-label="Back to menu list">
              <ArrowLeft size={15} />
            </Button>
          </Link>
          <div>
            <h1 className="page-title">{isEdit ? 'Edit Menu Item' : 'New Menu Item'}</h1>
            <p className="page-subtitle">{isEdit ? itemData?.data?.name : 'Fill in the details below'}</p>
          </div>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate('/menu')} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit(onValid, onInvalid)}
            isLoading={isPending}
            disabled={isPending}
            id="menu-item-save-btn"
          >
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Item')}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

          {/* Left column */}
          <div>
            {/* Basic info */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Basic Information</h2></div>
              <div className="card-body">
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <Input
                    id="item-name"
                    label="Name *"
                    placeholder="e.g. Classic Smash Burger"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <div>
                    <label className="label" htmlFor="item-category">Category *</label>
                    <select
                      id="item-category"
                      className={`select${errors.category ? ' error' : ''}`}
                      {...register('category')}
                      disabled={isCatsLoading}
                      aria-invalid={!!errors.category}
                    >
                      <option value="">Select category…</option>
                      {catOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {errors.category && <p className="field-error">{errors.category.message}</p>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="label" htmlFor="item-description">Description</label>
                  <textarea
                    id="item-description"
                    className={`textarea${errors.description ? ' error' : ''}`}
                    placeholder="Describe this menu item…"
                    {...register('description')}
                  />
                  {errors.description && <p className="field-error">{errors.description.message}</p>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="label" htmlFor="item-price">Price (QAR) *</label>
                  <div className="input-group">
                    <span className="input-prefix">QAR</span>
                    <input
                      id="item-price"
                      type="number"
                      min="0"
                      step="0.01"
                      className={`input${errors.price ? ' error' : ''}`}
                      placeholder="0.00"
                      style={{ borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                      {...register('price')}
                    />
                  </div>
                  {errors.price && <p className="field-error">{errors.price.message}</p>}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Images</h2></div>
              <div className="card-body">
                <Controller
                  name="images"
                  control={control}
                  render={({ field }) => (
                    <ImageUploader
                      value={field.value}
                      onChange={field.onChange}
                      maxImages={6}
                    />
                  )}
                />
                {errors.images && <p className="field-error" style={{ marginTop: 6 }}>{errors.images.message}</p>}
              </div>
            </div>

            {/* Nutrition */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Nutrition <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-secondary)' }}>(optional)</span></h2></div>
              <div className="card-body">
                <div className="form-row-3">
                  {[
                    { field: 'nutrition.calories', key: 'calories', label: 'Calories (kcal)' },
                    { field: 'nutrition.fat', key: 'fat', label: 'Fat (g)' },
                    { field: 'nutrition.protein', key: 'protein', label: 'Protein (g)' },
                    { field: 'nutrition.carbs', key: 'carbs', label: 'Carbs (g)' },
                    { field: 'nutrition.fiber', key: 'fiber', label: 'Fiber (g)' },
                  ].map(({ field, key, label }) => {
                    const fieldErr = errors.nutrition?.[key];
                    return (
                      <div key={field}>
                        <label className="label" htmlFor={field}>{label}</label>
                        <input
                          id={field}
                          type="number"
                          min="0"
                          step="0.1"
                          className={`input${fieldErr ? ' error' : ''}`}
                          placeholder="—"
                          {...register(field)}
                        />
                        {fieldErr && <p className="field-error">{fieldErr.message}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Options Builder */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <button
                  type="button"
                  className="collapsible-trigger"
                  onClick={() => setOptionsOpen((o) => !o)}
                  aria-expanded={optionsOpen}
                  style={{ margin: 0 }}
                >
                  {optionsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  Options / Add-ons
                  {optionFields.length > 0 && (
                    <span className="badge badge-gray" style={{ marginLeft: 4 }}>{optionFields.length}</span>
                  )}
                  {errors.options && (
                    <span className="badge" style={{ marginLeft: 6, background: '#fee2e2', color: '#b91c1c' }}>Errors</span>
                  )}
                </button>
              </div>
              {optionsOpen && (
                <div className="card-body">
                  <OptionsBuilder control={control} register={register} errors={errors} />
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* Availability */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-body">
                <label className="label">Availability</label>
                <Controller
                  name="isAvailable"
                  control={control}
                  render={({ field }) => (
                    <Toggle
                      id="item-isAvailable"
                      checked={field.value}
                      onChange={field.onChange}
                      label={field.value ? 'Available for ordering' : 'Currently unavailable'}
                    />
                  )}
                />
              </div>
            </div>

            {/* Allergens */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Allergens</h2></div>
              <div className="card-body">
                <Controller
                  name="allergens"
                  control={control}
                  render={({ field }) => (
                    <ChipInput
                      id="item-allergens"
                      value={field.value}
                      onChange={field.onChange}
                      suggestions={ALLERGEN_SUGGESTIONS}
                      placeholder="Add allergen…"
                    />
                  )}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                  Type or select from suggestions
                </p>
              </div>
            </div>

            {/* Tags */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Tags</h2></div>
              <div className="card-body">
                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <ChipInput
                      id="item-tags"
                      value={field.value}
                      onChange={field.onChange}
                      suggestions={TAG_SUGGESTIONS}
                      placeholder="Add tag…"
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile save button */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="secondary" type="button" onClick={() => navigate('/menu')} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" isLoading={isPending} disabled={isPending} id="menu-item-save-btn-bottom">
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Item')}
          </Button>
        </div>
      </form>
    </div>
  );
}
