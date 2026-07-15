// src/pages/admin/AdminMatricules.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  fetchMatricules, fetchCars, createMatricule, updateMatricule, deleteMatricule,
  updateMatriculeKilometrage, refreshMatricules,
  fetchReservations, createAccident,
  selectMatricules, selectCars, selectMatriculesLoading, selectReservations,
  fetchClients, selectClients
} from "../../Redux/store";
import PaginationControls from '../../components/PaginationControls';
import { toast } from "sonner";
import {
  Plus, Edit2, Trash2, X, Search, RefreshCw, Car, Tag, Gauge, Calendar,
  CheckCircle, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  Save, TrashIcon, CarFront, Sparkles, Star,
  Info, Activity, ArrowUpDown, ArrowUp, ArrowDown, Eye,
  Droplet, Filter, Wind, CircleStop, Droplets, PlusCircle, History, BarChart3,
  Clock, CalendarDays, Wrench, FileText, AlertTriangle, Loader2, User, Scale, Gavel
} from "lucide-react";

export default function AdminMatricules() {
  const dispatch = useDispatch();
  const matricules = useSelector(selectMatricules);
  const cars = useSelector(selectCars);
  const loading = useSelector(selectMatriculesLoading);
  const reservations = useSelector(selectReservations);
  const clients = useSelector(selectClients);

  // URL search params for filtering
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  // UI state
  const [showMatriculeForm, setShowMatriculeForm] = useState(false);
  const [showMatriculeDetails, setShowMatriculeDetails] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [matriculeToDelete, setMatriculeToDelete] = useState(null);
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [editingMatricule, setEditingMatricule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Accident inline form state
  const [showAccidentForm, setShowAccidentForm] = useState(false);
  const [selectedMatriculeForAccident, setSelectedMatriculeForAccident] = useState(null);
  const [accidentSubmitting, setAccidentSubmitting] = useState(false);
  const [reservationsForMatricule, setReservationsForMatricule] = useState([]);
  const [accidentFormData, setAccidentFormData] = useState({
    matricule_id: '',
    car_id: '',
    client_id: '',
    reservation_id: '',
    date_accident: new Date().toISOString().slice(0, 10),
    amount_of_losses: 0,
    amount_assurance: 0,
    nom_expert: '',
    status: 'open',
    accident_type: 'grave',
    procedure_type: 'classic',
    expert_decision: 'pending',
    expert_amount: 0,
    expert_notes: '',
    notes: ''
  });

  // --- Search state for reservation in accident form ---
  const [reservationSearchTerm, setReservationSearchTerm] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filteredReservations, setFilteredReservations] = useState([]);

  // Sorting
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");

  // Details view – maintenance forms
  const [activeMaintenanceTab, setActiveMaintenanceTab] = useState('required');
  const [showAddForm, setShowAddForm] = useState(null);
  const [showHistoryFor, setShowHistoryFor] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [additionalItemName, setAdditionalItemName] = useState('');
  const [additionalItemQuantity, setAdditionalItemQuantity] = useState('');
  const [additionalItemRequired, setAdditionalItemRequired] = useState(false);
  const [additionalItemType, setAdditionalItemType] = useState('quantity');
  const [additionalItemNotes, setAdditionalItemNotes] = useState('');

const [itemsPerPage, setItemsPerPage] = useState(10);
  // Car search state for the form
  const [carSearchTerm, setCarSearchTerm] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [filteredCars, setFilteredCars] = useState([]);

  // Form data pour création/édition
  const [formData, setFormData] = useState({
    matricule_code: "",
    car_id: "",
    status: "active",
    kilometrage: 0,
    visit_tech: "",
    date_assurance: "",
    date_taxe_voiture: "",
    vidange_status: "not done"
  });

  // Chargement initial
  useEffect(() => {
    loadData();
    dispatch(fetchReservations());
  }, [dispatch]);

  const loadData = async () => {
    await Promise.all([
      dispatch(fetchMatricules()),
      dispatch(fetchCars()),
      dispatch(fetchClients())
    ]);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await dispatch(refreshMatricules());
    await dispatch(fetchCars());
    await dispatch(fetchClients());
    await dispatch(fetchReservations());
    setRefreshing(false);
    toast.success("Données actualisées");
  };

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

  // Mettre à jour localement le matricule sélectionné sans refresh global
  const updateLocalMatricule = (updatedData) => {
    setSelectedMatricule(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  // Helper to check if a matricule has any notification (expired or upcoming documents)
  const hasMatriculeNotification = (mat) => {
    const visitTech = mat.visit_tech ? new Date(mat.visit_tech) : null;
    const assurance = mat.date_assurance ? new Date(mat.date_assurance) : null;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const isVisitTechExpired = visitTech && visitTech < today;
    const isVisitTechSoon = visitTech && (visitTech - today) / (1000*60*60*24) <= 7 && visitTech >= today;
    
    const isAssuranceExpired = assurance && assurance < today;
    const isAssuranceSoon = assurance && (assurance - today) / (1000*60*60*24) <= 7 && assurance >= today;
    
    return isVisitTechExpired || isVisitTechSoon || isAssuranceExpired || isAssuranceSoon;
  };

  // ==================== ACCIDENT FORM FUNCTIONS ====================
  const handleOpenAccidentForm = (mat) => {
    const matriculeReservations = reservations.filter(r => r.matricule_id === mat.id);
    setReservationsForMatricule(matriculeReservations);
    setSelectedMatriculeForAccident(mat);
    // Reset reservation search
    setReservationSearchTerm("");
    setSelectedReservation(null);
    setFilteredReservations([]);
    setAccidentFormData({
      matricule_id: mat.id,
      car_id: mat.car_id,
      client_id: '',
      reservation_id: '',
      date_accident: new Date().toISOString().slice(0, 10),
      amount_of_losses: 0,
      amount_assurance: 0,
      nom_expert: '',
      status: 'open',
      accident_type: 'grave',
      procedure_type: 'classic',
      expert_decision: 'pending',
      expert_amount: 0,
      expert_notes: '',
      notes: ''
    });
    setShowAccidentForm(true);
  };

  // Reservation search handler
  const handleReservationSearch = (term) => {
    setReservationSearchTerm(term);
    if (term.trim() === "") {
      setFilteredReservations([]);
      return;
    }
    const lowerTerm = term.toLowerCase().trim();
    const filtered = reservationsForMatricule.filter(res => {
      const client = clients.find(c => c.id === res.client_id);
      const clientName = client ? `${client.prenom} ${client.nom}`.toLowerCase() : "";
      const startDate = new Date(res.start_date).toLocaleDateString("fr-FR");
      const endDate = new Date(res.end_date).toLocaleDateString("fr-FR");
      return (
        res.id.toString().includes(lowerTerm) ||
        clientName.includes(lowerTerm) ||
        startDate.includes(lowerTerm) ||
        endDate.includes(lowerTerm)
      );
    });
    setFilteredReservations(filtered.slice(0, 10));
  };

  const handleReservationSelect = (reservation) => {
    setSelectedReservation(reservation);
    setReservationSearchTerm(
      `#${reservation.id} - ${new Date(reservation.start_date).toLocaleDateString("fr-FR")} → ${new Date(reservation.end_date).toLocaleDateString("fr-FR")} - Client: ${clients.find(c => c.id === reservation.client_id)?.prenom} ${clients.find(c => c.id === reservation.client_id)?.nom || 'N/A'}`
    );
    setAccidentFormData({
      ...accidentFormData,
      reservation_id: reservation.id,
      client_id: reservation.client_id
    });
    setFilteredReservations([]);
  };

  const clearReservationSelection = () => {
    setSelectedReservation(null);
    setReservationSearchTerm("");
    setAccidentFormData(prev => ({ ...prev, reservation_id: "", client_id: "" }));
    setFilteredReservations([]);
  };

  const handleSubmitAccident = async (e) => {
    e.preventDefault();
    if (!accidentFormData.client_id) {
      toast.error("Veuillez sélectionner une réservation");
      return;
    }
    if (!accidentFormData.amount_of_losses || accidentFormData.amount_of_losses <= 0) {
      toast.error("Veuillez saisir le montant des pertes");
      return;
    }

    try {
      setAccidentSubmitting(true);

      const accidentData = {
        matricule_id: accidentFormData.matricule_id,
        car_id: accidentFormData.car_id,
        client_id: accidentFormData.client_id,
        reservation_id: accidentFormData.reservation_id || null,
        date_accident: accidentFormData.date_accident,
        time_accident: "",
        location: "",
        description: "",
        police_report_number: "",
        amount_of_losses: accidentFormData.amount_of_losses,
        amount_assurance: accidentFormData.amount_assurance || 0,
        nom_expert: accidentFormData.nom_expert || null,
        status: accidentFormData.status || "open",
        accident_type: accidentFormData.accident_type || "grave",
        procedure_type: accidentFormData.procedure_type || "classic",
        expert_decision: accidentFormData.expert_decision || "pending",
        expert_amount: accidentFormData.expert_amount || 0,
        expert_notes: accidentFormData.expert_notes || null,
        notes: accidentFormData.notes || null,
        garage_id: null,
        inspection_notes: null,
        estimated_cost: 0,
        total_repair_cost: 0,
        franchise_amount: 0,
        insurance_paid: 0,
        client_paid: 0,
        total_paid: 0,
        remaining_amount: 0,
        internal_notes: null,
        closed_at: null,
        estimate_items: [],
        estimate_total_ht: 0,
        estimate_tva: 0,
        estimate_total_ttc: 0,
        estimate_status: "draft",
        repair_start_date: null,
        repair_end_date: null,
        repair_notes: null,
        invoice_number: null,
        invoice_items: [],
        invoice_total_ht: 0,
        invoice_tva: 0,
        invoice_total_ttc: 0,
        payments: [],
        img_accident: [],
        img_evaluation_expert: [],
        img_fixed: [],
        image_facture: []
      };

      await dispatch(createAccident(accidentData)).unwrap();
      toast.success("Accident créé avec succès");
      setShowAccidentForm(false);
      setSelectedMatriculeForAccident(null);

      await refreshData();

    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de la création");
    } finally {
      setAccidentSubmitting(false);
    }
  };

  const resetAccidentForm = () => {
    setAccidentFormData({
      matricule_id: '',
      car_id: '',
      client_id: '',
      reservation_id: '',
      date_accident: new Date().toISOString().slice(0, 10),
      amount_of_losses: 0,
      amount_assurance: 0,
      nom_expert: '',
      status: 'open',
      accident_type: 'grave',
      procedure_type: 'classic',
      expert_decision: 'pending',
      expert_amount: 0,
      expert_notes: '',
      notes: ''
    });
    setSelectedMatriculeForAccident(null);
    setReservationsForMatricule([]);
    setReservationSearchTerm("");
    setSelectedReservation(null);
    setFilteredReservations([]);
  };

  // ==================== HELPERS ====================
  const statusConfig = {
  active: { label: "Actif", bg: "badge-success", icon: CheckCircle },
  inactive: { label: "Inactif", bg: "badge-danger", icon: XCircle },
  sold: { label: "Vendu", bg: "badge-sold", icon: AlertCircle },   // NEW
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

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("fr-FR") + " " + date.toLocaleTimeString("fr-FR");
    } catch {
      return dateString;
    }
  };

  const isDateExpired = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    return date < today;
  };

  const isDateExpiringSoon = (dateString, days = 30) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    return diffDays <= days && diffDays > 0;
  };

  const getDateStatusInfo = (date) => {
    if (!date) return null;
    if (isDateExpired(date)) return { class: 'date-expired', icon: AlertTriangle, text: 'Expiré' };
    if (isDateExpiringSoon(date)) return { class: 'date-soon', icon: Clock, text: 'Expire bientôt' };
    return { class: 'date-ok', icon: CheckCircle, text: 'Valide' };
  };

  // ==================== CALCUL PROGRESSION VIDANGE ====================
  const calculateRequiredTasksProgress = (mat) => {
    let requiredTasks = [];
    let completedTasks = 0;

    requiredTasks.push('Huile');
    if (mat.oil === 'yes') completedTasks++;

    requiredTasks.push('Filtre à Huile');
    if (mat.filter_oil === 'yes') completedTasks++;

    const additionalMaintenance = mat.additional_maintenance || [];
    additionalMaintenance.forEach(item => {
      if (item.required_for_vidange) {
        requiredTasks.push(item.name);
        let isCompleted = false;
        if (item.type === 'quantity') {
          isCompleted = (item.value && item.value > 0);
        } else if (item.type === 'note') {
          isCompleted = !item.needs_attention;
        }
        if (isCompleted) completedTasks++;
      }
    });

    const total = requiredTasks.length;
    const percentage = total > 0 ? (completedTasks / total) * 100 : 0;
    const isVidangeDone = total > 0 && completedTasks === total;

    return { total, completed: completedTasks, percentage, isVidangeDone };
  };

  // ==================== ACTIONS MAINTENANCE ====================
  const handleAddOil = async () => {
    if (!selectedMatricule) return;
    if (!newQuantity || parseFloat(newQuantity) <= 0) {
      toast.error("Veuillez saisir une quantité d'huile valide");
      return;
    }

    const quantity = parseFloat(newQuantity);
    const currentTotal = parseFloat(selectedMatricule.oil_quantity || 0);
    const newTotal = currentTotal + quantity;

    const historyEntry = {
      id: Date.now().toString(),
      quantity: quantity,
      date: newDate,
      created_at: new Date().toISOString(),
      kilometrage: selectedMatricule.kilometrage
    };

    const currentHistory = selectedMatricule.oil_history || [];
    const newHistory = [...currentHistory, historyEntry];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: {
          oil: 'yes',
          oil_date: newDate,
          oil_quantity: newTotal,
          oil_history: newHistory
        }
      })).unwrap();

      updateLocalMatricule({
        oil: 'yes',
        oil_date: newDate,
        oil_quantity: newTotal,
        oil_history: newHistory
      });

      toast.success(`Huile ajoutée : +${quantity.toFixed(1)} L (total: ${newTotal.toFixed(1)} L)`);
      setShowAddForm(null);
      setNewQuantity('');
      setNewDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFilterOil = async () => {
    if (!selectedMatricule) return;

    const currentCount = selectedMatricule.filter_oil_count || 0;
    const newCount = currentCount + 1;

    const historyEntry = {
      id: Date.now().toString(),
      date: newDate,
      created_at: new Date().toISOString(),
      kilometrage: selectedMatricule.kilometrage
    };

    const currentHistory = selectedMatricule.filter_oil_history || [];
    const newHistory = [...currentHistory, historyEntry];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: {
          filter_oil: 'yes',
          filter_oil_date: newDate,
          filter_oil_count: newCount,
          filter_oil_history: newHistory
        }
      })).unwrap();

      updateLocalMatricule({
        filter_oil: 'yes',
        filter_oil_date: newDate,
        filter_oil_count: newCount,
        filter_oil_history: newHistory
      });

      toast.success("Filtre à huile ajouté avec succès");
      setShowAddForm(null);
      setNewDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddFilterAir = async () => {
    if (!selectedMatricule) return;

    const currentCount = selectedMatricule.filter_air_count || 0;
    const newCount = currentCount + 1;

    const historyEntry = {
      id: Date.now().toString(),
      date: newDate,
      created_at: new Date().toISOString(),
      kilometrage: selectedMatricule.kilometrage
    };

    const currentHistory = selectedMatricule.filter_air_history || [];
    const newHistory = [...currentHistory, historyEntry];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: {
          filter_air: 'yes',
          filter_air_date: newDate,
          filter_air_count: newCount,
          filter_air_history: newHistory
        }
      })).unwrap();

      updateLocalMatricule({
        filter_air: 'yes',
        filter_air_date: newDate,
        filter_air_count: newCount,
        filter_air_history: newHistory
      });

      toast.success("Filtre à air ajouté avec succès");
      setShowAddForm(null);
      setNewDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBrakePads = async () => {
    if (!selectedMatricule) return;

    const currentCount = selectedMatricule.paquets_de_frein_count || 0;
    const newCount = currentCount + 1;

    const historyEntry = {
      id: Date.now().toString(),
      date: newDate,
      created_at: new Date().toISOString(),
      kilometrage: selectedMatricule.kilometrage
    };

    const currentHistory = selectedMatricule.paquets_de_frein_history || [];
    const newHistory = [...currentHistory, historyEntry];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: {
          paquets_de_frein: 'yes',
          paquets_de_frein_date: newDate,
          paquets_de_frein_count: newCount,
          paquets_de_frein_history: newHistory
        }
      })).unwrap();

      updateLocalMatricule({
        paquets_de_frein: 'yes',
        paquets_de_frein_date: newDate,
        paquets_de_frein_count: newCount,
        paquets_de_frein_history: newHistory
      });

      toast.success("Paquets de frein ajoutés avec succès");
      setShowAddForm(null);
      setNewDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAdBlue = async () => {
    if (!selectedMatricule) return;
    if (!newQuantity || parseFloat(newQuantity) <= 0) {
      toast.error("Veuillez saisir une quantité d'Ad Blue valide");
      return;
    }

    const quantity = parseFloat(newQuantity);
    const currentTotal = parseFloat(selectedMatricule.ad_blue_quantity || 0);
    const newTotal = currentTotal + quantity;

    const historyEntry = {
      id: Date.now().toString(),
      quantity: quantity,
      date: newDate,
      created_at: new Date().toISOString(),
      kilometrage: selectedMatricule.kilometrage
    };

    const currentHistory = selectedMatricule.ad_blue_history || [];
    const newHistory = [...currentHistory, historyEntry];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: {
          ad_blue: 'yes',
          ad_blue_date: newDate,
          ad_blue_quantity: newTotal,
          ad_blue_history: newHistory
        }
      })).unwrap();

      updateLocalMatricule({
        ad_blue: 'yes',
        ad_blue_date: newDate,
        ad_blue_quantity: newTotal,
        ad_blue_history: newHistory
      });

      toast.success(`Ad Blue ajouté : +${quantity.toFixed(1)} L (total: ${newTotal.toFixed(1)} L)`);
      setShowAddForm(null);
      setNewQuantity('');
      setNewDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddAdditionalItem = async () => {
    if (!selectedMatricule) return;
    if (!additionalItemName.trim()) {
      toast.error("Veuillez saisir un nom pour l'élément");
      return;
    }

    const additionalMaintenance = selectedMatricule.additional_maintenance || [];

    const newItem = {
      id: Date.now().toString(),
      name: additionalItemName,
      type: additionalItemType,
      value: additionalItemType === 'quantity' ? (parseFloat(additionalItemQuantity) || 0) : '',
      required_for_vidange: additionalItemRequired,
      needs_attention: additionalItemType === 'note' ? true : false,
      notes: additionalItemNotes,
      history: additionalItemType === 'quantity' && additionalItemQuantity ? [{
        id: Date.now().toString(),
        quantity: parseFloat(additionalItemQuantity),
        date: newDate,
        created_at: new Date().toISOString(),
        kilometrage: selectedMatricule.kilometrage
      }] : [],
      last_done_date: additionalItemType === 'quantity' && additionalItemQuantity ? newDate : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newAdditionalMaintenance = [...additionalMaintenance, newItem];

    try {
      setSubmitting(true);
      await dispatch(updateMatricule({
        id: selectedMatricule.id,
        data: { additional_maintenance: newAdditionalMaintenance }
      })).unwrap();

      updateLocalMatricule({ additional_maintenance: newAdditionalMaintenance });

      toast.success("Élément ajouté avec succès");
      setShowAddForm(null);
      setAdditionalItemName('');
      setAdditionalItemQuantity('');
      setAdditionalItemRequired(false);
      setAdditionalItemNotes('');
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de l'ajout");
    } finally {
      setSubmitting(false);
    }
  };

  const getMaintenanceLabel = (type) => {
    const labels = {
      oil: "Huile",
      ad_blue: "Ad Blue",
      filter_oil: "Filtre à Huile",
      filter_air: "Filtre à Air",
      paquets_de_frein: "Paquets de Frein"
    };
    return labels[type] || type;
  };

  const getMaintenanceStatus = (mat, type) => {
    switch (type) {
      case 'oil': return mat.oil === 'yes';
      case 'filter_oil': return mat.filter_oil === 'yes';
      case 'filter_air': return mat.filter_air === 'yes';
      case 'paquets_de_frein': return mat.paquets_de_frein === 'yes';
      case 'ad_blue': return mat.ad_blue === 'yes';
      default: return false;
    }
  };

  const getMaintenanceValue = (mat, type) => {
    switch (type) {
      case 'oil': return { total: parseFloat(mat.oil_quantity || 0), lastDate: mat.oil_date, history: mat.oil_history || [] };
      case 'filter_oil': return { total: mat.filter_oil_count || 0, lastDate: mat.filter_oil_date, history: mat.filter_oil_history || [] };
      case 'filter_air': return { total: mat.filter_air_count || 0, lastDate: mat.filter_air_date, history: mat.filter_air_history || [] };
      case 'paquets_de_frein': return { total: mat.paquets_de_frein_count || 0, lastDate: mat.paquets_de_frein_date, history: mat.paquets_de_frein_history || [] };
      case 'ad_blue': return { total: parseFloat(mat.ad_blue_quantity || 0), lastDate: mat.ad_blue_date, history: mat.ad_blue_history || [] };
      default: return { total: 0, lastDate: null, history: [] };
    }
  };

  // ==================== SORT ====================
  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDirection("asc"); }
  };
  const getSortIcon = (field) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon" />;
    return sortDirection === "asc" ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
  };

  // ==================== FILTER & PAGINATION ====================
  const filteredMatricules = (matricules || []).filter(mat => {
    const car = cars.find(c => c.id === mat.car_id);
    const matchesSearch = searchTerm === '' ||
      mat.matricule_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      car?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || mat.status === statusFilter;

    // Notification filter from URL param
    let matchesNotification = true;
    if (filterParam === 'notifications') {
      matchesNotification = hasMatriculeNotification(mat);
    }

    return matchesSearch && matchesStatus && matchesNotification;
  }).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "id": aVal = a.id; bVal = b.id; break;
      case "matricule": aVal = a.matricule_code?.toLowerCase() || ""; bVal = b.matricule_code?.toLowerCase() || ""; break;
      case "car": const aCar = cars.find(c => c.id === a.car_id); const bCar = cars.find(c => c.id === b.car_id); aVal = aCar ? `${aCar.brand} ${aCar.model}`.toLowerCase() : ""; bVal = bCar ? `${bCar.brand} ${bCar.model}`.toLowerCase() : ""; break;
      case "kilometrage": aVal = a.kilometrage || 0; bVal = b.kilometrage || 0; break;
      case "status": aVal = a.status || ""; bVal = b.status || ""; break;
      default: aVal = a.id; bVal = b.id;
    }
    if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
    else return aVal < bVal ? 1 : -1;
  });

  const totalPages = Math.ceil(filteredMatricules.length / itemsPerPage);
  const paginatedMatricules = filteredMatricules.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ==================== CRUD ====================
  const handleCreateMatricule = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(createMatricule(data)).unwrap();
      toast.success("Matricule ajouté avec succès!");
      setShowMatriculeForm(false);
      setEditingMatricule(null);
      await loadData();
      resetForm();
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateMatricule = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(updateMatricule({ id: editingMatricule.id, data })).unwrap();
      toast.success("Matricule modifié avec succès!");
      setShowMatriculeForm(false);
      setEditingMatricule(null);
      await loadData();
      resetForm();
    } catch (error) {
      toast.error(error.payload || error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (mat) => {
    setEditingMatricule(mat);
    setFormData({
      matricule_code: mat.matricule_code,
      car_id: mat.car_id || "",
      status: mat.status,
      kilometrage: mat.kilometrage || 0,
      visit_tech: formatDateForInput(mat.visit_tech),
      date_assurance: formatDateForInput(mat.date_assurance),
      date_taxe_voiture: formatDateForInput(mat.date_taxe_voiture),
      vidange_status: mat.vidange_status || "not done"
    });
    // Set selected car for search
    if (mat.car_id) {
      const car = cars.find(c => c.id === mat.car_id);
      if (car) {
        setSelectedCar(car);
        setCarSearchTerm(`${car.brand} ${car.model} (${car.year})`);
      }
    } else {
      setSelectedCar(null);
      setCarSearchTerm("");
    }
    setShowMatriculeForm(true);
  };

  const handleAddNew = () => {
    setEditingMatricule(null);
    resetForm();
    setSelectedCar(null);
    setCarSearchTerm("");
    setShowMatriculeForm(true);
  };

  const resetForm = () => {
    setFormData({
      matricule_code: "",
      car_id: "",
      status: "active",
      kilometrage: 0,
      visit_tech: "",
      date_assurance: "",
      date_taxe_voiture: "",
      vidange_status: "not done"
    });
    setSelectedCar(null);
    setCarSearchTerm("");
  };

  const handleDeleteClick = (matricule) => {
    setMatriculeToDelete(matricule);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!matriculeToDelete) return;
    const result = await dispatch(deleteMatricule(matriculeToDelete.id));
    if (result.error) toast.error(result.payload);
    else {
      toast.success("Matricule supprimé avec succès");
      await loadData();
    }
    setDeleteModalOpen(false);
    setMatriculeToDelete(null);
  };

  const handleViewDetails = (mat) => {
    setSelectedMatricule(mat);
    setShowMatriculeDetails(true);
    setActiveMaintenanceTab('required');
    setShowAddForm(null);
    setShowHistoryFor(null);
  };

  // Car search handlers
  const handleCarSearch = (term) => {
    setCarSearchTerm(term);
    if (term.trim() === "") {
      setFilteredCars([]);
      return;
    }
    const lowerTerm = term.toLowerCase().trim();
    const filtered = cars.filter(car =>
      `${car.brand} ${car.model} ${car.year}`.toLowerCase().includes(lowerTerm)
    );
    setFilteredCars(filtered.slice(0, 10));
  };

  const handleCarSelect = (car) => {
    setSelectedCar(car);
    setCarSearchTerm(`${car.brand} ${car.model} (${car.year})`);
    setFormData(prev => ({ ...prev, car_id: car.id }));
    setFilteredCars([]);
  };

  const clearCarSelection = () => {
    setSelectedCar(null);
    setCarSearchTerm("");
    setFormData(prev => ({ ...prev, car_id: "" }));
    setFilteredCars([]);
  };

  const handleExport = () => {
    const headers = ['ID', 'Plaque', 'Voiture', 'Kilométrage', 'Visite Tech', 'Assurance', 'Vignette', 'Vidange', 'Statut'];
    const csvData = matricules.map(mat => {
      const car = cars.find(c => c.id === mat.car_id);
      return [mat.id, `"${mat.matricule_code}"`, `"${car ? `${car.brand} ${car.model}` : 'N/A'}"`, mat.kilometrage || 0, mat.visit_tech || '', mat.date_assurance || '', mat.date_taxe_voiture || '', mat.vidange_status || 'not done', mat.status].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `matricules_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const stats = {
    total: matricules?.length || 0,
    active: matricules?.filter(m => m.status === 'active').length || 0,
    inactive: matricules?.filter(m => m.status === 'inactive').length || 0,
    totalKm: matricules?.reduce((sum, m) => sum + (Number(m.kilometrage) || 0), 0) || 0
  };

  if (loading && !showMatriculeDetails && !showMatriculeForm && !showAccidentForm) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Chargement des matricules...</p>
    </div>
  );

  return (
    <>
      {/* Accident Form - Full Page Inline with searchable reservation */}
      {showAccidentForm && selectedMatriculeForAccident && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              <AlertTriangle size={28} />
            </div>
            <div className="inline-form-title">
              <h2>Signaler un accident</h2>
              <p>Pour le matricule {selectedMatriculeForAccident.matricule_code}</p>
            </div>
            <button onClick={() => { setShowAccidentForm(false); resetAccidentForm(); }} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmitAccident} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Car size={18} />
                    <h3>Informations véhicule</h3>
                  </div>
                  <div className="inline-field">
                    <label>Matricule (auto-rempli)</label>
                    <input type="text" value={selectedMatriculeForAccident.matricule_code} className="inline-input" disabled />
                  </div>
                  <div className="inline-field">
                    <label>Voiture (auto-rempli)</label>
                    <input type="text" value={`${cars.find(c => c.id === selectedMatriculeForAccident.car_id)?.brand} ${cars.find(c => c.id === selectedMatriculeForAccident.car_id)?.model}`} className="inline-input" disabled />
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <User size={18} />
                    <h3>Informations client</h3>
                  </div>

                  {/* SEARCHABLE RESERVATION SELECTION */}
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input
                        type="text"
                        className="inline-input"
                        value={reservationSearchTerm}
                        onChange={(e) => handleReservationSearch(e.target.value)}
                        placeholder="Rechercher une réservation (ID, client, dates)..."
                      />
                      {selectedReservation && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={clearReservationSelection}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          title="Effacer la sélection"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {filteredReservations.length > 0 && (
                      <div className="inline-results">
                        {filteredReservations.map(res => {
                          const client = clients.find(c => c.id === res.client_id);
                          return (
                            <div key={res.id} className="inline-result-item" onClick={() => handleReservationSelect(res)}>
                              <div className="inline-result-avatar"><Calendar size={20} /></div>
                              <div className="inline-result-info">
                                <strong>#{res.id}</strong>
                                <div className="inline-result-details">
                                  <span>{formatDate(res.start_date)} → {formatDate(res.end_date)}</span>
                                  <span>Client: {client ? `${client.prenom} ${client.nom}` : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedReservation && (
                      <div className="inline-selected">
                        <CheckCircle size={20} />
                        <div>
                          <strong>Réservation sélectionnée</strong>
                          <p>#{selectedReservation.id} - {formatDate(selectedReservation.start_date)} → {formatDate(selectedReservation.end_date)} - Client: {clients.find(c => c.id === selectedReservation.client_id)?.prenom} {clients.find(c => c.id === selectedReservation.client_id)?.nom || 'N/A'}</p>
                        </div>
                      </div>
                    )}

                    {!selectedReservation && reservationSearchTerm.trim() !== "" && filteredReservations.length === 0 && (
                      <div className="inline-no-results" style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
                        Aucune réservation trouvée pour ce matricule.
                      </div>
                    )}

                    {reservationsForMatricule.length === 0 && (
                      <div className="field-hint warning" style={{ marginTop: '0.5rem', color: '#dc2626', fontSize: '0.75rem' }}>
                        ⚠️ Aucune réservation trouvée pour ce matricule
                      </div>
                    )}

                    <input type="hidden" name="reservation_id" value={accidentFormData.reservation_id} />
                    <input type="hidden" name="client_id" value={accidentFormData.client_id} />
                  </div>

                  <div className="inline-field">
                    <label>Client (auto-rempli)</label>
                    <input
                      type="text"
                      value={(() => {
                        const client = clients.find(c => c.id === accidentFormData.client_id);
                        return client ? `${client.prenom} ${client.nom}` : '';
                      })()}
                      className="inline-input"
                      disabled
                    />
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Calendar size={18} />
                    <h3>Date et montants</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Date de l'accident *</label>
                      <input type="date" required value={accidentFormData.date_accident} onChange={(e) => setAccidentFormData({ ...accidentFormData, date_accident: e.target.value })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Montant pertes (DH) *</label>
                      <input type="number" step="0.01" required value={accidentFormData.amount_of_losses} onChange={(e) => setAccidentFormData({ ...accidentFormData, amount_of_losses: parseFloat(e.target.value) || 0 })} className="inline-input" />
                    </div>
                    <div className="inline-field">
                      <label>Montant assurance (DH)</label>
                      <input type="number" step="0.01" value={accidentFormData.amount_assurance} onChange={(e) => setAccidentFormData({ ...accidentFormData, amount_assurance: parseFloat(e.target.value) || 0 })} className="inline-input" />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Scale size={18} />
                    <h3>Type et procédure</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Type d'accident</label>
                      <select value={accidentFormData.accident_type} onChange={(e) => setAccidentFormData({ ...accidentFormData, accident_type: e.target.value })} className="inline-select">
                        <option value="grave">Grave</option>
                        <option value="non_grave">Non-grave</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Procédure</label>
                      <select value={accidentFormData.procedure_type} onChange={(e) => setAccidentFormData({ ...accidentFormData, procedure_type: e.target.value })} className="inline-select">
                        <option value="classic">Classique</option>
                        <option value="forphie">Forphie</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select value={accidentFormData.status} onChange={(e) => setAccidentFormData({ ...accidentFormData, status: e.target.value })} className="inline-select">
                        <option value="open">Ouvert</option>
                        <option value="pending">Signalé</option>
                        <option value="evaluation_owner">Évaluation propriétaire</option>
                        <option value="contact expert">Contact expert</option>
                        <option value="evaluation_expert">Évaluation expert</option>
                        <option value="fixed">Réparé</option>
                        <option value="waiting">Attente paiement</option>
                        <option value="completed">Terminé</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Gavel size={18} />
                    <h3>Expert</h3>
                  </div>
                  <div className="inline-field">
                    <label>Nom de l'expert</label>
                    <input type="text" value={accidentFormData.nom_expert} onChange={(e) => setAccidentFormData({ ...accidentFormData, nom_expert: e.target.value })} className="inline-input" placeholder="Expert automobile" />
                  </div>
                  <div className="inline-field">
                    <label>Notes expert</label>
                    <textarea rows={2} value={accidentFormData.expert_notes} onChange={(e) => setAccidentFormData({ ...accidentFormData, expert_notes: e.target.value })} className="inline-textarea" placeholder="Rapport d'expertise..." />
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <FileText size={18} />
                    <h3>Notes générales</h3>
                  </div>
                  <div className="inline-field">
                    <textarea rows={2} value={accidentFormData.notes} onChange={(e) => setAccidentFormData({ ...accidentFormData, notes: e.target.value })} className="inline-textarea" placeholder="Description détaillée de l'accident..." />
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowAccidentForm(false); resetAccidentForm(); }}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={accidentSubmitting}>
                {accidentSubmitting ? "Traitement..." : "Créer l'accident"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Matricule Details - Full Page Inline */}
      {showMatriculeDetails && selectedMatricule && (
        <div className="inline-details-container">
          <div className="inline-details-header">
            <div className="inline-details-icon">
              <Tag size={28} />
            </div>
            <div className="inline-details-title">
              <h2>Détails du matricule</h2>
              <p>{selectedMatricule.matricule_code}</p>
            </div>
            <button onClick={() => { setShowMatriculeDetails(false); setSelectedMatricule(null); }} className="inline-details-close">
              <X size={24} />
            </button>
          </div>

          <div className="inline-details-content">
            {/* Back button and actions */}
            <div className="details-actions-bar">
              <button onClick={() => setShowMatriculeDetails(false)} className="back-btn">
                ← Retour à la liste
              </button>
              <div className="details-action-buttons">
                <button onClick={() => { setShowMatriculeDetails(false); handleEdit(selectedMatricule); }} className="action-edit-btn">
                  <Edit2 size={16} /> Modifier
                </button>
                <button onClick={() => handleOpenAccidentForm(selectedMatricule)} className="action-accident-btn">
                  <AlertTriangle size={16} /> Signaler un accident
                </button>
              </div>
            </div>

            {/* Matricule Info Header */}
            <div className="matricule-header-card">
              <div className="matricule-plaque">{selectedMatricule.matricule_code}</div>
              <div className="matricule-stats-grid">
                <div className="stat-item-detail">
                  <div className="stat-value">{selectedMatricule.kilometrage?.toLocaleString()} km</div>
                  <div className="stat-label-detail">Kilométrage</div>
                </div>
                <div className="stat-item-detail">
                  <div className="stat-value">{cars.find(c => c.id === selectedMatricule.car_id)?.brand} {cars.find(c => c.id === selectedMatricule.car_id)?.model}</div>
                  <div className="stat-label-detail">Voiture</div>
                </div>
                <div className="stat-item-detail">
                  <div className={`status-badge-large ${statusConfig[selectedMatricule.status]?.bg || 'badge-warning'}`}>
                    {(() => {
                      const Icon = statusConfig[selectedMatricule.status]?.icon;
                      return Icon ? <Icon size={14} /> : null;
                    })()}
                    {statusConfig[selectedMatricule.status]?.label || selectedMatricule.status}
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="details-sections-grid">
              <div className="detail-card">
                <div className="detail-card-title"><Calendar size={16} /> Documents & Échéances</div>
                <div className="detail-card-content">
                  <div className="info-row">
                    <span className="info-label">Visite technique</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.visit_tech)?.class || ''}`}>
                      {selectedMatricule.visit_tech ? formatDate(selectedMatricule.visit_tech) : "—"}
                      {getDateStatusInfo(selectedMatricule.visit_tech) && ` (${getDateStatusInfo(selectedMatricule.visit_tech).text})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Assurance</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.date_assurance)?.class || ''}`}>
                      {selectedMatricule.date_assurance ? formatDate(selectedMatricule.date_assurance) : "—"}
                      {getDateStatusInfo(selectedMatricule.date_assurance) && ` (${getDateStatusInfo(selectedMatricule.date_assurance).text})`}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Vignette (Taxe voiture)</span>
                    <span className={`info-value ${getDateStatusInfo(selectedMatricule.date_taxe_voiture)?.class || ''}`}>
                      {selectedMatricule.date_taxe_voiture ? formatDate(selectedMatricule.date_taxe_voiture) : "—"}
                      {getDateStatusInfo(selectedMatricule.date_taxe_voiture) && ` (${getDateStatusInfo(selectedMatricule.date_taxe_voiture).text})`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Maintenance Tabs */}
            <div className="details-tabs-full">
              <button className={`details-tab-full ${activeMaintenanceTab === 'required' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('required')}>
                <CheckCircle size={16} /> Maintenance Requise
              </button>
              <button className={`details-tab-full ${activeMaintenanceTab === 'optional' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('optional')}>
                <Wrench size={16} /> Éléments Optionnels
              </button>
              <button className={`details-tab-full ${activeMaintenanceTab === 'additional' ? 'active' : ''}`} onClick={() => setActiveMaintenanceTab('additional')}>
                <PlusCircle size={16} /> Maintenance Additionnelle
              </button>
            </div>

            {/* Progress Bar for Required Tasks */}
            {(() => {
              const progress = calculateRequiredTasksProgress(selectedMatricule);
              return (
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-title">Statut de la Maintenance Requise pour la Vidange</span>
                    <span className={`progress-status ${progress.isVidangeDone ? 'status-done' : 'status-pending'}`}>
                      {progress.isVidangeDone ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                      {progress.isVidangeDone ? " Vidange effectuée" : " Vidange requise"}
                    </span>
                  </div>
                  <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${progress.percentage}%` }}></div>
                  </div>
                  <div className="progress-text">
                    {progress.completed}/{progress.total} tâches REQUISES terminées ({Math.round(progress.percentage)}%)
                  </div>
                  <div className="progress-legend">
                    Requiert: Huile ✓ + Filtre à Huile ✓ + Éléments additionnels requis ✓
                  </div>
                </div>
              );
            })()}

            {/* Tab Content: Required Maintenance */}
            {activeMaintenanceTab === 'required' && (
              <div className="tab-content-full">
                <div className="maintenance-items-grid">
                  {/* Huile */}
                  <div className="maintenance-card">
                    <div className="maintenance-card-header">
                      <div className="maintenance-title">
                        <Droplet size={20} /> Huile <span className="required-badge">* Requis</span>
                      </div>
                      <div className={`status-badge ${getMaintenanceStatus(selectedMatricule, 'oil') ? 'status-success' : 'status-warning'}`}>
                        {getMaintenanceStatus(selectedMatricule, 'oil') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {getMaintenanceStatus(selectedMatricule, 'oil') ? " Effectué" : " Non effectué"}
                      </div>
                    </div>
                    <div className="maintenance-card-body">
                      <div className="maintenance-info">
                        <span>Total: <strong>{getMaintenanceValue(selectedMatricule, 'oil').total.toFixed(1)} L</strong></span>
                        <span>Dernier: {getMaintenanceValue(selectedMatricule, 'oil').lastDate ? formatDate(getMaintenanceValue(selectedMatricule, 'oil').lastDate) : "—"}</span>
                      </div>
                      <div className="maintenance-actions">
                        <button onClick={() => setShowAddForm(showAddForm === 'oil' ? null : 'oil')} className="action-btn-small primary">
                          <PlusCircle size={14} /> Ajouter
                        </button>
                        <button onClick={() => setShowHistoryFor(showHistoryFor === 'oil' ? null : 'oil')} className="action-btn-small secondary">
                          <History size={14} /> Historique
                        </button>
                      </div>
                      {showAddForm === 'oil' && (
                        <div className="add-form">
                          <input type="number" step="0.1" placeholder="Quantité (L)" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="small-input" />
                          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                          <button onClick={handleAddOil} disabled={submitting} className="confirm-btn">
                            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Filtre à Huile */}
                  <div className="maintenance-card">
                    <div className="maintenance-card-header">
                      <div className="maintenance-title">
                        <Filter size={20} /> Filtre à Huile <span className="required-badge">* Requis</span>
                      </div>
                      <div className={`status-badge ${getMaintenanceStatus(selectedMatricule, 'filter_oil') ? 'status-success' : 'status-warning'}`}>
                        {getMaintenanceStatus(selectedMatricule, 'filter_oil') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {getMaintenanceStatus(selectedMatricule, 'filter_oil') ? " Effectué" : " Non effectué"}
                      </div>
                    </div>
                    <div className="maintenance-card-body">
                      <div className="maintenance-info">
                        <span>Total: <strong>{getMaintenanceValue(selectedMatricule, 'filter_oil').total}</strong></span>
                        <span>Dernier: {getMaintenanceValue(selectedMatricule, 'filter_oil').lastDate ? formatDate(getMaintenanceValue(selectedMatricule, 'filter_oil').lastDate) : "—"}</span>
                      </div>
                      <div className="maintenance-actions">
                        <button onClick={() => setShowAddForm(showAddForm === 'filter_oil' ? null : 'filter_oil')} className="action-btn-small primary">
                          <PlusCircle size={14} /> Ajouter
                        </button>
                        <button onClick={() => setShowHistoryFor(showHistoryFor === 'filter_oil' ? null : 'filter_oil')} className="action-btn-small secondary">
                          <History size={14} /> Historique
                        </button>
                      </div>
                      {showAddForm === 'filter_oil' && (
                        <div className="add-form">
                          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                          <button onClick={handleAddFilterOil} disabled={submitting} className="confirm-btn">
                            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Optional Maintenance */}
            {activeMaintenanceTab === 'optional' && (
              <div className="tab-content-full">
                <div className="maintenance-items-grid">
                  {/* Filtre à Air */}
                  <div className="maintenance-card">
                    <div className="maintenance-card-header">
                      <div className="maintenance-title"><Wind size={20} /> Filtre à Air</div>
                      <div className={`status-badge ${getMaintenanceStatus(selectedMatricule, 'filter_air') ? 'status-success' : 'status-warning'}`}>
                        {getMaintenanceStatus(selectedMatricule, 'filter_air') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {getMaintenanceStatus(selectedMatricule, 'filter_air') ? " Effectué" : " Non effectué"}
                      </div>
                    </div>
                    <div className="maintenance-card-body">
                      <div className="maintenance-info">
                        <span>Total: <strong>{getMaintenanceValue(selectedMatricule, 'filter_air').total}</strong></span>
                        <span>Dernier: {getMaintenanceValue(selectedMatricule, 'filter_air').lastDate ? formatDate(getMaintenanceValue(selectedMatricule, 'filter_air').lastDate) : "—"}</span>
                      </div>
                      <div className="maintenance-actions">
                        <button onClick={() => setShowAddForm(showAddForm === 'filter_air' ? null : 'filter_air')} className="action-btn-small primary">
                          <PlusCircle size={14} /> Ajouter
                        </button>
                        <button onClick={() => setShowHistoryFor(showHistoryFor === 'filter_air' ? null : 'filter_air')} className="action-btn-small secondary">
                          <History size={14} /> Historique
                        </button>
                      </div>
                      {showAddForm === 'filter_air' && (
                        <div className="add-form">
                          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                          <button onClick={handleAddFilterAir} disabled={submitting} className="confirm-btn">
                            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paquets de Frein */}
                  <div className="maintenance-card">
                    <div className="maintenance-card-header">
                      <div className="maintenance-title"><CircleStop size={20} /> Paquets de Frein</div>
                      <div className={`status-badge ${getMaintenanceStatus(selectedMatricule, 'paquets_de_frein') ? 'status-success' : 'status-warning'}`}>
                        {getMaintenanceStatus(selectedMatricule, 'paquets_de_frein') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {getMaintenanceStatus(selectedMatricule, 'paquets_de_frein') ? " Effectué" : " Non effectué"}
                      </div>
                    </div>
                    <div className="maintenance-card-body">
                      <div className="maintenance-info">
                        <span>Total: <strong>{getMaintenanceValue(selectedMatricule, 'paquets_de_frein').total}</strong></span>
                        <span>Dernier: {getMaintenanceValue(selectedMatricule, 'paquets_de_frein').lastDate ? formatDate(getMaintenanceValue(selectedMatricule, 'paquets_de_frein').lastDate) : "—"}</span>
                      </div>
                      <div className="maintenance-actions">
                        <button onClick={() => setShowAddForm(showAddForm === 'brake_pads' ? null : 'brake_pads')} className="action-btn-small primary">
                          <PlusCircle size={14} /> Ajouter
                        </button>
                        <button onClick={() => setShowHistoryFor(showHistoryFor === 'paquets_de_frein' ? null : 'paquets_de_frein')} className="action-btn-small secondary">
                          <History size={14} /> Historique
                        </button>
                      </div>
                      {showAddForm === 'brake_pads' && (
                        <div className="add-form">
                          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                          <button onClick={handleAddBrakePads} disabled={submitting} className="confirm-btn">
                            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ad Blue */}
                  <div className="maintenance-card">
                    <div className="maintenance-card-header">
                      <div className="maintenance-title"><Droplets size={20} /> Ad Blue</div>
                      <div className={`status-badge ${getMaintenanceStatus(selectedMatricule, 'ad_blue') ? 'status-success' : 'status-warning'}`}>
                        {getMaintenanceStatus(selectedMatricule, 'ad_blue') ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {getMaintenanceStatus(selectedMatricule, 'ad_blue') ? " Effectué" : " Non effectué"}
                      </div>
                    </div>
                    <div className="maintenance-card-body">
                      <div className="maintenance-info">
                        <span>Total: <strong>{getMaintenanceValue(selectedMatricule, 'ad_blue').total.toFixed(1)} L</strong></span>
                        <span>Dernier: {getMaintenanceValue(selectedMatricule, 'ad_blue').lastDate ? formatDate(getMaintenanceValue(selectedMatricule, 'ad_blue').lastDate) : "—"}</span>
                      </div>
                      <div className="maintenance-actions">
                        <button onClick={() => setShowAddForm(showAddForm === 'ad_blue' ? null : 'ad_blue')} className="action-btn-small primary">
                          <PlusCircle size={14} /> Ajouter
                        </button>
                        <button onClick={() => setShowHistoryFor(showHistoryFor === 'ad_blue' ? null : 'ad_blue')} className="action-btn-small secondary">
                          <History size={14} /> Historique
                        </button>
                      </div>
                      {showAddForm === 'ad_blue' && (
                        <div className="add-form">
                          <input type="number" step="0.1" placeholder="Quantité (L)" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="small-input" />
                          <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                          <button onClick={handleAddAdBlue} disabled={submitting} className="confirm-btn">
                            {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Additional Maintenance */}
            {activeMaintenanceTab === 'additional' && (
              <div className="tab-content-full">
                <div className="additional-header">
                  <h4>Maintenance Additionnelle</h4>
                  <button onClick={() => setShowAddForm(showAddForm === 'additional' ? null : 'additional')} className="btn-add-additional">
                    <PlusCircle size={16} /> Ajouter un Élément
                  </button>
                </div>

                {showAddForm === 'additional' && (
                  <div className="additional-form">
                    <div className="additional-form-row">
                      <input type="text" placeholder="Nom de l'élément" value={additionalItemName} onChange={(e) => setAdditionalItemName(e.target.value)} className="form-input" />
                      <select value={additionalItemType} onChange={(e) => setAdditionalItemType(e.target.value)} className="form-select">
                        <option value="quantity">Quantité (suivi cumulé)</option>
                        <option value="note">Note (simple)</option>
                      </select>
                    </div>
                    {additionalItemType === 'quantity' && (
                      <input type="number" step="0.1" placeholder="Quantité initiale" value={additionalItemQuantity} onChange={(e) => setAdditionalItemQuantity(e.target.value)} className="form-input" />
                    )}
                    {additionalItemType === 'note' && (
                      <input type="text" placeholder="Note / description" value={additionalItemNotes} onChange={(e) => setAdditionalItemNotes(e.target.value)} className="form-input" />
                    )}
                    <div className="additional-form-row">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={additionalItemRequired} onChange={(e) => setAdditionalItemRequired(e.target.checked)} />
                        Requis pour la vidange
                      </label>
                    </div>
                    <div className="additional-form-actions">
                      <button onClick={() => setShowAddForm(null)} className="cancel-btn">Annuler</button>
                      <button onClick={handleAddAdditionalItem} disabled={submitting} className="confirm-btn">
                        {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Ajouter
                      </button>
                    </div>
                  </div>
                )}

                <div className="additional-items-list">
                  {(selectedMatricule.additional_maintenance || []).length === 0 ? (
                    <div className="empty-state-small">
                      <Info size={32} />
                      <p>Aucun élément de maintenance additionnelle</p>
                    </div>
                  ) : (
                    (selectedMatricule.additional_maintenance || []).map((item, idx) => (
                      <div key={item.id || idx} className="additional-item-card">
                        <div className="additional-item-header">
                          <div className="additional-item-title">
                            <strong>{item.name}</strong>
                            {item.required_for_vidange && <span className="required-badge-small">Requis pour vidange</span>}
                            <span className="item-type-badge">{item.type === 'quantity' ? 'Quantité' : 'Note'}</span>
                          </div>
                          <div className={`status-badge-small ${item.type === 'quantity' ? (item.value > 0 ? 'status-success' : 'status-warning') : (!item.needs_attention ? 'status-success' : 'status-warning')}`}>
                            {item.type === 'quantity' ? (
                              item.value > 0 ? <CheckCircle size={12} /> : <XCircle size={12} />
                            ) : (
                              !item.needs_attention ? <CheckCircle size={12} /> : <XCircle size={12} />
                            )}
                            {item.type === 'quantity' ? (item.value > 0 ? " Effectué" : " Non effectué") : (!item.needs_attention ? " Effectué" : " À faire")}
                          </div>
                        </div>
                        <div className="additional-item-body">
                          {item.type === 'quantity' && (
                            <div className="additional-item-info">
                              <span>Total: <strong>{item.value} {item.name.includes('Huile') || item.name.includes('Ad Blue') ? 'L' : ''}</strong></span>
                              <span>Dernier: {item.last_done_date ? formatDate(item.last_done_date) : "—"}</span>
                            </div>
                          )}
                          {item.notes && <div className="additional-item-notes">Notes: {item.notes}</div>}
                          <div className="additional-item-actions">
                            <button onClick={() => {
                              setShowAddForm(showAddForm === item.id ? null : item.id);
                              setNewDate(new Date().toISOString().slice(0, 10));
                              setNewQuantity('');
                            }} className="action-btn-small primary">
                              <PlusCircle size={14} /> Ajouter
                            </button>
                            <button onClick={() => setShowHistoryFor(showHistoryFor === item.id ? null : item.id)} className="action-btn-small secondary">
                              <History size={14} /> Historique
                            </button>
                          </div>
                          {showAddForm === item.id && (
                            <div className="add-form">
                              {item.type === 'quantity' && (
                                <input type="number" step="0.1" placeholder="Quantité" value={newQuantity} onChange={(e) => setNewQuantity(e.target.value)} className="small-input" />
                              )}
                              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="small-input" />
                              <button onClick={async () => {
                                if (!selectedMatricule) return;
                                if (item.type === 'quantity' && (!newQuantity || parseFloat(newQuantity) <= 0)) {
                                  toast.error("Veuillez saisir une quantité valide");
                                  return;
                                }

                                const additionalMaintenance = selectedMatricule.additional_maintenance || [];
                                const itemIndex = additionalMaintenance.findIndex(i => i.id === item.id);
                                if (itemIndex === -1) return;

                                const updatedItem = { ...additionalMaintenance[itemIndex] };
                                const quantity = parseFloat(newQuantity);
                                const newValue = (updatedItem.value || 0) + (item.type === 'quantity' ? quantity : 0);

                                const historyEntry = {
                                  id: Date.now().toString(),
                                  quantity: item.type === 'quantity' ? quantity : undefined,
                                  date: newDate,
                                  created_at: new Date().toISOString(),
                                  kilometrage: selectedMatricule.kilometrage
                                };

                                updatedItem.value = newValue;
                                updatedItem.history = [...(updatedItem.history || []), historyEntry];
                                updatedItem.last_done_date = newDate;
                                updatedItem.needs_attention = false;
                                updatedItem.updated_at = new Date().toISOString();

                                const newAdditionalMaintenance = [...additionalMaintenance];
                                newAdditionalMaintenance[itemIndex] = updatedItem;

                                try {
                                  setSubmitting(true);
                                  await dispatch(updateMatricule({
                                    id: selectedMatricule.id,
                                    data: { additional_maintenance: newAdditionalMaintenance }
                                  })).unwrap();
                                  updateLocalMatricule({ additional_maintenance: newAdditionalMaintenance });
                                  toast.success(`${updatedItem.name} mis à jour avec succès`);
                                  setShowAddForm(null);
                                  setNewQuantity('');
                                  setNewDate(new Date().toISOString().slice(0, 10));
                                } catch (error) {
                                  toast.error(error.payload || error.message || "Erreur lors de l'ajout");
                                } finally {
                                  setSubmitting(false);
                                }
                              }} disabled={submitting} className="confirm-btn">
                                {submitting ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />} Valider
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="inline-details-footer">
            <button onClick={() => setShowMatriculeDetails(false)} className="btn-secondary-full">
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* History Modal (inline popup) */}
      {showHistoryFor && selectedMatricule && (
        <div className="history-modal-overlay" onClick={() => setShowHistoryFor(null)}>
          <div className="history-modal" onClick={(e) => e.stopPropagation()}>
            <div className="history-modal-header">
              <h3>Historique - {showHistoryFor === 'oil' ? 'Huile' :
                showHistoryFor === 'filter_oil' ? 'Filtre à Huile' :
                  showHistoryFor === 'filter_air' ? 'Filtre à Air' :
                    showHistoryFor === 'paquets_de_frein' ? 'Paquets de Frein' :
                      showHistoryFor === 'ad_blue' ? 'Ad Blue' :
                        (selectedMatricule.additional_maintenance || []).find(i => i.id === showHistoryFor)?.name || 'Maintenance'}</h3>
              <button onClick={() => setShowHistoryFor(null)} className="history-close-btn"><X size={20} /></button>
            </div>
            <div className="history-modal-body">
              {(() => {
                let historyList = [];
                if (showHistoryFor === 'oil') historyList = getMaintenanceValue(selectedMatricule, 'oil').history;
                else if (showHistoryFor === 'filter_oil') historyList = getMaintenanceValue(selectedMatricule, 'filter_oil').history;
                else if (showHistoryFor === 'filter_air') historyList = getMaintenanceValue(selectedMatricule, 'filter_air').history;
                else if (showHistoryFor === 'paquets_de_frein') historyList = getMaintenanceValue(selectedMatricule, 'paquets_de_frein').history;
                else if (showHistoryFor === 'ad_blue') historyList = getMaintenanceValue(selectedMatricule, 'ad_blue').history;
                else {
                  const item = (selectedMatricule.additional_maintenance || []).find(i => i.id === showHistoryFor);
                  historyList = item?.history || [];
                }

                if (historyList.length === 0) {
                  return <div className="empty-history">Aucun historique disponible</div>;
                }

                return (
                  <table className="history-table">
                    <thead>
                      <tr><th>Date</th><th>Quantité</th><th>Kilométrage</th><th>Date création</th></tr>
                    </thead>
                    <tbody>
                      {historyList.map((entry, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(entry.date)}</td>
                          <td>{entry.quantity ? `${entry.quantity} ${showHistoryFor === 'oil' || showHistoryFor === 'ad_blue' ? 'L' : ''}` : '—'}</td>
                          <td>{entry.kilometrage?.toLocaleString() || '—'} km</td>
                          <td>{formatDateTime(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Matricule Form - Full Page Inline with searchable car select */}
      {showMatriculeForm && (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editingMatricule ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editingMatricule ? "Modifier le matricule" : "Nouveau matricule"}</h2>
              <p>{editingMatricule ? "Modifiez les informations du matricule" : "Ajoutez une nouvelle plaque d'immatriculation"}</p>
            </div>
            <button onClick={() => { setShowMatriculeForm(false); setEditingMatricule(null); resetForm(); }} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingMatricule) handleUpdateMatricule(formData);
            else handleCreateMatricule(formData);
          }} className="inline-form">
            <div className="inline-form-grid">
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Tag size={18} /><h3>Informations du matricule</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Plaque d'immatriculation *</label>
                      <input type="text" className="inline-input matricule-input" value={formData.matricule_code} onChange={(e) => setFormData({ ...formData, matricule_code: e.target.value.toUpperCase() })} required placeholder="Ex: AB-123-CD" />
                    </div>
                    <div className="inline-field">
                      <label>Kilométrage actuel *</label>
                      <input type="number" className="inline-input" value={formData.kilometrage} onChange={(e) => setFormData({ ...formData, kilometrage: parseFloat(e.target.value) || 0 })} required />
                    </div>
                    <div className="inline-field">
                      <label>Statut *</label>
                      <select className="inline-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="active">✅ Actif</option>
                        <option value="inactive">❌ Inactif</option>
                        <option value="sold">💸 Vendu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SEARCHABLE CAR SELECTION */}
                <div className="inline-section">
                  <div className="inline-section-header"><Car size={18} /><h3>Voiture associée</h3></div>
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input
                        type="text"
                        className="inline-input"
                        value={carSearchTerm}
                        onChange={(e) => handleCarSearch(e.target.value)}
                        placeholder="Rechercher une voiture (marque, modèle, année)..."
                      />
                      {selectedCar && (
                        <button
                          type="button"
                          className="clear-search-btn"
                          onClick={clearCarSelection}
                          style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                          title="Effacer la sélection"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>

                    {filteredCars.length > 0 && (
                      <div className="inline-results">
                        {filteredCars.map(car => (
                          <div key={car.id} className="inline-result-item" onClick={() => handleCarSelect(car)}>
                            <div className="inline-result-avatar"><Car size={20} /></div>
                            <div className="inline-result-info">
                              <strong>{car.brand} {car.model} ({car.year})</strong>
                              <div className="inline-result-details">
                                <span>{car.color || "N/C"} - {car.fuel_type || "N/C"}</span>
                                <span>{car.price_per_day} DH/jour</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedCar && (
                      <div className="inline-selected">
                        <CheckCircle size={20} />
                        <div>
                          <strong>Voiture sélectionnée</strong>
                          <p>{selectedCar.brand} {selectedCar.model} ({selectedCar.year}) - {selectedCar.color || "N/C"} - {selectedCar.price_per_day} DH/jour</p>
                        </div>
                      </div>
                    )}

                    {!selectedCar && carSearchTerm.trim() !== "" && filteredCars.length === 0 && (
                      <div className="inline-no-results" style={{ padding: '0.75rem', color: '#64748b', fontSize: '0.875rem' }}>
                        Aucune voiture trouvée. Vérifiez votre recherche ou ajoutez une voiture d'abord.
                      </div>
                    )}

                    <input type="hidden" name="car_id" value={formData.car_id} />
                  </div>
                </div>
              </div>

              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header"><Calendar size={18} /><h3>Documents et échéances</h3></div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Visite technique *</label>
                      <input type="date" className="inline-input" value={formData.visit_tech} onChange={(e) => setFormData({ ...formData, visit_tech: e.target.value })} required />
                    </div>
                    <div className="inline-field">
                      <label>Assurance</label>
                      <input type="date" className="inline-input" value={formData.date_assurance} onChange={(e) => setFormData({ ...formData, date_assurance: e.target.value })} />
                    </div>
                    <div className="inline-field">
                      <label>Vignette (Taxe voiture)</label>
                      <input type="date" className="inline-input" value={formData.date_taxe_voiture} onChange={(e) => setFormData({ ...formData, date_taxe_voiture: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowMatriculeForm(false); setEditingMatricule(null); resetForm(); }}>Annuler</button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {submitting ? "Traitement..." : (editingMatricule ? "Mettre à jour" : "Créer le matricule")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Matricules List */}
      {!showMatriculeForm && !showMatriculeDetails && !showAccidentForm && (
        <div className="admin-container">
          <div className="header">
            <div>
              <h1 className="title">Gestion des Matricules</h1>
              <p className="subtitle">Suivi des plaques d'immatriculation et documents</p>
            </div>
            <div className="header-actions">
              <button onClick={refreshData} className="btn btn-secondary" disabled={refreshing}>
                <RefreshCw size={16} className={refreshing ? "spin" : ""} /> Actualiser
              </button>
              <button onClick={handleExport} className="btn btn-secondary"><Save size={16} /> Exporter</button>
              <button onClick={handleAddNew} className="btn btn-primary"><Plus size={16} /> Nouveau Matricule</button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div><p className="stat-label">Total</p><p className="stat-number">{stats.total}</p></div><Tag size={32} className="stat-icon" /></div>
            <div className="stat-card"><div><p className="stat-label">Actifs</p><p className="stat-number text-green">{stats.active}</p></div><CheckCircle size={32} className="stat-icon text-green" /></div>
            <div className="stat-card"><div><p className="stat-label">Inactifs</p><p className="stat-number text-gray">{stats.inactive}</p></div><XCircle size={32} className="stat-icon text-gray" /></div>
            <div className="stat-card"><div><p className="stat-label">Kilométrage total</p><p className="stat-number text-blue">{stats.totalKm.toLocaleString()} km</p></div><Gauge size={32} className="stat-icon text-blue" /></div>
          </div>

          <div className="search-wrapper">
            <div className="search-row">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input type="text" placeholder="Rechercher par plaque, marque, modèle..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
                <option value="all">Tous statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="sold">Vendus</option>  
              </select>
            </div>
          </div>

          {/* FILTER INDICATOR - Added here */}
          {filterParam === 'notifications' && (
            <div className="filter-indicator">
              <span className="filter-indicator-text">🔔 Affichage des notifications uniquement</span>
              <button
                onClick={() => setSearchParams({})}
                className="clear-filter-btn"
              >
                <X size={16} /> Effacer le filtre
              </button>
            </div>
          )}

          <div className="table-info">
            <p className="table-info-text">{filteredMatricules.length} matricule(s) trouvé(s)</p>
            <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
          </div>

          <div className="table-wrapper">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                    <th onClick={() => handleSort("matricule")} className="sortable-header">Plaque {getSortIcon("matricule")}</th>
                    <th onClick={() => handleSort("car")} className="sortable-header">Voiture {getSortIcon("car")}</th>
                    <th onClick={() => handleSort("kilometrage")} className="sortable-header">Kilométrage {getSortIcon("kilometrage")}</th>
                    <th>Visite tech</th>
                    <th>Vidange</th>
                    <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMatricules.map(mat => {
                    const car = cars.find(c => c.id === mat.car_id);
                    const status = statusConfig[mat.status] || statusConfig.active;
                    const StatusIcon = status.icon;
                    const techStatus = getDateStatusInfo(mat.visit_tech);

                    return (
                      <tr key={mat.id}>
                        <td className="font-medium">#{mat.id}</td>
                        <td className="matricule-code-cell">{mat.matricule_code}</td>
                        <td>{car ? `${car.brand} ${car.model}` : "—"}</td>
                        <td><div className="flex items-center gap-2"><Gauge size={14} /> {mat.kilometrage?.toLocaleString()} km</div></td>
                        <td>
                          {mat.visit_tech ? (
                            <span className={`date-alert ${techStatus?.class || ''}`}>
                              {techStatus?.icon && <techStatus.icon size={12} />}
                              {formatDate(mat.visit_tech)}
                            </span>
                          ) : "—"}
                        </td>
                        <td><span className={`badge ${mat.vidange_status === 'done' ? 'badge-success' : 'badge-warning'}`}>{mat.vidange_status === 'done' ? "Effectué" : "À faire"}</span></td>
                        <td><span className={`badge ${status.bg}`}><StatusIcon size={12} /> {status.label}</span></td>
                        <td className="text-right">
                          <div className="action-buttons">
                            <button onClick={() => handleViewDetails(mat)} className="action-btn action-btn-view" title="Détails"><Eye size={16} /></button>
                            <button onClick={() => handleEdit(mat)} className="action-btn action-btn-edit" title="Modifier"><Edit2 size={16} /></button>
                            <button onClick={() => handleOpenAccidentForm(mat)} className="action-btn action-btn-accident" title="Signaler un accident"><AlertTriangle size={16} /></button>
                            <button onClick={() => handleDeleteClick(mat)} className="action-btn action-btn-delete" title="Supprimer"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
    totalItems={filteredMatricules.length}
  />
)}
          </div>

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && matriculeToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon"><TrashIcon size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">Êtes-vous sûr de vouloir supprimer le matricule <br /><span className="matricule-code">{matriculeToDelete.matricule_code}</span> ?<br />Cette action est irréversible.</p>
                {matriculeToDelete.status === "active" && (<p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>⚠️ Ce matricule est actif. La suppression affectera les réservations associées.</p>)}
                <div className="delete-actions"><button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button><button onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        /* Global styles */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif; background: #f8fafc; }

        /* Sortable Headers */
        .sortable-header { cursor: pointer; user-select: none; transition: background-color 0.2s; }
        .sortable-header:hover { background-color: #e2e8f0; }
        .sort-icon { display: inline-block; margin-left: 4px; opacity: 0.5; vertical-align: middle; }
        .sort-icon.active { opacity: 1; color: #eab308; }

        /* Inline Details Container */
        .inline-details-container { background: white; border-radius: 32px; margin: 1.5rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; }
        .inline-details-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 24px 32px; display: flex; align-items: center; gap: 20px; position: relative; }
        .inline-details-icon { width: 56px; height: 56px; background: #eab308; border-radius: 28px; display: flex; align-items: center; justify-content: center; color: #1a1a2e; }
        .inline-details-title h2 { color: #eab308; font-size: 1.75rem; font-weight: 700; margin: 0; }
        .inline-details-title p { color: rgba(255, 255, 255, 0.7); font-size: 0.875rem; margin: 4px 0 0 0; }
        .inline-details-close { position: absolute; top: 24px; right: 28px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 40px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: all 0.2s; }
        .inline-details-close:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }
        .inline-details-content { padding: 28px 32px; }
        .inline-details-footer { display: flex; justify-content: flex-end; gap: 16px; padding: 20px 32px; border-top: 1px solid #e2e8f0; background: #f8fafc; }

        /* Inline Form Container (for both Matricule Form and Accident Form) */
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
        .inline-input, .inline-select, .inline-textarea { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.875rem; transition: all 0.2s; background: white; font-family: inherit; }
        .inline-input:focus, .inline-select:focus, .inline-textarea:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1); }
        .inline-textarea { resize: vertical; min-height: 80px; }
        .inline-secondary-btn { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
        .inline-primary-btn { background: linear-gradient(135deg, #1a1a2e, #16213e); border: none; padding: 12px 28px; border-radius: 40px; font-size: 0.875rem; font-weight: 600; color: #eab308; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
        .inline-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(26, 26, 46, 0.4); color: #fbbf24; }
        .inline-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .inline-form-footer { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 24px; }

        /* Details Actions Bar */
        .details-actions-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
        .back-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 8px 16px; background: #f1f5f9; border: none; border-radius: 40px; font-size: 0.875rem; cursor: pointer; }
        .back-btn:hover { background: #e2e8f0; }
        .details-action-buttons { display: flex; gap: 0.5rem; }
        .action-edit-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 8px 16px; background: #10b981; border: none; border-radius: 40px; font-size: 0.875rem; color: white; cursor: pointer; }
        .action-edit-btn:hover { background: #059669; }
        .action-accident-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 8px 16px; background: #eab308; border: none; border-radius: 40px; font-size: 0.875rem; color: #1a1a2e; cursor: pointer; font-weight: 500; }
        .action-accident-btn:hover { background: #fbbf24; }

        /* Matricule Header Card */
        .matricule-header-card { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border-radius: 1rem; padding: 1.5rem; margin-bottom: 1.5rem; }
        .matricule-plaque { font-size: 1.5rem; font-weight: 700; font-family: monospace; letter-spacing: 2px; margin-bottom: 1rem; color: #eab308; }
        .matricule-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
        .stat-item-detail { background: rgba(255, 255, 255, 0.1); padding: 0.75rem; border-radius: 0.75rem; text-align: center; }
        .stat-value { font-size: 1.25rem; font-weight: 700; }
        .stat-label-detail { font-size: 0.7rem; opacity: 0.7; margin-top: 0.25rem; }
        .status-badge-large { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 2rem; font-size: 0.875rem; font-weight: 500; background: rgba(255,255,255,0.2); }

        /* Details Grid */
        .details-sections-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .detail-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; }
        .detail-card-title { background: #f8fafc; padding: 0.75rem 1rem; font-weight: 600; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; }
        .detail-card-content { padding: 1rem; }
        .info-row { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-size: 0.75rem; color: #64748b; }
        .info-value { font-size: 0.75rem; font-weight: 500; }

        /* Tabs */
        .details-tabs-full { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 24px; flex-wrap: wrap; }
        .details-tab-full { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; transition: all 0.2s; border-radius: 12px 12px 0 0; }
        .details-tab-full:hover { background: #f1f5f9; }
        .details-tab-full.active { background: #0f172a; color: white; }

        /* Progress Section */
        .progress-section { background: #f8fafc; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; }
        .progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem; }
        .progress-title { font-size: 0.875rem; font-weight: 600; }
        .progress-status { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 1rem; }
        .status-done { background: #dcfce7; color: #166534; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .progress-bar-container { background: #e2e8f0; border-radius: 1rem; height: 8px; overflow: hidden; margin: 0.5rem 0; }
        .progress-bar-fill { background: #eab308; height: 100%; border-radius: 1rem; transition: width 0.3s; }
        .progress-text { font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 0.5rem; }
        .progress-legend { font-size: 0.7rem; color: #94a3b8; text-align: center; margin-top: 0.25rem; }

        /* Maintenance Cards */
        .maintenance-items-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1rem; }
        .maintenance-card { border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; background: white; }
        .maintenance-card-header { padding: 1rem; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
        .maintenance-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
        .required-badge { font-size: 0.65rem; background: #dc2626; color: white; padding: 0.125rem 0.375rem; border-radius: 1rem; }
        .required-badge-small { font-size: 0.6rem; background: #dc2626; color: white; padding: 0.125rem 0.375rem; border-radius: 1rem; }
        .status-badge { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; padding: 0.25rem 0.5rem; border-radius: 1rem; }
        .status-success { background: #dcfce7; color: #166534; }
        .status-warning { background: #fef3c7; color: #92400e; }
        .maintenance-card-body { padding: 1rem; }
        .maintenance-info { display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.875rem; }
        .maintenance-actions { display: flex; gap: 0.5rem; }
        .action-btn-small { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; cursor: pointer; border: none; }
        .action-btn-small.primary { background: #eab308; color: #1a1a2e; }
        .action-btn-small.primary:hover { background: #fbbf24; }
        .action-btn-small.secondary { background: #f1f5f9; color: #1e293b; }
        .action-btn-small.secondary:hover { background: #e2e8f0; }
        .add-form { margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
        .small-input { padding: 0.375rem 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.75rem; }
        .confirm-btn { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.375rem 0.75rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; font-size: 0.75rem; cursor: pointer; }
        .confirm-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Additional Maintenance */
        .additional-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
        .btn-add-additional { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: #eab308; color: #1a1a2e; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.875rem; }
        .additional-form { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .additional-form-row { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        .form-input, .form-select { padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; flex: 1; min-width: 150px; background: white; }
        .checkbox-label { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; cursor: pointer; }
        .additional-form-actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .cancel-btn { padding: 0.375rem 0.75rem; background: #ef4444; color: white; border: none; border-radius: 0.5rem; cursor: pointer; }
        .additional-items-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .additional-item-card { border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.75rem; }
        .additional-item-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem; }
        .additional-item-title { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .item-type-badge { font-size: 0.6rem; background: #64748b; color: white; padding: 0.125rem 0.375rem; border-radius: 0.5rem; }
        .status-badge-small { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.65rem; padding: 0.125rem 0.375rem; border-radius: 0.5rem; }
        .additional-item-body { display: flex; flex-direction: column; gap: 0.5rem; }
        .additional-item-info { display: flex; gap: 1rem; font-size: 0.75rem; }
        .additional-item-notes { font-size: 0.7rem; color: #64748b; font-style: italic; }
        .additional-item-actions { display: flex; gap: 0.5rem; }
        .empty-state-small { text-align: center; padding: 2rem; color: #64748b; }

        /* History Modal */
        .history-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
        .history-modal { background: white; border-radius: 1rem; max-width: 600px; width: 90%; max-height: 80vh; overflow: hidden; }
        .history-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #e2e8f0; }
        .history-close-btn { background: none; border: none; cursor: pointer; }
        .history-modal-body { padding: 1rem; overflow-y: auto; max-height: 60vh; }
        .history-table { width: 100%; font-size: 0.75rem; border-collapse: collapse; }
        .history-table th, .history-table td { padding: 0.5rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
        .empty-history { text-align: center; padding: 2rem; color: #64748b; }

        /* Date Alerts */
        .date-alert { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.5rem; font-size: 0.7rem; }
        .date-expired { background: #fee2e2; color: #dc2626; }
        .date-soon { background: #fef3c7; color: #d97706; }
        .date-ok { background: #dcfce7; color: #16a34a; }

        /* Badges */
        .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }

        /* Admin Container */
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
        .btn-primary:disabled, .btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        /* Stats Grid */
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .stat-number { font-size: 1.875rem; font-weight: 700; }
        .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat-icon { opacity: 0.5; }
        .text-green { color: #16a34a; }
        .text-gray { color: #6b7280; }
        .text-blue { color: #3b82f6; }

        /* Search */
        .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
        .search-row { display: flex; flex-direction: row; gap: 1rem; flex-wrap: wrap; }
        .search-container { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #64748b; }
        .search-input { width: 100%; padding: 0.5rem 1rem 0.5rem 2.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; }
        .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }
        .filter-select { width: 10rem; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; cursor: pointer; }

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

        /* Table */
        .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; min-width: 800px; }
        .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; }
        .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; }
        .table tr:hover { background: #f8fafc; }
        .matricule-code-cell { font-family: monospace; font-weight: 600; letter-spacing: 0.5px; color: #eab308; }
        .font-medium { font-weight: 500; }
        .text-right { text-align: right; }

        /* Action Buttons */
        .action-buttons { display: flex; gap: 0.5rem; justify-content: flex-end; }
        .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn-view { color: #3b82f6; }
        .action-btn-view:hover { background: #eff6ff; }
        .action-btn-edit { color: #10b981; }
        .action-btn-edit:hover { background: #ecfdf5; }
        .action-btn-accident { color: #eab308; }
        .action-btn-accident:hover { background: #fef3c7; }
        .action-btn-delete { color: #ef4444; }
        .action-btn-delete:hover { background: #fef2f2; }

        /* Pagination */
        .pagination { display: flex; justify-content: center; gap: 0.25rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
        .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; }
        .page-btn:hover:not(:disabled) { background: #f1f5f9; }
        .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Modal Overlay */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
        .modal { background: white; border-radius: 1.5rem; max-width: 32rem; width: 100%; max-height: 90vh; overflow-y: auto; }
        .delete-modal { max-width: 28rem; }
        .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; }
        .delete-title { text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .delete-message { text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
        .matricule-code { font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.5rem; display: inline-block; font-family: monospace; }
        .delete-actions { display: flex; gap: 0.75rem; padding-top: 1rem; }
        .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; }
        .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
        .modal-btn-cancel:hover { background: #f8fafc; }
        .btn-delete { background: #ef4444; color: white; }
        .btn-delete:hover { background: #dc2626; }

        /* Loading */
        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
        .spin { animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .flex { display: flex; }
        .items-center { align-items: center; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .btn-secondary-full { background: white; border: 1.5px solid #e2e8f0; padding: 10px 24px; border-radius: 40px; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
        .btn-secondary-full:hover { border-color: #eab308; color: #eab308; }
        .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
        .table-info-text { font-size: 0.875rem; color: #64748b; }
        .field-hint.warning { font-size: 0.7rem; color: #dc2626; margin-top: 0.25rem; }

        /* Searchable selects */
        .inline-search-section { background: white; border-radius: 16px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
        .inline-search-input-wrapper { position: relative; }
        .inline-search-input-wrapper svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .inline-search-input-wrapper .inline-input { padding-left: 42px; padding-right: 42px; }
        .clear-search-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #94a3b8; padding: 4px; }
        .clear-search-btn:hover { color: #ef4444; }
        .inline-results { max-height: 250px; overflow-y: auto; margin-top: 8px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .inline-result-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
        .inline-result-item:hover { background: #fefce8; }
        .inline-result-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 36px; display: flex; align-items: center; justify-content: center; color: #eab308; }
        .inline-result-info { flex: 1; }
        .inline-result-info strong { display: block; margin-bottom: 4px; font-size: 0.875rem; }
        .inline-result-details { display: flex; gap: 12px; font-size: 0.7rem; color: #64748b; flex-wrap: wrap; }
        .inline-selected { background: linear-gradient(135deg, #fefce8, #fef3c7); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .inline-selected svg { color: #eab308; flex-shrink: 0; }
        .inline-selected strong { display: block; font-size: 0.7rem; color: #92400e; }
        .inline-selected p { font-size: 0.8rem; font-weight: 500; margin: 0; }
        .inline-no-results { padding: 0.75rem; color: #64748b; font-size: 0.875rem; text-align: center; }

        /* Responsive */
        @media (max-width: 1024px) { .inline-form-grid { grid-template-columns: 1fr; gap: 24px; } .maintenance-items-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .admin-container { padding: 1rem; } .header { flex-direction: column; align-items: flex-start; } .header-actions { width: 100%; justify-content: flex-start; } .search-row { flex-direction: column; } .filter-select { width: 100%; } .inline-grid-2 { grid-template-columns: 1fr; } .inline-form-container, .inline-details-container { margin: 1rem; } .inline-form-header, .inline-details-header { padding: 16px 20px; } .inline-form-header h2, .inline-details-title h2 { font-size: 1.25rem; } .inline-form, .inline-details-content { padding: 20px; } .stats-grid { grid-template-columns: repeat(2, 1fr); } .details-sections-grid { grid-template-columns: 1fr; } .matricule-stats-grid { grid-template-columns: repeat(2, 1fr); } }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
            body { background: #0f172a; }
            .stat-card, .table-wrapper, .search-wrapper, .modal, .inline-form-container, .inline-details-container, .maintenance-card, .detail-card, .history-modal { background: #1e293b; border-color: #334155; }
            .stat-label, .table-info-text, .table th, .subtitle, .delete-message, .info-label, .progress-text, .progress-legend, .empty-history, .empty-state-small { color: #94a3b8; }
            .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
            .btn-secondary, .btn-secondary-full, .back-btn { background: #334155; color: #e2e8f0; }
            .btn-secondary:hover, .btn-secondary-full:hover, .back-btn:hover { background: #475569; }
            .search-input, .filter-select, .inline-input, .inline-select, .small-input, .form-input, .form-select, .inline-textarea { background: #0f172a; border-color: #334155; color: #f1f5f9; }
            .inline-section, .progress-section, .additional-form { background: #0f172a; border-color: #334155; }
            .inline-section-header h3, .inline-info-item .info-value, .matricule-code, .maintenance-title { color: #f1f5f9; }
            .table tr:hover { background: #334155; }
            .page-btn { background: #1e293b; border-color: #475569; color: #e2e8f0; }
            .page-btn.active { background: #f59e0b; color: #0f172a; }
            .badge-success { background: #14532d; color: #4ade80; }
            .badge-danger { background: #7f1d1d; color: #fca5a5; }
            .badge-warning { background: #78350f; color: #fde68a; }
            .date-expired { background: #7f1d1d; color: #fca5a5; }
            .date-soon { background: #78350f; color: #fbbf24; }
            .date-ok { background: #14532d; color: #4ade80; }
            .action-btn-view:hover { background: #1e3a5f; }
            .action-btn-edit:hover { background: #064e3b; }
            .action-btn-accident:hover { background: #78350f; }
            .action-btn-delete:hover { background: #7f1d1d; }
            .status-success { background: #14532d; color: #4ade80; }
            .status-warning { background: #78350f; color: #fde68a; }
            .detail-card-title { background: #0f172a; }
            .info-row { border-bottom-color: #334155; }
            .history-modal-header { border-bottom-color: #334155; }
            .history-table th, .history-table td { border-bottom-color: #334155; color: #e2e8f0; }
            .progress-section { background: #0f172a; }
            .progress-bar-container { background: #334155; }
            .action-btn-small.secondary { background: #334155; color: #e2e8f0; }
            .additional-item-card { border-color: #334155; }
            .sortable-header:hover { background-color: #334155; }
            .inline-details-footer { background: #0f172a; border-color: #334155; }
            .inline-secondary-btn { background: #1e293b; color: #e2e8f0; border-color: #334155; }
            .inline-search-section { background: #0f172a; border-color: #334155; }
            .inline-result-item { border-bottom-color: #334155; }
            .inline-result-item:hover { background: #334155; }
            .inline-selected { background: #334155; color: #e2e8f0; }
            .inline-selected strong { color: #eab308; }
            .inline-selected p { color: #f1f5f9; }
            .inline-no-results { color: #94a3b8; }
            .clear-search-btn { color: #94a3b8; }
            .clear-search-btn:hover { color: #ef4444; }
            .filter-indicator { background: #78350f; border-color: #f59e0b; }
            .filter-indicator-text { color: #fde68a; }
            .clear-filter-btn { border-color: #fde68a; color: #fde68a; }
            .clear-filter-btn:hover { background: #fde68a; color: #1e293b; }
        }
/* Light mode */
.badge-sold {
  background: #fef3c7;
  color: #92400e;
}

/* Dark mode (inside @media (prefers-color-scheme: dark) block) */
.badge-sold {
  background: #78350f;
  color: #fde68a;
}
        /* Fix horizontal overflow */
        html, body { overflow-x: auto !important; min-width: 320px; }
        .admin-container, .inline-form-container, .inline-details-container { overflow-x: auto !important; min-width: 0; width: 100%; }
        .inline-form, .inline-details-content { overflow-x: auto !important; }
        .table-wrapper, .inline-form, .inline-details-content { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
        .admin-container, .inline-form-container, .inline-details-container { max-width: 100%; overflow-x: auto; }
        @media screen and (max-width: 1400px) { .admin-container { padding: 1rem; overflow-x: auto; } .inline-form-grid { grid-template-columns: 1fr; min-width: auto; } }
        body { overflow-x: auto; min-width: 320px; }
        @media (max-width: 640px) { .inline-grid-2 { grid-template-columns: 1fr; min-width: auto; } .stats-grid { grid-template-columns: repeat(2, 1fr); overflow-x: auto; } .action-buttons { flex-wrap: wrap; justify-content: flex-start; } .modal { max-width: 95%; margin: 0 auto; } }
        * { max-width: 100%; box-sizing: border-box; }
      `}</style>
    </>
  );
}