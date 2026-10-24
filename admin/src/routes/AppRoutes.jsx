import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const LoginPage = lazy(() => import('../pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('../pages/DashboardPage.jsx'));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage.jsx'));
const MenuListPage = lazy(() => import('../pages/MenuListPage.jsx'));
const MenuFormPage = lazy(() => import('../pages/MenuFormPage.jsx'));
const MenuImportPage = lazy(() => import('../pages/MenuImportPage.jsx'));
const BranchesPage = lazy(() => import('../pages/BranchesPage.jsx'));
const SettingsPage = lazy(() => import('../pages/SettingsPage.jsx'));
const SubmissionsPage = lazy(() => import('../pages/SubmissionsPage.jsx'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
      <span className="spinner spinner-dark" style={{ width: 24, height: 24 }} aria-label="Loading page..." />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/menu" element={<MenuListPage />} />
            <Route path="/menu/new" element={<MenuFormPage />} />
            <Route path="/menu/import" element={<MenuImportPage />} />
            <Route path="/menu/:id/edit" element={<MenuFormPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
