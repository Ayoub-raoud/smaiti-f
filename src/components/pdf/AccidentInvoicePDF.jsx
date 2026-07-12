import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Svg, Circle } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    textAlign: 'center',
    marginBottom: 15,
  },
  logo: {
    fontFamily: 'Times-Roman',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  slogan: {
    fontSize: 9,
    color: '#000000',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 8,
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    marginBottom: 3,
  },
  infoRowLeft: {
    flexDirection: 'row',
    fontSize: 9,
    marginBottom: 3,
  },
  label: {
    fontWeight: 'bold',
  },
  value: {
    marginLeft: 5,
  },
  table: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 2.5,
    fontSize: 8,
    color: '#1a1a1a',
  },
  tableTotal: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingVertical: 3,
    fontSize: 8,
    fontWeight: 'bold',
  },
  colDesignation: {
    flex: 8,
    paddingLeft: 5,
  },
  colQty: {
    flex: 2,
    textAlign: 'center',
  },
  colMontant: {
    flex: 5,
    textAlign: 'right',
    paddingRight: 5,
  },
  footer: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 8,
    color: '#000000',
    fontFamily: 'Helvetica',
  },
  stampWrapper: {
    position: 'absolute',
    left: 180,
    bottom: 45,
    transform: 'rotate(-15deg)',
  },
});

const toNumber = (val) => Number(val) || 0;
const formatCurrency = (val) => toNumber(val).toFixed(2) + ' DH';

export const AccidentInvoicePDF = ({ accident }) => {
  // Setup variables from accident data
  const items = accident.invoice_items || [];
  let totalHT = 0;
  const rows = items.map((item) => {
    const qty = toNumber(item.quantity) || 1;
    const price = toNumber(item.unit_price);
    const total = qty * price;
    totalHT += total;
    return { ...item, qty, price, total };
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>Garage Tolerie</Text>
          <Text style={styles.slogan}>MECANIQUE GENERALE-TOLERIE & PEINTURE</Text>
          <Text style={styles.docNumber}>
            FACTURE N° {accident.invoice_number || accident.id || '415'}
          </Text>
        </View>

        {/* Info Block */}
        <View>
          <View style={styles.infoRow}>
            <Text>
              CASA LE : {new Date().toLocaleDateString('fr-FR')}
            </Text>
            <Text>
              CLIENT : {accident.client?.prenom || ''} {accident.client?.nom || ''}
            </Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>Objet :</Text>
            <Text style={styles.value}>Réparation Voiture {accident.car?.brand || 'SANDERO STEPWAY'}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>MATRICULE :</Text>
            <Text style={styles.value}>{accident.matricule?.matricule_code || '70726-D-8'}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>DATE DE SINISTRE :</Text>
            <Text style={styles.value}>
              {accident.date_accident ? new Date(accident.date_accident).toLocaleDateString('fr-FR') : '01/06/2025'}
            </Text>
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colDesignation}>Désignation</Text>
            <Text style={styles.colQty}>QTE</Text>
            <Text style={styles.colMontant}>MONTANT HT</Text>
          </View>
          {rows.map((item, idx) => (
            <View style={styles.tableRow} key={idx}>
              <Text style={styles.colDesignation}>{item.name || '—'}</Text>
              <Text style={styles.colQty}>{item.qty}</Text>
              <Text style={styles.colMontant}>{formatCurrency(item.price)}</Text>
            </View>
          ))}
          <View style={styles.tableTotal}>
            <Text style={styles.colDesignation}>TOTAL</Text>
            <Text style={styles.colQty}></Text>
            <Text style={styles.colMontant}>{formatCurrency(totalHT)}</Text>
          </View>
        </View>

        {/* Footer & Stamp */}
        <Text style={styles.footer}>
          ARRETEE LA PRESENTE FACTURE A LA SOMME DE : DIX MILLE CINQ CENTS DIRHAMS
        </Text>

        <View style={styles.stampWrapper}>
          <Svg width="100" height="100" viewBox="0 0 100 100">
            <Circle cx="50" cy="50" r="42" stroke="#1e40af" strokeWidth="2" fill="none" />
            <Text x="50" y="40" fill="#1e40af" fontSize="8" fontWeight="bold" textAnchor="middle">
              Garage Tolerie
            </Text>
            <Text x="50" y="55" fill="#1e40af" fontSize="6" textAnchor="middle">
              Boulevard ...
            </Text>
            <Text x="50" y="70" fill="#1e40af" fontSize="6" textAnchor="middle">
              Tel. 06 66 96 65 86
            </Text>
          </Svg>
        </View>
      </Page>
    </Document>
  );
};