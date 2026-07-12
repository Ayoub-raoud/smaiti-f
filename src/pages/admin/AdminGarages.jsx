// src/pages/admin/AdminGarages.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchGarages,
  selectGarages,
  selectGaragesLoading,
  createGarage,
  updateGarage, 
  deleteGarage
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Eye, Search, RefreshCw,
  ChevronLeft, ChevronRight, Building2, Phone, Mail,
  MapPin, IdCard, Activity, CheckCircle, XCircle,
  Save, TrashIcon, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown,
  Sparkles, Star, Briefcase, User, Crown, Shield, Key,
  Lock, Unlock, Download
} from "lucide-react";

export default function AdminGarages() {
  const dispatch = useDispatch();
  const garages = useSelector(selectGarages);
  const loading = useSelector(selectGaragesLoading);

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [garageToDelete, setGarageToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Form data
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    rc: "",
    if: "",
    ice: "",
    tp: "",
    notes: "",
    is_active: true,
  });

  const itemsPerPage = 10;

  // Load garages
  useEffect(() => {
    dispatch(fetchGarages());
  }, [dispatch]);

  // Sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc"
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />;
  };

  // Filter & sort
  const filteredGarages = useMemo(() => {
    return garages
      .filter((g) => {
        const matchesSearch =
          searchTerm === "" ||
          g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (g.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (g.phone || "").includes(searchTerm);
        return matchesSearch;
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortField) {
          case "id": aVal = a.id; bVal = b.id; break;
          case "name": aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
          case "phone": aVal = a.phone || ""; bVal = b.phone || ""; break;
          case "email": aVal = a.email || ""; bVal = b.email || ""; break;
          case "is_active": aVal = a.is_active ? 1 : 0; bVal = b.is_active ? 1 : 0; break;
          default: aVal = a.id; bVal = b.id;
        }
        return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [garages, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredGarages.length / itemsPerPage);
  const paginated = filteredGarages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: garages.length,
    active: garages.filter((g) => g.is_active).length,
    inactive: garages.filter((g) => !g.is_active).length,
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      phone: "",
      email: "",
      rc: "",
      if: "",
      ice: "",
      tp: "",
      notes: "",
      is_active: true,
    });
    setEditing(null);
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (garage) => {
    setEditing(garage);
    setFormData({
      name: garage.name || "",
      address: garage.address || "",
      phone: garage.phone || "",
      email: garage.email || "",
      rc: garage.rc || "",
      if: garage.if || "",
      ice: garage.ice || "",
      tp: garage.tp || "",
      notes: garage.notes || "",
      is_active: garage.is_active !== undefined ? garage.is_active : true,
    });
    setShowForm(true);
  };

  const handleDeleteClick = (garage) => {
    setGarageToDelete(garage);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!garageToDelete) return;
    // Use deleteGarage action (to be added)
    // For now, we'll assume it exists; if not, we can use axios directly.
    // We'll include the thunk in the answer.
    const result = await dispatch(deleteGarage(garageToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Garage supprimé");
      dispatch(fetchGarages(true));
    }
    setDeleteModalOpen(false);
    setGarageToDelete(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let result;
      if (editing) {
        result = await dispatch(updateGarage({ id: editing.id, data: formData }));
      } else {
        result = await dispatch(createGarage(formData));
      }
      if (result.error) toast.error(result.payload);
      else {
        toast.success(editing ? "Garage modifié" : "Garage créé");
        setShowForm(false);
        resetForm();
        dispatch(fetchGarages(true));
      }
    } catch (error) {
      toast.error("Erreur lors de l'opération");
    } finally {
      setSubmitting(false);
    }
  };

  const refreshData = async () => {
    await dispatch(fetchGarages(true));
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ["ID", "Nom", "Adresse", "Téléphone", "Email", "RC", "IF", "ICE", "TP", "Actif"];
    const csvData = filteredGarages.map((g) => [
      g.id,
      `"${g.name}"`,
      `"${g.address || ""}"`,
      `"${g.phone || ""}"`,
      `"${g.email || ""}"`,
      `"${g.rc || ""}"`,
      `"${g.if || ""}"`,
      `"${g.ice || ""}"`,
      `"${g.tp || ""}"`,
      g.is_active ? "Oui" : "Non",
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garages_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des garages...</p>
      </div>
    );
  }

  return (
    <>
      {/* ---- FORM (create / edit) ---- */}
      {showForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? "Modifier le garage" : "Nouveau garage"}</h2>
              <p>{editing ? "Modifiez les informations du garage" : "Ajoutez un nouveau garage"}</p>
            </div>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              className="inline-form-close"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="inline-form">
            <div className="inline-form-grid">
              {/* Left column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Building2 size={18} />
                    <h3>Informations générales</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Nom *</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="Garage Oulfa"
                      />
                    </div>
                    <div className="inline-field">
                      <label>Téléphone</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="06 12 34 56 78"
                      />
                    </div>
                    <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Adresse</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Rue des Garages, Casablanca"
                      />
                    </div>
                    <div className="inline-field" style={{ gridColumn: "1 / -1" }}>
                      <label>Email</label>
                      <input
                        type="email"
                        className="inline-input"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="contact@garage.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <IdCard size={18} />
                    <h3>Identifiants légaux</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>RC</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.rc}
                        onChange={(e) => setFormData({ ...formData, rc: e.target.value })}
                        placeholder="580419"
                      />
                    </div>
                    <div className="inline-field">
                      <label>IF</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.if}
                        onChange={(e) => setFormData({ ...formData, if: e.target.value })}
                        placeholder="53743931"
                      />
                    </div>
                    <div className="inline-field">
                      <label>ICE</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.ice}
                        onChange={(e) => setFormData({ ...formData, ice: e.target.value })}
                        placeholder="003274706000087"
                      />
                    </div>
                    <div className="inline-field">
                      <label>TP</label>
                      <input
                        type="text"
                        className="inline-input"
                        value={formData.tp}
                        onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                        placeholder="35007229"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Activity size={18} />
                    <h3>Statut et notes</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Actif</label>
                      <select
                        className="inline-select"
                        value={formData.is_active ? "1" : "0"}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "1" })}
                      >
                        <option value="1">Oui</option>
                        <option value="0">Non</option>
                      </select>
                    </div>
                  </div>
                  <div className="inline-field" style={{ marginTop: "1rem" }}>
                    <label>Notes</label>
                    <textarea
                      rows="4"
                      className="inline-textarea"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Informations supplémentaires..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button
                type="button"
                className="inline-secondary-btn"
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {submitting ? "Traitement..." : editing ? "Mettre à jour" : "Créer le garage"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---- MAIN LIST ---- */}
      {!showForm && (
        <div className="admin-container">
          <div className="header">
            <div>
              <h1 className="title">Gestion des Garages</h1>
              <p className="subtitle">Liste des garages partenaires</p>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshData} className="btn btn-secondary">
                <RefreshCw size={16} /> Actualiser
              </button>
              <button onClick={handleExport} className="btn btn-secondary">
                <Download size={16} /> Exporter
              </button>
              <button onClick={handleAddNew} className="btn btn-primary">
                <Plus size={16} /> Nouveau garage
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div><p className="stat-label">Total</p><p className="stat-number">{stats.total}</p></div>
              <Building2 size={32} className="stat-icon" />
            </div>
            <div className="stat-card">
              <div><p className="stat-label">Actifs</p><p className="stat-number text-green">{stats.active}</p></div>
              <CheckCircle size={32} className="stat-icon text-green" />
            </div>
            <div className="stat-card">
              <div><p className="stat-label">Inactifs</p><p className="stat-number text-red">{stats.inactive}</p></div>
              <XCircle size={32} className="stat-icon text-red" />
            </div>
          </div>

          {/* Search */}
          <div className="search-wrapper">
            <div className="search-row">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, adresse, téléphone..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="search-input"
                />
              </div>
            </div>
          </div>

          <div className="table-info">
            <p className="table-info-text">{filteredGarages.length} garage(s) trouvé(s)</p>
            <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
          </div>

          <div className="table-wrapper">
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("id")} className="sortable-header">
                      ID {getSortIcon("id")}
                    </th>
                    <th onClick={() => handleSort("name")} className="sortable-header">
                      Nom {getSortIcon("name")}
                    </th>
                    <th>Adresse</th>
                    <th onClick={() => handleSort("phone")} className="sortable-header">
                      Téléphone {getSortIcon("phone")}
                    </th>
                    <th onClick={() => handleSort("email")} className="sortable-header">
                      Email {getSortIcon("email")}
                    </th>
                    <th onClick={() => handleSort("is_active")} className="sortable-header">
                      Statut {getSortIcon("is_active")}
                    </th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-12">Aucun garage trouvé</td></tr>
                  ) : (
                    paginated.map((g) => (
                      <tr key={g.id}>
                        <td className="font-medium">#{g.id}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Building2 size={14} />
                            {g.name}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            {g.address || "—"}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Phone size={14} />
                            {g.phone || "—"}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Mail size={14} />
                            {g.email || "—"}
                          </div>
                        </td>
                        <td>
                          {g.is_active ? (
                            <span className="badge badge-success"><CheckCircle size={12} /> Actif</span>
                          ) : (
                            <span className="badge badge-danger"><XCircle size={12} /> Inactif</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="action-buttons">
                            <button onClick={() => handleEdit(g)} className="action-btn action-btn-edit" title="Modifier">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteClick(g)} className="action-btn action-btn-delete" title="Supprimer">
                              <Trash2 size={16} />
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
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  <ChevronLeft size={16} />
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 3 + i;
                    if (pageNum > totalPages) return null;
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`page-btn ${currentPage === pageNum ? "active" : ""}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- DELETE MODAL ---- */}
      {deleteModalOpen && garageToDelete && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="delete-icon"><TrashIcon size={32} /></div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer le garage <br />
              <span className="garage-name">{garageToDelete.name}</span> ?<br />
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
        /* Reuse the same styles from AdminAccidents / AdminUsers */
        /* All CSS is identical to the other pages – we include it for completeness */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif; background: #f8fafc; }

        .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
        .sortable-header:hover { background-color: #e2e8f0; }
        .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; vertical-align: middle; }
        .sort-icon.active { opacity: 1; color: #eab308; }

        .inline-form-container { background: white; border-radius: 32px; margin: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; }
        .inline-form-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 32px; display: flex; align-items: center; gap: 20px; position: relative; }
        .inline-form-icon { width: 56px; height: 56px; background: #eab308; border-radius: 28px; display: flex; align-items: center; justify-content: center; color: #1a1a2e; }
        .inline-form-title h2 { color: #eab308; font-size: 1.75rem; font-weight: 700; margin: 0; }
        .inline-form-title p { color: rgba(255,255,255,0.7); font-size: 0.875rem; margin: 4px 0 0 0; }
        .inline-form-close { position: absolute; top: 24px; right: 28px; background: rgba(255,255,255,0.1); border: none; border-radius: 40px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: all 0.2s; }
        .inline-form-close:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
        .inline-form { padding: 28px 32px; }
        .inline-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
        .inline-form-col { display: flex; flex-direction: column; gap: 24px; }
        .inline-section { background: #f8fafc; border-radius: 24px; padding: 20px; border: 1px solid #e2e8f0; }
        .inline-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #eab308; }
        .inline-section-header h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }
        .inline-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .inline-field { display: flex; flex-direction: column; gap: 6px; }
        .inline-field label { font-size: 0.7rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
        .inline-input, .inline-select, .inline-textarea { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.875rem; transition: all 0.2s; background: white; font-family: inherit; }
        .inline-input:focus, .inline-select:focus, .inline-textarea:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234,179,8,0.1); }
        .inline-textarea { resize: vertical; min-height: 80px; }
        .inline-form-footer { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 24px; }
        .inline-secondary-btn { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
        .inline-primary-btn { background: linear-gradient(135deg, #1a1a2e, #16213e); border: none; padding: 12px 28px; border-radius: 40px; font-size: 0.875rem; font-weight: 600; color: #eab308; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .inline-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(26,26,46,0.4); color: #fbbf24; }
        .inline-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
        .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .btn-secondary { background: #f1f5f9; color: #1e293b; }
        .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
        .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .stat-number { font-size: 1.875rem; font-weight: 700; }
        .stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-icon { opacity: 0.5; }
        .text-green { color: #16a34a; }
        .text-red { color: #dc2626; }

        .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
        .search-row { display: flex; flex-wrap: wrap; gap: 1rem; }
        .search-container { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; }
        .search-input { width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; transition: all 0.2s; }
        .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15,23,42,0.1); }

        .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
        .table-info-text { font-size: 0.875rem; color: #64748b; }
        .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
        .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; }
        .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; }
        .table tr:hover { background: #f8fafc; }
        .font-medium { font-weight: 500; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .py-12 { padding: 3rem 0; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-2 { gap: 0.5rem; }

        .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }

        .action-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
        .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn-edit { color: #10b981; }
        .action-btn-edit:hover { background: #ecfdf5; }
        .action-btn-delete { color: #ef4444; }
        .action-btn-delete:hover { background: #fef2f2; }

        .pagination { display: flex; justify-content: center; gap: 0.25rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
        .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .page-btn:hover:not(:disabled) { background: #f1f5f9; }
        .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 28rem; width: 100%; animation: slideUp 0.3s ease; }
        .delete-modal { max-width: 28rem; padding: 1.5rem; }
        .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; }
        .delete-title { text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .delete-message { text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
        .garage-name { font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.5rem; display: inline-block; }
        .delete-actions { display: flex; gap: 0.75rem; padding-top: 1rem; }
        .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
        .modal-btn-cancel:hover { background: #f8fafc; }
        .btn-delete { background: #ef4444; color: white; }
        .btn-delete:hover { background: #dc2626; }

        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 1024px) { .inline-form-grid { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 768px) {
          .admin-container { padding: 1rem; }
          .header { flex-direction: column; align-items: flex-start; }
          .search-row { flex-direction: column; }
          .inline-grid-2 { grid-template-columns: 1fr; }
          .inline-form-container { margin: 1rem; }
          .inline-form-header { padding: 16px 20px; }
          .inline-form-header h2 { font-size: 1.25rem; }
          .inline-form { padding: 20px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .table-wrapper, .search-wrapper, .modal, .inline-form-container {
            background: #1e293b; border-color: #334155;
          }
          .stat-label, .table-info-text, .table th, .subtitle, .delete-message {
            color: #94a3b8;
          }
          .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .btn-secondary { background: #334155; color: #e2e8f0; }
          .btn-secondary:hover { background: #475569; }
          .search-input, .inline-input, .inline-select, .inline-textarea {
            background: #0f172a; border-color: #334155; color: #f1f5f9;
          }
          .inline-section { background: #0f172a; border-color: #334155; }
          .inline-section-header h3 { color: #f1f5f9; }
          .page-btn { background: #1e293b; border-color: #475569; color: #e2e8f0; }
          .page-btn.active { background: #f59e0b; color: #0f172a; }
          .badge-success { background: #14532d; color: #4ade80; }
          .badge-danger { background: #7f1d1d; color: #fca5a5; }
          .action-btn-edit:hover { background: #064e3b; }
          .action-btn-delete:hover { background: #7f1d1d; }
          .table tr:hover { background: #334155; }
          .delete-icon { background: #7f1d1d; }
          .garage-name { background: #334155; color: #f1f5f9; }
          .sortable-header:hover { background-color: #334155; }
        }
      `}</style>
    </>
  );
}