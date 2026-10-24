import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, Image as ImageIcon } from 'lucide-react';
import { menuApi, categoriesApi } from '../api/endpoints.js';
import { useDebounce } from '../hooks/useDebounce.js';
import Button from '../components/Button.jsx';
import Toggle from '../components/Toggle.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';

export default function MenuListPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availFilter, setAvailFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['menu', { page, q: debouncedSearch, category: categoryFilter, available: availFilter }],
    queryFn: () =>
      menuApi.list({ page, limit: 15, q: debouncedSearch || undefined, category: categoryFilter || undefined, available: availFilter }),
    keepPreviousData: true,
  });

  const { data: catsData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const categories = catsData?.data ?? [];
  const items = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const { mutate: toggleAvailability } = useMutation({
    mutationFn: (id) => menuApi.toggleAvailability(id),
    onMutate: async (id) => {
      const key = ['menu', { page, q: debouncedSearch, category: categoryFilter, available: availFilter }];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) => ({
        ...old,
        data: old.data.map((item) =>
          item._id === id ? { ...item, isAvailable: !item.isAvailable } : item
        ),
      }));
      return { prev, key };
    },
    onError: (_err, _id, ctx) => {
      queryClient.setQueryData(ctx.key, ctx.prev);
      toast.error('Failed to update availability.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const { mutate: deleteItem, isPending: isDeleting } = useMutation({
    mutationFn: (id) => menuApi.delete(id),
    onSuccess: () => {
      toast.success('Menu item deleted.');
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.message || 'Delete failed.');
    },
  });

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Menu Items</h1>
          <p className="page-subtitle">{total} item{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="page-actions">
          <Link to="/menu/new">
            <Button variant="primary" id="add-menu-item-btn">
              <Plus size={15} />
              Add Item
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ padding: '14px 16px' }}>
          <div className="filters-bar">
            <div className="search-wrap">
              <Search size={15} className="search-icon" aria-hidden="true" />
              <input
                type="search"
                className="search-input"
                placeholder="Search menu items…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search menu items"
                id="menu-search"
              />
            </div>

            <select
              className="select"
              style={{ width: 'auto', minWidth: '160px' }}
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
              aria-label="Filter by category"
              id="menu-category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.slug}>{c.name}</option>
              ))}
            </select>

            <select
              className="select"
              style={{ width: 'auto', minWidth: '140px' }}
              value={availFilter}
              onChange={(e) => { setAvailFilter(e.target.value); setPage(1); }}
              aria-label="Filter by availability"
              id="menu-avail-filter"
            >
              <option value="all">All Items</option>
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table aria-label="Menu items">
            <thead>
              <tr>
                <th style={{ width: 64 }}>Image</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Available</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : items.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><ImageIcon size={36} /></div>
                        <p className="empty-state-title">No items found</p>
                        <p className="empty-state-desc">Try adjusting your filters or add a new menu item.</p>
                      </div>
                    </td>
                  </tr>
                )
                : items.map((item) => (
                  <tr key={item._id}>
                    <td data-label="Image">
                      {item.images?.[0] ? (
                        <img
                          src={item.images[0].thumbUrl || item.images[0].url}
                          alt={item.name}
                          className="td-img"
                        />
                      ) : (
                        <div className="td-img-placeholder"><ImageIcon size={16} /></div>
                      )}
                    </td>
                    <td data-label="Name">
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      {item.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                          {item.tags.slice(0, 3).map((t) => (
                            <span key={t} className="badge badge-gray">{t}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td data-label="Category">{item.category?.name ?? '—'}</td>
                    <td data-label="Price">
                      <strong>QAR {item.price?.toFixed(2)}</strong>
                    </td>
                    <td data-label="Available">
                      <Toggle
                        id={`toggle-${item._id}`}
                        checked={item.isAvailable}
                        onChange={() => toggleAvailability(item._id)}
                      />
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <Link to={`/menu/${item._id}/edit`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Edit ${item.name}`}
                            id={`edit-item-${item._id}`}
                          >
                            <Pencil size={13} />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeleteTarget(item); setDeleteError(''); }}
                          aria-label={`Delete ${item.name}`}
                          id={`delete-item-${item._id}`}
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        onConfirm={() => deleteItem(deleteTarget._id)}
        title="Delete Menu Item"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Item"
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
