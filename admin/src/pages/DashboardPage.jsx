import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Tag, UtensilsCrossed, CheckCircle, XCircle, MessageSquare, Plus, GitBranchPlus, Settings, FileUp } from 'lucide-react';
import { statsApi } from '../api/endpoints.js';
import { SkeletonCard } from '../components/Skeleton.jsx';

function StatCard({ icon: Icon, label, value, colorClass, isLoading }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${colorClass}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        {isLoading ? (
          <div className="skeleton skeleton-title" style={{ width: '60px', height: '28px', marginBottom: '6px' }} />
        ) : (
          <div className="stat-value">{value ?? '—'}</div>
        )}
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
  });

  const stats = data?.data;

  const STATS = [
    { icon: Tag, label: 'Categories', value: stats?.categories, colorClass: 'accent' },
    { icon: UtensilsCrossed, label: 'Menu Items', value: stats?.menuItems, colorClass: 'blue' },
    { icon: CheckCircle, label: 'Available', value: stats?.availableItems, colorClass: 'green' },
    { icon: XCircle, label: 'Unavailable', value: stats?.unavailableItems, colorClass: 'red' },
    { icon: MessageSquare, label: 'New Submissions', value: stats?.newSubmissions, colorClass: 'amber' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of Meat Corner restaurant data</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{ marginBottom: '32px' }}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="stat-card">
                <SkeletonCard height={44} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-title" style={{ width: '60px', height: '28px', marginBottom: '6px' }} />
                  <div className="skeleton skeleton-text" style={{ width: '100px' }} />
                </div>
              </div>
            ))
          : STATS.map((s) => (
              <StatCard key={s.label} {...s} isLoading={false} />
            ))}
      </div>

      {/* Quick links */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="quick-links">
            <Link to="/menu/new" className="quick-link" id="quick-add-menu-item">
              <div className="quick-link-icon" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                <Plus size={18} />
              </div>
              Add Menu Item
            </Link>
            <Link to="/categories" className="quick-link" id="quick-manage-categories">
              <div className="quick-link-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
                <Tag size={18} />
              </div>
              Manage Categories
            </Link>
            <Link to="/menu" className="quick-link" id="quick-view-menu">
              <div className="quick-link-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#059669' }}>
                <UtensilsCrossed size={18} />
              </div>
              View Menu
            </Link>
            <Link to="/branches" className="quick-link" id="quick-branches">
              <div className="quick-link-icon" style={{ background: 'rgba(139,92,246,0.1)', color: '#7c3aed' }}>
                <GitBranchPlus size={18} />
              </div>
              Branches
            </Link>
            <Link to="/submissions" className="quick-link" id="quick-submissions">
              <div className="quick-link-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
                <MessageSquare size={18} />
              </div>
              Submissions
            </Link>
            <Link to="/menu/import" className="quick-link" id="quick-import">
              <div className="quick-link-icon" style={{ background: 'rgba(20,184,166,0.1)', color: '#0d9488' }}>
                <FileUp size={18} />
              </div>
              Import Menu
            </Link>
            <Link to="/settings" className="quick-link" id="quick-settings">
              <div className="quick-link-icon" style={{ background: 'rgba(107,114,128,0.1)', color: '#4b5563' }}>
                <Settings size={18} />
              </div>
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
