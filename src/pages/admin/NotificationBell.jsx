// src/components/pdf/NotificationsPDF.jsx
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Roboto with proper Unicode support
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
  fontWeight: 400,
});

Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
  fontWeight: 700,
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Roboto',
    backgroundColor: '#ffffff',
  },
  header: {
    borderBottom: '2px solid #d4af37',
    paddingBottom: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  filterText: {
    fontSize: 9,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
    backgroundColor: '#f8fafc',
    padding: 4,
    borderRadius: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontWeight: 'bold',
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    flex: 1,
    textAlign: 'left',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableCellLast: {
    padding: 6,
    fontSize: 8,
    flex: 1,
    textAlign: 'left',
  },
  footer: {
    marginTop: 20,
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
    borderTop: '1px solid #d4af37',
    paddingTop: 8,
  },
});

// Helper functions (unchanged except sanitize)
const getNormalizedDate = (item) => {
  let dateStr = item.date || item.dueDate || item.endDate || null;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Date inconnue';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const getStatusLabel = (item) => {
  if (item.isExpired) return 'Expiré';
  if (item.isLate) return 'En retard';
  if (item.isOverdue) return 'En retard';
  if (item.daysRemaining !== undefined && item.daysRemaining > 0) return `${item.daysRemaining} jrs`;
  if (item.daysSince !== undefined) return `Il y a ${item.daysSince} j`;
  return '—';
};

// Keep only necessary sanitization (remove XML-invalid chars)
const sanitizeText = (text) => {
  if (typeof text !== 'string') return String(text || '—');
  // Only replace characters that are invalid in XML
  return text.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD]/g, '');
};

const formatAmount = (amount) => {
  if (amount === undefined || amount === null) return '—';
  const num = parseFloat(amount);
  if (isNaN(num)) return '—';
  return num.toFixed(2);
};

const filterByPreset = (items, mode) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return items.filter(item => {
    const itemDate = getNormalizedDate(item);
    if (!itemDate) return false;
    const d = new Date(itemDate);
    d.setHours(0, 0, 0, 0);
    if (mode === 'today') return d.getTime() === today.getTime();
    if (mode === 'tomorrow') return d.getTime() === tomorrow.getTime();
    if (mode === 'week') return d >= today && d <= nextWeek;
    return false;
  });
};

export const NotificationsPDF = ({ notifications = [], filterDescription = '', combined = false }) => {
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const safeFilterDesc = sanitizeText(filterDescription || 'Toutes les notifications');

  if (combined) {
    const todayItems = filterByPreset(notifications, 'today');
    const tomorrowItems = filterByPreset(notifications, 'tomorrow');
    const weekItems = filterByPreset(notifications, 'week');

    const renderTable = (items, title) => (
      <View>
        <Text style={styles.sectionHeader}>{title} ({items.length})</Text>
        {items.length === 0 ? (
          <Text style={{ fontSize: 8, color: '#94a3b8', marginBottom: 8 }}>Aucune notification</Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCell}>Catégorie</Text>
              <Text style={styles.tableCell}>Type</Text>
              <Text style={styles.tableCell}>Titre</Text>
              <Text style={styles.tableCell}>Description</Text>
              <Text style={styles.tableCell}>Statut</Text>
              <Text style={styles.tableCellLast}>Montant (DH)</Text>
            </View>
            {items.map((item, idx) => (
              <View style={styles.tableRow} key={idx}>
                <Text style={styles.tableCell}>{sanitizeText(item.category)}</Text>
                <Text style={styles.tableCell}>{sanitizeText(item.type)}</Text>
                <Text style={styles.tableCell}>{sanitizeText(item.title)}</Text>
                <Text style={styles.tableCell}>{sanitizeText(item.description)}</Text>
                <Text style={styles.tableCell}>{sanitizeText(getStatusLabel(item))}</Text>
                <Text style={styles.tableCellLast}>{formatAmount(item.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>Liste des Notifications – Périodes</Text>
            <Text style={styles.subtitle}>Généré le {dateStr}</Text>
            <Text style={styles.subtitle}>Total : {notifications.length} notification(s)</Text>
            <Text style={styles.filterText}>{safeFilterDesc}</Text>
          </View>
          {renderTable(todayItems, "Aujourd'hui")}
          {renderTable(tomorrowItems, 'Demain')}
          {renderTable(weekItems, 'Semaine prochaine')}
          <Text style={styles.footer}>Document généré par SMAITI CAR - {dateStr}</Text>
        </Page>
      </Document>
    );
  }

  // Normal mode
  const grouped = notifications.reduce((acc, item) => {
    const dateKey = getNormalizedDate(item) || 'sans_date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => {
    if (a === 'sans_date') return 1;
    if (b === 'sans_date') return -1;
    return b.localeCompare(a);
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Liste des Notifications</Text>
          <Text style={styles.subtitle}>Généré le {dateStr}</Text>
          <Text style={styles.subtitle}>Total : {notifications.length} notification(s)</Text>
          <Text style={styles.filterText}>{safeFilterDesc}</Text>
        </View>

        {sortedDates.map((dateKey) => {
          const items = grouped[dateKey];
          const displayDate = dateKey === 'sans_date' ? 'Sans date' : formatDateDisplay(dateKey);
          return (
            <View key={dateKey} style={{ marginTop: 12 }}>
              <Text style={styles.sectionHeader}>Date : {displayDate} ({items.length})</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={styles.tableCell}>Catégorie</Text>
                  <Text style={styles.tableCell}>Type</Text>
                  <Text style={styles.tableCell}>Titre</Text>
                  <Text style={styles.tableCell}>Description</Text>
                  <Text style={styles.tableCell}>Statut</Text>
                  <Text style={styles.tableCellLast}>Montant (DH)</Text>
                </View>
                {items.map((item, idx) => (
                  <View style={styles.tableRow} key={idx}>
                    <Text style={styles.tableCell}>{sanitizeText(item.category)}</Text>
                    <Text style={styles.tableCell}>{sanitizeText(item.type)}</Text>
                    <Text style={styles.tableCell}>{sanitizeText(item.title)}</Text>
                    <Text style={styles.tableCell}>{sanitizeText(item.description)}</Text>
                    <Text style={styles.tableCell}>{sanitizeText(getStatusLabel(item))}</Text>
                    <Text style={styles.tableCellLast}>{formatAmount(item.amount)}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        <Text style={styles.footer}>Document généré par SMAITI CAR - {dateStr}</Text>
      </Page>
    </Document>
  );
};
export default NotificationBell;