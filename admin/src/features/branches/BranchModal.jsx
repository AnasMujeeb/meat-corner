import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { branchesApi } from '../../api/endpoints.js';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import Toggle from '../../components/Toggle.jsx';
import { optionalAbsoluteUrlSchema } from '../../utils/validation.js';

const schema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  address: z.string().max(500).optional().default(''),
  phone: z.string().max(30).optional().default(''),
  mapUrl: optionalAbsoluteUrlSchema,
  openingHours: z.string().max(200).optional().default(''),
  order: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export default function BranchModal({ isOpen, onClose, branch }) {
  const queryClient = useQueryClient();
  const isEdit = !!branch;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', phone: '', mapUrl: '', openingHours: '', order: 0, isActive: true },
  });

  useEffect(() => {
    if (isOpen) {
      reset(
        branch
          ? {
              name: branch.name,
              address: branch.address || '',
              phone: branch.phone || '',
              mapUrl: branch.mapUrl || '',
              openingHours: branch.openingHours || '',
              order: branch.order ?? 0,
              isActive: branch.isActive,
            }
          : { name: '', address: '', phone: '', mapUrl: '', openingHours: '', order: 0, isActive: true }
      );
    }
  }, [isOpen, branch, reset]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) =>
      isEdit ? branchesApi.update(branch._id, data) : branchesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Branch updated.' : 'Branch created.');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Branch' : 'New Branch'}
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
            id="branch-save-btn"
          >
            {isPending ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Branch')}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit((data) => save(data), onInvalid)} noValidate>
        <div className="form-group">
          <Input
            id="branch-name"
            label="Name *"
            placeholder="e.g. Madinat Khalifa"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <div className="form-group">
          <Input
            id="branch-address"
            label="Address"
            placeholder="e.g. Madinat Khalifa, Doha"
            error={errors.address?.message}
            {...register('address')}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <Input
              id="branch-phone"
              label="Phone"
              placeholder="+974 XXXX XXXX"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
          <div className="form-group">
            <Input
              id="branch-order"
              label="Display Order"
              type="number"
              min="0"
              error={errors.order?.message}
              {...register('order')}
            />
          </div>
        </div>

        <div className="form-group">
          <Input
            id="branch-mapUrl"
            label="Google Maps URL"
            placeholder="https://maps.google.com/..."
            error={errors.mapUrl?.message}
            {...register('mapUrl')}
          />
        </div>

        <div className="form-group">
          <Input
            id="branch-openingHours"
            label="Opening Hours"
            placeholder="e.g. Sat–Thu 12PM–11PM, Fri 1PM–12AM"
            error={errors.openingHours?.message}
            {...register('openingHours')}
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => (
              <Toggle
                id="branch-isActive"
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
