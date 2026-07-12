// src/pages/admin/AdminPayments.jsx
import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom"; // <-- ADDED
import { fetchCars, selectCars, fetchMatricules, selectMatricules } from "../../Redux/store";
import axios from "axios";
import { toast } from "sonner";
import { 
  Plus, Edit2, Trash2, X, RefreshCw, Car, DollarSign, Calendar, 
  TrendingUp, Check, AlertCircle, CreditCard, FileText, Download, 
  Save, TrashIcon, Search, ChevronLeft, ChevronRight, User, 
  Building2, FileCheck, Clock, Wallet, Banknote, Receipt, 
  CalendarDays, Percent, Info, Tag, CreditCard as CreditCardIcon,
  AlertTriangle, CheckCircle, XCircle, Eye, Printer, Phone, Mail,
  MapPin, IdCard, Users, Gauge, Shield, Settings, EyeOff, Minus,
  Calculator, PieChart, TrendingDown, Sparkles, Star, Gem, Award,
  ArrowUpDown, ArrowUp, ArrowDown, Activity, Key, Lock, Unlock, ArrowLeft 
} from "lucide-react";

export default function AdminPayments() {
  const dispatch = useDispatch();
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);

  // URL search params for filtering
  const [searchParams, setSearchParams] = useSearchParams(); // <-- ADDED
  const filterParam = searchParams.get('filter'); // <-- ADDED

  const [financings, setFinancings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [financingToDelete, setFinancingToDelete] = useState(null);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFinancing, setSelectedFinancing] = useState(null);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Sorting state
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  
  // Styled prompt states
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [currentFinancingForSchedule, setCurrentFinancingForSchedule] = useState(null);
  const [interestRate, setInterestRate] = useState("5");
  const [tvaRate, setTvaRate] = useState("20");
  
  const itemsPerPage = 10;

  // ---------- Searchable Matricule state ----------
  const [matriculeSearchTerm, setMatriculeSearchTerm] = useState("");
  const [filteredMatriculesList, setFilteredMatriculesList] = useState([]);
  const [selectedMatriculeObj, setSelectedMatriculeObj] = useState(null);
  
  const [formData, setFormData] = useState({
    matricule_id: "",
    dossier_number: "",
    account_number: "",
    credit_type: "vehicule_entreprise",
    contract_date: new Date().toISOString().slice(0, 10),
    credit_amount: 0,
    preti_interet_ttc_differe: 0,
    duration_months: 36,
    differed_months: 0,
    periodicity: "mensuel",
    total_installments: 36,
    first_installment_date: new Date().toISOString().slice(0, 10),
    last_installment_date: "",
    bank_name: "",
    bank_account: "",
    installment_amount: 0,
    prestation_amount: 0,
    status: "active",
    notes: ""
  });

  const [paymentForm, setPaymentForm] = useState({
    installment_number: 1,
    paid_amount: 0,
    paid_date: new Date().toISOString().slice(0, 10),
    payment_method: "bank_transfer",
    transaction_reference: "",
    payment_notes: ""
  });

  const api = axios.create({
    baseURL: "http://localhost:8000/api",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    }
  });

  // Add token to requests
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Helper to format date to YYYY-MM-DD
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

  // Sort handler
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

  const fetchFinancings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/payments");
      setFinancings(response.data.financings || []);
    } catch (error) {
      console.error("Error fetching financings:", error);
      toast.error("Erreur lors du chargement des données");
      setFinancings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancings();
    dispatch(fetchCars());
    dispatch(fetchMatricules());
  }, [dispatch]);

  const saveFinancing = async (data) => {
    try {
      if (editing) {
        const response = await api.put(`/payments/${editing.id}`, data);
        toast.success("Financement modifié avec succès");
        return response.data.financing;
      } else {
        const response = await api.post("/payments", data);
        toast.success("Financement ajouté avec succès");
        return response.data.financing;
      }
    } catch (error) {
      console.error("Error saving financing:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement");
      throw error;
    }
  };

  const deleteFinancing = async (id) => {
    try {
      await api.delete(`/payments/${id}`);
      toast.success("Financement supprimé avec succès");
      return true;
    } catch (error) {
      console.error("Error deleting financing:", error);
      toast.error("Erreur lors de la suppression");
      return false;
    }
  };

  const generateSchedule = async (financingId, data) => {
    try {
      const response = await api.post(`/payments/${financingId}/generate-schedule`, data);
      toast.success(response.data.message);
      return response.data;
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast.error(error.response?.data?.message || "Erreur lors de la génération de l'échéancier");
      throw error;
    }
  };

  const recordPayment = async (financingId, data) => {
    try {
      const response = await api.post(`/payments/${financingId}/record-payment`, data);
      toast.success("Paiement enregistré avec succès");
      return response.data;
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error(error.response?.data?.message || "Erreur lors de l'enregistrement du paiement");
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!formData.last_installment_date && formData.first_installment_date && formData.total_installments) {
      const startDate = new Date(formData.first_installment_date);
      const lastDate = new Date(startDate);
      lastDate.setMonth(startDate.getMonth() + formData.total_installments - 1);
      formData.last_installment_date = lastDate.toISOString().slice(0, 10);
    }
    
    try {
      const saved = await saveFinancing(formData);
      await fetchFinancings();
      setShowPaymentForm(false);
      setEditing(null);
      resetForm();
    } catch (error) {
      // Error already handled
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      matricule_id: "",
      dossier_number: "",
      account_number: "",
      credit_type: "vehicule_entreprise",
      contract_date: new Date().toISOString().slice(0, 10),
      credit_amount: 0,
      preti_interet_ttc_differe: 0,
      duration_months: 36,
      differed_months: 0,
      periodicity: "mensuel",
      total_installments: 36,
      first_installment_date: new Date().toISOString().slice(0, 10),
      last_installment_date: "",
      bank_name: "",
      bank_account: "",
      installment_amount: 0,
      prestation_amount: 0,
      status: "active",
      notes: ""
    });
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm("");
    setFilteredMatriculesList([]);
  };

  const handleDeleteClick = (financing) => {
    setFinancingToDelete(financing);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!financingToDelete) return;
    const success = await deleteFinancing(financingToDelete.id);
    if (success) {
      await fetchFinancings();
    }
    setDeleteModalOpen(false);
    setFinancingToDelete(null);
  };

  const openSchedulePrompt = (financing) => {
    setCurrentFinancingForSchedule(financing);
    setInterestRate("5");
    setTvaRate("20");
    setInterestModalOpen(true);
  };

  const loadPayments = async (financingId) => {
    try {
      const response = await api.get(`/payments/${financingId}/payments`);
      setSelectedFinancing((prev) => ({ ...prev, payments: response.data.payments }));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Erreur lors du chargement des paiements");
    }
  };

  const confirmGenerateSchedule = async () => {
    if (!currentFinancingForSchedule) return;
    
    const rate = parseFloat(interestRate);
    const tva = parseFloat(tvaRate);
    
    if (isNaN(rate) || rate < 0) {
      toast.error("Veuillez entrer un taux d'intérêt valide");
      return;
    }
    
    if (isNaN(tva) || tva < 0) {
      toast.error("Veuillez entrer un taux de TVA valide");
      return;
    }
    
    try {
      await generateSchedule(currentFinancingForSchedule.id, {
        interest_rate: rate,
        tva_rate: tva
      });
      await fetchFinancings();
      if (selectedFinancing?.id === currentFinancingForSchedule.id) {
        setSelectedFinancing((prev) => ({ ...prev, payments: null }));
        loadPayments(currentFinancingForSchedule.id);
      }
      setInterestModalOpen(false);
      setCurrentFinancingForSchedule(null);
    } catch (error) {
      // Error already handled
    }
  };

  const viewPayments = async (financingId) => {
    try {
      const response = await api.get(`/payments/${financingId}/payments`);
      const financing = financings.find(f => f.id === financingId);
      setSelectedFinancing({ ...financing, payments: response.data.payments });
      setPaymentsModalOpen(true);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Erreur lors du chargement des paiements");
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await recordPayment(selectedFinancing.id, paymentForm);
      await viewPayments(selectedFinancing.id);
      await fetchFinancings();
      setRecordPaymentModalOpen(false);
      setPaymentForm({
        installment_number: 1,
        paid_amount: 0,
        paid_date: new Date().toISOString().slice(0, 10),
        payment_method: "bank_transfer",
        transaction_reference: "",
        payment_notes: ""
      });
    } catch (error) {
      // Error already handled
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- Searchable matricule handlers ----------
  // AdminPayments.jsx
const handleMatriculeSearch = (term) => {
  setMatriculeSearchTerm(term);
  if (term.trim() === "") {
    setFilteredMatriculesList([]);
    return;
  }
  const lower = term.toLowerCase().trim();
  const filtered = matricules.filter(m => {
    // ✅ EXCLUDE SOLD MATRICULES
    if (m.status === 'sold') return false;
    const car = cars.find(c => c.id === m.car_id);
    const carStr = car ? `${car.brand} ${car.model}`.toLowerCase() : '';
    return m.matricule_code.toLowerCase().includes(lower) || carStr.includes(lower);
  });
  setFilteredMatriculesList(filtered.slice(0, 10));
};

  const handleMatriculeSelect = (mat) => {
    setSelectedMatriculeObj(mat);
    const car = cars.find(c => c.id === mat.car_id);
    setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
    setFormData(prev => ({ ...prev, matricule_id: mat.id }));
    setFilteredMatriculesList([]);
  };

  const clearMatriculeSelection = () => {
    setSelectedMatriculeObj(null);
    setMatriculeSearchTerm("");
    setFilteredMatriculesList([]);
    setFormData(prev => ({ ...prev, matricule_id: "" }));
  };

  // ---------- Edit handler with date formatting ----------
  const handleEdit = (f) => {
    setEditing(f);
    setFormData({
      matricule_id: f.matricule_id,
      dossier_number: f.dossier_number,
      account_number: f.account_number || "",
      credit_type: f.credit_type,
      contract_date: formatDateForInput(f.contract_date),
      credit_amount: f.credit_amount,
      preti_interet_ttc_differe: f.preti_interet_ttc_differe || 0,
      duration_months: f.duration_months,
      differed_months: f.differed_months || 0,
      periodicity: f.periodicity || "mensuel",
      total_installments: f.total_installments,
      first_installment_date: formatDateForInput(f.first_installment_date),
      last_installment_date: formatDateForInput(f.last_installment_date) || "",
      bank_name: f.bank_name || "",
      bank_account: f.bank_account || "",
      installment_amount: f.installment_amount,
      prestation_amount: f.prestation_amount || 0,
      status: f.status,
      notes: f.notes || ""
    });

    // Populate searchable matricule
    if (f.matricule_id) {
      const mat = matricules.find(m => m.id === f.matricule_id);
      if (mat) {
        setSelectedMatriculeObj(mat);
        const car = cars.find(c => c.id === mat.car_id);
        setMatriculeSearchTerm(`${mat.matricule_code} - ${car ? `${car.brand} ${car.model}` : 'N/A'}`);
      }
    } else {
      setSelectedMatriculeObj(null);
      setMatriculeSearchTerm("");
    }

    setShowPaymentForm(true);
  };

  const handleViewDetails = (financing) => {
    setSelectedFinancing(financing);
    setShowPaymentDetails(true);
    loadPayments(financing.id);
  };

  const handleAddNew = () => {
    setEditing(null);
    resetForm();
    setShowPaymentForm(true);
  };

  const refreshData = () => {
    fetchFinancings();
    dispatch(fetchCars(true));
    dispatch(fetchMatricules(true));
    toast.success("Données actualisées");
  };

  const handleExport = () => {
    const headers = ['ID', 'Dossier N°', 'Véhicule', 'Matricule', 'Montant Crédit', 'Mensualité', 'Total Échéances', 'Payé', 'Reste', 'Statut', 'Date Contrat'];
    const csvData = filteredFinancings.map(f => {
      const info = getMatriculeInfo(f.matricule_id);
      return [
        f.id,
        `"${f.dossier_number}"`,
        `"${info ? `${info.car.brand} ${info.car.model}` : '—'}"`,
        `"${info ? info.matricule_code : '—'}"`,
        f.credit_amount,
        f.installment_amount,
        f.total_installments,
        f.total_paid,
        f.total_remaining,
        f.status === 'active' ? 'Actif' : f.status === 'completed' ? 'Terminé' : 'En retard',
        f.contract_date
      ].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const getMatriculeInfo = (matriculeId) => {
    const matricule = matricules.find(m => m.id === matriculeId);
    if (matricule) {
      const car = cars.find(c => c.id === matricule.car_id);
      return {
        car: car,
        matricule_code: matricule.matricule_code
      };
    }
    return null;
  };

  // Filter and sort financings
  const filteredFinancings = useMemo(() => {
    return financings.filter(f => {
      const info = getMatriculeInfo(f.matricule_id);
      const carName = info && info.car ? `${info.car.brand} ${info.car.model}`.toLowerCase() : "";
      const matchesSearch = searchTerm === "" || 
        carName.includes(searchTerm.toLowerCase()) || 
        f.dossier_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (info && info.matricule_code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || f.status === statusFilter;

      // Notification filter from URL param
      let matchesNotification = true;
      if (filterParam === 'notifications') {
        // Check if financing has overdue or upcoming payments (within 7 days)
        // If payments are loaded, use them, otherwise fallback to status
        let hasOverdueOrUpcoming = false;
        if (f.payments && f.payments.length > 0) {
          const today = new Date();
          today.setHours(0,0,0,0);
          const hasOverdue = f.payments.some(p => p.status !== 'paid' && new Date(p.due_date) < today);
          const hasUpcoming = f.payments.some(p => {
            const diff = (new Date(p.due_date) - today) / (1000*60*60*24);
            return p.status !== 'paid' && diff >= 0 && diff <= 7;
          });
          hasOverdueOrUpcoming = hasOverdue || hasUpcoming;
        } else {
          // Fallback: use status and progress
          // If status is 'late' or 'defaulted' -> notification
          if (f.status === 'late' || f.status === 'defaulted') {
            hasOverdueOrUpcoming = true;
          } else if (f.status === 'active') {
            // If active and maybe nearing end? Not enough info, but we'll return false
            // Could check if remaining installments are few (but no due dates)
            // So we'll return false
            hasOverdueOrUpcoming = false;
          }
        }
        matchesNotification = hasOverdueOrUpcoming;
      }

      return matchesSearch && matchesStatus && matchesNotification;
    }).sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "dossier":
          aVal = a.dossier_number?.toLowerCase() || "";
          bVal = b.dossier_number?.toLowerCase() || "";
          break;
        case "vehicle":
          const aInfo = getMatriculeInfo(a.matricule_id);
          const bInfo = getMatriculeInfo(b.matricule_id);
          aVal = aInfo?.car ? `${aInfo.car.brand} ${aInfo.car.model}`.toLowerCase() : "";
          bVal = bInfo?.car ? `${bInfo.car.brand} ${bInfo.car.model}`.toLowerCase() : "";
          break;
        case "matricule":
          const aMat = getMatriculeInfo(a.matricule_id);
          const bMat = getMatriculeInfo(b.matricule_id);
          aVal = aMat?.matricule_code || "";
          bVal = bMat?.matricule_code || "";
          break;
        case "amount":
          aVal = a.credit_amount || 0;
          bVal = b.credit_amount || 0;
          break;
        case "installment":
          aVal = a.installment_amount || 0;
          bVal = b.installment_amount || 0;
          break;
        case "progress":
          aVal = (a.current_installment_number || 0) / (a.total_installments || 1);
          bVal = (b.current_installment_number || 0) / (b.total_installments || 1);
          break;
        case "status":
          aVal = a.status || "";
          bVal = b.status || "";
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [financings, searchTerm, statusFilter, sortField, sortDirection, matricules, cars, filterParam]); // Added filterParam

  const totalPages = Math.ceil(filteredFinancings.length / itemsPerPage);
  const paginated = filteredFinancings.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

  const stats = {
    total: financings.length,
    active: financings.filter(f => f.status === 'active').length,
    completed: financings.filter(f => f.status === 'completed').length,
    totalRemaining: financings.reduce((sum, f) => sum + (parseFloat(f.total_remaining) || 0), 0)
  };

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD' }).format(num);
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

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des financements...</p>
      </div>
    );
  }

  return (
    <>
      {/* Payment Form - Full Page Inline */}
      {showPaymentForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editing ? <Sparkles size={28} /> : <DollarSign size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editing ? "Modifier le financement" : "Nouveau financement"}</h2>
              <p>{editing ? "Modifiez les informations du financement" : "Ajoutez un nouveau financement automobile"}</p>
            </div>
            <button onClick={() => { setShowPaymentForm(false); setEditing(null); resetForm(); }} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Car size={18} />
                    <h3>Informations véhicule</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Véhicule (matricule) *</label>
                      {/* Searchable Matricule Select */}
                      <div className="inline-search-section">
                        <div className="inline-search-input-wrapper">
                          <Search size={18} />
                          <input
                            type="text"
                            className="inline-input"
                            value={matriculeSearchTerm}
                            onChange={(e) => handleMatriculeSearch(e.target.value)}
                            placeholder="Rechercher un matricule (plaque, marque, modèle)..."
                            required
                          />
                          {selectedMatriculeObj && (
                            <button
                              type="button"
                              className="clear-search-btn"
                              onClick={clearMatriculeSelection}
                              title="Effacer la sélection"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>

                        {filteredMatriculesList.length > 0 && (
  <div className="inline-results">
    {filteredMatriculesList.map(mat => {
      const car = cars.find(c => c.id === mat.car_id);
      return (
        <div key={mat.id} className="inline-result-item" onClick={() => handleMatriculeSelect(mat)}>
          <div className="inline-result-avatar"><Car size={20} /></div>
          <div className="inline-result-info">
            <strong>{mat.matricule_code}</strong>
            <div className="inline-result-details">
              <span>{car ? `${car.brand} ${car.model} (${car.year})` : 'N/A'}</span>
              <span>{mat.kilometrage?.toLocaleString()} km</span>
              <span className={`badge ${mat.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                {mat.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}

                        {selectedMatriculeObj && (
  <div className="inline-selected">
    <CheckCircle size={20} />
    <div>
      <strong>Matricule sélectionné</strong>
      <p>
        {selectedMatriculeObj.matricule_code} - {cars.find(c => c.id === selectedMatriculeObj.car_id)?.brand} {cars.find(c => c.id === selectedMatriculeObj.car_id)?.model}
        <span className={`badge ${selectedMatriculeObj.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '8px' }}>
          {selectedMatriculeObj.status === 'active' ? 'Actif' : 'Inactif'}
        </span>
      </p>
    </div>
  </div>
)}

                        {!selectedMatriculeObj && matriculeSearchTerm.trim() !== "" && filteredMatriculesList.length === 0 && (
                          <div className="inline-no-results">Aucun matricule trouvé.</div>
                        )}
                      </div>
                      <input type="hidden" name="matricule_id" value={formData.matricule_id} />
                    </div>
                    <div className="inline-field">
                      <label>N° Dossier *</label>
                      <input type="text" required value={formData.dossier_number} onChange={(e) => setFormData({ ...formData, dossier_number: e.target.value })} className="inline-input" placeholder="Ex: FIN-2024-001" />
                    </div>
                    <div className="inline-field">
                      <label>N° Compte</label>
                      <input type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} className="inline-input" placeholder="Numéro de compte bancaire" />
                    </div>
                    <div className="inline-field">
                      <label>Type crédit</label>
                      <select value={formData.credit_type} onChange={(e) => setFormData({ ...formData, credit_type: e.target.value })} className="inline-select">
                        <option value="vehicule_entreprise">Véhicule Entreprise</option>
                        <option value="vehicule_personnel">Véhicule Personnel</option>
                        <option value="other">Autre</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Calendar size={18} />
                    <h3>Dates et durée</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Date contrat *</label>
                      <input type="date" required value={formData.contract_date} onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>1ère échéance *</label>
                      <input type="date" required value={formData.first_installment_date} onChange={(e) => setFormData({ ...formData, first_installment_date: e.target.value })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Dernière échéance</label>
                      <input type="date" value={formData.last_installment_date} onChange={(e) => setFormData({ ...formData, last_installment_date: e.target.value })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Durée (mois) *</label>
                      <input type="number" required value={formData.duration_months} onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value), total_installments: parseInt(e.target.value) })} className="inline-input" placeholder="36" />
                    </div>
                    <div className="inline-field">
                      <label>Mois différés</label>
                      <input type="number" value={formData.differed_months} onChange={(e) => setFormData({ ...formData, differed_months: parseInt(e.target.value) })} className="inline-input" placeholder="0" />
                    </div>
                    <div className="inline-field">
                      <label>Périodicité</label>
                      <select value={formData.periodicity} onChange={(e) => setFormData({ ...formData, periodicity: e.target.value })} className="inline-select">
                        <option value="mensuel">Mensuel</option>
                        <option value="trimestriel">Trimestriel</option>
                        <option value="semestriel">Semestriel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <DollarSign size={18} />
                    <h3>Montants</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Montant crédit (DH) *</label>
                      <input type="number" step="0.01" required value={formData.credit_amount} onChange={(e) => setFormData({ ...formData, credit_amount: parseFloat(e.target.value) })} className="inline-input" placeholder="0.00" />
                    </div>
                    <div className="inline-field">
                      <label>Montant mensualité (DH) *</label>
                      <input type="number" step="0.01" required value={formData.installment_amount} onChange={(e) => setFormData({ ...formData, installment_amount: parseFloat(e.target.value) })} className="inline-input" placeholder="0.00" />
                    </div>
                    <div className="inline-field">
                      <label>Prestation (DH)</label>
                      <input type="number" step="0.01" value={formData.prestation_amount} onChange={(e) => setFormData({ ...formData, prestation_amount: parseFloat(e.target.value) })} className="inline-input" placeholder="0.00" />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Building2 size={18} />
                    <h3>Informations bancaires</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Banque</label>
                      <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} className="inline-input" placeholder="Nom de la banque" />
                    </div>
                    <div className="inline-field">
                      <label>Compte bancaire</label>
                      <input type="text" value={formData.bank_account} onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })} className="inline-input" placeholder="Numéro de compte" />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Shield size={18} />
                    <h3>Statut et notes</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Statut</label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="inline-select">
                        <option value="active">Actif</option>
                        <option value="completed">Terminé</option>
                        <option value="late">En retard</option>
                        <option value="defaulted">Impayé</option>
                      </select>
                    </div>
                  </div>
                  <div className="inline-field">
                    <label>Notes</label>
                    <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="inline-textarea" rows="3" placeholder="Notes supplémentaires..." />
                  </div>
                </div>

                {editing && (
                  <div className="inline-section">
                    <div className="inline-section-header">
                      <Activity size={18} />
                      <h3>Informations système</h3>
                    </div>
                    <div className="inline-info-grid">
                      <div className="inline-info-item">
                        <span className="info-label">Date de création</span>
                        <span className="info-value">{editing.created_at ? formatDate(editing.created_at) : "—"}</span>
                      </div>
                      <div className="inline-info-item">
                        <span className="info-label">Dernière modification</span>
                        <span className="info-value">{editing.updated_at ? formatDate(editing.updated_at) : "—"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowPaymentForm(false); setEditing(null); resetForm(); }}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {submitting ? "Traitement..." : (editing ? "Mettre à jour" : "Créer le financement")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Details - Full Page Inline */}
      {showPaymentDetails && selectedFinancing && (
        <div className="inline-details-container">
          <div className="inline-details-header">
            <div className="inline-details-icon">
              <Receipt size={28} />
            </div>
            <div className="inline-details-title">
              <h2>Détails du financement</h2>
              <p>Dossier: {selectedFinancing.dossier_number}</p>
            </div>
            <button onClick={() => setShowPaymentDetails(false)} className="inline-details-close">
              <X size={24} />
            </button>
          </div>

          <div className="inline-details-content">
            <div className="details-actions-bar">
              <button onClick={() => setShowPaymentDetails(false)} className="back-btn">
                <ArrowLeft size={16} /> Retour à la liste
              </button>
              <div className="details-action-buttons">
                <button onClick={() => { setShowPaymentDetails(false); handleEdit(selectedFinancing); }} className="action-edit-btn">
                  <Edit2 size={16} /> Modifier
                </button>
                <button onClick={() => { setShowPaymentDetails(false); handleDeleteClick(selectedFinancing); }} className="action-delete-btn">
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </div>

            {/* Header Card */}
            <div className="financing-header-card">
              <div className="financing-stats-grid">
                <div className="stat-item-detail">
                  <div className="stat-value">{formatCurrency(selectedFinancing.credit_amount)}</div>
                  <div className="stat-label-detail">Montant total</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value text-green">{formatCurrency(selectedFinancing.installment_amount)}</div>
                  <div className="stat-label-detail">Mensualité</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value">{selectedFinancing.current_installment_number || 0} / {selectedFinancing.total_installments || 0}</div>
                  <div className="stat-label-detail">Échéances</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value text-success">{formatCurrency(selectedFinancing.total_paid || 0)}</div>
                  <div className="stat-label-detail">Total payé</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value text-danger">{formatCurrency(selectedFinancing.total_remaining || 0)}</div>
                  <div className="stat-label-detail">Reste à payer</div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="details-sections-grid">
              {/* Vehicle Info */}
              <div className="detail-card">
                <div className="detail-card-title">
                  <Car size={16} /> Informations véhicule
                </div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">Matricule</span>
                    <span className="info-value matricule-value">{getMatriculeInfo(selectedFinancing.matricule_id)?.matricule_code || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Marque</span>
                    <span className="info-value">{getMatriculeInfo(selectedFinancing.matricule_id)?.car?.brand || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Modèle</span>
                    <span className="info-value">{getMatriculeInfo(selectedFinancing.matricule_id)?.car?.model || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Année</span>
                    <span className="info-value">{getMatriculeInfo(selectedFinancing.matricule_id)?.car?.year || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Financing Info */}
              <div className="detail-card">
                <div className="detail-card-title">
                  <FileText size={16} /> Informations financement
                </div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">N° Dossier</span>
                    <span className="info-value">{selectedFinancing.dossier_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">N° Compte</span>
                    <span className="info-value">{selectedFinancing.account_number || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Type crédit</span>
                    <span className="info-value">{selectedFinancing.credit_type === 'vehicule_entreprise' ? 'Véhicule Entreprise' : selectedFinancing.credit_type === 'vehicule_personnel' ? 'Véhicule Personnel' : 'Autre'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Date contrat</span>
                    <span className="info-value">{formatDate(selectedFinancing.contract_date)}</span>
                  </div>
                </div>
              </div>

              {/* Bank Info */}
              <div className="detail-card">
                <div className="detail-card-title">
                  <Building2 size={16} /> Informations bancaires
                </div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">Banque</span>
                    <span className="info-value">{selectedFinancing.bank_name || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Compte bancaire</span>
                    <span className="info-value">{selectedFinancing.bank_account || "—"}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Statut</span>
                    <span className={`status-badge ${selectedFinancing.status === 'active' ? 'status-active' : selectedFinancing.status === 'completed' ? 'status-completed' : 'status-late'}`}>
                      {selectedFinancing.status === 'active' ? 'Actif' : selectedFinancing.status === 'completed' ? 'Terminé' : 'En retard'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div className="detail-card">
                <div className="detail-card-title">
                  <Calendar size={16} /> Échéancier
                </div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">1ère échéance</span>
                    <span className="info-value">{formatDate(selectedFinancing.first_installment_date)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Dernière échéance</span>
                    <span className="info-value">{formatDate(selectedFinancing.last_installment_date)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Progression</span>
                    <div className="progress-wrapper">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, ((selectedFinancing.current_installment_number || 0) / (selectedFinancing.total_installments || 1)) * 100)}%` }} />
                      </div>
                      <span className="progress-text">{selectedFinancing.current_installment_number || 0} / {selectedFinancing.total_installments || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {selectedFinancing.notes && (
              <div className="notes-section">
                <div className="notes-title">
                  <FileText size={16} /> Notes
                </div>
                <div className="notes-content">
                  {selectedFinancing.notes}
                </div>
              </div>
            )}

            {/* Payments Table */}
            <div className="payments-section">
              <div className="payments-section-header">
                <Receipt size={16} /> Échéances détaillées
                <button onClick={() => openSchedulePrompt(selectedFinancing)} className="generate-schedule-btn">
                  <Calculator size={14} /> Générer échéancier
                </button>
              </div>
              <div className="payments-table-wrapper">
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Date échéance</th>
                      <th>Capital</th>
                      <th>Intérêts</th>
                      <th>TVA</th>
                      <th>Total</th>
                      <th>Statut</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFinancing.payments?.map(payment => (
                      <tr key={payment.id}>
                        <td>#{payment.installment_number}</td>
                        <td>{formatDate(payment.due_date)}</td>
                        <td>{formatCurrency(payment.capital_amount || 0)}</td>
                        <td>{formatCurrency(payment.interest_amount || 0)}</td>
                        <td>{formatCurrency(payment.tva_amount || 0)}</td>
                        <td className="font-semibold">{formatCurrency(payment.total_amount || 0)}</td>
                        <td>
                          <span className={`badge ${payment.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>
                            {payment.status === 'paid' ? <CheckCircle size={12} /> : <Clock size={12} />}
                            {payment.status === 'paid' ? 'Payé' : 'En attente'}
                          </span>
                        </td>
                        <td>
                          {payment.status !== 'paid' && (
                            <button 
                              onClick={() => {
                                setSelectedPayment(payment);
                                setPaymentForm({
                                  installment_number: payment.installment_number,
                                  paid_amount: payment.total_amount,
                                  paid_date: new Date().toISOString().slice(0, 10),
                                  payment_method: "bank_transfer",
                                  transaction_reference: "",
                                  payment_notes: ""
                                });
                                setRecordPaymentModalOpen(true);
                              }}
                              className="record-payment-btn"
                            >
                              <Check size={12} /> Enregistrer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!selectedFinancing.payments || selectedFinancing.payments.length === 0) && (
                      <tr>
                        <td colSpan="8" className="text-center py-12">
                          Aucun échéancier généré.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="inline-details-footer">
            <button onClick={() => setShowPaymentDetails(false)} className="btn-secondary-full">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Main List View */}
      {!showPaymentForm && !showPaymentDetails && (
        <div className="admin-container">
          <div className="header">
            <div>
              <h1 className="title">Financements / Traites</h1>
              <p className="subtitle">Gestion des financements automobiles</p>
            </div>
            <div className="header-actions">
              <button onClick={refreshData} className="btn btn-secondary">
                <RefreshCw size={16} /> Actualiser
              </button>
              <button onClick={handleExport} className="btn btn-secondary">
                <Download size={16} /> Exporter
              </button>
              <button onClick={handleAddNew} className="btn btn-primary">
                <Plus size={16} /> Nouveau financement
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <p className="stat-label">Total Financements</p>
                <p className="stat-number">{stats.total}</p>
              </div>
              <CreditCardIcon size={32} className="stat-icon" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Actifs</p>
                <p className="stat-number text-green">{stats.active}</p>
              </div>
              <TrendingUp size={32} className="stat-icon text-green" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Terminés</p>
                <p className="stat-number text-blue">{stats.completed}</p>
              </div>
              <Check size={32} className="stat-icon text-blue" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Montant restant</p>
                <p className="stat-number text-red">{formatCurrency(stats.totalRemaining)}</p>
              </div>
              <AlertCircle size={32} className="stat-icon text-red" />
            </div>
          </div>

          <div className="search-wrapper">
            <div className="search-row">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Rechercher par véhicule, matricule ou dossier..." 
                  value={searchTerm} 
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                  className="search-input" 
                />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="filter-select">
                <option value="all">Tous statuts</option>
                <option value="active">Actif</option>
                <option value="completed">Terminé</option>
                <option value="late">En retard</option>
                <option value="defaulted">Impayé</option>
              </select>
            </div>
          </div>

          {/* FILTER INDICATOR - Added here */}
          {filterParam === 'notifications' && (
            <div className="filter-indicator">
              <span className="filter-indicator-text">
                <AlertCircle size={16} /> Affichage des financements avec échéances en retard ou à venir (7 jours)
              </span>
              <button
                onClick={() => setSearchParams({})}
                className="clear-filter-btn"
              >
                <X size={16} /> Effacer le filtre
              </button>
            </div>
          )}

          <div className="table-info">
            <p className="table-info-text">{filteredFinancings.length} financement(s) trouvé(s)</p>
            <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
          </div>

          <div className="table-wrapper">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("dossier")} className="sortable-header">Dossier N° {getSortIcon("dossier")}</th>
                    <th onClick={() => handleSort("vehicle")} className="sortable-header">Véhicule {getSortIcon("vehicle")}</th>
                    <th onClick={() => handleSort("matricule")} className="sortable-header">Matricule {getSortIcon("matricule")}</th>
                    <th onClick={() => handleSort("amount")} className="sortable-header">Montant {getSortIcon("amount")}</th>
                    <th onClick={() => handleSort("installment")} className="sortable-header">Mensualité {getSortIcon("installment")}</th>
                    <th onClick={() => handleSort("progress")} className="sortable-header">Progression {getSortIcon("progress")}</th>
                    <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12">Aucun financement</td>
                    </tr>
                  ) : (
                    paginated.map(f => {
                      const info = getMatriculeInfo(f.matricule_id);
                      const progress = f.total_installments > 0 ? (f.current_installment_number / f.total_installments) * 100 : 0;
                      return (
                        <tr key={f.id}>
                          <td className="font-medium">{f.dossier_number}</td>
                          <td>{info && info.car ? `${info.car.brand} ${info.car.model}` : "—"}</td>
                          <td className="matricule-code">{info ? info.matricule_code : "—"}</td>
                          <td className="amount-cell">{formatCurrency(f.credit_amount)}</td>
                          <td className="installment-cell">{formatCurrency(f.installment_amount)}</td>
                          <td>
                            <div className="progress-container">
                              <div className="progress-label">{f.current_installment_number || 0} / {f.total_installments || 0} échéances</div>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${
                              f.status === "active" ? "badge-success" :
                              f.status === "completed" ? "badge-blue" :
                              f.status === "late" ? "badge-warning" : "badge-danger"
                            }`}>
                              {f.status === "active" ? <CheckCircle size={12} /> : f.status === "completed" ? <Check size={12} /> : <AlertTriangle size={12} />}
                              {f.status === "active" ? "Actif" : f.status === "completed" ? "Terminé" : f.status === "late" ? "En retard" : "Impayé"}
                            </span>
                          </td>
                          <td className="text-right">
                            <div className="action-buttons">
                              <button onClick={() => handleViewDetails(f)} className="action-btn action-btn-view" title="Détails">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => openSchedulePrompt(f)} className="action-btn action-btn-calc" title="Générer échéancier">
                                <Calculator size={16} />
                              </button>
                              <button onClick={() => handleEdit(f)} className="action-btn action-btn-edit" title="Modifier">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteClick(f)} className="action-btn action-btn-delete" title="Supprimer">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="page-btn">
                  <ChevronLeft size={16} />
                </button>
                {[...Array(Math.min(totalPages,5))].map((_,i) => {
                  let pageNum = i+1;
                  if (totalPages>5 && currentPage>3) { pageNum = currentPage-3+i; if (pageNum>totalPages) return null; }
                  return <button key={i} onClick={() => setCurrentPage(pageNum)} className={`page-btn ${currentPage===pageNum?'active':''}`}>{pageNum}</button>;
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="page-btn">
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interest Rate Modal - Styled Prompt */}
      {interestModalOpen && currentFinancingForSchedule && (
        <div className="modal-overlay">
          <div className="modal interest-modal">
            <div className="interest-icon">
              <Calculator size={32} />
            </div>
            <h3 className="interest-title">Générer l'échéancier</h3>
            <p className="interest-subtitle">
              Financement {currentFinancingForSchedule.dossier_number}
            </p>
            <div className="modal-form">
              <div className="interest-field">
                <label><Percent size={16} /> Taux d'intérêt annuel (%)</label>
                <div className="interest-input-wrapper">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={interestRate} 
                    onChange={(e) => setInterestRate(e.target.value)} 
                    className="interest-input" 
                    placeholder="Ex: 5"
                  />
                  <span className="interest-unit">%</span>
                </div>
              </div>
              <div className="interest-field">
                <label><Percent size={16} /> Taux de TVA (%)</label>
                <div className="interest-input-wrapper">
                  <input 
                    type="number" 
                    step="0.1" 
                    value={tvaRate} 
                    onChange={(e) => setTvaRate(e.target.value)} 
                    className="interest-input" 
                    placeholder="Ex: 20"
                  />
                  <span className="interest-unit">%</span>
                </div>
              </div>
              <div className="interest-note">
                <Info size={14} />
                <span>Le système va générer un échéancier détaillé avec calcul des intérêts et de la TVA pour chaque mensualité.</span>
              </div>
              <div className="modal-actions">
                <button onClick={() => setInterestModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                <button onClick={confirmGenerateSchedule} className="modal-btn modal-btn-submit">
                  <Calculator size={16} /> Générer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && financingToDelete && (
        <div className="modal-overlay">
          <div className="modal delete-modal">
            <div className="delete-icon">
              <TrashIcon size={32} />
            </div>
            <h3 className="delete-title">Confirmer la suppression</h3>
            <p className="delete-message">
              Êtes-vous sûr de vouloir supprimer le financement <br />
              <span className="dossier-number">{financingToDelete.dossier_number}</span> ?<br />
              Cette action est irréversible.
            </p>
            {financingToDelete.total_paid > 0 && (
              <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                ⚠️ Ce financement a déjà des paiements enregistrés ({formatCurrency(financingToDelete.total_paid)}). La suppression affectera les données associées.
              </p>
            )}
            <div className="delete-actions">
              <button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
              <button onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordPaymentModalOpen && selectedFinancing && selectedPayment && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">
                <Wallet size={20} />
                Enregistrer paiement - Échéance N°{selectedPayment.installment_number}
              </h2>
              <button onClick={() => setRecordPaymentModalOpen(false)} className="modal-close"><X size={20} /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label"><DollarSign size={16} /> Montant à payer (DH) *</label>
                  <input type="number" step="0.01" required value={paymentForm.paid_amount} onChange={(e) => setPaymentForm({ ...paymentForm, paid_amount: parseFloat(e.target.value) })} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label"><Calendar size={16} /> Date paiement *</label>
                  <input type="date" required value={paymentForm.paid_date} onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value })} className="form-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label"><CreditCard size={16} /> Mode paiement</label>
                  <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="form-select">
                    <option value="bank_transfer">Virement bancaire</option>
                    <option value="check">Chèque</option>
                    <option value="cash">Espèces</option>
                    <option value="card">Carte bancaire</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><Tag size={16} /> Référence transaction</label>
                  <input type="text" value={paymentForm.transaction_reference} onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })} className="form-input" placeholder="Référence du virement" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Info size={16} /> Notes</label>
                <textarea value={paymentForm.payment_notes} onChange={(e) => setPaymentForm({ ...paymentForm, payment_notes: e.target.value })} className="form-textarea" rows="2" placeholder="Notes supplémentaires..." />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setRecordPaymentModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                <button type="submit" className="modal-btn modal-btn-submit" disabled={submitting}>
                  {submitting ? "Traitement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        /* Global styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; background: #f8fafc; }

        /* Sortable Headers */
        .sortable-header {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s;
        }
        .sortable-header:hover {
          background-color: #e2e8f0;
        }
        .sort-icon {
          display: inline-block;
          margin-left: 4px;
          opacity: 0.5;
          vertical-align: middle;
        }
        .sort-icon.active {
          opacity: 1;
          color: #eab308;
        }

        /* Inline Form Styles */
        .inline-form-container {
          background: white;
          border-radius: 32px;
          margin: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .inline-form-header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 24px 32px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }

        .inline-form-icon {
          width: 56px;
          height: 56px;
          background: #eab308;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a2e;
        }

        .inline-form-title h2 {
          color: #eab308;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }

        .inline-form-title p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          margin: 4px 0 0 0;
        }

        .inline-form-close {
          position: absolute;
          top: 24px;
          right: 28px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 40px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .inline-form-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .inline-form {
          padding: 28px 32px;
        }

        .inline-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .inline-form-col {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .inline-section {
          background: #f8fafc;
          border-radius: 24px;
          padding: 20px;
          border: 1px solid #e2e8f0;
        }

        .inline-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding-bottom: 12px;
          border-bottom: 2px solid #eab308;
        }

        .inline-section-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0;
        }

        .inline-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .inline-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .inline-field label {
          font-size: 0.7rem;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .inline-input, .inline-select, .inline-textarea {
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          font-family: inherit;
        }

        .inline-input:focus, .inline-select:focus, .inline-textarea:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }

        .inline-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .inline-info-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .inline-info-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .inline-info-item .info-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .inline-info-item .info-value {
          font-size: 0.875rem;
          font-weight: 500;
          color: #1e293b;
        }

        .inline-secondary-btn {
          background: white;
          border: 1.5px solid #e2e8f0;
          padding: 10px 24px;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .inline-secondary-btn:hover {
          border-color: #eab308;
          color: #eab308;
        }

        .inline-primary-btn {
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border: none;
          padding: 12px 28px;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #eab308;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .inline-primary-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(26, 26, 46, 0.4);
          color: #fbbf24;
        }

        .inline-primary-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .inline-form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          margin-top: 24px;
        }

        /* Searchable select styles */
        .inline-search-section {
          background: white;
          border-radius: 16px;
          padding: 12px;
          border: 1px solid #e2e8f0;
          width: 100%;
        }

        .inline-search-input-wrapper {
          position: relative;
        }

        .inline-search-input-wrapper svg {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .inline-search-input-wrapper .inline-input {
          padding-left: 42px;
          padding-right: 42px;
          width: 100%;
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 4px;
        }

        .clear-search-btn:hover {
          color: #ef4444;
        }

        .inline-results {
          max-height: 250px;
          overflow-y: auto;
          margin-top: 8px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: white;
        }

        .inline-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.2s;
        }

        .inline-result-item:hover {
          background: #fefce8;
        }

        .inline-result-avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #1a1a2e, #16213e);
          border-radius: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #eab308;
          flex-shrink: 0;
        }

        .inline-result-info {
          flex: 1;
        }

        .inline-result-info strong {
          display: block;
          margin-bottom: 4px;
          font-size: 0.875rem;
        }

        .inline-result-details {
          display: flex;
          gap: 12px;
          font-size: 0.7rem;
          color: #64748b;
          flex-wrap: wrap;
        }

        .inline-selected {
          background: linear-gradient(135deg, #fefce8, #fef3c7);
          border-radius: 12px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
        }

        .inline-selected svg {
          color: #eab308;
          flex-shrink: 0;
        }

        .inline-selected strong {
          display: block;
          font-size: 0.7rem;
          color: #92400e;
        }

        .inline-selected p {
          font-size: 0.8rem;
          font-weight: 500;
          margin: 0;
        }

        .inline-no-results {
          padding: 0.75rem;
          color: #64748b;
          font-size: 0.875rem;
          text-align: center;
        }

        /* Inline Details Styles */
        .inline-details-container {
          background: white;
          border-radius: 32px;
          margin: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          overflow: hidden;
        }

        .inline-details-header {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          padding: 24px 32px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }

        .inline-details-icon {
          width: 56px;
          height: 56px;
          background: #eab308;
          border-radius: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1a1a2e;
        }

        .inline-details-title h2 {
          color: #eab308;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }

        .inline-details-title p {
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.875rem;
          margin: 4px 0 0 0;
        }

        .inline-details-close {
          position: absolute;
          top: 24px;
          right: 28px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 40px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: white;
          transition: all 0.2s;
        }

        .inline-details-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .inline-details-content {
          padding: 28px 32px;
        }

        .inline-details-footer {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          padding: 20px 32px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .btn-secondary-full {
          background: white;
          border: 1.5px solid #e2e8f0;
          padding: 10px 24px;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary-full:hover {
          border-color: #eab308;
          color: #eab308;
        }

        .details-actions-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 8px 16px;
          background: #f1f5f9;
          border: none;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .back-btn:hover {
          background: #e2e8f0;
        }

        .details-action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .action-edit-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 8px 16px;
          background: #10b981;
          border: none;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-edit-btn:hover {
          background: #059669;
        }

        .action-delete-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 8px 16px;
          background: #ef4444;
          border: none;
          border-radius: 40px;
          font-size: 0.875rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-delete-btn:hover {
          background: #dc2626;
        }

        /* Financing Header Card */
        .financing-header-card {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          border-radius: 1rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .financing-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-item-detail {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.75rem;
          border-radius: 0.75rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
        }

        .stat-label-detail {
          font-size: 0.7rem;
          opacity: 0.7;
          margin-top: 0.25rem;
          color: white;
        }

        .text-green { color: #16a34a; }
        .text-success { color: #22c55e; }
        .text-danger { color: #dc2626; }

        /* Details Sections Grid */
        .details-sections-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .detail-card {
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
        }

        .detail-card-title {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-card-content {
          padding: 1rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f1f5f9;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 0.75rem;
          color: #64748b;
        }

        .info-value {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .matricule-value {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #eab308;
        }

        .status-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .status-active {
          background: #dcfce7;
          color: #166534;
        }

        .status-completed {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-late {
          background: #fef3c7;
          color: #92400e;
        }

        /* Progress */
        .progress-wrapper {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }

        .progress-bar {
          flex: 1;
          height: 0.375rem;
          background-color: #e2e8f0;
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background-color: #eab308;
          border-radius: 9999px;
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 0.7rem;
          color: #64748b;
        }

        /* Notes Section */
        .notes-section {
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }

        .notes-title {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .notes-content {
          padding: 1rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        /* Payments Section */
        .payments-section {
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
        }

        .payments-section-header {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          font-weight: 600;
          font-size: 0.875rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e2e8f0;
        }

        .generate-schedule-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.25rem 0.75rem;
          background: #eab308;
          border: none;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 500;
          color: #1a1a2e;
          cursor: pointer;
        }

        .payments-table-wrapper {
          overflow-x: auto;
        }

        .payments-table {
          width: 100%;
          font-size: 0.75rem;
          border-collapse: collapse;
        }

        .payments-table th,
        .payments-table td {
          padding: 0.75rem 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
        }

        .payments-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #64748b;
        }

        .record-payment-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #10b981;
          border: none;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 500;
          color: white;
          cursor: pointer;
        }

        /* Admin Container Styles */
        .admin-container {
          max-width: 1400px;
          padding: 1.5rem;
          margin: 0 auto;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .title {
          font-size: 1.875rem;
          font-weight: 700;
          background: linear-gradient(135deg, #0f172a, #334155);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }

        .subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          height: 2.5rem;
          padding: 0 1rem;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .btn-secondary {
          background: #f1f5f9;
          color: #1e293b;
        }

        .btn-secondary:hover {
          background: #e2e8f0;
          transform: translateY(-1px);
        }

        .btn-primary {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }

        .btn-primary:hover {
          background: linear-gradient(135deg, #1e293b, #334155);
          transform: translateY(-1px);
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1rem;
          transition: all 0.2s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);
        }

        .stat-number {
          font-size: 1.875rem;
          font-weight: 700;
        }

        .stat-label {
          font-size: 0.7rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-icon {
          opacity: 0.5;
        }

        .text-green { color: #16a34a; }
        .text-blue { color: #3b82f6; }
        .text-red { color: #dc2626; }

        /* Search */
        .search-wrapper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-row {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .search-container {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
        }

        .search-input {
          width: 100%;
          padding: 0.5rem 1rem 0.5rem 2.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
        }

        .filter-select {
          width: 12rem;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
        }

        /* Filter Indicator */
        .filter-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .filter-indicator-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #92400e;
        }
        .clear-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: none;
          border: 1px solid #92400e;
          padding: 0.25rem 0.75rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: #92400e;
          cursor: pointer;
          transition: all 0.2s;
        }
        .clear-filter-btn:hover {
          background: #92400e;
          color: white;
        }

        /* Table Info */
        .table-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding: 0 0.25rem;
        }

        .table-info-text {
          font-size: 0.875rem;
          color: #64748b;
        }

        /* Table */
        .table-wrapper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .table {
          width: 100%;
          font-size: 0.875rem;
          border-collapse: collapse;
        }

        .table th {
          text-align: left;
          padding: 0.75rem 1rem;
          background: #f8fafc;
          color: #64748b;
          font-weight: 500;
        }

        .table td {
          padding: 0.75rem 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .table tr:hover {
          background: #f8fafc;
        }

        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }

        .matricule-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #eab308;
        }

        .amount-cell, .installment-cell {
          font-weight: 600;
        }

        .progress-container {
          min-width: 140px;
        }

        .progress-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }

        /* Badges */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .badge-success { background: #dcfce7; color: #166534; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-paid { background: #dcfce7; color: #166534; }
        .badge-pending { background: #fef3c7; color: #92400e; }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .action-btn {
          padding: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn-view { color: #3b82f6; }
        .action-btn-view:hover { background: #eff6ff; }
        .action-btn-calc { color: #8b5cf6; }
        .action-btn-calc:hover { background: #f5f3ff; }
        .action-btn-edit { color: #10b981; }
        .action-btn-edit:hover { background: #ecfdf5; }
        .action-btn-delete { color: #ef4444; }
        .action-btn-delete:hover { background: #fef2f2; }

        /* Pagination */
        .pagination {
          display: flex;
          justify-content: center;
          gap: 0.25rem;
          padding: 1rem;
          border-top: 1px solid #e2e8f0;
        }

        .page-btn {
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .page-btn:hover:not(:disabled) { background: #f1f5f9; }
        .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: white;
          border-radius: 1.5rem;
          max-width: 32rem;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease;
        }

        .interest-modal {
          max-width: 28rem;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem 1.5rem 0 1.5rem;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .modal-close {
          background: #f1f5f9;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover { background: #e2e8f0; }

        .modal-form {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-input, .form-select, .form-textarea {
          height: 2.75rem;
          padding: 0 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: white;
          transition: all 0.2s;
        }

        .form-textarea {
          height: auto;
          min-height: 80px;
          resize: vertical;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #0f172a;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 0.5rem;
        }

        .modal-btn {
          flex: 1;
          height: 2.75rem;
          border-radius: 0.75rem;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .modal-btn-cancel {
          border: 1px solid #e2e8f0;
          background: white;
        }

        .modal-btn-cancel:hover { background: #f8fafc; }

        .modal-btn-submit {
          background: linear-gradient(135deg, #0f172a, #1e293b);
          color: white;
        }

        .modal-btn-submit:hover:not(:disabled) {
          background: linear-gradient(135deg, #1e293b, #334155);
          transform: translateY(-1px);
        }

        .modal-btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Delete Modal */
        .delete-modal {
          max-width: 28rem;
        }

        .delete-icon {
          width: 4rem;
          height: 4rem;
          background: #fee2e2;
          border-radius: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
          color: #ef4444;
        }

        .delete-title {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .delete-message {
          text-align: center;
          font-size: 0.875rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .dossier-number {
          font-weight: 700;
          color: #0f172a;
          background: #f1f5f9;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          display: inline-block;
        }

        .delete-actions {
          display: flex;
          gap: 0.75rem;
          padding-top: 1rem;
        }

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover { background: #dc2626; }

        /* Interest Modal */
        .interest-icon {
          width: 4rem;
          height: 4rem;
          background: linear-gradient(135deg, #dbeafe, #e0e7ff);
          border-radius: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 1.5rem auto 0;
          color: #3b82f6;
        }

        .interest-title {
          text-align: center;
          font-size: 1.25rem;
          font-weight: 700;
          margin: 1rem 0 0.5rem;
        }

        .interest-subtitle {
          text-align: center;
          font-size: 0.75rem;
          color: #64748b;
          margin-bottom: 1rem;
        }

        .interest-field {
          margin-bottom: 1rem;
        }

        .interest-field label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #0f172a;
        }

        .interest-input-wrapper {
          position: relative;
        }

        .interest-input {
          width: 100%;
          height: 2.75rem;
          padding: 0 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: white;
          transition: all 0.2s;
          padding-right: 2.5rem;
        }

        .interest-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .interest-unit {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .interest-note {
          font-size: 0.7rem;
          color: #64748b;
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #f1f5f9;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .loading {
          text-align: center;
          padding: 3rem;
        }

        .spinner {
          display: inline-block;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: 2px solid #e2e8f0;
          border-top-color: #0f172a;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .py-12 { padding: 3rem 0; }

        /* Responsive */
        @media (max-width: 1024px) {
          .inline-form-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }
        }

        @media (max-width: 768px) {
          .admin-container { padding: 1rem; }
          .header { flex-direction: column; align-items: flex-start; }
          .header-actions { width: 100%; justify-content: flex-start; }
          .search-row { flex-direction: column; }
          .filter-select { width: 100%; }
          .form-row { grid-template-columns: 1fr; }
          .inline-grid-2 { grid-template-columns: 1fr; }
          .inline-form-container, .inline-details-container { margin: 1rem; }
          .inline-form-header, .inline-details-header { padding: 16px 20px; }
          .inline-form-header h2, .inline-details-title h2 { font-size: 1.25rem; }
          .inline-form, .inline-details-content { padding: 20px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .details-sections-grid { grid-template-columns: 1fr; }
          .financing-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .details-actions-bar { flex-direction: column; align-items: stretch; }
          .details-action-buttons { justify-content: center; }
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .table-wrapper, .search-wrapper, .modal, .inline-form-container, .inline-details-container, .detail-card {
            background: #1e293b;
            border-color: #334155;
          }
          .stat-label, .table-info-text, .table th, .subtitle, .info-label, .delete-message, .interest-subtitle, .progress-label {
            color: #94a3b8;
          }
          .title {
            background: linear-gradient(135deg, #f1f5f9, #94a3b8);
            background-clip: text;
            -webkit-background-clip: text;
          }
          .btn-secondary, .btn-secondary-full, .back-btn {
            background: #334155;
            color: #e2e8f0;
          }
          .btn-secondary:hover, .btn-secondary-full:hover, .back-btn:hover { background: #475569; }
          .search-input, .filter-select, .inline-input, .inline-select, .inline-textarea, .form-input, .form-select, .form-textarea, .interest-input {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .inline-section, .detail-card-title, .payments-section-header, .notes-title {
            background: #0f172a;
            border-color: #334155;
          }
          .inline-section-header h3, .inline-info-item .info-value, .dossier-number {
            color: #f1f5f9;
          }
          .page-btn {
            background: #1e293b;
            border-color: #475569;
            color: #e2e8f0;
          }
          .page-btn.active {
            background: #f59e0b;
            color: #0f172a;
          }
          .badge-success, .badge-paid { background: #14532d; color: #4ade80; }
          .badge-blue { background: #1e3a5f; color: #60a5fa; }
          .badge-warning, .badge-pending { background: #78350f; color: #fde68a; }
          .badge-danger { background: #7f1d1d; color: #fca5a5; }
          .table tr:hover { background: #334155; }
          .info-row { border-bottom-color: #334155; }
          .progress-bar { background-color: #334155; }
          .payments-table th { background: #0f172a; color: #94a3b8; }
          .payments-table td { border-bottom-color: #334155; }
          .interest-note { background: #334155; }
          .action-btn-view:hover { background: #1e3a5f; }
          .action-btn-calc:hover { background: #4c1d95; }
          .action-btn-edit:hover { background: #064e3b; }
          .action-btn-delete:hover { background: #7f1d1d; }
          .action-edit-btn { background: #059669; }
          .action-delete-btn { background: #dc2626; }
          .sortable-header:hover {
            background-color: #334155;
          }
          .inline-search-section {
            background: #0f172a;
            border-color: #334155;
          }
          .inline-result-item {
            border-bottom-color: #334155;
          }
          .inline-result-item:hover {
            background: #334155;
          }
          .inline-selected {
            background: #334155;
            color: #e2e8f0;
          }
          .inline-selected strong {
            color: #eab308;
          }
          .inline-selected p {
            color: #f1f5f9;
          }
          .inline-no-results {
            color: #94a3b8;
          }
          .clear-search-btn {
            color: #94a3b8;
          }
          .clear-search-btn:hover {
            color: #ef4444;
          }
          .stat-value, .stat-label-detail {
            color: white;
          }
          .filter-indicator {
            background: #78350f;
            border-color: #f59e0b;
          }
          .filter-indicator-text {
            color: #fde68a;
          }
          .clear-filter-btn {
            border-color: #fde68a;
            color: #fde68a;
          }
          .clear-filter-btn:hover {
            background: #fde68a;
            color: #1e293b;
          }
        }
      `}</style>
    </>
  );
}