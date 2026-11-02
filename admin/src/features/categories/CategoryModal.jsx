import { useEffect } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { categoriesApi } from '../../api/endpoints.js';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Toggle from '../../components/Toggle.jsx';
import ImageUploader from '../../components/ImageUploader.jsx';
import { optionalImageSourceSchema } from '../../utils/validation.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  nameAr: z.string().max(100).optional().default(''),
  description: z.string().max(500).optional().default(''),
  descriptionAr: z.string().max(500).optional().default(''),
  image: optionalImageSourceSchema,
  isActive: z.boolean().optional().default(true),
});

export default function CategoryModal({ isOpen, onClose, category }) {
  const queryClient = useQueryClient();
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', nameAr: '', description: '', descriptionAr: '', image: '', isActive: true },
  });

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      reset(
        category
          ? {
              name: category.name,
              nameAr: category.nameAr || '',
              description: category.description || '',
              descriptionAr: category.descriptionAr || '',
              image: category.image || '',
              isActive: category.isActive,
            }
          : { name: '', nameAr: '', description: '', descriptionAr: '', image: '', isActive: true }
      );
    }
  }, [isOpen, category, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) =>
      isEdit ? categoriesApi.update(category._id, data) : categoriesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated.' : 'Category created.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || 'Save failed.');
    },
  });

  const onInvalid = (fieldErrors) => {
    const messages = [];
    for (const err of Object.values(fieldErrors)) {
      if (err?.message) messages.push(err.message);
    }
    toast.error(messages.length > 0 ? messages.slice(0, 3).join(' · ') : 'Please fix the errors in the form.');
  };

  // useWatch is the memoization-safe API (no React Compiler warning)
  const imageVal = useWatch({ control, name: 'image' });

  // ImageUploader expects array; category uses a single image URL
  const imageArr = imageVal ? [{ url: imageVal, thumbUrl: imageVal, alt: '' }] : [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'New Category'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit((data) => save(data), onInvalid)}
            isLoading={isPending}
            disabled={isPending}
            id="category-save-btn"
          >
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Category')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((data) => save(data), onInvalid)} noValidate>
        <div className="form-group">
          <Input
            id="cat-name"
            label="Name *"
            placeholder="e.g. Burgers"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <div className="form-group">
          <Input
            id="cat-nameAr"
            label="Arabic name (الاسم بالعربية) (optional, shown on the Arabic site; if empty the English text is shown)"
            placeholder="مثال: برجر"
            dir="rtl"
            lang="ar"
            style={{ textAlign: 'right' }}
            error={errors.nameAr?.message}
            {...register('nameAr')}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="cat-description">Description</label>
          <textarea
            id="cat-description"
            className={`textarea${errors.description ? ' error' : ''}`}
            placeholder="Short description for this category…"
            {...register('description')}
          />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>

        <div className="form-group">
          <label className="label" htmlFor="cat-descriptionAr">
            Arabic description (الوصف بالعربية) <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>(optional, shown on the Arabic site; if empty the English text is shown)</span>
          </label>
          <textarea
            id="cat-descriptionAr"
            className={`textarea${errors.descriptionAr ? ' error' : ''}`}
            dir="rtl"
            lang="ar"
            placeholder="وصف قصير للقسم بالعربية..."
            style={{ textAlign: 'right' }}
            {...register('descriptionAr')}
          />
          {errors.descriptionAr && <p className="field-error">{errors.descriptionAr.message}</p>}
        </div>

        <div className="form-group">
          <label className="label">Image</label>
          <Controller
            name="image"
            control={control}
            render={({ field }) => (
              <ImageUploader
                value={imageArr}
                onChange={(imgs) => field.onChange(imgs[0]?.url || '')}
                maxImages={1}
              />
            )}
          />
          {errors.image && <p className="field-error" style={{ marginTop: 6 }}>{errors.image.message}</p>}
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Toggle
                id="cat-isActive"
                checked={field.value}
                onChange={field.onChange}
                label="Active (visible on public site)"
              />
            )}
          />
        </div>
      </form>
    </Modal>
  );
}
