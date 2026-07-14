// src/pages/admin/AdminReservationsStatus.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { useStore } from 'react-redux';
import {
  fetchReservations, fetchCars, fetchMatricules, fetchClients,
  updateReservation, deleteReservation, createReservation,
  checkLateReservations, selectReservations, selectCars,
  selectMatricules, selectClients, selectReservationsLoading,
  selectUser, refreshMatricules, createClient, api
} from "../../Redux/store";
import { toast } from "sonner";
import {
  Check, X, Eye, Trash2, Search, RefreshCw, ChevronLeft, ChevronRight,
  Printer, FileText, Calendar, User, Car, Clock, AlertCircle, CreditCard,
  Mail, Phone, MapPin, IdCard, Download, Plus, Edit, Info, Save,
  DollarSign, History, Receipt, Users, CalendarDays, UserPlus,
  Image as ImageIcon, FileImage, Trash, Copy, CheckCircle, Gauge,
  Settings, EyeOff, Minus, Shield, Truck, FileCheck, PenTool, Building2,
  CreditCard as CreditCardIcon, CalendarRange, Fuel, Navigation, Upload,
  AlertTriangle, XCircle, Sparkles, Star, Heart, Award, Gem, Tag,
  Wrench, Key, Briefcase, ArrowUpDown, ArrowUp, ArrowDown,
  MessageCircle, Link2
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import checklistImage from "../../assets/checklist.png";
import logoImage from "../../assets/logo.png";
import agentSignatureImage from "../../assets/cache.png";

// ==================== ContractDisplayOptions ====================
const ContractDisplayOptions = ({ options, onOptionChange, onResetAll }) => {
  const sections = [
    { id: "prices", label: "Prix et Montants", icon: DollarSign },
    { id: "clientInfo", label: "Informations du Locataire", icon: User },
    { id: "secondDriver", label: "Deuxième Conducteur", icon: Users },
    { id: "vehicleInfo", label: "Informations du Véhicule", icon: Car },
    { id: "deliveryReception", label: "Livraison et Réception", icon: Clock },
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
    { value: "dash", label: "Remplacer par des traits", icon: Minus }
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
                    <mode.icon size={12} />
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

// ==================== FormLine, Checkbox, CarDiagram, ObservationBox ====================
const FormLine = ({ label, value = "" }) => (
  <div className="form-line">
    <label>{label} :</label>
    <div className="dots-line">{value}</div>
  </div>
);
const CheckboxComponent = ({ checked = false }) => (
  <span className={`checkbox-square ${checked ? "checked" : ""}`}>
    {checked && "✓"}
  </span>
);
const CarDiagram = () => (
  <div className="car-diagram-container">
    <img src={checklistImage} alt="Car Checklist Diagram" className="checklist-image" />
  </div>
);
const ObservationBox = ({ title, isHalf = false, children, option }) => {
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

// ==================== SignatureBlock (supports image signature) ====================
const SignatureBlock = ({ label, signature = "", option }) => {
  if (option === "hide") return null;
  const isImage = typeof signature === 'string' && signature.startsWith('data:image/');
  return (
    <div className="signature-block">
      <div className="signature-label">{label}</div>
      <div className="signature-box">
        {option === "dash" ? (
          <div className="signature-text">___________</div>
        ) : isImage ? (
          <img src={signature} alt="Signature" style={{ maxHeight: '60px', maxWidth: '100%' }} />
        ) : (
          signature && <div className="signature-text">{signature}</div>
        )}
      </div>
    </div>
  );
};

// ==================== ContractLocation ====================
const ContractLocation = ({ reservation, showSignatures = false, currentUser, displayOptions = {}, clients = [] }) => {
  const storedSignatures = reservation?.signatures || { agent: "", locataire: "", secondConducteur: "" };
  const [signatures, setSignatures] = useState(storedSignatures);

  useEffect(() => {
    if (reservation?.signatures) {
      setSignatures(reservation.signatures);
    }
  }, [reservation]);

  const [paperwork, setPaperwork] = useState({
    circulation: true,
    carteGrise: true,
    assurance: true,
    vignette: true,
    visiteTechnique: true,
    autorisation: true
  });

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

  const getReservationCreatorName = () => {
    if (reservation?.created_by) return reservation.created_by;
    if (reservation?.user && reservation.user.Fullname) return reservation.user.Fullname;
    if (reservation?.user && reservation.user.name) return reservation.user.name;
    return "___________";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toLocaleDateString("fr-FR");
    } catch (error) {
      return "";
    }
  };

  const calculateRentalDays = () => {
    if (!reservation?.start_date || !reservation?.end_date) return "";
    const start = new Date(reservation.start_date);
    const end = new Date(reservation.end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // exclusive: 07/07 -> 07/08 = 1
  };

  const getDisplayOption = (section) => displayOptions[section] || "show";
  const secondDriverClient = clients.find(c => c.id === reservation?.second_driver_client_id);

  const rentalDaysOption = getDisplayOption("rentalDays");
  const datesOption = getDisplayOption("rentalDates");
  const kilometrageOption = getDisplayOption("kilometrage");
  const pricesOption = getDisplayOption("prices");
  const clientInfoOption = getDisplayOption("clientInfo");
  const secondDriverOption = getDisplayOption("secondDriver");
  const vehicleInfoOption = getDisplayOption("vehicleInfo");
  const deliveryReceptionOption = getDisplayOption("deliveryReception");
  const signaturesOption = getDisplayOption("signatures");
  const observationsOption = getDisplayOption("observations");
  const insuranceOption = getDisplayOption("insurance");
  const depositGuaranteeOption = getDisplayOption("depositGuarantee");

  const currentUserName = getCurrentUserName();
  const reservationCreatorName = getReservationCreatorName();

  const getDisplayValue = (option, actualValue, dashValue = "___________", hideValue = "") => {
    if (option === "hide") return hideValue;
    if (option === "dash") return dashValue;
    return actualValue;
  };

  const hasActualSecondDriver = () => {
    return reservation?.has_second_driver === true && secondDriverClient;
  };

  const renderContractNumber = () => {
    if (reservation?.contract_number && reservation?.contract_year) {
      const year = reservation.contract_year;
      const num = String(reservation.contract_number).padStart(4, '0');
      return `${year}/${num}`;
    }
    return '—';
  };

  const locataireSignature = signatures.locataire_image || signatures.locataire || '';

  return (
    <div className="contract-container-print" id="contract-print">
      {/* Header */}
      <table className="contract-header-table" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            <td className="header-left">
              <div className="company-name">SMAITI CAR</div>
              <div className="company-slogan">LOCATION DE VOITURE</div>
              <div className="company-phone"><Phone size={12} style={{ marginRight: "4px", display: "inline" }} /> 0665 921 921</div>
            </td>
            <td className="header-center">
              <img src={logoImage} alt="Logo" className="contract-logo-print" />
            </td>
            <td className="header-right">
              <div className="contract-number-box stylish">
                <div className="contract-number-label">CONTRAT N°</div>
                <div className="contract-number-value">{renderContractNumber()}</div>
              </div>
              <div className="arabic-text">كراء السيارات</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div className="contract-title-print">CONTRAT DE LOCATION</div>

      {/* Two Columns */}
      <table className="contract-content-table" cellPadding="0" cellSpacing="0">
        <tbody>
          <tr>
            {/* Left Column */}
            <td className="contract-left-col">
              <div className="contract-section">
                <div className="section-title-print">LOCATAIRE</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.nom || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.prenom || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">{getDisplayValue(clientInfoOption, formatDate(reservation?.client?.date_naissance) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.lieu_naissance || "—")}</span></div>
                  <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.cin_number || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{getDisplayValue(clientInfoOption, formatDate(reservation?.client?.cin_delivre_le) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.driver_license_number || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{getDisplayValue(clientInfoOption, formatDate(reservation?.client?.permis_delivre_le) || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.city || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.telephone || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Email :</span><span className="field-value">{getDisplayValue(clientInfoOption, reservation?.client?.email || "—")}</span></div>
                </div>
              </div>

              <div className="contract-section">
                <div className="section-title-print">DEUXIÈME CONDUCTEUR</div>
                <div className="section-content">
                  {secondDriverOption === "hide" ? (
                    <>
                      <div className="field-row"><span className="field-label">Nom :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">CIN :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value"></span></div>
                      <div className="field-row"><span className="field-label">Email :</span><span className="field-value"></span></div>
                    </>
                  ) : secondDriverOption === "dash" ? (
                    <>
                      <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">___________</span></div>
                      <div className="field-row"><span className="field-label">Email :</span><span className="field-value">___________</span></div>
                    </>
                  ) : (
                    hasActualSecondDriver() ? (
                      <>
                        <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">{secondDriverClient?.nom || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">{secondDriverClient?.prenom || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">{formatDate(secondDriverClient?.date_naissance) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">{secondDriverClient?.lieu_naissance || "—"}</span></div>
                        <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">{secondDriverClient?.cin_number || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{formatDate(secondDriverClient?.cin_delivre_le) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">{secondDriverClient?.driver_license_number || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">{formatDate(secondDriverClient?.permis_delivre_le) || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">{secondDriverClient?.city || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">{secondDriverClient?.telephone || "—"}</span></div>
                        <div className="field-row"><span className="field-label">Email :</span><span className="field-value">{secondDriverClient?.email || "—"}</span></div>
                      </>
                    ) : (
                      <>
                        <div className="field-row"><span className="field-label">Nom :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Prénom :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Date naissance :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Lieu naissance :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">CIN :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Permis N° :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Expire le :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Adresse :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Téléphone :</span><span className="field-value">—</span></div>
                        <div className="field-row"><span className="field-label">Email :</span><span className="field-value">—</span></div>
                      </>
                    )
                  )}
                </div>
              </div>
            </td>

            {/* Right Column */}
            <td className="contract-right-col">
              <div className="contract-section">
                <div className="section-title-print">VÉHICULE</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Immatriculation :</span><span className="field-value matricule-code">{getDisplayValue(vehicleInfoOption, reservation?.matricule?.matricule_code || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Marque/Modèle :</span><span className="field-value">{getDisplayValue(vehicleInfoOption, `${reservation?.car?.brand || ""} ${reservation?.car?.model || ""}`.trim() || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Couleur :</span><span className="field-value">{getDisplayValue(vehicleInfoOption, reservation?.car?.color || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Année :</span><span className="field-value">{getDisplayValue(vehicleInfoOption, reservation?.car?.year || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Carburant :</span><span className="field-value">{getDisplayValue(vehicleInfoOption, reservation?.car?.fuel_type || "—")}</span></div>
                  <div className="field-row"><span className="field-label">Transmission :</span><span className="field-value">{getDisplayValue(vehicleInfoOption, reservation?.car?.transmission || "—")}</span></div>
                </div>
              </div>

              <div className="contract-section">
                <div className="section-title-print">LOCATION</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Départ :</span><span className="field-value">{getDisplayValue(datesOption, `${formatDate(reservation?.start_date)} à ${reservation?.start_time || "08:00"}`)}</span></div>
                  <div className="field-row"><span className="field-label">Retour :</span><span className="field-value">{getDisplayValue(datesOption, `${formatDate(reservation?.end_date)} à ${reservation?.end_time || "18:00"}`)}</span></div>
                  <div className="field-row"><span className="field-label">Durée :</span><span className="field-value">{getDisplayValue(rentalDaysOption, `${calculateRentalDays()} jours`)}</span></div>
                  <div className="field-row"><span className="field-label">Km départ :</span><span className="field-value">{getDisplayValue(kilometrageOption, `${reservation?.kilometrage_sortie || "—"} km`)}</span></div>
                  {/* ==== ADDED: Km retour ==== */}
                  <div className="field-row"><span className="field-label">Km retour :</span><span className="field-value">{getDisplayValue(kilometrageOption, reservation?.kilometrage_entree ? `${reservation.kilometrage_entree} km` : "—")}</span></div>
                  <div className="field-row"><span className="field-label">Livré par :</span><span className="field-value">{getDisplayValue(deliveryReceptionOption, currentUserName)}</span></div>
                  <div className="field-row"><span className="field-label">Reçu par :</span><span className="field-value">{getDisplayValue(deliveryReceptionOption, reservationCreatorName)}</span></div>
                </div>
              </div>

              <div className="contract-section pricing-section">
                <div className="section-title-print">TARIFS</div>
                <div className="section-content">
                  <div className="field-row"><span className="field-label">Prix journalier :</span><span className="field-value">{getDisplayValue(pricesOption, `${reservation?.car?.price_per_day || "—"} DH`)}</span></div>
                  <div className="field-row total-row"><span className="field-label">Total TTC :</span><span className="field-value total-amount">{getDisplayValue(pricesOption, `${reservation?.total_price || "—"} DH`)}</span></div>
                  <div className="field-row"><span className="field-label">Montant payé :</span><span className="field-value">{getDisplayValue(pricesOption, `${reservation?.amount_paid || "0"} DH`)}</span></div>
                  <div className="field-row"><span className="field-label">Reste à payer :</span><span className="field-value remaining-amount">{getDisplayValue(pricesOption, `${reservation?.remaining_amount || reservation?.total_price || "0"} DH`)}</span></div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Checklist */}
      <div className="contract-section checklist-section-print">
        <div className="section-title-print">CHECKLIST - ÉTAT DU VÉHICULE</div>
        <div className="checklist-content">
          <table className="checklist-table" cellPadding="0" cellSpacing="0">
            <tbody>
              <tr>
                <td className="checklist-cell">
                  <div className="checklist-label">État de départ :</div>
                  <CarDiagram />
                </td>
                <td className="checklist-cell">
                  <div className="checklist-label">État de retour :</div>
                  <CarDiagram />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="documents-row">
            <span className="documents-label">Documents remis :</span>
            <div className="documents-items">
              <span className="doc-item"><CheckboxComponent checked={paperwork.carteGrise} /> Carte grise</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.assurance} /> Assurance</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.vignette} /> Vignette</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.visiteTechnique} /> Visite technique</span>
              <span className="doc-item"><CheckboxComponent checked={paperwork.autorisation} /> Autorisation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Observations */}
      <div className="observations-row-print">
        <ObservationBox title="Observations" option={observationsOption}>
          <div className="observation-text">
            {getDisplayValue(observationsOption,
              `Véhicule loué en bon état général. Le client s'engage à retourner le véhicule dans le même état.${reservation?.notes ? ` Notes: ${reservation.notes}` : ""}`,
              "___________",
              ""
            )}
          </div>
        </ObservationBox>
        <ObservationBox title="Assurance" option={insuranceOption}>
          <div className="observation-text">
            {getDisplayValue(insuranceOption,
              "Assurance tous risques incluse. Franchise applicable en cas de sinistre.",
              "___________",
              ""
            )}
          </div>
        </ObservationBox>
        <ObservationBox title="Caution" isHalf option={depositGuaranteeOption}>
          <div className="observation-text">
            Caution: {getDisplayValue(depositGuaranteeOption, `${reservation?.amount_paid ? `${reservation.amount_paid} DH` : "_________"} DH`, "_________", "")}
          </div>
        </ObservationBox>
      </div>

      {/* Signatures */}
      <div className="signatures-row-print">
        <SignatureBlock label="Signature de l'agent" signature={showSignatures ? signatures.agent : ""} option={signaturesOption} />
        <SignatureBlock label="Signature du locataire" signature={showSignatures ? locataireSignature : ""} option={signaturesOption} />
        <SignatureBlock label="Signature 2ème conducteur" signature={showSignatures ? signatures.secondConducteur : ""} option={signaturesOption} />
      </div>

      {/* Footer */}
      <div className="contract-footer-print">
        <div className="footer-line">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
            <Building2 size={8} /> SMAITI CAR SARL - Capital 100 000 DH
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <FileCheck size={8} /> RC : 459659 - IF : 45640901 - TP : 30351369 - ICE : 002464789000069 - CNSS : 2473901
          </span>
        </div>
        <div className="footer-line">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
            <MapPin size={8} /> Bassatine Al Oulfa, Casablanca
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <Phone size={8} /> 0665 92 19 21
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "6px" }}>
            <Mail size={8} /> smaiticar2@gmail.com
          </span>
        </div>
      </div>

      <style>{`
        .contract-container-print { max-width: 1100px; margin: 0 auto; background: white; font-family: 'Inter', sans-serif; font-size: 11px; color: #1a2c3e; line-height: 1.4; }
        .contract-header-table { width: 100%; border-bottom: 2px solid #d4af37; margin-bottom: 10px; padding-bottom: 8px; }
        .header-left { width: 30%; vertical-align: top; }
        .header-center { width: 40%; text-align: center; vertical-align: middle; }
        .header-right { width: 30%; text-align: right; vertical-align: top; }
        .company-name { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #1e293b; }
        .company-slogan { font-size: 10px; font-weight: 600; margin-top: 4px; color: #b8860b; }
        .company-phone { font-size: 9px; margin-top: 6px; color: #475569; }
        .contract-logo-print { height: 85px; width: auto; object-fit: contain; }
        .contract-number-box { border: 1px solid #e2e8f0; padding: 6px 14px; text-align: center; font-size: 10px; display: inline-block; background: #fefce8; border-radius: 10px; }
        .arabic-text { margin-top: 8px; font-size: 12px; font-weight: 500; color: #475569; }
        .contract-title-print { text-align: center; font-size: 17px; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #0f172a; }
        .contract-content-table { width: 100%; }
        .contract-left-col { width: 50%; vertical-align: top; padding-right: 16px; }
        .contract-right-col { width: 50%; vertical-align: top; padding-left: 16px; }
        .contract-section { margin-bottom: 6px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; }
        .section-title-print { background: #f8fafc; padding: 8px 12px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .section-content { padding: 10px 12px; }
        .field-row { display: flex; margin-bottom: 6px; font-size: 10px; align-items: baseline; }
        .field-label { width: 110px; font-weight: 600; color: #475569; flex-shrink: 0; }
        .field-value { flex: 1; border-bottom: 1px dotted #cbd5e1; padding-left: 6px; color: #0f172a; }
        .matricule-code { font-family: 'Courier New', monospace; font-weight: 700; color: #b8860b; letter-spacing: 0.5px; }
        .total-row .total-amount { font-weight: 800; font-size: 12px; color: #b8860b; }
        .remaining-amount { font-weight: 700; color: #dc2626; }
        .pricing-section { border-left: 4px solid #d4af37; }
        .checklist-section-print { margin: 8px 0; }
        .checklist-table { width: 100%; margin-bottom: 14px; }
        .checklist-cell { width: 50%; text-align: center; vertical-align: top; padding: 0 8px; }
        .checklist-label { font-weight: 700; margin-bottom: 6px; font-size: 10px; color: #334155; }
        .documents-row { display: flex; flex-wrap: wrap; align-items: center; padding: 10px 12px; background: #f9fafb; border-radius: 10px; margin-top: 10px; gap: 12px; }
        .documents-label { font-weight: 700; margin-right: 6px; font-size: 10px; color: #334155; }
        .documents-items { display: flex; flex-wrap: wrap; gap: 14px; }
        .doc-item { display: inline-flex; align-items: center; gap: 5px; font-size: 9px; background: white; padding: 3px 8px; border-radius: 20px; border: 1px solid #e2e8f0; }
        .checkbox-square { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border: 1.5px solid #334155; background: white; font-size: 10px; font-weight: bold; margin-right: 4px; border-radius: 3px; }
        .checkbox-square.checked { background: #d4af37 !important; border-color: #d4af37 !important; color: #0f172a !important; }
        .car-diagram-container img { width: 100%; max-width: 150px; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fafafa; padding: 4px; }
        .observations-row-print { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0; }
        .observation-box { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: white; }
        .observation-box.half-width { flex: 0 0 calc(33.33% - 10px); }
        .obs-title { display: block; padding: 8px 12px; background: #f8fafc; font-weight: 700; font-size: 10px; border-bottom: 1px solid #e2e8f0; color: #1e293b; }
        .observation-content { padding: 10px 12px; font-size: 9.5px; min-height: 60px; color: #334155; }
        .signatures-row-print { display: flex; gap: 24px; margin: 10px 0; }
        .signature-block { flex: 1; text-align: center; }
        .signature-label { font-size: 9px; font-weight: 700; margin-bottom: 6px; color: #475569; }
        .signature-box { border: 1px solid #cbd5e1; min-height: 60px; display: flex; align-items: center; justify-content: center; background: #fafafa; border-radius: 8px; }
        .signature-text { font-size: 9px; font-style: italic; color: #64748b; }
        .contract-footer-print { margin-top: 4px; padding-top: 6px; border-top: 1px solid #d4af37; text-align: center; font-size: 8px; color: #64748b; }
        .footer-line { margin-bottom: 2px; line-height: 1.3; }
        .contract-number-box.stylish { border: none; background: #fefce857; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); padding: 8px 20px; }
        .contract-number-box.stylish .contract-number-label { font-size: 9px; color: #92400e; letter-spacing: 1.5px; }
        .contract-number-box.stylish .contract-number-value { font-size: 22px; font-weight: 800; color: #1a1a2e; }
        @media print {
          .contract-container-print { margin: 0; padding: 0; background: white; }
          .checkbox-square.checked { background: black !important; border-color: black !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .section-title-print { background: #f5f5f5 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .documents-row { background: #f9f9f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contract-number-box.stylish { background: #fefce8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};

// ==================== SecondDriverSearch ====================
const SecondDriverSearch = ({ clients, selectedClientId, selectedSecondDriverId, onSelect, onCreateNew }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDriver, setIsNewDriver] = useState(false);
  const dispatch = useDispatch();
  const [newDriverData, setNewDriverData] = useState({
    prenom: "", nom: "", telephone: "", email: "", city: "",
    cin_number: "", driver_license_number: ""
  });
  const [creatingDriver, setCreatingDriver] = useState(false);

  const filteredDrivers = useMemo(() => {
    if (!searchTerm.trim() || isNewDriver || !clients || !Array.isArray(clients)) return [];
    const term = searchTerm.toLowerCase().trim();
    return clients
      .filter(client => {
        if (!client || typeof client !== "object") return false;
        if (selectedClientId && client.id === selectedClientId) return false;
        const fullName = `${client.prenom || ""} ${client.nom || ""}`.toLowerCase();
        const email = (client.email || "").toLowerCase();
        const telephone = (client.telephone || "").toLowerCase();
        return fullName.includes(term) || email.includes(term) || telephone.includes(term);
      })
      .slice(0, 10);
  }, [searchTerm, isNewDriver, clients, selectedClientId]);

  const handleSelect = (client) => {
    onSelect(client);
    setSearchTerm("");
    setIsNewDriver(false);
  };

  const handleCreateNew = () => {
    setIsNewDriver(true);
    setNewDriverData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: ""
    });
  };

  const handleCancelNew = () => {
    setIsNewDriver(false);
    setNewDriverData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: ""
    });
  };

  const handleSaveNewDriver = async () => {
    if (!newDriverData.prenom || !newDriverData.nom || !newDriverData.telephone) {
      toast.error("Veuillez remplir les champs obligatoires (Prénom, Nom, Téléphone)");
      return;
    }
    setCreatingDriver(true);
    try {
      const result = await dispatch(createClient(newDriverData)).unwrap();
      const newClient = result.client || result;
      toast.success("Conducteur créé avec succès");
      onSelect(newClient);
      setIsNewDriver(false);
      setSearchTerm("");
      setNewDriverData({
        prenom: "", nom: "", telephone: "", email: "", city: "",
        cin_number: "", driver_license_number: ""
      });
    } catch (error) {
      toast.error("Erreur lors de la création du conducteur");
    } finally {
      setCreatingDriver(false);
    }
  };

  if (isNewDriver) {
    return (
      <div className="inline-new-client" style={{ marginTop: "1rem" }}>
        <div className="inline-section-header" style={{ marginBottom: "1rem" }}>
          <Gem size={18} />
          <h3>Nouveau conducteur</h3>
        </div>
        <div className="inline-grid-2">
          <div className="inline-field">
            <label><User size={14} /> Prénom *</label>
            <input type="text" className="inline-input" value={newDriverData.prenom} onChange={(e) => setNewDriverData(prev => ({ ...prev, prenom: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><User size={14} /> Nom *</label>
            <input type="text" className="inline-input" value={newDriverData.nom} onChange={(e) => setNewDriverData(prev => ({ ...prev, nom: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><Phone size={14} /> Téléphone *</label>
            <input type="tel" className="inline-input" value={newDriverData.telephone} onChange={(e) => setNewDriverData(prev => ({ ...prev, telephone: e.target.value }))} required />
          </div>
          <div className="inline-field">
            <label><Mail size={14} /> Email</label>
            <input type="email" className="inline-input" value={newDriverData.email} onChange={(e) => setNewDriverData(prev => ({ ...prev, email: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><MapPin size={14} /> Ville</label>
            <input type="text" className="inline-input" value={newDriverData.city} onChange={(e) => setNewDriverData(prev => ({ ...prev, city: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><IdCard size={14} /> CIN</label>
            <input type="text" className="inline-input" value={newDriverData.cin_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, cin_number: e.target.value }))} />
          </div>
          <div className="inline-field">
            <label><Key size={14} /> Permis</label>
            <input type="text" className="inline-input" value={newDriverData.driver_license_number} onChange={(e) => setNewDriverData(prev => ({ ...prev, driver_license_number: e.target.value }))} />
          </div>
        </div>
        <div className="inline-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="inline-secondary-btn" onClick={handleCancelNew}>Annuler</button>
          <button type="button" className="inline-primary-btn" onClick={handleSaveNewDriver} disabled={creatingDriver}>
            {creatingDriver ? "Création..." : "Créer le conducteur"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-search-section" style={{ marginTop: "0.5rem" }}>
      <div className="inline-search-input-wrapper">
        <Search size={18} />
        <input
          type="text"
          className="inline-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher un conducteur par nom, email ou téléphone..."
        />
      </div>
      {filteredDrivers.length > 0 && (
        <div className="inline-results">
          {filteredDrivers.map(driver => (
            <div key={driver.id} className="inline-result-item" onClick={() => handleSelect(driver)}>
              <div className="inline-result-avatar"><User size={20} /></div>
              <div className="inline-result-info">
                <strong>{driver.prenom} {driver.nom}</strong>
                <div className="inline-result-details">
                  <span><Mail size={12} /> {driver.email}</span>
                  <span><Phone size={12} /> {driver.telephone}</span>
                  <span><MapPin size={12} /> {driver.city}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button type="button" className="inline-outline-btn" onClick={handleCreateNew} style={{ marginTop: "0.5rem" }}>
        <UserPlus size={16} /> Créer un nouveau conducteur
      </button>
    </div>
  );
};

// ==================== ReservationForm ====================
const ReservationForm = ({
  isOpen, onClose, onSubmit, editingReservation, clients, cars, matricules, submitting
}) => {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    start_time: "08:00",
    end_time: "18:00",
    rental_days: 1,
    total_price: 0,
    amount_paid: 0,
    remaining_amount: 0,
    status: "pending",
    car_id: "",
    client_id: "",
    matricule_id: "",
    has_second_driver: false,
    second_driver_client_id: "",
    notes: "",
    reception_notes: "",
    kilometrage_sortie: "",
    kilometrage_entree: ""
  });

  const [clientSearch, setClientSearch] = useState("");
  const [isNewClient, setIsNewClient] = useState(false);
  const [carMatricules, setCarMatricules] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [newPayment, setNewPayment] = useState({
    amount: "", date: new Date().toISOString().split("T")[0],
    method: "cash", notes: ""
  });
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [matriculeSearch, setMatriculeSearch] = useState("");
  const [selectedMatricule, setSelectedMatricule] = useState(null);
  const [filteredMatricules, setFilteredMatricules] = useState([]);
  const [newClientData, setNewClientData] = useState({
    prenom: "", nom: "", telephone: "", email: "", city: "",
    cin_number: "", driver_license_number: "", date_naissance: "",
    lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
  });

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim() || isNewClient || !clients || !Array.isArray(clients)) return [];
    const searchTerm = clientSearch.toLowerCase().trim();
    return clients
      .filter(client => {
        if (!client || typeof client !== "object") return false;
        const fullName = `${client.prenom || ""} ${client.nom || ""}`.toLowerCase();
        const email = (client.email || "").toLowerCase();
        const telephone = (client.telephone || "").toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm) || telephone.includes(searchTerm);
      })
      .slice(0, 10);
  }, [clientSearch, isNewClient, clients]);

  useEffect(() => {
    if (!matriculeSearch.trim() || !matricules || !Array.isArray(matricules)) {
      setFilteredMatricules([]);
      return;
    }
    const searchTerm = matriculeSearch.toLowerCase().trim();
    const filtered = matricules
      .filter(mat => {
        if (!mat || typeof mat !== "object") return false;
        if (mat.status === 'sold') return false;
        const matriculeCode = (mat.matricule_code || "").toLowerCase();
        return matriculeCode.includes(searchTerm);
      })
      .slice(0, 10);
    setFilteredMatricules(filtered);
  }, [matriculeSearch, matricules]);

  // ===== MODIFIED: compute rental days exclusively =====
  useEffect(() => {
    if (editingReservation) {
      const computeRentalDays = (start, end) => {
        if (!start || !end) return 1;
        const startDate = new Date(start);
        const endDate = new Date(end);
        startDate.setHours(0,0,0,0);
        endDate.setHours(0,0,0,0);
        const diffTime = Math.abs(endDate - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays === 0 ? 1 : diffDays;
      };

      setFormData({
        start_date: editingReservation.start_date?.split("T")[0] || "",
        end_date: editingReservation.end_date?.split("T")[0] || "",
        start_time: editingReservation.start_time || "08:00",
        end_time: editingReservation.end_time || "18:00",
        rental_days: editingReservation.rental_days || editingReservation.total_days || 
                     (editingReservation.start_date && editingReservation.end_date 
                       ? computeRentalDays(editingReservation.start_date, editingReservation.end_date) 
                       : 1),
        total_price: editingReservation.total_price || 0,
        amount_paid: editingReservation.amount_paid || 0,
        remaining_amount: editingReservation.remaining_amount || 0,
        status: editingReservation.status || "pending",
        car_id: editingReservation.car_id || "",
        client_id: editingReservation.client_id || "",
        matricule_id: editingReservation.matricule_id || "",
        has_second_driver: editingReservation.has_second_driver || false,
        second_driver_client_id: editingReservation.second_driver_client_id || "",
        notes: editingReservation.notes || "",
        reception_notes: editingReservation.reception_notes || "",
        kilometrage_sortie: editingReservation.kilometrage_sortie || "",
        kilometrage_entree: editingReservation.kilometrage_entree || ""
      });
      setPaymentHistory(
        Array.isArray(editingReservation.payment_history)
          ? editingReservation.payment_history
          : []
      );
      if (editingReservation.client_id) {
        const client = clients.find(c => c.id === editingReservation.client_id);
        if (client) {
          setSelectedClient(client);
          setClientSearch(`${client.prenom} ${client.nom}`);
        }
      }
      if (editingReservation.matricule_id) {
        const matricule = matricules.find(m => m.id === editingReservation.matricule_id);
        if (matricule) {
          setSelectedMatricule(matricule);
          setMatriculeSearch(matricule.matricule_code);
          if (matricule.car_id) {
            setFormData(prev => ({ ...prev, car_id: matricule.car_id }));
          }
        }
      }
    }
  }, [editingReservation, clients, matricules]);

  useEffect(() => {
    if (formData.car_id) {
      const filtered = matricules.filter(m => m.car_id == formData.car_id);
      setCarMatricules(filtered);
    } else {
      setCarMatricules([]);
    }
  }, [formData.car_id, matricules]);

  useEffect(() => {
    if (formData.matricule_id) {
      const selectedMatriculeObj = matricules.find(m => m.id == formData.matricule_id);
      if (selectedMatriculeObj && (!formData.kilometrage_sortie || formData.kilometrage_sortie === "")) {
        setFormData(prev => ({ ...prev, kilometrage_sortie: selectedMatriculeObj.kilometrage }));
      }
    }
  }, [formData.matricule_id, matricules]);

  useEffect(() => {
    if (formData.car_id && formData.rental_days) {
      const car = cars.find(c => c.id == formData.car_id);
      if (car) {
        const total = car.price_per_day * formData.rental_days;
        const remaining = total - (formData.amount_paid || 0);
        setFormData(prev => ({ ...prev, total_price: total, remaining_amount: remaining }));
      }
    }
  }, [formData.car_id, formData.rental_days, formData.amount_paid, cars]);

  // ===== MODIFIED: handlers for exclusive day counting =====
  const handleStartDateChange = (value) => {
    setFormData(prev => ({ ...prev, start_date: value }));
    if (value && formData.rental_days) {
      const start = new Date(value);
      const end = new Date(start);
      end.setDate(start.getDate() + formData.rental_days); // exclusive: + days
      setFormData(prev => ({ ...prev, end_date: end.toISOString().split("T")[0] }));
    }
  };

  const handleEndDateChange = (value) => {
    setFormData(prev => ({ ...prev, end_date: value }));
    if (formData.start_date && value) {
      const start = new Date(formData.start_date);
      const end = new Date(value);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setFormData(prev => ({ ...prev, rental_days: diffDays === 0 ? 1 : diffDays }));
    }
  };

  const handleRentalDaysChange = (value) => {
    const days = parseInt(value) || 1;
    setFormData(prev => ({ ...prev, rental_days: days }));
    if (formData.start_date) {
      const start = new Date(formData.start_date);
      const end = new Date(start);
      end.setDate(start.getDate() + days); // exclusive
      setFormData(prev => ({ ...prev, end_date: end.toISOString().split("T")[0] }));
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setIsNewClient(false);
    setFormData(prev => ({ ...prev, client_id: client.id }));
    setClientSearch(`${client.prenom} ${client.nom}`);
  };

  const handleNewClient = () => {
    setSelectedClient(null);
    setIsNewClient(true);
    setFormData(prev => ({ ...prev, client_id: "" }));
    setClientSearch("");
    setNewClientData({
      prenom: "", nom: "", telephone: "", email: "", city: "",
      cin_number: "", driver_license_number: "", date_naissance: "",
      lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
    });
  };

  const handleSaveNewClient = async () => {
    if (!newClientData.prenom || !newClientData.nom || !newClientData.telephone) {
      toast.error("Veuillez remplir les champs obligatoires du client (Prénom, Nom, Téléphone)");
      return;
    }
    setCreatingClient(true);
    try {
      const result = await dispatch(createClient(newClientData)).unwrap();
      const newClient = result.client || result;
      toast.success("Client créé avec succès");
      handleClientSelect(newClient);
      setIsNewClient(false);
      setNewClientData({
        prenom: "", nom: "", telephone: "", email: "", city: "",
        cin_number: "", driver_license_number: "", date_naissance: "",
        lieu_naissance: "", cin_delivre_le: "", permis_delivre_le: ""
      });
    } catch (error) {
      toast.error("Erreur lors de la création du client");
    } finally {
      setCreatingClient(false);
    }
  };

  const handleMatriculeSelect = (matricule) => {
    setSelectedMatricule(matricule);
    setMatriculeSearch(matricule.matricule_code);
    setFormData(prev => ({
      ...prev,
      matricule_id: matricule.id,
      car_id: matricule.car_id,
      kilometrage_sortie: matricule.kilometrage || ""
    }));
    const associatedCar = cars.find(c => c.id == matricule.car_id);
    if (associatedCar) {
      toast.success(`Véhicule sélectionné: ${associatedCar.brand} ${associatedCar.model}`);
    }
    setFilteredMatricules([]);
  };

  const handleAddPayment = () => {
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    const payment = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method,
      notes: newPayment.notes || "",
      created_at: new Date().toISOString()
    };
    const updatedHistory = [...paymentHistory, payment];
    setPaymentHistory(updatedHistory);
    const newAmountPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = (formData.total_price || 0) - newAmountPaid;
    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      remaining_amount: newRemaining
    }));
    setNewPayment({ amount: "", date: new Date().toISOString().split("T")[0], method: "cash", notes: "" });
    setShowAddPayment(false);
    toast.success("Paiement ajouté");
  };

  const handleRemovePayment = (paymentId) => {
    const updatedHistory = paymentHistory.filter(p => p.id !== paymentId);
    setPaymentHistory(updatedHistory);
    const newAmountPaid = updatedHistory.reduce((sum, p) => sum + p.amount, 0);
    const newRemaining = (formData.total_price || 0) - newAmountPaid;
    setFormData(prev => ({
      ...prev,
      amount_paid: newAmountPaid,
      remaining_amount: newRemaining
    }));
    toast.success("Paiement supprimé");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let clientId = formData.client_id;
    if (isNewClient && !clientId) {
      toast.error("Veuillez confirmer la création du client en cliquant sur 'Confirmer la création'");
      return;
    }
    if (!clientId) {
      toast.error("Veuillez sélectionner ou créer un client");
      return;
    }
    const reservationData = {
      ...formData,
      client_id: clientId,
      payment_history: paymentHistory
    };
    onSubmit(reservationData);
  };

  if (!isOpen) return null;

  return (
    <div className="inline-form-container">
      <div className="inline-form-header">
        <div className="inline-form-icon">{editingReservation ? <Sparkles size={28} /> : <Star size={28} />}</div>
        <div className="inline-form-title">
          <h2>{editingReservation ? "Modifier la réservation" : "Nouvelle réservation"}</h2>
          <p>{editingReservation ? "Modifiez les détails de la réservation" : "Créez une nouvelle réservation en quelques clics"}</p>
        </div>
        <button onClick={onClose} className="inline-form-close"><X size={24} /></button>
      </div>

      <form onSubmit={handleSubmit} className="inline-form">
        <div className="inline-form-grid">
          <div className="inline-form-col">
            <div className="inline-section">
              <div className="inline-section-header"><User size={18} /><h3>Client</h3></div>
              {!isNewClient ? (
                <>
                  <div className="inline-search-section">
                    <div className="inline-search-input-wrapper">
                      <Search size={18} />
                      <input type="text" className="inline-input" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Rechercher un client existant..." />
                    </div>
                    {filteredClients.length > 0 && (
                      <div className="inline-results">
                        {filteredClients.map(client => (
                          <div key={client.id} className="inline-result-item" onClick={() => handleClientSelect(client)}>
                            <div className="inline-result-avatar"><User size={20} /></div>
                            <div className="inline-result-info">
                              <strong>{client.prenom} {client.nom}</strong>
                              <div className="inline-result-details">
                                <span><Mail size={12} /> {client.email}</span>
                                <span><Phone size={12} /> {client.telephone}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" className="inline-outline-btn" onClick={handleNewClient}>
                      <UserPlus size={16} /> Créer un nouveau client
                    </button>
                  </div>
                  {selectedClient && (
                    <div className="inline-selected">
                      <CheckCircle size={20} />
                      <div>
                        <strong>Client sélectionné</strong>
                        <p>{selectedClient.prenom} {selectedClient.nom} - {selectedClient.telephone}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="inline-new-client">
                  <div className="inline-grid-2">
                    <div className="inline-field"><label>Prénom *</label><input type="text" className="inline-input" value={newClientData.prenom} onChange={(e) => setNewClientData(prev => ({ ...prev, prenom: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Nom *</label><input type="text" className="inline-input" value={newClientData.nom} onChange={(e) => setNewClientData(prev => ({ ...prev, nom: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Téléphone *</label><input type="tel" className="inline-input" value={newClientData.telephone} onChange={(e) => setNewClientData(prev => ({ ...prev, telephone: e.target.value }))} required /></div>
                    <div className="inline-field"><label>Email</label><input type="email" className="inline-input" value={newClientData.email} onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))} /></div>
                    <div className="inline-field"><label>Ville</label><input type="text" className="inline-input" value={newClientData.city} onChange={(e) => setNewClientData(prev => ({ ...prev, city: e.target.value }))} /></div>
                    <div className="inline-field"><label>CIN</label><input type="text" className="inline-input" value={newClientData.cin_number} onChange={(e) => setNewClientData(prev => ({ ...prev, cin_number: e.target.value }))} /></div>
                    <div className="inline-field"><label>Permis</label><input type="text" className="inline-input" value={newClientData.driver_license_number} onChange={(e) => setNewClientData(prev => ({ ...prev, driver_license_number: e.target.value }))} /></div>
                    <div className="inline-field"><label>Date naissance</label><input type="date" className="inline-input" value={newClientData.date_naissance} onChange={(e) => setNewClientData(prev => ({ ...prev, date_naissance: e.target.value }))} /></div>
                    <div className="inline-field"><label>Lieu naissance</label><input type="text" className="inline-input" value={newClientData.lieu_naissance} onChange={(e) => setNewClientData(prev => ({ ...prev, lieu_naissance: e.target.value }))} /></div>
                    <div className="inline-field"><label>CIN délivré le</label><input type="date" className="inline-input" value={newClientData.cin_delivre_le} onChange={(e) => setNewClientData(prev => ({ ...prev, cin_delivre_le: e.target.value }))} /></div>
                    <div className="inline-field"><label>Permis délivré le</label><input type="date" className="inline-input" value={newClientData.permis_delivre_le} onChange={(e) => setNewClientData(prev => ({ ...prev, permis_delivre_le: e.target.value }))} /></div>
                  </div>
                  <div className="inline-actions">
                    <button type="button" className="inline-secondary-btn" onClick={() => setIsNewClient(false)}>Annuler</button>
                    <button type="button" className="inline-primary-btn" onClick={handleSaveNewClient} disabled={creatingClient}>
                      {creatingClient ? "Création..." : "Confirmer la création"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Users size={18} /><h3>Deuxième conducteur</h3></div>
              <label className="inline-checkbox">
                <input type="checkbox" checked={formData.has_second_driver} onChange={(e) => setFormData(prev => ({ ...prev, has_second_driver: e.target.checked, second_driver_client_id: "" }))} />
                <span>Ajouter un deuxième conducteur</span>
              </label>
              {formData.has_second_driver && (
                <SecondDriverSearch
                  clients={clients}
                  selectedClientId={formData.client_id}
                  selectedSecondDriverId={formData.second_driver_client_id}
                  onSelect={(client) => setFormData(prev => ({ ...prev, second_driver_client_id: client.id }))}
                  onCreateNew={() => {}}
                />
              )}
              {formData.second_driver_client_id && (
                <div className="inline-selected">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Deuxième conducteur sélectionné</strong>
                    <p>
                      {(() => {
                        const secondDriver = clients.find(c => c.id === parseInt(formData.second_driver_client_id));
                        return secondDriver ? `${secondDriver.prenom} ${secondDriver.nom} - ${secondDriver.telephone}` : "—";
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Calendar size={18} /><h3>Dates et durée</h3></div>
              <div className="inline-grid-2">
                <div className="inline-field"><label>Date de début *</label><input type="date" className="inline-input" value={formData.start_date} onChange={(e) => handleStartDateChange(e.target.value)} required /></div>
                <div className="inline-field"><label>Heure de début</label><input type="time" className="inline-input" value={formData.start_time} onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))} /></div>
                <div className="inline-field"><label>Date de fin *</label><input type="date" className="inline-input" value={formData.end_date} onChange={(e) => handleEndDateChange(e.target.value)} required /></div>
                <div className="inline-field"><label>Heure de fin</label><input type="time" className="inline-input" value={formData.end_time} onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))} /></div>
                <div className="inline-field"><label>Nombre de jours</label><input type="number" className="inline-input" value={formData.rental_days} onChange={(e) => handleRentalDaysChange(e.target.value)} min="1" /></div>
              </div>
            </div>
          </div>

          <div className="inline-form-col">
            <div className="inline-section">
              <div className="inline-section-header"><Car size={18} /><h3>Véhicule</h3></div>
              <div className="inline-search-section">
                <div className="inline-search-input-wrapper">
                  <Search size={18} />
                  <input type="text" className="inline-input" value={matriculeSearch} onChange={(e) => setMatriculeSearch(e.target.value)} placeholder="Rechercher par immatriculation..." />
                </div>
                {filteredMatricules.length > 0 && (
                  <div className="inline-results">
                    {filteredMatricules.map(mat => {
                      const carForMat = cars.find(c => c.id == mat.car_id);
                      return (
                        <div key={mat.id} className="inline-result-item" onClick={() => handleMatriculeSelect(mat)}>
                          <div className="inline-result-avatar"><Car size={20} /></div>
                          <div className="inline-result-info">
                            <strong className="inline-matricule-code">{mat.matricule_code}</strong>
                            {carForMat && (
                              <div className="inline-result-details">
                                <span>{carForMat.brand} {carForMat.model}</span>
                                <span>{carForMat.price_per_day} DH/jour</span>
                                <span>{mat.kilometrage} km</span>
                                <span className={`badge ${mat.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                                  {mat.status === 'active' ? 'Actif' : 'Inactif'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {selectedMatricule && (
                <div className="inline-selected">
                  <CheckCircle size={20} />
                  <div>
                    <strong>Matricule sélectionné</strong>
                    <p>
                      {selectedMatricule.matricule_code} - Kilométrage: {selectedMatricule.kilometrage} km
                      <span className={`badge ${selectedMatricule.status === 'active' ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: '8px' }}>
                        {selectedMatricule.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
              <div className="inline-grid-2">
                <div className="inline-field">
                  <label>Véhicule *</label>
                  <select className="inline-select" value={formData.car_id} onChange={(e) => setFormData(prev => ({ ...prev, car_id: e.target.value, matricule_id: "" }))} required disabled={!!selectedMatricule}>
                    <option value="">Choisir un véhicule</option>
                    {cars.map(car => (
                      <option key={car.id} value={car.id}>
                        {car.brand} {car.model} - {car.price_per_day} DH/jour
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inline-field">
                  <label>Matricule</label>
                  <select className="inline-select" value={formData.matricule_id} onChange={(e) => setFormData(prev => ({ ...prev, matricule_id: e.target.value }))} disabled={!!selectedMatricule}>
                    <option value="">Choisir un matricule</option>
                    {carMatricules.map(mat => (
                      <option key={mat.id} value={mat.id}>
                        {mat.matricule_code} - {mat.kilometrage} km
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inline-field">
                  <label>Km départ</label>
                  <input type="number" className="inline-input" value={formData.kilometrage_sortie} onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_sortie: e.target.value }))} placeholder="Kilométrage de sortie" />
                </div>
                <div className="inline-field">
                  <label>Km retour</label>
                  <input type="number" className="inline-input" value={formData.kilometrage_entree} onChange={(e) => setFormData(prev => ({ ...prev, kilometrage_entree: e.target.value }))} placeholder="Kilométrage de retour" />
                </div>
              </div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><DollarSign size={18} /><h3>Paiement et statut</h3></div>
              <div className="inline-grid-2">
                <div className="inline-field"><label>Prix total (DH) *</label><input type="number" step="0.01" className="inline-input" value={formData.total_price} onChange={(e) => setFormData(prev => ({ ...prev, total_price: parseFloat(e.target.value) }))} required /></div>
                <div className="inline-field"><label>Montant payé (DH)</label><input type="number" step="0.01" className="inline-input" value={formData.amount_paid} readOnly style={{ backgroundColor: "#f3f4f6" }} /></div>
                <div className="inline-field"><label>Reste à payer (DH)</label><input type="number" step="0.01" className="inline-input" value={formData.remaining_amount} readOnly style={{ backgroundColor: "#f3f4f6" }} /></div>
                <div className="inline-field"><label>Statut</label>
                  <select className="inline-select" value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}>
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmée</option>
                    <option value="contacted">Contacté</option>
                    <option value="completed">Terminée</option>
                    <option value="retard">En retard</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>
              </div>
              <div className="inline-payment-section">
                <button type="button" className="inline-add-payment" onClick={() => setShowAddPayment(!showAddPayment)}>
                  <Plus size={16} /> Ajouter un paiement
                </button>
                {showAddPayment && (
                  <div className="inline-payment-form">
                    <div className="inline-grid-2">
                      <div className="inline-field"><label>Montant</label><input type="number" step="0.01" className="inline-input" value={newPayment.amount} onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))} /></div>
                      <div className="inline-field"><label>Date</label><input type="date" className="inline-input" value={newPayment.date} onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))} /></div>
                      <div className="inline-field"><label>Méthode</label><select className="inline-select" value={newPayment.method} onChange={(e) => setNewPayment(prev => ({ ...prev, method: e.target.value }))}><option value="cash">Espèces</option><option value="card">Carte</option><option value="check">Chèque</option><option value="transfer">Virement</option></select></div>
                      <div className="inline-field"><label>Notes</label><input type="text" className="inline-input" value={newPayment.notes} onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))} /></div>
                    </div>
                    <div className="inline-actions">
                      <button type="button" className="inline-secondary-btn" onClick={() => setShowAddPayment(false)}>Annuler</button>
                      <button type="button" className="inline-primary-btn" onClick={handleAddPayment}>Ajouter</button>
                    </div>
                  </div>
                )}
                {paymentHistory.length > 0 && (
                  <div className="inline-history">
                    <h4><History size={14} /> Historique des paiements ({paymentHistory.length})</h4>
                    {paymentHistory.map(payment => (
                      <div key={payment.id} className="inline-history-item">
                        <div className="inline-history-info">
                          <span className="inline-history-date">{new Date(payment.date).toLocaleDateString("fr-FR")}</span>
                          <span className="inline-history-method">{payment.method === "cash" ? "Espèces" : payment.method === "card" ? "Carte" : payment.method === "check" ? "Chèque" : "Virement"}</span>
                          <span className="inline-history-amount">{payment.amount} DH</span>
                          <span className="inline-history-notes">{payment.notes || "-"}</span>
                        </div>
                        <button type="button" className="inline-history-delete" onClick={() => handleRemovePayment(payment.id)}><Trash2 size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="inline-section">
              <div className="inline-section-header"><Info size={18} /><h3>Notes</h3></div>
              <div className="inline-field">
                <textarea className="inline-textarea" rows="3" value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes supplémentaires..." />
              </div>
              <div className="inline-field">
                <textarea className="inline-textarea" rows="2" value={formData.reception_notes} onChange={(e) => setFormData(prev => ({ ...prev, reception_notes: e.target.value }))} placeholder="Notes de réception..." />
              </div>
            </div>
          </div>
        </div>
        <div className="inline-form-footer">
          <button type="button" className="inline-secondary-btn" onClick={onClose}>Annuler</button>
          <button type="submit" className="inline-primary-btn" disabled={submitting}>
            {submitting ? "Traitement..." : (editingReservation ? "Mettre à jour" : "Créer la réservation")}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==================== ContractViewPage ====================
const ContractViewPage = ({ reservation, onClose, currentUser, clients }) => {
  const [contractSignatures, setContractSignatures] = useState({
    agent: reservation?.signatures?.agent || "",
    locataire: reservation?.signatures?.locataire || "",
    secondConducteur: reservation?.signatures?.secondConducteur || "",
    locataire_image: reservation?.signatures?.locataire_image || "",
  });

  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: true,
    carteGrise: true,
    assurance: true,
    vignette: true,
    visiteTechnique: true,
    autorisation: true
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "show",
    clientInfo: "show",
    secondDriver: "show",
    vehicleInfo: "show",
    deliveryReception: "show",
    rentalDates: "show",
    kilometrage: "show",
    rentalDays: "show",
    observations: "show",
    insurance: "show",
    depositGuarantee: "show",
    signatures: "show"
  });
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  // États pour la popup d'impression
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  const handleDisplayOptionChange = (section, value) => {
    setContractDisplayOptions(prev => ({ ...prev, [section]: value }));
  };
  const handleResetAllOptions = () => {
    setContractDisplayOptions({
      prices: "show",
      clientInfo: "show",
      secondDriver: "show",
      vehicleInfo: "show",
      deliveryReception: "show",
      rentalDates: "show",
      kilometrage: "show",
      rentalDays: "show",
      observations: "show",
      insurance: "show",
      depositGuarantee: "show",
      signatures: "show"
    });
    toast.success("Toutes les options ont été réinitialisées");
  };

  const generateContractPDF = async (includeSignatures = false) => {
    try {
      toast.loading("Génération du contrat en cours...", { id: "contract-pdf" });
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const contractElement = document.getElementById("contract-print");
      if (!contractElement) throw new Error("Contract element not found");
      const contractClone = contractElement.cloneNode(true);

      if (includeSignatures) {
        const signatureBlocks = contractClone.querySelectorAll('.signature-block');
        if (signatureBlocks.length >= 1) {
          const agentBlock = signatureBlocks[0];
          const signatureBox = agentBlock.querySelector('.signature-box');
          if (signatureBox) {
            signatureBox.innerHTML = `<img src="${agentSignatureImage}" style="max-height:60px; max-width:100%;" />`;
          }
        }
      }

      contractClone.style.width = "210mm";
      contractClone.style.height = "auto";
      contractClone.style.padding = "15px";
      contractClone.style.margin = "0";
      contractClone.style.boxSizing = "border-box";
      contractClone.style.backgroundColor = "white";
      contractClone.style.position = "absolute";
      contractClone.style.top = "-9999px";
      contractClone.style.left = "0";
      document.body.appendChild(contractClone);
      const images = contractClone.querySelectorAll("img");
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(contractClone, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      document.body.removeChild(contractClone);
      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      doc.save(`contrat-location-${reservation.id}.pdf`);
      toast.success("Contrat généré avec succès!", { id: "contract-pdf" });
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la génération du contrat", { id: "contract-pdf" });
    }
  };

  const handlePrintClick = () => {
    setShowPrintOptions(true);
  };

  const handlePrintConfirm = (withSignature) => {
    setShowPrintOptions(false);
    setTimeout(() => generateContractPDF(withSignature), 200);
  };

  const mergedSignatures = {
    ...reservation.signatures,
    ...contractSignatures,
  };

  return (
    <div className="inline-form-container">
      <div className="inline-form-header">
        <div className="inline-form-icon"><FileText size={28} /></div>
        <div className="inline-form-title">
          <h2>Contrat de location - Réservation #{reservation.id}</h2>
          <p>Visualisez et imprimez le contrat</p>
        </div>
        <button onClick={onClose} className="inline-form-close"><X size={24} /></button>
      </div>
      <div className="inline-form" style={{ paddingTop: 0 }}>
        <div className="contract-actions-bar" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={() => setShowDisplayOptions(!showDisplayOptions)}>
            <Settings size={16} /> Options d'affichage
          </button>
          <button className="btn btn-primary" onClick={handlePrintClick}>
            <Printer size={16} /> Imprimer / PDF
          </button>
        </div>
        {showDisplayOptions && (
          <ContractDisplayOptions
            options={contractDisplayOptions}
            onOptionChange={handleDisplayOptionChange}
            onResetAll={handleResetAllOptions}
          />
        )}
        <div className="signature-input-section" style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Signatures</h3>
          <div className="signature-inputs" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label>Signature Agent:</label>
              <input type="text" value={contractSignatures.agent} onChange={(e) => setContractSignatures(prev => ({ ...prev, agent: e.target.value }))} placeholder="Nom de l'agent" className="inline-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Signature Locataire (texte):</label>
              <input type="text" value={contractSignatures.locataire} onChange={(e) => setContractSignatures(prev => ({ ...prev, locataire: e.target.value }))} placeholder="Nom du locataire" className="inline-input" />
            </div>
            <div style={{ flex: 1 }}>
              <label>Deuxième Conducteur:</label>
              <input type="text" value={contractSignatures.secondConducteur} onChange={(e) => setContractSignatures(prev => ({ ...prev, secondConducteur: e.target.value }))} placeholder="Nom du conducteur" className="inline-input" />
            </div>
          </div>
          {mergedSignatures.locataire_image && (
            <div style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <label>Signature dessinée du client:</label>
              <img src={mergedSignatures.locataire_image} alt="Signature client" style={{ maxHeight: '80px', display: 'block', marginTop: '0.5rem' }} />
            </div>
          )}
        </div>
        <div className="paperwork-checkboxes" style={{ background: '#f8f9fa', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Documents Remis</h3>
          <div className="checkbox-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.carteGrise} onChange={() => setContractPaperwork(prev => ({ ...prev, carteGrise: !prev.carteGrise }))} /> Carte grise</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.assurance} onChange={() => setContractPaperwork(prev => ({ ...prev, assurance: !prev.assurance }))} /> Assurance</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.vignette} onChange={() => setContractPaperwork(prev => ({ ...prev, vignette: !prev.vignette }))} /> Vignette</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.visiteTechnique} onChange={() => setContractPaperwork(prev => ({ ...prev, visiteTechnique: !prev.visiteTechnique }))} /> Visite technique</label>
            <label className="checkbox-label"><input type="checkbox" checked={contractPaperwork.autorisation} onChange={() => setContractPaperwork(prev => ({ ...prev, autorisation: !prev.autorisation }))} /> Autorisation</label>
          </div>
        </div>
        <ContractLocation
          reservation={{ ...reservation, signatures: mergedSignatures, paperwork: contractPaperwork }}
          showSignatures={true}
          currentUser={currentUser}
          clients={clients}
          displayOptions={contractDisplayOptions}
        />
      </div>

      {/* Modal options d'impression */}
      {showPrintOptions && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Options d'impression</h2>
              <button onClick={() => setShowPrintOptions(false)} className="modal-close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <p>Souhaitez-vous inclure la signature de l'agent dans le contrat ?</p>
            </div>
            <div className="modal-actions-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button onClick={() => handlePrintConfirm(false)} className="btn btn-secondary">
                Sans signature
              </button>
              <button onClick={() => handlePrintConfirm(true)} className="btn btn-primary">
                Avec signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Main AdminReservationsStatus ====================
export default function AdminReservationsStatus() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const store = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');

  const reservations = useSelector(selectReservations);
  const cars = useSelector(selectCars);
  const matricules = useSelector(selectMatricules);
  const clients = useSelector(selectClients);
  const loading = useSelector(selectReservationsLoading);
  const currentUser = useSelector(selectUser);

  const [details, setDetails] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showContract, setShowContract] = useState(false);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState(null);
  const [editingReservation, setEditingReservation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedContractReservation, setSelectedContractReservation] = useState(null);
  const [contractSignatures, setContractSignatures] = useState({
    agent: "", locataire: "", secondConducteur: ""
  });
  const [contractPaperwork, setContractPaperwork] = useState({
    circulation: true, carteGrise: true, assurance: true,
    vignette: true, visiteTechnique: true, autorisation: true
  });
  const [contractDisplayOptions, setContractDisplayOptions] = useState({
    prices: "show", clientInfo: "show", secondDriver: "show",
    vehicleInfo: "show", deliveryReception: "show", rentalDates: "show",
    kilometrage: "show", rentalDays: "show", observations: "show",
    insurance: "show", depositGuarantee: "show", signatures: "show"
  });
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("desc");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const itemsPerPage = 10;

  // ===== Confirm Modal State =====
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingReservationId, setPendingReservationId] = useState(null);
  const [availableMatricules, setAvailableMatricules] = useState([]);
  const [selectedMatriculeId, setSelectedMatriculeId] = useState('');

  // ===== Complete Modal State =====
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeReservationId, setCompleteReservationId] = useState(null);
  const [kilometrageRetour, setKilometrageRetour] = useState('');
  // NEW: states for return date and time
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');

  // Nouveaux états pour la popup d'impression
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printReservation, setPrintReservation] = useState(null);

  // ===== Load data =====
  useEffect(() => {
    const load = async () => {
      await Promise.all([
        dispatch(fetchReservations()),
        dispatch(fetchCars()),
        dispatch(fetchMatricules()),
        dispatch(fetchClients()),
        dispatch(checkLateReservations())
      ]);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // ===== Handle contract opening from navigation =====
  const lastProcessedContractId = useRef(null);

  useEffect(() => {
    const contractReservation = location.state?.contractReservation;
    if (contractReservation) {
      setSelectedContractReservation(contractReservation);
      setShowContract(true);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    const contractId = location.state?.contractId || searchParams.get('contract');
    if (!contractId) {
      lastProcessedContractId.current = null;
      return;
    }
    if (contractId === lastProcessedContractId.current) return;
    if (reservations.length === 0) return;

    lastProcessedContractId.current = contractId;
    const reservation = reservations.find(r => r.id === parseInt(contractId));

    if (reservation) {
      setSelectedContractReservation(reservation);
      setShowContract(true);
      if (location.state?.contractId) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        setSearchParams({});
      }
    } else {
      toast.warning('Réservation non trouvée');
      if (location.state?.contractId) {
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        setSearchParams({});
      }
    }
  }, [location, reservations, navigate, searchParams, setSearchParams]);

  // ============ CRUD Handlers ============
  const handleCreateReservation = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(createReservation(data)).unwrap();
      toast.success("Réservation créée avec succès!");
      setShowReservationForm(false);
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    } catch (error) {
      toast.error(error.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateReservation = async (data) => {
    setSubmitting(true);
    try {
      await dispatch(updateReservation({ id: editingReservation.id, data })).unwrap();
      toast.success("Réservation modifiée avec succès!");
      setShowReservationForm(false);
      setEditingReservation(null);
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    } catch (error) {
      toast.error(error.message || "Erreur lors de la modification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setShowReservationForm(true);
  };

  const handleAddNew = () => {
    setEditingReservation(null);
    setShowReservationForm(true);
  };

  // ===== Confirm Modal Logic =====
  const openConfirmModal = (reservation) => {
    const carId = reservation.car_id;
    const reservedMatriculeIds = reservations
      .filter(r => r.id !== reservation.id && (r.status === 'confirmed' || r.status === 'retard'))
      .map(r => r.matricule_id)
      .filter(Boolean);

    const available = matricules.filter(m =>
      m.car_id === carId &&
      m.status !== 'sold' &&
      !reservedMatriculeIds.includes(m.id)
    );
    setAvailableMatricules(available);
    setPendingReservationId(reservation.id);
    if (reservation.matricule_id) {
      setSelectedMatriculeId(reservation.matricule_id);
    } else {
      setSelectedMatriculeId(available.length > 0 ? available[0].id : '');
    }
    setShowConfirmModal(true);
  };

  const confirmConfirm = async () => {
    if (!selectedMatriculeId) {
        toast.error("Veuillez sélectionner un matricule.");
        return;
    }
    try {
        const result = await dispatch(updateReservation({
            id: pendingReservationId,
            data: { status: 'confirmed', matricule_id: selectedMatriculeId }
        })).unwrap();
        const updatedReservation = result.reservation || result;
        const token = updatedReservation.signature_token || pendingReservationId;
        const code = updatedReservation.signature_code || pendingReservationId;

        toast.success("Réservation confirmée avec succès !");
        await dispatch(fetchReservations(true));
        await dispatch(refreshMatricules(true));

        const link = `${window.location.origin}/sign-contract/${token}`;
        toast.info(
            <div>
                <p>🔗 Lien de signature : <a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
                <p>🔑 Code : <strong>{code}</strong> (à communiquer au client)</p>
            </div>,
            { duration: 10000 }
        );
    } catch (error) {
        toast.error(error.message || "Erreur lors de la confirmation");
    }
    setShowConfirmModal(false);
    setPendingReservationId(null);
    setSelectedMatriculeId('');
  };

  // ===== Complete Modal Logic =====
  const openCompleteModal = (reservation) => {
    setCompleteReservationId(reservation.id);
    setKilometrageRetour(reservation.kilometrage_entree || reservation.matricule_kilometrage_at_start || '');
    // Pre-fill return date & time
    setReturnDate(reservation.end_date ? reservation.end_date.split('T')[0] : '');
    setReturnTime(reservation.end_time || '18:00');
    setShowCompleteModal(true);
  };

  const confirmComplete = async () => {
    if (!kilometrageRetour || isNaN(kilometrageRetour) || parseFloat(kilometrageRetour) < 0) {
      toast.error("Veuillez entrer un kilométrage retour valide.");
      return;
    }
    try {
      await dispatch(updateReservation({
        id: completeReservationId,
        data: {
          status: 'completed',
          end_date: returnDate,
          end_time: returnTime,
          kilometrage_entree: parseFloat(kilometrageRetour)
        }
      })).unwrap();
      toast.success("Réservation terminée avec succès !");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    } catch (error) {
      toast.error(error.message || "Erreur lors de la terminaison");
    }
    setShowCompleteModal(false);
    setCompleteReservationId(null);
    setKilometrageRetour('');
    setReturnDate('');
    setReturnTime('');
  };

  // ----- WhatsApp handler -----
  const handleWhatsApp = (reservation) => {
    const client = clients.find(c => c.id === reservation.client_id);
    if (!client || !client.telephone) {
      toast.error("رقم الهاتف ديال العميل غير موجود.");
      return;
    }
    let phone = client.telephone.replace(/[\s\-\(\)\.]/g, '');
    if (phone.startsWith('0') && phone.length === 10) {
      phone = '212' + phone.substring(1);
    } else if (phone.startsWith('+')) {
      phone = phone.substring(1);
    }
    const total = reservation.total_price || 0;
    const paid = reservation.amount_paid || 0;
    const remaining = reservation.remaining_amount !== undefined ? reservation.remaining_amount : (total - paid);
    const status = reservation.status;
    const clientName = client.prenom ? `${client.prenom} ${client.nom}` : client.nom || "العميل";
    let daysRemaining = null;
    if (reservation.end_date) {
      const today = new Date();
      const end = new Date(reservation.end_date);
      today.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    }
    let message = "";
    switch (status) {
      case "pending":
        message = `السلام عليكم ${clientName}، وصلاتنا طلب ديال الكرية (رقم ${reservation.id}). المجموع هو ${total} درهم، دفعتي ${paid} درهم، باقي ${remaining} درهم. يرجى تأكيد الحجز ديالك. شكراً.`;
        break;
      case "confirmed":
        if (daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 3) {
          message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) كينتهي في ${daysRemaining} يوم. خاص ترجع السيارة في الوقت المحدد. المبلغ المتبقي هو ${remaining} درهم. شكراً.`;
        } else {
          message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) تأكد. المبلغ المتبقي هو ${remaining} درهم. نتمناو لك رحلة موفقة. شكراً.`;
        }
        break;
      case "retard":
        message = `السلام عليكم ${clientName}، الحجز ديالك (رقم ${reservation.id}) متأخر. خاص ترجع السيارة فالحال. المبلغ المتبقي هو ${remaining} درهم. رجاء اتصل بنا. شكراً.`;
        break;
      case "completed":
        message = `السلام عليكم ${clientName}، شكراً على الكرية ديالك (رقم ${reservation.id}). نتمناو نشوفوك مرة أخرى. شكراً.`;
        break;
      case "cancelled":
        message = `السلام عليكم ${clientName}، تم إلغاء الحجز ديالك (رقم ${reservation.id}). إذا عندك أي سؤال، اتصل بنا. شكراً.`;
        break;
      case "contacted":
        message = `السلام عليكم ${clientName}، حاولنا نتواصلو معاك بخصوص الحجز ديالك (رقم ${reservation.id}). خاص ترجع لينا فالحال. شكراً.`;
        break;
      default:
        message = `السلام عليكم ${clientName}، كنا نتواصلو معاك بخصوص الحجز ديالك (رقم ${reservation.id}). المجموع هو ${total} درهم، دفعتي ${paid} درهم، باقي ${remaining} درهم. شكراً.`;
    }
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  // ----- Signature Link handler -----
  const handleSignatureLink = async (reservation) => {
    if (reservation.status !== 'confirmed') {
        toast.warning("Seules les réservations confirmées peuvent avoir un lien de signature.");
        return;
    }

    try {
        const response = await api.post(`/reservations/${reservation.id}/generate-signature`);
        const { signature_token, signature_code } = response.data;

        const link = `${window.location.origin}/sign-contract/${signature_token}`;
        const fullText = `🔗 Lien de signature : ${link}\n🔑 Code : ${signature_code}`;

        navigator.clipboard.writeText(fullText)
            .then(() => {
                toast.success("Nouveau lien et code générés et copiés dans le presse-papier !");
            })
            .catch(() => {
                toast.info(
                    <div>
                        <p>🔗 Lien : <a href={link} target="_blank" rel="noopener noreferrer">{link}</a></p>
                        <p>🔑 Code : <strong>{signature_code}</strong></p>
                    </div>,
                    { duration: 10000 }
                );
            });
    } catch (error) {
        console.error('Error generating signature:', error);
        toast.error(error.response?.data?.message || "Erreur lors de la génération du lien de signature.");
    }
};

  // ===== Modified setStatus to use modals =====
  const setStatus = async (id, newStatus, extraData = {}) => {
    if (newStatus === 'confirmed') {
      const reservation = reservations.find(r => r.id === id);
      if (reservation) {
        openConfirmModal(reservation);
      }
      return;
    }
    if (newStatus === 'completed') {
      const reservation = reservations.find(r => r.id === id);
      if (reservation) {
        openCompleteModal(reservation);
      }
      return;
    }
    const result = await dispatch(updateReservation({ id, data: { status: newStatus, ...extraData } }));
    if (result.error) {
      toast.error(result.payload);
    } else {
      toast.success(newStatus === "cancelled" ? "Annulée" : "Mis à jour");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    }
  };

  // ----- Delete handlers -----
  const handleDeleteClick = (reservation) => {
    setReservationToDelete(reservation);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!reservationToDelete) return;
    const result = await dispatch(deleteReservation(reservationToDelete.id));
    if (result.error) {
      toast.error(result.payload);
    } else {
      toast.success("Réservation supprimée avec succès");
      await dispatch(fetchReservations(true));
      await dispatch(refreshMatricules(true));
    }
    setDeleteModalOpen(false);
    setReservationToDelete(null);
  };

  // ----- Refresh and Export -----
  const refreshData = async () => {
    await Promise.all([
      dispatch(fetchReservations(true)),
      dispatch(fetchCars(true)),
      dispatch(fetchMatricules(true)),
      dispatch(fetchClients(true)),
      dispatch(checkLateReservations())
    ]);
    toast.success("Actualisé");
  };

  const handleExport = () => {
    const headers = ["ID", "Client", "Véhicule", "Immatriculation", "Début", "Fin", "Total (DH)", "Statut"];
    const csvData = reservations.map(r => {
      const client = clients.find(c => c.id === r.client_id);
      const car = cars.find(c => c.id === r.car_id);
      const mat = matricules.find(m => m.id === r.matricule_id);
      return [
        r.id,
        client ? `"${client.prenom} ${client.nom}"` : "N/A",
        car ? `"${car.brand} ${car.model}"` : "N/A",
        mat?.matricule_code || "",
        r.start_date,
        r.end_date,
        r.total_price,
        r.status
      ].join(",");
    });
    const blob = new Blob([headers.join(",") + "\n" + csvData.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations_status_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV effectué");
  };

  // ----- Utility functions -----
  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 0 ? 1 : diffDays; // exclusive
  };

  const calculateDaysRemaining = (reservation) => {
    if (!reservation.end_date) return "";
    const today = new Date();
    const end = new Date(reservation.end_date);
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      const lateDays = Math.abs(diffDays);
      return lateDays === 1 ? "+1 jour de retard" : `+${lateDays} jours de retard`;
    }
    if (diffDays === 0) return "Dernier jour";
    if (diffDays === 1) return "1 jour restant";
    return `${diffDays} jours restants`;
  };

  // ----- Gestion de l'impression avec popup -----
  const handlePrintClick = (reservation) => {
    setSelectedContractReservation(reservation);
    setPrintReservation(reservation);
    setShowPrintOptions(true);
  };

  const handlePrintConfirm = (withSignature) => {
    setShowPrintOptions(false);
    setTimeout(() => {
      generateContractPDF(printReservation, withSignature);
      setPrintReservation(null);
    }, 200);
  };

  const generateContractPDF = async (reservation, includeSignatures = false) => {
    try {
      toast.loading("Génération du contrat en cours...", { id: "contract-pdf" });
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const contractElement = document.getElementById("contract-print");
      if (!contractElement) {
        console.error("Contract element not found");
        toast.error("Erreur: Élément du contrat non trouvé", { id: "contract-pdf" });
        return;
      }
      const contractClone = contractElement.cloneNode(true);

      if (includeSignatures) {
        const signatureBlocks = contractClone.querySelectorAll('.signature-block');
        if (signatureBlocks.length >= 1) {
          const agentBlock = signatureBlocks[0];
          const signatureBox = agentBlock.querySelector('.signature-box');
          if (signatureBox) {
            signatureBox.innerHTML = `<img src="${agentSignatureImage}" style="max-height:60px; max-width:100%;" />`;
          }
        }
      }

      contractClone.style.width = "210mm";
      contractClone.style.height = "auto";
      contractClone.style.padding = "15px";
      contractClone.style.margin = "0";
      contractClone.style.boxSizing = "border-box";
      contractClone.style.backgroundColor = "white";
      contractClone.style.position = "absolute";
      contractClone.style.top = "-9999px";
      contractClone.style.left = "0";
      document.body.appendChild(contractClone);
      const images = contractClone.querySelectorAll("img");
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
      }));
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(contractClone, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      document.body.removeChild(contractClone);
      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      doc.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
      doc.save(`contrat-location-${reservation.id}.pdf`);
      toast.success("Contrat généré avec succès!", { id: "contract-pdf" });
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erreur lors de la génération du contrat", { id: "contract-pdf" });
    }
  };

  const handleViewContract = (reservation) => {
    setSelectedContractReservation(reservation);
    setShowContract(true);
  };

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

  // ----- Filtering and sorting (ONLY pending, cancelled, contacted) -----
  const filteredReservations = useMemo(() => {
    let filtered = reservations.filter(r => {
      // ============ ONLY include pending, cancelled, contacted ============
      if (r.status !== 'pending' && r.status !== 'cancelled' && r.status !== 'contacted') {
        return false;
      }

      const client = clients.find(c => c.id === r.client_id);
      const car = cars.find(c => c.id === r.car_id);
      const mat = matricules.find(m => m.id === r.matricule_id);
      if (search &&
          !`${client?.prenom} ${client?.nom}`.toLowerCase().includes(search.toLowerCase()) &&
          !`${car?.brand} ${car?.model}`.toLowerCase().includes(search.toLowerCase()) &&
          !mat?.matricule_code?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // ===== FIX: Use URL filter parameter first, then fallback to dropdown =====
      if (filterParam) {
        if (r.status !== filterParam) return false;
      } else if (statusFilter) {
        if (r.status !== statusFilter) return false;
      }

      return true;
    });

    // Date filters
    if (startDateFilter && endDateFilter) {
      const filterStart = new Date(startDateFilter);
      const filterEnd = new Date(endDateFilter);
      filtered = filtered.filter(r => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        return start <= filterEnd && end >= filterStart;
      });
    } else if (startDateFilter) {
      const filterStart = new Date(startDateFilter);
      filtered = filtered.filter(r => new Date(r.start_date) >= filterStart);
    } else if (endDateFilter) {
      const filterEnd = new Date(endDateFilter);
      filtered = filtered.filter(r => new Date(r.end_date) <= filterEnd);
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      switch (sortField) {
        case "id": aVal = a.id; bVal = b.id; break;
        case "client": const aClient = clients.find(c => c.id === a.client_id); const bClient = clients.find(c => c.id === b.client_id); aVal = aClient ? `${aClient.prenom} ${aClient.nom}` : ""; bVal = bClient ? `${bClient.prenom} ${bClient.nom}` : ""; break;
        case "vehicle": const aCar = cars.find(c => c.id === a.car_id); const bCar = cars.find(c => c.id === b.car_id); aVal = aCar ? `${aCar.brand} ${aCar.model}` : ""; bVal = bCar ? `${bCar.brand} ${bCar.model}` : ""; break;
        case "matricule": const aMat = matricules.find(m => m.id === a.matricule_id); const bMat = matricules.find(m => m.id === b.matricule_id); aVal = aMat?.matricule_code || ""; bVal = bMat?.matricule_code || ""; break;
        case "start_date": aVal = new Date(a.start_date); bVal = new Date(b.start_date); break;
        case "end_date": aVal = new Date(a.end_date); bVal = new Date(b.end_date); break;
        case "days": aVal = calculateDays(a.start_date, a.end_date); bVal = calculateDays(b.start_date, b.end_date); break;
        case "total": aVal = a.total_price || 0; bVal = b.total_price || 0; break;
        case "status": aVal = a.status; bVal = b.status; break;
        default: aVal = a.id; bVal = b.id;
      }
      if (sortDirection === "asc") return aVal > bVal ? 1 : -1;
      else return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [reservations, clients, cars, matricules, search, statusFilter, sortField, sortDirection, startDateFilter, endDateFilter, filterParam]);

  const totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
  const paginated = filteredReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    const config = {
      pending: { class: "badge-warning", label: "En attente", icon: Clock },
      confirmed: { class: "badge-success", label: "Confirmée", icon: Check },
      contacted: { class: "badge-purple", label: "Contacté", icon: Phone },
      completed: { class: "badge-blue", label: "Terminée", icon: CheckCircle },
      cancelled: { class: "badge-gray", label: "Annulée", icon: XCircle },
      retard: { class: "badge-danger", label: "En retard", icon: AlertTriangle }
    };
    const c = config[status] || config.pending;
    const IconComponent = c.icon;
    return (
      <span className={`badge ${c.class}`}>
        <IconComponent size={12} className="badge-icon" />
        {c.label}
      </span>
    );
  };

  const clearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Chargement des réservations...</p>
      </div>
    );
  }

  // ===== Modals rendering =====
  const renderConfirmModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Confirmer la réservation</h2>
          <button onClick={() => setShowConfirmModal(false)} className="modal-close"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <p style={{ marginBottom: '1rem' }}>Sélectionnez le matricule à attribuer à cette réservation :</p>
          {availableMatricules.length === 0 ? (
            <p style={{ color: 'red' }}>Aucun matricule disponible pour ce véhicule.</p>
          ) : (
            <div className="form-group">
              <label>Matricule</label>
              <select
                value={selectedMatriculeId}
                onChange={(e) => setSelectedMatriculeId(e.target.value)}
                className="inline-select"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                <option value="">Sélectionner un matricule</option>
                {availableMatricules.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.matricule_code} - {m.kilometrage} km
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowConfirmModal(false)} className="btn btn-secondary">Annuler</button>
          <button onClick={confirmConfirm} className="btn btn-primary" disabled={availableMatricules.length === 0 || !selectedMatriculeId}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );

  const renderCompleteModal = () => (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">Terminer la réservation</h2>
          <button onClick={() => setShowCompleteModal(false)} className="modal-close"><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label>Date de retour</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="inline-input"
                style={{ width: '100%', padding: '0.75rem' }}
              />
            </div>
            <div className="form-group">
              <label>Heure de retour</label>
              <input
                type="time"
                value={returnTime}
                onChange={(e) => setReturnTime(e.target.value)}
                className="inline-input"
                style={{ width: '100%', padding: '0.75rem' }}
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Km retour</label>
            <input
              type="number"
              value={kilometrageRetour}
              onChange={(e) => setKilometrageRetour(e.target.value)}
              className="inline-input"
              placeholder="Ex: 12345"
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>
        </div>
        <div className="modal-actions-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowCompleteModal(false)} className="btn btn-secondary">Annuler</button>
          <button onClick={confirmComplete} className="btn btn-primary" disabled={!kilometrageRetour || isNaN(kilometrageRetour)}>
            Terminer
          </button>
        </div>
      </div>
    </div>
  );

  // ===== Main render =====
  return (
    <>
      {selectedContractReservation && (
        <div style={{ display: "none" }}>
          <ContractLocation
            reservation={{
              ...selectedContractReservation,
              signatures: contractSignatures,
              paperwork: contractPaperwork
            }}
            currentUser={currentUser}
            clients={clients}
            displayOptions={contractDisplayOptions}
          />
        </div>
      )}

      {showContract && selectedContractReservation ? (
        <ContractViewPage
          reservation={selectedContractReservation}
          onClose={() => setShowContract(false)}
          currentUser={currentUser}
          clients={clients}
        />
      ) : showReservationForm ? (
        <ReservationForm
          isOpen={showReservationForm}
          onClose={() => { setShowReservationForm(false); setEditingReservation(null); }}
          onSubmit={editingReservation ? handleUpdateReservation : handleCreateReservation}
          editingReservation={editingReservation}
          clients={clients}
          cars={cars}
          matricules={matricules}
          submitting={submitting}
        />
      ) : (
        <div className="admin-container">
          <div className="header">
            <div>
              <h1 className="title">Réservations – En attente / Annulées / Contactées</h1>
              <p className="subtitle">{filteredReservations.length} réservation(s) dans ces statuts</p>
            </div>
            <div className="flex gap-2">
              <button onClick={refreshData} className="btn btn-secondary"><RefreshCw size={16} /> Actualiser</button>
              <button onClick={handleExport} className="btn btn-secondary"><Download size={16} /> Exporter</button>
              <button onClick={handleAddNew} className="btn btn-primary"><Plus size={16} /> Nouvelle Réservation</button>
            </div>
          </div>

          <div className="search-wrapper">
            <div className="search-row">
              <input
                type="text"
                placeholder="Rechercher par client, véhicule, immatriculation..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="search-input"
              />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="filter-select"
              >
                <option value="">Tous statuts</option>
                <option value="pending">En attente</option>
                <option value="contacted">Contacté</option>
                <option value="cancelled">Annulée</option>
              </select>
              <div className="date-filter-group">
                <label className="date-filter-label">Du</label>
                <input type="date" value={startDateFilter} onChange={(e) => { setStartDateFilter(e.target.value); setCurrentPage(1); }} className="date-filter-input" />
                <label className="date-filter-label">Au</label>
                <input type="date" value={endDateFilter} onChange={(e) => { setEndDateFilter(e.target.value); setCurrentPage(1); }} className="date-filter-input" />
                {(startDateFilter || endDateFilter) && (
                  <button onClick={clearDateFilters} className="clear-date-btn" title="Effacer les filtres de date"><X size={16} /></button>
                )}
              </div>
            </div>
          </div>

          <div className="table-info">
            <p className="table-info-text">{filteredReservations.length} réservation(s)</p>
            <p className="table-info-text">Page {currentPage} / {totalPages || 1}</p>
          </div>

          <div className="table-wrapper">
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort("id")} className="sortable-header">ID {getSortIcon("id")}</th>
                    <th onClick={() => handleSort("client")} className="sortable-header">Client {getSortIcon("client")}</th>
                    <th onClick={() => handleSort("vehicle")} className="sortable-header">Véhicule / Matricule {getSortIcon("vehicle")}</th>
                    <th onClick={() => handleSort("start_date")} className="sortable-header">Période {getSortIcon("start_date")}</th>
                    <th onClick={() => handleSort("days")} className="sortable-header">Jours {getSortIcon("days")}</th>
                    <th className="sortable-header">Jours Restants</th>
                    <th onClick={() => handleSort("total")} className="sortable-header">Total {getSortIcon("total")}</th>
                    <th onClick={() => handleSort("status")} className="sortable-header">Statut {getSortIcon("status")}</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr><td colSpan="9" className="text-center py-12">Aucune réservation</td></tr>
                  ) : (
                    paginated.map(r => {
                      const client = clients.find(c => c.id === r.client_id);
                      const car = cars.find(c => c.id === r.car_id);
                      const mat = matricules.find(m => m.id === r.matricule_id);
                      const days = calculateDays(r.start_date, r.end_date);
                      const daysRemaining = calculateDaysRemaining(r);
                      const secondDriver = clients.find(c => c.id === r.second_driver_client_id);
                      return (
                        <tr key={r.id}>
                          <td className="font-medium">#{r.id}</td>
                          <td>
                            <div className="flex items-center gap-1">
                              <User size={14} />
                              <div>
                                <div>{client ? `${client.prenom} ${client.nom}` : "—"}</div>
                                {secondDriver && r.has_second_driver && (
                                  <div className="second-driver-info"><Users size={10} /> {secondDriver.prenom} {secondDriver.nom}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="vehicle-info-cell">
                              <div className="vehicle-model">{car ? `${car.brand} ${car.model}` : "—"}</div>
                              <div className="vehicle-matricule">{mat?.matricule_code || "—"}</div>
                            </div>
                          </td>
                          <td className="text-xs">{new Date(r.start_date).toLocaleDateString("fr-FR")}<br />→ {new Date(r.end_date).toLocaleDateString("fr-FR")}</td>
                          <td className="text-center">{days}</td>
                          <td className={`days-remaining-cell ${r.status === "retard" ? "late" : ""}`}>{daysRemaining}</td>
                          <td className="font-semibold">{r.total_price} DH</td>
                          <td>{getStatusBadge(r.status)}</td>
                          <td className="text-right">
                            <div className="action-buttons">
                              {r.status === "pending" || r.status === "contacted" ? (
                                <>
                                  <button onClick={() => setStatus(r.id, "confirmed")} className="action-btn action-btn-success" title="Confirmer"><Check size={16} /></button>
                                  <button onClick={() => setStatus(r.id, "cancelled")} className="action-btn action-btn-danger" title="Annuler"><X size={16} /></button>
                                </>
                              ) : r.status === "cancelled" ? (
                                <button onClick={() => setStatus(r.id, "pending")} className="action-btn action-btn-warning" title="Remettre en attente">↩</button>
                              ) : null}
                              <button onClick={() => handleViewContract(r)} className="action-btn action-btn-info" title="Voir contrat"><FileText size={16} /></button>
                              <button onClick={() => handlePrintClick(r)} className="action-btn action-btn-print" title="Imprimer"><Printer size={16} /></button>
                              <button onClick={() => handleWhatsApp(r)} className="action-btn action-btn-whatsapp" title="Envoyer un message WhatsApp"><MessageCircle size={16} /></button>
                              <button onClick={() => handleEdit(r)} className="action-btn action-btn-edit" title="Modifier"><Edit size={16} /></button>
                              <button onClick={() => setDetails(r)} className="action-btn action-btn-view" title="Détails"><Eye size={16} /></button>
                              <button onClick={() => handleDeleteClick(r)} className="action-btn action-btn-delete" title="Supprimer"><Trash2 size={16} /></button>
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
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="page-btn"><ChevronLeft size={16} /></button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  let p = i + 1;
                  if (totalPages > 5 && currentPage > 3) { p = currentPage - 3 + i; if (p > totalPages) return null; }
                  return <button key={i} onClick={() => setCurrentPage(p)} className={`page-btn ${currentPage === p ? "active" : ""}`}>{p}</button>;
                })}
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="page-btn"><ChevronRight size={16} /></button>
              </div>
            )}
          </div>

          {/* Details Modal */}
          {details && (
            <div className="modal-overlay">
              <div className="modal">
                <div className="modal-header"><h2 className="modal-title" style={{ padding: 0 }}>Détails réservation #{details.id}</h2><button onClick={() => setDetails(null)} className="modal-close"><X size={20} /></button></div>
                {(() => {
                  const client = clients.find(c => c.id === details.client_id);
                  const car = cars.find(c => c.id === details.car_id);
                  const mat = matricules.find(m => m.id === details.matricule_id);
                  const secondDriver = clients.find(c => c.id === details.second_driver_client_id);
                  let paymentHistory = details.payment_history;
                  if (typeof paymentHistory === 'string') {
                    try {
                      paymentHistory = JSON.parse(paymentHistory);
                    } catch (e) {
                      paymentHistory = [];
                    }
                  }
                  if (!Array.isArray(paymentHistory)) paymentHistory = [];

                  return (
                    <div className="details-grid">
                      <div className="details-row"><span className="details-label"><User size={14} /> Client</span><span className="details-value">{client ? `${client.prenom} ${client.nom}` : "—"}</span></div>
                      {client && (<><div className="details-row"><span className="details-label"><Mail size={14} /> Email</span><span>{client.email || "—"}</span></div><div className="details-row"><span className="details-label"><Phone size={14} /> Téléphone</span><span>{client.telephone || "—"}</span></div><div className="details-row"><span className="details-label"><MapPin size={14} /> Ville</span><span>{client.city || "—"}</span></div><div className="details-row"><span className="details-label"><IdCard size={14} /> CIN</span><span>{client.cin_number || "—"}</span></div></>)}
                      {details.has_second_driver && secondDriver && (<><div className="details-row"><span className="details-label"><Users size={14} /> 2ème Conducteur</span><span>{secondDriver.prenom} {secondDriver.nom}</span></div><div className="details-row"><span className="details-label"><Phone size={14} /> Tél. conducteur</span><span>{secondDriver.telephone || "—"}</span></div></>)}
                      <div className="details-row"><span className="details-label"><Car size={14} /> Véhicule</span><span>{car ? `${car.brand} ${car.model}` : "—"}</span></div>
                      <div className="details-row"><span className="details-label"><IdCard size={14} /> Immatriculation</span><span className="font-mono">{mat?.matricule_code || "—"}</span></div>
                      <div className="details-row"><span className="details-label"><Gauge size={14} /> Km départ</span><span>{details.kilometrage_sortie || "—"} km</span></div>
                      {details.status === "completed" && (<div className="details-row"><span className="details-label"><Gauge size={14} /> Km retour</span><span>{details.kilometrage_entree || "—"} km</span></div>)}
                      <div className="details-row"><span className="details-label"><Calendar size={14} /> Période</span><span>{new Date(details.start_date).toLocaleDateString("fr-FR")} → {new Date(details.end_date).toLocaleDateString("fr-FR")}</span></div>
                      <div className="details-row"><span className="details-label"><Clock size={14} /> Heures</span><span>{details.start_time || "08:00"} → {details.end_time || "18:00"}</span></div>
                      <div className="details-row"><span className="details-label"><CalendarDays size={14} /> Jours</span><span>{calculateDays(details.start_date, details.end_date)}</span></div>
                      <div className="details-row"><span className="details-label"><DollarSign size={14} /> Total</span><span className="details-value">{details.total_price} DH</span></div>
                      <div className="details-row"><span className="details-label"><DollarSign size={14} /> Payé</span><span>{details.amount_paid} DH</span></div>
                      <div className="details-row"><span className="details-label"><DollarSign size={14} /> Restant</span><span>{details.remaining_amount} DH</span></div>
                      <div className="details-row"><span className="details-label"><Info size={14} /> Statut</span><span>{getStatusBadge(details.status)}</span></div>
                      {details.notes && (<div className="details-row"><span className="details-label"><Info size={14} /> Notes</span><span>{details.notes}</span></div>)}
                      {paymentHistory.length > 0 && (
                        <div className="details-row">
                          <span className="details-label"><Receipt size={14} /> Paiements</span>
                          <div>
                            {paymentHistory.map((p, idx) => (
                              <div key={idx} className="payment-item-detail">
                                {new Date(p.date).toLocaleDateString("fr-FR")}: {p.amount} DH ({p.method})
                                {p.notes && ` - ${p.notes}`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="modal-actions-footer"><button onClick={() => setDetails(null)} className="btn btn-secondary">Fermer</button></div>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {deleteModalOpen && reservationToDelete && (
            <div className="modal-overlay">
              <div className="modal delete-modal">
                <div className="delete-icon"><Trash2 size={32} /></div>
                <h3 className="delete-title">Confirmer la suppression</h3>
                <p className="delete-message">Êtes-vous sûr de vouloir supprimer la réservation <br /><span className="reservation-id">#{reservationToDelete.id}</span> ?<br />Cette action est irréversible.</p>
                {reservationToDelete.status === "confirmed" && (<p className="delete-message" style={{ fontSize: "0.75rem", color: "#dc2626" }}>⚠️ Cette réservation est confirmée. La suppression affectera les données associées.</p>)}
                <div className="delete-actions"><button onClick={() => setDeleteModalOpen(false)} className="modal-btn modal-btn-cancel">Annuler</button><button onClick={confirmDelete} className="modal-btn btn-delete">Supprimer</button></div>
              </div>
            </div>
          )}

          {/* Popup d'options d'impression */}
          {showPrintOptions && printReservation && (
            <div className="modal-overlay">
              <div className="modal" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                  <h2 className="modal-title">Options d'impression</h2>
                  <button onClick={() => setShowPrintOptions(false)} className="modal-close">
                    <X size={20} />
                  </button>
                </div>
                <div className="modal-body" style={{ padding: '1.5rem' }}>
                  <p>Souhaitez-vous inclure la signature de l'agent dans le contrat ?</p>
                </div>
                <div className="modal-actions-footer" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button onClick={() => handlePrintConfirm(false)} className="btn btn-secondary">
                    Sans signature
                  </button>
                  <button onClick={() => handlePrintConfirm(true)} className="btn btn-primary">
                    Avec signature
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals for confirm and complete */}
      {showConfirmModal && renderConfirmModal()}
      {showCompleteModal && renderCompleteModal()}

      {/* ===== STYLES ===== */}
      <style>{`
        /* All styles from previous version (unchanged) */
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
        .inline-input, .inline-select, .inline-textarea { padding: 10px 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 0.875rem; transition: all 0.2s; background: white; font-family: inherit; }
        .inline-input:focus, .inline-select:focus, .inline-textarea:focus { outline: none; border-color: #eab308; box-shadow: 0 0 0 3px rgba(234, 179, 8, 0.1); }
        .inline-textarea { resize: vertical; min-height: 80px; }
        .inline-search-section { background: white; border-radius: 16px; padding: 16px; margin-bottom: 16px; border: 1px solid #e2e8f0; }
        .inline-search-input-wrapper { position: relative; margin-bottom: 12px; }
        .inline-search-input-wrapper svg { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
        .inline-search-input-wrapper .inline-input { padding-left: 42px; }
        .inline-results { max-height: 250px; overflow-y: auto; margin-bottom: 12px; border-radius: 12px; border: 1px solid #e2e8f0; }
        .inline-result-item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
        .inline-result-item:hover { background: #fefce8; }
        .inline-result-avatar { width: 36px; height: 36px; background: linear-gradient(135deg, #1a1a2e, #16213e); border-radius: 36px; display: flex; align-items: center; justify-content: center; color: #eab308; }
        .inline-result-info { flex: 1; }
        .inline-result-info strong { display: block; margin-bottom: 4px; font-size: 0.875rem; }
        .inline-result-details { display: flex; gap: 12px; font-size: 0.7rem; color: #64748b; flex-wrap: wrap; }
        .inline-matricule-code { font-family: monospace; font-size: 0.9rem; color: #eab308; }
        .inline-selected { background: linear-gradient(135deg, #fefce8, #fef3c7); border-radius: 12px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; margin-top: 12px; }
        .inline-selected svg { color: #eab308; flex-shrink: 0; }
        .inline-selected strong { display: block; font-size: 0.7rem; color: #92400e; }
        .inline-selected p { font-size: 0.8rem; font-weight: 500; margin: 0; }
        .inline-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.875rem; font-weight: 500; margin-bottom: 12px; }
        .inline-outline-btn, .inline-secondary-btn { background: white; border: 1.5px solid #e2e8f0; padding: 8px 16px; border-radius: 40px; font-size: 0.75rem; font-weight: 500; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .inline-outline-btn:hover, .inline-secondary-btn:hover { border-color: #eab308; color: #eab308; }
        .inline-primary-btn { background: linear-gradient(135deg, #1a1a2e, #16213e); border: none; padding: 12px 28px; border-radius: 40px; font-size: 0.875rem; font-weight: 600; color: #eab308; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; }
        .inline-primary-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 15px rgba(26, 26, 46, 0.4); color: #fbbf24; }
        .inline-primary-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .inline-payment-section { margin-top: 20px; }
        .inline-add-payment { background: #eab308; color: #1a1a2e; border: none; padding: 8px 16px; border-radius: 40px; font-size: 0.75rem; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .inline-add-payment:hover { background: #fbbf24; }
        .inline-payment-form { background: white; padding: 16px; border-radius: 16px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .inline-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 16px; }
        .inline-history { background: white; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; }
        .inline-history h4 { padding: 12px 16px; background: #f8fafc; margin: 0; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e2e8f0; }
        .inline-history-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid #f1f5f9; }
        .inline-history-info { display: flex; gap: 16px; align-items: center; font-size: 0.75rem; flex-wrap: wrap; }
        .inline-history-date { color: #64748b; min-width: 80px; }
        .inline-history-method { background: #f1f5f9; padding: 2px 8px; border-radius: 40px; }
        .inline-history-amount { font-weight: 600; color: #eab308; }
        .inline-history-delete { background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; }
        .inline-new-client { padding: 8px 0; }
        .inline-form-footer { display: flex; justify-content: flex-end; gap: 16px; padding-top: 24px; border-top: 1px solid #e2e8f0; margin-top: 24px; }
        .admin-container { max-width: 1400px; padding: 1.5rem; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .title { font-size: 1.875rem; font-weight: 700; background: linear-gradient(135deg, #0f172a, #334155); background-clip: text; -webkit-background-clip: text; color: transparent; }
        .subtitle { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2.5rem; padding: 0 1rem; border-radius: 9999px; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .btn-secondary { background: #f1f5f9; color: #1e293b; }
        .btn-secondary:hover { background: #e2e8f0; transform: translateY(-1px); }
        .btn-primary { background: linear-gradient(135deg, #0f172a, #1e293b); color: white; }
        .btn-primary:hover { background: linear-gradient(135deg, #1e293b, #334155); transform: translateY(-1px); }
        .search-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; margin-bottom: 1.5rem; }
        .search-row { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
        .search-input { flex: 1; padding: 0.5rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; transition: all 0.2s; min-width: 150px; }
        .search-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }
        .filter-select { width: 12rem; padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; cursor: pointer; }
        .date-filter-group { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .date-filter-label { font-size: 0.75rem; font-weight: 500; color: #64748b; }
        .date-filter-input { padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; background: white; transition: all 0.2s; width: 140px; }
        .date-filter-input:focus { outline: none; border-color: #0f172a; box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1); }
        .clear-date-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem; background: #fee2e2; border: none; border-radius: 0.5rem; cursor: pointer; color: #dc2626; transition: all 0.2s; }
        .clear-date-btn:hover { background: #fecaca; }
        .table-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding: 0 0.25rem; }
        .table-info-text { font-size: 0.875rem; color: #64748b; }
        .table-wrapper { background: white; border: 1px solid #e2e8f0; border-radius: 1rem; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .table { width: 100%; font-size: 0.875rem; border-collapse: collapse; }
        .table th { text-align: left; padding: 0.75rem 1rem; background: #f8fafc; color: #64748b; font-weight: 500; }
        .table td { padding: 0.75rem 1rem; border-top: 1px solid #e2e8f0; }
        .table tr:hover { background: #f8fafc; }
        .second-driver-info { font-size: 0.65rem; color: #eab308; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
        .vehicle-info-cell { display: flex; flex-direction: column; }
        .vehicle-model { font-weight: 500; }
        .vehicle-matricule { font-size: 0.7rem; font-family: monospace; color: #64748b; }
        .badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; }
        .badge-warning { background: #fef3c7; color: #92400e; }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-blue { background: #dbeafe; color: #1e40af; }
        .badge-purple { background: #f3e8ff; color: #6b21a5; }
        .badge-gray { background: #f1f5f9; color: #475569; }
        .days-remaining-cell { font-size: 0.75rem; font-weight: 500; }
        .days-remaining-cell.late { color: #dc2626; font-weight: 600; }
        .action-buttons { display: flex; gap: 0.25rem; justify-content: flex-end; flex-wrap: wrap; }
        .action-btn { padding: 0.5rem; background: none; border: none; cursor: pointer; border-radius: 0.5rem; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .action-btn-success { color: #16a34a; }
        .action-btn-success:hover { background: #f0fdf4; }
        .action-btn-danger { color: #dc2626; }
        .action-btn-danger:hover { background: #fef2f2; }
        .action-btn-primary { color: #eab308; }
        .action-btn-primary:hover { background: #fefce8; }
        .action-btn-link { color: #3b82f6; }
        .action-btn-link:hover { background: #eff6ff; }
        .action-btn-info { color: #3b82f6; }
        .action-btn-info:hover { background: #eff6ff; }
        .action-btn-print { color: #8b5cf6; }
        .action-btn-print:hover { background: #f5f3ff; }
        .action-btn-edit { color: #10b981; }
        .action-btn-edit:hover { background: #ecfdf5; }
        .action-btn-view { color: #06b6d4; }
        .action-btn-view:hover { background: #ecfeff; }
        .action-btn-delete { color: #ef4444; }
        .action-btn-delete:hover { background: #fef2f2; }
        .action-btn-whatsapp { color: #25d366; }
        .action-btn-whatsapp:hover { background: #ecfdf5; }
        .pagination { display: flex; justify-content: center; gap: 0.25rem; padding: 1rem; border-top: 1px solid #e2e8f0; }
        .page-btn { padding: 0.5rem 0.75rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; background: white; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; justify-content: center; }
        .page-btn:hover:not(:disabled) { background: #f1f5f9; }
        .page-btn.active { background: #0f172a; color: white; border-color: #0f172a; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-overlay { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; animation: fadeIn 0.2s ease; }
        .modal { background: white; border-radius: 1.5rem; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; animation: slideUp 0.3s ease; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 0 1.5rem; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; background: white; z-index: 10; }
        .modal-title { font-size: 1.25rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem; }
        .modal-close { background: #f1f5f9; border: none; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .details-grid { display: flex; flex-direction: column; gap: 0.5rem; padding: 1.5rem; }
        .details-row { display: grid; grid-template-columns: 160px 1fr; gap: 0.5rem; padding: 0.5rem 0; border-bottom: 1px solid #e2e8f0; }
        .details-label { display: flex; align-items: center; gap: 0.5rem; color: #64748b; font-weight: 500; }
        .modal-actions-footer { display: flex; justify-content: flex-end; margin-top: 1rem; padding: 1rem 1.5rem 1.5rem 1.5rem; border-top: 1px solid #e2e8f0; }
        .modal-btn { flex: 1; height: 2.75rem; border-radius: 0.75rem; border: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; }
        .modal-btn-cancel { border: 1px solid #e2e8f0; background: white; }
        .btn-delete { background: #ef4444; color: white; }
        .delete-modal { max-width: 28rem; }
        .delete-icon { width: 4rem; height: 4rem; background: #fee2e2; border-radius: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; }
        .delete-title { text-align: center; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
        .delete-message { text-align: center; font-size: 0.875rem; color: #64748b; margin-bottom: 1rem; }
        .reservation-id { font-weight: 700; color: #0f172a; background: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.5rem; display: inline-block; }
        .delete-actions { display: flex; gap: 0.75rem; padding-top: 1rem; }
        .loading { text-align: center; padding: 3rem; }
        .spinner { display: inline-block; width: 2rem; height: 2rem; border-radius: 50%; border: 2px solid #e2e8f0; border-top-color: #0f172a; animation: spin 0.6s linear infinite; }
        .flex { display: flex; }
        .gap-2 { gap: 0.5rem; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-xs { font-size: 0.75rem; }
        .font-mono { font-family: monospace; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .py-12 { padding: 3rem 0; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @media (max-width: 1024px) { .inline-form-grid { grid-template-columns: 1fr; gap: 24px; } }
        @media (max-width: 768px) { .admin-container { padding: 1rem; } .header { flex-direction: column; align-items: flex-start; } .search-row { flex-direction: column; align-items: stretch; } .filter-select { width: 100%; } .date-filter-group { flex-wrap: wrap; } .date-filter-input { width: 100%; } .action-buttons { flex-wrap: wrap; } .inline-grid-2 { grid-template-columns: 1fr; } .details-row { grid-template-columns: 1fr; gap: 0.25rem; } .inline-form-container { margin: 1rem; } .inline-form-header { padding: 16px 20px; } .inline-form-header h2 { font-size: 1.25rem; } .inline-form { padding: 20px; } }
        @media (prefers-color-scheme: dark) { body { background: #0f172a; } .table-wrapper, .search-wrapper, .modal, .contract-modal, .inline-form-container { background: #1e293b; border-color: #334155; } .table-info-text, .table th, .subtitle, .details-label, .delete-message, .contract-modal-header h2 { color: #94a3b8; } .title { background: linear-gradient(135deg, #f1f5f9, #94a3b8); background-clip: text; -webkit-background-clip: text; } .btn-secondary { background: #334155; color: #f1f5f9; } .search-input, .filter-select, .date-filter-input, .inline-input, .inline-select, .inline-textarea { background: #0f172a; border-color: #334155; color: #f1f5f9; } .inline-section { background: #0f172a; border-color: #334155; } .inline-section-header h3 { color: #f1f5f9; } .inline-search-section, .inline-payment-form { background: #0f172a; border-color: #334155; } .inline-result-item { border-bottom-color: #334155; } .inline-result-item:hover { background: #334155; } .inline-history, .inline-results { background: #0f172a; border-color: #334155; } .inline-history h4 { background: #1e293b; } .modal-close { background: #334155; color: #f1f5f9; } .page-btn { background: #1e293b; border-color: #475569; color: #e2e8f0; } .page-btn.active { background: #f59e0b; color: #0f172a; } .badge-warning { background: #78350f; color: #fde68a; } .badge-success { background: #14532d; color: #4ade80; } .badge-danger { background: #7f1d1d; color: #fca5a5; } .badge-blue { background: #1e3a5f; color: #60a5fa; } .badge-purple { background: #4c1d95; color: #c084fc; } .badge-gray { background: #334155; color: #cbd5e1; } .table tr:hover { background: #334155; } .details-row { border-bottom-color: #334155; } .delete-icon { background: #7f1d1d; } .reservation-id { background: #334155; color: #f1f5f9; } .contract-modal-header { background: #0f172a; border-color: #334155; } .display-options-panel, .signature-input-section, .paperwork-checkboxes { background: #0f172a; border-color: #334155; } .display-option-item { background: #1e293b; border-color: #475569; } .mode-btn { background: #334155; border-color: #475569; color: #cbd5e1; } .mode-btn.active { background: #eab308; color: #0f172a; } .sortable-header:hover { background-color: #334155; } .clear-date-btn { background: #7f1d1d; color: #fca5a5; } .clear-date-btn:hover { background: #991b1b; } .action-btn-whatsapp { color: #25d366; } .action-btn-whatsapp:hover { background: #064e3b; } .action-btn-link { color: #60a5fa; } .action-btn-link:hover { background: #1e3a5f; } }
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
        /* ===== Display Options Panel ===== */
        .display-options-panel {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border: 1px solid #e2e8f0;
        }
        .display-options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .display-options-header h3 {
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }
        .reset-all-btn {
          background: none;
          border: 1px solid #e2e8f0;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.7rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          transition: all 0.2s;
        }
        .reset-all-btn:hover {
          background: #f1f5f9;
        }
        .display-options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .display-option-item {
          background: #f8fafc;
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .display-option-label {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .display-option-buttons {
          display: flex;
          gap: 0.25rem;
        }
        .mode-btn {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 0.2rem 0.4rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          color: #64748b;
        }
        .mode-btn.active {
          background: #eab308;
          border-color: #eab308;
          color: #0f172a;
        }
        .mode-btn:hover {
          background: #f1f5f9;
        }
        @media (prefers-color-scheme: dark) {
          .display-options-panel {
            background: #1e293b;
            border-color: #334155;
          }
          .display-option-item {
            background: #0f172a;
            border-color: #475569;
          }
          .mode-btn {
            background: #1e293b;
            border-color: #475569;
            color: #cbd5e1;
          }
          .mode-btn.active {
            background: #eab308;
            color: #0f172a;
          }
          .reset-all-btn {
            border-color: #475569;
            color: #cbd5e1;
          }
          .reset-all-btn:hover {
            background: #334155;
          }
        }
      `}</style>
    </>
  );
}