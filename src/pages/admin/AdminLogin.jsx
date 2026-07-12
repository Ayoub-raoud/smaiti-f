import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loginUtilisateur, selectIsAuthenticated, selectAuthLoading, selectAuthError, clearAuthError } from "../../Redux/store";
import { Lock, X, Mail } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function AdminLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetFullname, setResetFullname] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError("");
    
    if (!fullname || !password) {
      setLocalError("Veuillez remplir tous les champs");
      return;
    }
    
    const result = await dispatch(loginUtilisateur({ Fullname: fullname, password }));
    if (result.error) {
      const errorMsg = result.payload || "Identifiants incorrects";
      setLocalError(errorMsg);
      toast.error(errorMsg);
    } else {
      toast.success("Connexion réussie !");
      navigate("/dashboard");
    }
  };

  const handleForgotPassword = async () => {
    if (!resetFullname.trim()) {
      toast.error("Veuillez saisir votre nom d'utilisateur.");
      return;
    }
    setResetLoading(true);
    try {
      await axios.post('/api/forgot-password', { Fullname: resetFullname.trim() });
      toast.success('Demande envoyée. Un administrateur vous contactera.');
      setResetModalOpen(false);
      setResetFullname("");
    } catch (error) {
      const msg = error.response?.data?.message || 'Erreur. Vérifiez votre nom d\'utilisateur.';
      toast.error(msg);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  return (
    <>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          background-image: url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          padding: 1.5rem;
        }

        .login-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.9) 100%);
          backdrop-filter: blur(5px);
        }

        .login-card {
          position: relative;
          width: 100%;
          max-width: 28rem;
          background-color: #ffffff;
          border-radius: 1.5rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
          padding: 2.5rem;
          animation: slideUp 0.5s ease-out;
          z-index: 1;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .icon-box {
          height: 3.5rem;
          width: 3.5rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, #eab308 0%, #0f172a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .lock-icon {
          height: 1.5rem;
          width: 1.5rem;
          color: #ffffff;
        }

        .login-title {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 1.875rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1f2937;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .form-input {
          width: 100%;
          height: 3rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background-color: #ffffff;
          padding: 0 1rem;
          font-size: 0.875rem;
          transition: all 0.3s ease;
          font-family: inherit;
        }

        .form-input:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
        }

        .form-input:hover {
          border-color: #d1d5db;
        }

        .error-message {
          padding: 0.75rem;
          border-radius: 0.75rem;
          background-color: #fef2f2;
          color: #dc2626;
          font-size: 0.875rem;
          text-align: center;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        .login-button {
          width: 100%;
          height: 3rem;
          border-radius: 9999px;
          background: linear-gradient(135deg, #eab308 0%, #0f172a 100%);
          color: #ffffff;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .login-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
          box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.2);
        }

        .login-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .login-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .forgot-password-link {
          margin-top: 1rem;
          text-align: center;
        }
        .forgot-password-link button {
          background: none;
          border: none;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          text-decoration: underline;
          transition: color 0.2s;
        }
        .forgot-password-link button:hover {
          color: #eab308;
        }

        /* ---------- Reset Modal Overlay ---------- */
        .reset-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        .reset-modal {
          background: white;
          border-radius: 1.5rem;
          max-width: 420px;
          width: 100%;
          padding: 2rem;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          animation: slideUp 0.3s ease;
          position: relative;
        }

        .reset-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .reset-modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .reset-modal-close {
          background: #f1f5f9;
          border: none;
          border-radius: 50%;
          width: 2.25rem;
          height: 2.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .reset-modal-close:hover {
          background: #e2e8f0;
        }

        .reset-modal-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .reset-modal-body p {
          font-size: 0.9rem;
          color: #64748b;
          margin: 0;
        }

        .reset-modal-input {
          width: 100%;
          height: 3rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          padding: 0 1rem;
          font-size: 0.9rem;
          transition: border 0.2s;
        }
        .reset-modal-input:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234,179,8,0.1);
        }

        .reset-modal-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .reset-modal-btn {
          flex: 1;
          height: 2.75rem;
          border-radius: 0.75rem;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .reset-modal-btn-cancel {
          background: #f1f5f9;
          color: #1e293b;
        }
        .reset-modal-btn-cancel:hover {
          background: #e2e8f0;
        }
        .reset-modal-btn-submit {
          background: linear-gradient(135deg, #eab308, #f59e0b);
          color: white;
        }
        .reset-modal-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(234,179,8,0.3);
        }
        .reset-modal-btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Dark mode for modal */
        @media (prefers-color-scheme: dark) {
          .reset-modal {
            background: #1e293b;
          }
          .reset-modal-title {
            color: #f1f5f9;
          }
          .reset-modal-body p {
            color: #94a3b8;
          }
          .reset-modal-input {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .reset-modal-input:focus {
            border-color: #eab308;
          }
          .reset-modal-close {
            background: #334155;
          }
          .reset-modal-close:hover {
            background: #475569;
          }
          .reset-modal-btn-cancel {
            background: #334155;
            color: #e2e8f0;
          }
          .reset-modal-btn-cancel:hover {
            background: #475569;
          }
          .reset-modal-btn-submit {
            background: linear-gradient(135deg, #f59e0b, #d97706);
          }
        }

        .demo-credentials {
          margin-top: 1.5rem;
          padding: 1rem;
          border-radius: 0.75rem;
          background-color: #f3f4f6;
          font-size: 0.75rem;
          color: #6b7280;
          text-align: center;
          line-height: 1.5;
        }

        .demo-credentials strong {
          display: block;
          margin-bottom: 0.25rem;
          color: #374151;
          font-weight: 600;
        }

        /* Dark mode support for demo */
        @media (prefers-color-scheme: dark) {
          .demo-credentials {
            background-color: #334155;
            color: #9ca3af;
          }
          .demo-credentials strong {
            color: #e2e8f0;
          }
        }

        @media (max-width: 640px) {
          .login-card {
            padding: 1.5rem;
            margin: 1rem;
          }
          .login-title {
            font-size: 1.5rem;
          }
          .icon-box {
            height: 3rem;
            width: 3rem;
          }
          .lock-icon {
            height: 1.25rem;
            width: 1.25rem;
          }
          .reset-modal {
            margin: 1rem;
            padding: 1.5rem;
          }
        }
      `}</style>
      
      <div className="login-page">
        <div className="login-overlay"></div>
        <div className="login-card">
          <div className="icon-box">
            <Lock className="lock-icon" />
          </div>
          <h1 className="login-title">Administration</h1>
          <p className="login-subtitle">Connectez-vous à votre espace</p>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label className="form-label">Nom d'utilisateur</label>
              <input 
                type="text" 
                required 
                value={fullname} 
                onChange={(e) => setFullname(e.target.value)} 
                className="form-input" 
                placeholder="admin" 
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Mot de passe</label>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="form-input" 
                placeholder="••••••••" 
              />
            </div>
            
            {(localError || authError) && (
              <div className="error-message">
                {localError || authError}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading} 
              className="login-button"
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="forgot-password-link">
            <button type="button" onClick={() => setResetModalOpen(true)}>
              Mot de passe oublié ?
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Reset Password Modal ---------- */}
      {resetModalOpen && (
        <div className="reset-modal-overlay" onClick={() => setResetModalOpen(false)}>
          <div className="reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-header">
              <div className="reset-modal-title">
                <Mail size={20} />
                Réinitialisation
              </div>
              <button className="reset-modal-close" onClick={() => setResetModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="reset-modal-body">
              <p>
                Entrez votre nom d'utilisateur. Un administrateur recevra votre demande
                et pourra réinitialiser votre mot de passe.
              </p>
              <input
                type="text"
                className="reset-modal-input"
                placeholder="Nom d'utilisateur"
                value={resetFullname}
                onChange={(e) => setResetFullname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleForgotPassword();
                }}
                autoFocus
              />
              <div className="reset-modal-actions">
                <button
                  className="reset-modal-btn reset-modal-btn-cancel"
                  onClick={() => setResetModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  className="reset-modal-btn reset-modal-btn-submit"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}