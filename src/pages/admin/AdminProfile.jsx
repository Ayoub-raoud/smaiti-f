// src/pages/admin/AdminProfile.jsx
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectUser, updateProfile } from '../../Redux/store';
import { toast } from 'sonner';
import { 
    User, 
    Lock, 
    Key, 
    Save, 
    UserCircle, 
    Shield, 
    Calendar, 
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';

export default function AdminProfile() {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    const [fullname, setFullname] = useState(user?.Fullname || '');
    const [role, setRole] = useState(user?.role || '');
    const [createdAt, setCreatedAt] = useState(user?.created_at || '');

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password && password !== passwordConfirmation) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }
        if (password && password.length < 6) {
            toast.error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }
        const data = { Fullname: fullname };
        if (password) {
            data.password = password;
            data.password_confirmation = passwordConfirmation;
        }
        setLoading(true);
        try {
            await dispatch(updateProfile(data)).unwrap();
            toast.success('Profil mis à jour avec succès');
            setPassword('');
            setPasswordConfirmation('');
        } catch (err) {
            toast.error(err || 'Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    // Role label mapping
    const getRoleLabel = (role) => {
        switch (role) {
            case 'superadmin': return 'Super Admin';
            case 'admin': return 'Administrateur';
            case 'employee': return 'Employé';
            default: return role || 'Utilisateur';
        }
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'superadmin': return { background: '#fef3c7', color: '#92400e' };
            case 'admin': return { background: '#f3e8ff', color: '#6b21a5' };
            case 'employee': return { background: '#dbeafe', color: '#1e40af' };
            default: return { background: '#e2e8f0', color: '#475569' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="profile-page-container">
            {/* Header with gradient */}
            <div className="profile-header">
                <div className="profile-header-content">
                    <div className="profile-avatar">
                        <UserCircle size={48} />
                    </div>
                    <div className="profile-header-text">
                        <h1 className="profile-title">Mon Profil</h1>
                        <p className="profile-subtitle">Gérez vos informations personnelles et votre mot de passe</p>
                    </div>
                </div>
            </div>

            {/* Main Card */}
            <div className="profile-card">
                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Personal Information Section */}
                    <div className="profile-section">
                        <div className="profile-section-header">
                            <User size={18} className="section-icon" />
                            <h3>Informations personnelles</h3>
                        </div>
                        <div className="profile-grid-2">
                            <div className="form-group">
                                <label>
                                    <User size={14} className="label-icon" />
                                    Nom complet
                                </label>
                                <input
                                    type="text"
                                    value={fullname}
                                    onChange={(e) => setFullname(e.target.value)}
                                    className="form-input"
                                    required
                                    placeholder="Votre nom complet"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <Shield size={14} className="label-icon" />
                                    Rôle
                                </label>
                                <div className="role-badge" style={getRoleBadgeStyle(role)}>
                                    {getRoleLabel(role)}
                                </div>
                            </div>
                            <div className="form-group">
                                <label>
                                    <Calendar size={14} className="label-icon" />
                                    Date de création
                                </label>
                                <div className="info-value">{formatDate(createdAt)}</div>
                            </div>
                        </div>
                    </div>

                    <hr className="profile-divider" />

                    {/* Password Change Section */}
                    <div className="profile-section">
                        <div className="profile-section-header">
                            <Lock size={18} className="section-icon" />
                            <h3>Changer le mot de passe</h3>
                        </div>
                        <p className="section-description">
                            Laissez les champs vides pour conserver votre mot de passe actuel.
                        </p>
                        <div className="profile-grid-2">
                            <div className="form-group">
                                <label>
                                    <Key size={14} className="label-icon" />
                                    Nouveau mot de passe
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="form-input"
                                        placeholder="Nouveau mot de passe"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>
                                    <CheckCircle size={14} className="label-icon" />
                                    Confirmer le mot de passe
                                </label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={passwordConfirmation}
                                        onChange={(e) => setPasswordConfirmation(e.target.value)}
                                        className="form-input"
                                        placeholder="Confirmez le mot de passe"
                                        disabled={!password}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password && passwordConfirmation && password !== passwordConfirmation && (
                                    <div className="field-error">
                                        <AlertCircle size={14} />
                                        <span>Les mots de passe ne correspondent pas</span>
                                    </div>
                                )}
                                {password && password.length > 0 && password.length < 6 && (
                                    <div className="field-error">
                                        <AlertCircle size={14} />
                                        <span>Le mot de passe doit contenir au moins 6 caractères</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="profile-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="loading-spinner"></span>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Enregistrer les modifications
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Inline Styles – same as before (no email references) */}
            <style>{`
                .profile-page-container {
                    max-width: 820px;
                    margin: 0 auto;
                    padding: 0.5rem;
                }

                /* Header */
                .profile-header {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 24px;
                    padding: 2rem 2rem;
                    margin-bottom: 2rem;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    border: 1px solid #334155;
                }
                .profile-header-content {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .profile-avatar {
                    width: 64px;
                    height: 64px;
                    background: #eab308;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #1a1a2e;
                }
                .profile-avatar svg {
                    width: 36px;
                    height: 36px;
                }
                .profile-title {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: #eab308;
                    margin: 0;
                }
                .profile-subtitle {
                    color: rgba(255,255,255,0.7);
                    font-size: 0.95rem;
                    margin: 0.25rem 0 0 0;
                }

                /* Card */
                .profile-card {
                    background: white;
                    border-radius: 24px;
                    padding: 2rem;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                }
                .profile-form {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                /* Sections */
                .profile-section {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .profile-section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 2px solid #eab308;
                }
                .profile-section-header h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1e293b;
                    margin: 0;
                }
                .section-icon {
                    color: #eab308;
                }
                .section-description {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin-top: -0.5rem;
                }

                .profile-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .form-group label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: #475569;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .label-icon {
                    color: #94a3b8;
                }
                .form-input {
                    width: 100%;
                    padding: 0.7rem 1rem;
                    border: 1.5px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                    background: white;
                    color: #1e293b;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #eab308;
                    box-shadow: 0 0 0 3px rgba(234,179,8,0.15);
                }
                .field-error {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.75rem;
                    color: #dc2626;
                    margin-top: 0.2rem;
                }

                .role-badge {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.3rem 1rem;
                    border-radius: 9999px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    width: fit-content;
                }
                .info-value {
                    font-size: 0.95rem;
                    font-weight: 500;
                    color: #1e293b;
                    padding: 0.4rem 0;
                }

                .password-input-wrapper {
                    position: relative;
                }
                .password-input-wrapper .form-input {
                    padding-right: 2.8rem;
                }
                .password-toggle {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 0.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 0.5rem;
                    transition: all 0.2s;
                }
                .password-toggle:hover {
                    color: #475569;
                    background: #f1f5f9;
                }

                .profile-divider {
                    border: none;
                    border-top: 1px solid #e2e8f0;
                }

                .profile-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 0.5rem;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.75rem 2rem;
                    border-radius: 40px;
                    border: none;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .btn-primary {
                    background: linear-gradient(135deg, #0f172a, #1e293b);
                    color: #eab308;
                }
                .btn-primary:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(15,23,42,0.3);
                    color: #fbbf24;
                }
                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-lg {
                    padding: 0.9rem 2.5rem;
                    font-size: 1rem;
                }
                .loading-spinner {
                    display: inline-block;
                    width: 20px;
                    height: 20px;
                    border: 2px solid rgba(234,179,8,0.3);
                    border-top-color: #eab308;
                    border-radius: 50%;
                    animation: spin 0.6s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .profile-header {
                        padding: 1.5rem 1.25rem;
                    }
                    .profile-header-content {
                        flex-direction: column;
                        text-align: center;
                    }
                    .profile-title {
                        font-size: 1.5rem;
                    }
                    .profile-card {
                        padding: 1.5rem;
                    }
                    .profile-grid-2 {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .profile-actions {
                        justify-content: center;
                    }
                }

                /* Dark mode override */
                @media (prefers-color-scheme: dark) {
                    .profile-card {
                        background: #1e293b;
                        border-color: #334155;
                    }
                    .profile-section-header h3 {
                        color: #f1f5f9;
                    }
                    .form-input {
                        background: #0f172a;
                        border-color: #334155;
                        color: #f1f5f9;
                    }
                    .form-input:focus {
                        border-color: #eab308;
                        box-shadow: 0 0 0 3px rgba(234,179,8,0.2);
                    }
                    .form-group label {
                        color: #94a3b8;
                    }
                    .info-value {
                        color: #f1f5f9;
                    }
                    .field-error {
                        color: #fca5a5;
                    }
                    .password-toggle:hover {
                        background: #1e293b;
                        color: #cbd5e1;
                    }
                    .profile-divider {
                        border-color: #334155;
                    }
                    .section-description {
                        color: #94a3b8;
                    }
                    .btn-primary {
                        background: linear-gradient(135deg, #1e293b, #334155);
                    }
                    .btn-primary:hover:not(:disabled) {
                        box-shadow: 0 8px 25px rgba(0,0,0,0.5);
                    }
                }
            `}</style>
        </div>
    );
}