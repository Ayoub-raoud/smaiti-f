// utils/reportSync.js (version corrigée)
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoImage from "../assets/logo.png";
import { updateReservation } from "../Redux/store";

const API_URL = "https://smaiti-b-production.up.railway.app/api";

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Génère le PDF du rapport (inchangé)
const generateReportPDF = async (rows, fileName) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let logoDataUrl = '';
  try {
    const response = await fetch(logoImage);
    const blob = await response.blob();
    logoDataUrl = await blobToBase64(blob);
  } catch (e) {
    console.warn('Logo non chargé', e);
  }

  const margin = 14;
  let y = 20;

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', margin, y - 5, 30, 20);
  }
  doc.setFontSize(22);
  doc.setTextColor(26, 26, 46);
  doc.text('Rapport', pageWidth / 2, y + 10, { align: 'center' });
  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  const tableHeaders = [['Date', 'Client', 'Prix HT (MAD)']];
  const tableRows = rows.map(row => [
    row.date || '',
    row.client_name || '',
    row.price ? Number(row.price).toFixed(2) : '0.00'
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableRows,
    startY: y + 5,
    theme: 'grid',
    headStyles: {
      fillColor: [234, 179, 8],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10,
    },
    bodyStyles: {
      halign: 'center',
      fontSize: 9,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
    },
    margin: { left: (pageWidth - (pageWidth * 0.8)) / 2, right: (pageWidth - (pageWidth * 0.8)) / 2 },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  const total = rows.reduce((sum, r) => sum + Number(r.price), 0);
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total HT: ${total.toFixed(2)} DH`, pageWidth / 2, finalY, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text('SMAITI CAR — Document généré automatiquement.', pageWidth / 2, pageHeight - 10, { align: 'center' });

  const pdfBlob = doc.output('blob');
  return await blobToBase64(pdfBlob);
};

/**
 * Synchronise un rapport avec les paiements d'une réservation donnée.
 * Seuls les paiements de la réservation modifiée sont ajoutés.
 */
export const syncReportForReservation = async (reservation, dispatch) => {
  const { client_id, client, id: reservationId } = reservation;

  // 1. Déterminer le mois cible à partir du premier paiement de cette réservation
  let targetDateStr = new Date().toISOString().slice(0, 10);
  if (reservation.payment_history && reservation.payment_history.length > 0) {
    const firstPaymentDate = reservation.payment_history[0]?.date;
    if (firstPaymentDate) targetDateStr = firstPaymentDate;
  }
  const targetDate = new Date(targetDateStr + 'T00:00:00Z');
  const targetMonth = targetDate.getUTCMonth();
  const targetYear = targetDate.getUTCFullYear();

  const token = localStorage.getItem("authToken");

  // 2. Récupérer tous les rapports du client
  const resReports = await fetch(`${API_URL}/reports?client_id=${client_id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!resReports.ok) {
    throw new Error("Impossible de récupérer les rapports");
  }
  const dataReports = await resReports.json();
  const reports = dataReports.reports || [];

  // 3. Trouver un rapport existant pour ce client et ce mois
  let existingReport = null;
  for (const report of reports) {
    let rows = report.rows;
    if (typeof rows === 'string') {
      try { rows = JSON.parse(rows); } catch { rows = []; }
    }
    if (!Array.isArray(rows)) rows = [];

    const hasMatchingRow = rows.some(row => {
      if (!row.date) return false;
      const d = new Date(row.date + 'T00:00:00Z');
      return row.client_id == client_id &&
             d.getUTCMonth() === targetMonth &&
             d.getUTCFullYear() === targetYear;
    });
    if (hasMatchingRow) {
      existingReport = report;
      break;
    }
  }

  // 4. Date de référence (localStorage)
  const storageKey = `report_last_sync_${client_id}_${targetYear}_${targetMonth}`;
  let referenceDate = localStorage.getItem(storageKey)
    ? new Date(localStorage.getItem(storageKey))
    : (existingReport ? new Date(existingReport.updated_at || existingReport.created_at) : new Date());

  // 5. Regrouper les paiements de la réservation modifiée (et uniquement celle-ci)
  const newPaymentsGrouped = {};
  const history = reservation.payment_history || [];
  history.forEach(p => {
    const pDateStr = p.date || new Date().toISOString().slice(0, 10);
    const pDate = new Date(pDateStr + 'T00:00:00Z');
    if (pDate.getUTCMonth() === targetMonth && pDate.getUTCFullYear() === targetYear) {
      const amount = parseFloat(p.amount);
      if (!isNaN(amount) && amount > 0) {
        const paymentCreatedAt = new Date(p.created_at || pDateStr + 'T00:00:00Z');
        if (paymentCreatedAt > referenceDate) {
          const key = pDateStr;
          if (!newPaymentsGrouped[key]) newPaymentsGrouped[key] = 0;
          newPaymentsGrouped[key] += amount;
        }
      }
    }
  });

  if (Object.keys(newPaymentsGrouped).length === 0) {
    toast.info(`Aucun nouveau paiement pour la réservation #${reservationId}.`);
    return;
  }

  // 6. Construire les nouvelles lignes du rapport
  let finalRows = [];
  if (existingReport) {
    let existingRows = existingReport.rows;
    if (typeof existingRows === 'string') {
      try { existingRows = JSON.parse(existingRows); } catch { existingRows = []; }
    }
    if (!Array.isArray(existingRows)) existingRows = [];

    // Séparer les lignes du client des autres
    const otherRows = existingRows.filter(row => row.client_id != client_id);
    const clientRows = existingRows.filter(row => row.client_id == client_id);

    // Regrouper les lignes du client par date
    const clientByDate = {};
    clientRows.forEach(row => {
      const dateKey = row.date;
      if (!clientByDate[dateKey]) clientByDate[dateKey] = 0;
      clientByDate[dateKey] += parseFloat(row.price) || 0;
    });

    // Ajouter les nouveaux paiements
    for (const [date, amount] of Object.entries(newPaymentsGrouped)) {
      if (!clientByDate[date]) clientByDate[date] = 0;
      clientByDate[date] += amount;
    }

    // Reconstruire les lignes du client
    const mergedClientRows = Object.entries(clientByDate).map(([date, total]) => ({
      date,
      client_name: `${client?.prenom || ''} ${client?.nom || ''}`.trim() || `Client ${client_id}`,
      client_id: client_id,
      price: total
    }));

    finalRows = [...otherRows, ...mergedClientRows];
  } else {
    // Nouveau rapport
    finalRows = Object.entries(newPaymentsGrouped).map(([date, total]) => ({
      date,
      client_name: `${client?.prenom || ''} ${client?.nom || ''}`.trim() || `Client ${client_id}`,
      client_id: client_id,
      price: total
    }));
  }

  // Nettoyage : garantir que chaque prix est un nombre
  finalRows = finalRows.map(row => ({
    ...row,
    price: parseFloat(row.price) || 0
  }));

  // Calcul du total HT
  const total_ht = finalRows.reduce((sum, r) => sum + r.price, 0);

  // 7. Générer le PDF
  const fileName = `Rapport_Auto_${reservationId}_${targetYear}-${String(targetMonth + 1).padStart(2, '0')}.pdf`;
  const pdfBase64 = await generateReportPDF(finalRows, fileName);

  // 8. Sauvegarder ou mettre à jour le rapport
  const payload = {
    file_name: fileName,
    pdf_data: pdfBase64,
    rows: finalRows,
    total_ht: total_ht
  };

  let response;
  if (existingReport) {
    response = await fetch(`${API_URL}/reports/${existingReport.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur mise à jour rapport:", errorText);
      throw new Error(`Erreur mise à jour du rapport (${response.status}): ${errorText}`);
    }
    await response.json();
    toast.success(`Rapport mis à jour pour la réservation #${reservationId}`);
  } else {
    response = await fetch(`${API_URL}/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur création rapport:", errorText);
      throw new Error(`Erreur création du rapport (${response.status}): ${errorText}`);
    }
    await response.json();
    toast.success(`Rapport créé pour la réservation #${reservationId}`);
  }

  // 9. Mettre à jour la date de référence dans localStorage
  const now = new Date().toISOString();
  localStorage.setItem(storageKey, now);

  // 10. Mettre à jour les notes des paiements de la réservation
  const updatedPayments = reservation.payment_history.map(p => {
    if (p.notes && p.notes.includes(fileName)) return p;
    return { ...p, notes: `Rapport auto (${fileName})` };
  });

  await dispatch(updateReservation({
    id: reservationId,
    data: { payment_history: updatedPayments }
  })).unwrap();
};