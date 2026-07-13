// src/pages/admin/AdminClients.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchClients, createClient, updateClient, deleteClient,
  selectClients, selectClientsLoading, fetchReservations,
  selectReservations, fetchAccidents, selectAccidents,
  selectCars, selectMatricules, api
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Search, RefreshCw, User, Phone, Mail,
  IdCard, MapPin, Calendar, FileText, CreditCard, Save, TrashIcon,
  Users, Building2, UserCheck, Camera, Upload, AlertTriangle,
  ChevronLeft, ChevronRight, Gift, Star, Clock, Shield, Eye,
  DollarSign, History, Receipt, Car, AlertCircle, CheckCircle,
  FileWarning, TrendingUp, TrendingDown, Wallet, CalendarDays,
  Sparkles, Gem, Award, Heart, Zap, ArrowUpDown, ArrowUp, ArrowDown,
  Info, Activity, Key, Lock, Unlock, Crown, Briefcase, ArrowLeft,
  Download, ExternalLink
} from "lucide-react";
import { getImageUrl } from '../../utils/imageUtils';

export default function AdminClients() {
  const dispatch = useDispatch();
  const clients = useSelector(selectClients);
  const loading = useSelector(selectClientsLoading);
  const reservations = useSelector(selectReservations);
  const accidents = useSelector(selectAccidents);
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);

  const [showClientForm, setShowClientForm] = useState(false);
  const [showClientDetails, setShowClientDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [cinPreview, setCinPreview] = useState('');
  const [licensePreview, setLicensePreview] = useState('');
  const [activeTab, setActiveTab] = useState('reservations');
  const [dataLoaded, setDataLoaded] = useState(false);

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    telephone: "",
    email: "",
    city: "",
    cin_number: "",
    driver_license_number: "",
    cin_image: "",
    driver_license_image: "",
    date_naissance: "",
    lieu_naissance: "",
    cin_delivre_le: "",
    permis_delivre_le: ""
  });

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        dispatch(fetchClients()),
        dispatch(fetchReservations()),
        dispatch(fetchAccidents())
      ]);
      setDataLoaded(true);
    };
    loadData();
  }, [dispatch]);

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
    return sortDirection === "asc" ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
  };

  const getCarForReservation = (reservation) => {
    if (reservation.car) return reservation.car;
    if (reservation.car_id && cars && cars.length > 0) {
      return cars.find(c => c.id === reservation.car_id);
    }
    return null;
  };

  const getMatriculeForReservation = (reservation) => {
    if (reservation.matricule) return reservation.matricule;
    if (reservation.matricule_id && matricules && matricules.length > 0) {
      return matricules.find(m => m.id === reservation.matricule_id);
    }
    return null;
  };

  const handleFileChange = (field, file) => {
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le fichier ne doit pas dépasser 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result });
        if (field === 'cin_image') setCinPreview(reader.result);
        if (field === 'driver_license_image') setLicensePreview(reader.result);
      };
      reader.onerror = () => {
        toast.error("Erreur lors de la lecture du fichier");
      };
      reader.readAsDataURL(file);
    }
  };

  const getClientReservations = (clientId) => {
    if (!reservations || !Array.isArray(reservations)) return [];
    return reservations
      .filter(r => r.client_id === clientId)
      .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date));
  };

  const getClientAccidents = (clientId) => {
    if (!accidents || !Array.isArray(accidents)) return [];
    return accidents
      .filter(a => a.client_id === clientId)
      .sort((a, b) => new Date(b.date_accident) - new Date(a.date_accident));
  };

  const getClientStats = (clientId) => {
    const clientReservations = getClientReservations(clientId);

    const totalSpent = clientReservations.reduce((sum, r) => sum + (Number(r.total_price) || 0), 0);
    const totalPaid = clientReservations.reduce((sum, r) => sum + (Number(r.amount_paid) || 0), 0);
    const totalRemaining = clientReservations.reduce((sum, r) => sum + (Number(r.remaining_amount) || 0), 0);
    const activeReservations = clientReservations.filter(r => r.status === 'confirmed' || r.status === 'retard').length;
    const completedReservations = clientReservations.filter(r => r.status === 'completed').length;
    const cancelledReservations = clientReservations.filter(r => r.status === 'cancelled').length;
    const accidentCount = getClientAccidents(clientId).length;

    return {
      totalSpent,
      totalPaid,
      totalRemaining,
      activeReservations,
      completedReservations,
      cancelledReservations,
      totalReservations: clientReservations.length,
      accidentCount
    };
  };

  const filteredClients = clients && Array.isArray(clients) ? clients.filter(c =>
    searchTerm === '' ||
    `${c.prenom} ${c.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telephone?.includes(searchTerm) ||
    c.cin_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "id": aVal = a.id; bVal = b.id; break;
      case "name": aVal = `${a.prenom} ${a.nom}`.toLowerCase(); bVal = `${b.prenom} ${b.nom}`.toLowerCase(); break;
      case "telephone": aVal = a.telephone || ""; bVal = b.telephone || ""; break;
      case "cin": aVal = a.cin_number || ""; bVal = b.cin_number || ""; break;
      case "city": aVal = a.city || ""; bVal = b.city || ""; break;
      default: aVal = a.id; bVal = b.id;
    }
    if (sortDirection === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  }) : [];

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-warning", label: "En attente", icon: Clock },
      confirmed: { class: "badge-success", label: "Confirmée", icon: CheckCircle },
      contacted: { class: "badge-purple", label: "Contacté", icon: Phone },
      completed: { class: "badge-blue", label: "Terminée", icon: CheckCircle },
      cancelled: { class: "badge-gray", label: "Annulée", icon: X },
      retard: { class: "badge-danger", label: "En retard", icon: AlertTriangle }
    };
    const c = config[status] || config.pending;
    const IconComponent = c.icon;
    return (
      <span className={`badge ${c.class}`}>
        <IconComponent size={12} />
        {c.label}
      </span>
    );
  };

  const getAccidentStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-warning", label: "En attente" },
      evaluation_owner: { class: "badge-info", label: "Évaluation propriétaire" },
      'contact expert': { class: "badge-purple", label: "Contact expert" },
      evaluation_expert: { class: "badge-info", label: "Évaluation expert" },
      fixed: { class: "badge-blue", label: "Réparation" },
      waiting: { class: "badge-warning", label: "En attente" },
      completed: { class: "badge-success", label: "Terminé" }
    };
    const c = config[status] || { class: "badge-gray", label: status };
    return <span className={`badge ${c.class}`}>{c.label}</span>;
  };

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

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(num);
  };

  const getPaymentHistoryArray = (reservation) => {
    if (!reservation.payment_history) return [];
    if (Array.isArray(reservation.payment_history)) return reservation.payment_history;
    if (typeof reservation.payment_history === 'string') {
      try {
        const parsed = JSON.parse(reservation.payment_history);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // ============== FIXED DOWNLOAD FUNCTION ==============
  const downloadFile = async (url, filename) => {
    try {
      toast.info("Téléchargement en cours...");

      // 1. Data URL (base64) – fetch directly
      if (url.startsWith('data:')) {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        toast.success("Téléchargement terminé");
        return;
      }

      // 2. Extract the path from the URL
      let path = url;
      try {
        const parsed = new URL(url);
        // If the origin is the same as the API base or the current window, use pathname
        const apiOrigin = 'https://smaiti-b-production.up.railway.app';
        if (parsed.origin === window.location.origin || parsed.origin === apiOrigin) {
          path = parsed.pathname;
        } else {
          // Different origin – fallback to direct fetch with auth header
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename || 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          toast.success("Téléchargement terminé");
          return;
        }
      } catch (e) {
        // If URL parsing fails, treat as relative path
        path = url.startsWith('/') ? url : `/${url}`;
      }

      // 3. Use the configured API instance (adds auth and base URL)
      // If path starts with /api/, remove that because api.baseURL already includes /api
      if (path.startsWith('/api/')) {
        path = path.substring(4); // remove '/api'
      }

      const response = await api.get(path, { responseType: 'blob' });
      const blob = response.data;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      toast.success("Téléchargement terminé");
    } catch (error) {
      console.error('Download error:', error);
      // Final fallback: open in new tab with download attribute
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Téléchargement lancé (fallback)");
      } catch (fallbackError) {
        toast.error("Erreur lors du téléchargement. Veuillez essayer de cliquer droit et 'Enregistrer sous'.");
      }
    }
  };

  // ---- PDF detection ----
  const isPdfFile = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.startsWith('data:application/pdf')) return true;
    if (lower.endsWith('.pdf')) return true;
    return false;
  };

  // ---- Render document preview in details view ----
  const renderDocumentPreview = (url, label) => {
    if (!url) return null;
    const fullUrl = getImageUrl(url);
    if (!fullUrl) return null;

    const isPdf = isPdfFile(fullUrl);
    const filename = fullUrl.split('/').pop() || `${label.toLowerCase().replace(/\s/g, '_')}.pdf`;

    if (isPdf) {
      return (
        <div className="document-card pdf-card">
          <div className="pdf-icon-wrapper">
            <FileText size={48} className="pdf-icon" />
          </div>
          <div className="pdf-actions">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn view"
            >
              <ExternalLink size={14} /> Voir PDF
            </a>
            <button
              onClick={() => downloadFile(fullUrl, filename)}
              className="pdf-action-btn download"
            >
              <Download size={14} /> Télécharger
            </button>
          </div>
          <span className="document-label">{label}</span>
        </div>
      );
    }

    return (
      <div className="document-card">
        <img src={fullUrl} alt={label} className="document-image" />
        <span className="document-label">{label}</span>
      </div>
    );
  };

  // ---- Render preview in form (for base64 data URLs) ----
  const renderFormDocumentPreview = (dataUrl, label, onRemove) => {
    if (!dataUrl) return null;

    const isPdf = isPdfFile(dataUrl);
    const filename = `${label.toLowerCase().replace(/\s/g, '_')}.pdf`;

    if (isPdf) {
      return (
        <div className="image-preview-container pdf-preview-container">
          <div className="pdf-icon-wrapper">
            <FileText size={40} className="pdf-icon" />
          </div>
          <div className="pdf-actions small">
            <a
              href={dataUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pdf-action-btn view"
            >
              <ExternalLink size={12} /> Voir
            </a>
            <button
              onClick={() => downloadFile(dataUrl, filename)}
              className="pdf-action-btn download"
            >
              <Download size={12} /> Télécharger
            </button>
          </div>
          <button
            type="button"
            className="remove-image-btn"
            onClick={onRemove}
          >
            <X size={14} /> Supprimer
          </button>
        </div>
      );
    }

    return (
      <div className="image-preview-container">
        <img src={dataUrl} alt={label} className="image-preview" />
        <button
          type="button"
          className="remove-image-btn"
          onClick={onRemove}
        >
          <X size={14} /> Supprimer
        </button>
      </div>
    );
  };

  const handleCreateClient = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(createClient(data)).unwrap();
      toast.success("Client ajouté avec succès!");
      setShowClientForm(false);
      setEditingClient(null);
      setCinPreview('');
      setLicensePreview('');
      await dispatch(fetchClients(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateClient = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(updateClient({ id: editingClient.id, data })).unwrap();
      toast.success("Client modifié avec succès!");
      setShowClientForm(false);
      setEditingClient(null);
      setCinPreview('');
      setLicensePreview('');
      await dispatch(fetchClients(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      email: client.email || "",
      city: client.city || "",
      cin_number: client.cin_number || "",
      driver_license_number: client.driver_license_number || "",
      cin_image: client.cin_image || "",
      driver_license_image: client.driver_license_image || "",
      date_naissance: formatDateForInput(client.date_naissance),
      lieu_naissance: client.lieu_naissance || "",
      cin_delivre_le: formatDateForInput(client.cin_delivre_le),
      permis_delivre_le: formatDateForInput(client.permis_delivre_le)
    });
    setCinPreview(client.cin_image_url || '');
    setLicensePreview(client.driver_license_image_url || '');
    setShowClientForm(true);
  };

  const handleAddNew = () => {
    setEditingClient(null);
    resetForm();
    setCinPreview('');
    setLicensePreview('');
    setShowClientForm(true);
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      prenom: "",
      telephone: "",
      email: "",
      city: "",
      cin_number: "",
      driver_license_number: "",
      cin_image: "",
      driver_license_image: "",
      date_naissance: "",
      lieu_naissance: "",
      cin_delivre_le: "",
      permis_delivre_le: ""
    });
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    const result = await dispatch(deleteClient(clientToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Client supprimé avec succès");
      await dispatch(fetchClients(true));
    }
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const openDetails = (client) => {
    setSelectedClient(client);
    setShowClientDetails(true);
    setActiveTab('reservations');
  };

  const refreshData = async () => {
    await Promise.all([
      dispatch(fetchClients(true)),
      dispatch(fetchReservations(true)),
      dispatch(fetchAccidents(true))
    ]);
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ['ID', 'Nom', 'Prénom', 'Téléphone', 'Email', 'Ville', 'CIN', 'Permis', 'Date naissance', 'Lieu naissance'];
    const csvData = filteredClients.map(c => [
      c.id,
      `"${c.nom}"`,
      `"${c.prenom}"`,
      c.telephone,
      c.email || '',
      c.city || '',
      c.cin_number || '',
      c.driver_license_number || '',
      c.date_naissance || '',
      c.lieu_naissance || ''
    ].join(','));
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const stats = {
    total: clients?.length || 0,
    withCin: clients?.filter(c => c.cin_number).length || 0,
    withLicense: clients?.filter(c => c.driver_license_number).length || 0,
    withEmail: clients?.filter(c => c.email).length || 0,
  };

  if (loading && !dataLoaded) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Chargement des clients...</p>
    </div>
  );

  return (
    <>
      {showClientDetails && selectedClient && (
        <div className="inline-details-container">
          <div className="inline-details-header">
            <div className="inline-details-icon"><User size={28} /></div>
            <div className="inline-details-title">
              <h2>Détails du client</h2>
              <p>{selectedClient.prenom} {selectedClient.nom}</p>
            </div>
            <button onClick={() => setShowClientDetails(false)} className="inline-details-close"><X size={24} /></button>
          </div>

          <div className="inline-details-content">
            <div className="client-profile-section">
              <div className="client-profile-header">
                <div className="client-avatar"><User size={48} /></div>
                <div className="client-profile-info">
                  <h3>{selectedClient.prenom} {selectedClient.nom}</h3>
                  <div className="client-profile-details">
                    <span><Phone size={14} /> {selectedClient.telephone}</span>
                    {selectedClient.email && <span><Mail size={14} /> {selectedClient.email}</span>}
                    {selectedClient.city && <span><MapPin size={14} /> {selectedClient.city}</span>}
                  </div>
                </div>
                <div className="client-profile-actions">
                  <button onClick={() => { setShowClientDetails(false); handleEdit(selectedClient); }} className="details-action-btn edit">
                    <Edit2 size={16} /> Modifier
                  </button>
                </div>
              </div>

              <div className="client-identity-grid">
                <div className="identity-item"><span className="identity-label">CIN</span><span className="identity-value">{selectedClient.cin_number || "—"}</span></div>
                <div className="identity-item"><span className="identity-label">Permis</span><span className="identity-value">{selectedClient.driver_license_number || "—"}</span></div>
                <div className="identity-item"><span className="identity-label">Date naissance</span><span className="identity-value">{formatDate(selectedClient.date_naissance)}</span></div>
                <div className="identity-item"><span className="identity-label">Lieu naissance</span><span className="identity-value">{selectedClient.lieu_naissance || "—"}</span></div>
                <div className="identity-item"><span className="identity-label">CIN délivré le</span><span className="identity-value">{formatDate(selectedClient.cin_delivre_le)}</span></div>
                <div className="identity-item"><span className="identity-label">Permis délivré le</span><span className="identity-value">{formatDate(selectedClient.permis_delivre_le)}</span></div>
              </div>

              {(selectedClient.cin_image_url || selectedClient.driver_license_image_url) && (
                <div className="client-documents">
                  <h4>Documents scannés</h4>
                  <div className="documents-grid">
                    {selectedClient.cin_image_url && renderDocumentPreview(selectedClient.cin_image_url, "CIN")}
                    {selectedClient.driver_license_image_url && renderDocumentPreview(selectedClient.driver_license_image_url, "Permis de conduire")}
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const stats = getClientStats(selectedClient.id);
              return (
                <div className="client-stats-section">
                  <div className="stats-grid-5">
                    <div className="stat-item-details"><div className="stat-value">{stats.totalReservations}</div><div className="stat-label">Total réservations</div></div>
                    <div className="stat-item-details"><div className="stat-value text-warning">{stats.activeReservations}</div><div className="stat-label">Réservations actives</div></div>
                    <div className="stat-item-details"><div className="stat-value text-success">{stats.completedReservations}</div><div className="stat-label">Réservations terminées</div></div>
                    <div className="stat-item-details"><div className="stat-value text-danger">{stats.accidentCount}</div><div className="stat-label">Accidents</div></div>
                    <div className="stat-item-details"><div className="stat-value">{formatCurrency(stats.totalSpent)}</div><div className="stat-label">Total dépensé</div></div>
                    <div className="stat-item-details"><div className="stat-value text-success">{formatCurrency(stats.totalPaid)}</div><div className="stat-label">Total payé</div></div>
                    <div className="stat-item-details"><div className="stat-value text-danger">{formatCurrency(stats.totalRemaining)}</div><div className="stat-label">Reste à payer</div></div>
                  </div>
                </div>
              );
            })()}

            <div className="details-tabs-full">
              <button className={`details-tab-full ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => setActiveTab('reservations')}>
                <Calendar size={16} /> Réservations ({getClientReservations(selectedClient.id).length})
              </button>
              <button className={`details-tab-full ${activeTab === 'accidents' ? 'active' : ''}`} onClick={() => setActiveTab('accidents')}>
                <AlertTriangle size={16} /> Accidents ({getClientAccidents(selectedClient.id).length})
              </button>
              <button className={`details-tab-full ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
                <DollarSign size={16} /> Paiements
              </button>
            </div>

            <div className="tab-content-full">
              {activeTab === 'reservations' && (
                <div>
                  {getClientReservations(selectedClient.id).length === 0 ? (
                    <div className="empty-state-full"><Car size={64} className="empty-icon" /><p>Aucune réservation pour ce client</p></div>
                  ) : (
                    <div className="reservations-list">
                      {getClientReservations(selectedClient.id).map(res => {
                        const car = getCarForReservation(res);
                        const matricule = getMatriculeForReservation(res);
                        const days = res.rental_days || res.total_days || 1;
                        return (
                          <div key={res.id} className="reservation-card">
                            <div className="reservation-card-header"><div className="reservation-id">Réservation #{res.id}</div><div>{getStatusBadge(res.status)}</div></div>
                            <div className="reservation-card-body">
                              <div className="reservation-vehicle"><Car size={20} /><div><div className="vehicle-name">{car ? `${car.brand} ${car.model}` : '—'}</div><div className="vehicle-matricule">{matricule?.matricule_code || '—'}</div></div></div>
                              <div className="reservation-dates"><Calendar size={16} /><div><div>Du {formatDate(res.start_date)} à {res.start_time || "08:00"}</div><div>Au {formatDate(res.end_date)} à {res.end_time || "18:00"}</div><div className="days-count">{days} jours</div></div></div>
                              <div className="reservation-amounts"><DollarSign size={16} /><div><div>Total: <strong>{formatCurrency(res.total_price)}</strong></div><div>Payé: {formatCurrency(res.amount_paid)}</div><div className={res.remaining_amount > 0 ? 'text-danger' : 'text-success'}>Reste: {formatCurrency(res.remaining_amount)}</div></div></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'accidents' && (
                <div>
                  {getClientAccidents(selectedClient.id).length === 0 ? (
                    <div className="empty-state-full"><Shield size={64} className="empty-icon" /><p>Aucun accident pour ce client</p></div>
                  ) : (
                    <div className="accidents-list">
                      {getClientAccidents(selectedClient.id).map(acc => {
                        const car = acc.car;
                        const matricule = acc.matricule;
                        return (
                          <div key={acc.id} className="accident-card">
                            <div className="accident-card-header"><div className="accident-id">Accident #{acc.id}</div><div>{getAccidentStatusBadge(acc.status)}</div></div>
                            <div className="accident-card-body">
                              <div className="accident-date"><Calendar size={16} /><span>{formatDate(acc.date_accident)}</span></div>
                              <div className="accident-vehicle"><Car size={16} /><span>{car ? `${car.brand} ${car.model}` : '—'}</span><span className="matricule">{matricule?.matricule_code || '—'}</span></div>
                              <div className="accident-type"><span className={`badge ${acc.accident_type === 'grave' ? 'badge-danger' : 'badge-warning'}`}>{acc.accident_type === 'grave' ? 'Accident grave' : 'Accident non grave'}</span></div>
                              <div className="accident-amounts"><div>Pertes: {formatCurrency(acc.amount_of_losses)}</div><div>Assurance: {formatCurrency(acc.amount_assurance)}</div></div>
                              {acc.description && <div className="accident-description"><Info size={14} /><span>{acc.description}</span></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div>
                  {getClientReservations(selectedClient.id).filter(r => getPaymentHistoryArray(r).length > 0 || (r.amount_paid || 0) > 0).length === 0 ? (
                    <div className="empty-state-full"><Wallet size={64} className="empty-icon" /><p>Aucun historique de paiement</p></div>
                  ) : (
                    <div className="payments-list-full">
                      {getClientReservations(selectedClient.id)
                        .filter(r => getPaymentHistoryArray(r).length > 0 || (r.amount_paid || 0) > 0)
                        .map(res => {
                          const car = getCarForReservation(res);
                          const paymentHistory = getPaymentHistoryArray(res);
                          return (
                            <div key={res.id} className="payment-card-full">
                              <div className="payment-card-header-full">
                                <div><strong>Réservation #{res.id}</strong><span className="payment-car-name">{car ? `${car.brand} ${car.model}` : '—'}</span></div>
                                <div className="payment-amounts-full"><span>Total: {formatCurrency(res.total_price)}</span><span className="paid-amount">Payé: {formatCurrency(res.amount_paid)}</span><span className={`remaining-amount ${(res.remaining_amount || 0) > 0 ? 'negative' : 'positive'}`}>Reste: {formatCurrency(res.remaining_amount)}</span></div>
                              </div>
                              <div className="payment-card-body-full">
                                <div className="payment-history-title"><History size={14} /> Historique des paiements</div>
                                {paymentHistory.length > 0 ? (
                                  <div className="payment-items-full">
                                    {paymentHistory.map((payment, idx) => (
                                      <div key={idx} className="payment-item-full">
                                        <span className="payment-date">{formatDate(payment.date)}</span>
                                        <span className="payment-amount">{formatCurrency(payment.amount)}</span>
                                        <span className="payment-method">{payment.method === "cash" ? "Espèces" : payment.method === "card" ? "Carte" : payment.method === "check" ? "Chèque" : "Virement"}</span>
                                        {payment.notes && <span className="payment-notes">({payment.notes})</span>}
                                      </div>
                                    ))}
                                  </div>
                                ) : <div className="no-payments-full">Aucun paiement enregistré</div>}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="inline-details-footer">
            <button onClick={() => setShowClientDetails(false)} className="btn-secondary-full">Fermer</button>
          </div>
        </div>
      )}

      {showClientForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">{editingClient ? <Sparkles size={28} /> : <Star size={28} />}</div>
            <div className="inline-form-title">
              <h2>{editingClient ? "Modifier le client" : "Nouveau client"}</h2>
              <p>{editingClient ? "Modifiez les informations du client" : "Ajoutez un nouveau client à votre base de données"}</p>
            </div>
            <button onClick={() => { setShowClientForm(false); setEditingClient(null); resetForm(); setCinPreview(''); setLicensePreview(''); }} className="inline-form-close"><X size={24} /></button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingClient) {
              handleUpdateClient(formData);
            } else {
              handleCreateClient(formData);
            }
          }} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><User size={18} /><h3>Informations personnelles</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field"><label>Nom *</label><input type="text" className="inline-input" value={formData.nom} onChange={(e) => setFormData({...formData, nom: e.target.value})} required placeholder="Dupont" /></div>
                    <div className="inline-field"><label>Prénom *</label><input type="text" className="inline-input" value={formData.prenom} onChange={(e) => setFormData({...formData, prenom: e.target.value})} required placeholder="Jean" /></div>
                    <div className="inline-field"><label>Téléphone *</label><input type="tel" className="inline-input" value={formData.telephone} onChange={(e) => setFormData({...formData, telephone: e.target.value})} required placeholder="06 12 34 56 78" /></div>
                    <div className="inline-field"><label>Email</label><input type="email" className="inline-input" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="client@email.com" /></div>
                    <div className="inline-field"><label>Ville</label><input type="text" className="inline-input" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} placeholder="Casablanca" /></div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header"><IdCard size={18} /><h3>Pièces d'identité</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field"><label>Numéro CIN</label><input type="text" className="inline-input" value={formData.cin_number} onChange={(e) => setFormData({...formData, cin_number: e.target.value.toUpperCase()})} placeholder="AB123456" /></div>
                    <div className="inline-field"><label>Numéro Permis</label><input type="text" className="inline-input" value={formData.driver_license_number} onChange={(e) => setFormData({...formData, driver_license_number: e.target.value.toUpperCase()})} placeholder="P123456" /></div>
                    <div className="inline-field"><label>Date naissance</label><input type="date" className="inline-input" value={formData.date_naissance} onChange={(e) => setFormData({...formData, date_naissance: e.target.value})} /></div>
                    <div className="inline-field"><label>Lieu naissance</label><input type="text" className="inline-input" value={formData.lieu_naissance} onChange={(e) => setFormData({...formData, lieu_naissance: e.target.value})} placeholder="Casablanca" /></div>
                    <div className="inline-field"><label>CIN délivré le</label><input type="date" className="inline-input" value={formData.cin_delivre_le} onChange={(e) => setFormData({...formData, cin_delivre_le: e.target.value})} /></div>
                    <div className="inline-field"><label>Permis délivré le</label><input type="date" className="inline-input" value={formData.permis_delivre_le} onChange={(e) => setFormData({...formData, permis_delivre_le: e.target.value})} /></div>
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Camera size={18} /><h3>Documents scannés</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Image CIN</label>
                      <div className="image-upload-area" onClick={() => document.getElementById('cinInput').click()}>
                        <Upload size={24} /><p>Cliquez pour télécharger</p><p style={{ fontSize: '0.7rem', color: '#64748b' }}>JPG, PNG, PDF - 5MB max</p>
                        <input type="file" id="cinInput" accept="image/*,application/pdf" onChange={(e) => handleFileChange('cin_image', e.target.files[0])} style={{ display: 'none' }} />
                      </div>
                      {cinPreview && renderFormDocumentPreview(
                        cinPreview,
                        "CIN",
                        () => { setCinPreview(''); setFormData({...formData, cin_image: ''}); }
                      )}
                    </div>
                    <div className="inline-field">
                      <label>Image Permis</label>
                      <div className="image-upload-area" onClick={() => document.getElementById('licenseInput').click()}>
                        <Upload size={24} /><p>Cliquez pour télécharger</p><p style={{ fontSize: '0.7rem', color: '#64748b' }}>JPG, PNG, PDF - 5MB max</p>
                        <input type="file" id="licenseInput" accept="image/*,application/pdf" onChange={(e) => handleFileChange('driver_license_image', e.target.files[0])} style={{ display: 'none' }} />
                      </div>
                      {licensePreview && renderFormDocumentPreview(
                        licensePreview,
                        "Permis",
                        () => { setLicensePreview(''); setFormData({...formData, driver_license_image: ''}); }
                      )}
                    </div>
                  </div>
                  <div className="inline-info-message"><Info size={16} /><span>Les documents sont optionnels mais recommandés pour les dossiers clients</span></div>
                </div>

                {editingClient && (
                  <div className="inline-section">
                    <div className="inline-section-header"><Activity size={18} /><h3>Informations système</h3></div>
                    <div className="inline-info-grid">
                      <div className="inline-info-item"><span className="info-label">Date de création</span><span className="info-value">{editingClient.created_at ? formatDate(editingClient.created_at) : "—"}</span></div>
                      <div className="inline-info-item"><span className="info-label">Dernière modification</span><span className="info-value">{editingClient.updated_at ? formatDate(editingClient.updated_at) : "—"}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowClientForm(false); setEditingClient(null); resetForm(); setCinPreview(''); setLicensePreview(''); }}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>{submitting ? "Traitement..." : (editingClient ? "Mettre à jour" : "Créer le client")}</button>
            </div>
          </form>
        </div>
      )}

      {!showClientForm && !showClientDetails && (
        <div className="admin-container">
          <div className="header">
            <div><h1 className="title">Gestion des Clients</h1><p className="subtitle">Base de données clients et documents</p></div>
            <div className="header-actions">
              <button onClick={refreshData} className="btn btn-secondary"><RefreshCw size={16} /> Actualiser</button>
              <button onClick={handleExport} className="btn btn-secondary"><Save size={16} /> Exporter</button>
              <button onClick={handleAddNew} className="btn btn-primary"><Plus size={16} /> Nouveau Client</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div><p className="stat-label">Total clients</p><p className="stat-number">{stats.total}</p></div><Users size={32} className="stat-icon" /></div>
            <div className="stat-card"><div><p className="stat-label">CIN enregistré</p><p className="stat-number text-green">{stats.withCin}</p></div><IdCard size={32} className="stat-icon text-green" /></div>
            <div className="stat-card"><div><p className="stat-label">Permis enregistré</p><p className="stat-number text-emerald">{stats.withLicense}</p></div><FileText size={32} className="stat-icon text-emerald" /></div>
            <div className="stat-card"><div><p className="stat-label">Email renseigné</p><p className="stat-number text-blue">{stats.withEmail}</p></div><Mail size={32} className="stat-icon text-blue" /></div>
          </div>

          <div className="search-wrapper">
            <div className="search-container"><Search size={16} className="search-icon" /><input type="text" placeholder="Rechercher par nom, prénom, email, téléphone, CIN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" /></div>
          </div>

          <div className="table-info"><p className="table-info-text">{filteredClients.length} client(s) trouvé(s)</p><p className="table-info-text">Page {currentPage} / {totalPages || 1}</p></div>

          <div className="table-wrapper">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                    <th onClick={() => handleSort("name")} className="sortable-header">Client {getSortIcon("name")}</th>
                    <th onClick={() => handleSort("telephone")} className="sortable-header">Contact {getSortIcon("telephone")}</th>
                    <th onClick={() => handleSort("cin")} className="sortable-header">CIN {getSortIcon("cin")}</th>
                    <th>Permis</th>
                    <th onClick={() => handleSort("city")} className="sortable-header">Ville {getSortIcon("city")}</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">#{c.id}</td>
                      <td><div className="flex items-center gap-2"><User size={14} /><span className="font-medium">{c.prenom} {c.nom}</span></div></td>
                      <td><div className="flex flex-col gap-1"><div className="flex items-center gap-1"><Phone size={12} /> {c.telephone}</div>{c.email && <div className="flex items-center gap-1 text-xs" style={{ color: '#64748b' }}><Mail size={10} /> {c.email}</div>}</div></td>
                      <td>{c.cin_number ? <div className="flex items-center gap-1"><IdCard size={12} /> {c.cin_number}</div> : "—"}</td>
                      <td>{c.driver_license_number ? <div className="flex items-center gap-1"><CreditCard size={12} /> {c.driver_license_number}</div> : "—"}</td>
                      <td>{c.city ? <div className="flex items-center gap-1"><MapPin size={12} /> {c.city}</div> : "—"}</td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button onClick={() => openDetails(c)} className="action-btn action-btn-view" title="Détails"><Eye size={16} /></button>
                          <button onClick={() => handleEdit(c)} className="action-btn action-btn-edit" title="Modifier"><Edit2 size={16} /></button>
                          <button onClick={() => handleDeleteClick(c)} className="action-btn action-btn-delete" title="Supprimer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="page-btn"><ChevronLeft size={16} /></button>
                {[...Array(Math.min(totalPages,5))].map((_,i) => {
                  let p = i+1;
                  if(totalPages>5 && currentPage>3) { p = currentPage-3+i; if(p>totalPages) return null; }
                  return <button key={i} onClick={() => setCurrentPage(p)} className={`page-btn ${currentPage===p ? 'active' : ''}`}>{p}</button>;
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="page-btn"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>

          {deleteModalOpen && clientToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon"><TrashIcon size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">Êtes-vous sûr de vouloir supprimer le client <br /><span className="client-name">{clientToDelete.prenom} {clientToDelete.nom}</span> ?<br />Cette action est irréversible.</p>
                {getClientReservations(clientToDelete.id).length > 0 && <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>⚠️ Ce client a {getClientReservations(clientToDelete.id).length} réservation(s) associée(s)</p>}
                <div className="delete-actions"><button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button><button onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button></div>
              </div>
            </div>
          )}
        </div>
      )}
      <style>{`
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; background: #f8fafc; }
  .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
  .sortable-header:hover { background-color: #e2e8f0; }
  .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; vertical-align: middle; }
  .sort-icon.active { opacity: 1; color: #eab308; }

  .inline-form-container { background: white; border-radius: 32px; margin: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; }
  .inline-form-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 32px; display: flex; align-items: center; gap: 20px; position: relative; }
  .inline-form-icon { width: 56px; height: 56px; background: #eab308; border-radius: 28px; display: flex; align-items: center; justify-content: center; color: #1a1a2e; }
  .inline-form-title h2 { color: #eab308; font-size: 1.75rem; font-weight: 700; margin: 0; }
  .inline-form-title p { color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin: 4px 0 0 0; }
  .inline-form-close { position: absolute; top: 24px; right: 28px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 40px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: all 0.2s; }
  .inline-form-close:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }
  .inline-form { padding: 28px 32px; }
  .inline-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .inline-form-col { display: flex; flex-direction: column; gap: 24px; }
  .inline-section { background: #f8fafc; border-radius: 24px; padding: 20px; border: 1px solid #e2e8f0; }
  .inline-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #eab308; }
  .inline-section-header h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0; }
  .inline-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .inline-field { display: flex; flex-direction: column; gap: 6px; }
  .inline-field label { font-size: 0.7rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
  .inline-input, .inline-select { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.875rem; transition: all 0.2s; background: white; font-family: inherit; }
  .inline-input:focus, .inline-select:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1); }
  .image-upload-area { border: 2px dashed #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s; background: white; }
  .image-upload-area:hover { border-color: #eab308; background: #fefce8; }
  .image-preview-container { margin-top: 16px; text-align: center; }
  .image-preview { width: 120px; height: 120px; object-fit: cover; border-radius: 12px; border: 2px solid #e2e8f0; }
  .remove-image-btn { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; padding: 4px 12px; background: #fee2e2; border: none; border-radius: 20px; font-size: 0.7rem; color: #dc2626; cursor: pointer; }
  .inline-info-message { background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 10px; font-size: 0.75rem; color: #854d0e; margin-top: 16px; }
  .inline-info-grid { display: flex; flex-direction: column; gap: 12px; }
  .inline-info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
  .inline-info-item .info-label { font-size: 0.75rem; color: #64748b; }
  .inline-info-item .info-value { font-size: 0.875rem; font-weight: 500; color: #1e293b; }
  .inline-secondary-btn { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
  .inline-primary-btn { background: linear-gradient(135deg, #1a1a2e, #16213e); border: none; padding: 12px 28px; border-radius: 40px; font-size: 0.875rem; font-weight: 600; color: #eab308; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
  .inline-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(26, 26, 46, 0.4); color: #fbbf24; }
  .inline-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .inline-form-footer { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 24px; }

  .inline-details-container { background: white; border-radius: 32px; margin: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; }
  .inline-details-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 32px; display: flex; align-items: center; gap: 20px; position: relative; }
  .inline-details-icon { width: 56px; height: 56px; background: #eab308; border-radius: 28px; display: flex; align-items: center; justify-content: center; color: #1a1a2e; }
  .inline-details-title h2 { color: #eab308; font-size: 1.75rem; font-weight: 700; margin: 0; }
  .inline-details-title p { color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin: 4px 0 0 0; }
  .inline-details-close { position: absolute; top: 24px; right: 28px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 40px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: all 0.2s; }
  .inline-details-close:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }
  .inline-details-content { padding: 28px 32px; }
  .inline-details-footer { display: flex; justify-content: flex-end; gap: 16px; padding: 20px 32px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
  .btn-secondary-full { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-secondary-full:hover { border-color: #eab308; color: #eab308; }

  .client-profile-section { background: #f8fafc; border-radius: 24px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
  .client-profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
  .client-avatar { width: 80px; height: 80px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 80px; display: flex; align-items: center; justify-content: center; color: #eab308; }
  .client-profile-info h3 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
  .client-profile-details { display: flex; gap: 16px; flex-wrap: wrap; }
  .client-profile-details span { display: inline-flex; align-items: center; gap: 6px; font-size: 0.875rem; color: #64748b; }
  .client-profile-actions { margin-left: auto; }
  .details-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 40px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
  .details-action-btn.edit { background: #eab308; color: #1a1a2e; }
  .details-action-btn.edit:hover { background: #fbbf24; transform: translateY(-2px); }
  .client-identity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .identity-item { display: flex; flex-direction: column; gap: 4px; }
  .identity-label { font-size: 0.7rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .identity-value { font-size: 0.875rem; font-weight: 500; color: #1e293b; }
  .client-documents { margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  .client-documents h4 { font-size: 0.875rem; font-weight: 600; margin-bottom: 12px; color: #1e293b; }
  .documents-grid { display: flex; gap: 16px; flex-wrap: wrap; }
  .document-card { text-align: center; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; background: white; max-width: 200px; }
  .document-image { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 8px; }
  .document-label { font-size: 0.7rem; color: #64748b; display: block; margin-top: 4px; }

  .pdf-card { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; min-width: 140px; }
  .pdf-icon-wrapper { display: flex; justify-content: center; align-items: center; width: 80px; height: 80px; background: #fef3c7; border-radius: 12px; color: #b45309; }
  .pdf-icon { width: 48px; height: 48px; }
  .pdf-actions { display: flex; gap: 8px; margin-top: 4px; flex-wrap: wrap; justify-content: center; }
  .pdf-actions.small .pdf-action-btn { font-size: 0.65rem; padding: 4px 8px; }
  .pdf-action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 500; text-decoration: none; cursor: pointer; transition: all 0.2s; border: none; background: none; }
  .pdf-action-btn.view { background: #dbeafe; color: #1e40af; }
  .pdf-action-btn.view:hover { background: #bfdbfe; }
  .pdf-action-btn.download { background: #e0f2fe; color: #0369a1; }
  .pdf-action-btn.download:hover { background: #b8e2f8; }
  .pdf-preview-container { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 12px; background: #fefce8; border-radius: 12px; border: 1px solid #fde047; }
  .pdf-preview-container .pdf-icon-wrapper { width: 60px; height: 60px; }

  .client-stats-section { background: #f8fafc; border-radius: 24px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
  .stats-grid-5 { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 20px; }
  .stat-item-details { text-align: center; }
  .stat-value { font-size: 1.5rem; font-weight: 700; }
  .stat-label { font-size: 0.7rem; color: #64748b; margin-top: 4px; }

  .details-tabs-full { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; }
  .details-tab-full { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; transition: all 0.2s; border-radius: 12px 12px 0 0; }
  .details-tab-full:hover { background: #f1f5f9; }
  .details-tab-full.active { background: #0f172a; color: white; }
  .tab-content-full { padding: 8px 0; }

  .reservations-list { display: flex; flex-direction: column; gap: 16px; }
  .reservation-card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; transition: all 0.2s; }
  .reservation-card:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
  .reservation-card-header { background: #f8fafc; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
  .reservation-id { font-weight: 600; color: #1e293b; }
  .reservation-card-body { padding: 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
  .reservation-vehicle, .reservation-dates, .reservation-amounts { display: flex; gap: 12px; align-items: flex-start; }
  .vehicle-name { font-weight: 600; color: #1e293b; }
  .vehicle-matricule { font-size: 0.7rem; font-family: monospace; color: #eab308; }
  .days-count { font-size: 0.7rem; color: #64748b; margin-top: 4px; }

  .accidents-list { display: flex; flex-direction: column; gap: 16px; }
  .accident-card { background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; }
  .accident-card-header { background: #f8fafc; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
  .accident-id { font-weight: 600; color: #1e293b; }
  .accident-card-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }
  .accident-date, .accident-vehicle { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; }
  .accident-vehicle .matricule { font-family: monospace; color: #eab308; margin-left: 8px; }
  .accident-amounts { display: flex; gap: 20px; font-size: 0.875rem; }
  .accident-description { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; background: #f8fafc; border-radius: 12px; font-size: 0.75rem; color: #64748b; }

  .payments-list-full { display: flex; flex-direction: column; gap: 16px; }
  .payment-card-full { background: white; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden; }
  .payment-card-header-full { background: #f8fafc; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #e2e8f0; }
  .payment-car-name { margin-left: 8px; font-size: 0.75rem; color: #64748b; }
  .payment-amounts-full { display: flex; gap: 16px; font-size: 0.875rem; }
  .paid-amount { color: #16a34a; }
  .remaining-amount.negative { color: #dc2626; }
  .remaining-amount.positive { color: #16a34a; }
  .payment-card-body-full { padding: 20px; }
  .payment-history-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .payment-items-full { display: flex; flex-wrap: wrap; gap: 12px; }
  .payment-item-full { background: #f8fafc; padding: 8px 12px; border-radius: 12px; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; }
  .payment-date { color: #64748b; }
  .payment-amount { font-weight: 600; color: #eab308; }
  .payment-method { background: white; padding: 2px 6px; border-radius: 20px; font-size: 0.65rem; }
  .payment-notes { color: #64748b; font-style: italic; }
  .no-payments-full { font-size: 0.875rem; color: #64748b; text-align: center; padding: 20px; }
  .empty-state-full { text-align: center; padding: 40px; color: #64748b; }
  .empty-icon { margin-bottom: 16px; opacity: 0.5; }

  .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
  .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
  .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
  .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
  .btn-secondary { background: #f1f5f9; color: #1e293b; }
  .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
  .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
  .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }

  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
  .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
  .stat-number { font-size: 1.875rem; font-weight: 700; }
  .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-icon { opacity: 0.5; }
  .text-green { color: #16a34a; }
  .text-emerald { color: #059669; }
  .text-blue { color: #3b82f6; }
  .text-warning { color: #eab308; }
  .text-info { color: #3b82f6; }
  .text-success { color: #16a34a; }
  .text-danger { color: #dc2626; }

  .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
  .search-container { position: relative; }
  .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; }
  .search-input { width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; transition: all 0.2s; }
  .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }

  .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
  .table-info-text { font-size: 0.875rem; color: #64748b; }
  .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
  .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; }
  .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; }
  .table tr:hover { background: #f8fafc; }
  .font-medium { font-weight: 500; }

  .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-success { background: #dcfce7; color: #166534; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-purple { background: #f3e8ff; color: #6b21a5; }
  .badge-gray { background: #f1f5f9; color: #475569; }
  .badge-info { background: #e0f2fe; color: #0369a1; }

  .action-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
  .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
  .action-btn-view { color: #3b82f6; }
  .action-btn-view:hover { background: #eff6ff; }
  .action-btn-edit { color: #10b981; }
  .action-btn-edit:hover { background: #ecfdf5; }
  .action-btn-delete { color: #ef4444; }
  .action-btn-delete:hover { background: #fef2f2; }

  .pagination { display: flex; justify-content: center; gap: 0.25rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
  .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; }
  .page-btn:hover:not(:disabled) { background: #f1f5f9; }
  .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
  .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: white; border-radius: 1.5rem; max-width: 28rem; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
  .delete-modal { max-width: 28rem; }
  @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; }
  .delete-title { text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
  .delete-message { text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
  .client-name { font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.5rem; display: inline-block; }
  .delete-actions { display: flex; gap: 0.75rem; padding-top: 1rem; }
  .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
  .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
  .modal-btn-cancel:hover { background: #f8fafc; }
  .btn-delete { background: #ef4444; color: white; }
  .btn-delete:hover { background: #dc2626; }

  .loading { text-align: center; padding: 3rem; }
  .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .flex { display: flex; }
  .items-center { align-items: center; }
  .gap-1 { gap: 0.25rem; }
  .gap-2 { gap: 0.5rem; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .text-xs { font-size: 0.75rem; }

  @media (max-width: 1024px) { .inline-form-grid { grid-template-columns: 1fr; gap: 24px; } .reservation-card-body { grid-template-columns: 1fr; } }
  @media (max-width: 768px) { .admin-container { padding: 1rem; } .header { flex-direction: column; align-items: flex-start; } .header-actions { width: 100%; justify-content: flex-start; } .inline-grid-2 { grid-template-columns: 1fr; } .inline-form-container, .inline-details-container { margin: 1rem; } .inline-form-header, .inline-details-header { padding: 16px 20px; } .inline-form-header h2, .inline-details-title h2 { font-size: 1.25rem; } .inline-form, .inline-details-content { padding: 20px; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .stats-grid-5 { grid-template-columns: repeat(2, 1fr); } .client-profile-header { flex-direction: column; text-align: center; } .client-profile-actions { margin-left: 0; } .client-profile-details { justify-content: center; } .payment-card-header-full { flex-direction: column; align-items: flex-start; } .payment-amounts-full { flex-wrap: wrap; } .details-tabs-full { flex-wrap: wrap; } .documents-grid { justify-content: center; } }

  @media (prefers-color-scheme: dark) { body { background: #0f172a; } .stat-card, .table-wrapper, .search-wrapper, .modal, .inline-form-container, .inline-details-container, .reservation-card, .accident-card, .payment-card-full, .document-card { background: #1e293b; border-color: #334155; } .stat-label, .table-info-text, .table th, .subtitle, .delete-message, .identity-label, .payment-date, .payment-notes, .no-payments-full, .empty-state-full, .vehicle-matricule, .days-count, .accident-description, .payment-car-name, .stat-label, .document-label { color: #94a3b8; } .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; } .btn-secondary, .btn-secondary-full { background: #334155; color: #e2e8f0; } .btn-secondary:hover, .btn-secondary-full:hover { background: #475569; } .search-input, .inline-input, .inline-select { background: #0f172a; border-color: #334155; color: #f1f5f9; } .inline-section, .client-profile-section, .client-stats-section { background: #0f172a; border-color: #334155; } .inline-section-header h3, .inline-info-item .info-value, .client-name, .client-profile-info h3, .identity-value, .reservation-id, .accident-id, .vehicle-name { color: #f1f5f9; } .inline-info-message { background: #422006; border-color: #713f12; color: #fde047; } .image-upload-area { background: #0f172a; border-color: #334155; } .image-upload-area:hover { border-color: #eab308; background: #1e293b; } .table tr:hover { background: #334155; } .page-btn { background: #1e293b; border-color: #475569; color: #e2e8f0; } .page-btn.active { background: #f59e0b; color: #0f172a; } .badge-warning { background: #78350f; color: #fde68a; } .badge-success { background: #14532d; color: #4ade80; } .badge-danger { background: #7f1d1d; color: #fca5a5; } .badge-blue { background: #1e3a5f; color: #60a5fa; } .badge-purple { background: #4c1d95; color: #c084fc; } .badge-gray { background: #334155; color: #cbd5e1; } .badge-info { background: #164e63; color: #67e8f9; } .action-btn-view:hover { background: #1e3a5f; } .action-btn-edit:hover { background: #064e3b; } .action-btn-delete:hover { background: #7f1d1d; } .reservation-card-header, .accident-card-header, .payment-card-header-full { background: #0f172a; border-color: #334155; } .payment-item-full { background: #0f172a; border: 1px solid #334155; } .payment-method { background: #1e293b; color: #e2e8f0; } .details-tab-full.active { background: #f59e0b; color: #0f172a; } .details-tab-full:hover:not(.active) { background: #334155; } .sortable-header:hover { background-color: #334155; } .inline-details-footer { background: #0f172a; border-color: #334155; } .pdf-icon-wrapper { background: #422006; color: #fde047; } .pdf-action-btn.view { background: #1e3a5f; color: #60a5fa; } .pdf-action-btn.view:hover { background: #1e4a7a; } .pdf-action-btn.download { background: #164e63; color: #67e8f9; } .pdf-action-btn.download:hover { background: #1e6b80; } .pdf-preview-container { background: #422006; border-color: #713f12; } .remove-image-btn { background: #7f1d1d; color: #fca5a5; } .document-image { border-color: #334155; } }

  html, body { overflow-x: auto !important; min-width: 320px; }
  .admin-container, .inline-form-container, .inline-details-container { overflow-x: auto !important; min-width: 0; width: 100%; }
  .inline-form, .inline-details-content { overflow-x: auto !important; }
  .inline-form-grid { min-width: 600px; }
  @media (max-width: 768px) { .inline-form-grid { min-width: 100%; } }
  .table-wrapper, .inline-form, .inline-details-content { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
  .admin-container, .inline-form-container, .inline-details-container { max-width: 100%; overflow-x: auto; }
  @media screen and (max-width: 1400px) { .admin-container { padding: 1rem; overflow-x: auto; } .inline-form-grid { grid-template-columns: 1fr; min-width: auto; } }
  body { overflow-x: auto; min-width: 320px; }
  .table { min-width: 800px; }
  @media (max-width: 768px) { .table { min-width: 700px; } }
  .cards-grid { overflow-x: auto; padding-bottom: 0.5rem; }
  .inline-section { overflow-x: auto; }
  .inline-grid-2 { min-width: 280px; }
  @media (max-width: 640px) { .inline-grid-2 { grid-template-columns: 1fr; min-width: auto; } .stats-grid { grid-template-columns: repeat(2, 1fr); overflow-x: auto; } .action-buttons { flex-wrap: wrap; justify-content: flex-start; } .modal { max-width: 95%; margin: 0 auto; } }
  @media screen and (min-resolution: 120dpi) { .admin-container, .inline-form-container, .inline-details-container { padding: 0.75rem; } .inline-form { padding: 1rem; } .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); } .cards-grid { grid-template-columns: 1fr; } }
  * { max-width: 100%; box-sizing: border-box; }
`}</style>
    </>
  );
}