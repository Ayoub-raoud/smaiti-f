// src/pages/admin/AdminDashboard.jsx
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchCars, fetchReservations, fetchClients, fetchAccidents, fetchMatricules, fetchContacts, fetchUtilisateurs,
  selectCars, selectCarsLoading, selectReservations, selectReservationsLoading,
  selectClients, selectAccidents, selectMatricules, selectContacts, selectUtilisateurs, selectUser,
  createReservation, updateReservation, refreshMatricules,
  addPaymentToReservation,removePaymentFromReservation
} from "../../Redux/store";
import {
  Car, CalendarCheck, UserCircle, AlertTriangle, TrendingUp,
  CreditCard, Euro, Calendar, BarChart3, PieChartIcon, FileText,
  Printer, X, User, Phone, Mail, IdCard, MapPin, DollarSign,
  CalendarDays, Clock, Gauge, Shield, Info, Settings, Eye, EyeOff,
  Save, Plus, Trash2, CheckCircle, AlertCircle, Building2, Key,
  Users, Wrench, Gauge as GaugeIcon, MessageCircle, CheckSquare,
  Clock as ClockIcon, Ban, UserCheck, CarFront, CarTaxiFront,
  AlertOctagon, ClipboardList, PhoneCall, CheckCircle2, XCircle, RefreshCw,
  Search, History, Wallet, Briefcase, FileText as FileIcon, Bell, BellRing,
  ChevronRight, ChevronDown, Filter, Download, Calendar as CalendarIcon,
  Euro as EuroIcon, Fuel, Cog, MapPin as MapPinIcon, Phone as PhoneIcon,
  Mail as MailIcon, AlertTriangle as AlertIcon, CheckCircle as SuccessIcon,
  XCircle as ErrorIcon, Info as InfoIcon, Sparkles, Star, Activity, Upload,
  FolderOpen, Edit, Save as SaveIcon, Zap, Loader, ChevronLeft,
  ChevronUp, Link2
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import html2canvas from "html2canvas";

// Import images
import checklistImage from "../../assets/checklist.png";
import logoImage from "../../assets/logo.png";

// ==================== Helper Functions ====================
const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const formatMoney = (val) => `${Number(val || 0).toFixed(2)} DH`;
const API_URL = "https://smaiti-b-production.up.railway.app//api";

// ==================== Report Modal Components ====================
// ---------- Create Report Modal (with dropdown above) ----------
const MultiRowReportModal = ({ isOpen, onClose, onReportSaved }) => {
  const dispatch = useDispatch();
  const clients = useSelector(selectClients);
  const reservations = useSelector(selectReservations);

  const [rows, setRows] = useState([
    { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 },
  ]);
  const [generating, setGenerating] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState(1);
  const paperRef = useRef(null);
  const pdfPaperRef = useRef(null);

  // For client search dropdown (per row)
  const [searchTerms, setSearchTerms] = useState({});
  const [activeRowId, setActiveRowId] = useState(null);

  const getFilteredClients = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const lower = searchTerm.toLowerCase().trim();
    return clients.filter(c => {
      const fullName = `${c.prenom} ${c.nom}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.telephone || "").toLowerCase();
      return fullName.includes(lower) || email.includes(lower) || phone.includes(lower);
    }).slice(0, 10);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 },
    ]);
  };

  const createMultipleRows = () => {
    const num = parseInt(numberOfLines);
    if (isNaN(num) || num <= 0) {
      toast.warning("Entrez un nombre valide (1 ou plus)");
      return;
    }
    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        date: new Date().toISOString().slice(0, 10),
        client_id: "",
        client_name: "",
        price: 0,
      });
    }
    setRows(prev => [...prev, ...newRows]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
      setSearchTerms(prev => {
        const newTerms = { ...prev };
        delete newTerms[id];
        return newTerms;
      });
      if (activeRowId === id) setActiveRowId(null);
    }
  };

  const resetForm = () => {
    setRows([{ id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 }]);
    setNumberOfLines(1);
    setSearchTerms({});
    setActiveRowId(null);
  };

  const handleSelectClient = (rowId, client) => {
    updateRow(rowId, 'client_id', client.id);
    updateRow(rowId, 'client_name', `${client.prenom} ${client.nom}`);
    setSearchTerms(prev => ({ ...prev, [rowId]: `${client.prenom} ${client.nom}` }));
    setActiveRowId(null);
  };

  const generatePDF = async () => {
    // Resolve client_id from name if missing
    const updatedRows = rows.map(row => {
      if (!row.client_id && row.client_name) {
        const trimmed = row.client_name.trim();
        const found = clients.find(c => 
          `${c.prenom} ${c.nom}`.toLowerCase() === trimmed.toLowerCase()
        );
        if (found) {
          return { ...row, client_id: found.id };
        }
      }
      return row;
    });
    setRows(updatedRows);

    const validRows = updatedRows.filter((row) => row.client_id && parseFloat(row.price) > 0);
    if (validRows.length === 0) {
      toast.warning("Veuillez sélectionner un client existant (utilisez la recherche) et saisir un prix supérieur à 0.");
      return;
    }

    setGenerating(true);

    try {
      const paperElement = pdfPaperRef.current;
      if (!paperElement) {
        toast.error("Impossible de capturer le rapport");
        return;
      }

      const canvas = await html2canvas(paperElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
      } else {
        const verticalOffset = (pageHeight - imgHeight) / 2;
        doc.addImage(imgData, 'PNG', 0, verticalOffset, imgWidth, imgHeight);
      }

      const fileName = `Rapport_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
      const pdfBlob = doc.output('blob');
      const pdfBase64 = await blobToBase64(pdfBlob);

      const token = localStorage.getItem("authToken");
      const saveReportResponse = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_name: fileName,
          pdf_data: pdfBase64,
          rows: validRows.map(r => ({ date: r.date, client_name: r.client_name, client_id: r.client_id, price: r.price })),
          total_ht: validRows.reduce((sum, row) => sum + Number(row.price), 0),
        }),
      });

      if (!saveReportResponse.ok) {
        const err = await saveReportResponse.json();
        toast.error(err.message || "Erreur lors de la sauvegarde du rapport");
        return;
      }

      // Add payments
      let paymentErrors = 0;
      for (const row of validRows) {
        try {
          const clientReservations = reservations.filter(r => r.client_id === row.client_id);
          let targetReservation = clientReservations.find(r => r.status === 'confirmed' && r.remaining_amount > 0);
          if (!targetReservation) {
            targetReservation = clientReservations
              .filter(r => r.remaining_amount > 0)
              .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
          }
          if (targetReservation) {
            await dispatch(addPaymentToReservation({
              reservationId: targetReservation.id,
              paymentData: {
                amount: row.price,
                date: row.date,
                method: 'cash',
                notes: `Rapport manuel (${fileName})`
              }
            })).unwrap();
          } else {
            console.warn(`No eligible reservation found for client ${row.client_name} (ID: ${row.client_id})`);
            paymentErrors++;
          }
        } catch (err) {
          console.error(`Failed to add payment for client ${row.client_name}:`, err);
          paymentErrors++;
        }
      }

      if (paymentErrors > 0) {
        toast.warning(`Rapport sauvegardé, mais ${paymentErrors} paiement(s) n'ont pas pu être appliqués.`);
      } else {
        toast.success("Rapport sauvegardé et paiements enregistrés avec succès");
      }

      resetForm();
      onClose();
      if (onReportSaved) onReportSaved();

    } catch (err) {
      console.error("Error generating PDF:", err);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const firstClientName = rows.find(r => r.client_id)?.client_name || "";

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h2 className="report-modal-title">
            <FileText size={20} /> Rapport manuel
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="report-modal-body">
          <div className="report-controls">
            <span>📝 Nombre de lignes :</span>
            <input
              type="number"
              min="1"
              max="50"
              value={numberOfLines}
              onChange={(e) => setNumberOfLines(e.target.value)}
            />
            <button onClick={createMultipleRows} className="btn btn-primary">
              <Zap size={14} /> Créer {numberOfLines} ligne{parseInt(numberOfLines) > 1 ? "s" : ""}
            </button>
            <button onClick={addRow} className="btn btn-outline">
              <Plus size={14} /> Ajouter 1 ligne
            </button>
            <span className="report-line-count">📋 {rows.length} ligne(s)</span>
          </div>

          <div className="report-paper" ref={paperRef}>
            <div className="contract-header-table" style={{ width: "100%", borderBottom: "2px solid #d4af37", paddingBottom: "8px", marginBottom: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "30%", verticalAlign: "top" }}>
                      <div className="company-name" style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1e293b" }}>OULFA DRIVE</div>
                      <div className="company-slogan" style={{ fontSize: "10px", fontWeight: 600, marginTop: "4px", color: "#b8860b" }}>LOCATION DE VOITURE</div>
                      <div className="company-phone" style={{ fontSize: "9px", marginTop: "6px", color: "#475569" }}>📞 0665 921 921</div>
                    </td>
                    <td style={{ width: "40%", textAlign: "center", verticalAlign: "middle" }}>
                      <img src={logoImage} alt="Logo" style={{ height: "70px", width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} />
                    </td>
                    <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                      <div className="contract-number-box" style={{ border: "1px solid #e2e8f0", padding: "6px 14px", textAlign: "center", fontSize: "10px", display: "inline-block", background: "#fefce857", borderRadius: "10px" }}>
                        <div className="contract-number-label" style={{ fontSize: "9px", color: "#92400e", letterSpacing: "1.5px" }}>RAPPORT</div>
                        <div className="contract-number-value" style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                          {firstClientName ? `${new Date().getFullYear()}-${firstClientName.slice(0, 4)}` : `${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`}
                        </div>
                      </div>
                      <div className="arabic-text" style={{ marginTop: "8px", fontSize: "12px", fontWeight: 500, color: "#475569" }}>تقرير</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="contract-title-print" style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", color: "#0f172a" }}>
              RAPPORT MANUEL
            </div>

            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Date</th>
                    <th style={{ width: "45%" }}>Client</th>
                    <th style={{ width: "25%" }}>Prix HT (MAD)</th>
                    <th style={{ width: "10%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const searchTerm = searchTerms[row.id] || "";
                    const filteredClients = getFilteredClients(searchTerm);
                    const isActive = activeRowId === row.id;

                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="date"
                            className="report-input"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, "date", e.target.value)}
                          />
                        </td>
                        <td style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="report-input"
                            value={row.client_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(row.id, "client_name", val);
                              setSearchTerms(prev => ({ ...prev, [row.id]: val }));
                              if (val === "") {
                                updateRow(row.id, "client_id", "");
                              }
                              setActiveRowId(row.id);
                            }}
                            onFocus={() => setActiveRowId(row.id)}
                            placeholder="Rechercher un client..."
                            autoComplete="off"
                          />
                          {isActive && searchTerm.length >= 1 && (
                            <div className="client-dropdown" style={{
                              position: "absolute",
                              bottom: "100%",
                              left: 0,
                              right: 0,
                              background: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              maxHeight: "200px",
                              overflowY: "auto",
                              zIndex: 1000,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              marginBottom: "4px"
                            }}>
                              {filteredClients.length === 0 ? (
                                <div style={{ padding: "8px", color: "#94a3b8" }}>Aucun client trouvé</div>
                              ) : (
                                filteredClients.map(client => (
                                  <div
                                    key={client.id}
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectClient(row.id, client)}
                                  >
                                    <span>{client.prenom} {client.nom}</span>
                                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{client.telephone}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="report-input"
                            value={row.price || ""}
                            onChange={(e) =>
                              updateRow(row.id, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            style={{ textAlign: "right" }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.filter((r) => r.price > 0).length > 0 && (
              <div className="report-summary">
                <div className="report-summary-label">Total HT</div>
                <div className="report-summary-value">
                  {formatMoney(
                    rows.filter((r) => r.price > 0).reduce((sum, r) => sum + Number(r.price), 0)
                  )}
                </div>
              </div>
            )}

            <div className="report-paper-footer">
              <span>OULFA DRIVE — Document généré informatiquement.</span>
            </div>
          </div>

          {/* Hidden PDF capture area */}
          <div style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '794px',
            zIndex: -1,
            background: 'white',
          }} ref={pdfPaperRef}>
            <div className="report-paper">
              <div className="contract-header-table" style={{ width: "100%", borderBottom: "2px solid #d4af37", paddingBottom: "8px", marginBottom: "12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "30%", verticalAlign: "top" }}>
                        <div className="company-name" style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1e293b" }}>OULFA DRIVE</div>
                        <div className="company-slogan" style={{ fontSize: "10px", fontWeight: 600, marginTop: "4px", color: "#b8860b" }}>LOCATION DE VOITURE</div>
                        <div className="company-phone" style={{ fontSize: "9px", marginTop: "6px", color: "#475569" }}>📞 0665 921 921</div>
                      </td>
                      <td style={{ width: "40%", textAlign: "center", verticalAlign: "middle" }}>
                        <img src={logoImage} alt="Logo" style={{ height: "70px", width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} />
                      </td>
                      <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                        <div className="contract-number-box" style={{ border: "1px solid #e2e8f0", padding: "6px 14px", textAlign: "center", fontSize: "10px", display: "inline-block", background: "#fefce857", borderRadius: "10px" }}>
                          <div className="contract-number-label" style={{ fontSize: "9px", color: "#92400e", letterSpacing: "1.5px" }}>RAPPORT</div>
                          <div className="contract-number-value" style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                            {firstClientName ? `${new Date().getFullYear()}-${firstClientName.slice(0, 4)}` : `${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`}
                          </div>
                        </div>
                        <div className="arabic-text" style={{ marginTop: "8px", fontSize: "12px", fontWeight: 500, color: "#475569" }}>تقرير</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="contract-title-print" style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", color: "#0f172a" }}>
                RAPPORT MANUEL
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Date</th>
                      <th style={{ width: "45%" }}>Client</th>
                      <th style={{ width: "30%" }}>Prix HT (MAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.client_id && r.price > 0).map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>{row.client_name}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.filter(r => r.price > 0).length > 0 && (
                <div className="report-summary">
                  <div className="report-summary-label">Total HT</div>
                  <div className="report-summary-value">
                    {formatMoney(
                      rows.filter(r => r.price > 0).reduce((sum, r) => sum + Number(r.price), 0)
                    )}
                  </div>
                </div>
              )}
              <div className="report-paper-footer">
                <span>OULFA DRIVE — Document généré informatiquement.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="report-modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={generating}>
            Annuler
          </button>
          <button onClick={generatePDF} className="btn btn-primary" disabled={generating}>
            {generating ? <Loader size={16} className="spinning" /> : <Printer size={16} />}
            {generating ? "Génération..." : "Générer PDF"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Edit Report Modal (with client search & payment registration) ----------
const EditReportModal = ({ isOpen, onClose, report, onReportSaved, reservations }) => {
  const dispatch = useDispatch();
  const clients = useSelector(selectClients);

  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState(1);
  const paperRef = useRef(null);
  const pdfPaperRef = useRef(null);

  const [searchTerms, setSearchTerms] = useState({});
  const [activeRowId, setActiveRowId] = useState(null);

  useEffect(() => {
    if (report && report.rows) {
      const parsed = typeof report.rows === "string" ? JSON.parse(report.rows) : report.rows;
      setRows(
        parsed.map((row) => ({
          id: Date.now() + Math.random(),
          date: row.date || new Date().toISOString().slice(0, 10),
          client_id: row.client_id || "",
          client_name: row.client_name || row.nom || "",
          price: row.price || 0,
        }))
      );
    }
  }, [report]);

  const getFilteredClients = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const lower = searchTerm.toLowerCase().trim();
    return clients.filter(c => {
      const fullName = `${c.prenom} ${c.nom}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.telephone || "").toLowerCase();
      return fullName.includes(lower) || email.includes(lower) || phone.includes(lower);
    }).slice(0, 10);
  };

  const addRow = () => {
    setRows([
      ...rows,
      { id: Date.now(), date: new Date().toISOString().slice(0, 10), client_id: "", client_name: "", price: 0 },
    ]);
  };

  const createMultipleRows = () => {
    const num = parseInt(numberOfLines);
    if (isNaN(num) || num <= 0) {
      toast.warning("Entrez un nombre valide");
      return;
    }
    const newRows = [];
    for (let i = 0; i < num; i++) {
      newRows.push({
        id: Date.now() + i,
        date: new Date().toISOString().slice(0, 10),
        client_id: "",
        client_name: "",
        price: 0,
      });
    }
    setRows([...rows, ...newRows]);
  };

  const updateRow = (id, field, value) => {
    setRows(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const removeRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
      setSearchTerms(prev => {
        const newTerms = { ...prev };
        delete newTerms[id];
        return newTerms;
      });
      if (activeRowId === id) setActiveRowId(null);
    }
  };

  const handleSelectClient = (rowId, client) => {
    updateRow(rowId, 'client_id', client.id);
    updateRow(rowId, 'client_name', `${client.prenom} ${client.nom}`);
    setSearchTerms(prev => ({ ...prev, [rowId]: `${client.prenom} ${client.nom}` }));
    setActiveRowId(null);
  };

  const calculateTotal = () => rows.reduce((sum, row) => sum + Number(row.price), 0);

  const handleSave = async () => {
  // Mettre à jour les rows : essayer de résoudre les noms de clients en IDs si manquant
  const updatedRows = rows.map(row => {
    if (!row.client_id && row.client_name) {
      const trimmed = row.client_name.trim();
      const found = clients.find(c => 
        `${c.prenom} ${c.nom}`.toLowerCase() === trimmed.toLowerCase()
      );
      if (found) {
        return { ...row, client_id: found.id };
      }
    }
    return row;
  });
  setRows(updatedRows);

  const validRows = updatedRows.filter((row) => row.client_id && parseFloat(row.price) > 0);
  if (validRows.length === 0) {
    toast.warning("Ajoutez au moins une ligne valide");
    return;
  }

  setSaving(true);
  try {
    // ========== ÉTAPE 1 : SUPPRIMER LES ANCIENS PAIEMENTS LIÉS AU RAPPORT ==========
    const reportFileName = report.file_name;
    for (const row of validRows) {
      // Récupérer toutes les réservations du client
      const clientReservations = reservations.filter(r => r.client_id === row.client_id);
      for (const res of clientReservations) {
        // Vérifier si la réservation a un historique de paiements
        if (res.payment_history && Array.isArray(res.payment_history)) {
          // Filtrer les paiements dont la note contient le nom du fichier du rapport
          const paymentsToRemove = res.payment_history.filter(p => 
            p.notes && (
              p.notes.includes(reportFileName) ||
              p.notes.includes(`Rapport manuel (${reportFileName})`) ||
              p.notes.includes(`Rapport modifié (${reportFileName})`)
            )
          );
          // Supprimer chaque paiement trouvé
          for (const payment of paymentsToRemove) {
            try {
              await dispatch(removePaymentFromReservation({
                reservationId: res.id,
                paymentId: payment.id
              })).unwrap();
            } catch (err) {
              console.warn(`Échec de suppression du paiement #${payment.id} pour réservation #${res.id}:`, err);
            }
          }
        }
      }
    }

    // ========== ÉTAPE 2 : GÉNÉRER LE PDF ET METTRE À JOUR LE RAPPORT ==========
    const paperElement = pdfPaperRef.current;
    if (!paperElement) {
      toast.error("Impossible de capturer le rapport");
      return;
    }

    const canvas = await html2canvas(paperElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      const scale = pageHeight / imgHeight;
      const scaledWidth = imgWidth * scale;
      const scaledHeight = imgHeight * scale;
      doc.addImage(imgData, 'PNG', (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
    } else {
      const verticalOffset = (pageHeight - imgHeight) / 2;
      doc.addImage(imgData, 'PNG', 0, verticalOffset, imgWidth, imgHeight);
    }

    const fileName = report.file_name || `Rapport_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.pdf`;
    const pdfBlob = doc.output('blob');
    const pdfBase64 = await blobToBase64(pdfBlob);

    const token = localStorage.getItem("authToken");
    const response = await fetch(`${API_URL}/reports/${report.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        file_name: fileName,
        pdf_data: pdfBase64,
        rows: validRows.map(r => ({ date: r.date, client_name: r.client_name, client_id: r.client_id, price: r.price })),
        total_ht: validRows.reduce((sum, row) => sum + Number(row.price), 0),
      }),
    });

    if (!response.ok) {
      toast.error("Erreur lors de la modification");
      return;
    }

    // ========== ÉTAPE 3 : AJOUTER LES NOUVEAUX PAIEMENTS ==========
    let paymentErrors = 0;
    for (const row of validRows) {
      try {
        const clientReservations = reservations.filter(r => r.client_id === row.client_id);
        let targetReservation = clientReservations.find(r => r.status === 'confirmed' && r.remaining_amount > 0);
        if (!targetReservation) {
          targetReservation = clientReservations
            .filter(r => r.remaining_amount > 0)
            .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
        }
        if (targetReservation) {
          await dispatch(addPaymentToReservation({
            reservationId: targetReservation.id,
            paymentData: {
              amount: row.price,
              date: row.date,
              method: 'cash',
              notes: `Rapport modifié (${fileName})`
            }
          })).unwrap();
        } else {
          console.warn(`Aucune réservation éligible pour le client ${row.client_name} (ID: ${row.client_id})`);
          paymentErrors++;
        }
      } catch (err) {
        console.error(`Erreur lors de l'ajout du paiement pour le client ${row.client_name}:`, err);
        paymentErrors++;
      }
    }

    if (paymentErrors > 0) {
      toast.warning(`Rapport modifié, mais ${paymentErrors} paiement(s) n'ont pas pu être appliqués.`);
    } else {
      toast.success("Rapport modifié et paiements enregistrés");
    }

    onClose();
    if (onReportSaved) onReportSaved();

  } catch (err) {
    console.error(err);
    toast.error("Erreur lors de la modification du rapport");
  } finally {
    setSaving(false);
  }
};

  if (!isOpen || !report) return null;

  return (
    <div className="edit-modal-overlay" onClick={onClose}>
      <div className="edit-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">
            <Edit size={20} /> Modifier le rapport
          </h2>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="edit-modal-body">
          <div className="report-controls">
            <span>📝 Nombre de lignes :</span>
            <input
              type="number"
              min="1"
              max="50"
              value={numberOfLines}
              onChange={(e) => setNumberOfLines(e.target.value)}
            />
            <button onClick={createMultipleRows} className="btn btn-primary">
              <Zap size={14} /> Créer {numberOfLines} ligne{parseInt(numberOfLines) > 1 ? "s" : ""}
            </button>
            <button onClick={addRow} className="btn btn-outline">
              <Plus size={14} /> Ajouter 1 ligne
            </button>
            <span className="report-line-count">📋 {rows.length} ligne(s)</span>
          </div>

          <div className="report-paper" ref={paperRef}>
            <div className="contract-header-table" style={{ width: "100%", borderBottom: "2px solid #d4af37", paddingBottom: "8px", marginBottom: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td style={{ width: "30%", verticalAlign: "top" }}>
                      <div className="company-name" style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1e293b" }}>OULFA DRIVE</div>
                      <div className="company-slogan" style={{ fontSize: "10px", fontWeight: 600, marginTop: "4px", color: "#b8860b" }}>LOCATION DE VOITURE</div>
                      <div className="company-phone" style={{ fontSize: "9px", marginTop: "6px", color: "#475569" }}>📞 0665 921 921</div>
                    </td>
                    <td style={{ width: "40%", textAlign: "center", verticalAlign: "middle" }}>
                      <img src={logoImage} alt="Logo" style={{ height: "70px", width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} />
                    </td>
                    <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                      <div className="contract-number-box" style={{ border: "1px solid #e2e8f0", padding: "6px 14px", textAlign: "center", fontSize: "10px", display: "inline-block", background: "#fefce857", borderRadius: "10px" }}>
                        <div className="contract-number-label" style={{ fontSize: "9px", color: "#92400e", letterSpacing: "1.5px" }}>RAPPORT</div>
                        <div className="contract-number-value" style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                          {new Date().getFullYear()}-{Math.floor(Math.random() * 10000).toString().padStart(4, "0")}
                        </div>
                      </div>
                      <div className="arabic-text" style={{ marginTop: "8px", fontSize: "12px", fontWeight: 500, color: "#475569" }}>تقرير</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="contract-title-print" style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", color: "#0f172a" }}>
              MODIFIER LE RAPPORT
            </div>

            <div className="report-table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Date</th>
                    <th style={{ width: "45%" }}>Client</th>
                    <th style={{ width: "25%" }}>Prix HT (MAD)</th>
                    <th style={{ width: "10%" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const searchTerm = searchTerms[row.id] || "";
                    const filteredClients = getFilteredClients(searchTerm);
                    const isActive = activeRowId === row.id;

                    return (
                      <tr key={row.id}>
                        <td>
                          <input
                            type="date"
                            className="report-input"
                            value={row.date}
                            onChange={(e) => updateRow(row.id, "date", e.target.value)}
                          />
                        </td>
                        <td style={{ position: "relative" }}>
                          <input
                            type="text"
                            className="report-input"
                            value={row.client_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateRow(row.id, "client_name", val);
                              setSearchTerms(prev => ({ ...prev, [row.id]: val }));
                              if (val === "") {
                                updateRow(row.id, "client_id", "");
                              }
                              setActiveRowId(row.id);
                            }}
                            onFocus={() => setActiveRowId(row.id)}
                            placeholder="Rechercher un client..."
                            autoComplete="off"
                          />
                          {isActive && searchTerm.length >= 1 && (
                            <div className="client-dropdown" style={{
                              position: "absolute",
                              bottom: "100%",
                              left: 0,
                              right: 0,
                              background: "white",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              maxHeight: "200px",
                              overflowY: "auto",
                              zIndex: 1000,
                              boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                              marginBottom: "4px"
                            }}>
                              {filteredClients.length === 0 ? (
                                <div style={{ padding: "8px", color: "#94a3b8" }}>Aucun client trouvé</div>
                              ) : (
                                filteredClients.map(client => (
                                  <div
                                    key={client.id}
                                    style={{
                                      padding: "8px 12px",
                                      cursor: "pointer",
                                      borderBottom: "1px solid #f1f5f9",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center"
                                    }}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectClient(row.id, client)}
                                  >
                                    <span>{client.prenom} {client.nom}</span>
                                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{client.telephone}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="report-input"
                            value={row.price || ""}
                            onChange={(e) =>
                              updateRow(row.id, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0.00"
                            style={{ textAlign: "right" }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={() => removeRow(row.id)}
                            disabled={rows.length === 1}
                            style={{ color: "#ef4444" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {rows.filter((r) => r.price > 0).length > 0 && (
              <div className="report-summary">
                <div className="report-summary-label">Total HT</div>
                <div className="report-summary-value">
                  {formatMoney(calculateTotal())}
                </div>
              </div>
            )}

            <div className="report-paper-footer">
              <span>OULFA DRIVE — Document généré informatiquement.</span>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: '794px',
            zIndex: -1,
            background: 'white',
          }} ref={pdfPaperRef}>
            <div className="report-paper">
              <div className="contract-header-table" style={{ width: "100%", borderBottom: "2px solid #d4af37", paddingBottom: "8px", marginBottom: "12px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "30%", verticalAlign: "top" }}>
                        <div className="company-name" style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "2px", color: "#1e293b" }}>OULFA DRIVE</div>
                        <div className="company-slogan" style={{ fontSize: "10px", fontWeight: 600, marginTop: "4px", color: "#b8860b" }}>LOCATION DE VOITURE</div>
                        <div className="company-phone" style={{ fontSize: "9px", marginTop: "6px", color: "#475569" }}>📞 0665 921 921</div>
                      </td>
                      <td style={{ width: "40%", textAlign: "center", verticalAlign: "middle" }}>
                        <img src={logoImage} alt="Logo" style={{ height: "70px", width: "auto", objectFit: "contain" }} onError={(e) => e.target.style.display = "none"} />
                      </td>
                      <td style={{ width: "30%", textAlign: "right", verticalAlign: "top" }}>
                        <div className="contract-number-box" style={{ border: "1px solid #e2e8f0", padding: "6px 14px", textAlign: "center", fontSize: "10px", display: "inline-block", background: "#fefce857", borderRadius: "10px" }}>
                          <div className="contract-number-label" style={{ fontSize: "9px", color: "#92400e", letterSpacing: "1.5px" }}>RAPPORT</div>
                          <div className="contract-number-value" style={{ fontSize: "18px", fontWeight: 800, color: "#1a1a2e" }}>
                            {new Date().getFullYear()}-{Math.floor(Math.random() * 10000).toString().padStart(4, "0")}
                          </div>
                        </div>
                        <div className="arabic-text" style={{ marginTop: "8px", fontSize: "12px", fontWeight: 500, color: "#475569" }}>تقرير</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="contract-title-print" style={{ textAlign: "center", fontSize: "17px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "3px", marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px", color: "#0f172a" }}>
                MODIFIER LE RAPPORT
              </div>
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }}>Date</th>
                      <th style={{ width: "45%" }}>Client</th>
                      <th style={{ width: "30%" }}>Prix HT (MAD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.client_id && r.price > 0).map((row) => (
                      <tr key={row.id}>
                        <td>{row.date}</td>
                        <td>{row.client_name}</td>
                        <td style={{ textAlign: "right" }}>{Number(row.price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.filter(r => r.price > 0).length > 0 && (
                <div className="report-summary">
                  <div className="report-summary-label">Total HT</div>
                  <div className="report-summary-value">
                    {formatMoney(calculateTotal())}
                  </div>
                </div>
              )}
              <div className="report-paper-footer">
                <span>OULFA DRIVE — Document généré informatiquement.</span>
              </div>
            </div>
          </div>
        </div>
        <div className="edit-modal-footer">
          <button onClick={onClose} className="btn btn-outline" disabled={saving}>
            Annuler
          </button>
          <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
            {saving ? <Loader size={16} className="spinning" /> : <SaveIcon size={16} />}
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- Saved Reports Section ----------
const SavedReportsSection = ({ onEditReport, refreshTrigger }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    reportId: null,
    reportName: "",
  });
  const [deleting, setDeleting] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshTrigger]);

  const totalPages = Math.ceil(reports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = reports.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleDelete = async () => {
    const { reportId } = deleteModal;
    if (!reportId) return;
    setDeleting(reportId);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/reports/${reportId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Rapport supprimé");
        loadReports();
      } else {
        toast.error("Erreur de suppression");
      }
    } catch (err) {
      toast.error("Erreur");
    } finally {
      setDeleting(null);
      setDeleteModal({ isOpen: false, reportId: null, reportName: "" });
    }
  };

  const downloadReport = async (report, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${API_URL}/download-report/${report.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = report.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Téléchargé");
      } else {
        toast.error("Erreur téléchargement");
      }
    } catch (err) {
      toast.error("Erreur");
    }
  };

  if (loading)
    return (
      <div style={{ padding: "1rem", textAlign: "center" }}>Chargement des rapports...</div>
    );

  return (
    <div className="saved-reports-section">
      <div className="section-title">
        <FolderOpen size={18} /> Rapports sauvegardés
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.7rem",
            background: "#e2e8f0",
            padding: "0.25rem 0.5rem",
            borderRadius: "1rem",
          }}
        >
          {reports.length}
        </span>
      </div>
      {reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
          <FileText size={32} />
          <p>Aucun rapport sauvegardé</p>
        </div>
      ) : (
        <>
          <div className="saved-reports-grid">
            {currentReports.map((report) => (
              <div key={report.id} className="saved-report-card">
                <div className="saved-report-title">
                  <span>
                    <FileText size={14} />{" "}
                    {report.file_name.length > 30
                      ? report.file_name.slice(0, 27) + "..."
                      : report.file_name}
                  </span>
                  <div>
                    <button className="action-btn edit" onClick={() => onEditReport(report)}>
                      <Edit size={14} />
                    </button>
                    <button className="action-btn" onClick={(e) => downloadReport(report, e)}>
                      <Download size={14} />
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) =>
                        setDeleteModal({
                          isOpen: true,
                          reportId: report.id,
                          reportName: report.file_name,
                        })
                      }
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#475569" }}>
                  <div>
                    Total HT: <strong>{formatMoney(report.total_ht || 0)}</strong>
                  </div>
                  <div>{report.rows?.length || 0} ligne(s)</div>
                </div>
                <div className="saved-report-meta">
                  <span>
                    <Calendar size={10} />{" "}
                    {new Date(report.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "1.5rem",
                paddingTop: "1rem",
                borderTop: "1px solid #e2e8f0",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-outline"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{ padding: "0.25rem 0.75rem" }}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  className={`btn ${page === currentPage ? "btn-primary" : "btn-outline"}`}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: "0.25rem 0.75rem",
                    minWidth: "2rem",
                    fontWeight: page === currentPage ? "bold" : "normal",
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                className="btn btn-outline"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{ padding: "0.25rem 0.75rem" }}
              >
                <ChevronRight size={16} />
              </button>
              <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "0.5rem" }}>
                Page {currentPage} sur {totalPages}
              </span>
            </div>
          )}
        </>
      )}

      {deleteModal.isOpen && (
        <div
          className="report-modal-overlay"
          onClick={() => setDeleteModal({ isOpen: false, reportId: null, reportName: "" })}
        >
          <div
            className="report-modal"
            style={{ maxWidth: "400px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="report-modal-header">
              <h2>
                <AlertTriangle size={20} style={{ color: "#ef4444" }} /> Confirmer la suppression
              </h2>
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, reportId: null, reportName: "" })
                }
              >
                <X size={20} />
              </button>
            </div>
            <div className="report-modal-body">
              <p>
                Supprimer <strong>{deleteModal.reportName}</strong> ?
              </p>
            </div>
            <div className="report-modal-footer">
              <button
                onClick={() =>
                  setDeleteModal({ isOpen: false, reportId: null, reportName: "" })
                }
                className="btn btn-outline"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-primary"
                style={{ background: "#ef4444" }}
                disabled={deleting === deleteModal.reportId}
              >
                {deleting === deleteModal.reportId ? (
                  <Loader size={16} className="spinning" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Component: FormLine ====================
const FormLine = ({ label, value = "" }) => (
  <div className="form-line">
    <label>{label} :</label>
    <div className="dots-line">{value || "___________"}</div>
  </div>
);

// ==================== Component: Checkbox ====================
const CheckboxComponent = ({ checked = false }) => (
  <span className={`checkbox-square ${checked ? "checked" : ""}`}>
    {checked && "✓"}
  </span>
);

// ==================== Component: CarDiagram ====================
const CarDiagram = () => (
  <div className="car-diagram-container">
    <img
      src={checklistImage}
      alt="Car Checklist Diagram"
      className="checklist-image"
      onError={(e) => (e.target.style.display = "none")}
    />
  </div>
);

// ==================== Component: ObservationBox ====================
const ObservationBox = ({ title, isHalf = false, children, option = "show" }) => {
  if (option === "hide") return null;
  if (option === "dash") {
    return (
      <div className={`observation-box ${isHalf ? "half-width" : ""}`}>
        <label className="obs-title">{title} :</label>
        <div className="observation-content">___________</div>
      </div>
    );
  }
  return (
    <div className={`observation-box ${isHalf ? "half-width" : ""}`}>
      <label className="obs-title">{title} :</label>
      <div className="observation-content">{children}</div>
    </div>
  );
};

// ==================== Component: SignatureBlock ====================
const SignatureBlock = ({ label, signature = "", option = "show" }) => {
  if (option === "hide") return null;
  return (
    <div className="signature-block">
      <div className="signature-label">{label}</div>
      <div className="signature-box">
        {option === "dash" ? (
          <div className="signature-text">___________</div>
        ) : (
          signature && <div className="signature-text">{signature}</div>
        )}
      </div>
    </div>
  );
};

// ==================== Component: ManualContract ====================
const ManualContract = ({ formData, signatures, paperwork, displayOptions, currentUser }) => {
  const getCurrentUserName = () => {
    let userName = "";
    if (currentUser) {
      userName = currentUser.Fullname || currentUser.fullname || currentUser.name || currentUser.username || "";
    }
    if (!userName) {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          userName = userData.Fullname || userData.fullname || userData.name || "";
        }
      } catch (error) {
        console.error("Error reading user from localStorage:", error);
      }
    }
    return userName || "___________";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("fr-FR");
    } catch {
      return dateString;
    }
  };

  const calculateRentalDays = () => {
    if (!formData.start_date || !formData.end_date) return "";
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays;
  };

  const getDisplayOption = (section) => displayOptions[section] || "show";
  const currentUserName = getCurrentUserName();

  return (
    <div className="contract-container" id="manual-contract-print">
      <header className="contract-header">
        <div className="header-left">
          <div className="location-text">LOCATION DE VOITURE</div>
          <div className="phone-number">0665 921 921</div>
        </div>
        <div className="header-center">
          <img src={logoImage} alt="OULFA DRIVE Logo" className="company-logo" onError={(e) => (e.target.style.display = "none")} />
        </div>
        <div className="header-right">
          <div className="arabic-text">كراء السيارات</div>
          <div className="contract-number-red">
            MANUAL-{new Date().getFullYear()}-{Math.floor(Math.random() * 10000).toString().padStart(4, "0")}
          </div>
        </div>
      </header>

      <h1 className="contract-title">CONTRAT DE LOCATION</h1>

      <section className="two-columns-layout">
        <div className="left-column">
          {getDisplayOption("clientInfo") !== "hide" && (
            <div className="section-block">
              <h2 className="section-header-contract">LOCATAIRE</h2>
              {getDisplayOption("clientInfo") === "dash" ? (
                <>
                  <FormLine label="Nom" value="___________" />
                  <FormLine label="Prénom" value="___________" />
                  <FormLine label="Date de Naissance" value="___________" />
                  <FormLine label="Lieu de Naissance" value="___________" />
                  <FormLine label="Pièce d'identité (CIN)" value="___________" />
                  <FormLine label="Expire le" value="___________" />
                  <FormLine label="Permis de Conduire N°" value="___________" />
                  <FormLine label="Expire le" value="___________" />
                  <FormLine label="Adresse" value="___________" />
                  <FormLine label="Tél." value="___________" />
                  <FormLine label="Email" value="___________" />
                </>
              ) : (
                <>
                  <FormLine label="Nom" value={formData.client_nom || ""} />
                  <FormLine label="Prénom" value={formData.client_prenom || ""} />
                  <FormLine label="Date de Naissance" value={formData.client_date_naissance || ""} />
                  <FormLine label="Lieu de Naissance" value={formData.client_lieu_naissance || ""} />
                  <FormLine label="Pièce d'identité (CIN)" value={formData.client_cin || ""} />
                  <FormLine label="Expire le" value={formData.client_cin_expiry || ""} />
                  <FormLine label="Permis de Conduire N°" value={formData.client_permis || ""} />
                  <FormLine label="Expire le" value={formData.client_permis_expiry || ""} />
                  <FormLine label="Adresse" value={formData.client_address || ""} />
                  <FormLine label="Tél." value={formData.client_phone || ""} />
                  <FormLine label="Email" value={formData.client_email || ""} />
                </>
              )}
            </div>
          )}

          {getDisplayOption("secondDriver") !== "hide" && formData.has_second_driver && (
            <div className="section-block">
              <h2 className="section-header-contract">DEUXIEME CONDUCTEUR</h2>
              {getDisplayOption("secondDriver") === "dash" ? (
                <>
                  <FormLine label="Nom" value="___________" />
                  <FormLine label="Prénom" value="___________" />
                  <FormLine label="Date de Naissance" value="___________" />
                  <FormLine label="Lieu de Naissance" value="___________" />
                  <FormLine label="Pièce d'identité" value="___________" />
                  <FormLine label="Permis de Conduire N°" value="___________" />
                  <FormLine label="Tél." value="___________" />
                </>
              ) : (
                <>
                  <FormLine label="Nom" value={formData.second_driver_nom || ""} />
                  <FormLine label="Prénom" value={formData.second_driver_prenom || ""} />
                  <FormLine label="Date de Naissance" value={formData.second_driver_date_naissance || ""} />
                  <FormLine label="Lieu de Naissance" value={formData.second_driver_lieu_naissance || ""} />
                  <FormLine label="Pièce d'identité" value={formData.second_driver_cin || ""} />
                  <FormLine label="Permis de Conduire N°" value={formData.second_driver_permis || ""} />
                  <FormLine label="Tél." value={formData.second_driver_phone || ""} />
                </>
              )}
            </div>
          )}
        </div>

        <div className="right-column">
          {getDisplayOption("vehicleInfo") !== "hide" && (
            <div className="section-block full-height">
              <h2 className="section-header-contract">INFORMATION SUR LE VÉHICULE</h2>
              {getDisplayOption("vehicleInfo") === "dash" ? (
                <>
                  <FormLine label="Immatriculation" value="___________" />
                  <FormLine label="Marque" value="___________" />
                  <FormLine label="Modèle" value="___________" />
                  <FormLine label="Couleur" value="___________" />
                  <FormLine label="Année" value="___________" />
                  <FormLine label="Type de carburant" value="___________" />
                  <FormLine label="Transmission" value="___________" />
                  <FormLine label="Nombre de places" value="___________" />
                  <FormLine label="Nombre de portes" value="___________" />
                  <FormLine label="Livré par" value="___________" />
                  <FormLine label="Réceptionné par" value="___________" />
                </>
              ) : (
                <>
                  <FormLine label="Immatriculation" value={formData.car_matricule || ""} />
                  <FormLine label="Marque" value={formData.car_brand || ""} />
                  <FormLine label="Modèle" value={formData.car_model || ""} />
                  <FormLine label="Couleur" value={formData.car_color || ""} />
                  <FormLine label="Année" value={formData.car_year || ""} />
                  <FormLine label="Type de carburant" value={formData.car_fuel || ""} />
                  <FormLine label="Transmission" value={formData.car_transmission || ""} />
                  <FormLine label="Nombre de places" value={formData.car_seats || ""} />
                  <FormLine label="Nombre de portes" value={formData.car_doors || ""} />
                  <FormLine label="Livré par" value={currentUserName} />
                  <FormLine label="Réceptionné par" value={currentUserName} />
                </>
              )}
              
              {getDisplayOption("rentalDates") !== "hide" && (
                <>
                  {getDisplayOption("rentalDates") === "dash" ? (
                    <>
                      <FormLine label="Date de départ" value="___________" />
                      <FormLine label="Heure" value="___________" />
                      <FormLine label="Date de retour" value="___________" />
                      <FormLine label="Heure" value="___________" />
                    </>
                  ) : (
                    <>
                      <FormLine label="Date de départ" value={formatDate(formData.start_date)} />
                      <FormLine label="Heure" value={formData.start_time || "08:00"} />
                      <FormLine label="Date de retour" value={formatDate(formData.end_date)} />
                      <FormLine label="Heure" value={formData.end_time || "18:00"} />
                    </>
                  )}
                </>
              )}

              {getDisplayOption("kilometrage") !== "hide" && (
                <>
                  {getDisplayOption("kilometrage") === "dash" ? (
                    <>
                      <FormLine label="Km départ" value="___________" />
                      <FormLine label="Km retour" value="___________" />
                    </>
                  ) : (
                    <>
                      <FormLine label="Km départ" value={formData.kilometrage_depart || ""} />
                      <FormLine label="Km retour" value={formData.kilometrage_retour || ""} />
                    </>
                  )}
                </>
              )}

              {getDisplayOption("rentalDays") !== "hide" && (
                getDisplayOption("rentalDays") === "dash" ? (
                  <FormLine label="Nombre de jours" value="___________" />
                ) : (
                  <FormLine label="Nombre de jours" value={calculateRentalDays()} />
                )
              )}

              {getDisplayOption("prices") !== "hide" && (
                getDisplayOption("prices") === "dash" ? (
                  <>
                    <FormLine label="Prix unitaire" value="___________ DH" />
                    <FormLine label="Montant T.T.C" value="___________ DH" />
                    <FormLine label="Montant payé" value="___________ DH" />
                    <FormLine label="Montant restant" value="___________ DH" />
                  </>
                ) : (
                  <>
                    <FormLine label="Prix unitaire" value={`${formData.price_per_day || ""} DH`} />
                    <FormLine label="Montant T.T.C" value={`${formData.total_price || ""} DH`} />
                    <FormLine label="Montant payé" value={`${formData.amount_paid || ""} DH`} />
                    <FormLine label="Montant restant" value={`${(formData.total_price - formData.amount_paid) || ""} DH`} />
                  </>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <section className="checklist-section">
        <h2 className="section-header-contract checklist-title">CHECK LIST Etat du Véhicule</h2>
        <div className="etat-vehicule">
          <div>
            <div className="etat-label">Etat de Départ :</div>
            <CarDiagram />
          </div>
          <div>
            <div className="etat-label">Etat de Retour :</div>
            <CarDiagram />
          </div>
        </div>

        <div className="paperwork-bar">
          <div className="paperwork-item">Papier de circulation :</div>
          <div className="paperwork-item">Carte grise <CheckboxComponent checked={paperwork.carteGrise} /></div>
          <div className="paperwork-item">Assurance <CheckboxComponent checked={paperwork.assurance} /></div>
          <div className="paperwork-item">Vignette <CheckboxComponent checked={paperwork.vignette} /></div>
          <div className="paperwork-item">Autorisation <CheckboxComponent checked={paperwork.autorisation} /></div>
          <div className="paperwork-item">Visite technique <CheckboxComponent checked={paperwork.visiteTechnique} /></div>
        </div>
      </section>

      <section className="observations-section">
        <ObservationBox
          title="Observation"
          option={getDisplayOption("observations")}
        >
          <div className="observation-text">
            Véhicule loué en bon état général. Le client s'engage à retourner le véhicule dans le même état.
            {formData.notes && ` Notes: ${formData.notes}`}
          </div>
        </ObservationBox>
        <ObservationBox
          title="Assurance Supplémentaire"
          option={getDisplayOption("insurance")}
        >
          <div className="observation-text">Assurance tous risques incluse. Franchise applicable en cas de sinistre.</div>
        </ObservationBox>
        <ObservationBox
          title="Caution & Garantie"
          isHalf
          option={getDisplayOption("depositGuarantee")}
        >
          <div className="observation-text">
            Caution: {formData.amount_paid ? `${formData.amount_paid} DH` : "_________"} DH<br/>
            Montant restant: {formData.total_price - formData.amount_paid > 0 ? `${formData.total_price - formData.amount_paid} DH` : "_________"} DH
          </div>
        </ObservationBox>
      </section>

      <section className="signature-section">
        <SignatureBlock
          label="Signature Agent"
          signature={signatures.agent}
          option={getDisplayOption("signatures")}
        />
        <SignatureBlock
          label="Signature du locataire"
          signature={signatures.locataire}
          option={getDisplayOption("signatures")}
        />
        <SignatureBlock
          label="Deuxieme conducteur"
          signature={signatures.secondConducteur}
          option={getDisplayOption("signatures")}
        />
      </section>

      <footer className="contract-footer">
        OULFA DRIVE SARL AU CAPITAL 100 000.00 DH SIEGE SOCIAL: BASSATINE AL OULFA GH 3 IMMEUBLE 14 N°56 AL OULFA – CASABLANCA<br />
        RC: 580419-IF: 53743931 -TP: 35007229 ICE: 003274706000087 -TEL: 0665 92 19 21 / 0660 47 28 40 - EMAIL: OULFADRIVE@GMAIL.COM
      </footer>
    </div>
  );
};

// ==================== Component: ContractDisplayOptions ====================
const ContractDisplayOptions = ({ options, onOptionChange, onResetAll }) => {
  const sections = [
    { id: "prices", label: "Prix et Montants", icon: DollarSign },
    { id: "clientInfo", label: "Informations du Locataire", icon: User },
    { id: "secondDriver", label: "Deuxième Conducteur", icon: UserCircle },
    { id: "vehicleInfo", label: "Informations du Véhicule", icon: Car },
    { id: "rentalDates", label: "Dates de Location", icon: Calendar },
    { id: "kilometrage", label: "Kilométrage", icon: Gauge },
    { id: "rentalDays", label: "Nombre de jours", icon: CalendarDays },
    { id: "observations", label: "Observations", icon: Info },
    { id: "insurance", label: "Assurance Supplémentaire", icon: Shield },
    { id: "depositGuarantee", label: "Caution et Garantie", icon: Shield },
    { id: "signatures", label: "Signatures", icon: FileText }
  ];

  const displayModes = [
    { value: "show", label: "Afficher normalement", icon: Eye },
    { value: "hide", label: "Masquer", icon: EyeOff },
    { value: "dash", label: "Remplacer par des traits", icon: () => <span style={{ fontSize: "12px" }}>—</span> }
  ];

  return (
    <div className="display-options-panel">
      <div className="display-options-header">
        <h3><Settings size={16} /> Options d'affichage du contrat</h3>
        <button type="button" onClick={onResetAll} className="reset-all-btn">
          <RefreshCw size={14} /> Réinitialiser toutes les options
        </button>
      </div>
      <div className="display-options-grid">
        {sections.map(section => {
          const IconComponent = section.icon;
          const currentValue = options[section.id] || "show";
          return (
            <div key={section.id} className="display-option-item">
              <div className="display-option-label">
                <IconComponent size={14} />
                <span>{section.label}</span>
              </div>
              <div className="display-option-buttons">
                {displayModes.map(mode => (
                  <button
                    key={mode.value}
                    type="button"
                    className={`mode-btn ${currentValue === mode.value ? "active" : ""}`}
                    onClick={() => onOptionChange(section.id, mode.value)}
                    title={mode.label}
                  >
                    {mode.value === "dash" ? <mode.icon /> : <mode.icon size={12} />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== Component: GlobalSearchBar ====================
const GlobalSearchBar = ({
  searchQuery,
  setSearchQuery,
  searchResults,
  loading,
  selectedResult,
  onSelectResult,
  onClear,
  searchType,
  setSearchType
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const typeDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target)) {
        setIsTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getResultIcon = (type) => {
    switch(type) {
      case 'client': return <User size={14} />;
      case 'matricule': return <Gauge size={14} />;
      case 'reservation': return <Calendar size={14} />;
      case 'accident': return <AlertTriangle size={14} />;
      default: return <Search size={14} />;
    }
  };

  const getResultColor = (type) => {
    switch(type) {
      case 'client': return '#3b82f6';
      case 'matricule': return '#10b981';
      case 'reservation': return '#eab308';
      case 'accident': return '#ef4444';
      default: return '#64748b';
    }
  };

  const searchTypeOptions = [
    { value: "all", label: "Tous", icon: Search, color: "#64748b" },
    { value: "client", label: "Clients", icon: User, color: "#3b82f6" },
    { value: "matricule", label: "Matricules", icon: Gauge, color: "#10b981" },
    { value: "reservation", label: "Réservations", icon: Calendar, color: "#eab308" },
    { value: "accident", label: "Accidents", icon: AlertTriangle, color: "#ef4444" }
  ];

  const getCurrentTypeLabel = () => {
    const option = searchTypeOptions.find(opt => opt.value === searchType);
    return option ? option.label : "Tous";
  };

  const getCurrentTypeIcon = () => {
    const option = searchTypeOptions.find(opt => opt.value === searchType);
    const IconComponent = option?.icon || Search;
    return <IconComponent size={14} />;
  };

  return (
    <div className="global-search-container" ref={searchInputRef}>
      <div className="global-search-wrapper">
        <div className="global-search-icon">
          <Search size={16} />
        </div>
        
        <input
          type="text"
          className="global-search-input"
          placeholder="Rechercher un client, une immatriculation, une réservation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
        />

        <div className="search-type-dropdown" ref={typeDropdownRef}>
          <button
            className="search-type-trigger"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            type="button"
          >
            <span className="trigger-icon">{getCurrentTypeIcon()}</span>
            <span className="trigger-label">{getCurrentTypeLabel()}</span>
            <ChevronDown
              size={14}
              className={`trigger-chevron ${isTypeDropdownOpen ? 'open' : ''}`}
            />
          </button>
          
          {isTypeDropdownOpen && (
            <div className="search-type-menu">
              {searchTypeOptions.map(option => {
                const IconComponent = option.icon;
                const isActive = searchType === option.value;
                return (
                  <button
                    key={option.value}
                    className={`search-type-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      setSearchType(option.value);
                      setIsTypeDropdownOpen(false);
                    }}
                  >
                    <span className="item-icon" style={{ color: option.color }}>
                      <IconComponent size={14} />
                    </span>
                    <span className="item-label">{option.label}</span>
                    {isActive && <CheckCircle2 size={12} className="item-check" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {searchQuery && (
          <button className="global-search-clear" onClick={onClear}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && searchQuery.length > 1 && (
        <div className="global-search-results">
          {loading ? (
            <div className="search-loading">
              <div className="loading-spinner-small"></div>
              <span>Recherche en cours...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <>
              <div className="search-results-header">
                <span>{searchResults.length} résultat(s) trouvé(s)</span>
              </div>
              <div className="search-results-list">
                {searchResults.slice(0, 10).map((result, index) => (
                  <div
                    key={index}
                    className={`search-result-item ${selectedResult?.id === result.id ? 'selected' : ''}`}
                    onClick={() => onSelectResult(result)}
                  >
                    <div className="result-icon" style={{ backgroundColor: getResultColor(result.type) + '20', color: getResultColor(result.type) }}>
                      {getResultIcon(result.type)}
                    </div>
                    <div className="result-content">
                      <div className="result-title">{result.title}</div>
                      <div className="result-subtitle">{result.subtitle}</div>
                    </div>
                    <div className="result-type-badge" style={{ backgroundColor: getResultColor(result.type) + '15', color: getResultColor(result.type) }}>
                      {result.type === 'client' ? 'Client' :
                       result.type === 'matricule' ? 'Matricule' :
                       result.type === 'reservation' ? 'Réservation' : 'Accident'}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : searchQuery.length > 1 && (
            <div className="search-no-results">
              <p>Aucun résultat trouvé pour "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Component: ClientDetailModal ====================
const ClientDetailModal = ({ client, onClose, reservations, accidents, matricules, payments }) => {
  const [activeTab, setActiveTab] = useState('reservations');
  const [showAllReservations, setShowAllReservations] = useState(false);
  const [showAllAccidents, setShowAllAccidents] = useState(false);
  const [showAllMatricules, setShowAllMatricules] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  const clientReservations = reservations.filter(r => r.client_id === client?.id);
  const clientAccidents = accidents.filter(a => a.client_id === client?.id);
  const clientMatricules = matricules.filter(m =>
    clientReservations.some(r => r.matricule_id === m.id)
  );
  
  const clientPayments = payments?.filter(p =>
    clientReservations.some(r => r.id === p.reservation_id)
  ) || [];

  const totalRemaining = clientReservations.reduce((sum, r) => sum + (r.remaining_amount || 0), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      confirmed: { label: 'Confirmée', class: 'badge-confirmed' },
      completed: { label: 'Terminée', class: 'badge-completed' },
      cancelled: { label: 'Annulée', class: 'badge-cancelled' },
      retard: { label: 'En retard', class: 'badge-retard' },
      contacted: { label: 'Contacté', class: 'badge-contacted' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const getAccidentStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      evaluation_owner: { label: 'Évaluation propriétaire', class: 'badge-warning' },
      'contact expert': { label: 'Contact expert', class: 'badge-info' },
      evaluation_expert: { label: 'Évaluation expert', class: 'badge-info' },
      fixed: { label: 'Réparé', class: 'badge-success' },
      waiting: { label: 'En attente', class: 'badge-warning' },
      completed: { label: 'Terminé', class: 'badge-completed' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  if (!client) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="client-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <User size={20} />
            <span>Détails du client</span>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="client-info-section">
          <div className="client-avatar">
            <div className="avatar-initials">
              {client.prenom?.[0]}{client.nom?.[0]}
            </div>
          </div>
          <div className="client-details">
            <h3>{client.prenom} {client.nom}</h3>
            <div className="client-contact-info">
              <span><Phone size={14} /> {client.telephone}</span>
              <span><Mail size={14} /> {client.email || 'Non renseigné'}</span>
              <span><MapPinIcon size={14} /> {client.city || 'Non renseigné'}</span>
            </div>
            <div className="client-id-info">
              <span><IdCard size={14} /> CIN: {client.cin_number || 'Non renseigné'}</span>
              <span><FileText size={14} /> Permis: {client.driver_license_number || 'Non renseigné'}</span>
            </div>
          </div>
          <div className="client-summary">
            <div className="summary-item">
              <div className="summary-value">{clientReservations.length}</div>
              <div className="summary-label">Réservations</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{clientAccidents.length}</div>
              <div className="summary-label">Accidents</div>
            </div>
            <div className="summary-item">
              <div className="summary-value">{totalRemaining.toLocaleString()} DH</div>
              <div className="summary-label">Reste à payer</div>
            </div>
          </div>
        </div>

        <div className="client-tabs">
          <button
            className={`tab-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            <Calendar size={16} /> Réservations ({clientReservations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'accidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('accidents')}
          >
            <AlertTriangle size={16} /> Accidents ({clientAccidents.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'matricules' ? 'active' : ''}`}
            onClick={() => setActiveTab('matricules')}
          >
            <Gauge size={16} /> Matricules utilisés ({clientMatricules.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <Wallet size={16} /> Paiements restants
          </button>
        </div>

        <div className="client-tab-content">
          {activeTab === 'reservations' && (
            <div className="reservations-list">
              <div className="list-header">
                <span>Date</span>
                <span>Véhicule</span>
                <span>Matricule</span>
                <span>Montant</span>
                <span>Payé</span>
                <span>Reste</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllReservations ? clientReservations : clientReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.cars?.brand} {res.cars?.model}</span>
                    <span>{res.matricule?.matricule_code}</span>
                    <span>{res.total_price} DH</span>
                    <span>{res.amount_paid} DH</span>
                    <span className={res.remaining_amount > 0 ? 'text-warning' : 'text-success'}>
                      {res.remaining_amount} DH
                    </span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {clientReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllReservations(!showAllReservations)}>
                  {showAllReservations ? 'Voir moins' : `Voir plus (${clientReservations.length - 5})`}
                  {showAllReservations ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientReservations.length === 0 && (
                <div className="empty-state">Aucune réservation trouvée</div>
              )}
            </div>
          )}

          {activeTab === 'accidents' && (
            <div className="accidents-list">
              <div className="list-header">
                <span>Date</span>
                <span>Véhicule</span>
                <span>Matricule</span>
                <span>Montant sinistre</span>
                <span>Assurance</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllAccidents ? clientAccidents : clientAccidents.slice(0, 5)).map(acc => (
                  <div key={acc.id} className="list-row">
                    <span>{acc.date_accident}</span>
                    <span>{acc.car?.brand} {acc.car?.model}</span>
                    <span>{acc.matricule?.matricule_code}</span>
                    <span>{acc.amount_of_losses} DH</span>
                    <span>{acc.amount_assurance} DH</span>
                    <span>{getAccidentStatusBadge(acc.status)}</span>
                  </div>
                ))}
              </div>
              {clientAccidents.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllAccidents(!showAllAccidents)}>
                  {showAllAccidents ? 'Voir moins' : `Voir plus (${clientAccidents.length - 5})`}
                  {showAllAccidents ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientAccidents.length === 0 && (
                <div className="empty-state">Aucun accident trouvé</div>
              )}
            </div>
          )}

          {activeTab === 'matricules' && (
            <div className="matricules-list">
              <div className="list-header">
                <span>Code matricule</span>
                <span>Marque/Modèle</span>
                <span>Statut</span>
                <span>Dernière réservation</span>
              </div>
              <div className="list-body">
                {(showAllMatricules ? clientMatricules : clientMatricules.slice(0, 5)).map(mat => {
                  const lastReservation = clientReservations.find(r => r.matricule_id === mat.id);
                  return (
                    <div key={mat.id} className="list-row">
                      <span className="font-mono">{mat.matricule_code}</span>
                      <span>{mat.car?.brand} {mat.car?.model}</span>
                      <span>
                        <span className={`status-dot ${mat.status === 'active' ? 'status-active' : 'status-inactive'}`}></span>
                        {mat.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                      <span>{lastReservation ? `${lastReservation.start_date} → ${lastReservation.end_date}` : 'Jamais'}</span>
                    </div>
                  );
                })}
              </div>
              {clientMatricules.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllMatricules(!showAllMatricules)}>
                  {showAllMatricules ? 'Voir moins' : `Voir plus (${clientMatricules.length - 5})`}
                  {showAllMatricules ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {clientMatricules.length === 0 && (
                <div className="empty-state">Aucun matricule utilisé</div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="payments-list">
              <div className="total-remaining-card">
                <div className="total-remaining-label">Total restant à payer</div>
                <div className="total-remaining-value">{totalRemaining.toLocaleString()} DH</div>
              </div>
              <div className="list-header">
                <span>Réservation</span>
                <span>Date</span>
                <span>Montant total</span>
                <span>Payé</span>
                <span>Reste</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllPayments ? clientReservations : clientReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>#{res.id}</span>
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.total_price} DH</span>
                    <span>{res.amount_paid} DH</span>
                    <span className={res.remaining_amount > 0 ? 'text-warning' : 'text-success'}>
                      {res.remaining_amount} DH
                    </span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {clientReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllPayments(!showAllPayments)}>
                  {showAllPayments ? 'Voir moins' : `Voir plus (${clientReservations.length - 5})`}
                  {showAllPayments ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Component: MatriculeDetailModal ====================
const MatriculeDetailModal = ({ matricule, onClose, reservations, accidents, currentReservation }) => {
  const [activeTab, setActiveTab] = useState('history');
  const [showAllReservations, setShowAllReservations] = useState(false);

  const matriculeReservations = reservations.filter(r => r.matricule_id === matricule?.id);
  const matriculeAccidents = accidents.filter(a => a.matricule_id === matricule?.id);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      confirmed: { label: 'Confirmée', class: 'badge-confirmed' },
      completed: { label: 'Terminée', class: 'badge-completed' },
      cancelled: { label: 'Annulée', class: 'badge-cancelled' },
      retard: { label: 'En retard', class: 'badge-retard' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  if (!matricule) return null;

  const getAccidentStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'badge-pending' },
      evaluation_owner: { label: 'Évaluation propriétaire', class: 'badge-warning' },
      'contact expert': { label: 'Contact expert', class: 'badge-info' },
      evaluation_expert: { label: 'Évaluation expert', class: 'badge-info' },
      fixed: { label: 'Réparé', class: 'badge-success' },
      waiting: { label: 'En attente', class: 'badge-warning' },
      completed: { label: 'Terminé', class: 'badge-completed' }
    };
    const s = statusMap[status] || { label: status, class: '' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="matricule-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Gauge size={20} />
            <span>Détails du matricule</span>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="matricule-info-section">
          <div className="matricule-code-large">
            {matricule.matricule_code}
          </div>
          <div className="matricule-details">
            <div className="detail-row">
              <span className="detail-label">Véhicule:</span>
              <span>{matricule.car?.brand} {matricule.car?.model} ({matricule.car?.year})</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Kilométrage:</span>
              <span>{matricule.kilometrage?.toLocaleString()} km</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Statut:</span>
              <span>
                <span className={`status-dot ${matricule.status === 'active' ? 'status-active' : 'status-inactive'}`}></span>
                {matricule.status === 'active' ? 'Actif' : 'Inactif'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Visite technique:</span>
              <span className={matricule.visit_tech && new Date(matricule.visit_tech) < new Date() ? 'text-warning' : ''}>
                {matricule.visit_tech || 'Non renseignée'}
              </span>
            </div>
          </div>
          {currentReservation && (
            <div className="current-reservation-card">
              <div className="current-label">📍 En cours de location</div>
              <div className="current-client">
                Client: {currentReservation.client?.prenom} {currentReservation.client?.nom}
              </div>
              <div className="current-dates">
                Du {currentReservation.start_date} au {currentReservation.end_date}
              </div>
            </div>
          )}
        </div>

        <div className="matricule-tabs">
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> Historique des locations ({matriculeReservations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'accidents' ? 'active' : ''}`}
            onClick={() => setActiveTab('accidents')}
          >
            <AlertTriangle size={16} /> Accidents ({matriculeAccidents.length})
          </button>
        </div>

        <div className="matricule-tab-content">
          {activeTab === 'history' && (
            <div className="history-list">
              <div className="list-header">
                <span>Client</span>
                <span>Période</span>
                <span>Montant</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {(showAllReservations ? matriculeReservations : matriculeReservations.slice(0, 5)).map(res => (
                  <div key={res.id} className="list-row">
                    <span>{res.client?.prenom} {res.client?.nom}</span>
                    <span>{res.start_date} → {res.end_date}</span>
                    <span>{res.total_price} DH</span>
                    <span>{getStatusBadge(res.status)}</span>
                  </div>
                ))}
              </div>
              {matriculeReservations.length > 5 && (
                <button className="show-more-btn" onClick={() => setShowAllReservations(!showAllReservations)}>
                  {showAllReservations ? 'Voir moins' : `Voir plus (${matriculeReservations.length - 5})`}
                  {showAllReservations ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {matriculeReservations.length === 0 && (
                <div className="empty-state">Aucune location trouvée</div>
              )}
            </div>
          )}

          {activeTab === 'accidents' && (
            <div className="accidents-list">
              <div className="list-header">
                <span>Date</span>
                <span>Client</span>
                <span>Montant sinistre</span>
                <span>Assurance</span>
                <span>Statut</span>
              </div>
              <div className="list-body">
                {matriculeAccidents.map(acc => (
                  <div key={acc.id} className="list-row">
                    <span>{acc.date_accident}</span>
                    <span>{acc.client?.prenom} {acc.client?.nom}</span>
                    <span>{acc.amount_of_losses} DH</span>
                    <span>{acc.amount_assurance} DH</span>
                    <span>{getAccidentStatusBadge(acc.status)}</span>
                  </div>
                ))}
              </div>
              {matriculeAccidents.length === 0 && (
                <div className="empty-state">Aucun accident trouvé</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Component: StatCard ====================
const StatCard = ({ icon: Icon, title, value, subtitle, color, onClick, clickable = true }) => (
  <div className={`stat-card ${clickable ? 'clickable' : ''}`} onClick={onClick}>
    <div className={`stat-card-bg stat-icon-${color}`}></div>
    <div className={`stat-icon stat-icon-${color}`}>
      <Icon size={18} />
    </div>
    <div className="stat-value">{value}</div>
    <div className="stat-label">{title}</div>
    {subtitle && <div className="stat-subtitle">{subtitle}</div>}
  </div>
);

// ==================== Component: MatriculeCategoryCard ====================
const MatriculeCategoryCard = ({
  title,
  icon: Icon,
  color,
  matricules,
  onReserve,
  onConfirm,
  onCancel,
  onConfirmDirect,
  onExpand,
  expanded,
  onToggleExpand,
  loading,
  badge
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded || false);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (onToggleExpand) onToggleExpand(!isExpanded);
    if (isExpanded) {
      setShowAll(false);
      setSearchTerm('');
    }
  };

  const filteredMatricules = useMemo(() => {
    if (!searchTerm) return matricules;
    const lower = searchTerm.toLowerCase();
    return matricules.filter(mat =>
      mat.matricule_code?.toLowerCase().includes(lower) ||
      mat.car?.brand?.toLowerCase().includes(lower) ||
      mat.car?.model?.toLowerCase().includes(lower) ||
      mat.currentReservation?.client?.prenom?.toLowerCase().includes(lower) ||
      mat.currentReservation?.client?.nom?.toLowerCase().includes(lower)
    );
  }, [matricules, searchTerm]);

  const displayMatricules = showAll ? filteredMatricules : filteredMatricules.slice(0, 5);
  const hasMore = filteredMatricules.length > 5;

  const handleExpandMore = () => setShowAll(true);
  const handleCollapse = () => setShowAll(false);

  const isPendingCard = title === 'En attente de confirmation';
  const isRetourImminent = title === 'Retour imminent';

  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className={`matricule-category-card ${color}`}>
      <div className="card-header" onClick={toggleExpand}>
        <div className="card-title">
          <Icon size={18} />
          <span>{title}</span>
          {badge && <span className="card-badge">{badge}</span>}
        </div>
        <div className="card-actions">
          <span className="card-count">{matricules.length}</span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </div>

      {isExpanded && (
        <div className="card-dropdown">
          <div className="dropdown-search">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher une immatriculation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <X 
                size={14} 
                className="clear-search" 
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                }} 
              />
            )}
          </div>

          {loading ? (
            <div className="dropdown-loading">Chargement...</div>
          ) : filteredMatricules.length === 0 ? (
            <div className="dropdown-empty">Aucun matricule trouvé</div>
          ) : (
            <>
              <div className="dropdown-list">
                {displayMatricules.map((mat) => {
                  let daysLeft = null;
                  if (isRetourImminent && mat.currentReservation?.end_date) {
                    daysLeft = getDaysLeft(mat.currentReservation.end_date);
                  }

                  return (
                    <div key={mat.id} className="dropdown-item">
                      <div className="item-info">
                        <span className="item-code">{mat.matricule_code}</span>
                        <span className="item-car">{mat.car?.brand} {mat.car?.model}</span>
                        <span className="item-km">{mat.kilometrage?.toLocaleString()} km</span>
                        {mat.currentReservation && (
                          <span className="item-client">
                            {mat.currentReservation.client?.prenom} {mat.currentReservation.client?.nom}
                            {mat.currentReservation.end_date && (
                              <span className="item-end-date">
                                (retour: {new Date(mat.currentReservation.end_date).toLocaleDateString('fr-FR')})
                              </span>
                            )}
                          </span>
                        )}
                        {isRetourImminent && daysLeft !== null && (
                          <span className="days-left-badge" style={{
                            background: daysLeft <= 1 ? '#fef2f2' : '#fef3c7',
                            color: daysLeft <= 1 ? '#dc2626' : '#d97706',
                            padding: '0.1rem 0.6rem',
                            borderRadius: '1rem',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}>
                            {daysLeft === 0 ? 'Retour aujourd\'hui' : daysLeft === 1 ? '1 jour restant' : `${daysLeft} jours restants`}
                          </span>
                        )}
                      </div>
                      <div className="item-actions">
                        {title === 'Disponibles' && (
                          <>
                            <button
                              className="btn-reserve"
                              onClick={(e) => {
                                e.stopPropagation();
                                onReserve(mat);
                              }}
                            >
                              <span className="reserve-status">🔵</span> Réserver
                            </button>
                            <button
                              className="btn-confirm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirmDirect(mat);
                              }}
                            >
                              ✅ Confirmer
                            </button>
                          </>
                        )}
                        {isPendingCard && mat.currentReservation && (
                          <>
                            <button
                              className="btn-confirm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConfirm(mat.currentReservation);
                              }}
                            >
                              ✅ Confirmer
                            </button>
                            <button
                              className="btn-cancel"
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancel(mat.currentReservation);
                              }}
                            >
                              ❌ Annuler
                            </button>
                          </>
                        )}
                        {isRetourImminent && (
                          <span className="return-badge">⏳ Retour bientôt</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <div className="dropdown-footer">
                  {!showAll ? (
                    <button className="btn-show-more" onClick={handleExpandMore}>
                      Voir tout ({filteredMatricules.length})
                    </button>
                  ) : (
                    <button className="btn-show-more" onClick={handleCollapse}>
                      Voir moins
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ==================== Component: ReserveModal ====================
const ReserveModal = ({ isOpen, onClose, matricule, clients, cars, onConfirm }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = useMemo(() => {
    if (!matricule || !startDate || !endDate) return 0;
    const car = cars.find(c => c.id === matricule.car_id);
    if (!car) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return (car.price_per_day || 0) * days;
  }, [matricule, startDate, endDate, cars]);

  const filteredClients = clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.telephone} ${c.email || ''}`
      .toLowerCase()
      .includes(clientSearch.toLowerCase())
  );

  if (!isOpen || !matricule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    const data = {
      client_id: selectedClientId,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      amount_paid: 0,
      remaining_amount: totalPrice,
      status: status,
      notes: notes
    };
    setSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } catch (error) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Réserver {matricule.matricule_code}</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                if (!e.target.value) setSelectedClientId('');
              }}
            />
            <div className="client-list-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {clientSearch ? 'Aucun client trouvé' : 'Tapez pour rechercher'}
                </div>
              ) : (
                filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={`client-list-item ${selectedClientId === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedClientId(c.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedClientId === c.id ? '#fef3c7' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => {
                      if (selectedClientId !== c.id) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.telephone}</span>
                  </div>
                ))
              )}
            </div>
            {selectedClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Client sélectionné: {clients.find(c => c.id === selectedClientId)?.prenom} {clients.find(c => c.id === selectedClientId)?.nom}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de début</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de fin</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Prix total estimé</label>
            <input type="text" className="form-control" value={`${totalPrice} DH`} disabled style={{ backgroundColor: '#f3f4f6' }} />
          </div>
          <div className="form-group">
            <label>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="form-control">
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="contacted">Contacté</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" rows="2"></textarea>
          </div>
          <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader size={16} className="spinning" /> : 'Réserver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== Component: DirectConfirmModal ====================
const DirectConfirmModal = ({ isOpen, onClose, matricule, clients, cars, onConfirm }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0,10));
  const [endDate, setEndDate] = useState(new Date(Date.now()+7*24*60*60*1000).toISOString().slice(0,10));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalPrice = useMemo(() => {
    if (!matricule || !startDate || !endDate) return 0;
    const car = cars.find(c => c.id === matricule.car_id);
    if (!car) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return (car.price_per_day || 0) * days;
  }, [matricule, startDate, endDate, cars]);

  const filteredClients = clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.telephone} ${c.email || ''}`
      .toLowerCase()
      .includes(clientSearch.toLowerCase())
  );

  if (!isOpen || !matricule) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClientId) {
      toast.error('Veuillez sélectionner un client');
      return;
    }
    const data = {
      client_id: selectedClientId,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      start_date: startDate,
      end_date: endDate,
      start_time: startTime,
      end_time: endTime,
      total_price: totalPrice,
      amount_paid: 0,
      remaining_amount: totalPrice,
      status: 'confirmed',
      notes: notes
    };
    setSubmitting(true);
    try {
      await onConfirm(data);
      onClose();
    } catch (error) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmer {matricule.matricule_code}</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div className="form-group">
            <label>Client *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Rechercher un client..."
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                if (!e.target.value) setSelectedClientId('');
              }}
            />
            <div className="client-list-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginTop: '0.25rem' }}>
              {filteredClients.length === 0 ? (
                <div style={{ padding: '0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {clientSearch ? 'Aucun client trouvé' : 'Tapez pour rechercher'}
                </div>
              ) : (
                filteredClients.map(c => (
                  <div
                    key={c.id}
                    className={`client-list-item ${selectedClientId === c.id ? 'selected' : ''}`}
                    onClick={() => setSelectedClientId(c.id)}
                    style={{
                      padding: '0.5rem 0.75rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: selectedClientId === c.id ? '#fef3c7' : 'transparent'
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{c.prenom} {c.nom}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.telephone}</span>
                  </div>
                ))
              )}
            </div>
            {selectedClientId && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#16a34a' }}>
                ✅ Client sélectionné: {clients.find(c => c.id === selectedClientId)?.prenom} {clients.find(c => c.id === selectedClientId)?.nom}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>Date de début</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de début</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Heure de fin</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" required />
          </div>
          <div className="form-group">
            <label>Prix total</label>
            <input type="text" className="form-control" value={`${totalPrice} DH`} disabled style={{ backgroundColor: '#f3f4f6' }} />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="form-control" rows="2"></textarea>
          </div>
          <div className="modal-footer" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <Loader size={16} className="spinning" /> : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== FilterDropdown ====================
const FilterDropdown = ({ options, value, onChange, label, icon: IconComponent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedLabel = options.find(opt => opt.value === value)?.label || label;

  return (
    <div className="filter-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="filter-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {IconComponent && <IconComponent size={14} className="filter-dropdown-icon" />}
        <span className="filter-dropdown-label">{selectedLabel}</span>
        <ChevronDown size={14} className={`filter-dropdown-chevron ${isOpen ? 'open' : ''}`} />
      </button>
      {isOpen && (
        <div className="filter-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              className={`filter-dropdown-item ${option.value === value ? 'active' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="item-label">{option.label}</span>
              {option.value === value && <CheckCircle2 size={12} className="item-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== Main AdminDashboard ====================
export default function AdminDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cars = useSelector(selectCars);
  const carsLoading = useSelector(selectCarsLoading);
  const reservations = useSelector(selectReservations);
  const reservationsLoading = useSelector(selectReservationsLoading);
  const clients = useSelector(selectClients);
  const accidents = useSelector(selectAccidents);
  const matricules = useSelector(selectMatricules);
  const contacts = useSelector(selectContacts);
  const utilisateurs = useSelector(selectUtilisateurs);
  const currentUser = useSelector(selectUser);

  // Report state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [refreshReports, setRefreshReports] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [searchType, setSearchType] = useState("all");

  // Chart state
  const [byStatus, setByStatus] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [topCars, setTopCars] = useState([]);

  // Manual contract modal state
  const [manualContractOpen, setManualContractOpen] = useState(false);
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);
  const [contractSignatures, setContractSignatures] = useState({
    agent: "",
    locataire: "",
    secondConducteur: "",
  });
  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: false,
    carteGrise: false,
    assurance: false,
    vignette: false,
    visiteTechnique: false,
    autorisation: false,
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "show",
    clientInfo: "show",
    secondDriver: "show",
    vehicleInfo: "show",
    rentalDates: "show",
    kilometrage: "show",
    rentalDays: "show",
    observations: "show",
    insurance: "show",
    depositGuarantee: "show",
    signatures: "show",
  });
  const [manualFormData, setManualFormData] = useState({
    client_nom: "",
    client_prenom: "",
    client_date_naissance: "",
    client_lieu_naissance: "",
    client_cin: "",
    client_cin_expiry: "",
    client_permis: "",
    client_permis_expiry: "",
    client_address: "",
    client_phone: "",
    client_email: "",
    has_second_driver: false,
    second_driver_nom: "",
    second_driver_prenom: "",
    second_driver_date_naissance: "",
    second_driver_lieu_naissance: "",
    second_driver_cin: "",
    second_driver_permis: "",
    second_driver_phone: "",
    car_matricule: "",
    car_brand: "",
    car_model: "",
    car_color: "",
    car_year: "",
    car_fuel: "",
    car_transmission: "",
    car_seats: "",
    car_doors: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    start_time: "08:00",
    end_time: "18:00",
    kilometrage_depart: "",
    kilometrage_retour: "",
    price_per_day: "",
    total_price: "",
    amount_paid: "",
    notes: "",
  });

  // Matricule category state
  const [expandedCategories, setExpandedCategories] = useState({
    disponibles: false,
    enAttente: false,
    retourImminent: false,
    enRetard: false,
    enPanne: false,
  });
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedMatriculeForReserve, setSelectedMatriculeForReserve] = useState(null);
  const [reserving, setReserving] = useState(false);

  // Direct Confirm state
  const [confirmDirectModalOpen, setConfirmDirectModalOpen] = useState(false);
  const [selectedMatriculeForDirectConfirm, setSelectedMatriculeForDirectConfirm] = useState(null);

  // Filter state
  const [selectedMonth, setSelectedMonth] = useState('juin');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const monthOptions = [
    { value: 'janvier', label: 'Janvier' },
    { value: 'février', label: 'Février' },
    { value: 'mars', label: 'Mars' },
    { value: 'avril', label: 'Avril' },
    { value: 'mai', label: 'Mai' },
    { value: 'juin', label: 'Juin' },
    { value: 'juillet', label: 'Juillet' },
    { value: 'août', label: 'Août' },
    { value: 'septembre', label: 'Septembre' },
    { value: 'octobre', label: 'Octobre' },
    { value: 'novembre', label: 'Novembre' },
    { value: 'décembre', label: 'Décembre' },
  ];
  const yearOptions = [
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ];
  const periodOptions = [
    { value: 'all', label: 'Tous les jours' },
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    let filtered = reservations;
    const monthMap = {
      janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
      juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
    };
    if (selectedMonth && selectedYear) {
      const monthNum = monthMap[selectedMonth.toLowerCase()];
      if (monthNum !== undefined) {
        filtered = filtered.filter(r => {
          const d = new Date(r.start_date);
          return d.getMonth() === monthNum && d.getFullYear() === parseInt(selectedYear);
        });
      }
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (selectedPeriod === 'today') {
      filtered = filtered.filter(r => {
        const d = new Date(r.start_date);
        return d >= today && d < new Date(today.getTime() + 86400000);
      });
    } else if (selectedPeriod === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      filtered = filtered.filter(r => {
        const d = new Date(r.start_date);
        return d >= startOfWeek;
      });
    } else if (selectedPeriod === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      filtered = filtered.filter(r => {
        const d = new Date(r.start_date);
        return d >= startOfMonth;
      });
    }
    return filtered;
  }, [reservations, selectedMonth, selectedYear, selectedPeriod]);

  const totalReservations = filteredReservations.length;
  const reservationsEnAttente = filteredReservations.filter((r) => r.status === "pending").length;
  const reservationsConfirmees = filteredReservations.filter((r) => r.status === "confirmed").length;
  const reservationsTerminees = filteredReservations.filter((r) => r.status === "completed").length;
  const reservationsContactees = filteredReservations.filter((r) => r.status === "contacted").length;
  const reservationsAnnulees = filteredReservations.filter((r) => r.status === "cancelled").length;
  const reservationsEnRetard = filteredReservations.filter((r) => r.status === "retard").length;
  const revenue = filteredReservations
    .filter((r) => r.status === "confirmed" || r.status === "completed")
    .reduce((sum, r) => sum + Number(r.total_price || 0), 0);

  const filteredByStatus = useMemo(() => {
    const statusMap = {};
    filteredReservations.forEach((res) => {
      const displayName =
        res.status === "retard"
          ? "En retard"
          : res.status === "pending"
          ? "En attente"
          : res.status === "confirmed"
          ? "Confirmé"
          : res.status === "contacted"
          ? "Contacté"
          : res.status === "completed"
          ? "Terminé"
          : res.status === "cancelled"
          ? "Annulé"
          : res.status;
      statusMap[displayName] = (statusMap[displayName] || 0) + 1;
    });
    return Object.entries(statusMap).map(([name, value]) => ({ name, value }));
  }, [filteredReservations]);

  const filteredByMonth = useMemo(() => {
    const months = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = {
        month: d.toLocaleDateString("fr-FR", { month: "short" }),
        reservations: 0,
        revenue: 0,
      };
    }
    filteredReservations.forEach((res) => {
      const d = new Date(res.start_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months[key]) {
        months[key].reservations += 1;
        if (res.status === "confirmed" || res.status === "completed") {
          months[key].revenue += Number(res.total_price || 0);
        }
      }
    });
    return Object.values(months);
  }, [filteredReservations]);

  const filteredTopCars = useMemo(() => {
    const carMap = {};
    filteredReservations.forEach((res) => {
      const carName =
        res.cars?.brand && res.cars?.model
          ? `${res.cars.brand} ${res.cars.model}`
          : res.car_name || "Voiture";
      carMap[carName] = (carMap[carName] || 0) + 1;
    });
    return Object.entries(carMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredReservations]);

  useEffect(() => {
    setByStatus(filteredByStatus);
    setByMonth(filteredByMonth);
    setTopCars(filteredTopCars);
  }, [filteredByStatus, filteredByMonth, filteredTopCars]);

  // Manual contract auto-calc
  useEffect(() => {
    if (manualFormData.price_per_day && manualFormData.start_date && manualFormData.end_date) {
      const start = new Date(manualFormData.start_date);
      const end = new Date(manualFormData.end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const total = (manualFormData.price_per_day || 0) * days;
      setManualFormData((prev) => ({ ...prev, total_price: total }));
    }
  }, [manualFormData.price_per_day, manualFormData.start_date, manualFormData.end_date]);

  // Search
  const performSearch = useCallback(
    async (query, type) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearchLoading(true);
      setTimeout(() => {
        const results = [];
        const lowerQuery = query.toLowerCase();
        if (type === "all" || type === "client") {
          clients.forEach((client) => {
            const fullName = `${client.prenom} ${client.nom}`.toLowerCase();
            const phoneMatch = client.telephone?.toLowerCase().includes(lowerQuery);
            const emailMatch = client.email?.toLowerCase().includes(lowerQuery);
            const cinMatch = client.cin_number?.toLowerCase().includes(lowerQuery);
            if (fullName.includes(lowerQuery) || phoneMatch || emailMatch || cinMatch) {
              results.push({
                id: client.id,
                type: "client",
                title: `${client.prenom} ${client.nom}`,
                subtitle: `${client.telephone} | ${client.email || "Pas d'email"}`,
                data: client,
              });
            }
          });
        }
        if (type === "all" || type === "matricule") {
          matricules.forEach((matricule) => {
            if (matricule.matricule_code?.toLowerCase().includes(lowerQuery)) {
              const currentRes = reservations.find(
                (r) =>
                  r.matricule_id === matricule.id &&
                  (r.status === "confirmed" || r.status === "retard")
              );
              results.push({
                id: matricule.id,
                type: "matricule",
                title: matricule.matricule_code,
                subtitle: `${matricule.car?.brand} ${matricule.car?.model} | ${matricule.kilometrage?.toLocaleString()} km`,
                data: matricule,
                currentReservation: currentRes,
              });
            }
          });
        }
        if (type === "all" || type === "reservation") {
          reservations.forEach((reservation) => {
            const clientName = `${reservation.client?.prenom} ${reservation.client?.nom}`.toLowerCase();
            if (clientName.includes(lowerQuery) || `#${reservation.id}`.includes(lowerQuery)) {
              results.push({
                id: reservation.id,
                type: "reservation",
                title: `Réservation #${reservation.id}`,
                subtitle: `${reservation.client?.prenom} ${reservation.client?.nom} | ${reservation.start_date} → ${reservation.end_date}`,
                data: reservation,
              });
            }
          });
        }
        if (type === "all" || type === "accident") {
          accidents.forEach((accident) => {
            const clientName = `${accident.client?.prenom} ${accident.client?.nom}`.toLowerCase();
            if (
              clientName.includes(lowerQuery) ||
              accident.matricule?.matricule_code?.toLowerCase().includes(lowerQuery)
            ) {
              results.push({
                id: accident.id,
                type: "accident",
                title: `Accident du ${accident.date_accident}`,
                subtitle: `${accident.client?.prenom} ${accident.client?.nom} | ${accident.matricule?.matricule_code}`,
                data: accident,
              });
            }
          });
        }
        setSearchResults(results);
        setSearchLoading(false);
      }, 300);
    },
    [clients, matricules, reservations, accidents]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, searchType);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchType, performSearch]);

  const handleSelectResult = (result) => {
    setSearchQuery("");
    setSearchResults([]);
    if (result.type === "client") {
      setSelectedClient(result.data);
    } else if (result.type === "matricule") {
      setSelectedMatricule({
        ...result.data,
        currentReservation: result.currentReservation,
      });
    } else if (result.type === "reservation") {
      navigate("/reservations");
      setTimeout(() => {
        const event = new CustomEvent("focusReservation", { detail: { id: result.data.id } });
        window.dispatchEvent(event);
      }, 100);
    } else if (result.type === "accident") {
      navigate("/accidents");
      setTimeout(() => {
        const event = new CustomEvent("focusAccident", { detail: { id: result.data.id } });
        window.dispatchEvent(event);
      }, 100);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
  };

  // Manual Contract PDF generation
  const generateManualContractPDF = async () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const contractElement = document.getElementById("manual-contract-print");
      if (!contractElement) {
        console.error("Contract element not found");
        return;
      }

      const contractClone = contractElement.cloneNode(true);
      contractClone.style.width = "210mm";
      contractClone.style.height = "auto";
      contractClone.style.padding = "10px";
      contractClone.style.boxSizing = "border-box";

      const tempContainer = document.createElement("div");
      tempContainer.style.position = "fixed";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "0";
      tempContainer.style.width = "210mm";
      tempContainer.style.height = "auto";
      tempContainer.appendChild(contractClone);
      document.body.appendChild(tempContainer);

      const canvas = await html2canvas(contractClone, {
        scale: 1.2,
        useCORS: true,
        allowTaint: true,
        width: 794,
        height: 1123,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123
      });

      const imgData = canvas.toDataURL("image/png");
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight > pageHeight) {
        const scale = pageHeight / imgHeight;
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        doc.addImage(imgData, "PNG", (pageWidth - scaledWidth) / 2, 0, scaledWidth, scaledHeight);
      } else {
        const verticalOffset = (pageHeight - imgHeight) / 2;
        doc.addImage(imgData, "PNG", 0, verticalOffset, imgWidth, imgHeight);
      }
      
      document.body.removeChild(tempContainer);
      
      const pdfBlob = doc.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank");
      doc.save(`contrat-manuel-${new Date().toISOString().split("T")[0]}.pdf`);
      
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 1000);
      
      toast.success("Contrat généré avec succès!");
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erreur lors de la génération du contrat");
    }
  };

  const handleDisplayOptionChange = (section, value) => {
    setContractDisplayOptions(prev => ({ ...prev, [section]: value }));
  };

  const handleResetAllOptions = () => {
    setContractDisplayOptions({
      prices: "show",
      clientInfo: "show",
      secondDriver: "show",
      vehicleInfo: "show",
      rentalDates: "show",
      kilometrage: "show",
      rentalDays: "show",
      observations: "show",
      insurance: "show",
      depositGuarantee: "show",
      signatures: "show"
    });
  };

  const handleManualFormChange = (field, value) => {
    setManualFormData(prev => ({ ...prev, [field]: value }));
  };

  // Navigation handlers
  const navigateToCars = (filter) => {
    navigate("/cars");
    setTimeout(() => {
      if (filter === "disponible") {
        const event = new CustomEvent("filterCars", { detail: { status: "disponible" } });
        window.dispatchEvent(event);
      } else if (filter === "non disponible") {
        const event = new CustomEvent("filterCars", { detail: { status: "non disponible" } });
        window.dispatchEvent(event);
      }
    }, 100);
  };

  const navigateToReservations = (status) => {
    navigate("/reservations");
    setTimeout(() => {
      const event = new CustomEvent("filterReservations", { detail: { status } });
      window.dispatchEvent(event);
    }, 100);
  };

  const navigateToMatricules = (filter) => {
    navigate("/matricules");
    setTimeout(() => {
      if (filter === "active") {
        const event = new CustomEvent("filterMatricules", { detail: { status: "active" } });
        window.dispatchEvent(event);
      } else if (filter === "inactive") {
        const event = new CustomEvent("filterMatricules", { detail: { status: "inactive" } });
        window.dispatchEvent(event);
      } else if (filter === "reserved") {
        const event = new CustomEvent("filterMatricules", { detail: { reserved: true } });
        window.dispatchEvent(event);
      } else if (filter === "late") {
        const event = new CustomEvent("filterMatricules", { detail: { late: true } });
        window.dispatchEvent(event);
      }
    }, 100);
  };

  const navigateToAccidents = () => navigate("/accidents");
  const navigateToClients = () => navigate("/clients");
  const navigateToUtilisateurs = () => navigate("/users");
  const navigateToContacts = () => navigate("/contacts");

  // Statistics
  const totalCars = cars.length;
  const disponibles = cars.filter((c) => c.status === "disponible").length;
  const indisponibles = cars.filter((c) => c.status === "non disponible").length;
  const utilisateursActifs = utilisateurs.filter((u) => u.status === "active").length;
  const matriculesActifs = matricules.filter((m) => m.status === "active").length;
  const matriculesInactifs = matricules.filter((m) => m.status === "inactive").length;
  const matriculesReserves = reservations.filter(
    (r) => r.status === "confirmed" && r.matricule_id
  ).length;
  const totalAccidents = accidents.length;
  const accidentsEnAttente = accidents.filter((a) => a.status === "pending").length;
  const visitesTechniques = matricules.filter((m) => {
    if (!m.visit_tech) return false;
    const visitDate = new Date(m.visit_tech);
    const today = new Date();
    const diffDays = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  }).length;
  const vidangesNeeded = matricules.filter((m) => m.vidange_status === "not done").length;
  const totalContacts = contacts.length;
  const totalClients = clients.length;

  // Matricule category computations
  const activeReservationMatriculeIds = reservations
    .filter(r => r.status === 'pending' || r.status === 'confirmed' || r.status === 'retard')
    .map(r => r.matricule_id)
    .filter(Boolean);

  const openAccidentMatriculeIds = accidents
    .filter(a => a.status !== 'closed')
    .map(a => a.matricule_id)
    .filter(Boolean);

  const disponiblesMatricules = matricules.filter(m =>
    m.status === 'active' &&
    !activeReservationMatriculeIds.includes(m.id) &&
    !openAccidentMatriculeIds.includes(m.id)
  );

  const pendingReservationIds = reservations
    .filter(r => r.status === 'pending')
    .map(r => r.matricule_id)
    .filter(Boolean);
  const enAttenteMatricules = matricules.filter(m => pendingReservationIds.includes(m.id));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysLater = new Date(today);
  threeDaysLater.setDate(today.getDate() + 3);

  const retourImminentReservationIds = reservations
    .filter(r => {
      if (r.status !== 'confirmed') return false;
      const endDate = new Date(r.end_date);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today && endDate <= threeDaysLater;
    })
    .map(r => r.matricule_id)
    .filter(Boolean);
  const retourImminentMatricules = matricules.filter(m => retourImminentReservationIds.includes(m.id));

  const retardReservationIds = reservations
    .filter(r => r.status === 'retard')
    .map(r => r.matricule_id)
    .filter(Boolean);
  const enRetardMatricules = matricules.filter(m => retardReservationIds.includes(m.id));

  const enPanneMatricules = matricules.filter(m => openAccidentMatriculeIds.includes(m.id));

  const enrichWithReservation = (matList) => {
    return matList.map(m => {
      const res = reservations.find(r => r.matricule_id === m.id && (r.status === 'confirmed' || r.status === 'retard' || r.status === 'pending'));
      return { ...m, currentReservation: res || null };
    });
  };

  const disponiblesWithRes = enrichWithReservation(disponiblesMatricules);
  const enAttenteWithRes = enrichWithReservation(enAttenteMatricules);
  const retourImminentWithRes = enrichWithReservation(retourImminentMatricules);
  const enRetardWithRes = enrichWithReservation(enRetardMatricules);
  const enPanneWithRes = enrichWithReservation(enPanneMatricules);

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const handleReserveClick = (matricule) => {
    setSelectedMatriculeForReserve(matricule);
    setReserveModalOpen(true);
  };

  const handleDirectConfirm = (matricule) => {
    setSelectedMatriculeForDirectConfirm(matricule);
    setConfirmDirectModalOpen(true);
  };

  const handleDirectConfirmReservation = async (data) => {
    setReserving(true);
    try {
      const result = await dispatch(createReservation(data)).unwrap();
      const reservation = result.reservation || result.data || result;
      toast.success('Réservation confirmée avec succès');
      dispatch(refreshMatricules());
      dispatch(fetchReservations(true));
      setConfirmDirectModalOpen(false);
      navigate('/reservations', { state: { contractReservation: reservation } });
    } catch (error) {
      toast.error('Erreur lors de la création de la réservation');
      console.error(error);
    } finally {
      setReserving(false);
    }
  };

  const handleConfirmPending = async (reservation) => {
    try {
      const result = await dispatch(updateReservation({
        id: reservation.id,
        data: { status: 'confirmed' }
      })).unwrap();
      toast.success(`Réservation #${reservation.id} confirmée`);
      dispatch(refreshMatricules());
      dispatch(fetchReservations(true));
      navigate('/reservations', { state: { contractReservation: result.reservation || result } });
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
      console.error(error);
    }
  };

  const handleConfirmReservation = async (data) => {
    try {
      setReserving(true);
      const result = await dispatch(createReservation(data)).unwrap();
      toast.success('Réservation créée avec succès (en attente)');
      dispatch(refreshMatricules());
      dispatch(fetchReservations(true));
      setReserveModalOpen(false);
    } catch (error) {
      toast.error('Erreur lors de la création de la réservation');
      console.error(error);
    } finally {
      setReserving(false);
    }
  };

  const handleCancelPending = async (reservation) => {
    try {
      await dispatch(updateReservation({
        id: reservation.id,
        data: { status: 'cancelled' }
      })).unwrap();
      toast.success(`Réservation #${reservation.id} annulée`);
      dispatch(refreshMatricules());
      dispatch(fetchReservations(true));
    } catch (error) {
      toast.error('Erreur lors de l\'annulation');
      console.error(error);
    }
  };

  if (carsLoading || reservationsLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    );
  }

  // Render contract manual form if open
  if (manualContractOpen) {
    return (
      <div className="inline-form-container">
        <div className="inline-form-header">
          <div className="inline-form-icon">
            <FileText size={28} />
          </div>
          <div className="inline-form-title">
            <h2>Contrat de location manuel</h2>
            <p>Remplissez tous les champs pour générer un contrat PDF</p>
          </div>
          <button onClick={() => setManualContractOpen(false)} className="inline-form-close">
            <X size={24} />
          </button>
        </div>

        <div className="inline-form">
          <div style={{ marginBottom: "1.5rem", textAlign: "right" }}>
            <button
              onClick={() => setShowDisplayOptions(!showDisplayOptions)}
              className="inline-secondary-btn"
              style={{ background: "transparent", borderColor: "#eab308" }}
            >
              <Settings size={16} />
              {showDisplayOptions ? "Masquer" : "Afficher"} les options d'affichage
            </button>
          </div>

          {showDisplayOptions && (
            <ContractDisplayOptions
              options={contractDisplayOptions}
              onOptionChange={handleDisplayOptionChange}
              onResetAll={handleResetAllOptions}
            />
          )}

          <div className="inline-section">
            <div className="inline-section-header">
              <FileText size={18} />
              <h3>Signatures</h3>
            </div>
            <div className="inline-grid-2">
              <div className="inline-field">
                <label>Signature Agent</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.agent}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, agent: e.target.value }))}
                  placeholder="Nom de l'agent"
                />
              </div>
              <div className="inline-field">
                <label>Signature Locataire</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.locataire}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, locataire: e.target.value }))}
                  placeholder="Nom du locataire"
                />
              </div>
              <div className="inline-field">
                <label>Deuxième Conducteur</label>
                <input
                  type="text"
                  className="inline-input"
                  value={contractSignatures.secondConducteur}
                  onChange={(e) => setContractSignatures(prev => ({ ...prev, secondConducteur: e.target.value }))}
                  placeholder="Nom du conducteur"
                />
              </div>
            </div>
          </div>

          <div className="inline-section">
            <div className="inline-section-header">
              <CheckCircle2 size={18} />
              <h3>Documents remis</h3>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem" }}>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.carteGrise} onChange={() => setContractPaperwork(prev => ({ ...prev, carteGrise: !prev.carteGrise }))} /> Carte grise
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.assurance} onChange={() => setContractPaperwork(prev => ({ ...prev, assurance: !prev.assurance }))} /> Assurance
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.vignette} onChange={() => setContractPaperwork(prev => ({ ...prev, vignette: !prev.vignette }))} /> Vignette
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.visiteTechnique} onChange={() => setContractPaperwork(prev => ({ ...prev, visiteTechnique: !prev.visiteTechnique }))} /> Visite technique
              </label>
              <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="checkbox" checked={contractPaperwork.autorisation} onChange={() => setContractPaperwork(prev => ({ ...prev, autorisation: !prev.autorisation }))} /> Autorisation
              </label>
            </div>
          </div>

          <div className="inline-form-grid">
            <div className="inline-form-col">
              <div className="inline-section">
                <div className="inline-section-header">
                  <User size={18} />
                  <h3>Informations du locataire</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Nom</label><input className="inline-input" value={manualFormData.client_nom} onChange={(e) => handleManualFormChange("client_nom", e.target.value)} /></div>
                  <div className="inline-field"><label>Prénom</label><input className="inline-input" value={manualFormData.client_prenom} onChange={(e) => handleManualFormChange("client_prenom", e.target.value)} /></div>
                  <div className="inline-field"><label>Date de naissance</label><input type="date" className="inline-input" value={manualFormData.client_date_naissance} onChange={(e) => handleManualFormChange("client_date_naissance", e.target.value)} /></div>
                  <div className="inline-field"><label>Lieu de naissance</label><input className="inline-input" value={manualFormData.client_lieu_naissance} onChange={(e) => handleManualFormChange("client_lieu_naissance", e.target.value)} /></div>
                  <div className="inline-field"><label>CIN</label><input className="inline-input" value={manualFormData.client_cin} onChange={(e) => handleManualFormChange("client_cin", e.target.value)} /></div>
                  <div className="inline-field"><label>CIN expire le</label><input type="date" className="inline-input" value={manualFormData.client_cin_expiry} onChange={(e) => handleManualFormChange("client_cin_expiry", e.target.value)} /></div>
                  <div className="inline-field"><label>Permis N°</label><input className="inline-input" value={manualFormData.client_permis} onChange={(e) => handleManualFormChange("client_permis", e.target.value)} /></div>
                  <div className="inline-field"><label>Permis expire le</label><input type="date" className="inline-input" value={manualFormData.client_permis_expiry} onChange={(e) => handleManualFormChange("client_permis_expiry", e.target.value)} /></div>
                  <div className="inline-field"><label>Adresse</label><input className="inline-input" value={manualFormData.client_address} onChange={(e) => handleManualFormChange("client_address", e.target.value)} /></div>
                  <div className="inline-field"><label>Téléphone</label><input className="inline-input" value={manualFormData.client_phone} onChange={(e) => handleManualFormChange("client_phone", e.target.value)} /></div>
                  <div className="inline-field"><label>Email</label><input type="email" className="inline-input" value={manualFormData.client_email} onChange={(e) => handleManualFormChange("client_email", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="checkbox-group" style={{ marginBottom: "0.5rem" }}>
                  <input type="checkbox" id="hasSecondDriver" checked={manualFormData.has_second_driver} onChange={(e) => handleManualFormChange("has_second_driver", e.target.checked)} />
                  <label htmlFor="hasSecondDriver">Ajouter un deuxième conducteur</label>
                </div>
                {manualFormData.has_second_driver && (
                  <>
                    <div className="inline-section-header">
                      <UserCircle size={18} />
                      <h3>Deuxième conducteur</h3>
                    </div>
                    <div className="inline-grid-2">
                      <div className="inline-field"><label>Nom</label><input className="inline-input" value={manualFormData.second_driver_nom} onChange={(e) => handleManualFormChange("second_driver_nom", e.target.value)} /></div>
                      <div className="inline-field"><label>Prénom</label><input className="inline-input" value={manualFormData.second_driver_prenom} onChange={(e) => handleManualFormChange("second_driver_prenom", e.target.value)} /></div>
                      <div className="inline-field"><label>Date naissance</label><input type="date" className="inline-input" value={manualFormData.second_driver_date_naissance} onChange={(e) => handleManualFormChange("second_driver_date_naissance", e.target.value)} /></div>
                      <div className="inline-field"><label>Lieu naissance</label><input className="inline-input" value={manualFormData.second_driver_lieu_naissance} onChange={(e) => handleManualFormChange("second_driver_lieu_naissance", e.target.value)} /></div>
                      <div className="inline-field"><label>CIN</label><input className="inline-input" value={manualFormData.second_driver_cin} onChange={(e) => handleManualFormChange("second_driver_cin", e.target.value)} /></div>
                      <div className="inline-field"><label>Permis</label><input className="inline-input" value={manualFormData.second_driver_permis} onChange={(e) => handleManualFormChange("second_driver_permis", e.target.value)} /></div>
                      <div className="inline-field"><label>Téléphone</label><input className="inline-input" value={manualFormData.second_driver_phone} onChange={(e) => handleManualFormChange("second_driver_phone", e.target.value)} /></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="inline-form-col">
              <div className="inline-section">
                <div className="inline-section-header">
                  <Car size={18} />
                  <h3>Informations du véhicule</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Immatriculation</label><input className="inline-input" value={manualFormData.car_matricule} onChange={(e) => handleManualFormChange("car_matricule", e.target.value)} /></div>
                  <div className="inline-field"><label>Marque</label><input className="inline-input" value={manualFormData.car_brand} onChange={(e) => handleManualFormChange("car_brand", e.target.value)} /></div>
                  <div className="inline-field"><label>Modèle</label><input className="inline-input" value={manualFormData.car_model} onChange={(e) => handleManualFormChange("car_model", e.target.value)} /></div>
                  <div className="inline-field"><label>Couleur</label><input className="inline-input" value={manualFormData.car_color} onChange={(e) => handleManualFormChange("car_color", e.target.value)} /></div>
                  <div className="inline-field"><label>Année</label><input className="inline-input" value={manualFormData.car_year} onChange={(e) => handleManualFormChange("car_year", e.target.value)} /></div>
                  <div className="inline-field"><label>Carburant</label><select className="inline-select" value={manualFormData.car_fuel} onChange={(e) => handleManualFormChange("car_fuel", e.target.value)}><option value="">Sélectionner</option><option value="petrol">Essence</option><option value="diesel">Diesel</option><option value="electric">Électrique</option></select></div>
                  <div className="inline-field"><label>Transmission</label><select className="inline-select" value={manualFormData.car_transmission} onChange={(e) => handleManualFormChange("car_transmission", e.target.value)}><option value="">Sélectionner</option><option value="manual">Manuelle</option><option value="automatic">Automatique</option></select></div>
                  <div className="inline-field"><label>Places</label><input className="inline-input" value={manualFormData.car_seats} onChange={(e) => handleManualFormChange("car_seats", e.target.value)} /></div>
                  <div className="inline-field"><label>Portes</label><input className="inline-input" value={manualFormData.car_doors} onChange={(e) => handleManualFormChange("car_doors", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <Calendar size={18} />
                  <h3>Dates et kilométrage</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Date de départ</label><input type="date" className="inline-input" value={manualFormData.start_date} onChange={(e) => handleManualFormChange("start_date", e.target.value)} /></div>
                  <div className="inline-field"><label>Heure départ</label><input type="time" className="inline-input" value={manualFormData.start_time} onChange={(e) => handleManualFormChange("start_time", e.target.value)} /></div>
                  <div className="inline-field"><label>Date de retour</label><input type="date" className="inline-input" value={manualFormData.end_date} onChange={(e) => handleManualFormChange("end_date", e.target.value)} /></div>
                  <div className="inline-field"><label>Heure retour</label><input type="time" className="inline-input" value={manualFormData.end_time} onChange={(e) => handleManualFormChange("end_time", e.target.value)} /></div>
                  <div className="inline-field"><label>Km départ</label><input type="number" className="inline-input" value={manualFormData.kilometrage_depart} onChange={(e) => handleManualFormChange("kilometrage_depart", e.target.value)} /></div>
                  <div className="inline-field"><label>Km retour</label><input type="number" className="inline-input" value={manualFormData.kilometrage_retour} onChange={(e) => handleManualFormChange("kilometrage_retour", e.target.value)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <DollarSign size={18} />
                  <h3>Tarifs</h3>
                </div>
                <div className="inline-grid-2">
                  <div className="inline-field"><label>Prix par jour (DH)</label><input type="number" className="inline-input" value={manualFormData.price_per_day} onChange={(e) => handleManualFormChange("price_per_day", parseFloat(e.target.value) || 0)} /></div>
                  <div className="inline-field"><label>Montant total (DH)</label><input type="number" className="inline-input" value={manualFormData.total_price} onChange={(e) => handleManualFormChange("total_price", parseFloat(e.target.value) || 0)} /></div>
                  <div className="inline-field"><label>Montant payé (DH)</label><input type="number" className="inline-input" value={manualFormData.amount_paid} onChange={(e) => handleManualFormChange("amount_paid", parseFloat(e.target.value) || 0)} /></div>
                </div>
              </div>

              <div className="inline-section">
                <div className="inline-section-header">
                  <Info size={18} />
                  <h3>Notes supplémentaires</h3>
                </div>
                <textarea className="inline-input" rows="3" value={manualFormData.notes} onChange={(e) => handleManualFormChange("notes", e.target.value)} placeholder="Notes..." style={{ resize: "vertical" }}></textarea>
              </div>
            </div>
          </div>

          <div style={{ display: "none" }}>
            <ManualContract
              formData={manualFormData}
              signatures={contractSignatures}
              paperwork={contractPaperwork}
              displayOptions={contractDisplayOptions}
              currentUser={currentUser}
            />
          </div>

          <div className="inline-form-footer">
            <button className="inline-secondary-btn" onClick={() => setManualContractOpen(false)}>
              Annuler
            </button>
            <button className="inline-primary-btn" onClick={generateManualContractPDF}>
              <Printer size={16} /> Voir et imprimer le contrat
            </button>
          </div>
        </div>

        <style>{`
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
          .inline-form-footer {
            display: flex;
            justify-content: flex-end;
            gap: 16px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            margin-top: 24px;
          }
          .checkbox-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            cursor: pointer;
          }
          .display-options-panel {
            background: #f8fafc;
            border-radius: 24px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid #e2e8f0;
          }
          .display-options-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
            margin-bottom: 1rem;
          }
          .reset-all-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 2rem;
            cursor: pointer;
            font-size: 0.75rem;
          }
          .display-options-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 0.75rem;
          }
          .display-option-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem;
            background: white;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
          }
          .display-option-label {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
          }
          .display-option-buttons {
            display: flex;
            gap: 0.25rem;
          }
          .mode-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0.25rem 0.5rem;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            cursor: pointer;
          }
          .mode-btn.active {
            background: #0f172a;
            border-color: #0f172a;
            color: white;
          }
          @media (max-width: 1024px) {
            .inline-form-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 768px) {
            .inline-form-container { margin: 1rem; }
            .inline-form-header { padding: 16px 20px; }
            .inline-form-header h2 { font-size: 1.25rem; }
            .inline-form { padding: 20px; }
            .inline-grid-2 { grid-template-columns: 1fr; }
          }
          @media (prefers-color-scheme: dark) {
            .inline-form-container { background: #1e293b; border-color: #334155; }
            .inline-section { background: #0f172a; border-color: #334155; }
            .inline-section-header h3 { color: #f1f5f9; }
            .inline-field label { color: #94a3b8; }
            .inline-input, .inline-select { background: #0f172a; border-color: #334155; color: #f1f5f9; }
            .display-options-panel { background: #0f172a; border-color: #334155; }
            .display-option-item { background: #1e293b; border-color: #475569; }
            .mode-btn { background: #334155; border-color: #475569; color: #cbd5e1; }
            .mode-btn.active { background: #eab308; color: #0f172a; }
            .inline-secondary-btn { background: #1e293b; border-color: #475569; color: #cbd5e1; }
            .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
          }
        `}</style>
      </div>
    );
  }

  // Main dashboard render
  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; }

        .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 1rem; }
        .loading-spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #eab308; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .dashboard { max-width: 1400px; }

        /* ===== FILTER TOOLBAR ===== */
        .filter-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          background: #f1f5f9;
          border-radius: 2rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.02);
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          justify-content: space-between;
        }
        .filter-toolbar .filter-nav {
          display: flex;
          gap: 0.25rem;
        }
        .filter-toolbar .filter-nav-btn {
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
          color: #7f1d1d;
        }
        .filter-toolbar .filter-nav-btn:hover {
          background: #fef3c7;
          border-color: #d97706;
        }
        .filter-toolbar .filter-main {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .filter-toolbar .filter-main .calendar-icon {
          color: #64748b;
          display: flex;
          align-items: center;
          margin-right: 0.25rem;
        }

        /* Custom filter dropdown */
        .filter-dropdown-wrapper {
          position: relative;
          display: inline-block;
        }
        .filter-dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.75rem;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 2rem;
          font-size: 0.8rem;
          font-weight: 500;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.15s ease;
          height: 2.2rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
          white-space: nowrap;
        }
        .filter-dropdown-trigger:hover {
          border-color: #d4af37;
          background: #fefcf5;
        }
        .filter-dropdown-icon {
          color: #64748b;
        }
        .filter-dropdown-label {
          font-weight: 500;
        }
        .filter-dropdown-chevron {
          color: #94a3b8;
          transition: transform 0.2s ease;
        }
        .filter-dropdown-chevron.open {
          transform: rotate(180deg);
        }
        .filter-dropdown-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          left: 0;
          min-width: 160px;
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          overflow: hidden;
          z-index: 1001;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .filter-dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.5rem 0.875rem;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.75rem;
          color: #334155;
          transition: all 0.15s ease;
          text-align: left;
        }
        .filter-dropdown-item:hover {
          background: #f8fafc;
        }
        .filter-dropdown-item.active {
          background: #fef3c7;
          color: #d97706;
        }
        .filter-dropdown-item .item-label {
          flex: 1;
          font-weight: 500;
        }
        .filter-dropdown-item .item-check {
          color: #eab308;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 2rem;
          background: white;
          padding: 1rem 1.5rem;
          border-radius: 1rem;
          border: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }

        .header-title-section {
          display: flex;
          flex-direction: column;
        }

        .dashboard-title { font-size: 1.25rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; margin: 0; }
        .dashboard-subtitle { font-size: 0.7rem; color: #64748b; margin-top: 0.125rem; }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .revenue-card { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); border-radius: 2rem; padding: 0.5rem 1.25rem; display: flex; align-items: center; gap: 0.75rem; box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3); }
        .revenue-label { font-size: 0.6rem; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px; }
        .revenue-value { font-size: 1rem; font-weight: 700; line-height: 1.2; }

        .contract-manual-btn { background: linear-gradient(135deg, #1e293b, #0f172a); border: 1px solid #eab308; color: #eab308; border-radius: 2rem; padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500; font-size: 0.75rem; transition: all 0.2s; }
        .contract-manual-btn:hover { background: linear-gradient(135deg, #334155, #1e293b); transform: translateY(-1px); }

        .stats-section { margin-bottom: 1.5rem; }
        .stats-category { margin-bottom: 1.5rem; }
        .category-title { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #eab308; display: inline-flex; align-items: center; gap: 0.5rem; }
        .category-icon { color: #eab308; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }

        .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; transition: all 0.2s ease; position: relative; overflow: hidden; cursor: pointer; }
        .stat-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 20px 25px -12px rgba(0,0,0,0.1); }
        .stat-card-bg { position: absolute; top: -1.5rem; right: -1.5rem; width: 5rem; height: 5rem; border-radius: 50%; opacity: 0.1; transition: opacity 0.2s; }
        .stat-card:hover .stat-card-bg { opacity: 0.2; }

        .stat-icon { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; display: flex; align-items: center; justify-content: center; margin-bottom: 0.75rem; color: white; position: relative; z-index: 1; }
        .stat-icon-blue { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
        .stat-icon-amber { background: linear-gradient(135deg, #f59e0b, #ea580c); }
        .stat-icon-emerald { background: linear-gradient(135deg, #10b981, #14b8a6); }
        .stat-icon-red { background: linear-gradient(135deg, #ef4444, #f43f5e); }
        .stat-icon-purple { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
        .stat-icon-indigo { background: linear-gradient(135deg, #6366f1, #818cf8); }
        .stat-icon-pink { background: linear-gradient(135deg, #ec489a, #f472b6); }
        .stat-icon-teal { background: linear-gradient(135deg, #14b8a6, #2dd4bf); }
        .stat-icon-orange { background: linear-gradient(135deg, #f97316, #fb923c); }
        .stat-icon-cyan { background: linear-gradient(135deg, #06b6d4, #22d3ee); }

        .stat-value { font-size: 1.5rem; font-weight: 700; margin-top: 0.25rem; position: relative; z-index: 1; }
        .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; position: relative; z-index: 1; margin-top: 0.25rem; }
        .stat-subtitle { font-size: 0.6rem; color: #94a3b8; margin-top: 0.25rem; position: relative; z-index: 1; }

        .charts-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        .chart-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; transition: box-shadow 0.2s; }
        .chart-card:hover { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .chart-card-full { grid-column: span 2; }
        .chart-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .chart-subtitle { font-size: 0.7rem; color: #64748b; margin-bottom: 1rem; }

        .recent-card { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; margin-top: 1.5rem; }
        .recent-title { font-size: 1rem; font-weight: 600; margin-bottom: 0.25rem; }
        .recent-subtitle { font-size: 0.7rem; color: #64748b; margin-bottom: 1rem; }

        .table-wrapper { overflow-x: auto; }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
        .table th { text-align: left; padding: 0.75rem 0; color: #64748b; font-weight: 500; border-bottom: 1px solid #e2e8f0; }
        .table td { padding: 0.75rem 0; border-bottom: 1px solid #e2e8f0; }
        .table tr:last-child td { border-bottom: none; }

        .badge { display: inline-flex; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 500; }
        .badge-pending { background: rgba(234, 179, 8, 0.1); color: #ca8a04; }
        .badge-confirmed { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
        .badge-completed { background: rgba(59, 130, 242, 0.1); color: #2563eb; }
        .badge-retard { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
        .badge-contacted { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
        .badge-cancelled { background: rgba(100, 116, 139, 0.1); color: #475569; }
        .badge-warning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
        .badge-info { background: rgba(59, 130, 242, 0.1); color: #2563eb; }
        .badge-success { background: rgba(34, 197, 94, 0.1); color: #16a34a; }

        .text-warning { color: #d97706; }
        .text-success { color: #16a34a; }
        .font-mono { font-family: monospace; }

        /* Global Search */
        .global-search-container { position: relative; width: 420px; }
        .global-search-wrapper { display: flex; align-items: center; gap: 0.5rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 2rem; padding: 0.375rem 0.75rem; transition: all 0.2s; }
        .global-search-wrapper:focus-within { border-color: #eab308; box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1); background: white; }
        .global-search-icon { color: #94a3b8; display: flex; align-items: center; flex-shrink: 0; }
        .global-search-input { flex: 1; border: none; outline: none; font-size: 0.75rem; background: transparent; min-width: 180px; }
        .global-search-input::placeholder { color: #94a3b8; font-size: 0.7rem; }
        .search-type-dropdown { position: relative; flex-shrink: 0; }
        .search-type-trigger { display: flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.625rem; background: #e2e8f0; border: none; border-radius: 1.5rem; cursor: pointer; font-size: 0.7rem; font-weight: 500; color: #1e293b; transition: all 0.2s ease; white-space: nowrap; }
        .search-type-trigger:hover { background: #cbd5e1; }
        .trigger-icon { display: flex; align-items: center; }
        .trigger-label { font-weight: 600; }
        .trigger-chevron { transition: transform 0.2s ease; color: #64748b; }
        .trigger-chevron.open { transform: rotate(180deg); }
        .search-type-menu { position: absolute; top: calc(100% + 0.5rem); right: 0; min-width: 160px; background: white; border-radius: 0.75rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; overflow: hidden; z-index: 1001; animation: slideDown 0.2s ease; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .search-type-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.5rem 0.875rem; background: transparent; border: none; cursor: pointer; font-size: 0.75rem; color: #334155; transition: all 0.15s ease; text-align: left; }
        .search-type-item:hover { background: #f8fafc; }
        .search-type-item.active { background: #fef3c7; color: #d97706; }
        .item-icon { display: flex; align-items: center; width: 20px; }
        .item-label { flex: 1; font-weight: 500; }
        .item-check { color: #eab308; }
        .global-search-clear { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0.25rem; display: flex; align-items: center; border-radius: 50%; flex-shrink: 0; }
        .global-search-clear:hover { background: #f1f5f9; color: #64748b; }
        .global-search-results { position: absolute; top: calc(100% + 0.5rem); left: 0; right: 0; background: white; border-radius: 1rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; z-index: 1000; max-height: 400px; overflow-y: auto; }
        .search-loading { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 1rem; color: #64748b; }
        .loading-spinner-small { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #eab308; border-radius: 50%; animation: spin 0.8s linear infinite; }
        .search-results-header { padding: 0.5rem 1rem; border-bottom: 1px solid #e2e8f0; font-size: 0.65rem; color: #64748b; }
        .search-results-list { max-height: 350px; overflow-y: auto; }
        .search-result-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; cursor: pointer; transition: background 0.2s; border-bottom: 1px solid #f1f5f9; }
        .search-result-item:hover { background: #f8fafc; }
        .search-result-item.selected { background: #fef3c7; }
        .result-icon { width: 28px; height: 28px; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .result-content { flex: 1; min-width: 0; }
        .result-title { font-size: 0.75rem; font-weight: 600; color: #1e293b; }
        .result-subtitle { font-size: 0.6rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .result-type-badge { padding: 0.125rem 0.375rem; border-radius: 0.375rem; font-size: 0.55rem; font-weight: 600; flex-shrink: 0; }
        .search-no-results { padding: 1rem; text-align: center; color: #64748b; font-size: 0.75rem; }

        /* Report Styles */
        .report-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
        .report-modal { background: white; border-radius: 1.5rem; width: 95%; max-width: 1200px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideInUp 0.3s ease-out; }
        .report-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
        .report-modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #1e293b; }
        .report-modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .report-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .report-table-container { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 0.75rem; margin-top: 1rem; }
        .report-table { width: 100%; border-collapse: collapse; font-size: 0.813rem; }
        .report-table th { background: #f1f5f9; padding: 0.75rem; text-align: left; font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0; }
        .report-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
        .report-input { width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; font-size: 0.813rem; transition: all 0.2s; }
        .report-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        .saved-reports-section { margin-top: 2rem; padding: 1.25rem; background: white; border-radius: 1.25rem; border: 1px solid #e2e8f0; }
        .saved-reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem; }
        .saved-report-card { background: #f8fafc; border-radius: 1rem; padding: 1rem; border: 1px solid #e2e8f0; transition: all 0.2s; cursor: default; }
        .saved-report-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-color: #3b82f6; }
        .saved-report-title { font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.875rem; }
        .saved-report-meta { font-size: 0.7rem; color: #64748b; display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .action-btn { background: transparent; border: none; padding: 0.25rem; border-radius: 0.5rem; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .action-btn:hover { background: #e2e8f0; }
        .action-btn.edit:hover { color: #8b5cf6; }
        .action-btn.delete:hover { color: #ef4444; }
        .edit-modal-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; }
        .edit-modal-container { background: white; border-radius: 1.5rem; width: 95%; max-width: 1000px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: slideInUp 0.3s ease-out; }
        .edit-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e2e8f0; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); }
        .edit-modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; color: #1e293b; }
        .edit-modal-body { flex: 1; overflow-y: auto; padding: 1.5rem; }
        .edit-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e2e8f0; background: #f8fafc; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
        .btn-outline { background: white; border: 1px solid #e2e8f0; color: #1e293b; }
        .btn-outline:hover { background: #f8fafc; border-color: #94a3b8; }
        .btn-primary { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; box-shadow: 0 2px 4px rgba(59,130,246,0.2); }
        .btn-primary:hover { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59,130,246,0.3); }
        .btn-secondary { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; }
        .btn-secondary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,92,246,0.3); }
        .summary-box { background: #f8fafc; border-radius: 0.75rem; padding: 0.75rem; margin-top: 1rem; display: flex; justify-content: flex-end; }
        .spinning { animation: spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        /* Modal Styles */
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 1200px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideInUp 0.3s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 0 1.5rem; position: sticky; top: 0; background: white; z-index: 10; border-bottom: 1px solid #e2e8f0; }
        .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: #e2e8f0; }

        .client-detail-modal, .matricule-detail-modal { background: white; border-radius: 1.5rem; max-width: 1000px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideInUp 0.3s ease; }

        .client-info-section { display: flex; gap: 1.5rem; padding: 1.5rem; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap; }
        .client-avatar { flex-shrink: 0; }
        .avatar-initials { width: 5rem; height: 5rem; border-radius: 50%; background: linear-gradient(135deg, #eab308, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 700; color: white; }
        .client-details { flex: 1; }
        .client-details h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .client-contact-info { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; font-size: 0.875rem; color: #475569; }
        .client-contact-info span { display: flex; align-items: center; gap: 0.25rem; }
        .client-id-info { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.75rem; color: #64748b; }
        .client-id-info span { display: flex; align-items: center; gap: 0.25rem; }
        .client-summary { display: flex; gap: 1.5rem; padding: 0.75rem 1rem; background: #f8fafc; border-radius: 1rem; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 1.25rem; font-weight: 700; color: #1e293b; }
        .summary-label { font-size: 0.7rem; color: #64748b; }

        .matricule-info-section { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .matricule-code-large { font-size: 2rem; font-weight: 700; font-family: monospace; color: #eab308; margin-bottom: 1rem; }
        .matricule-details { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
        .detail-row { font-size: 0.875rem; }
        .detail-label { font-weight: 600; color: #64748b; margin-right: 0.5rem; }
        .current-reservation-card { background: #fef3c7; border-radius: 0.75rem; padding: 0.75rem 1rem; margin-top: 1rem; }
        .current-label { font-weight: 600; color: #d97706; margin-bottom: 0.25rem; }
        .current-client, .current-dates { font-size: 0.875rem; color: #78350f; }

        .status-dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; margin-right: 0.5rem; }
        .status-active { background: #10b981; }
        .status-inactive { background: #ef4444; }

        .client-tabs, .matricule-tabs { display: flex; gap: 0.5rem; padding: 0 1.5rem; border-bottom: 1px solid #e2e8f0; }
        .tab-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: #64748b; transition: all 0.2s; border-bottom: 2px solid transparent; }
        .tab-btn:hover { color: #1e293b; }
        .tab-btn.active { color: #eab308; border-bottom-color: #eab308; }

        .client-tab-content, .matricule-tab-content { padding: 1.5rem; }
        .list-header { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; padding: 0.5rem 0; font-size: 0.7rem; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
        .list-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.5rem; padding: 0.75rem 0; font-size: 0.75rem; border-bottom: 1px solid #f1f5f9; align-items: center; }
        .empty-state { text-align: center; padding: 2rem; color: #94a3b8; }
        .show-more-btn { display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem; padding: 0.5rem 1rem; background: #f1f5f9; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 0.75rem; color: #475569; transition: all 0.2s; }
        .show-more-btn:hover { background: #e2e8f0; }

        .total-remaining-card { background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 1rem; padding: 1rem; margin-bottom: 1rem; text-align: center; }
        .total-remaining-label { font-size: 0.75rem; color: #92400e; }
        .total-remaining-value { font-size: 1.5rem; font-weight: 700; color: #d97706; }

        /* Report paper styles */
        .report-paper {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px 28px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          font-size: 13px;
          color: #1a2c3e;
        }

        .report-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .report-controls input[type="number"] {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
        }

        .report-line-count {
          margin-left: auto;
          font-size: 12px;
          color: #64748b;
        }

        .report-summary {
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 16px;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          margin-top: 16px;
        }

        .report-summary-label {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
        }

        .report-summary-value {
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .report-paper-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          text-align: center;
        }

        /* ===== NEW & IMPROVED MATRICULE CARDS ===== */
        .matricule-category-card {
          background: white;
          border-radius: 16px;
          border: 1px solid #e9edf2;
          overflow: hidden;
          transition: all 0.25s ease;
          flex: 1 1 300px;
          min-width: 280px;
          max-width: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        .matricule-category-card:hover {
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .matricule-category-card .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.15s ease;
          background: #fcfcfd;
        }
        .matricule-category-card .card-header:hover {
          background: #f8fafc;
        }
        .matricule-category-card .card-title {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
        }
        .matricule-category-card .card-badge {
          background: #eab308;
          color: white;
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.15rem 0.6rem;
          border-radius: 1rem;
          margin-left: 0.3rem;
        }
        .matricule-category-card .card-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .matricule-category-card .card-count {
          background: #e9edf2;
          padding: 0.1rem 0.7rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #475569;
        }
        .matricule-category-card .card-dropdown {
          padding: 4px 16px 16px 16px;
          border-top: 1px solid #e9edf2;
          background: white;
        }
        /* Search bar inside dropdown */
        .matricule-category-card .dropdown-search {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #f8fafc;
          border: 1px solid #e9edf2;
          border-radius: 2rem;
          padding: 0.25rem 0.75rem;
          margin-bottom: 1rem;
          transition: all 0.2s ease;
        }
        .matricule-category-card .dropdown-search:focus-within {
          border-color: #eab308;
          box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1);
          background: white;
        }
        .matricule-category-card .dropdown-search .search-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }
        .matricule-category-card .dropdown-search input {
          flex: 1;
          border: none;
          outline: none;
          font-size: 0.8rem;
          padding: 0.4rem 0;
          background: transparent;
          color: #1e293b;
          min-width: 120px;
        }
        .matricule-category-card .dropdown-search input::placeholder {
          color: #94a3b8;
        }
        .matricule-category-card .dropdown-search .clear-search {
          color: #94a3b8;
          cursor: pointer;
          flex-shrink: 0;
          padding: 0.2rem;
          border-radius: 50%;
          transition: all 0.15s ease;
        }
        .matricule-category-card .dropdown-search .clear-search:hover {
          background: #e9edf2;
          color: #475569;
        }

        .matricule-category-card .dropdown-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 320px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar {
          width: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .matricule-category-card .dropdown-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .matricule-category-card .dropdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          background: #f8fafc;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          flex-wrap: wrap;
          gap: 0.5rem;
          transition: all 0.15s ease;
        }
        .matricule-category-card .dropdown-item:hover {
          background: #f1f5f9;
          border-color: #e2e8f0;
        }
        .matricule-category-card .item-info {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          flex-wrap: wrap;
          font-size: 0.8rem;
        }
        .matricule-category-card .item-code {
          font-weight: 700;
          color: #0f172a;
          font-family: monospace;
          background: #e9edf2;
          padding: 0.1rem 0.5rem;
          border-radius: 0.5rem;
        }
        .matricule-category-card .item-car {
          color: #475569;
        }
        .matricule-category-card .item-km {
          color: #64748b;
          font-size: 0.7rem;
          background: #e9edf2;
          padding: 0.1rem 0.4rem;
          border-radius: 0.5rem;
        }
        .matricule-category-card .item-client {
          background: #dbeafe;
          padding: 0.1rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.65rem;
          color: #1d4ed8;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          white-space: nowrap;
        }
        .matricule-category-card .item-end-date {
          font-size: 0.6rem;
          color: #3b82f6;
          margin-left: 0.25rem;
          font-weight: 500;
        }
        .matricule-category-card .item-actions {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }
        .matricule-category-card .btn-reserve {
          background: #eab308;
          border: none;
          color: white;
          padding: 0.2rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }
        .matricule-category-card .btn-reserve:hover {
          background: #ca8a04;
        }
        .matricule-category-card .btn-confirm {
          background: #22c55e;
          border: none;
          color: white;
          padding: 0.2rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .matricule-category-card .btn-confirm:hover {
          background: #16a34a;
        }
        .matricule-category-card .btn-cancel {
          background: #ef4444;
          border: none;
          color: white;
          padding: 0.2rem 0.8rem;
          border-radius: 1.5rem;
          font-size: 0.65rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .matricule-category-card .btn-cancel:hover {
          background: #dc2626;
        }
        .matricule-category-card .return-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #fef3c7;
          color: #92400e;
          padding: 0.15rem 0.6rem;
          border-radius: 1rem;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .matricule-category-card .dropdown-footer {
          margin-top: 0.75rem;
          text-align: center;
        }
        .matricule-category-card .btn-show-more {
          background: transparent;
          border: none;
          color: #3b82f6;
          font-weight: 500;
          font-size: 0.8rem;
          cursor: pointer;
          padding: 0.3rem 1rem;
          border-radius: 1.5rem;
          transition: all 0.15s ease;
        }
        .matricule-category-card .btn-show-more:hover {
          background: #eff6ff;
          text-decoration: none;
        }
        .matricule-category-card .dropdown-loading,
        .matricule-category-card .dropdown-empty {
          padding: 0.75rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        /* Color accents */
        .matricule-category-card.blue .card-header { border-left: 4px solid #3b82f6; }
        .matricule-category-card.yellow .card-header { border-left: 4px solid #eab308; }
        .matricule-category-card.green .card-header { border-left: 4px solid #22c55e; }
        .matricule-category-card.red .card-header { border-left: 4px solid #ef4444; }
        .matricule-category-card.purple .card-header { border-left: 4px solid #8b5cf6; }

        .matricule-cards-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: flex-start;
        }

        /* Reserve Modal - custom client list */
        .client-list-container {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-top: 0.25rem;
        }
        .client-list-item {
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          border-bottom: 1px solid #f1f5f9;
          transition: background 0.15s;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .client-list-item:last-child {
          border-bottom: none;
        }
        .client-list-item:hover {
          background: #f8fafc;
        }
        .client-list-item.selected {
          background: #fef3c7;
        }
        .client-list-item .client-name {
          font-weight: 500;
        }
        .client-list-item .client-phone {
          font-size: 0.75rem;
          color: #64748b;
        }

        .form-group {
          margin-bottom: 1rem;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          font-size: 0.8rem;
          color: #475569;
          margin-bottom: 0.25rem;
        }
        .form-control {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }
        .form-control:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.1);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .charts-section { grid-template-columns: 1fr; }
          .chart-card-full { grid-column: span 1; }
          .stats-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
          .dashboard-header { flex-direction: column; align-items: stretch; }
          .global-search-container { max-width: 100%; width: 100%; }
          .header-actions { justify-content: flex-start; }
          .list-header, .list-row { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
          .global-search-input { min-width: 100px; }
          .trigger-label { display: none; }
          .search-type-trigger { padding: 0.25rem 0.5rem; }
          .client-info-section { flex-direction: column; align-items: center; text-align: center; }
          .client-contact-info { justify-content: center; }
          .client-id-info { justify-content: center; }
          .client-summary { width: 100%; justify-content: center; }
          .matricule-category-card {
            flex: 1 1 100%;
            min-width: unset;
          }
          .matricule-category-card .dropdown-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          .matricule-category-card .item-info {
            gap: 0.5rem;
          }
          .matricule-category-card .item-actions {
            width: 100%;
          }
          .matricule-category-card .btn-reserve,
          .matricule-category-card .btn-confirm,
          .matricule-category-card .btn-cancel {
            width: 100%;
            text-align: center;
            justify-content: center;
          }
          .filter-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.5rem;
            padding: 0.75rem;
            border-radius: 1.5rem;
          }
          .filter-toolbar .filter-main {
            justify-content: center;
            flex-wrap: wrap;
          }
          .filter-toolbar .filter-nav {
            justify-content: center;
          }
          .filter-dropdown-wrapper {
            flex: 1;
            min-width: 120px;
          }
          .filter-dropdown-trigger {
            width: 100%;
            justify-content: center;
          }
        }
        @media (prefers-color-scheme: dark) {
          body { background: #0f172a; }
          .stat-card, .chart-card, .recent-card, .modal, .client-detail-modal, .matricule-detail-modal, .dashboard-header,
          .report-modal, .edit-modal-container, .saved-reports-section { background: #1e293b; border-color: #334155; }
          .stat-label, .chart-subtitle, .recent-subtitle, .table th, .text-muted, .dashboard-subtitle,
          .saved-report-meta, .summary-box { color: #94a3b8; }
          .dashboard-title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; }
          .global-search-wrapper { background: #0f172a; border-color: #334155; }
          .global-search-wrapper:focus-within { background: #1e293b; }
          .search-type-trigger { background: #334155; color: #f1f5f9; }
          .search-type-trigger:hover { background: #475569; }
          .search-type-menu { background: #1e293b; border-color: #334155; }
          .search-type-item { color: #cbd5e1; }
          .search-type-item:hover { background: #334155; }
          .search-type-item.active { background: #422006; color: #fbbf24; }
          .global-search-input { color: #f1f5f9; }
          .global-search-results { background: #1e293b; border-color: #334155; }
          .result-title { color: #f1f5f9; }
          .search-result-item:hover { background: #334155; }
          .search-result-item.selected { background: #422006; }
          .client-summary { background: #0f172a; }
          .summary-value { color: #f1f5f9; }
          .current-reservation-card { background: #422006; }
          .current-label { color: #fbbf24; }
          .current-client, .current-dates { color: #fde68a; }
          .total-remaining-card { background: linear-gradient(135deg, #422006, #451a03); }
          .total-remaining-label { color: #fde68a; }
          .total-remaining-value { color: #fbbf24; }
          .report-modal-header, .edit-modal-header { background: #1e293b; border-color: #334155; }
          .report-modal-title, .edit-modal-title { color: #f1f5f9; }
          .report-table th { background: #0f172a; color: #94a3b8; }
          .report-table td { border-color: #334155; }
          .report-table tr td { color: #cbd5e1; }
          .report-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .report-input:focus { border-color: #3b82f6; }
          .report-modal-footer, .edit-modal-footer { background: #0f172a; border-color: #334155; }
          .saved-report-card { background: #0f172a; border-color: #334155; }
          .saved-report-title { color: #f1f5f9; }
          .btn-outline { background: #1e293b; border-color: #475569; color: #cbd5e1; }
          .btn-outline:hover { background: #334155; border-color: #64748b; }
          .modal-header { background: #1e293b; border-color: #334155; }
          .modal-title { color: #f1f5f9; }
          .modal-close { background: #334155; color: #cbd5e1; }
          .modal-close:hover { background: #475569; }
          .report-paper { background: #1e293b; border-color: #334155; color: #e2e8f0; }
          .report-paper .contract-header-table { border-bottom-color: #d4af37; }
          .report-paper .company-name { color: #f1f5f9; }
          .report-paper .company-slogan { color: #d4af37; }
          .report-paper .company-phone { color: #94a3b8; }
          .report-paper .contract-number-box { background: #fefce857; color: #1a1a2e; }
          .report-paper .contract-number-label { color: #92400e; }
          .report-paper .arabic-text { color: #94a3b8; }
          .report-paper .contract-title-print { color: #f1f5f9; border-bottom-color: #334155; }
          .report-controls input[type="number"] { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .report-summary { background: #0f172a; }
          .report-summary-label { color: #94a3b8; }
          .report-summary-value { color: #34d399; }
          .report-paper-footer { border-top-color: #334155; color: #64748b; }
          .report-table th { background: #0f172a; }
          .report-table td { border-bottom-color: #334155; }
          .report-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .report-input:focus { border-color: #d4af37; }

          /* Dark mode matricule cards */
          .matricule-category-card { background: #1e293b; border-color: #334155; }
          .matricule-category-card .card-header { background: #1e293b; }
          .matricule-category-card .card-header:hover { background: #0f172a; }
          .matricule-category-card .card-title { color: #f1f5f9; }
          .matricule-category-card .card-count { background: #334155; color: #cbd5e1; }
          .matricule-category-card .card-dropdown { background: #1e293b; border-color: #334155; }
          .matricule-category-card .dropdown-item { background: #0f172a; border-color: #334155; }
          .matricule-category-card .dropdown-item:hover { background: #334155; border-color: #475569; }
          .matricule-category-card .item-code { color: #f1f5f9; background: #334155; }
          .matricule-category-card .item-car { color: #94a3b8; }
          .matricule-category-card .item-km { color: #64748b; background: #334155; }
          .matricule-category-card .item-client { background: #1e3a5f; color: #60a5fa; }
          .matricule-category-card .item-end-date { color: #60a5fa; }
          .matricule-category-card .days-left-badge { background: #422006; color: #fbbf24; }
          .matricule-category-card .btn-reserve { background: #ca8a04; }
          .matricule-category-card .btn-reserve:hover { background: #a16207; }
          .matricule-category-card .btn-confirm { background: #16a34a; }
          .matricule-category-card .btn-confirm:hover { background: #15803d; }
          .matricule-category-card .btn-cancel { background: #dc2626; }
          .matricule-category-card .btn-cancel:hover { background: #b91c1c; }
          .matricule-category-card .return-badge { background: #422006; color: #fbbf24; }
          .matricule-category-card .btn-show-more { color: #60a5fa; }
          .matricule-category-card .btn-show-more:hover { background: #1e3a5f; }
          .matricule-category-card .dropdown-search { background: #0f172a; border-color: #334155; }
          .matricule-category-card .dropdown-search:focus-within { background: #1e293b; border-color: #eab308; }
          .matricule-category-card .dropdown-search input { color: #f1f5f9; }
          .matricule-category-card .dropdown-search input::placeholder { color: #64748b; }

          .form-control { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .form-control:focus { border-color: #eab308; }
          .form-group label { color: #94a3b8; }
          .client-list-item { border-bottom-color: #334155; }
          .client-list-item:hover { background: #334155; }
          .client-list-item.selected { background: #422006; }
          .client-list-item .client-phone { color: #94a3b8; }

          .filter-toolbar { background: #1e293b; border-color: #334155; }
          .filter-toolbar .filter-nav-btn { background: #0f172a; border-color: #334155; color: #fca5a5; }
          .filter-toolbar .filter-nav-btn:hover { background: #422006; border-color: #d97706; }
          .filter-dropdown-trigger { background: #0f172a; border-color: #334155; color: #f1f5f9; }
          .filter-dropdown-trigger:hover { border-color: #d4af37; background: #1e293b; }
          .filter-dropdown-menu { background: #1e293b; border-color: #334155; }
          .filter-dropdown-item { color: #cbd5e1; }
          .filter-dropdown-item:hover { background: #334155; }
          .filter-dropdown-item.active { background: #422006; color: #fbbf24; }
          .filter-dropdown-icon { color: #94a3b8; }
          .filter-dropdown-chevron { color: #64748b; }
          .filter-toolbar .calendar-icon { color: #94a3b8; }
        }
      `}</style>

      <div className="dashboard">
        {/* ===== FILTER TOOLBAR ===== */}
        <div className="filter-toolbar">
          <div className="filter-nav">
            <button className="filter-nav-btn" aria-label="Précédent" onClick={() => {}}>
              <ChevronLeft size={18} />
            </button>
            <button className="filter-nav-btn" aria-label="Suivant" onClick={() => {}}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="filter-main">
            <span className="calendar-icon">
              <Calendar size={16} />
            </span>
            <FilterDropdown
              options={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
              label="Mois"
            />
            <FilterDropdown
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
              label="Année"
            />
            <FilterDropdown
              options={periodOptions}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              label="Période"
            />
          </div>
          <div style={{ width: '2.2rem' }}></div>
        </div>

        {/* ====== HEADER ====== */}
        <div className="dashboard-header">
          <div className="header-title-section">
            <h1 className="dashboard-title">Tableau de bord</h1>
            <p className="dashboard-subtitle">Vue d'ensemble de votre activité de location</p>
          </div>
          <div className="header-actions">
            <GlobalSearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchResults={searchResults}
              loading={searchLoading}
              selectedResult={selectedClient || selectedMatricule}
              onSelectResult={handleSelectResult}
              onClear={handleClearSearch}
              searchType={searchType}
              setSearchType={setSearchType}
            />
            <button className="contract-manual-btn" onClick={() => setReportModalOpen(true)}>
              <FileText size={16} /> Rapport manuel
            </button>
            <button className="contract-manual-btn" onClick={() => setManualContractOpen(true)}>
              <FileText size={16} /> Contrat Manuel
            </button>
            <div className="revenue-card">
              <TrendingUp size={20} />
              <div>
                <div className="revenue-label">Revenu confirmé</div>
                <div className="revenue-value">{revenue.toLocaleString()} DH</div>
              </div>
            </div>
          </div>
        </div>

        {/* ====== STATS SECTIONS ====== */}
        <div className="stats-section">
          <div className="category-title"><Car size={18} className="category-icon" /> Parc Automobile</div>
          <div className="stats-grid">
            <StatCard icon={CheckCircle} title="Disponibles" value={disponibles} subtitle="Prêtes à la location" color="emerald" onClick={() => navigateToCars('disponible')} />
            <StatCard icon={XCircle} title="Indisponibles" value={indisponibles} subtitle="Maintenance ou accidents" color="red" onClick={() => navigateToCars('non disponible')} />
            <StatCard icon={Wrench} title="Visites Techniques" value={visitesTechniques} subtitle="Dans les 30 jours" color="orange" onClick={() => navigateToMatricules()} />
            <StatCard icon={GaugeIcon} title="Vidanges" value={vidangesNeeded} subtitle="À effectuer" color="purple" onClick={() => navigateToMatricules()} />
          </div>
        </div>

        {/* ====== GESTION DES IMMATRICULATIONS ====== */}
        <div className="stats-section">
          <div className="category-title"><CreditCard size={18} className="category-icon" /> Gestion des Immatriculations</div>
          <div className="matricule-cards-grid">
            <MatriculeCategoryCard
              title="Disponibles"
              icon={CarFront}
              color="blue"
              matricules={disponiblesWithRes}
              onReserve={handleReserveClick}
              onConfirmDirect={handleDirectConfirm}
              expanded={expandedCategories.disponibles}
              onToggleExpand={() => toggleCategory('disponibles')}
              badge={disponiblesWithRes.length}
            />
            <MatriculeCategoryCard
              title="En attente de confirmation"
              icon={ClockIcon}
              color="yellow"
              matricules={enAttenteWithRes}
              onConfirm={handleConfirmPending}
              onCancel={handleCancelPending}
              expanded={expandedCategories.enAttente}
              onToggleExpand={() => toggleCategory('enAttente')}
              badge={enAttenteWithRes.length}
            />
            <MatriculeCategoryCard
              title="Retour imminent"
              icon={CalendarCheck}
              color="green"
              matricules={retourImminentWithRes}
              expanded={expandedCategories.retourImminent}
              onToggleExpand={() => toggleCategory('retourImminent')}
              badge={retourImminentWithRes.length}
            />
            <MatriculeCategoryCard
              title="En retard"
              icon={AlertOctagon}
              color="red"
              matricules={enRetardWithRes}
              expanded={expandedCategories.enRetard}
              onToggleExpand={() => toggleCategory('enRetard')}
              badge={enRetardWithRes.length}
            />
            <MatriculeCategoryCard
              title="En panne (Accident)"
              icon={AlertTriangle}
              color="purple"
              matricules={enPanneWithRes}
              expanded={expandedCategories.enPanne}
              onToggleExpand={() => toggleCategory('enPanne')}
              badge={enPanneWithRes.length}
            />
          </div>
        </div>

        {/* ====== Clients & Utilisateurs ====== */}
        <div className="stats-section">
          <div className="category-title"><Users size={18} className="category-icon" /> Clients & Utilisateurs</div>
          <div className="stats-grid">
            <StatCard icon={Users} title="Total Clients" value={totalClients} subtitle="Base de données" color="indigo" onClick={() => navigateToClients()} />
            <StatCard icon={UserCheck} title="Utilisateurs actifs" value={utilisateursActifs} subtitle="Personnel" color="cyan" onClick={() => navigateToUtilisateurs()} />
            <StatCard icon={MessageCircle} title="Messages de Contact" value={totalContacts} subtitle="Nouvelles demandes" color="pink" onClick={() => navigateToContacts()} />
          </div>
        </div>

        {/* ====== Réservations ====== */}
        <div className="stats-section">
          <div className="category-title"><Calendar size={18} className="category-icon" /> Réservations</div>
          <div className="stats-grid">
            <StatCard icon={CalendarCheck} title="Total Réservations" value={totalReservations} subtitle="Tous statuts" color="blue" onClick={() => navigateToReservations()} />
            <StatCard icon={ClockIcon} title="En Attente" value={reservationsEnAttente} subtitle="En attente de confirmation" color="amber" onClick={() => navigateToReservations('pending')} />
            <StatCard icon={CheckCircle2} title="Confirmées" value={reservationsConfirmees} subtitle="Locations actives" color="emerald" onClick={() => navigateToReservations('confirmed')} />
            <StatCard icon={CheckSquare} title="Terminées" value={reservationsTerminees} subtitle="Locations terminées" color="teal" onClick={() => navigateToReservations('completed')} />
            <StatCard icon={PhoneCall} title="Contactées" value={reservationsContactees} subtitle="Client contacté" color="purple" onClick={() => navigateToReservations('contacted')} />
            <StatCard icon={Ban} title="Annulées" value={reservationsAnnulees} subtitle="Réservations annulées" color="red" onClick={() => navigateToReservations('cancelled')} />
            <StatCard icon={AlertOctagon} title="En Retard" value={reservationsEnRetard} subtitle="Attention requise" color="red" onClick={() => navigateToReservations('retard')} />
          </div>
        </div>

        {/* ====== Sinistres ====== */}
        <div className="stats-section">
          <div className="category-title"><AlertTriangle size={18} className="category-icon" /> Sinistres</div>
          <div className="stats-grid">
            <StatCard icon={AlertTriangle} title="Total Accidents" value={totalAccidents} subtitle="Tous sinistres" color="red" onClick={() => navigateToAccidents()} />
            <StatCard icon={ClockIcon} title="En Attente" value={accidentsEnAttente} subtitle="À traiter" color="amber" onClick={() => navigateToAccidents()} />
          </div>
        </div>

        {/* ====== CHARTS ====== */}
        <div className="charts-section">
          <div className="chart-card chart-card-full">
            <h2 className="chart-title">Tendance mensuelle</h2>
            <p className="chart-subtitle">Réservations et revenus sur les 6 derniers mois</p>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={byMonth}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#eab308" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="reservationsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" stroke="#eab308" fontSize={12} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }} />
                <Legend />
                <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenu (DH)" stroke="#eab308" fill="url(#revenueGradient)" strokeWidth={2} />
                <Area yAxisId="left" type="monotone" dataKey="reservations" name="Réservations" stroke="#3b82f6" fill="url(#reservationsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h2 className="chart-title">Répartition des statuts</h2>
            <p className="chart-subtitle">Distribution des réservations</p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {byStatus.map((_, index) => (<Cell key={`cell-${index}`} fill={["#eab308","#3b82f6","#10b981","#ef4444","#8b5cf6","#ec489a"][index % 6]} />))}
                </Pie>
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                <Legend wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="charts-section">
          <div className="chart-card chart-card-full">
            <h2 className="chart-title">Top véhicules</h2>
            <p className="chart-subtitle">Les voitures les plus réservées</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCars} layout="vertical" margin={{ left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "0.5rem" }} />
                <Bar dataKey="count" name="Nombre de réservations" fill="#eab308" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-card">
            <h2 className="chart-title">Résumé rapide</h2>
            <p className="chart-subtitle">Indicateurs clés</p>
            <div style={{ padding: "1rem 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span className="text-muted">Taux d'occupation</span>
                <span className="font-semibold">{cars.length > 0 ? Math.round((reservationsConfirmees / totalCars) * 100) : 0}%</span>
              </div>
              <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "1.5rem" }}>
                <div style={{ width: `${cars.length > 0 ? (reservationsConfirmees / totalCars) * 100 : 0}%`, height: "100%", background: "#eab308", borderRadius: "4px" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                <span className="text-muted">Taux de conversion</span>
                <span className="font-semibold">{totalReservations > 0 ? Math.round(((reservationsConfirmees + reservationsTerminees) / totalReservations) * 100) : 0}%</span>
              </div>
              <div style={{ height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden", marginBottom: "1.5rem" }}>
                <div style={{ width: `${totalReservations > 0 ? ((reservationsConfirmees + reservationsTerminees) / totalReservations) * 100 : 0}%`, height: "100%", background: "#3b82f6", borderRadius: "4px" }}></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="text-muted">Revenu moyen / réservation</span>
                <span className="font-semibold">{reservationsConfirmees + reservationsTerminees > 0 ? Math.round(revenue / (reservationsConfirmees + reservationsTerminees)).toLocaleString() : 0} DH</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Recent Reservations Table ====== */}
        <div className="recent-card">
          <h2 className="recent-title">Réservations récentes</h2>
          <p className="recent-subtitle">Les 6 dernières réservations enregistrées</p>
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Client</th><th>Véhicule</th><th>Période</th><th>Total</th><th>Statut</th></tr>
              </thead>
              <tbody>
                {[...filteredReservations].sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date)).slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.client?.prenom ? `${r.client.prenom} ${r.client.nom}` : "—"}</td>
                    <td className="text-muted">{r.cars?.brand} {r.cars?.model}</td>
                    <td className="text-muted text-xs">{r.start_date} → {r.end_date}</td>
                    <td className="font-semibold">{r.total_price} DH</td>
                    <td><span className={`badge ${r.status === "pending" ? "badge-pending" : r.status === "confirmed" ? "badge-confirmed" : r.status === "completed" ? "badge-completed" : r.status === "retard" ? "badge-retard" : r.status === "contacted" ? "badge-contacted" : "badge-cancelled"}`}>{r.status === "retard" ? "En retard" : r.status === "pending" ? "En attente" : r.status === "confirmed" ? "Confirmé" : r.status === "contacted" ? "Contacté" : r.status === "completed" ? "Terminé" : "Annulé"}</span></td>
                  </tr>
                ))}
                {filteredReservations.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted">Aucune réservation pour la période sélectionnée</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ====== SAVED REPORTS SECTION ====== */}
        <SavedReportsSection
          onEditReport={(report) => setEditReport(report)}
          refreshTrigger={refreshReports}
        />

        {/* ====== MODALS ====== */}
        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            reservations={reservations}
            accidents={accidents}
            matricules={matricules}
            payments={[]}
          />
        )}

        {selectedMatricule && (
          <MatriculeDetailModal
            matricule={selectedMatricule}
            onClose={() => setSelectedMatricule(null)}
            reservations={reservations}
            accidents={accidents}
            currentReservation={selectedMatricule.currentReservation}
          />
        )}

        <MultiRowReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          onReportSaved={() => setRefreshReports(prev => prev + 1)}
        />

        <EditReportModal
          isOpen={!!editReport}
          onClose={() => setEditReport(null)}
          report={editReport}
          onReportSaved={() => { setRefreshReports(prev => prev + 1); setEditReport(null); }}
          reservations={reservations}   // <-- Pass reservations for payment registration
        />

        <ReserveModal
          isOpen={reserveModalOpen}
          onClose={() => setReserveModalOpen(false)}
          matricule={selectedMatriculeForReserve}
          clients={clients}
          cars={cars}  
          onConfirm={handleConfirmReservation}
        />

        <DirectConfirmModal
          isOpen={confirmDirectModalOpen}
          onClose={() => setConfirmDirectModalOpen(false)}
          matricule={selectedMatriculeForDirectConfirm}
          clients={clients}
          cars={cars} 
          onConfirm={handleDirectConfirmReservation}
        />
      </div>
    </>
  );
}