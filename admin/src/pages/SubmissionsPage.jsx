import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { MessageSquare, Trash2, Eye, Calendar, Users } from 'lucide-react';
import { submissionsApi } from '../api/endpoints.js';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Pagination from '../components/Pagination.jsx';
import { SkeletonRow } from '../components/Skeleton.jsx';

const STATUS_COLORS = {
  new: 'badge-amber',
  read: 'badge-gray',
  done: 'badge-green',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'done', label: 'Done' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'contact', label: 'Contact' },
  { value: 'catering', label: 'Catering' },
];

function SubmissionDetailModal({ submission, onClose, onStatusChange }) {
  const isOpen = !!submission;

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={submission ? `${submission.type === 'catering' ? '🍽 Catering' : '✉️ Contact'} – ${submission.name}` : ''}
      size="lg"
      footer={
        submission ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['new', 'read', 'done'].map((s) => (
              <Button
                key={s}
                variant={submission.status === s ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onStatusChange(submission._id, s)}
                id={`status-${s}-btn`}
              >
                Mark {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        ) : null
      }
    >
      {submission && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-row">
            <div>
              <p className="label">Name</p>
              <p style={{ fontSize: 14 }}>{submission.name}</p>
            </div>
            <div>
              <p className="label">Email</p>
              <p style={{ fontSize: 14 }}><a href={`mailto:${submission.email}`} style={{ color: 'var(--accent)' }}>{submission.email}</a></p>
            </div>
          </div>

          {submission.phone && (
            <div>
              <p className="label">Phone</p>
              <p style={{ fontSize: 14 }}>{submission.phone}</p>
            </div>
          )}

          {submission.type === 'catering' && (
            <div className="form-row">
              {submission.eventDate && (
                <div>
                  <p className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> Event Date</p>
                  <p style={{ fontSize: 14 }}>{formatDate(submission.eventDate)}</p>
                </div>
              )}
              {submission.guestCount != null && (
                <div>
                  <p className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> Guests</p>
                  <p style={{ fontSize: 14 }}>{submission.guestCount}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <p className="label">Message</p>
            <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--bg)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>{submission.message}</p>
          </div>

          <div className="form-row" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <div>
              <p className="label">Status</p>
              <span className={`badge ${STATUS_COLORS[submission.status]}`}>{submission.status}</span>
            </div>
            <div>
              <p className="label">Received</p>
              <p>{formatDate(submission.createdAt)}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function SubmissionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const queryParams = { page, limit: 20, type: typeFilter, status: statusFilter };

  const { data, isLoading } = useQuery({
    queryKey: ['submissions', queryParams],
    queryFn: () => submissionsApi.list(queryParams),
    keepPreviousData: true,
  });

  const submissions = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, status }) => submissionsApi.updateStatus(id, status),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      // Update local view target if open
      if (viewTarget && res?.data) {
        setViewTarget(res.data);
      }
    },
    onError: (err) => toast.error(err.message || 'Failed to update status.'),
  });

  const { mutate: deleteSubmission, isPending: isDeleting } = useMutation({
    mutationFn: (id) => submissionsApi.delete(id),
    onSuccess: () => {
      toast.success('Submission deleted.');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err) => {
      setDeleteError(err.message || 'Delete failed.');
    },
  });

  function openView(submission) {
    setViewTarget(submission);
    // Auto-mark as read when opening a new submission
    if (submission.status === 'new') {
      updateStatus({ id: submission._id, status: 'read' });
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Submissions</h1>
          <p className="page-subtitle">{total} submission{total !== 1 ? 's' : ''} total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ padding: '14px 16px' }}>
          <div className="filters-bar">
            <select
              className="select"
              style={{ width: 'auto', minWidth: 160 }}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
              aria-label="Filter by type"
              id="submissions-type-filter"
            >
              {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              className="select"
              style={{ width: 'auto', minWidth: 160 }}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              aria-label="Filter by status"
              id="submissions-status-filter"
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table aria-label="Submissions">
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Email</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                : submissions.length === 0
                ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon"><MessageSquare size={36} /></div>
                        <p className="empty-state-title">No submissions found</p>
                        <p className="empty-state-desc">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )
                : submissions.map((s) => (
                  <tr key={s._id}>
                    <td data-label="Type">
                      <span className={`badge ${s.type === 'catering' ? 'badge-amber' : 'badge-gray'}`}>
                        {s.type}
                      </span>
                    </td>
                    <td data-label="Name" style={{ fontWeight: s.status === 'new' ? 700 : 400 }}>
                      {s.name}
                    </td>
                    <td data-label="Email">{s.email}</td>
                    <td data-label="Date">{formatDate(s.createdAt)}</td>
                    <td data-label="Status">
                      <span className={`badge ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                    </td>
                    <td data-label="Actions" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openView(s)}
                          aria-label={`View submission from ${s.name}`}
                          id={`view-submission-${s._id}`}
                        >
                          <Eye size={13} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDeleteTarget(s); setDeleteError(''); }}
                          aria-label={`Delete submission from ${s.name}`}
                          id={`delete-submission-${s._id}`}
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

      <SubmissionDetailModal
        submission={viewTarget}
        onClose={() => setViewTarget(null)}
        onStatusChange={(id, status) => updateStatus({ id, status })}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(''); }}
        onConfirm={() => deleteSubmission(deleteTarget._id)}
        title="Delete Submission"
        message={`Are you sure you want to delete the submission from "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Submission"
        isLoading={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
