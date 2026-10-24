import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, GripVertical, Image as ImageIcon } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { categoriesApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Toggle from '../components/Toggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { SkeletonCategoryRow } from '../components/Skeleton.jsx';
import CategoryModal from '../features/categories/CategoryModal.jsx';

// ─── Sortable Category Row ───────────────────────────────────────────────────

function SortableCategoryRow({ category, onEdit, onDelete, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="category-row dnd-item">
      <button
        className="drag-handle btn btn-ghost btn-icon"
        {...attributes}
        {...listeners}
        aria-label="Reorder category"
        type="button"
      >
        <GripVertical size={18} />
      </button>

      {category.image ? (
        <img
          src={category.image}
          alt={category.name}
          className="category-thumb"
        />
      ) : (
        <div className="category-thumb-placeholder">
          <ImageIcon size={20} />
        </div>
      )}

      <div className="category-info">
        <div className="category-name">{category.name}</div>
        <div className="category-desc">{category.description || 'No description'}</div>
      </div>

      <Toggle
        id={`cat-active-${category._id}`}
        checked={category.isActive}
        onChange={(val) => onToggle(category._id, val)}
        label={category.isActive ? 'Active' : 'Inactive'}
      />

      <div className="category-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(category)}
          aria-label={`Edit ${category.name}`}
          id={`edit-category-${category._id}`}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(category)}
          aria-label={`Delete ${category.name}`}
          id={`delete-category-${category._id}`}
          style={{ color: '#dc2626' }}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [optimisticCategories, setOptimisticCategories] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categories = optimisticCategories ?? data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { mutate: reorder } = useMutation({
    mutationFn: (ids) => categoriesApi.reorder(ids),
    onError: () => {
      setOptimisticCategories(null); // revert on error
      toast.error('Reorder failed. Please try again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setOptimisticCategories(null);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }) => categoriesApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const prev = queryClient.getQueryData(['categories']);
      queryClient.setQueryData(['categories'], (old) => ({
        ...old,
        data: old.data.map((c) => (c._id === id ? { ...c, isActive } : c)),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['categories'], ctx.prev);
      toast.error('Failed to update status.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const { mutate: deleteCategory, isPending: isDeleting } = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Category deleted.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.message || 'Delete failed.');
    },
  });

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c._id === active.id);
    const newIndex = categories.findIndex((c) => c._id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    setOptimisticCategories(reordered);
    reorder(reordered.map((c) => c._id));
  }

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(cat) {
    setEditTarget(cat);
    setModalOpen(true);
  }

  function openDelete(cat) {
    setDeleteTarget(cat);
    setDeleteError('');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} · drag to reorder
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={openCreate} id="add-category-btn">
            <Plus size={15} />
            Add Category
          </Button>
        </div>
      </div>

      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => <SkeletonCategoryRow key={i} />)
      ) : categories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><ImageIcon size={40} /></div>
            <h2 className="empty-state-title">No categories yet</h2>
            <p className="empty-state-desc">Create your first category to start organizing your menu.</p>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={14} /> Add Category
            </Button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            {categories.map((cat) => (
              <SortableCategoryRow
                key={cat._id}
                category={cat}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggle={(id, isActive) => toggleActive({ id, isActive })}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        onConfirm={() => deleteCategory(deleteTarget._id)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Category"
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
