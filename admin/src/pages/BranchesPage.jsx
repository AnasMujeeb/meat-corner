import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, GripVertical, GitBranchPlus, MapPin, Phone, Clock } from 'lucide-react';
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
import { branchesApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Toggle from '../components/Toggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { SkeletonCategoryRow } from '../components/Skeleton.jsx';
import BranchModal from '../features/branches/BranchModal.jsx';

function SortableBranchRow({ branch, onEdit, onDelete, onToggle }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: branch._id });

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
        aria-label="Reorder branch"
        type="button"
      >
        <GripVertical size={18} />
      </button>

      <div className="branch-icon-wrap">
        <GitBranchPlus size={22} />
      </div>

      <div className="category-info">
        <div className="category-name">{branch.name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
          {branch.address && (
            <span className="branch-meta">
              <MapPin size={11} />
              {branch.address}
            </span>
          )}
          {branch.phone && (
            <span className="branch-meta">
              <Phone size={11} />
              {branch.phone}
            </span>
          )}
          {branch.openingHours && (
            <span className="branch-meta">
              <Clock size={11} />
              {branch.openingHours}
            </span>
          )}
        </div>
      </div>

      <Toggle
        id={`branch-active-${branch._id}`}
        checked={branch.isActive}
        onChange={(val) => onToggle(branch._id, val)}
        label={branch.isActive ? 'Active' : 'Inactive'}
      />

      <div className="category-actions">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(branch)}
          aria-label={`Edit ${branch.name}`}
          id={`edit-branch-${branch._id}`}
        >
          <Pencil size={14} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(branch)}
          aria-label={`Delete ${branch.name}`}
          id={`delete-branch-${branch._id}`}
          style={{ color: '#dc2626' }}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export default function BranchesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [optimisticBranches, setOptimisticBranches] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
  });

  const branches = optimisticBranches ?? data?.data ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { mutate: reorder } = useMutation({
    mutationFn: (ids) => branchesApi.reorder(ids),
    onError: () => {
      setOptimisticBranches(null);
      toast.error('Reorder failed. Please try again.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setOptimisticBranches(null);
    },
  });

  const { mutate: toggleActive } = useMutation({
    mutationFn: ({ id, isActive }) => branchesApi.update(id, { isActive }),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['branches'] });
      const prev = queryClient.getQueryData(['branches']);
      queryClient.setQueryData(['branches'], (old) => ({
        ...old,
        data: old.data.map((b) => (b._id === id ? { ...b, isActive } : b)),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      queryClient.setQueryData(['branches'], ctx.prev);
      toast.error('Failed to update status.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const { mutate: deleteBranch, isPending: isDeleting } = useMutation({
    mutationFn: (id) => branchesApi.delete(id),
    onSuccess: () => {
      toast.success('Branch deleted.');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
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

    const oldIndex = branches.findIndex((b) => b._id === active.id);
    const newIndex = branches.findIndex((b) => b._id === over.id);
    const reordered = arrayMove(branches, oldIndex, newIndex);

    setOptimisticBranches(reordered);
    reorder(reordered.map((b) => b._id));
  }

  function openCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function openEdit(branch) {
    setEditTarget(branch);
    setModalOpen(true);
  }

  function openDelete(branch) {
    setDeleteTarget(branch);
    setDeleteError('');
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Branches</h1>
          <p className="page-subtitle">
            {branches.length} {branches.length === 1 ? 'branch' : 'branches'} · drag to reorder
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={openCreate} id="add-branch-btn">
            <Plus size={15} />
            Add Branch
          </Button>
        </div>
      </div>

      {isLoading ? (
        Array.from({ length: 2 }).map((_, i) => <SkeletonCategoryRow key={i} />)
      ) : branches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><GitBranchPlus size={40} /></div>
            <h2 className="empty-state-title">No branches yet</h2>
            <p className="empty-state-desc">Add your first branch location.</p>
            <Button variant="primary" onClick={openCreate}>
              <Plus size={14} /> Add Branch
            </Button>
          </div>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={branches.map((b) => b._id)} strategy={verticalListSortingStrategy}>
            {branches.map((branch) => (
              <SortableBranchRow
                key={branch._id}
                branch={branch}
                onEdit={openEdit}
                onDelete={openDelete}
                onToggle={(id, isActive) => toggleActive({ id, isActive })}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      <BranchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        branch={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        onConfirm={() => deleteBranch(deleteTarget._id)}
        title="Delete Branch"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Branch"
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
