// src/pages/admin/AdminContacts.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchContacts,
  deleteContact,
  selectContacts,
  selectContactsLoading,
  fetchContactsCount,
  fetchRecentContacts,
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { toast } from "sonner";
import {
  Trash2, Eye, Search, RefreshCw, ChevronLeft, ChevronRight,
  Mail, Phone, User, Calendar, MessageSquare, X, ArrowUpDown,
  ArrowUp, ArrowDown, Download, TrashIcon, AlertTriangle,
  Inbox, Clock, Sparkles
} from "lucide-react";

export default function AdminContacts() {
  const dispatch = useDispatch();
  const contacts = useSelector(selectContacts);
  const loading = useSelector(selectContactsLoading);

  // UI state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

const [itemsPerPage, setItemsPerPage] = useState(10);
  // Load contacts
  useEffect(() => {
    dispatch(fetchContacts());
    dispatch(fetchContactsCount());
    dispatch(fetchRecentContacts());
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
  const filteredContacts = useMemo(() => {
    return contacts
      .filter((c) => {
        const matchesSearch =
          searchTerm === "" ||
          c.fullname.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.phone.includes(searchTerm) ||
          c.message.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => {
        let aVal, bVal;
        switch (sortField) {
          case "id": aVal = a.id; bVal = b.id; break;
          case "fullname": aVal = a.fullname.toLowerCase(); bVal = b.fullname.toLowerCase(); break;
          case "email": aVal = a.email.toLowerCase(); bVal = b.email.toLowerCase(); break;
          case "phone": aVal = a.phone || ""; bVal = b.phone || ""; break;
          case "created_at": aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); break;
          default: aVal = a.id; bVal = b.id;
        }
        return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
  }, [contacts, searchTerm, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginated = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: contacts.length,
    // You can add more stats if needed (e.g., messages per day)
  };

  const handleDeleteClick = (contact) => {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;
    const result = await dispatch(deleteContact(contactToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Message supprimé");
      dispatch(fetchContacts(true));
      dispatch(fetchContactsCount());
    }
    setDeleteModalOpen(false);
    setContactToDelete(null);
  };

  const handleViewDetails = (contact) => {
    setSelectedContact(contact);
    setShowDetails(true);
  };

  const refreshData = async () => {
    await dispatch(fetchContacts(true));
    await dispatch(fetchContactsCount());
    await dispatch(fetchRecentContacts());
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ["ID", "Nom", "Email", "Téléphone", "Message", "Date"];
    const csvData = filteredContacts.map((c) => [
      c.id,
      `"${c.fullname}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.message.replace(/"/g, '""')}"`,
      `"${new Date(c.created_at).toLocaleDateString("fr-FR")}"`,
    ].join(","));
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  // Loading
  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des messages...</p>
      </div>
    );
  }

  return (
    <>
      {/* ---- DETAILS MODAL ---- */}
      {showDetails && selectedContact && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal details-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title"><MessageSquare size={20} /> Détails du message</h3>
              <button onClick={() => setShowDetails(false)} className="modal-close"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Nom complet</label>
                  <p>{selectedContact.fullname}</p>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <p><a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a></p>
                </div>
                <div className="detail-item">
                  <label>Téléphone</label>
                  <p><a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a></p>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <label>Message</label>
                  <div className="message-content">{selectedContact.message}</div>
                </div>
                <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                  <label>Reçu le</label>
                  <p>{new Date(selectedContact.created_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDetails(false)} className="btn-secondary-full">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- MAIN LIST ---- */}
      <div className="admin-container">
        <div className="header">
          <div>
            <h1 className="title">Messages de Contact</h1>
            <p className="subtitle">Liste des messages reçus via le formulaire de contact</p>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshData} className="btn btn-secondary">
              <RefreshCw size={16} /> Actualiser
            </button>
            <button onClick={handleExport} className="btn btn-secondary">
              <Download size={16} /> Exporter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div><p className="stat-label">Total</p><p className="stat-number">{stats.total}</p></div>
            <Inbox size={32} className="stat-icon" />
          </div>
          <div className="stat-card">
            <div><p className="stat-label">Dernier message</p>
              <p className="stat-number" style={{ fontSize: "1rem" }}>
                {contacts.length > 0 ? new Date(contacts[0].created_at).toLocaleDateString("fr-FR") : "—"}
              </p>
            </div>
            <Clock size={32} className="stat-icon" />
          </div>
        </div>

        {/* Search */}
        <div className="search-wrapper">
          <div className="search-row">
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone ou message..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="search-input"
              />
            </div>
          </div>
        </div>

        <div className="table-info">
          <p className="table-info-text">{filteredContacts.length} message(s) trouvé(s)</p>
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
                  <th onClick={() => handleSort("fullname")} className="sortable-header">
                    Nom {getSortIcon("fullname")}
                  </th>
                  <th onClick={() => handleSort("email")} className="sortable-header">
                    Email {getSortIcon("email")}
                  </th>
                  <th onClick={() => handleSort("phone")} className="sortable-header">
                    Téléphone {getSortIcon("phone")}
                  </th>
                  <th>Message (extrait)</th>
                  <th onClick={() => handleSort("created_at")} className="sortable-header">
                    Date {getSortIcon("created_at")}
                  </th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12">Aucun message trouvé</td></tr>
                ) : (
                  paginated.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">#{c.id}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          {c.fullname}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Mail size={14} />
                          {c.email}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          {c.phone}
                        </div>
                      </td>
                      <td>
                        <div className="message-preview">
                          {c.message.length > 60 ? c.message.slice(0, 60) + "..." : c.message}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          {new Date(c.created_at).toLocaleDateString("fr-FR")}
                        </div>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button onClick={() => handleViewDetails(c)} className="action-btn action-btn-view" title="Voir">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => handleDeleteClick(c)} className="action-btn action-btn-delete" title="Supprimer">
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
  <PaginationControls
    currentPage={currentPage}
    totalPages={totalPages}
    onPageChange={setCurrentPage}
    itemsPerPage={itemsPerPage}
    onItemsPerPageChange={setItemsPerPage}
    totalItems={filteredContacts.length}
  />
)}
        </div>
      </div>

      {/* ---- DELETE MODAL ---- */}
      {deleteModalOpen && contactToDelete && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="delete-icon"><TrashIcon size={32} /></div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer le message de <br />
              <span className="contact-name">{contactToDelete.fullname}</span> ?<br />
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
        /* Same base styles as AdminGarages – we import them here */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif; background: #f8fafc; }

        .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
        .sortable-header:hover { background-color: #e2e8f0; }
        .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; vertical-align: middle; }
        .sort-icon.active { opacity: 1; color: #eab308; }

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
        .message-preview { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #475569; }

        .action-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap; }
        .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn-view { color: #3b82f6; }
        .action-btn-view:hover { background: #eff6ff; }
        .action-btn-delete { color: #ef4444; }
        .action-btn-delete:hover { background: #fef2f2; }

        .pagination { display: flex; justify-content: center; gap: 0.25rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
        .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .page-btn:hover:not(:disabled) { background: #f1f5f9; }
        .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal */
        .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 32rem; width: 100%; animation: slideUp 0.3s ease; }
        .details-modal { max-width: 40rem; }
        .delete-modal { max-width: 28rem; padding: 1.5rem; }
        .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; }
        .delete-title { text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .delete-message { text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
        .contact-name { font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.5rem; display: inline-block; }
        .delete-actions { display: flex; gap: 0.75rem; padding-top: 1rem; }
        .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
        .modal-btn-cancel:hover { background: #f8fafc; }
        .btn-delete { background: #ef4444; color: white; }
        .btn-delete:hover { background: #dc2626; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 0 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #e2e8f0; }
        .modal-body { padding: 1.5rem; }
        .modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; }
        .btn-secondary-full { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-secondary-full:hover { border-color: #eab308; color: #eab308; }

        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .detail-item { display: flex; flex-direction: column; }
        .detail-item label { font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
        .detail-item p { font-size: 0.875rem; margin: 0; }
        .detail-item a { color: #eab308; text-decoration: none; }
        .detail-item a:hover { text-decoration: underline; }
        .message-content { background: #f8fafc; border-radius: 0.75rem; padding: 1rem; white-space: pre-wrap; font-size: 0.875rem; border: 1px solid #e2e8f0; min-height: 80px; }

        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .admin-container { padding: 1rem; }
          .header { flex-direction: column; align-items: flex-start; }
          .search-row { flex-direction: column; }
          .details-grid { grid-template-columns: 1fr; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .message-preview { max-width: 120px; }
        }
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .table-wrapper, .search-wrapper, .modal {
            background: #1e293b; border-color: #334155;
          }
          .stat-label, .table-info-text, .table th, .subtitle, .delete-message, .detail-item label {
            color: #94a3b8;
          }
          .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .btn-secondary { background: #334155; color: #e2e8f0; }
          .btn-secondary:hover { background: #475569; }
          .search-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .page-btn { background: #1e293b; border-color: #475569; color: #e2e8f0; }
          .page-btn.active { background: #f59e0b; color: #0f172a; }
          .action-btn-view:hover { background: #1e3a5f; }
          .action-btn-delete:hover { background: #7f1d1d; }
          .table tr:hover { background: #334155; }
          .delete-icon { background: #7f1d1d; }
          .contact-name { background: #334155; color: #f1f5f9; }
          .message-content { background: #0f172a; border-color: #334155; color: #e2e8f0; }
          .sortable-header:hover { background-color: #334155; }
        }
      `}</style>
    </>
  );
}