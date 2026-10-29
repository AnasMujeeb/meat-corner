import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft, RefreshCw, Layers, Check, X, Image as ImageIcon } from 'lucide-react';

import { menuApi, categoriesApi, optionsLibraryApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import Toggle from '../components/Toggle.jsx';
import ChipInput from '../components/ChipInput.jsx';
import ImageUploader from '../components/ImageUploader.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';
import { imageSourceSchema, optionalImageSourceSchema } from '../utils/validation.js';
import wagyuBadge from '../assets/badges/badge-wagyu.svg';
import chickenBadge from '../assets/badges/badge-chicken.svg';
import healthyBadge from '../assets/badges/badge-healthy.svg';
import fishBadge from '../assets/badges/badge-fish.svg';

const AVAILABLE_BADGES = [
  { id: 'wagyu', label: 'Wagyu', icon: wagyuBadge },
  { id: 'chicken', label: 'Chicken', icon: chickenBadge },
  { id: 'healthy', label: 'Healthy', icon: healthyBadge },
  { id: 'fish', label: 'Fish', icon: fishBadge },
];

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
  image: z
    .object({
      url: optionalImageSourceSchema,
      thumbUrl: optionalImageSourceSchema,
    })
    .optional()
    .default({ url: '', thumbUrl: '' }),
  libraryItemId: z.string().nullable().optional().default(null),
});

const optionSchema = z.object({
  name: z.string().min(1, 'Option group name is required.'),
  type: z.enum(['single', 'multiple']),
  groupType: z.enum(['text', 'photo']).optional().default('text'),
  maxSelections: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 1 : Number(v)),
    z.number({ invalid_type_error: 'Must be a number.' }).int().min(1).optional().default(1)
  ),
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
  badges: z.array(z.enum(['wagyu', 'chicken', 'healthy', 'fish'])).nullable().optional().default([]),
  options: z.array(optionSchema).nullable().optional().default([]),
  isAvailable: z.boolean().optional().default(true),
});

const ALLERGEN_SUGGESTIONS = [
  'Dairy', 'Gluten', 'Nuts', 'Peanuts', 'Eggs', 'Fish', 'Shellfish',
  'Soy', 'Sesame', 'Mustard', 'Celery', 'Tahini', 'Spicy',
];

const TAG_SUGGESTIONS = ['healthy', 'kids', 'featured'];

// ─── Options Builder & Library Picker ───────────────────────────────────────

function LibraryPickerModal({ isOpen, onClose, onSelect, alreadySelectedIds = [] }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [chosenIds, setChosenIds] = useState(new Set());

  const { data: libraryData, isLoading } = useQuery({
    queryKey: ['options-library'],
    queryFn: () => optionsLibraryApi.list(),
    enabled: isOpen,
  });

  const libraryItems = libraryData?.data ?? [];

  if (!isOpen) return null;

  const filtered = libraryItems.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectableFiltered = filtered.filter(
    (item) => !alreadySelectedIds.map(String).includes(String(item._id))
  );

  const isAllFilteredSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((item) => chosenIds.has(item._id));

  function handleSelectAllToggle() {
    setChosenIds((prev) => {
      const next = new Set(prev);
      if (isAllFilteredSelected) {
        selectableFiltered.forEach((item) => next.delete(item._id));
      } else {
        selectableFiltered.forEach((item) => next.add(item._id));
      }
      return next;
    });
  }

  function toggleItem(item) {
    if (alreadySelectedIds.map(String).includes(String(item._id))) return;
    setChosenIds((prev) => {
      const next = new Set(prev);
      if (next.has(item._id)) {
        next.delete(item._id);
      } else {
        next.add(item._id);
      }
      return next;
    });
  }

  function handleConfirm() {
    const selectedItems = libraryItems.filter((i) => chosenIds.has(i._id));
    onSelect(selectedItems);
    onClose();
    setChosenIds(new Set());
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg, #fff)',
          borderRadius: 8,
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pick from Options Library</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Select sauces or side dishes to add with photos</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'sauce', 'side'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: 12, textTransform: 'capitalize' }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat === 'all' ? 'All' : cat === 'sauce' ? 'Sauces' : 'Side Dishes'}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, flex: '1 1 240px', alignItems: 'center' }}>
            <input
              type="text"
              className="input"
              placeholder="Search library…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ fontSize: 12, height: 32, flex: 1 }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSelectAllToggle}
              disabled={selectableFiltered.length === 0}
              style={{ fontSize: 12, height: 32, whiteSpace: 'nowrap' }}
            >
              {isAllFilteredSelected ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
        </div>

        <div style={{ padding: 16, overflowY: 'auto', flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {isLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>Loading library items…</div>
          ) : filtered.length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No items found in library.</div>
          ) : (
            filtered.map((item) => {
              const isSelected = chosenIds.has(item._id);
              const isAlreadyAdded = alreadySelectedIds.map(String).includes(String(item._id));
              return (
                <div
                  key={item._id}
                  onClick={() => toggleItem(item)}
                  style={{
                    border: isSelected ? '2px solid var(--primary, #0f172a)' : '1px solid var(--border)',
                    borderRadius: 6,
                    padding: 8,
                    cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                    opacity: isAlreadyAdded ? 0.65 : 1,
                    background: isSelected ? 'rgba(0,0,0,0.04)' : 'var(--paper, #fff)',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 4, overflow: 'hidden', background: '#f1f5f9', marginBottom: 6 }}>
                    {item.image?.thumbUrl || item.image?.url ? (
                      <img src={item.image.thumbUrl || item.image?.url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#94a3b8' }}>NO IMG</div>
                    )}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.price > 0 ? `+QAR ${item.price}` : 'Free'}</div>
                  {isSelected && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: 'var(--primary, #0f172a)', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                      ✓
                    </div>
                  )}
                  {isAlreadyAdded && (
                    <div style={{ position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff', borderRadius: 3, padding: '1px 4px', fontSize: 9 }}>
                      In group
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{chosenIds.size} selected</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleConfirm} disabled={chosenIds.size === 0}>
              Add Selected ({chosenIds.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionsBuilder({ control, register, errors, setValue, getValues, watch }) {
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
          setValue={setValue}
          getValues={getValues}
          watch={watch}
          onRemove={() => removeOption(optIdx)}
        />
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          appendOption({
            name: '',
            type: 'single',
            groupType: 'text',
            maxSelections: 1,
            required: false,
            choices: [{ label: '', extraPrice: 0, image: { url: '', thumbUrl: '' }, libraryItemId: null }],
          })
        }
      >
        <Plus size={13} /> Add Option Group
      </Button>
    </div>
  );
}

function OptionGroup({ optIdx, control, register, errors, setValue, getValues, watch, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { fields: choiceFields, append: appendChoice, remove: removeChoice, update: updateChoice } = useFieldArray({
    control,
    name: `options.${optIdx}.choices`,
  });

  const optErrors = errors?.options?.[optIdx];
  const groupType = watch(`options.${optIdx}.groupType`) || 'text';
  const selType = watch(`options.${optIdx}.type`) || 'single';

  const currentChoices = watch(`options.${optIdx}.choices`) || [];
  const existingLibIds = currentChoices.map((c) => c?.libraryItemId).filter(Boolean);

  function handleAddFromLibrary(selectedLibraryItems) {
    setValue(`options.${optIdx}.groupType`, 'photo');
    // If adding more than 1 item and type is single, default maxSelections to selected count
    if (selectedLibraryItems.length > 1 && selType === 'single') {
      setValue(`options.${optIdx}.type`, 'multiple');
      setValue(`options.${optIdx}.maxSelections`, selectedLibraryItems.length);
    }
    // If choice list currently has only 1 empty default choice, remove it
    if (choiceFields.length === 1 && !currentChoices[0]?.label) {
      removeChoice(0);
    }
    for (const libItem of selectedLibraryItems) {
      appendChoice({
        label: libItem.name,
        extraPrice: libItem.price || 0,
        image: {
          url: libItem.image?.url || '',
          thumbUrl: libItem.image?.thumbUrl || libItem.image?.url || '',
        },
        libraryItemId: libItem._id,
      });
    }
  }

  async function handleSyncWithLibrary() {
    try {
      const res = await optionsLibraryApi.list();
      const allLibItems = res?.data || [];
      const libMap = new Map(allLibItems.map((item) => [item._id.toString(), item]));

      let count = 0;
      currentChoices.forEach((choice, idx) => {
        if (choice.libraryItemId && libMap.has(choice.libraryItemId.toString())) {
          const fresh = libMap.get(choice.libraryItemId.toString());
          updateChoice(idx, {
            ...choice,
            label: fresh.name,
            image: {
              url: fresh.image?.url || choice.image?.url || '',
              thumbUrl: fresh.image?.thumbUrl || fresh.image?.url || choice.image?.thumbUrl || '',
            },
          });
          count++;
        }
      });
      toast.success(`Synced ${count} choice(s) from library.`);
    } catch (err) {
      toast.error('Failed to sync choices with library.');
    }
  }

  return (
    <div className="options-group" style={{ marginBottom: 16 }}>
      {/* Group Controls Bar */}
      <div className="options-group-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input
          className={`input${optErrors?.name ? ' error' : ''}`}
          placeholder="Group Title (e.g. Choose Sauces, Doneness)"
          style={{ flex: '1 1 180px', minWidth: 160 }}
          {...register(`options.${optIdx}.name`)}
          aria-label="Option group title"
        />

        {/* Display Type: Text-Only vs Photo Cards */}
        <select
          className="select"
          style={{ width: '150px' }}
          {...register(`options.${optIdx}.groupType`)}
          aria-label="Display style"
        >
          <option value="text">Text (Doneness)</option>
          <option value="photo">Photo Cards</option>
        </select>

        {/* Single vs Multiple */}
        <select
          className="select"
          style={{ width: '120px' }}
          {...register(`options.${optIdx}.type`)}
          aria-label="Selection type"
        >
          <option value="single">Single (1)</option>
          <option value="multiple">Multiple</option>
        </select>

        {/* Max selections */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Max:</span>
          <input
            type="number"
            min="1"
            className="input"
            style={{ width: '60px', padding: '4px 6px', textAlign: 'center' }}
            title="Max choices allowed"
            {...register(`options.${optIdx}.maxSelections`)}
            aria-label="Max selections"
          />
        </div>

        {/* Required */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input type="checkbox" {...register(`options.${optIdx}.required`)} />
          Required
        </label>

        <Button type="button" variant="ghost" size="sm" onClick={onRemove} style={{ color: '#dc2626' }} aria-label="Remove option group">
          <Trash2 size={13} />
        </Button>
      </div>

      {optErrors?.name && <p className="field-error">{optErrors.name.message}</p>}

      {/* Group Action Tools */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setPickerOpen(true)}
          style={{ fontSize: 12 }}
        >
          <Layers size={13} /> Pick from Library
        </Button>
        {existingLibIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSyncWithLibrary}
            style={{ fontSize: 12 }}
            title="Refresh snapshot names & photos from library"
          >
            <RefreshCw size={12} /> Sync with Library
          </Button>
        )}
      </div>

      {/* Choices list */}
      <div className="options-choices">
        {choiceFields.map((cf, ci) => {
          const choiceImage = currentChoices[ci]?.image?.thumbUrl || currentChoices[ci]?.image?.url;
          return (
            <div key={cf.id} style={{ marginBottom: 8 }}>
              <div className="options-choice-row" style={{ alignItems: 'center' }}>
                {choiceImage ? (
                  <img
                    src={choiceImage}
                    alt=""
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      objectFit: 'cover',
                      border: '1px solid var(--border)',
                      flexShrink: 0,
                    }}
                  />
                ) : groupType === 'photo' ? (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 4,
                      background: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      color: '#94a3b8',
                      flexShrink: 0,
                    }}
                  >
                    No Img
                  </div>
                ) : null}

                <input type="hidden" {...register(`options.${optIdx}.choices.${ci}.image.url`)} />
                <input type="hidden" {...register(`options.${optIdx}.choices.${ci}.image.thumbUrl`)} />
                <input type="hidden" {...register(`options.${optIdx}.choices.${ci}.libraryItemId`)} />

                <input
                  className={`input${optErrors?.choices?.[ci]?.label ? ' error' : ''}`}
                  placeholder="Choice label (e.g. Medium Rare)"
                  style={{ flex: 1 }}
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
            </div>
          );
        })}
      </div>

      {optErrors?.choices?.message && (
        <p className="field-error" style={{ marginTop: 6 }}>{optErrors.choices.message}</p>
      )}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() =>
          appendChoice({
            label: '',
            extraPrice: 0,
            image: { url: '', thumbUrl: '' },
            libraryItemId: null,
          })
        }
        style={{ marginTop: '6px', fontSize: 12 }}
      >
        <Plus size={12} /> Add Choice
      </Button>

      {/* Library Picker Modal */}
      <LibraryPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleAddFromLibrary}
        alreadySelectedIds={existingLibIds}
      />
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
    setValue,
    getValues,
    watch,
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
      badges: [],
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
        badges: item.badges || [],
        options: (item.options || []).map((opt) => ({
          name: opt.name || '',
          type: opt.type || 'single',
          groupType: opt.groupType || 'text',
          maxSelections: opt.maxSelections || 1,
          required: !!opt.required,
          choices: (opt.choices || []).map((c) => ({
            label: c.label || '',
            extraPrice: c.extraPrice || 0,
            image: {
              url: c.image?.url || '',
              thumbUrl: c.image?.thumbUrl || c.image?.url || '',
            },
            libraryItemId: c.libraryItemId ? String(c.libraryItemId) : null,
          })),
        })),
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
      badges: Array.isArray(data.badges) ? data.badges : [],
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
        groupType: opt.groupType || 'text',
        maxSelections: Number(opt.maxSelections) || 1,
        required: !!opt.required,
        choices: (opt.choices || []).map((c) => ({
          label: c.label.trim(),
          extraPrice: c.extraPrice !== '' && c.extraPrice !== null && c.extraPrice !== undefined ? Number(c.extraPrice) : 0,
          image: {
            url: c.image?.url || '',
            thumbUrl: c.image?.thumbUrl || c.image?.url || '',
          },
          libraryItemId: c.libraryItemId ? String(c.libraryItemId) : null,
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
                  <OptionsBuilder
                    control={control}
                    register={register}
                    errors={errors}
                    setValue={setValue}
                    getValues={getValues}
                    watch={watch}
                  />
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

            {/* Badges */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header"><h2 className="section-title">Badges</h2></div>
              <div className="card-body">
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Select highlight badge(s) for this menu item
                </p>
                <Controller
                  name="badges"
                  control={control}
                  render={({ field }) => {
                    const selected = Array.isArray(field.value) ? field.value : [];
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {AVAILABLE_BADGES.map((b) => {
                          const isChecked = selected.includes(b.id);
                          return (
                            <label
                              key={b.id}
                              htmlFor={`badge-${b.id}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 6,
                                border: isChecked ? '1px solid var(--primary, #b31b1b)' : '1px solid var(--border)',
                                background: isChecked ? 'rgba(179, 27, 27, 0.05)' : 'var(--bg-surface, #fff)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <img
                                  src={b.icon}
                                  alt=""
                                  style={{ width: 24, height: 24, objectFit: 'contain' }}
                                />
                                <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--text)' }}>
                                  {b.label}
                                </span>
                              </div>
                              <Toggle
                                id={`badge-${b.id}`}
                                checked={isChecked}
                                onChange={(checked) => {
                                  const next = checked
                                    ? [...selected, b.id]
                                    : selected.filter((x) => x !== b.id);
                                  field.onChange(next);
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    );
                  }}
                />
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
