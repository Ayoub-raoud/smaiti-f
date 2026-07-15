// src/components/admin/AdminLayout.jsx
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutUtilisateur, selectUser, selectIsAuthenticated, selectReservations } from "../../Redux/store";
import { fetchMyPermissions } from "../../Redux/permissionSlice";
import {
  LayoutDashboard,
  Car,
  Users,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  LogOut,
  UserCog,
  Gauge,
  Menu,
  X,
  Building2,
  Mail,
  UserCircle,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarInset,
} from "../../components/ui/sidebar";
import { NavLink } from "../../components/ui/navlink";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NotificationBell } from "../../pages/admin/NotificationBell";
// Default pages per role (no permission check required)
const DEFAULT_PAGES = {
  admin: ['cars', 'matricules', 'clients', 'reservations', 'accidents', 'contacts', 'users'],
  employee: ['cars', 'matricules', 'reservations', 'contacts'],
};

export default function AdminLayout() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const myPermissions = useSelector((state) => state.permissions?.myPermissions || []);
  const reservations = useSelector(selectReservations);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const notifications = useSelector((state) => state.notifications?.notifications || {
    matricules: { total: 0, critical: 0 },
    reservations: { total: 0, critical: 0 },
    accidents: { total: 0, critical: 0 },
    payments: { total: 0, critical: 0 },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const contactedCount = reservations.filter(r => r.status === 'contacted').length;
  const lateCount = reservations.filter(r => r.status === 'retard').length;
  const endingSoonCount = reservations.filter(r => {
    if (r.status !== 'confirmed') return false;
    const end = new Date(r.end_date);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  }).length;

  const getBadge = (pageSlug) => {
    if (!pageSlug) return null;
    const category = notifications[pageSlug];
    if (!category || category.total === 0) return null;
    return {
      count: category.total,
      isCritical: category.critical > 0,
    };
  };

  // ✅ FIX: Fetch permissions for both employees AND admins (but not superadmins)
  useEffect(() => {
    if (isAuthenticated && user?.role !== 'superadmin') {
      dispatch(fetchMyPermissions());
      const interval = setInterval(() => {
        dispatch(fetchMyPermissions());
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [dispatch, isAuthenticated, user]);

  const handleLogout = async () => {
    await dispatch(logoutUtilisateur());
    toast.success("Déconnecté");
    setIsMobileMenuOpen(false);
    navigate("/admin");
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  if (!isAuthenticated) {
    return null;
  }

  const allNavItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", pageSlug: null },
    { path: "/cars", icon: Car, label: "Voitures", pageSlug: "cars" },
    { path: "/matricules", icon: Gauge, label: "Matricules", pageSlug: "matricules" },
    { path: "/clients", icon: Users, label: "Clients", pageSlug: "clients" },
    { path: "/reservations", icon: CalendarCheck, label: "Réservations", pageSlug: "reservations" },
    { path: "/reservations-status", icon: CalendarCheck, label: "Réservations (Statut)", pageSlug: "reservations" },
    { path: "/accidents", icon: AlertTriangle, label: "Accidents", pageSlug: "accidents" },
    { path: "/payments", icon: CreditCard, label: "Traites", pageSlug: "payments" },
    { path: "/garages", icon: Building2, label: "Garages", pageSlug: "garages" },
    { path: "/contacts", icon: Mail, label: "Contacts", pageSlug: "contacts" },
    { path: "/profile", icon: UserCircle, label: "Mon Profil", pageSlug: null },
  ];

  // Add Users page for admin and superadmin only (but admin has it by default)
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    allNavItems.push({ path: "/users", icon: UserCog, label: "Utilisateurs", pageSlug: "users" });
  }

  // ---- FILTERING LOGIC ----
  const userRole = user?.role;
  const isSuperAdmin = userRole === 'superadmin';

  const navItems = allNavItems.filter(item => {
    const pageSlug = item.pageSlug;

    // Dashboard and Profile have no pageSlug – always shown (if in the list)
    if (!pageSlug) {
      return ['/dashboard', '/profile'].includes(item.path);
    }

    // Superadmin sees everything
    if (isSuperAdmin) return true;

    // Check if this page is in the user's default set
    if (DEFAULT_PAGES[userRole]?.includes(pageSlug)) {
      return true;
    }

    // Otherwise, check for explicit permission
    let hasPerm = false;
    if (Array.isArray(myPermissions)) {
      if (myPermissions.length > 0 && typeof myPermissions[0] === 'object') {
        hasPerm = myPermissions.some(p => p.page_slug === pageSlug);
      } else {
        hasPerm = myPermissions.includes(pageSlug);
      }
    }
    return hasPerm;
  });

  const getUserName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.Fullname) return user.Fullname;
    if (user?.name) return user.name;
    if (user?.prenom && user?.nom) return `${user.prenom} ${user.nom}`;
    return 'Administrateur';
  };

  const getUserRole = () => {
    if (user?.role === 'superadmin') return 'Super Admin';
    if (user?.role === 'admin') return 'Administrateur';
    if (user?.role === 'employee') return 'Employé';
    return user?.role || 'Utilisateur';
  };

  const handleBadgeClick = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    navigate({ pathname: path, search: '?filter=notifications' });
  };

  const layoutOverrides = `
    /* Sidebar content scroll fix */
    .sidebar-content-scroll {
      margin-right: 0 !important;
    }

    :root {
      --sidebar-width: 16rem;
    }

    .sidebar-desktop {
      position: fixed;
      top: 1rem;
      bottom: 1rem;
      left: 1rem;
      z-index: 10;
      display: none;
      width: var(--sidebar-width);
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border: 1px solid #334155;
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      flex-direction: column;
    }
    @media (min-width: 768px) {
      .sidebar-desktop {
        display: flex;
      }
    }

    @media (min-width: 768px) {
      .sidebar-main {
        margin-left: calc(var(--sidebar-width) + 1rem);
        margin-right: auto;
        width: auto;
        max-width: calc(100% - var(--sidebar-width) - 2rem);
      }
      
      .admin-main-content {
        max-width: 1280px;
        margin-left: auto;
        margin-right: auto;
        width: 100%;
      }
    }

    .mobile-menu-btn {
      position: fixed;
      top: 1rem;
      left: 1rem;
      z-index: 1001;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      border: 1px solid #334155;
      border-radius: 2rem;
      color: #eab308;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .mobile-menu-btn:hover {
      background: linear-gradient(135deg, #334155, #1e293b);
      transform: scale(1.02);
    }

    @media (min-width: 768px) {
      .mobile-menu-btn {
        display: none;
      }
    }

    .mobile-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .mobile-sidebar-panel {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      width: 85%;
      max-width: 320px;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      z-index: 1001;
      display: flex;
      flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
      box-shadow: 2px 0 20px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      border-radius: 0 24px 24px 0;
    }

    .mobile-sidebar-panel.open {
      transform: translateX(0);
    }

    .mobile-sidebar-header {
      position: relative;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .mobile-close-btn {
      position: absolute;
      right: 1rem;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 0.5rem;
      padding: 0.5rem;
      cursor: pointer;
      color: #cbd5e1;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mobile-close-btn:hover {
      background: rgba(234, 179, 8, 0.2);
      color: #eab308;
    }

    .mobile-nav {
      flex: 1;
      padding: 1rem 0.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .mobile-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.875rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      color: #cbd5e1;
      text-decoration: none;
      cursor: pointer;
    }

    .mobile-nav-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
      color: white;
    }

    .mobile-nav-item.active {
      background-color: rgba(234, 179, 8, 0.2);
      color: #eab308;
    }

    .mobile-nav-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .mobile-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.25rem;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 700;
      color: white;
      background-color: #eab308;
    }
    .mobile-badge.critical {
      background-color: #ef4444;
    }

    .mobile-user-section {
      padding: 0.75rem;
      margin-top: auto;
    }

    .mobile-user-info {
      padding: 0.5rem 0.75rem;
      margin-bottom: 0.75rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 0.5rem;
    }

    .mobile-user-name {
      font-size: 0.875rem;
      color: white;
      font-weight: 600;
    }

    .mobile-user-role {
      font-size: 0.7rem;
      color: #94a3b8;
      text-transform: capitalize;
      margin-top: 0.125rem;
    }

    .mobile-user-email {
      font-size: 0.65rem;
      color: #64748b;
      margin-top: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mobile-logout-btn {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: 0.875rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      border: none;
      color: white;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .mobile-logout-btn:hover {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      transform: translateY(-1px);
    }

    .sidebar-nav::-webkit-scrollbar,
    .mobile-nav::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar-nav::-webkit-scrollbar-track,
    .mobile-nav::-webkit-scrollbar-track {
      background: #1e293b;
    }
    .sidebar-nav::-webkit-scrollbar-thumb,
    .mobile-nav::-webkit-scrollbar-thumb {
      background: #475569;
      border-radius: 4px;
    }
    .sidebar-nav::-webkit-scrollbar-thumb:hover,
    .mobile-nav::-webkit-scrollbar-thumb:hover {
      background: #eab308;
    }

    @media (max-width: 767px) {
      .admin-main-content {
        padding-top: 4rem;
      }
    }
    
    .sidebar-logout-btn {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 1rem;
      border-radius: 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: transparent;
      border: none;
      cursor: pointer;
      color: #f87171;
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .sidebar-logout-btn:hover {
      background: rgba(239, 68, 68, 0.1);
      color: #ef4444;
    }

    .admin-container {
      max-width: 1280px;
      margin-left: auto;
      margin-right: auto;
      width: 100%;
    }

    .sidebar-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.25rem;
      border-radius: 9999px;
      font-size: 0.65rem;
      font-weight: 700;
      color: white;
      background-color: #eab308;
      margin-left: auto;
      flex-shrink: 0;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sidebar-badge.critical {
      background-color: #ef4444;
    }
    .sidebar-badge:hover {
      transform: scale(1.1);
    }
    .sidebar-menu-button {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .sidebar-menu-button .flex-1 {
      flex: 1;
    }

    .notification-filter-banner {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 0.75rem;
      padding: 0.5rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: #92400e;
    }
    .clear-filter-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: transparent;
      border: none;
      color: #dc2626;
      cursor: pointer;
      font-weight: 500;
    }
    .clear-filter-btn:hover {
      text-decoration: underline;
    }

    .reservation-badges {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: auto;
    }
  `;

  if (typeof document !== 'undefined') {
    const styleId = 'admin-layout-overrides';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = layoutOverrides;
      document.head.appendChild(style);
    }
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        {/* Desktop Sidebar */}
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas">
          <SidebarHeader>
            <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                  Admin<span style={{ color: '#eab308' }}>Panel</span>
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                  {getUserName()}
                </p>
              </div>
              <NotificationBell />
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const badge = getBadge(item.pageSlug);
                return (
                  <SidebarMenuItem key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.path === "/dashboard"}
                      className={({ isActive }) =>
                        `sidebar-menu-button ${isActive ? "active" : ""}`
                      }
                    >
                      <item.icon className="sidebar-menu-icon" />
                      <span className="flex-1">{item.label}</span>

                      {item.path === "/reservations" ? (
                        <div className="reservation-badges">
                          {lateCount > 0 && (
                            <span
                              className="sidebar-badge critical"
                              title={`${lateCount} en retard`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/reservations?filter=retard');
                              }}
                              style={{ backgroundColor: '#ef4444' }}
                            >
                              {lateCount}
                            </span>
                          )}
                          {endingSoonCount > 0 && (
                            <span
                              className="sidebar-badge"
                              title={`${endingSoonCount} se terminent bientôt`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/reservations?filter=ending-soon');
                              }}
                              style={{ backgroundColor: '#3b82f6' }}
                            >
                              {endingSoonCount}
                            </span>
                          )}
                        </div>
                      ) : item.path === "/reservations-status" ? (
                        <div className="reservation-badges">
                          {pendingCount > 0 && (
                            <span
                              className="sidebar-badge"
                              title={`${pendingCount} en attente`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/reservations-status?filter=pending');
                              }}
                              style={{ backgroundColor: '#f59e0b' }}
                            >
                              {pendingCount}
                            </span>
                          )}
                          {contactedCount > 0 && (
                            <span
                              className="sidebar-badge"
                              title={`${contactedCount} contactés`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate('/reservations-status?filter=contacted');
                              }}
                              style={{ backgroundColor: '#8b5cf6' }}
                            >
                              {contactedCount}
                            </span>
                          )}
                        </div>
                      ) : (
                        badge && (
                          <span
                            className={`sidebar-badge ${badge.isCritical ? 'critical' : ''}`}
                            onClick={(e) => handleBadgeClick(e, item.path)}
                          >
                            {badge.count}
                          </span>
                        )
                      )}
                    </NavLink>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border">
            <button onClick={handleLogout} className="sidebar-logout-btn">
              <LogOut className="logout-icon" />
              <span>Déconnexion</span>
            </button>
          </SidebarFooter>
        </Sidebar>

        {/* Mobile Menu Button */}
        <button 
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <Menu size={20} />
          Menu
        </button>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="mobile-overlay" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Panel */}
        <div className={`mobile-sidebar-panel ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="mobile-sidebar-header">
            <div className="sidebar-logo-icon" style={{
              height: '2.25rem',
              width: '2.25rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #eab308, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>AtlasRent</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Admin Console</div>
            </div>
            <button 
              className="mobile-close-btn"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          <nav className="mobile-nav">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const badge = getBadge(item.pageSlug);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div className="mobile-nav-left">
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </div>

                  {item.path === "/reservations" ? (
                    <div className="flex gap-1">
                      {lateCount > 0 && (
                        <span
                          className="mobile-badge critical"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/reservations?filter=retard');
                            setIsMobileMenuOpen(false);
                          }}
                          style={{ backgroundColor: '#ef4444' }}
                        >
                          {lateCount}
                        </span>
                      )}
                      {endingSoonCount > 0 && (
                        <span
                          className="mobile-badge"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/reservations?filter=ending-soon');
                            setIsMobileMenuOpen(false);
                          }}
                          style={{ backgroundColor: '#3b82f6' }}
                        >
                          {endingSoonCount}
                        </span>
                      )}
                    </div>
                  ) : item.path === "/reservations-status" ? (
                    <div className="flex gap-1">
                      {pendingCount > 0 && (
                        <span
                          className="mobile-badge"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/reservations-status?filter=pending');
                            setIsMobileMenuOpen(false);
                          }}
                          style={{ backgroundColor: '#f59e0b' }}
                        >
                          {pendingCount}
                        </span>
                      )}
                      {contactedCount > 0 && (
                        <span
                          className="mobile-badge"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate('/reservations-status?filter=contacted');
                            setIsMobileMenuOpen(false);
                          }}
                          style={{ backgroundColor: '#8b5cf6' }}
                        >
                          {contactedCount}
                        </span>
                      )}
                    </div>
                  ) : (
                    badge && (
                      <span
                        className={`mobile-badge ${badge.isCritical ? 'critical' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate({ pathname: item.path, search: '?filter=notifications' });
                          setIsMobileMenuOpen(false);
                        }}
                      >
                        {badge.count}
                      </span>
                    )
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mobile-user-section">
            <div className="mobile-user-info">
              <div className="mobile-user-name">{getUserName()}</div>
              <div className="mobile-user-role">{getUserRole()}</div>
              <div className="mobile-user-email">{user?.email || 'email@exemple.com'}</div>
            </div>
            <button onClick={handleLogout} className="mobile-logout-btn">
              <LogOut size={18} />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        {/* Main content area */}
        <SidebarInset className="flex-1">
          <div className="p-6 lg:p-8 admin-main-content">
            <Outlet />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}