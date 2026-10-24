import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Tag,
  UtensilsCrossed,
  GitBranchPlus,
  Settings,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChefHat,
  FileUp,
} from 'lucide-react';
import { authApi, statsApi } from '../api/endpoints.js';
import { useAuth } from '../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu Items' },
  { to: '/menu/import', icon: FileUp, label: 'Import Menu' },
  { to: '/branches', icon: GitBranchPlus, label: 'Branches' },
  { to: '/submissions', icon: MessageSquare, label: 'Submissions', badge: true },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: () => statsApi.getStats(),
    refetchInterval: 60_000,
  });
  const newSubmissions = statsData?.data?.newSubmissions ?? 0;

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      toast.error('Logout failed. Try again.');
    },
  });

  const initials = admin?.name
    ? admin.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  function closeSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar${sidebarOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 30, height: 30, background: 'var(--accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChefHat size={16} color="#fff" />
            </div>
            <div>
              <div className="sidebar-logo-text">Meat <span>Corner</span></div>
              <div className="sidebar-logo-sub">Admin Panel</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav" role="navigation">
          <div className="sidebar-section-label">Main</div>
          {NAV_ITEMS.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/menu'}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}`
              }
              onClick={closeSidebar}
            >
              <Icon size={16} className="sidebar-nav-icon" aria-hidden="true" />
              {label}
              {badge && newSubmissions > 0 && (
                <span
                  className="sidebar-badge"
                  aria-label={`${newSubmissions} new`}
                >
                  {newSubmissions > 99 ? '99+' : newSubmissions}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{admin?.name || 'Admin'}</div>
              <div className="sidebar-user-role">{admin?.email}</div>
            </div>
          </div>
          <button
            className="sidebar-nav-item"
            onClick={() => logout()}
            disabled={isLoggingOut}
            style={{ width: '100%', color: 'rgba(255,255,255,0.5)' }}
          >
            <LogOut size={15} aria-hidden="true" />
            {isLoggingOut ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="topbar-title">Meat Corner Admin</span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
