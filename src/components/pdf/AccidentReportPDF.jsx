import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Circle } from '@react-pdf/renderer';

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
  topLabel: {
    fontWeight: 'bold',
  },
  topValue: {
    marginLeft: 5,
  },
  // Main bordered table box for the report content
  table: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#000000',
    borderStyle: 'solid',
  },
  // Section Header inside the bordered box (e.g., INFORMATIONS GENERALES)
  sectionHeaderRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#000000',
    paddingVertical: 4,
    paddingLeft: 5,
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  // Row for data fields inside the box
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingLeft: 5,
    paddingRight: 5,
    fontSize: 8,
  },
  // Fixed width label to ensure perfect vertical alignment across rows
  fieldLabel: {
    width: 140,
    fontWeight: 'bold',
  },
  fieldValue: {
    flex: 1,
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

export const AccidentReportPDF = ({ accident }) => {
  // Map statuses for the report
  const statusMap = {
    open: 'Ouvert',
    under_review: 'En cours d\'examen',
    waiting_estimate: 'En attente de devis',
    estimate_approved: 'Devis approuvé',
    under_repair: 'En réparation',
    invoice_received: 'Facture reçue',
    waiting_payment: 'En attente de paiement',
    closed: 'Clos',
    pending: 'Signalé',
    evaluation_owner: 'Évaluation propriétaire',
    'contact expert': 'Contact expert',
    evaluation_expert: 'Évaluation expert',
    fixed: 'Réparé',
    waiting: 'En attente paiement',
    completed: 'Terminé',
  };
  const statusLabel = statusMap[accident.status] || accident.status;

  // Safely handle missing props
  const safeValue = (val) => val || '—';
  const clientName = `${accident.client?.prenom || ''} ${accident.client?.nom || ''}`.trim() || '—';
  const carBrandModel = `${accident.car?.brand || ''} ${accident.car?.model || ''}`.trim() || '—';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.logo}>Garage Tolerie</Text>
          <Text style={styles.slogan}>MECANIQUE GENERALE-TOLERIE & PEINTURE</Text>
          <Text style={styles.docNumber}>
            RAPPORT N° {accident.accident_number || accident.id || '560'}
          </Text>
        </View>

        {/* Top Info Block */}
        <View>
          <View style={styles.infoRow}>
            <Text>
              CASA LE : {new Date().toLocaleDateString('fr-FR')}
            </Text>
            <Text>
              CLIENT : {clientName}
            </Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.topLabel}>Objet :</Text>
            <Text style={styles.topValue}>Réparation Voiture {carBrandModel}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.topLabel}>MATRICULE :</Text>
            <Text style={styles.topValue}>{safeValue(accident.matricule?.matricule_code)}</Text>
          </View>
          <View style={styles.infoRowLeft}>
            <Text style={styles.topLabel}>DATE DE SINISTRE :</Text>
            <Text style={styles.topValue}>
              {accident.date_accident ? new Date(accident.date_accident).toLocaleDateString('fr-FR') : '—'}
            </Text>
          </View>
        </View>

        {/* Main Report Data Table */}
        <View style={styles.table}>
          {/* General Info */}
          <View style={styles.sectionHeaderRow}>
            <Text>INFORMATIONS GENERALES</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Statut</Text>
            <Text style={styles.fieldValue}>{safeValue(statusLabel)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Type</Text>
            <Text style={styles.fieldValue}>{accident.accident_type === 'grave' ? 'Grave' : 'Non-grave'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Lieu</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.location)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Rapport police</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.police_report_number)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Description</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.description)}</Text>
          </View>

          {/* Vehicle */}
          <View style={styles.sectionHeaderRow}>
            <Text>VEHICULE</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Matricule</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.matricule?.matricule_code)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Marque / Modèle</Text>
            <Text style={styles.fieldValue}>{carBrandModel}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Année</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.car?.year)}</Text>
          </View>

          {/* Client */}
          <View style={styles.sectionHeaderRow}>
            <Text>CLIENT</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Nom</Text>
            <Text style={styles.fieldValue}>{clientName}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.client?.telephone)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{safeValue(accident.client?.email)}</Text>
          </View>

          {/* Garage (optional) */}
          {accident.garage && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text>GARAGE</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.fieldLabel}>Nom</Text>
                <Text style={styles.fieldValue}>{safeValue(accident.garage.name)}</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.fieldLabel}>Adresse</Text>
                <Text style={styles.fieldValue}>{safeValue(accident.garage.address)}</Text>
              </View>
            </>
          )}

          {/* Amounts */}
          <View style={styles.sectionHeaderRow}>
            <Text>MONTANTS</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Pertes</Text>
            <Text style={styles.fieldValue}>{formatCurrency(accident.amount_of_losses)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Montant assurance</Text>
            <Text style={styles.fieldValue}>{formatCurrency(accident.amount_assurance)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Coût total réparation</Text>
            <Text style={styles.fieldValue}>{formatCurrency(accident.total_repair_cost)}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.fieldLabel}>Total payé</Text>
            <Text style={styles.fieldValue}>{formatCurrency(accident.total_paid)}</Text>
          </View>
          <View style={{ ...styles.tableRow, borderTopWidth: 1, borderTopColor: '#000000', paddingTop: 3, marginTop: 2 }}>
            <Text style={styles.fieldLabel}>Reste à payer</Text>
            <Text style={styles.fieldValue}>{formatCurrency(accident.remaining_amount)}</Text>
          </View>

          {/* Notes (optional) */}
          {accident.notes && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text>NOTES</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.fieldValue}>{accident.notes}</Text>
              </View>
            </>
          )}
        </View>

        {/* Footer Text */}
        <Text style={styles.footer}>
          ARRETEE LE PRESENT RAPPORT A LA SOMME DE : {formatCurrency(accident.total_repair_cost)} DIRHAMS
        </Text>

        {/* Blue Stamp Overlay */}
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