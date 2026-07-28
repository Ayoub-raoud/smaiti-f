import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Circle } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 25,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    textAlign: 'center',
    marginBottom: 25,
  },
  logo: {
    fontFamily: 'Times-Roman',
    fontSize: 34,
    fontWeight: 'bold',
    color: '#d4af37',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  slogan: {
    fontSize: 14,
    color: '#000000',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  docNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 12,
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 14,
    marginBottom: 6,
  },
  infoRowLeft: {
    flexDirection: 'row',
    fontSize: 14,
    marginBottom: 6,
  },
  label: {
    fontWeight: 'bold',
  },
  value: {
    marginLeft: 5,
  },
  table: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    fontSize: 15,
    color: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    borderBottomStyle: 'solid',
  },
  tableTotal: {
    flexDirection: 'row',
    borderTopWidth: 3,
    borderTopColor: '#000000',
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: 'bold',
  },
  colDesignation: {
    flex: 8,
    paddingLeft: 8,
  },
  colQty: {
    flex: 2,
    textAlign: 'center',
  },
  colMontant: {
    flex: 5,
    textAlign: 'right',
    paddingRight: 8,
  },
  footer: {
    marginTop: 25,
    textAlign: 'center',
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Helvetica',
  },
  stampWrapper: {
    position: 'absolute',
    left: 180,
    bottom: 40,
    transform: 'rotate(-15deg)',
  },
});

const toNumber = (val) => Number(val) || 0;
const formatCurrency = (val) => toNumber(val).toFixed(2) + ' DH';

export const AccidentEstimatePDF = ({ accident }) => {
  const items = accident.estimate_items || [];
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
            DEVIS N° {accident.estimate_number || accident.accident_number || accident.id || '560'}
          </Text>
        </View>

        {/* Info Block */}
        <View>
          <View style={styles.infoRow}>
            <Text>
              CASA LE : {new Date().toLocaleDateString('fr-FR')}
            </Text>
            <Text>
              CLIENT : SMAITI CAR
            </Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>Objet :</Text>
            <Text style={styles.value}>Réparation Voiture {accident.car?.brand || 'FORD'}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>MATRICULE :</Text>
            <Text style={styles.value}>{accident.matricule?.matricule_code || '56159-A-11'}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.label}>DATE DE SINISTRE :</Text>
            <Text style={styles.value}>
              {accident.date_accident ? new Date(accident.date_accident).toLocaleDateString('fr-FR') : '—'}
            </Text>
          </View>
        </View>

        {/* Table */}
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

        {/* Footer */}
        <Text style={styles.footer}>
          ARRETEE LA PRESENTE FACTURE À LA SOMME DE : DIRHAMS
        </Text>

        {/* Stamp */}
        <View style={styles.stampWrapper}>
          <Svg width="120" height="120" viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="50" stroke="#1e40af" strokeWidth="2" fill="none" />
            <Text x="60" y="48" fill="#1e40af" fontSize="10" fontWeight="bold" textAnchor="middle">
              Garage Tolerie
            </Text>
            <Text x="60" y="66" fill="#1e40af" fontSize="8" textAnchor="middle">
              Boulevard ...
            </Text>
            <Text x="60" y="84" fill="#1e40af" fontSize="8" textAnchor="middle">
              Tel. 06 66 96 65 86
            </Text>
          </Svg>
        </View>
      </Page>
    </Document>
  );
};