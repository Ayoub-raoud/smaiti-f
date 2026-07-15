// components/admin/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { 
  Bell, X, AlertTriangle, Calendar, Car, CreditCard, RefreshCw, 
  Search, Filter, Download, ChevronDown, FileText, FileSpreadsheet, 
  Calendar as CalendarIcon, XCircle, CalendarDays
} from "lucide-react";
import { calculateAllNotifications, toggleNotificationPanel, closeNotificationPanel } from "../../Redux/notificationSlice";
import { Link } from "react-router-dom";
import { pdf } from '@react-pdf/renderer';
import { NotificationsPDF } from "../../components/pdf/NotificationsPDF";

export default function NotificationBell() {
  const dispatch = useDispatch();
  const { notifications, loading, isOpen, lastUpdated } = useSelector((state) => state.notifications);
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [panelPosition, setPanelPosition] = useState({ top: 0, left: 0 });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Position calculations (unchanged)
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const sidebar = document.querySelector('.sidebar-desktop');
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        setPanelPosition({
          top: rect.bottom + 8,
          left: sidebarRect.left + 16,
        });
      } else {
        setPanelPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const sidebar = document.querySelector('.sidebar-desktop');
        if (sidebar) {
          const sidebarRect = sidebar.getBoundingClientRect();
          setPanelPosition({
            top: rect.bottom + 8,
            left: sidebarRect.left + 16,
          });
        } else {
          setPanelPosition({
            top: rect.bottom + 8,
            left: rect.left,
          });
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        const bellButton = buttonRef.current;
        if (bellButton && !bellButton.contains(event.target)) {
          dispatch(closeNotificationPanel());
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dispatch, isOpen]);

  useEffect(() => {
    dispatch(calculateAllNotifications());
  }, [dispatch]);

  const getNotificationIcon = (type) => {
    switch(type) {
      case "technical_visit":
      case "insurance": return <Car size={16} className="text-yellow-500" />;
      case "reservation": return <Calendar size={16} className="text-blue-500" />;
      case "accident": return <AlertTriangle size={16} className="text-red-500" />;
      case "payment_overdue":
      case "payment_upcoming": return <CreditCard size={16} className="text-green-500" />;
      default: return <Bell size={16} />;
    }
  };

  const getNotificationLink = (item) => {
    switch(item.type) {
      case "technical_visit":
      case "insurance": return `/matricules`;
      case "reservation": return `/reservations`;
      case "accident": return `/accidents`;
      case "payment_overdue":
      case "payment_upcoming": return `/payments`;
      default: return "#";
    }
  };

  const allNotifications = [
    ...notifications.matricules.items.map(item => ({ ...item, category: "matricules" })),
    ...notifications.reservations.items.map(item => ({ ...item, category: "reservations" })),
    ...notifications.accidents.items.map(item => ({ ...item, category: "accidents" })),
    ...notifications.payments.items.map(item => ({ ...item, category: "payments" }))
  ];

  const getNormalizedDate = (item) => {
    let dateStr = item.date || item.dueDate || item.endDate || null;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  };

  const filteredNotifications = allNotifications.filter(item => {
    if (filterType !== 'all') {
      const itemType = item.type;
      if (filterType === 'insurance' && itemType !== 'insurance') return false;
      if (filterType === 'technical_visit' && itemType !== 'technical_visit') return false;
      if (filterType === 'reservation' && itemType !== 'reservation') return false;
      if (filterType === 'accident' && itemType !== 'accident') return false;
      if (filterType === 'payment_overdue' && itemType !== 'payment_overdue') return false;
      if (filterType === 'payment_upcoming' && itemType !== 'payment_upcoming') return false;
    }
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const title = (item.title || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const code = (item.matriculeCode || '').toLowerCase();
      const dossier = (item.dossierNumber || '').toLowerCase();
      if (!title.includes(term) && !desc.includes(term) && !code.includes(term) && !dossier.includes(term)) return false;
    }
    const normalizedDate = getNormalizedDate(item);
    if (dateFrom && normalizedDate && normalizedDate < dateFrom) return false;
    if (dateTo && normalizedDate && normalizedDate > dateTo) return false;
    return true;
  });

  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const aIsCritical = a.isExpired || a.isLate || (a.daysRemaining !== undefined && a.daysRemaining <= 3) || (a.daysSince !== undefined && a.daysSince <= 3);
    const bIsCritical = b.isExpired || b.isLate || (b.daysRemaining !== undefined && b.daysRemaining <= 3) || (b.daysSince !== undefined && b.daysSince <= 3);
    if (aIsCritical && !bIsCritical) return -1;
    if (!aIsCritical && bIsCritical) return 1;
    const aDays = a.daysRemaining !== undefined ? a.daysRemaining : (a.daysSince !== undefined ? -a.daysSince : 999);
    const bDays = b.daysRemaining !== undefined ? b.daysRemaining : (b.daysSince !== undefined ? -b.daysSince : 999);
    return aDays - bDays;
  });

  // ============================================================
  // EXPORT FUNCTIONS
  // ============================================================
  const getExportFilterDescription = (mode) => {
    const parts = [];
    if (mode === 'combined') parts.push('Périodes combinées (Aujourd\'hui, Demain, Semaine prochaine)');
    else if (mode) { /* unused for combined */ }
    else {
      if (filterType !== 'all') {
        const typeLabels = {
          insurance: 'Assurance',
          technical_visit: 'Visite technique',
          reservation: 'Réservation',
          accident: 'Accident',
          payment_overdue: 'Paiement en retard',
          payment_upcoming: 'Paiement à venir'
        };
        parts.push(`Type: ${typeLabels[filterType] || filterType}`);
      }
      if (searchTerm.trim()) parts.push(`Recherche: "${searchTerm.trim()}"`);
      if (dateFrom) parts.push(`Du: ${dateFrom}`);
      if (dateTo) parts.push(`Au: ${dateTo}`);
    }
    return parts.length ? `Filtres: ${parts.join(' | ')}` : 'Toutes les notifications';
  };

  const downloadCSV = () => {
    if (sortedNotifications.length === 0) {
      alert('Aucune notification à exporter.');
      return;
    }
    const filterDesc = getExportFilterDescription();
    const headers = ['Type', 'Catégorie', 'Titre', 'Description', 'Statut', 'Date/Échéance', 'Montant (DH)'];
    const rows = sortedNotifications.map(item => {
      let status = '';
      if (item.isExpired) status = 'Expiré';
      else if (item.isLate) status = 'En retard';
      else if (item.isOverdue) status = 'En retard';
      else if (item.daysRemaining !== undefined && item.daysRemaining > 0) status = `${item.daysRemaining} jours restant`;
      else if (item.daysSince !== undefined) status = `Il y a ${item.daysSince} jour${item.daysSince > 1 ? 's' : ''}`;
      else status = '—';
      const date = item.date || item.dueDate || item.endDate || '';
      const amount = item.amount && !isNaN(parseFloat(item.amount)) ? parseFloat(item.amount).toFixed(2) : '';
      return [
        item.type || '—',
        item.category || '—',
        item.title || '—',
        item.description || '—',
        status,
        date,
        amount
      ];
    });
    const filterLine = `# ${filterDesc}`;
    const csvContent = [filterLine, headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notifications_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportDropdown(false);
  };

  const downloadPDF = async (combined = false) => {
    if (sortedNotifications.length === 0) {
      alert('Aucune notification à exporter.');
      return;
    }
    try {
      const blob = await pdf(
        <NotificationsPDF 
          notifications={sortedNotifications} 
          filterDescription={getExportFilterDescription(combined ? 'combined' : null)}
          combined={combined}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notifications_${new Date().toISOString().slice(0,10)}${combined ? '_periodes' : ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowExportDropdown(false);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert(`Erreur lors de la génération du PDF : ${error.message || 'Vérifiez la console pour plus de détails.'}`);
    }
  };

  const hasNotifications = notifications.totalCount > 0;
  const hasCritical = notifications.totalCriticalCount > 0;

  const notificationPanel = isOpen && createPortal(
    <div 
      ref={panelRef}
      className="notification-panel"
      style={{
        position: 'fixed',
        top: `${panelPosition.top}px`,
        left: `${panelPosition.left}px`,
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
        zIndex: 999999,
      }}
    >
      <div className="notification-panel-header">
        <h3>
          <Bell size={14} />
          Notifications
          {notifications.totalCount > 0 && <span>{notifications.totalCount}</span>}
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            className="refresh-btn" 
            onClick={() => dispatch(calculateAllNotifications())}
            disabled={loading}
          >
            {loading ? <div className="spinner-small" /> : <RefreshCw size={14} />}
          </button>
          <div className="export-wrapper">
            <button 
              className="refresh-btn" 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              title="Exporter les notifications"
            >
              <Download size={14} />
            </button>
            {showExportDropdown && (
              <div className="export-dropdown">
                {/* ===== Combined periods ===== */}
                <button onClick={() => downloadPDF(true)}>
                  <CalendarDays size={14} /> Période (combiné)
                </button>
                <div className="export-divider" />
                {/* Custom exports */}
                <button onClick={() => downloadPDF(false)}>
                  <FileText size={14} /> PDF (personnalisé)
                </button>
                <button onClick={downloadCSV}>
                  <FileSpreadsheet size={14} /> CSV (personnalisé)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search & filters (unchanged) */}
      <div className="notification-controls">
        <div className="search-box">
          <Search size={14} className="search-icon-sm" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-sm"
          />
        </div>
        <div className="filter-wrapper">
          <button 
            className="filter-btn" 
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          >
            <Filter size={14} />
            {filterType !== 'all' && <span className="filter-badge">{filterType}</span>}
            <ChevronDown size={12} />
          </button>
          {showFilterDropdown && (
            <div className="filter-dropdown">
              <button onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}>Toutes</button>
              <button onClick={() => { setFilterType('insurance'); setShowFilterDropdown(false); }}>Assurance</button>
              <button onClick={() => { setFilterType('technical_visit'); setShowFilterDropdown(false); }}>Visite technique</button>
              <button onClick={() => { setFilterType('reservation'); setShowFilterDropdown(false); }}>Réservation</button>
              <button onClick={() => { setFilterType('accident'); setShowFilterDropdown(false); }}>Accident</button>
              <button onClick={() => { setFilterType('payment_overdue'); setShowFilterDropdown(false); }}>Paiement en retard</button>
              <button onClick={() => { setFilterType('payment_upcoming'); setShowFilterDropdown(false); }}>Paiement à venir</button>
            </div>
          )}
        </div>
        <div className="date-range-wrapper">
          <div className="date-filter-input">
            <CalendarIcon size={14} className="date-icon" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="date-input"
              placeholder="De"
            />
          </div>
          <span className="date-separator">—</span>
          <div className="date-filter-input">
            <CalendarIcon size={14} className="date-icon" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="date-input"
              placeholder="À"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              className="clear-date-btn"
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              title="Effacer les dates"
            >
              <XCircle size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="notification-list">
        {loading && allNotifications.length === 0 ? (
          <div className="loading-state">
            <div className="spinner-small" style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.75rem' }}>Chargement...</p>
          </div>
        ) : sortedNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
            <p style={{ fontSize: '0.75rem' }}>Aucune notification</p>
            {(filterType !== 'all' || dateFrom || dateTo || searchTerm) && (
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                {getExportFilterDescription()}
              </p>
            )}
          </div>
        ) : (
          sortedNotifications.map((item, index) => {
            const isCritical = item.isExpired || item.isLate || (item.daysRemaining !== undefined && item.daysRemaining <= 3) || (item.daysSince !== undefined && item.daysSince <= 3) || item.isOverdue;
            return (
              <Link
                key={item.id || index}
                to={getNotificationLink(item)}
                className={`notification-item ${isCritical ? 'critical' : 'warning'}`}
                onClick={() => dispatch(closeNotificationPanel())}
              >
                <div className="notification-icon">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    {item.title}
                    {item.matriculeCode && <span className="matricule-tag">{item.matriculeCode}</span>}
                    {item.dossierNumber && <span className="dossier-tag">Dossier {item.dossierNumber}</span>}
                  </div>
                  <div className="notification-description">
                    {item.description}
                  </div>
                  <div className="notification-meta">
                    {item.isExpired && <span className="notification-badge badge-critical">Expiré</span>}
                    {item.isLate && <span className="notification-badge badge-critical">En retard</span>}
                    {item.isOverdue && <span className="notification-badge badge-critical">En retard</span>}
                    {!item.isExpired && !item.isLate && !item.isOverdue && item.daysRemaining !== undefined && item.daysRemaining > 0 && (
                      <span className={`notification-badge ${item.daysRemaining <= 3 ? 'badge-critical' : 'badge-warning'}`}>
                        {item.daysRemaining} jour{item.daysRemaining > 1 ? 's' : ''} restant
                      </span>
                    )}
                    {item.daysSince !== undefined && !item.isLate && !item.isOverdue && (
                      <span className={`notification-badge ${item.daysSince <= 3 ? 'badge-critical' : 'badge-warning'}`}>
                        Il y a {item.daysSince} jour{item.daysSince > 1 ? 's' : ''}
                      </span>
                    )}
                    {item.amount && !isNaN(parseFloat(item.amount)) && (
                      <span className="amount-tag">{parseFloat(item.amount).toFixed(2)} DH</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <>
      <style>{`
        /* (All styles from previous version, plus minor adjustments) */
        .notification-bell-container { position: relative; display: inline-flex; align-items: center; }
        .notification-bell-button { position: relative; background: transparent; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.75rem; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; color: #cbd5e1; }
        .notification-bell-button:hover { background: rgba(255,255,255,0.1); transform: scale(1.05); }
        .notification-ring { position: absolute; top: -2px; right: -2px; width: 12px; height: 12px; border-radius: 50%; animation: pulse-ring 1.5s infinite; }
        .notification-ring-red { background: #ef4444; box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
        .notification-ring-yellow { background: #eab308; box-shadow: 0 0 0 0 rgba(234,179,8,0.7); }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); } 70% { box-shadow: 0 0 0 6px rgba(239,68,68,0); } 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } }
        .notification-panel { background: linear-gradient(135deg,#1e293b 0%,#0f172a 100%); border: 1px solid #334155; border-radius: 1rem; box-shadow: 0 20px 40px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(234,179,8,0.1); overflow: hidden; animation: slideDown 0.3s ease; backdrop-filter: blur(8px); }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .notification-panel-header { padding: 0.75rem 1.25rem; background: linear-gradient(135deg,#334155,#1e293b); border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; }
        .notification-panel-header h3 { font-size: 0.875rem; font-weight: 600; color: #eab308; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
        .notification-panel-header h3 span { background: #ef4444; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.7rem; color: white; }
        .refresh-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 0.25rem; border-radius: 0.375rem; transition: 0.2s; }
        .refresh-btn:hover { color: #eab308; background: rgba(234,179,8,0.1); }
        .export-wrapper { position: relative; display: inline-block; }
        .export-dropdown { position: absolute; top: 100%; right: 0; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 0.25rem 0; min-width: 180px; z-index: 10; box-shadow: 0 8px 16px rgba(0,0,0,0.3); }
        .export-dropdown button { display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left; padding: 0.25rem 0.75rem; background: transparent; border: none; color: #e2e8f0; font-size: 0.75rem; cursor: pointer; }
        .export-dropdown button:hover { background: #334155; }
        .export-divider { border-top: 1px solid #334155; margin: 0.25rem 0; }
        .notification-controls { display: flex; gap: 0.5rem; padding: 0.5rem 1rem; border-bottom: 1px solid #334155; background: #1e293b; flex-wrap: wrap; align-items: center; }
        .search-box { flex: 1 1 140px; display: flex; align-items: center; background: #0f172a; border-radius: 6px; padding: 0.25rem 0.5rem; border: 1px solid #334155; }
        .search-icon-sm { color: #94a3b8; margin-right: 0.25rem; }
        .search-input-sm { background: transparent; border: none; color: #f1f5f9; font-size: 0.75rem; padding: 0.25rem 0; width: 100%; outline: none; }
        .search-input-sm::placeholder { color: #64748b; }
        .filter-wrapper { position: relative; flex-shrink: 0; }
        .filter-btn { display: flex; align-items: center; gap: 0.25rem; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 0.25rem 0.5rem; color: #e2e8f0; font-size: 0.75rem; cursor: pointer; transition: 0.2s; }
        .filter-btn:hover { border-color: #eab308; }
        .filter-badge { background: #eab308; color: #0f172a; padding: 0 0.25rem; border-radius: 4px; font-size: 0.6rem; font-weight: 700; }
        .filter-dropdown { position: absolute; top: 100%; right: 0; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 0.25rem 0; min-width: 160px; z-index: 10; box-shadow: 0 8px 16px rgba(0,0,0,0.3); }
        .filter-dropdown button { display: block; width: 100%; text-align: left; padding: 0.25rem 0.75rem; background: transparent; border: none; color: #e2e8f0; font-size: 0.75rem; cursor: pointer; }
        .filter-dropdown button:hover { background: #334155; }
        .date-range-wrapper { display: flex; align-items: center; gap: 0.25rem; flex-wrap: wrap; }
        .date-filter-input { display: flex; align-items: center; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 0.25rem 0.5rem; gap: 0.25rem; }
        .date-icon { color: #94a3b8; }
        .date-input { background: transparent; border: none; color: #f1f5f9; font-size: 0.75rem; padding: 0.25rem 0; width: 110px; outline: none; cursor: pointer; }
        .date-input::-webkit-calendar-picker-indicator { filter: invert(0.8); }
        .date-separator { color: #64748b; font-size: 0.75rem; }
        .clear-date-btn { background: transparent; border: none; color: #94a3b8; cursor: pointer; padding: 0.2rem; display: flex; align-items: center; }
        .clear-date-btn:hover { color: #ef4444; }
        .notification-list { max-height: 400px; overflow-y: auto; }
        .notification-list::-webkit-scrollbar { width: 4px; }
        .notification-list::-webkit-scrollbar-track { background: #1e293b; }
        .notification-list::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
        .notification-list::-webkit-scrollbar-thumb:hover { background: #eab308; }
        .notification-item { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 1rem; border-bottom: 1px solid #334155; transition: 0.2s; text-decoration: none; cursor: pointer; }
        .notification-item:hover { background: rgba(255,255,255,0.05); }
        .notification-item.critical { background: rgba(239,68,68,0.1); border-left: 3px solid #ef4444; }
        .notification-item.warning { background: rgba(234,179,8,0.05); border-left: 3px solid #eab308; }
        .notification-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .notification-content { flex: 1; min-width: 0; }
        .notification-title { font-size: 0.8125rem; font-weight: 600; color: white; margin-bottom: 0.25rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem; }
        .matricule-tag { font-family: monospace; font-size: 0.6rem; background: #334155; padding: 0.05rem 0.4rem; border-radius: 4px; color: #eab308; }
        .dossier-tag { font-size: 0.6rem; background: #1e293b; padding: 0.05rem 0.4rem; border-radius: 4px; color: #94a3b8; }
        .notification-description { font-size: 0.7rem; color: #94a3b8; margin-bottom: 0.25rem; }
        .notification-meta { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.25rem; }
        .notification-badge { display: inline-block; font-size: 0.6rem; padding: 0.125rem 0.375rem; border-radius: 9999px; }
        .badge-critical { background: #ef4444; color: white; }
        .badge-warning { background: #eab308; color: #1e293b; }
        .amount-tag { font-size: 0.6rem; background: #334155; padding: 0.125rem 0.375rem; border-radius: 9999px; color: #e2e8f0; }
        .empty-state { padding: 2rem; text-align: center; color: #64748b; }
        .loading-state { padding: 2rem; text-align: center; color: #94a3b8; }
        .spinner-small { display: inline-block; width: 1rem; height: 1rem; border: 2px solid #334155; border-top-color: #eab308; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .notification-panel { position: fixed !important; top: auto !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: 100% !important; border-radius: 1rem 1rem 0 0; animation: slideUp 0.3s ease; }
          @keyframes slideUp { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
          .notification-list { max-height: 60vh; }
          .notification-controls { flex-direction: column; align-items: stretch; }
          .search-box { flex: 1 1 auto; }
          .date-range-wrapper { flex-wrap: wrap; justify-content: center; }
          .date-input { width: 100px; }
        }
      `}</style>

      <div className="notification-bell-container">
        <button
          id="notification-bell-button"
          ref={buttonRef}
          className="notification-bell-button"
          onClick={() => dispatch(toggleNotificationPanel())}
        >
          <Bell size={20} />
          {hasNotifications && (
            <div className={`notification-ring ${hasCritical ? 'notification-ring-red' : 'notification-ring-yellow'}`} />
          )}
        </button>
        {notificationPanel}
      </div>
    </>
  );
}