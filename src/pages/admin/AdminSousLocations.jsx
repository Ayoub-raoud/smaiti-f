import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSousLocations,
  selectSousLocations,
  selectSousLocationsLoading,
  fetchSousLocationDetails,
  selectSelectedSousLocation,
  clearSelectedSousLocation,
  deleteSousLocation,
  createSousLocation,
  updateSousLocation,
} from '../../Redux/store';
import { 
  ChevronRight, Trash2, Edit, Plus, X, RefreshCw, Download,
  List, LayoutGrid, Search, Eye, Calendar, Users, Tag, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import PaginationControls from '../../components/PaginationControls';

export default function AdminSousLocations() {
  const dispatch = useDispatch();
  const sousLocations = useSelector(selectSousLocations);
  const loading = useSelector(selectSousLocationsLoading);
  const selected = useSelector(selectSelectedSousLocation);
  const [expandedId, setExpandedId] = useState(null);

  // View mode
  const [viewMode, setViewMode] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [listItemsPerPage, setListItemsPerPage] = useState(10);
  const [cardsItemsPerPage, setCardsItemsPerPage] = useState(12);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchSousLocations());
  }, [dispatch]);

  const handleViewDetails = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      dispatch(clearSelectedSousLocation());
    } else {
      setExpandedId(id);
      dispatch(fetchSousLocationDetails(id));
    }
  };

  const handleDeleteClick = (id, name) => {
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await dispatch(deleteSousLocation(itemToDelete.id)).unwrap();
      toast.success('Supprimée');
      if (expandedId === itemToDelete.id) {
        setExpandedId(null);
        dispatch(clearSelectedSousLocation());
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', status: 'active' });
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      status: item.status || 'active',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }
    setSubmitting(true);
    try {
      if (editingItem) {
        await dispatch(updateSousLocation({
          id: editingItem.id,
          data: formData
        })).unwrap();
        toast.success('Sous‑location modifiée');
      } else {
        await dispatch(createSousLocation(formData)).unwrap();
        toast.success('Sous‑location créée');
      }
      setShowModal(false);
      dispatch(fetchSousLocations());
    } catch (err) {
      toast.error(err.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchSousLocations());
    toast.success('Liste actualisée');
  };

  const handleExport = () => {
    if (sousLocations.length === 0) {
      toast.warning('Aucune sous‑location à exporter');
      return;
    }
    const headers = ['ID', 'Nom', 'Description', 'Statut', 'Réservations', 'Créé le'];
    const rows = sousLocations.map(sl => [
      sl.id,
      `"${sl.name}"`,
      `"${(sl.description || '').replace(/"/g, '""')}"`,
      sl.status === 'active' ? 'Actif' : 'Inactif',
      sl.reservations_count || 0,
      new Date(sl.created_at).toLocaleDateString('fr-FR'),
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sous_locations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link);
    toast.success('Export CSV effectué');
  };

  const switchToCards = () => {
    setViewMode('cards');
    setCurrentPage(1);
  };

  const switchToList = () => {
    setViewMode('list');
    setCurrentPage(1);
  };

  const filteredItems = sousLocations.filter(sl =>
    sl.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sl.description && sl.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const itemsPerPage = viewMode === 'list' ? listItemsPerPage : cardsItemsPerPage;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    if (status === 'active') {
      return <span className="badge badge-success">● Actif</span>;
    }
    return <span className="badge badge-danger">● Inactif</span>;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des sous‑locations...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="header">
        <div>
          <h1 className="title">Sous‑locations</h1>
          <p className="subtitle">Gestion des sous‑locations et réservations associées</p>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={switchToList}
            >
              <List size={16} /> Liste
            </button>
            <button 
              className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={switchToCards}
            >
              <LayoutGrid size={16} /> Cartes
            </button>
          </div>
          <button className="btn btn-secondary" onClick={handleRefresh}>
            <RefreshCw size={16} /> Actualiser
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={16} /> Exporter
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Nouvelle sous‑location
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrapper">
        <div className="search-container">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher par nom ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-info">
        <p className="table-info-text">{filteredItems.length} sous‑location(s) trouvée(s)</p>
        <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
      </div>

      {viewMode === 'list' ? (
        <div className="sous-locations-list">
          {paginatedItems.length === 0 ? (
            <div className="empty-state">Aucune sous‑location</div>
          ) : (
            paginatedItems.map(sl => (
              <div key={sl.id} className="sous-location-item">
                <div className="sous-location-header" onClick={() => handleViewDetails(sl.id)}>
                  <div className="sous-location-name">
                    <div className="name-wrapper">
                      <Tag size={18} className="name-icon" />
                      <strong>{sl.name}</strong>
                    </div>
                    <div className="badge-group">
                      <span className="badge badge-gray">{sl.reservations_count || 0} réservation(s)</span>
                      {getStatusBadge(sl.status)}
                    </div>
                  </div>
                  <div className="sous-location-actions">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(sl); }}
                      className="action-btn edit"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(sl.id, sl.name); }}
                      className="action-btn delete"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={20} className={`expand-icon ${expandedId === sl.id ? 'rotated' : ''}`} />
                  </div>
                </div>
                {expandedId === sl.id && selected && (
                  <div className="sous-location-details">
                    <p><strong>Description :</strong> {selected.description || 'Aucune description'}</p>
                    <div className="reservations-list">
                      <h4>Réservations associées</h4>
                      {selected.reservations && selected.reservations.length > 0 ? (
                        <table className="table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Client</th>
                              <th>Véhicule</th>
                              <th>Période</th>
                              <th>Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selected.reservations.map(res => (
                              <tr key={res.id}>
                                <td>#{res.id}</td>
                                <td>{res.client?.prenom} {res.client?.nom}</td>
                                <td>{res.car?.brand} {res.car?.model}</td>
                                <td>{res.start_date} → {res.end_date}</td>
                                <td><span className={`badge badge-${res.status}`}>{res.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-muted">Aucune réservation</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={listItemsPerPage}
              onItemsPerPageChange={setListItemsPerPage}
              totalItems={filteredItems.length}
            />
          )}
        </div>
      ) : (
        <>
          <div className="cards-grid">
            {paginatedItems.length === 0 ? (
              <div className="empty-state">Aucune sous‑location</div>
            ) : (
              paginatedItems.map(sl => (
                <div key={sl.id} className="sous-location-card">
                  <div className="card-header">
                    <div className="card-title">
                      <Tag size={20} className="card-icon" />
                      <span>{sl.name}</span>
                    </div>
                    <div className="card-status-badge">
                      {getStatusBadge(sl.status)}
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="card-description">
                      {sl.description || 'Aucune description'}
                    </p>
                    <div className="card-stats">
                      <div className="stat-item">
                        <Users size={14} />
                        <span>{sl.reservations_count || 0} réservation(s)</span>
                      </div>
                      <div className="stat-item">
                        <Calendar size={14} />
                        <span>Créé le {new Date(sl.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => openEditModal(sl)} className="card-action-btn edit">
                      <Edit size={14} /> Modifier
                    </button>
                    <button onClick={() => handleDeleteClick(sl.id, sl.name)} className="card-action-btn delete">
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={cardsItemsPerPage}
              onItemsPerPageChange={setCardsItemsPerPage}
              totalItems={filteredItems.length}
            />
          )}
        </>
      )}

      {/* Modal de création / édition */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? 'Modifier la sous‑location' : 'Nouvelle sous‑location'}
              </h2>
              <button onClick={() => setShowModal(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '1.5rem' }}>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Location groupe"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Description facultative"
                  />
                </div>
                <div className="form-group">
                  <label>Statut</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Enregistrement...' : (editingItem ? 'Mettre à jour' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && itemToDelete && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-icon">
              <AlertTriangle size={32} />
            </div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer la sous‑location <br />
              <span className="item-name">"{itemToDelete.name}"</span> ?<br />
              Cette action est irréversible.
            </p>
            <div className="delete-actions">
              <button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">
                Annuler
              </button>
              <button onClick={confirmDelete} className="modal-btn btn-delete">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Admin Container */
        .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
        .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
        .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }

        /* View Toggle */
        .view-toggle { display: flex; gap: 0.5rem; background: #f1f5f9; padding: 0.25rem; border-radius: 0.75rem; }
        .view-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0.875rem; border: none; background: transparent; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem; font-weight: 500; color: #64748b; transition: all 0.2s; }
        .view-btn.active { background: white; color: #0f172a; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .view-btn:hover:not(.active) { background: #e2e8f0; }

        /* Search */
        .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
        .search-container { position: relative; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; }
        .search-input { width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; transition: all 0.2s; background: white; }
        .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }

        .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
        .table-info-text { font-size: 0.875rem; color: #64748b; }

        /* Buttons */
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .btn-secondary { background: #f1f5f9; color: #1e293b; }
        .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
        .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }

        /* List View - Enhanced */
        .sous-locations-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .sous-location-item { border: 1px solid #e2e8f0; border-radius: 1rem; background: white; overflow: hidden; transition: all 0.2s; }
        .sous-location-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
        .sous-location-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; cursor: pointer; transition: background 0.15s; }
        .sous-location-header:hover { background: #fafafa; }
        .sous-location-name { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; flex: 1; }
        .name-wrapper { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; }
        .name-icon { color: #eab308; }
        .badge-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; line-height: 1.4; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-gray { background: #f1f5f9; color: #475569; }
        .sous-location-actions { display: flex; align-items: center; gap: 0.5rem; }
        .action-btn { background: none; border: none; padding: 0.4rem; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn.edit { color: #10b981; }
        .action-btn.edit:hover { background: #ecfdf5; transform: scale(1.1); }
        .action-btn.delete { color: #ef4444; }
        .action-btn.delete:hover { background: #fef2f2; transform: scale(1.1); }
        .expand-icon { transition: transform 0.25s ease; color: #94a3b8; }
        .expand-icon.rotated { transform: rotate(90deg); }
        .sous-location-details { padding: 1rem 1.5rem 1.5rem; border-top: 1px solid #e2e8f0; background: #fafafa; }
        .text-muted { color: #94a3b8; }
        .empty-state { text-align: center; padding: 3rem; color: #94a3b8; }

        /* Cards View */
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .sous-location-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; transition: all 0.3s ease; display: flex; flex-direction: column; }
        .sous-location-card:hover { transform: translateY(-4px); box-shadow: 0 20px 25px -12px rgba(0,0,0,0.1); }
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
        .card-title { display: flex; align-items: center; gap: 0.5rem; font-size: 1.125rem; font-weight: 700; }
        .card-icon { color: #eab308; }
        .card-status-badge { flex-shrink: 0; }
        .card-body { flex: 1; }
        .card-description { font-size: 0.875rem; color: #475569; margin-bottom: 0.75rem; min-height: 2.5rem; }
        .card-stats { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.75rem; color: #64748b; }
        .stat-item { display: flex; align-items: center; gap: 0.5rem; }
        .card-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; }
        .card-action-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.5rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; background: white; cursor: pointer; transition: all 0.2s; font-size: 0.75rem; font-weight: 500; }
        .card-action-btn:hover { background: #f1f5f9; }
        .card-action-btn.edit:hover { border-color: #eab308; color: #eab308; }
        .card-action-btn.delete:hover { border-color: #ef4444; color: #ef4444; }

        /* Table (for details) */
        .table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin-top: 0.5rem; }
        .table th { text-align: left; padding: 0.5rem 0.75rem; background: #f8fafc; font-weight: 500; color: #64748b; }
        .table td { padding: 0.5rem 0.75rem; border-top: 1px solid #e2e8f0; }
        .table tr:hover { background: #f8fafc; }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 500px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 0; border-bottom: 1px solid #e2e8f0; }
        .modal-title { font-size: 1.25rem; font-weight: 700; }
        .modal-close { background: #f1f5f9; border: none; padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; font-weight: 500; font-size: 0.875rem; margin-bottom: 0.25rem; color: #475569; }
        .form-control { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; transition: border-color 0.2s; background: white; }
        .form-control:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1); }
        .modal-actions-footer { display: flex; gap: 0.75rem; justify-content: flex-end; padding: 1rem 1.5rem 1.5rem; border-top: 1px solid #e2e8f0; }

        /* Delete Modal - Enhanced */
        .delete-modal { max-width: 400px; text-align: center; padding: 1.5rem; }
        .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #dc2626; }
        .delete-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .delete-message { font-size: 0.875rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.6; }
        .item-name { font-weight: 600; color: #0f172a; background: #f1f5f9; padding: 0.2rem 0.6rem; border-radius: 0.5rem; display: inline-block; margin: 0.25rem 0; }
        .delete-actions { display: flex; gap: 0.75rem; justify-content: center; }
        .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
        .modal-btn-cancel:hover { background: #f8fafc; }
        .btn-delete { background: #ef4444; color: white; }
        .btn-delete:hover { background: #dc2626; transform: scale(1.02); }

        /* Loading */
        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .sous-location-item, .sous-location-card, .search-wrapper, .modal { background: #1e293b; border-color: #334155; }
          .sous-location-header:hover { background: #0f172a; }
          .sous-location-details { background: #0f172a; border-top-color: #334155; }
          .badge-gray { background: #334155; color: #cbd5e1; }
          .badge-success { background: #14532d; color: #4ade80; }
          .badge-danger { background: #7f1d1d; color: #fca5a5; }
          .text-muted { color: #64748b; }
          .table th { background: #0f172a; color: #94a3b8; }
          .table td { border-top-color: #334155; }
          .table tr:hover { background: #0f172a; }
          .btn-secondary { background: #334155; color: #e2e8f0; }
          .btn-secondary:hover { background: #475569; }
          .modal-header { border-bottom-color: #334155; }
          .modal-close { background: #334155; color: #f1f5f9; }
          .form-control { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .modal-actions-footer { border-top-color: #334155; }
          .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .subtitle, .table-info-text { color: #94a3b8; }
          .view-toggle { background: #0f172a; }
          .view-btn { color: #94a3b8; }
          .view-btn.active { background: #1e293b; color: #f1f5f9; }
          .search-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .search-input:focus { border-color: #eab308; }
          .card-description { color: #94a3b8; }
          .card-stats { color: #94a3b8; }
          .card-actions { border-top-color: #334155; }
          .card-action-btn { background: #0f172a; border-color: #334155; color: #e2e8f0; }
          .card-action-btn:hover { background: #1e293b; }
          .action-btn.edit:hover { background: #064e3b; }
          .action-btn.delete:hover { background: #7f1d1d; }
          .delete-icon { background: #7f1d1d; }
          .item-name { background: #334155; color: #f1f5f9; }
          .modal-btn-cancel { background: #334155; color: #e2e8f0; border-color: #475569; }
          .modal-btn-cancel:hover { background: #475569; }
          .btn-delete { background: #dc2626; }
          .btn-delete:hover { background: #b91c1c; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .admin-container { padding: 1rem; }
          .header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; flex-wrap: wrap; }
          .cards-grid { grid-template-columns: 1fr; }
          .modal { max-width: 95%; }
          .sous-location-name { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
          .sous-location-header { flex-wrap: wrap; gap: 0.5rem; }
          .sous-location-actions { margin-left: auto; }
        }
      `}</style>
    </div>
  );
}