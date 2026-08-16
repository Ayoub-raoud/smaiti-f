// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useEffect } from 'react';
import { Toaster } from 'sonner';
import SiteLayout from './components/site/SiteLayout';
import AdminLayout from './components/admin/AdminLayout';
import Home from './pages/Home';
import Cars from './pages/Cars';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCars from './pages/admin/AdminCars';
import AdminMatricules from './pages/admin/AdminMatricules';
import AdminMatriculesClients from './pages/admin/AdminMatriculesClients';
import AdminClients from './pages/admin/AdminClients';
import AdminReservations from './pages/admin/AdminReservations';
import AdminReservationsStatus from './pages/admin/AdminReservationsStatus';
import AdminAccidents from './pages/admin/AdminAccidents';
import AdminPayments from './pages/admin/AdminPayments';
import AdminGarages from './pages/admin/AdminGarages';
import AdminContacts from './pages/admin/AdminContacts';
import AdminProfile from './pages/admin/AdminProfile';
import AdminSousLocations from './pages/admin/AdminSousLocations';
import SignContract from './pages/SignContract';

import { selectIsAuthenticated, selectUser } from './Redux/store';

// Default pages per role – same as in AdminLayout
const DEFAULT_PAGES = {
  admin: ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users', 'garages', 'sous-locations'],
  employee: ['cars', 'matricules', 'reservations', 'contacts'],
};

// Title Updater
const TitleUpdater = () => {
  const location = useLocation();

  useEffect(() => {
    const titles = {
      '/': 'Home',
      '/our-cars': 'Our Cars',
      '/about': 'About',
      '/contact': 'Contact',
      '/admin': 'Admin Login',
      '/dashboard': 'Admin Dashboard',
      '/users': 'Users Management',
      '/cars': 'Cars Management',
      '/matricules': 'Matricules Management',
      '/matricules-clients': 'Clients par matricule',
      '/clients': 'Clients Management',
      '/reservations': 'Réservations',
      '/reservations-status': 'Réservations – Statut',
      '/accidents': 'Accidents Management',
      '/payments': 'Payments Management',
      '/garages': 'Garages Management',
      '/contacts': 'Contacts Management',
      '/profile': 'Mon Profil',
      '/sous-locations': 'Sous‑locations',
    };

    const path = location.pathname;
    let pageTitle = titles[path];

    if (!pageTitle) {
      if (path.startsWith('/admin')) {
        pageTitle = 'Admin';
      } else {
        pageTitle = 'SMAITI CAR';
      }
    }

    document.title = `SMAITI CAR - ${pageTitle}`;
  }, [location]);

  return null;
};

// Protected Route – checks authentication + role + page permissions
const ProtectedRoute = ({ children, pageSlug }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);
  const permissionsLoading = useSelector((state) => state.permissions?.loading);

  // 1. Check authentication
  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  // 2. Check role (must be admin, employee, or superadmin)
  if (!user || !['admin', 'employee', 'superadmin'].includes(user.role)) {
    return <Navigate to="/admin" replace />;
  }

  // 3. Superadmin can access everything
  if (user.role === 'superadmin') {
    return children;
  }

  // 4. If no pageSlug is provided (e.g., Dashboard, Profile), allow access
  if (!pageSlug) {
    return children;
  }

  // 5. Wait for permissions to load (if not loaded yet, show a spinner)
  if (permissionsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <p style={{ marginLeft: '1rem' }}>Chargement des permissions...</p>
      </div>
    );
  }

  // 6. Check if page is in default pages for the user's role
  const defaultPages = DEFAULT_PAGES[user.role] || [];
  if (defaultPages.includes(pageSlug)) {
    return children;
  }

  // 7. Check if user has a valid explicit permission
  const hasPermission = Array.isArray(myPermissions) && myPermissions.some(
    (p) => typeof p === 'object' ? p.page_slug === pageSlug : p === pageSlug
  );

  if (hasPermission) {
    return children;
  }

  // 8. No permission – redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};

// Main App
function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <BrowserRouter>
      <TitleUpdater />

      <Routes>
        {/* Public routes */}
        <Route path="/" element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="our-cars" element={<Cars />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
        </Route>

        {/* Admin login */}
        <Route path="/admin" element={<AdminLogin />} />

        {/* Admin protected routes – nested under AdminLayout */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard – no pageSlug needed */}
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Each admin page gets a pageSlug */}
          <Route
            path="users"
            element={
              <ProtectedRoute pageSlug="users">
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="cars"
            element={
              <ProtectedRoute pageSlug="cars">
                <AdminCars />
              </ProtectedRoute>
            }
          />
          <Route
            path="matricules"
            element={
              <ProtectedRoute pageSlug="matricules">
                <AdminMatricules />
              </ProtectedRoute>
            }
          />
          <Route
            path="matricules-clients"
            element={
              <ProtectedRoute pageSlug="matricules">
                <AdminMatriculesClients />
              </ProtectedRoute>
            }
          />
          <Route
            path="clients"
            element={
              <ProtectedRoute pageSlug="clients">
                <AdminClients />
              </ProtectedRoute>
            }
          />
          <Route
            path="reservations"
            element={
              <ProtectedRoute pageSlug="reservations">
                <AdminReservations />
              </ProtectedRoute>
            }
          />
          <Route
            path="reservations-status"
            element={
              <ProtectedRoute pageSlug="reservations">
                <AdminReservationsStatus />
              </ProtectedRoute>
            }
          />
          <Route
            path="accidents"
            element={
              <ProtectedRoute pageSlug="accidents">
                <AdminAccidents />
              </ProtectedRoute>
            }
          />
          <Route
            path="payments"
            element={
              <ProtectedRoute pageSlug="payments">
                <AdminPayments />
              </ProtectedRoute>
            }
          />
          <Route
            path="garages"
            element={
              <ProtectedRoute pageSlug="garages">
                <AdminGarages />
              </ProtectedRoute>
            }
          />
          <Route
            path="contacts"
            element={
              <ProtectedRoute pageSlug="contacts">
                <AdminContacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <AdminProfile />
              </ProtectedRoute>
            }
          />
          {/* NEW: Sous-locations page */}
          <Route
            path="sous-locations"
            element={
              <ProtectedRoute pageSlug="sous-locations">
                <AdminSousLocations />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Signature route */}
        <Route path="/sign-contract/:token" element={<SignContract />} />
        <Route
          path="/merci"
          element={
            <div style={{ textAlign: 'center', padding: '3rem', background: 'white', minHeight: '80vh' }}>
              <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅ Merci</h1>
              <p style={{ color: '#64748b' }}>Votre signature a été enregistrée avec succès.</p>
            </div>
          }
        />

        {/* Redirection after login */}
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;