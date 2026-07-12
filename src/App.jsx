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
import AdminClients from './pages/admin/AdminClients';
import AdminReservations from './pages/admin/AdminReservations';
import AdminReservationsStatus from './pages/admin/AdminReservationsStatus';
import AdminAccidents from './pages/admin/AdminAccidents';
import AdminPayments from './pages/admin/AdminPayments';
import AdminGarages from './pages/admin/AdminGarages';
import AdminContacts from './pages/admin/AdminContacts';
import AdminProfile from './pages/admin/AdminProfile'; // ✅ NEW
import SignContract from './pages/SignContract';

import { selectIsAuthenticated, selectUser } from './Redux/store';

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
      '/clients': 'Clients Management',
      '/reservations': 'Réservations',
      '/reservations-status': 'Réservations – Statut',
      '/accidents': 'Accidents Management',
      '/payments': 'Payments Management',
      '/garages': 'Garages Management',
      '/contacts': 'Contacts Management',
      '/profile': 'Mon Profil', // ✅ NEW
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

// Protected Route – allows superadmin, admin, employee
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  if (!isAuthenticated) return <Navigate to="/admin" replace />;
  if (!user || (user.role !== 'admin' && user.role !== 'employee' && user.role !== 'superadmin'))
    return <Navigate to="/admin" replace />;
  return children;
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

        {/* Admin protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="cars" element={<AdminCars />} />
          <Route path="matricules" element={<AdminMatricules />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="reservations-status" element={<AdminReservationsStatus />} />
          <Route path="accidents" element={<AdminAccidents />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="garages" element={<AdminGarages />} />
          <Route path="contacts" element={<AdminContacts />} />
          <Route path="profile" element={<AdminProfile />} /> {/* ✅ NEW */}
        </Route>

        {/* Signature route */}
        <Route path="/sign-contract/:token" element={<SignContract />} />
        <Route path="/merci" element={
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', minHeight: '80vh' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>✅ Merci</h1>
            <p style={{ color: '#64748b' }}>Votre signature a été enregistrée avec succès.</p>
          </div>
        } />

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