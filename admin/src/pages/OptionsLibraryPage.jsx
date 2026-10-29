import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Search, Check, X, RefreshCw, Layers } from 'lucide-react';

import { optionsLibraryApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import SingleImageUploader from '../components/SingleImageUploader.jsx';
import Toggle from '../components/Toggle.jsx';
import { SkeletonCard } from '../components/Skeleton.jsx';

export default function OptionsLibraryPage() {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'sauce',
    image: { url: '', thumbUrl: '' },
    price: 0,
    isAvailable: true,
  });

  const { data: itemsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['options-library'],
    queryFn: () => optionsLibraryApi.list(),
  });

  const items = itemsData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data) => optionsLibraryApi.create(data),
    onSuccess: () => {
      toast.success('Library item added successfully.');
      queryClient.invalidateQueries({ queryKey: ['options-library'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => optionsLibraryApi.update(id, data),
    onSuccess: () => {
      toast.success('Library item updated and synced to menu items.');
      queryClient.invalidateQueries({ queryKey: ['options-library'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      closeModal();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => optionsLibraryApi.delete(id),
    onSuccess: () => {
      toast.success('Library item deleted.');
      queryClient.invalidateQueries({ queryKey: ['options-library'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete item');
    },
  });

  function openCreateModal() {
    setEditingItem(null);
    setFormData({
      name: '',
      category: activeCategory !== 'all' ? activeCategory : 'sauce',
      image: { url: '', thumbUrl: '' },
      price: 0,
      isAvailable: true,
    });
    setModalOpen(true);
  }

  function openEditModal(item) {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'sauce',
      image: item.image || { url: '', thumbUrl: '' },
      price: item.price || 0,
      isAvailable: item.isAvailable !== undefined ? item.isAvailable : true,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Item name is required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      image: formData.image,
      price: Number(formData.price) || 0,
      isAvailable: formData.isAvailable,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem._id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(item) {
    if (window.confirm(`Are you sure you want to delete "${item.name}" from library?`)) {
      deleteMutation.mutate(item._id);
    }
  }

  // Filter items
  const filtered = items.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Options Library</h1>
          <p className="page-subtitle">
            Manage Sauces and Side Dishes library with photos for menu item option popups.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="sm" onClick={() => refetch()} title="Refresh list">
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={openCreateModal} id="add-library-item-btn">
            <Plus size={15} /> Add Library Item
          </Button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card" style={{ marginBottom: 20, padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'sauce', label: 'Sauces' },
              { id: 'side', label: 'Side Dishes' },
              { id: 'other', label: 'Other' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`btn btn-sm ${activeCategory === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: 6, fontSize: 13 }}
                onClick={() => setActiveCategory(tab.id)}
              >
                {tab.label}
                <span
                  style={{
                    marginLeft: 6,
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontSize: 11,
                    background: activeCategory === tab.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-muted, #f1f5f9)',
                  }}
                >
                  {tab.id === 'all'
                    ? items.length
                    : items.filter((i) => i.category === tab.id).length}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 13, height: 36 }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Items */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      ) : isError ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: '#b91c1c' }}>
          Failed to load library items. Please try refreshing.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <Layers size={36} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.6 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No library items found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            {searchQuery
              ? 'Try adjusting your search query.'
              : 'Add your first sauce or side dish item to the library.'}
          </p>
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            <Plus size={14} /> Add First Item
          </Button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 16,
          }}
        >
          {filtered.map((item) => (
            <div
              key={item._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Photo */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  background: 'var(--bg-muted, #f8fafc)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                {item.image?.thumbUrl || item.image?.url ? (
                  <img
                    src={item.image.thumbUrl || item.image.url}
                    alt={item.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>NO IMAGE</span>
                )}
                {/* Category badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.05em',
                  }}
                >
                  {item.category}
                </span>
                {!item.isAvailable && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#fee2e2',
                      color: '#991b1b',
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 6px',
                      borderRadius: 4,
                    }}
                  >
                    Unavailable
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
                    {item.name}
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {item.price > 0 ? `+QAR ${item.price}` : 'Free / Included'}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(item)}
                    style={{ padding: '4px 8px', fontSize: 12 }}
                    aria-label={`Edit ${item.name}`}
                  >
                    <Edit2 size={13} /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(item)}
                    style={{ padding: '4px 8px', color: '#dc2626' }}
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 480,
              background: 'var(--card-bg, #fff)',
              borderRadius: 8,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {editingItem ? 'Edit Library Item' : 'Add Library Item'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label className="label" htmlFor="lib-item-name">Item Name *</label>
                <input
                  id="lib-item-name"
                  type="text"
                  className="input"
                  placeholder="e.g. Spicy Tahina Sauce"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Category & Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="label" htmlFor="lib-item-category">Category *</label>
                  <select
                    id="lib-item-category"
                    className="select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="sauce">Sauce</option>
                    <option value="side">Side Dish</option>
                    <option value="other">Other Add-on</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="lib-item-price">Default Extra QAR</label>
                  <input
                    id="lib-item-price"
                    type="number"
                    min="0"
                    step="0.5"
                    className="input"
                    placeholder="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div style={{ marginBottom: 16 }}>
                <SingleImageUploader
                  value={formData.image?.url || ''}
                  onChange={(url) => {
                    setFormData({
                      ...formData,
                      image: { url, thumbUrl: url },
                    });
                  }}
                  label="Item Photo (JPG, PNG, WebP)"
                />
              </div>

              {/* Availability */}
              <div style={{ marginBottom: 20 }}>
                <Toggle
                  id="lib-item-available"
                  checked={formData.isAvailable}
                  onChange={(val) => setFormData({ ...formData, isAvailable: val })}
                  label={formData.isAvailable ? 'Available for selection' : 'Currently unavailable'}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="secondary" type="button" onClick={closeModal} disabled={isSaving}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={isSaving} disabled={isSaving}>
                  {isSaving ? 'Saving…' : editingItem ? 'Save & Sync' : 'Add to Library'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
