import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  ExternalLink,
  Layers,
} from 'lucide-react';
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

import { categoriesApi, menuApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Toggle from '../components/Toggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { SkeletonCategoryRow } from '../components/Skeleton.jsx';
import CategoryModal from '../features/categories/CategoryModal.jsx';

// ─── Sortable Category Item Row (Inside Expanded Category) ─────────────────────

function SortableItemRow({
  item,
  index,
  totalCount,
  category,
  onMoveUp,
  onMoveDown,
  onToggleAvailability,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isFirst = index === 0;
  const isLast = index === totalCount - 1;
  const imageUrl = item.thumbUrl || item.images?.[0]?.thumbUrl || item.images?.[0]?.url;

  return (
    <div ref={setNodeRef} style={style} className="category-item-card dnd-item">
      {/* Reorder controls */}
      <div className="category-order-controls">
        <button
          className="drag-handle btn btn-ghost btn-icon"
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${item.name}`}
          type="button"
          title="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={15} />
        </button>

        <div className="category-step-buttons">
          <button
            type="button"
            className="btn btn-ghost btn-icon category-step-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={isFirst}
            aria-label={`Move ${item.name} up`}
            title="Move up"
          >
            <ChevronUp size={13} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon category-step-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            aria-label={`Move ${item.name} down`}
            title="Move down"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        <span className="category-order-badge" title={`Position: ${index + 1}`}>
          #{index + 1}
        </span>
      </div>

      {/* Thumbnail */}
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.name}
          className="category-item-thumb"
          loading="lazy"
        />
      ) : (
        <div className="category-item-thumb-placeholder">
          <ImageIcon size={18} />
        </div>
      )}

      {/* Item Info */}
      <div className="category-item-info">
        <div className="category-item-title-row">
          <span className="category-item-name">{item.name}</span>
          {item.nameAr && (
            <span className="category-item-name-ar" dir="rtl" lang="ar">
              {item.nameAr}
            </span>
          )}
          {item.isAlsoShowIn && (
            <span
              className="category-item-extra-badge"
              title={`Primary category: ${item.mainCategoryName || 'Another category'}`}
            >
              <Layers size={11} /> Also in {item.mainCategoryName || 'Other'}
            </span>
          )}
        </div>
        {item.description && (
          <p className="category-item-desc">{item.description}</p>
        )}
      </div>

      {/* Price */}
      <div className="category-item-price">
        QAR {Number(item.price || 0).toFixed(2)}
      </div>

      {/* Item actions */}
      <div className="category-item-actions" onClick={(e) => e.stopPropagation()}>
        <Toggle
          id={`item-available-${item._id}`}
          checked={item.isAvailable !== false}
          onChange={() => onToggleAvailability(item._id)}
          label={item.isAvailable !== false ? 'Available' : 'Hidden'}
        />

        <Link
          to={`/menu/${item._id}/edit`}
          state={{ from: 'categories', expandedCategoryId: category._id }}
          className="btn btn-ghost btn-sm"
          title="Edit item"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil size={13} /> Edit
        </Link>
      </div>
    </div>
  );
}

// ─── Category Items Panel (Inside Accordion) ──────────────────────────────────

function CategoryItemsSection({ category }) {
  const queryClient = useQueryClient();
  const [localItems, setLocalItems] = useState(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['category-items', category._id],
    queryFn: () => categoriesApi.getItems(category._id),
  });

  // Handle both shapes: data?.data as array or data?.data?.items as array
  const serverItems = Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.data?.items)
    ? data.data.items
    : [];

  // Reset local items whenever server data refreshes
  useEffect(() => {
    if (serverItems) {
      setLocalItems(serverItems);
    }
  }, [data]);

  const items = localItems ?? serverItems;

  // Determine if local order differs from server order
  const hasOrderChanged = (() => {
    if (!localItems || !serverItems || localItems.length !== serverItems.length) return false;
    for (let i = 0; i < localItems.length; i++) {
      if (localItems[i]._id !== serverItems[i]._id) return true;
    }
    return false;
  })();

  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { mutate: saveOrder, isPending: isSaving } = useMutation({
    mutationFn: (itemIds) => categoriesApi.reorderItems(category._id, itemIds),
    onSuccess: (res) => {
      toast.success(res.message || 'Item order saved.');
      queryClient.invalidateQueries({ queryKey: ['category-items', category._id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save order.');
      // Refresh to sync back with server
      queryClient.invalidateQueries({ queryKey: ['category-items', category._id] });
    },
  });

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: (itemId) => menuApi.toggleAvailability(itemId),
    onMutate: async (itemId) => {
      // Optimistic update
      setLocalItems((prev) =>
        prev
          ? prev.map((it) =>
              it._id === itemId ? { ...it, isAvailable: !it.isAvailable } : it
            )
          : prev
      );
    },
    onSuccess: () => {
      toast.success('Availability updated.');
      queryClient.invalidateQueries({ queryKey: ['category-items', category._id] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to toggle availability.');
      queryClient.invalidateQueries({ queryKey: ['category-items', category._id] });
    },
  });

  function handleItemDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((it) => it._id === active.id);
    const newIndex = items.findIndex((it) => it._id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setLocalItems(reordered);
  }

  function handleItemMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = arrayMove(items, index, targetIndex);
    setLocalItems(reordered);
  }

  function handleDiscard() {
    setLocalItems(serverItems);
  }

  function handleSave() {
    if (!items.length) return;
    const itemIds = items.map((it) => it._id);
    saveOrder(itemIds);
  }

  return (
    <div className="category-items-panel" onClick={(e) => e.stopPropagation()}>
      <div className="category-items-header">
        <div className="category-items-heading">
          {category.name} Items {isLoading ? '(Loading...)' : isError ? '(Error)' : `(${items.length})`}
        </div>

        {hasOrderChanged && !isLoading && !isError && (
          <div className="category-reorder-bar">
            <span className="category-reorder-badge">Unsaved changes</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              <RotateCcw size={13} /> Discard
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
            >
              <Save size={13} /> Save Order
            </Button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: '16px 0', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="skeleton" style={{ width: 14, height: 14, borderRadius: '50%', display: 'inline-block' }} />
          Loading category items...
        </div>
      ) : isError ? (
        <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>
            Failed to load items: {error?.message || 'Unexpected server error.'}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
          >
            Retry
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>
          No items in this category yet.
        </div>
      ) : (
        <DndContext
          sensors={itemSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleItemDragEnd}
        >
          <SortableContext items={items.map((it) => it._id)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => (
              <SortableItemRow
                key={item._id}
                item={item}
                index={idx}
                totalCount={items.length}
                category={category}
                onMoveUp={() => handleItemMove(idx, -1)}
                onMoveDown={() => handleItemMove(idx, 1)}
                onToggleAvailability={toggleAvailability}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ─── Sortable Category Row ───────────────────────────────────────────────────

function SortableCategoryRow({
  category,
  index,
  totalCount,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}) {
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

  const isFirst = index === 0;
  const isLast = index === totalCount - 1;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`category-accordion-wrapper ${isExpanded ? 'is-expanded' : ''}`}
    >
      <div
        className="category-row dnd-item"
        onClick={() => onToggleExpand(category._id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand(category._id);
          }
        }}
      >
        {/* Reorder controls & Order number */}
        <div className="category-order-controls" onClick={(e) => e.stopPropagation()}>
          <button
            className="drag-handle btn btn-ghost btn-icon"
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${category.name}`}
            type="button"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </button>

          <div className="category-step-buttons">
            <button
              type="button"
              className="btn btn-ghost btn-icon category-step-btn"
              onClick={onMoveUp}
              disabled={isFirst}
              aria-label={`Move ${category.name} up`}
              title="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon category-step-btn"
              onClick={onMoveDown}
              disabled={isLast}
              aria-label={`Move ${category.name} down`}
              title="Move down"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <span className="category-order-badge" title={`Order position: ${index + 1}`}>
            #{index + 1}
          </span>
        </div>

        {/* Thumbnail */}
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

        {/* Category Information */}
        <div className="category-info">
          <div className="category-name-group">
            <span className="category-name">{category.name}</span>
            {category.nameAr && (
              <span className="category-name-ar" dir="rtl" lang="ar">
                {category.nameAr}
              </span>
            )}
          </div>
          <div className="category-meta-line">
            <span className="category-item-count">
              {category.itemCount || 0} {category.itemCount === 1 ? 'item' : 'items'}
            </span>
            {category.description && (
              <>
                <span className="category-meta-dot">·</span>
                <span className="category-desc">{category.description}</span>
              </>
            )}
          </div>
        </div>

        {/* Expand / Collapse Indicator */}
        <div className="category-expand-btn" title={isExpanded ? 'Collapse' : 'Expand items'}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>

        {/* Active Toggle */}
        <div className="category-toggle-wrap" onClick={(e) => e.stopPropagation()}>
          <Toggle
            id={`cat-active-${category._id}`}
            checked={category.isActive !== false}
            onChange={(val) => onToggle(category._id, val)}
            label={category.isActive !== false ? 'Active' : 'Inactive'}
          />
        </div>

        {/* Category Edit & Delete */}
        <div className="category-actions" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(category)}
            aria-label={`Edit ${category.name}`}
            id={`edit-category-${category._id}`}
            title="Edit Category Details"
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
            title="Delete Category"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Accordion Content */}
      {isExpanded && <CategoryItemsSection category={category} />}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [optimisticCategories, setOptimisticCategories] = useState(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState(
    location.state?.expandedCategoryId || null
  );

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categories = optimisticCategories ?? data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setOptimisticCategories(null);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }) => categoriesApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['categories'] });
      const prev = queryClient.getQueryData(['categories']);
      queryClient.setQueryData(['categories'], (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((c) => (c._id === id ? { ...c, isActive } : c)),
        };
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['categories'], ctx.prev);
      toast.error('Failed to update status.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
    },
  });

  const { mutate: deleteCategory, isPending: isDeleting } = useMutation({
    mutationFn: (id) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Category deleted.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.message || 'Delete failed.');
    },
  });

  function handleCategoryDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c._id === active.id);
    const newIndex = categories.findIndex((c) => c._id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    setOptimisticCategories(reordered);
    reorder(reordered.map((c) => c._id));
  }

  function handleCategoryMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = arrayMove(categories, index, targetIndex);
    setOptimisticCategories(reordered);
    reorder(reordered.map((c) => c._id));
  }

  function toggleExpandCategory(catId) {
    setExpandedCategoryId((prev) => (prev === catId ? null : catId));
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
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} · click to view/reorder items, drag or use arrows to reorder categories
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCategoryDragEnd}>
          <SortableContext items={categories.map((c) => c._id)} strategy={verticalListSortingStrategy}>
            {categories.map((cat, index) => (
              <SortableCategoryRow
                key={cat._id}
                category={cat}
                index={index}
                totalCount={categories.length}
                isExpanded={expandedCategoryId === cat._id}
                onToggleExpand={toggleExpandCategory}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggle={(id, isActive) => toggleActive({ id, isActive })}
                onMoveUp={() => handleCategoryMove(index, -1)}
                onMoveDown={() => handleCategoryMove(index, 1)}
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
