// src/components/ProtectedRoute.jsx
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectUser, selectIsAuthenticated } from '../Redux/store';

// Default pages per role (same as in AdminLayout)
const DEFAULT_PAGES = {
  admin: ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users', 'garages'],
  employee: ['cars', 'matricules', 'reservations', 'contacts'],
};

export default function ProtectedRoute({ children, pageSlug }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // Superadmin has access to everything
  if (user?.role === 'superadmin') {
    return children;
  }

  // If no pageSlug is provided (e.g., Dashboard, Profile), allow access
  if (!pageSlug) {
    return children;
  }

  // Check if page is in default pages for the user's role
  const defaultPages = DEFAULT_PAGES[user?.role] || [];
  if (defaultPages.includes(pageSlug)) {
    return children;
  }

  // Check if user has a valid explicit permission for this page
  const hasPermission = Array.isArray(myPermissions) && myPermissions.some(
    (p) => typeof p === 'object' ? p.page_slug === pageSlug : p === pageSlug
  );

  if (hasPermission) {
    return children;
  }

  // No permission: redirect to dashboard
  return <Navigate to="/dashboard" replace />;
}