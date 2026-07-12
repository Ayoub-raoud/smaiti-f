// src/pages/admin/AdminUsers.jsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchUtilisateurs,
    updateUtilisateurStatus,
    deleteUtilisateur,
    selectUtilisateurs,
    createUtilisateur,
    updateUtilisateur,
    selectUser,
} from "../../Redux/store";
import {
    fetchPages,
    fetchUserPermissions,
    assignPermission,
    revokePermission,
} from "../../Redux/permissionSlice";
import { toast } from "sonner";
import {
    Trash2,
    CheckCircle,
    XCircle,
    User,
    RefreshCw,
    Search,
    Shield,
    ShieldCheck,
    Plus,
    Edit2,
    X,
    TrashIcon,
    AlertTriangle,
    Users,
    Key,
    Lock,
    Unlock,
    UserCheck,
    UserX,
    ChevronLeft,
    ChevronRight,
    Download,
    Crown,
    Briefcase,
    Activity,
    Sparkles,
    Star,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Bell,
} from "lucide-react";

// ----- Enhanced countdown with seconds & progress bar -----
const RemainingTime = ({ expiresAt }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [percentage, setPercentage] = useState(100);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) {
            setTimeLeft('Permanent');
            setPercentage(100);
            setIsExpired(false);
            return;
        }

        let interval;
        const updateTimer = () => {
            const now = new Date();
            const expiry = new Date(expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                setTimeLeft('Expiré');
                setPercentage(0);
                setIsExpired(true);
                return;
            }

            setIsExpired(false);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (86400000)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (3600000)) / (1000 * 60));
            const seconds = Math.floor((diff % (60000)) / 1000);

            let formatted = '';
            if (days > 0) {
                formatted = `${days}j ${hours}h ${minutes}m ${seconds}s`;
            } else if (hours > 0) {
                formatted = `${hours}h ${minutes}m ${seconds}s`;
            } else {
                formatted = `${minutes}m ${seconds}s`;
            }
            setTimeLeft(formatted);

            const createdAt = new Date(expiry.getTime() - (1000 * 60 * 60 * 24 * 30));
            const total = expiry - createdAt;
            const remaining = diff;
            let percent = (remaining / total) * 100;
            percent = Math.min(100, Math.max(0, percent));
            setPercentage(percent);
        };

        updateTimer();
        interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [expiresAt]);

    if (!expiresAt) {
        return <span className="permanent-badge">Permanente</span>;
    }

    return (
        <div className="countdown-container">
            <div className="countdown-time">{timeLeft}</div>
            <div className="progress-bar-container">
                <div
                    className={`progress-bar-fill ${isExpired ? 'expired' : ''}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isExpired && <span className="expired-badge">Expiré</span>}
        </div>
    );
};

export default function AdminUsers() {
    const dispatch = useDispatch();
    const users = useSelector(selectUtilisateurs);
    const pages = useSelector((state) => state.permissions.pages);
    const currentUser = useSelector(selectUser);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [resetFilter, setResetFilter] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [permissionModalOpen, setPermissionModalOpen] = useState(false);
    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
    const [selectedPage, setSelectedPage] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [userPermissionsList, setUserPermissionsList] = useState([]);
    const [refreshingPermissions, setRefreshingPermissions] = useState(false);

    // Sorting state
    const [sortField, setSortField] = useState("id");
    const [sortDirection, setSortDirection] = useState("desc");

    const itemsPerPage = 10;

    // Form state
    const [formData, setFormData] = useState({
        Fullname: "",
        role: "employee",
        status: "active",
        password: "",
        password_confirmation: "",
    });

    // Load users on mount
    useEffect(() => {
        const load = async () => {
            await dispatch(fetchUtilisateurs());
            setLoading(false);
        };
        load();
    }, [dispatch]);

    // Load pages and user permissions when permission modal opens
    useEffect(() => {
        if (permissionModalOpen && selectedUserForPermissions) {
            dispatch(fetchPages());
            refreshUserPermissions();
        }
    }, [permissionModalOpen, selectedUserForPermissions, dispatch]);

    const refreshUserPermissions = async () => {
        setRefreshingPermissions(true);
        const res = await dispatch(fetchUserPermissions(selectedUserForPermissions.id));
        setUserPermissionsList(res.payload.permissions);
        setRefreshingPermissions(false);
    };

    const toggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        const result = await dispatch(
            updateUtilisateurStatus({ utilisateurId: userId, status: newStatus })
        );
        if (result.error) {
            toast.error(result.payload);
        } else {
            toast.success(`Utilisateur ${newStatus === "active" ? "activé" : "désactivé"} avec succès`);
            await dispatch(fetchUtilisateurs(true));
        }
    };

    const handleDeleteClick = (user) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        const result = await dispatch(deleteUtilisateur(userToDelete.id));
        if (result.error) {
            toast.error(result.payload);
        } else {
            toast.success("Utilisateur supprimé avec succès");
            await dispatch(fetchUtilisateurs(true));
        }
        setDeleteModalOpen(false);
        setUserToDelete(null);
    };

    const handleCreateUser = async (data) => {
        setSubmitting(true);
        try {
            const payload = {
                Fullname: data.Fullname,
                password: data.password,
                role: data.role,
                status: data.status,
            };
            await dispatch(createUtilisateur(payload)).unwrap();
            toast.success("Utilisateur créé avec succès!");
            setShowUserForm(false);
            setEditingUser(null);
            await dispatch(fetchUtilisateurs(true));
            resetForm();
        } catch (error) {
            toast.error(error.message || "Erreur lors de la création");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateUser = async (data) => {
        setSubmitting(true);
        try {
            const payload = {
                Fullname: data.Fullname,
                role: data.role,
                status: data.status,
            };
            // Only include password if it is filled
            if (data.password && data.password.trim() !== '') {
                payload.password = data.password;
            }
            await dispatch(updateUtilisateur({ id: editingUser.id, data: payload })).unwrap();
            toast.success("Utilisateur modifié avec succès!");
            setShowUserForm(false);
            setEditingUser(null);
            await dispatch(fetchUtilisateurs(true));
            resetForm();
        } catch (error) {
            toast.error(error.message || "Erreur lors de la modification");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            Fullname: user.Fullname || user.full_name || "",
            role: user.role || "employee",
            status: user.status || "active",
            password: "",
            password_confirmation: "",
        });
        setShowUserForm(true);
    };

    const handleAddNew = () => {
        setEditingUser(null);
        resetForm();
        setShowUserForm(true);
    };

    const resetForm = () => {
        setFormData({
            Fullname: "",
            role: "employee",
            status: "active",
            password: "",
            password_confirmation: "",
        });
    };

    const refreshData = async () => {
        await dispatch(fetchUtilisateurs(true));
        toast.success("Données actualisées");
    };

    const handleExport = () => {
        const headers = ["ID", "Nom complet", "Rôle", "Statut"];
        const csvData = filteredUsers.map((u) => [
            u.id,
            `"${u.Fullname || u.full_name || ""}"`,
            u.role === "superadmin" ? "Super Admin" : u.role === "admin" ? "Administrateur" : "Employé",
            u.status === "active" ? "Actif" : "Inactif",
        ].join(","));
        const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Export CSV effectué");
    };

    const handleAssignPermission = async () => {
        if (!selectedPage) {
            toast.error("Veuillez sélectionner une page.");
            return;
        }
        const duration = durationMinutes ? parseInt(durationMinutes) : null;
        await dispatch(
            assignPermission({
                userId: selectedUserForPermissions.id,
                pageSlug: selectedPage,
                durationMinutes: duration,
            })
        );
        toast.success("Permission attribuée.");
        await refreshUserPermissions();
        setSelectedPage("");
        setDurationMinutes("");
    };

    const handleRevokePermission = async (pageSlug) => {
        await dispatch(revokePermission({ userId: selectedUserForPermissions.id, pageSlug }));
        toast.success("Permission révoquée.");
        setUserPermissionsList((prev) => prev.filter((p) => p.page_slug !== pageSlug));
    };

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
        return sortDirection === "asc" ? <ArrowUp size={12} className="sort-icon active" /> : <ArrowDown size={12} className="sort-icon active" />;
    };

    // Filter and sort users
    const filteredUsers = users
        .filter((u) => {
            const fullName = (u.Fullname || u.full_name || "").toLowerCase();
            const matchesSearch =
                searchTerm === "" ||
                fullName.includes(searchTerm.toLowerCase());
            const matchesRole = roleFilter === "all" || u.role === roleFilter;
            const matchesStatus = statusFilter === "all" || u.status === statusFilter;
            const matchesReset = resetFilter === "all" || (resetFilter === "pending" && u.remember_token === 'reset_requested');
            return matchesSearch && matchesRole && matchesStatus && matchesReset;
        })
        .sort((a, b) => {
            let aVal, bVal;
            switch (sortField) {
                case "id":
                    aVal = a.id;
                    bVal = b.id;
                    break;
                case "name":
                    aVal = (a.Fullname || a.full_name || "").toLowerCase();
                    bVal = (b.Fullname || b.full_name || "").toLowerCase();
                    break;
                case "role":
                    aVal = a.role || "";
                    bVal = b.role || "";
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

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginated = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Count pending reset requests
    const pendingResetCount = users.filter(u => u.remember_token === 'reset_requested').length;

    const stats = {
        total: users.length,
        active: users.filter((u) => u.status === "active").length,
        inactive: users.filter((u) => u.status === "inactive").length,
        admins: users.filter((u) => u.role === "admin" || u.role === "superadmin").length,
        employees: users.filter((u) => u.role === "employee").length,
        superadmins: users.filter((u) => u.role === "superadmin").length,
    };

    const getStatusBadge = (status) => {
        if (status === "active") {
            return (
                <span className="badge badge-success">
                    <CheckCircle size={12} className="badge-icon" />
                    Actif
                </span>
            );
        }
        return (
            <span className="badge badge-danger">
                <XCircle size={12} className="badge-icon" />
                Inactif
            </span>
        );
    };

    const getRoleBadge = (role) => {
        if (role === "superadmin") {
            return (
                <span className="badge badge-gold">
                    <Crown size={12} className="badge-icon" />
                    Super Admin
                </span>
            );
        }
        if (role === "admin") {
            return (
                <span className="badge badge-purple">
                    <Crown size={12} className="badge-icon" />
                    Administrateur
                </span>
            );
        }
        return (
            <span className="badge badge-blue">
                <Briefcase size={12} className="badge-icon" />
                Employé
            </span>
        );
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Chargement des utilisateurs...</p>
            </div>
        );
    }

    return (
        <>
            {/* ---------- User Form (full page) ---------- */}
            {showUserForm ? (
                <div className="inline-form-container">
                    <div className="inline-form-header">
                        <div className="inline-form-icon">
                            {editingUser ? <Sparkles size={28} /> : <Star size={28} />}
                        </div>
                        <div className="inline-form-title">
                            <h2>{editingUser ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
                            <p>{editingUser ? "Modifiez les informations de l'utilisateur" : "Créez un nouvel utilisateur en quelques clics"}</p>
                        </div>
                        <button
                            onClick={() => {
                                setShowUserForm(false);
                                setEditingUser(null);
                                resetForm();
                            }}
                            className="inline-form-close"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (editingUser) {
                                handleUpdateUser(formData);
                            } else {
                                handleCreateUser(formData);
                            }
                        }}
                        className="inline-form"
                    >
                        <div className="inline-form-grid">
                            {/* Left Column */}
                            <div className="inline-form-col">
                                <div className="inline-section">
                                    <div className="inline-section-header">
                                        <User size={18} />
                                        <h3>Informations personnelles</h3>
                                    </div>
                                    <div className="inline-grid-2">
                                        <div className="inline-field">
                                            <label>Nom complet *</label>
                                            <input
                                                type="text"
                                                className="inline-input"
                                                value={formData.Fullname}
                                                onChange={(e) => setFormData({ ...formData, Fullname: e.target.value })}
                                                required
                                                placeholder="Jean Dupont"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="inline-section">
                                    <div className="inline-section-header">
                                        <Shield size={18} />
                                        <h3>Rôle et permissions</h3>
                                    </div>
                                    <div className="inline-grid-2">
                                        <div className="inline-field">
                                            <label>Rôle</label>
                                            <select
                                                className="inline-select"
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="employee">Employé</option>
                                                <option value="admin">Administrateur</option>
                                                {currentUser?.role === 'superadmin' && (
                                                    <option value="superadmin">Super Admin</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="inline-field">
                                            <label>Statut</label>
                                            <select
                                                className="inline-select"
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="active">Actif</option>
                                                <option value="inactive">Inactif</option>
                                            </select>
                                        </div>
                                    </div>
                                    {formData.role === "superadmin" && (
                                        <div className="inline-info-message">
                                            <ShieldCheck size={16} />
                                            <span>L'utilisateur aura tous les droits et pourra gérer les permissions des autres.</span>
                                        </div>
                                    )}
                                    {formData.role === "admin" && (
                                        <div className="inline-info-message">
                                            <ShieldCheck size={16} />
                                            <span>L'utilisateur verra toutes les pages mais ne pourra pas attribuer de permissions.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="inline-form-col">
                                <div className="inline-section">
                                    <div className="inline-section-header">
                                        <Key size={18} />
                                        <h3>Sécurité</h3>
                                    </div>

                                    {editingUser ? (
                                        // ---------- EDIT MODE: always show password fields ----------
                                        <>
                                            <div className="inline-info-message">
                                                <Lock size={16} />
                                                <span>Laissez vide pour conserver le mot de passe actuel. Remplissez pour le modifier.</span>
                                            </div>
                                            <div className="inline-grid-2">
                                                <div className="inline-field">
                                                    <label>Nouveau mot de passe</label>
                                                    <input
                                                        type="password"
                                                        className="inline-input"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        placeholder="Nouveau mot de passe"
                                                    />
                                                </div>
                                                <div className="inline-field">
                                                    <label>Confirmer le mot de passe</label>
                                                    <input
                                                        type="password"
                                                        className="inline-input"
                                                        value={formData.password_confirmation}
                                                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                                        placeholder="Confirmer"
                                                    />
                                                </div>
                                            </div>
                                            {formData.password && formData.password_confirmation && formData.password !== formData.password_confirmation && (
                                                <div className="inline-error-message">
                                                    <AlertTriangle size={14} />
                                                    <span>Les mots de passe ne correspondent pas</span>
                                                </div>
                                            )}
                                            {editingUser.remember_token === 'reset_requested' && (
                                                <div className="inline-info-message" style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}>
                                                    <AlertTriangle size={16} />
                                                    <span>Cet utilisateur a demandé une réinitialisation de mot de passe. Veuillez entrer un nouveau mot de passe ci-dessus.</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // ---------- CREATE MODE: required password fields ----------
                                        <>
                                            <div className="inline-grid-2">
                                                <div className="inline-field">
                                                    <label>Mot de passe *</label>
                                                    <input
                                                        type="password"
                                                        className="inline-input"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        required
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="inline-field">
                                                    <label>Confirmer le mot de passe *</label>
                                                    <input
                                                        type="password"
                                                        className="inline-input"
                                                        value={formData.password_confirmation}
                                                        onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
                                                        required
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                            </div>
                                            {formData.password && formData.password_confirmation && formData.password !== formData.password_confirmation && (
                                                <div className="inline-error-message">
                                                    <AlertTriangle size={14} />
                                                    <span>Les mots de passe ne correspondent pas</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div className="inline-section">
                                    <div className="inline-section-header">
                                        <Activity size={18} />
                                        <h3>Informations système</h3>
                                    </div>
                                    <div className="inline-info-grid">
                                        <div className="inline-info-item">
                                            <span className="info-label">Date de création</span>
                                            <span className="info-value">
                                                {editingUser ? new Date(editingUser.created_at).toLocaleDateString("fr-FR") : "—"}
                                            </span>
                                        </div>
                                        <div className="inline-info-item">
                                            <span className="info-label">Dernière modification</span>
                                            <span className="info-value">
                                                {editingUser ? new Date(editingUser.updated_at).toLocaleDateString("fr-FR") : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="inline-form-footer">
                            <button
                                type="button"
                                className="inline-secondary-btn"
                                onClick={() => {
                                    setShowUserForm(false);
                                    setEditingUser(null);
                                    resetForm();
                                }}
                            >
                                Annuler
                            </button>
                            <button type="submit" className="inline-primary-btn" disabled={submitting}>
                                {submitting ? "Traitement..." : editingUser ? "Mettre à jour" : "Créer l'utilisateur"}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                // ---------- Main Users List ----------
                <div className="admin-container">
                    {/* ----- NOTIFICATION BANNER FOR PENDING RESETS ----- */}
                    {pendingResetCount > 0 && (
                        <div className="reset-banner">
                            <Bell size={20} />
                            <span>
                                <strong>{pendingResetCount}</strong> utilisateur(s) ont demandé une réinitialisation de mot de passe.
                                <button
                                    className="banner-filter-btn"
                                    onClick={() => setResetFilter('pending')}
                                >
                                    Voir les demandes
                                </button>
                                <button
                                    className="banner-dismiss-btn"
                                    onClick={() => setResetFilter('all')}
                                >
                                    Masquer
                                </button>
                            </span>
                        </div>
                    )}

                    <div className="header">
                        <div>
                            <h1 className="title">Gestion des Utilisateurs</h1>
                            <p className="subtitle">Gérez les accès à l'administration</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={refreshData} className="btn btn-secondary">
                                <RefreshCw size={16} /> Actualiser
                            </button>
                            <button onClick={handleExport} className="btn btn-secondary">
                                <Download size={16} /> Exporter
                            </button>
                            <button onClick={handleAddNew} className="btn btn-primary">
                                <Plus size={16} /> Nouvel Utilisateur
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Total</p>
                                <p className="stat-number">{stats.total}</p>
                            </div>
                            <Users size={32} className="stat-icon" />
                        </div>
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Actifs</p>
                                <p className="stat-number text-green">{stats.active}</p>
                            </div>
                            <UserCheck size={32} className="stat-icon text-green" />
                        </div>
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Inactifs</p>
                                <p className="stat-number text-red">{stats.inactive}</p>
                            </div>
                            <UserX size={32} className="stat-icon text-red" />
                        </div>
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Administrateurs</p>
                                <p className="stat-number text-purple">{stats.admins}</p>
                            </div>
                            <Crown size={32} className="stat-icon text-purple" />
                        </div>
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Super Admins</p>
                                <p className="stat-number text-gold">{stats.superadmins}</p>
                            </div>
                            <Star size={32} className="stat-icon text-gold" />
                        </div>
                        <div className="stat-card">
                            <div>
                                <p className="stat-label">Employés</p>
                                <p className="stat-number text-blue">{stats.employees}</p>
                            </div>
                            <Briefcase size={32} className="stat-icon text-blue" />
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="search-wrapper">
                        <div className="search-row">
                            <div className="search-container">
                                <Search size={16} className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Rechercher par nom..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="search-input"
                                />
                            </div>
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="filter-select"
                            >
                                <option value="all">Tous rôles</option>
                                <option value="superadmin">Super Admins</option>
                                <option value="admin">Administrateurs</option>
                                <option value="employee">Employés</option>
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="filter-select"
                            >
                                <option value="all">Tous statuts</option>
                                <option value="active">Actifs</option>
                                <option value="inactive">Inactifs</option>
                            </select>
                            <select
                                value={resetFilter}
                                onChange={(e) => {
                                    setResetFilter(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="filter-select"
                            >
                                <option value="all">Tous</option>
                                <option value="pending">Demandes de réinitialisation</option>
                            </select>
                        </div>
                    </div>

                    <div className="table-info">
                        <p className="table-info-text">{filteredUsers.length} utilisateur(s) trouvé(s)</p>
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
                                        <th onClick={() => handleSort("role")} className="sortable-header">
                                            Rôle {getSortIcon("role")}
                                        </th>
                                        <th onClick={() => handleSort("status")} className="sortable-header">
                                            Statut {getSortIcon("status")}
                                        </th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center py-12">
                                                Aucun utilisateur trouvé
                                            </td>
                                        </tr>
                                    ) : (
                                        paginated.map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-medium">#{u.id}</td>
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        <User size={14} />
                                                        {u.Fullname || u.full_name || "—"}
                                                        {u.remember_token === 'reset_requested' && (
                                                            <span className="badge badge-warning" title="Demande de réinitialisation en attente">
                                                                <RefreshCw size={12} /> Réinitialisation
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{getRoleBadge(u.role)}</td>
                                                <td>
                                                    {getStatusBadge(u.status)}
                                                </td>
                                                <td className="text-right">
                                                    <div className="action-buttons">
                                                        <button
                                                            onClick={() => handleEdit(u)}
                                                            className="action-btn action-btn-edit"
                                                            title="Modifier"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => toggleStatus(u.id, u.status)}
                                                            className="action-btn action-btn-primary"
                                                            title={u.status === "active" ? "Désactiver" : "Activer"}
                                                        >
                                                            {u.status === "active" ? <Lock size={16} /> : <Unlock size={16} />}
                                                        </button>
                                                        {currentUser?.role === 'superadmin' && (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedUserForPermissions(u);
                                                                    setPermissionModalOpen(true);
                                                                }}
                                                                className="action-btn action-btn-permission"
                                                                title="Gérer les permissions"
                                                            >
                                                                <Key size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteClick(u)}
                                                            className="action-btn action-btn-delete"
                                                            title="Supprimer"
                                                        >
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

                    {/* ---------- Delete Confirmation Modal ---------- */}
                    {deleteModalOpen && userToDelete && (
                        <div className="modal-overlay">
                            <div className="modal delete-modal">
                                <div className="delete-icon">
                                    <TrashIcon size={32} />
                                </div>
                                <h3 className="delete-title">Confirmer la suppression</h3>
                                <p className="delete-message">
                                    Êtes-vous sûr de vouloir supprimer l'utilisateur <br />
                                    <span className="user-name">{userToDelete.Fullname || userToDelete.full_name || "?"}</span> ?<br />
                                    Cette action est irréversible.
                                </p>
                                {userToDelete.role === "superadmin" && (
                                    <p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                                        ⚠️ Cet utilisateur est un Super Admin. La suppression affectera les droits d'accès.
                                    </p>
                                )}
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

                    {/* ---------- Permission Management Modal ---------- */}
                    {permissionModalOpen && selectedUserForPermissions && currentUser?.role === 'superadmin' && (
                        <div className="modal-overlay" onClick={() => setPermissionModalOpen(false)}>
                            <div className="modal permission-modal" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3 className="modal-title">
                                        Permissions pour {selectedUserForPermissions.Fullname || selectedUserForPermissions.full_name}
                                    </h3>
                                    <div className="modal-header-actions">
                                        <button
                                            onClick={refreshUserPermissions}
                                            className="refresh-permissions-btn"
                                            disabled={refreshingPermissions}
                                            title="Actualiser les permissions"
                                        >
                                            <RefreshCw size={16} className={refreshingPermissions ? "spin" : ""} />
                                        </button>
                                        <button onClick={() => setPermissionModalOpen(false)} className="modal-close">
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Ajouter une permission</label>
                                        <select
                                            value={selectedPage}
                                            onChange={(e) => setSelectedPage(e.target.value)}
                                            className="form-select"
                                        >
                                            <option value="">-- Choisir une page --</option>
                                            {Object.entries(pages).map(([slug, label]) => (
                                                <option key={slug} value={slug}>
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Durée (minutes) – laissez vide pour permanente</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={durationMinutes}
                                            onChange={(e) => setDurationMinutes(e.target.value)}
                                            className="form-input"
                                            placeholder="ex: 30"
                                        />
                                    </div>
                                    <button onClick={handleAssignPermission} className="btn btn-primary" style={{ marginTop: "0.5rem" }}>
                                        Attribuer
                                    </button>

                                    <hr style={{ margin: "1rem 0" }} />

                                    <h4>Permissions actuelles</h4>
                                    {userPermissionsList.length === 0 ? (
                                        <p className="text-muted">Aucune permission spéciale.</p>
                                    ) : (
                                        <ul className="permission-list">
                                            {userPermissionsList.map((perm) => (
                                                <li key={perm.page_slug} className="permission-item">
                                                    <div className="permission-info">
                                                        <strong>{pages[perm.page_slug] || perm.page_slug}</strong>
                                                        <div className="permission-expiry-timer">
                                                            <RemainingTime expiresAt={perm.expires_at} />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleRevokePermission(perm.page_slug)}
                                                        className="action-btn action-btn-delete"
                                                        title="Révoquer"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ===== Styles ===== */}
            <style>{`
                /* ---------- Reset banner ---------- */
                .reset-banner {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 12px;
                    padding: 12px 20px;
                    margin-bottom: 1.5rem;
                    color: #92400e;
                    font-size: 0.95rem;
                    box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
                }
                .reset-banner svg {
                    flex-shrink: 0;
                }
                .banner-filter-btn {
                    margin-left: 12px;
                    padding: 4px 12px;
                    background: #f59e0b;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: 0.2s;
                }
                .banner-filter-btn:hover {
                    background: #d97706;
                }
                .banner-dismiss-btn {
                    margin-left: 8px;
                    background: transparent;
                    border: none;
                    color: #92400e;
                    text-decoration: underline;
                    cursor: pointer;
                    font-size: 0.85rem;
                }
                .banner-dismiss-btn:hover {
                    color: #78350f;
                }
                @media (prefers-color-scheme: dark) {
                    .reset-banner {
                        background: #78350f;
                        border-color: #b45309;
                        color: #fde68a;
                    }
                    .banner-filter-btn {
                        background: #b45309;
                    }
                    .banner-filter-btn:hover {
                        background: #92400e;
                    }
                    .banner-dismiss-btn {
                        color: #fde68a;
                    }
                    .banner-dismiss-btn:hover {
                        color: #fbbf24;
                    }
                }

                /* ---------- Other styles (unchanged) ---------- */
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif;
                    background: #f8fafc;
                }

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
                .inline-error-message {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 12px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 0.75rem;
                    color: #dc2626;
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
                .text-purple { color: #8b5cf6; }
                .text-blue { color: #3b82f6; }
                .text-gold { color: #eab308; }

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
                    background: white;
                }
                .search-input:focus {
                    outline: none;
                    border-color: #0f172a;
                    box-shadow: 0 0 0 2px rgba(15,23,42,0.1);
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
                    min-width: 600px;
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

                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.25rem 0.625rem;
                    border-radius: 9999px;
                    font-size: 0.75rem;
                    font-weight: 500;
                }
                .badge-icon { width: 12px; height: 12px; }
                .badge-gold { background: #fef3c7; color: #92400e; }
                .badge-purple { background: #f3e8ff; color: #6b21a5; }
                .badge-blue { background: #dbeafe; color: #1e40af; }
                .badge-success { background: #dcfce7; color: #166534; }
                .badge-danger { background: #fee2e2; color: #991b1b; }
                .badge-warning { background: #fef3c7; color: #92400e; }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                    flex-wrap: wrap;
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
                .action-btn-primary { color: #eab308; }
                .action-btn-primary:hover { background: #fefce8; }
                .action-btn-edit { color: #10b981; }
                .action-btn-edit:hover { background: #ecfdf5; }
                .action-btn-delete { color: #ef4444; }
                .action-btn-delete:hover { background: #fef2f2; }
                .action-btn-permission { color: #8b5cf6; }
                .action-btn-permission:hover { background: #f5f3ff; }

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
                .modal {
                    background: white;
                    border-radius: 1.5rem;
                    max-width: 32rem;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: slideUp 0.3s ease;
                }
                .permission-modal { max-width: 500px; }
                .delete-modal { max-width: 28rem; }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem 1.5rem 0 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .modal-title {
                    font-size: 1.25rem;
                    font-weight: 700;
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
                .modal-body {
                    padding: 1.5rem;
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
                .user-name {
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

                .modal-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .refresh-permissions-btn {
                    background: #f1f5f9;
                    border: none;
                    border-radius: 0.5rem;
                    padding: 0.5rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }
                .refresh-permissions-btn:hover { background: #e2e8f0; }
                .refresh-permissions-btn:disabled { opacity: 0.5; cursor: not-allowed; }
                .spin { animation: spin 0.6s linear infinite; }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    margin-bottom: 1rem;
                }
                .form-group label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #0f172a;
                }
                .form-select, .form-input {
                    height: 2.75rem;
                    padding: 0 0.75rem;
                    border: 1px solid #e2e8f0;
                    border-radius: 0.75rem;
                    font-size: 0.875rem;
                    background: white;
                }
                .form-select:focus, .form-input:focus {
                    outline: none;
                    border-color: #0f172a;
                    box-shadow: 0 0 0 2px rgba(15,23,42,0.1);
                }

                .permission-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .permission-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 0;
                    border-bottom: 1px solid #e2e8f0;
                }
                .permission-item:last-child { border-bottom: none; }
                .permission-info { flex: 1; }
                .permission-info strong { display: block; margin-bottom: 0.25rem; }
                .permission-expiry-timer { margin-top: 0.5rem; }

                .countdown-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    max-width: 220px;
                }
                .countdown-time {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #eab308;
                    background: #fef3c7;
                    display: inline-block;
                    padding: 0.125rem 0.5rem;
                    border-radius: 1rem;
                    width: fit-content;
                    font-family: monospace;
                }
                .progress-bar-container {
                    background-color: #e2e8f0;
                    border-radius: 9999px;
                    height: 4px;
                    width: 100%;
                    overflow: hidden;
                }
                .progress-bar-fill {
                    background-color: #eab308;
                    height: 100%;
                    border-radius: 9999px;
                    transition: width 0.5s linear;
                }
                .progress-bar-fill.expired { background-color: #ef4444; }
                .permanent-badge {
                    background: #dcfce7;
                    color: #166534;
                    padding: 0.125rem 0.5rem;
                    border-radius: 1rem;
                    font-size: 0.7rem;
                    font-weight: 500;
                }
                .expired-badge {
                    font-size: 0.65rem;
                    color: #dc2626;
                    margin-left: 0.5rem;
                }
                .text-muted { color: #64748b; font-size: 0.875rem; }

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

                .flex { display: flex; }
                .items-center { align-items: center; }
                .gap-2 { gap: 0.5rem; }
                .gap-4 { gap: 1rem; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-medium { font-weight: 500; }
                .py-12 { padding: 3rem 0; }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 1024px) {
                    .inline-form-grid { grid-template-columns: 1fr; gap: 24px; }
                }
                @media (max-width: 768px) {
                    .admin-container { padding: 1rem; }
                    .header { flex-direction: column; align-items: flex-start; }
                    .search-row { flex-direction: column; }
                    .filter-select { width: 100%; }
                    .action-buttons { flex-wrap: wrap; }
                    .inline-grid-2 { grid-template-columns: 1fr; }
                    .inline-form-container { margin: 1rem; }
                    .inline-form-header { padding: 16px 20px; }
                    .inline-form-header h2 { font-size: 1.25rem; }
                    .inline-form { padding: 20px; }
                    .stats-grid { grid-template-columns: repeat(2, 1fr); }
                    .modal { max-width: 95%; margin: 0 auto; }
                    .table { min-width: 500px; }
                }

                @media (prefers-color-scheme: dark) {
                    body { background: #0f172a; }
                    .stat-card, .table-wrapper, .search-wrapper, .modal, .inline-form-container {
                        background: #1e293b;
                        border-color: #334155;
                    }
                    .stat-label, .table-info-text, .table th, .subtitle, .delete-message,
                    .inline-info-item .info-label, .text-muted {
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
                    .search-input, .filter-select, .inline-input, .inline-select, .form-input, .form-select {
                        background: #0f172a;
                        border-color: #334155;
                        color: #f1f5f9;
                    }
                    .inline-section {
                        background: #0f172a;
                        border-color: #334155;
                    }
                    .inline-section-header h3 { color: #f1f5f9; }
                    .inline-info-item .info-value { color: #f1f5f9; }
                    .inline-info-message {
                        background: #422006;
                        border-color: #713f12;
                        color: #fde047;
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
                    .badge-gold {
                        background: #78350f;
                        color: #fde68a;
                    }
                    .badge-purple {
                        background: #4c1d95;
                        color: #c084fc;
                    }
                    .badge-blue {
                        background: #1e3a5f;
                        color: #60a5fa;
                    }
                    .badge-success {
                        background: #14532d;
                        color: #4ade80;
                    }
                    .badge-danger {
                        background: #7f1d1d;
                        color: #fca5a5;
                    }
                    .badge-warning {
                        background: #78350f;
                        color: #fde68a;
                    }
                    .action-btn-primary:hover { background: #422006; }
                    .action-btn-edit:hover { background: #064e3b; }
                    .action-btn-delete:hover { background: #7f1d1d; }
                    .action-btn-permission:hover { background: #4c1d95; }
                    .table tr:hover { background: #334155; }
                    .delete-icon { background: #7f1d1d; }
                    .user-name {
                        background: #334155;
                        color: #f1f5f9;
                    }
                    .countdown-time {
                        background: #78350f;
                        color: #fde68a;
                    }
                    .progress-bar-container { background-color: #334155; }
                    .permanent-badge {
                        background: #14532d;
                        color: #4ade80;
                    }
                    .refresh-permissions-btn {
                        background: #334155;
                        color: #e2e8f0;
                    }
                    .refresh-permissions-btn:hover { background: #475569; }
                    .sortable-header:hover { background-color: #334155; }
                    .modal-btn-cancel {
                        background: #1e293b;
                        border-color: #475569;
                        color: #e2e8f0;
                    }
                    .modal-btn-cancel:hover { background: #334155; }
                    .form-group label { color: #e2e8f0; }
                }

                html, body {
                    overflow-x: auto !important;
                    min-width: 320px;
                }
                .admin-container, .inline-form-container {
                    overflow-x: auto !important;
                    min-width: 0;
                    width: 100%;
                }
                .inline-form, .inline-details-content {
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
                .table-wrapper, .inline-form {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                }
                .admin-container, .inline-form-container {
                    max-width: 100%;
                    overflow-x: auto;
                }
                @media screen and (max-width: 1400px) {
                    .admin-container { padding: 1rem; overflow-x: auto; }
                    .inline-form-grid { grid-template-columns: 1fr; min-width: auto; }
                }
                body { overflow-x: auto; min-width: 320px; }
                .table { min-width: 600px; }
                @media (max-width: 768px) { .table { min-width: 500px; } }
                .cards-grid { overflow-x: auto; padding-bottom: 0.5rem; }
                .inline-section { overflow-x: auto; }
                .inline-grid-2 { min-width: 280px; }
                @media (max-width: 640px) {
                    .inline-grid-2 { grid-template-columns: 1fr; min-width: auto; }
                    .stats-grid { grid-template-columns: repeat(2, 1fr); overflow-x: auto; }
                    .action-buttons { flex-wrap: wrap; justify-content: flex-start; }
                }
                @media screen and (min-resolution: 120dpi) {
                    .admin-container, .inline-form-container { padding: 0.75rem; }
                    .inline-form { padding: 1rem; }
                    .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
                    .cards-grid { grid-template-columns: 1fr; }
                }
                * {
                    max-width: 100%;
                    box-sizing: border-box;
                }
            `}</style>
        </>
    );
}