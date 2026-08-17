// src/pages/admin/AdminMatriculesClients.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchMatricules, fetchCars, fetchReservations, fetchClients, refreshMatricules,
  selectMatricules, selectCars, selectMatriculesLoading, selectReservations, selectClients
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { toast } from "sonner";
import {
  Search, RefreshCw, Tag, Car, User, Users, Clock, CalendarDays,
  DollarSign, Wallet, ArrowUpDown, ArrowUp, ArrowDown, X,
  ExternalLink, History, CheckCircle2, UserX, Receipt, Calendar
} from "lucide-react";

export default function AdminMatriculesClients() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const matricules = useSelector(selectMatricules);
  const cars = useSelector(selectCars);
  const reservations = useSelector(selectReservations);
  const clients = useSelector(selectClients);
  const loading = useSelector(selectMatriculesLoading);

  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('all'); // all | current | previous | none
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('matricule');
  const [sortDirection, setSortDirection] = useState('asc');
  const [historyMatricule, setHistoryMatricule] = useState(null);

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchMatricules()),
      dispatch(fetchCars()),
      dispatch(fetchClients()),
      dispatch(fetchReservations())
    ]);
  };

  const refreshData = async () => {
    await dispatch(refreshMatricules());
    await dispatch(fetchCars());
    await dispatch(fetchClients());
    await dispatch(fetchReservations());
    toast.success("Données actualisées");
  };

  // ==================== HELPERS ====================
  const getMatriculeReservations = (matId) =>
    (reservations || [])
      .filter(r => r.matricule_id === matId)
      .filter(r => !['pending', 'cancelled', 'contacted'].includes(r.status));

  const getCurrentReservation = (matId) => {
    const allRes = getMatriculeReservations(matId);
    // 1) Priorité aux 'retard' (toujours considéré comme actuel)
    const retard = allRes.filter(r => r.status === 'retard');
    if (retard.length > 0) {
      return retard.sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
    }
    // 2) Sinon les 'confirmed' avec end_date >= aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const confirmed = allRes
      .filter(r => r.status === 'confirmed' && r.end_date && new Date(r.end_date) >= today)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return confirmed.length > 0 ? confirmed[0] : null;
  };

  const getLastReservation = (matId) => {
    const list = getMatriculeReservations(matId);
    if (!list.length) return null;
    return [...list].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))[0];
  };

  const getDisplayReservation = (matId) => {
    const current = getCurrentReservation(matId);
    if (current) return { reservation: current, isCurrent: true };
    const last = getLastReservation(matId);
    return { reservation: last, isCurrent: false };
  };

  const getTotalRemainingForClient = (matId, clientId) => {
    if (!clientId) return 0;
    return getMatriculeReservations(matId)
      .filter(r => r.client_id === clientId)
      .reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);
  };

  const calcDurationDays = (start, end) => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 1;
  };

  const formatMoney = (val) => `${(parseFloat(val) || 0).toLocaleString('fr-FR')} DH`;
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  const reservationStatusLabel = {
    pending: { label: 'En attente', bg: 'badge-warning' },
    confirmed: { label: 'Confirmée', bg: 'badge-blue' },
    completed: { label: 'Terminée', bg: 'badge-success' },
    retard: { label: 'En retard', bg: 'badge-danger' },
    contacted: { label: 'Contacté', bg: 'badge-warning' },
    cancelled: { label: 'Annulée', bg: 'badge-gray' },
  };

  // ==================== SORT ====================
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === 'asc' ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
  };

  // ==================== ENRICH + FILTER + SORT ====================
  const enriched = (matricules || []).map(mat => {
    const car = cars.find(c => c.id === mat.car_id);
    const { reservation: dispRes, isCurrent } = getDisplayReservation(mat.id);
    const client = dispRes ? clients.find(c => c.id === dispRes.client_id) : null;
    const duration = dispRes ? calcDurationDays(dispRes.start_date, dispRes.end_date) : null;
    const totalRestantForClient = getTotalRemainingForClient(mat.id, client?.id);
    const period = dispRes
      ? `${formatDate(dispRes.start_date)} → ${formatDate(dispRes.end_date)}`
      : '—';
    return { mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period };
  });

  const filteredList = enriched.filter(({ mat, car, client, isCurrent }) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      mat.matricule_code?.toLowerCase().includes(term) ||
      car?.brand?.toLowerCase().includes(term) ||
      car?.model?.toLowerCase().includes(term) ||
      (client && `${client.prenom} ${client.nom}`.toLowerCase().includes(term));

    let matchesClientFilter = true;
    if (clientFilter === 'current') matchesClientFilter = isCurrent;
    else if (clientFilter === 'previous') matchesClientFilter = !isCurrent && !!client;
    else if (clientFilter === 'none') matchesClientFilter = !client;

    return matchesSearch && matchesClientFilter;
  }).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case 'matricule':
        aVal = a.mat.matricule_code?.toLowerCase() || ''; bVal = b.mat.matricule_code?.toLowerCase() || ''; break;
      case 'car':
        aVal = a.car ? `${a.car.brand} ${a.car.model}`.toLowerCase() : '';
        bVal = b.car ? `${b.car.brand} ${b.car.model}`.toLowerCase() : '';
        break;
      case 'client':
        aVal = a.client ? `${a.client.prenom} ${a.client.nom}`.toLowerCase() : '';
        bVal = b.client ? `${b.client.prenom} ${b.client.nom}`.toLowerCase() : '';
        break;
      case 'duration':
        aVal = a.duration || 0; bVal = b.duration || 0; break;
      case 'total':
        aVal = a.dispRes ? parseFloat(a.dispRes.total_price) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.total_price) || 0 : 0;
        break;
      case 'paid':
        aVal = a.dispRes ? parseFloat(a.dispRes.amount_paid) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.amount_paid) || 0 : 0;
        break;
      case 'remaining':
        aVal = a.dispRes ? parseFloat(a.dispRes.remaining_amount) || 0 : 0;
        bVal = b.dispRes ? parseFloat(b.dispRes.remaining_amount) || 0 : 0;
        break;
      case 'totalRemaining':
        aVal = a.totalRestantForClient || 0;
        bVal = b.totalRestantForClient || 0;
        break;
      default:
        aVal = a.mat.id; bVal = b.mat.id;
    }
    if (sortDirection === 'asc') return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginated = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ==================== STATS ====================
  const stats = {
    total: matricules?.length || 0,
    withCurrent: enriched.filter(e => e.isCurrent).length,
    withoutClient: enriched.filter(e => !e.client).length,
    totalDue: enriched.reduce((sum, e) => sum + getTotalRemainingForClient(e.mat.id, e.client?.id), 0)
  };

  // ==================== ACTIONS (navigation avec paramètres URL) ====================
  const handleOpenHistory = (mat) => setHistoryMatricule(mat);
  const handleCloseHistory = () => setHistoryMatricule(null);

  // Navigue vers la page des matricules avec focus sur l'ID
  const handleGoToMatricule = (matriculeId) => {
    navigate(`/matricules?focus=${matriculeId}`);
  };

  // Navigue vers la page des réservations avec focus sur l'ID
  const handleGoToReservation = (reservationId, clientName) => {
  if (!reservationId) return;
  if (clientName) {
    navigate(`/reservations?search=${encodeURIComponent(clientName)}`);
  } else {
    navigate(`/reservations?focus=${reservationId}`);
  }
};

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Chargement...</p>
    </div>
  );

  const historyReservations = historyMatricule
    ? [...getMatriculeReservations(historyMatricule.id)].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
    : [];
  const historyCar = historyMatricule ? cars.find(c => c.id === historyMatricule.car_id) : null;
  const historyTotalDue = historyReservations.reduce((sum, r) => sum + (parseFloat(r.remaining_amount) || 0), 0);

  return (
    <>
      <div className="admin-container">
        <div className="header">
          <div>
            <h1 className="title">Clients par Matricule</h1>
            <p className="subtitle">{filteredList.length} matricule(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshData} className="btn btn-secondary"><RefreshCw size={16} /> Actualiser</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Immatriculations</p>
              <p className="stat-number">{stats.total}</p>
            </div>
            <Tag size={28} className="stat-icon" />
          </div>
          <div className="stat-card">
            <div>
              <p className="stat-label">Avec client actuel</p>
              <p className="stat-number" style={{ color: '#16a34a' }}>{stats.withCurrent}</p>
            </div>
            <Users size={28} className="stat-icon" style={{ color: '#16a34a' }} />
          </div>
          <div className="stat-card">
            <div>
              <p className="stat-label">Sans aucun client</p>
              <p className="stat-number" style={{ color: '#94a3b8' }}>{stats.withoutClient}</p>
            </div>
            <UserX size={28} className="stat-icon" style={{ color: '#94a3b8' }} />
          </div>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total dû (tous clients)</p>
              <p className="stat-number" style={{ color: '#dc2626' }}>{formatMoney(stats.totalDue)}</p>
            </div>
            <Wallet size={28} className="stat-icon" style={{ color: '#dc2626' }} />
          </div>
        </div>

        <div className="search-wrapper">
          <div className="search-row">
            <input
              type="text"
              placeholder="Rechercher par plaque, véhicule, client..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="search-input"
            />
            <select
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setCurrentPage(1); }}
              className="filter-select"
            >
              <option value="all">Tous les clients</option>
              <option value="current">Client actuel</option>
              <option value="previous">Client précédent</option>
              <option value="none">Sans client</option>
            </select>
          </div>
        </div>

        <div className="table-info">
          <p className="table-info-text">{filteredList.length} matricule(s)</p>
          <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
        </div>

        <div className="table-wrapper">
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => handleSort("matricule")} className="sortable-header">Plaque {getSortIcon("matricule")}</th>
                  <th onClick={() => handleSort("car")} className="sortable-header">Véhicule associé {getSortIcon("car")}</th>
                  <th onClick={() => handleSort("client")} className="sortable-header">Client {getSortIcon("client")}</th>
                  <th className="sortable-header">Période</th>
                  <th onClick={() => handleSort("duration")} className="sortable-header">Durée {getSortIcon("duration")}</th>
                  <th onClick={() => handleSort("total")} className="sortable-header">Total {getSortIcon("total")}</th>
                  <th onClick={() => handleSort("paid")} className="sortable-header">Payé {getSortIcon("paid")}</th>
                  <th onClick={() => handleSort("remaining")} className="sortable-header">Restant {getSortIcon("remaining")}</th>
                  <th onClick={() => handleSort("totalRemaining")} className="sortable-header">Total dû {getSortIcon("totalRemaining")}</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-12">Aucun matricule trouvé</td></tr>
                ) : (
                  paginated.map(({ mat, car, dispRes, isCurrent, client, duration, totalRestantForClient, period }) => (
                    <tr key={mat.id}>
                      <td className="font-medium font-mono">{mat.matricule_code}</td>
                      <td>
                        <div className="vehicle-info-cell">
                          <div className="vehicle-model">{car ? `${car.brand} ${car.model}` : 'Non assigné'}</div>
                        </div>
                      </td>
                      <td>
                        {client ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className={`badge ${isCurrent ? 'badge-success' : 'badge-warning'}`}>
                              {isCurrent ? 'Actuel' : 'Précédent'}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>
                              <User size={12} /> {client.prenom} {client.nom}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Aucun client</span>
                        )}
                      </td>
                      <td>
                        {dispRes ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                            <Calendar size={12} style={{ color: '#64748b' }} />
                            <span>{period}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {duration ? (
                          <span className="badge badge-gray">
                            <CalendarDays size={12} style={{ color: '#eab308' }} /> {duration} {duration > 1 ? 'jours' : 'jour'}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {dispRes ? (
                          <div>
                            <span className="badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontWeight: 700 }}>
                              <DollarSign size={12} style={{ color: '#d97706' }} /> {formatMoney(dispRes.total_price)}
                            </span>
                            {!isCurrent && (
                              <div style={{ fontSize: '0.62rem', color: '#b45309', fontWeight: 600, marginTop: '4px' }}>
                                Client précédent
                              </div>
                            )}
                          </div>
                        ) : '—'}
                      </td>
                      <td>
                        {dispRes ? (
                          <span style={{ fontWeight: 600, color: '#16a34a' }}>{formatMoney(dispRes.amount_paid)}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                      <td>
                        {dispRes ? (
                          <span style={{ fontWeight: 600, color: '#dc2626' }}>{formatMoney(dispRes.remaining_amount)}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: totalRestantForClient > 0 ? '#dc2626' : '#16a34a' }}>
                          {formatMoney(totalRestantForClient)}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button className="action-btn action-btn-info" onClick={() => handleOpenHistory(mat)} title="Historique des réservations">
                            <History size={16} />
                          </button>
                          {dispRes && (
                            <button
  className="action-btn action-btn-primary"
  onClick={() => handleGoToReservation(dispRes.id, client ? `${client.prenom} ${client.nom}` : null)}
  title="Voir la réservation"
>
  <ExternalLink size={16} />
</button>
                          )}
                          <button
                            className="action-btn action-btn-success"
                            onClick={() => handleGoToMatricule(mat.id)}
                            title="Ouvrir la fiche matricule"
                          >
                            <Car size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              totalItems={filteredList.length}
            />
          )}
        </div>
      </div>

      {/* ==================== HISTORY MODAL ==================== */}
      {historyMatricule && (
        <div className="modal-overlay">
          <div className="modals" style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="modal-title"><History size={20} /> {historyMatricule.matricule_code}</h2>
              <button onClick={handleCloseHistory} className="modal-close"><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p className="subtitle" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Car size={14} /> {historyCar ? `${historyCar.brand} ${historyCar.model}` : 'Véhicule non assigné'}
              </p>

              <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Réservations</p>
                    <p className="stat-number">{historyReservations.length}</p>
                  </div>
                  <Receipt size={24} className="stat-icon" />
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Total dû (toutes réservations)</p>
                    <p className="stat-number" style={{ color: '#dc2626' }}>{formatMoney(historyTotalDue)}</p>
                  </div>
                  <Wallet size={24} className="stat-icon" style={{ color: '#dc2626' }} />
                </div>
                <div className="stat-card">
                  <div>
                    <p className="stat-label">Statut matricule</p>
                    <p className="stat-number" style={{ fontSize: '1.1rem' }}>{historyMatricule.status}</p>
                  </div>
                  <CheckCircle2 size={24} className="stat-icon" />
                </div>
              </div>

              <div className="table-wrapper">
                <table className="table history-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Période</th>
                      <th>Durée</th>
                      <th>Statut</th>
                      <th>Total</th>
                      <th>Payé</th>
                      <th>Restant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyReservations.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-12">Aucune réservation pour ce matricule</td></tr>
                    ) : (
                      historyReservations.map(res => {
                        const client = clients.find(c => c.id === res.client_id);
                        const statusInfo = reservationStatusLabel[res.status] || { label: res.status, bg: 'badge-blue' };
                        const duration = calcDurationDays(res.start_date, res.end_date);
                        return (
                          <tr key={res.id}>
                            <td className="font-medium">{client ? `${client.prenom} ${client.nom}` : '—'}</td>
                            <td>{formatDate(res.start_date)} → {formatDate(res.end_date)}</td>
                            <td>{duration ? `${duration} jours` : '—'}</td>
                            <td><span className={`badge ${statusInfo.bg}`}>{statusInfo.label}</span></td>
                            <td style={{ fontWeight: 600 }}>{formatMoney(res.total_price)}</td>
                            <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatMoney(res.amount_paid)}</td>
                            <td style={{ color: '#dc2626', fontWeight: 600 }}>{formatMoney(res.remaining_amount)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-actions-footer">
              <button onClick={handleCloseHistory} className="btn btn-secondary">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STYLES (matching AdminReservations) ===== */}
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; background: #f8fafc; }

        .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; overflow-x: auto; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
        .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }

        .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .btn-secondary { background: #f1f5f9; color: #1e293b; }
        .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
        .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }

        .flex { display: flex; }
        .gap-2 { gap: 0.5rem; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }
        .py-12 { padding: 3rem 0; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-1px); }
        .stat-label { font-size: 0.75rem; color: #64748b; margin-bottom: 0.35rem; font-weight: 500; }
        .stat-number { font-size: 1.5rem; font-weight: 700; color: #0f172a; }
        .stat-icon { color: #cbd5e1; flex-shrink: 0; }

        .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
        .search-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
        .search-input { flex: 1; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; transition: all 0.2s; min-width: 150px; }
        .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }
        .filter-select { width: 12rem; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; cursor: pointer; }

        .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
        .table-info-text { font-size: 0.875rem; color: #64748b; }

        .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; min-width: 1100px; }
        .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; white-space: nowrap; }
        .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; vertical-align: middle; }
        .table tr:hover { background: #f8fafc; }

        .history-table { min-width: 0; width: 100%; table-layout: fixed; }
        .history-table th, .history-table td { white-space: normal; word-break: break-word; padding: 0.6rem 0.6rem; font-size: 0.8rem; }

        .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
        .sortable-header:hover { background-color: #e2e8f0; }
        .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; vertical-align: middle; }
        .sort-icon.active { opacity: 1; color: #eab308; }

        .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-purple { background: #f3e8ff; color: #6b21a5; }
        .badge-gray { background: #f1f5f9; color: #475569; }

        .vehicle-info-cell { background: #fefce8; padding: 4px 12px; border-radius: 8px; border-left: 4px solid #eab308; display: inline-block; min-width: 120px; }
        .vehicle-model { font-weight: 600; color: #1e293b; font-size: 0.875rem; }

        .action-buttons { display: flex; gap: 0.25rem; justify-content: flex-end; flex-wrap: wrap; }
        .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn-info { color: #3b82f6; }
        .action-btn-info:hover { background: #eff6ff; }
        .action-btn-primary { color: #eab308; }
        .action-btn-primary:hover { background: #fefce8; }
        .action-btn-success { color: #16a34a; }
        .action-btn-success:hover { background: #ecfdf5; }

        .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modals { background: white; border-radius: 1.5rem; width: 100%; max-height: 90vh; overflow-y: auto; overflow-x: hidden; animation: slideUp 0.3s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #e2e8f0; }
        .modal-actions-footer { display: flex; justify-content: flex-end; margin-top: 1rem; padding: 1rem 1.5rem 1.5rem 1.5rem; border-top: 1px solid #e2e8f0; }

        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; margin-bottom: 0.75rem; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        @media (max-width: 768px) {
          .admin-container { padding: 1rem; }
          .header { flex-direction: column; align-items: flex-start; }
          .search-row { flex-direction: column; align-items: stretch; }
          .filter-select { width: 100%; }
          .action-buttons { flex-wrap: wrap; }
          .modal { max-width: 95%; margin: 0 auto; }
        }
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .table-wrapper, .search-wrapper, .modal, .stat-card { background: #1e293b; border-color: #334155; }
          .table-info-text, .table th, .subtitle, .stat-label { color: #94a3b8; }
          .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .btn-secondary { background: #334155; color: #f1f5f9; }
          .search-input, .filter-select { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .stat-number { color: #f1f5f9; }
          .table td { border-top-color: #334155; }
          .table tr:hover { background: #334155; }
          .badge-warning { background: #78350f; color: #fde68a; }
          .badge-success { background: #14532d; color: #4ade80; }
          .badge-danger { background: #7f1d1d; color: #fca5a5; }
          .badge-blue { background: #1e3a5f; color: #60a5fa; }
          .badge-purple { background: #4c1d95; color: #c084fc; }
          .badge-gray { background: #334155; color: #cbd5e1; }
          .sortable-header:hover { background-color: #334155; }
          .modal-header { background: #1e293b; border-color: #334155; }
          .modal-close { background: #334155; color: #f1f5f9; }
          .action-btn-info:hover { background: #1e3a5f; }
          .action-btn-primary:hover { background: #334155; }
          .action-btn-success:hover { background: #064e3b; }
          .vehicle-info-cell { background: #1e293b; border-left-color: #fbbf24; }
          .vehicle-model { color: #f1f5f9; }
        }
      `}</style>
    </>
  );
}