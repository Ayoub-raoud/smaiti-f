// src/pages/admin/AdminCars.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCars, createCar, updateCar, deleteCar, selectCars, selectCarsLoading, fetchMatricules, selectMatricules } from "../../Redux/store";
import { toast } from "sonner";
import { 
  Plus, Edit2, Trash2, X, Search, RefreshCw, Car, Palette, DollarSign, 
  ChevronLeft, ChevronRight, Calendar, Gauge, Fuel, Settings, Users, 
  DoorOpen, AlertTriangle, CheckCircle, XCircle, Image as ImageIcon,
  Upload, Save, Ban, TrashIcon, CarFront, Grid3x3, List, LayoutGrid,
  CheckCircle2, AlertCircle, Shield, Wrench, CalendarCheck, Sparkles,
  Star, Gem, Award, Heart, Zap, ArrowUpDown, ArrowUp, ArrowDown,
  Info, Crown, Briefcase, Activity, Clock, Key, Lock, Unlock
} from "lucide-react";
import { getImageUrl } from '../../utils/imageUtils';

export default function AdminCars() {
  const dispatch = useDispatch();
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);
  const loading = useSelector(selectCarsLoading);
  
  const [showCarForm, setShowCarForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [carToDelete, setCarToDelete] = useState(null);
  const [editingCar, setEditingCar] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [imagePreview, setImagePreview] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'cards'
  
  // Sorting state
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  
  const itemsPerPage = 10;
  const cardsPerPage = 12;
  
  const [formData, setFormData] = useState({
    brand: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    fuel_type: "petrol",
    transmission: "manual",
    seats: 5,
    doors: 4,
    price_per_day: 100,
    image: "",
    status: "disponible"
  });

  useEffect(() => { 
    dispatch(fetchCars()); 
    dispatch(fetchMatricules());
  }, [dispatch]);

  // Calculate real disponibility based on matricules
  const getCarRealStatus = (carId) => {
    const carMatricules = matricules.filter(m => m.car_id === carId);
    
    if (carMatricules.length === 0) {
      return { status: 'non_disponible', reason: 'Aucune immatriculation associée', availableCount: 0, totalCount: 0 };
    }
    
    const activeMatricules = carMatricules.filter(m => m.status === 'active');
    const availableMatricules = activeMatricules.filter(m => m.status === 'active');
    const hasAvailable = availableMatricules.length > 0;
    
    return {
      status: hasAvailable ? 'disponible' : 'non_disponible',
      reason: hasAvailable ? `${availableMatricules.length} matricule(s) disponible(s)` : 'Aucun matricule disponible',
      availableCount: availableMatricules.length,
      totalCount: carMatricules.length,
      activeCount: activeMatricules.length
    };
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

  // Filter and sort cars
  const filteredCars = cars.filter(car => 
    searchTerm === '' || 
    car.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.color?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    let aVal, bVal;
    switch (sortField) {
      case "id":
        aVal = a.id;
        bVal = b.id;
        break;
      case "brand":
        aVal = a.brand?.toLowerCase() || "";
        bVal = b.brand?.toLowerCase() || "";
        break;
      case "model":
        aVal = a.model?.toLowerCase() || "";
        bVal = b.model?.toLowerCase() || "";
        break;
      case "year":
        aVal = a.year || 0;
        bVal = b.year || 0;
        break;
      case "price":
        aVal = a.price_per_day || 0;
        bVal = b.price_per_day || 0;
        break;
      case "fuel_type":
        aVal = a.fuel_type || "";
        bVal = b.fuel_type || "";
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

  const itemsPerView = viewMode === 'list' ? itemsPerPage : cardsPerPage;
  const totalPages = Math.ceil(filteredCars.length / itemsPerView);
  const paginatedCars = filteredCars.slice((currentPage - 1) * itemsPerView, currentPage * itemsPerView);

  const handleCreateCar = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(createCar(data)).unwrap();
      toast.success("Voiture ajoutée avec succès!");
      setShowCarForm(false);
      setEditingCar(null);
      setImagePreview('');
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCar = async (data) => {
    setSubmitting(true);
    try {
      const result = await dispatch(updateCar({ id: editingCar.id, data })).unwrap();
      toast.success("Voiture modifiée avec succès!");
      setShowCarForm(false);
      setEditingCar(null);
      setImagePreview('');
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
      resetForm();
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (car) => {
    setEditingCar(car);
    setFormData({
      brand: car.brand,
      model: car.model,
      year: car.year,
      color: car.color,
      fuel_type: car.fuel_type || "petrol",
      transmission: car.transmission || "manual",
      seats: car.seats || 5,
      doors: car.doors || 4,
      price_per_day: car.price_per_day,
      image: car.image || "",
      status: car.status || "disponible"
    });
    setImagePreview(car.image_url || car.image || '');
    setShowCarForm(true);
  };

  const handleAddNew = () => {
    setEditingCar(null);
    resetForm();
    setImagePreview('');
    setShowCarForm(true);
  };

  const resetForm = () => {
    setFormData({
      brand: "",
      model: "",
      year: new Date().getFullYear(),
      color: "",
      fuel_type: "petrol",
      transmission: "manual",
      seats: 5,
      doors: 4,
      price_per_day: 100,
      image: "",
      status: "disponible"
    });
  };

  const handleDeleteClick = (car) => {
    setCarToDelete(car);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!carToDelete) return;
    const result = await dispatch(deleteCar(carToDelete.id));
    if (result.error) toast.error(result.payload);
    else { 
      toast.success("Voiture supprimée avec succès"); 
      await dispatch(fetchCars(true));
      await dispatch(fetchMatricules(true));
    }
    setDeleteModalOpen(false);
    setCarToDelete(null);
  };

  const refreshData = async () => { 
    await dispatch(fetchCars(true)); 
    await dispatch(fetchMatricules(true));
    toast.success("Liste actualisée"); 
  };

  const handleExport = () => {
    const headers = ['ID', 'Marque', 'Modèle', 'Année', 'Couleur', 'Carburant', 'Transmission', 'Places', 'Portes', 'Prix/Jour', 'Statut', 'Disponibilité Réelle'];
    const csvData = filteredCars.map(car => {
      const realStatus = getCarRealStatus(car.id);
      return [car.id, `"${car.brand}"`, `"${car.model}"`, car.year, `"${car.color}"`, car.fuel_type, car.transmission, car.seats, car.doors, car.price_per_day, car.status, realStatus.status].join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + csvData.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `voitures_${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  const getStatusBadge = (status) => {
    if (status === 'disponible') return <span className="badge badge-success"><CheckCircle size={12} /> Disponible</span>;
    return <span className="badge badge-danger"><XCircle size={12} /> Non disponible</span>;
  };

  const getRealStatusBadge = (car) => {
    const realStatus = getCarRealStatus(car.id);
    if (realStatus.status === 'disponible') {
      return (
        <div className="real-status available">
          <CheckCircle2 size={12} />
          <span>Disponible ({realStatus.availableCount}/{realStatus.totalCount})</span>
        </div>
      );
    }
    return (
      <div className="real-status unavailable">
        <AlertCircle size={12} />
        <span>Indisponible - {realStatus.reason}</span>
      </div>
    );
  };

  const getFuelBadge = (fuel) => {
    const config = { petrol: 'badge-amber', diesel: 'badge-blue', electric: 'badge-emerald', hybrid: 'badge-purple' };
    const labels = { petrol: 'Essence', diesel: 'Diesel', electric: 'Électrique', hybrid: 'Hybride' };
    const icons = { petrol: <Fuel size={12} />, diesel: <Fuel size={12} />, electric: <Gauge size={12} />, hybrid: <Settings size={12} /> };
    return <span className={`badge ${config[fuel] || config.petrol}`}>{icons[fuel]} {labels[fuel] || fuel}</span>;
  };

  const getTransmissionLabel = (transmission) => {
    return transmission === 'automatic' ? 'Automatique' : 'Manuelle';
  };

  const getStats = () => {
    const total = cars.length;
    const disponible = cars.filter(car => getCarRealStatus(car.id).status === 'disponible').length;
    const nonDisponible = total - disponible;
    const totalPrice = cars.reduce((sum, car) => sum + (Number(car.price_per_day) || 0), 0);
    const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;
    const totalMatricules = matricules.length;
    const activeMatricules = matricules.filter(m => m.status === 'active').length;
    return { total, disponible, nonDisponible, avgPrice, totalMatricules, activeMatricules };
  };
  const stats = getStats();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image ne doit pas dépasser 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error("Veuillez sélectionner une image valide");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result;
        setFormData({ ...formData, image: imageUrl });
        setImagePreview(imageUrl);
      };
      reader.onerror = () => {
        toast.error("Erreur lors de la lecture de l'image");
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Chargement des véhicules...</p>
    </div>
  );

  return (
    <>
      {/* Car Form - Full Page Inline */}
      {showCarForm ? (
        <div className="inline-form-container">
          <div className="inline-form-header">
            <div className="inline-form-icon">
              {editingCar ? <Sparkles size={28} /> : <Star size={28} />}
            </div>
            <div className="inline-form-title">
              <h2>{editingCar ? "Modifier le véhicule" : "Nouveau véhicule"}</h2>
              <p>{editingCar ? "Modifiez les informations du véhicule" : "Ajoutez un nouveau véhicule à votre flotte"}</p>
            </div>
            <button onClick={() => { setShowCarForm(false); setEditingCar(null); resetForm(); setImagePreview(''); }} className="inline-form-close">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (editingCar) {
              handleUpdateCar(formData);
            } else {
              handleCreateCar(formData);
            }
          }} className="inline-form">
            <div className="inline-form-grid">
              {/* Left Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <Car size={18} />
                    <h3>Informations du véhicule</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Marque *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.brand} 
                        onChange={(e) => setFormData({...formData, brand: e.target.value})} 
                        required 
                        placeholder="Ex: Renault, Peugeot..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Modèle *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.model} 
                        onChange={(e) => setFormData({...formData, model: e.target.value})} 
                        required 
                        placeholder="Ex: Clio, 208..."
                      />
                    </div>
                    <div className="inline-field">
                      <label>Année *</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.year} 
                        onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})} 
                        required 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Couleur *</label>
                      <input 
                        type="text" 
                        className="inline-input" 
                        value={formData.color} 
                        onChange={(e) => setFormData({...formData, color: e.target.value})} 
                        required 
                        placeholder="Ex: Rouge, Bleu..."
                      />
                    </div>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <Settings size={18} />
                    <h3>Caractéristiques techniques</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Carburant</label>
                      <select 
                        className="inline-select" 
                        value={formData.fuel_type} 
                        onChange={(e) => setFormData({...formData, fuel_type: e.target.value})}
                      >
                        <option value="petrol">⛽ Essence</option>
                        <option value="diesel">⛽ Diesel</option>
                        <option value="electric">🔋 Électrique</option>
                        <option value="hybrid">⚡ Hybride</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Transmission</label>
                      <select 
                        className="inline-select" 
                        value={formData.transmission} 
                        onChange={(e) => setFormData({...formData, transmission: e.target.value})}
                      >
                        <option value="manual">⚙️ Manuelle</option>
                        <option value="automatic">⚙️ Automatique</option>
                      </select>
                    </div>
                    <div className="inline-field">
                      <label>Places</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.seats} 
                        onChange={(e) => setFormData({...formData, seats: parseInt(e.target.value)})} 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Portes</label>
                      <input 
                        type="number" 
                        className="inline-input" 
                        value={formData.doors} 
                        onChange={(e) => setFormData({...formData, doors: parseInt(e.target.value)})} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="inline-form-col">
                <div className="inline-section">
                  <div className="inline-section-header">
                    <DollarSign size={18} />
                    <h3>Tarification et statut</h3>
                  </div>
                  <div className="inline-grid-2">
                    <div className="inline-field">
                      <label>Prix par jour (DH) *</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="inline-input" 
                        value={formData.price_per_day} 
                        onChange={(e) => setFormData({...formData, price_per_day: parseFloat(e.target.value)})} 
                        required 
                      />
                    </div>
                    <div className="inline-field">
                      <label>Statut</label>
                      <select 
                        className="inline-select" 
                        value={formData.status} 
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="disponible">✅ Disponible</option>
                        <option value="non disponible">❌ Non disponible</option>
                      </select>
                    </div>
                  </div>
                  <div className="inline-info-message">
                    <Info size={16} />
                    <span>La disponibilité réelle dépend des immatriculations actives et des réservations en cours</span>
                  </div>
                </div>

                <div className="inline-section">
                  <div className="inline-section-header">
                    <ImageIcon size={18} />
                    <h3>Image du véhicule</h3>
                  </div>
                  <div className="image-upload-area" onClick={() => document.getElementById('carImageInput').click()}>
                    <Upload size={32} />
                    <p>Cliquez pour télécharger une image</p>
                    <p style={{ fontSize: '0.7rem', color: '#64748b' }}>PNG, JPG jusqu'à 5MB</p>
                    <input type="file" id="carImageInput" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </div>
                  {imagePreview && (
                    <div className="image-preview-container">
                      <img src={imagePreview} alt="Preview" className="image-preview" />
                      <button 
                        type="button" 
                        className="remove-image-btn"
                        onClick={() => { setImagePreview(''); setFormData({...formData, image: ''}); }}
                      >
                        <X size={14} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {editingCar && (
                  <div className="inline-section">
                    <div className="inline-section-header">
                      <Activity size={18} />
                      <h3>Informations système</h3>
                    </div>
                    <div className="inline-info-grid">
                      <div className="inline-info-item">
                        <span className="info-label">Date de création</span>
                        <span className="info-value">
                          {editingCar.created_at ? new Date(editingCar.created_at).toLocaleDateString("fr-FR") : "—"}
                        </span>
                      </div>
                      <div className="inline-info-item">
                        <span className="info-label">Dernière modification</span>
                        <span className="info-value">
                          {editingCar.updated_at ? new Date(editingCar.updated_at).toLocaleDateString("fr-FR") : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="inline-form-footer">
              <button type="button" className="inline-secondary-btn" onClick={() => { setShowCarForm(false); setEditingCar(null); resetForm(); setImagePreview(''); }}>
                Annuler
              </button>
              <button type="submit" className="inline-primary-btn" disabled={submitting}>
                {submitting ? "Traitement..." : (editingCar ? "Mettre à jour" : "Créer le véhicule")}
              </button>
            </div>
          </form>
        </div>
      ) : (
        // Main Cars List
        <div className="admin-container">
          <div className="header">
            <div>
              <h1 className="title">Gestion des Voitures</h1>
              <p className="subtitle">Gérez votre flotte de véhicules - Disponibilité basée sur les immatriculations actives</p>
            </div>
            <div className="header-actions">
              <div className="view-toggle">
                <button 
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => { setViewMode('list'); setCurrentPage(1); }}
                >
                  <List size={16} /> Liste
                </button>
                <button 
                  className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                  onClick={() => { setViewMode('cards'); setCurrentPage(1); }}
                >
                  <LayoutGrid size={16} /> Cartes
                </button>
              </div>
              <button onClick={refreshData} className="btn btn-secondary">
                <RefreshCw size={16} /> Actualiser
              </button>
              <button onClick={handleExport} className="btn btn-secondary">
                <Save size={16} /> Exporter
              </button>
              <button onClick={handleAddNew} className="btn btn-primary">
                <Plus size={16} /> Nouveau Véhicule
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div>
                <p className="stat-label">Total Voitures</p>
                <p className="stat-number">{stats.total}</p>
              </div>
              <CarFront size={32} className="stat-icon" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Disponibles (Réel)</p>
                <p className="stat-number text-green">{stats.disponible}</p>
                <p className="stat-label" style={{ fontSize: '0.6rem' }}>Basé sur matricules actifs</p>
              </div>
              <CheckCircle2 size={32} className="stat-icon text-green" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Indisponibles</p>
                <p className="stat-number text-red">{stats.nonDisponible}</p>
              </div>
              <AlertCircle size={32} className="stat-icon text-red" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Prix moyen/jour</p>
                <p className="stat-number text-emerald">{stats.avgPrice.toLocaleString()} DH</p>
              </div>
              <DollarSign size={32} className="stat-icon text-emerald" />
            </div>
            <div className="stat-card">
              <div>
                <p className="stat-label">Matricules actifs</p>
                <p className="stat-number text-blue">{stats.activeMatricules}/{stats.totalMatricules}</p>
              </div>
              <Shield size={32} className="stat-icon text-blue" />
            </div>
          </div>

          <div className="search-wrapper">
            <div className="search-container">
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Rechercher par marque, modèle, couleur..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="search-input" 
              />
            </div>
          </div>

          <div className="table-info">
            <p className="table-info-text">{filteredCars.length} voiture(s) trouvée(s)</p>
            <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
          </div>

          {viewMode === 'list' ? (
            <div className="table-wrapper">
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                      <th>Image</th>
                      <th onClick={() => handleSort("brand")} className="sortable-header">Marque {getSortIcon("brand")}</th>
                      <th onClick={() => handleSort("model")} className="sortable-header">Modèle {getSortIcon("model")}</th>
                      <th onClick={() => handleSort("year")} className="sortable-header">Année {getSortIcon("year")}</th>
                      <th>Couleur</th>
                      <th onClick={() => handleSort("fuel_type")} className="sortable-header">Carburant {getSortIcon("fuel_type")}</th>
                      <th>Transmission</th>
                      <th onClick={() => handleSort("price")} className="sortable-header">Prix/Jour {getSortIcon("price")}</th>
                      <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                      <th>Disponibilité (réelle)</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCars.map(car => {
                      const realStatus = getCarRealStatus(car.id);
                      return (
                        <tr key={car.id}>
                          <td className="font-medium">#{car.id}</td>
                          <td className="car-image-cell">
                            {(car.image_url || car.image) ? (
                              <img 
                                src={getImageUrl(car.image_url || car.image)}
                                alt={`${car.brand} ${car.model}`}
                                className="car-thumbnail"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            ) : (
                              <div className="car-thumbnail-placeholder">
                                <Car size={24} />
                              </div>
                            )}
                          </td>
                          <td className="font-medium">{car.brand}</td>
                          <td>{car.model}</td>
                          <td><div className="flex items-center gap-1"><Calendar size={14} /> {car.year}</div></td>
                          <td><div className="flex items-center gap-1"><Palette size={14} /> {car.color}</div></td>
                          <td>{getFuelBadge(car.fuel_type)}</td>
                          <td><div className="flex items-center gap-1"><Settings size={14} /> {getTransmissionLabel(car.transmission)}</div></td>
                          <td className="price-cell">{car.price_per_day} DH</td>
                          <td>{getStatusBadge(car.status)}</td>
                          <td>{getRealStatusBadge(car)}</td>
                          <td className="text-right">
                            <div className="action-buttons">
                              <button onClick={() => handleEdit(car)} className="action-btn action-btn-edit" title="Modifier">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteClick(car)} className="action-btn action-btn-delete" title="Supprimer">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="page-btn"><ChevronLeft size={16} /></button>
                  {[...Array(Math.min(totalPages,5))].map((_,i) => { 
                    let p = i+1; 
                    if(totalPages>5 && currentPage>3) { 
                      p = currentPage-3+i; 
                      if(p>totalPages) return null; 
                    } 
                    return <button key={i} onClick={() => setCurrentPage(p)} className={`page-btn ${currentPage===p ? 'active' : ''}`}>{p}</button>; 
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="page-btn"><ChevronRight size={16} /></button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="cards-grid">
                {paginatedCars.map(car => {
                  const realStatus = getCarRealStatus(car.id);
                  return (
                    <div key={car.id} className="car-card">
                      <div className="card-image">
                        {(car.image_url || car.image) ? (
                          <img 
                            src={getImageUrl(car.image_url || car.image)}
                            alt={`${car.brand} ${car.model}`}
                            onError={(e) => e.target.src = ''}
                          />
                        ) : (
                          <Car size={64} style={{ color: '#94a3b8' }} />
                        )}
                        <div className="card-status">
                          {getRealStatusBadge(car)}
                        </div>
                      </div>
                      <div className="card-content">
                        <div className="card-title">
                          <span>{car.brand} {car.model}</span>
                          <span className="card-price">{car.price_per_day} DH<span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>/jour</span></span>
                        </div>
                        <div className="card-details">
                          <div className="detail-item"><Calendar size={14} /> {car.year}</div>
                          <div className="detail-item"><Palette size={14} /> {car.color}</div>
                          <div className="detail-item">{getFuelBadge(car.fuel_type)}</div>
                          <div className="detail-item"><Settings size={14} /> {getTransmissionLabel(car.transmission)}</div>
                          <div className="detail-item"><Users size={14} /> {car.seats} places</div>
                          <div className="detail-item"><DoorOpen size={14} /> {car.doors} portes</div>
                        </div>
                        <div className="card-real-status">
                          <div className="flex items-center gap-1" style={{ fontSize: '0.7rem' }}>
                            <Wrench size={12} />
                            <span>Matricules: {realStatus.availableCount}/{realStatus.totalCount} disponibles</span>
                          </div>
                        </div>
                        <div className="card-actions">
                          <button onClick={() => handleEdit(car)} className="card-action-btn edit">
                            <Edit2 size={14} /> Modifier
                          </button>
                          <button onClick={() => handleDeleteClick(car)} className="card-action-btn delete">
                            <Trash2 size={14} /> Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: '1.5rem' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="page-btn"><ChevronLeft size={16} /></button>
                  {[...Array(Math.min(totalPages,5))].map((_,i) => { 
                    let p = i+1; 
                    if(totalPages>5 && currentPage>3) { 
                      p = currentPage-3+i; 
                      if(p>totalPages) return null; 
                    } 
                    return <button key={i} onClick={() => setCurrentPage(p)} className={`page-btn ${currentPage===p ? 'active' : ''}`}>{p}</button>; 
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="page-btn"><ChevronRight size={16} /></button>
                </div>
              )}
            </>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && carToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon">
                  <TrashIcon size={32} />
                </div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">
                  Êtes-vous sûr de vouloir supprimer la voiture <br />
                  <span className="car-name">{carToDelete.brand} {carToDelete.model}</span> ?<br />
                  Cette action est irréversible.
                </p>
                {(carToDelete.status === "disponible") && (
                  <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                    ⚠️ Cette voiture est marquée comme disponible. La suppression affectera les réservations associées.
                  </p>
                )}
                <div className="delete-actions">
                  <button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button>
                  <button onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button>
                </div>
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

        .inline-input, .inline-select {
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          font-family: inherit;
        }

        .inline-input:focus, .inline-select:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }

        .inline-info-message {
          background: #fefce8;
          border: 1px solid #fde047;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.75rem;
          color: #854d0e;
          margin-top: 16px;
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

        .image-upload-area {
          border: 2px dashed #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .image-upload-area:hover {
          border-color: #eab308;
          background: #fefce8;
        }

        .image-preview-container {
          margin-top: 16px;
          text-align: center;
        }

        .image-preview {
          width: 150px;
          height: 150px;
          object-fit: cover;
          border-radius: 16px;
          border: 2px solid #e2e8f0;
        }

        .remove-image-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-top: 8px;
          padding: 4px 12px;
          background: #fee2e2;
          border: none;
          border-radius: 20px;
          font-size: 0.7rem;
          color: #dc2626;
          cursor: pointer;
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
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.2s;
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
        .text-red { color: #dc2626; }
        .text-emerald { color: #059669; }
        .text-blue { color: #2563eb; }
        .text-amber { color: #d97706; }

        /* View Toggle */
        .view-toggle {
          display: flex;
          gap: 0.5rem;
          background: #f1f5f9;
          padding: 0.25rem;
          border-radius: 0.75rem;
        }

        .view-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border: none;
          background: transparent;
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          transition: all 0.2s;
        }

        .view-btn.active {
          background: white;
          color: #0f172a;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .view-btn:hover:not(.active) {
          background: #e2e8f0;
        }

        /* Search */
        .search-wrapper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .search-container {
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
          vertical-align: middle;
        }

        .table tr:hover {
          background: #f8fafc;
        }

        .car-image-cell {
          width: 60px;
        }

        .car-thumbnail {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .car-thumbnail-placeholder {
          width: 50px;
          height: 50px;
          background: #f1f5f9;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
        }

        .price-cell {
          font-weight: 600;
          color: #eab308;
        }

        .font-medium { font-weight: 500; }

        /* Cards Grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
        }

        .car-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .car-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -12px rgba(0,0,0,0.1);
        }

        .card-image {
          position: relative;
          height: 200px;
          background: #f1f5f9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .card-status {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
        }

        .card-content {
          padding: 1rem;
        }

        .card-title {
          font-size: 1.125rem;
          font-weight: 700;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .card-price {
          font-size: 1.25rem;
          font-weight: 700;
          color: #eab308;
        }

        .card-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          margin: 0.75rem 0;
          padding: 0.5rem 0;
          border-top: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #64748b;
        }

        .card-real-status {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: #f8fafc;
          border-radius: 0.5rem;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .card-action-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.5rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .card-action-btn:hover {
          background: #f1f5f9;
        }

        .card-action-btn.edit:hover {
          border-color: #eab308;
          color: #eab308;
        }

        .card-action-btn.delete:hover {
          border-color: #ef4444;
          color: #ef4444;
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

        .badge-success {
          background: #dcfce7;
          color: #166534;
        }

        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .badge-amber {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-blue {
          background: #dbeafe;
          color: #1e40af;
        }

        .badge-emerald {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-purple {
          background: #f3e8ff;
          color: #6b21a5;
        }

        /* Real Status */
        .real-status {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          font-size: 0.7rem;
          font-weight: 500;
        }

        .real-status.available {
          background: #dcfce7;
          color: #166534;
        }

        .real-status.unavailable {
          background: #fee2e2;
          color: #991b1b;
        }

        /* Actions */
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

        .page-btn:hover:not(:disabled) {
          background: #f1f5f9;
        }

        .page-btn.active {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
        }

        .page-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Modal Overlay */
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

        .delete-modal { max-width: 28rem; }

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

        .car-name {
          font-weight: 600;
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

        .btn-delete {
          background: #ef4444;
          color: white;
        }

        .btn-delete:hover { background: #dc2626; }

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
          .inline-grid-2 { grid-template-columns: 1fr; }
          .inline-form-container { margin: 1rem; }
          .inline-form-header { padding: 16px 20px; }
          .inline-form-header h2 { font-size: 1.25rem; }
          .inline-form { padding: 20px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .cards-grid { grid-template-columns: 1fr; }
        }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .search-wrapper, .table-wrapper, .modal, .car-card, .inline-form-container {
            background: #1e293b;
            border-color: #334155;
          }
          .stat-label, .table-info-text, .table th, .subtitle, .detail-item, .inline-info-item .info-label {
            color: #94a3b8;
          }
          .title {
            background: linear-gradient(135deg, #f1f5f9, #94a3b8);
            background-clip: text;
            -webkit-background-clip: text;
          }
          .btn-secondary {
            background: #334155;
            color: #e2e8f0;
          }
          .btn-secondary:hover { background: #475569; }
          .search-input, .inline-input, .inline-select {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .inline-section {
            background: #0f172a;
            border-color: #334155;
          }
          .inline-section-header h3, .inline-info-item .info-value {
            color: #f1f5f9;
          }
          .inline-info-message {
            background: #422006;
            border-color: #713f12;
            color: #fde047;
          }
          .image-upload-area {
            background: #0f172a;
            border-color: #334155;
          }
          .image-upload-area:hover {
            border-color: #eab308;
            background: #1e293b;
          }
          .table tr:hover { background: #334155; }
          .page-btn {
            background: #1e293b;
            border-color: #475569;
            color: #e2e8f0;
          }
          .page-btn.active {
            background: #f59e0b;
            color: #0f172a;
          }
          .badge-success { background: #14532d; color: #4ade80; }
          .badge-danger { background: #7f1d1d; color: #fca5a5; }
          .badge-amber { background: #78350f; color: #fde68a; }
          .badge-blue { background: #1e3a5f; color: #60a5fa; }
          .badge-emerald { background: #064e3b; color: #34d399; }
          .badge-purple { background: #4c1d95; color: #c084fc; }
          .action-btn-edit:hover { background: #064e3b; }
          .action-btn-delete:hover { background: #7f1d1d; }
          .car-thumbnail-placeholder { background: #334155; }
          .card-real-status { background: #0f172a; }
          .sortable-header:hover {
            background-color: #334155;
          }
        }
          /* Add these styles to ALL admin pages (AdminReservations, AdminCars, AdminUsers, AdminMatricules, AdminClients, AdminAccidents, AdminPayments) */

/* Fix horizontal overflow on zoom */
html, body {
  overflow-x: auto !important;
  min-width: 320px;
}

.admin-container,
.inline-form-container,
.inline-details-container {
  overflow-x: auto !important;
  min-width: 0;
  width: 100%;
}

.inline-form,
.inline-details-content {
  overflow-x: auto !important;
}

.inline-form-grid {
  min-width: 600px;
}

@media (max-width: 768px) {
  .inline-form-grid {
    min-width: 100%;
  }
}

/* Allow horizontal scroll on tables */
.table-wrapper,
.inline-form,
.inline-details-content {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* Ensure containers can scroll horizontally */
.admin-container,
.inline-form-container,
.inline-details-container {
  max-width: 100%;
  overflow-x: auto;
}

/* Fix for zoom - prevent content from being cut off */
@media screen and (max-width: 1400px) {
  .admin-container {
    padding: 1rem;
    overflow-x: auto;
  }
  
  .inline-form-grid {
    grid-template-columns: 1fr;
    min-width: auto;
  }
}

/* Ensure body can scroll horizontally when needed */
body {
  overflow-x: auto;
  min-width: 320px;
}

/* Table responsive fixes */
.table {
  min-width: 800px;
}

@media (max-width: 768px) {
  .table {
    min-width: 700px;
  }
}

/* Cards grid responsive */
.cards-grid {
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

/* Forms - prevent overflow */
.inline-section {
  overflow-x: auto;
}

.inline-grid-2 {
  min-width: 280px;
}

@media (max-width: 640px) {
  .inline-grid-2 {
    grid-template-columns: 1fr;
    min-width: auto;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    overflow-x: auto;
  }
  
  .action-buttons {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
  
  .modal {
    max-width: 95%;
    margin: 0 auto;
  }
}

/* Fix for zoom levels 150%+ */
@media screen and (min-resolution: 120dpi) {
  .admin-container,
  .inline-form-container,
  .inline-details-container {
    padding: 0.75rem;
  }
  
  .inline-form {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
  
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

/* Ensure all containers respect viewport */
* {
  max-width: 100%;
  box-sizing: border-box;
}
      `}</style>
    </>
  );
}