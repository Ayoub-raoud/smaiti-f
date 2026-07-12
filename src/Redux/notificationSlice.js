// Redux/notificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchMatricules,
  fetchReservations,
  fetchAccidents,
  fetchFinancings, // <-- ADDED: required for payment notifications
} from "./store";

// Helper functions for date calculations (unchanged)
const isDateExpiringSoon = (dateString, daysThreshold = 7) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays > 0;
};

const isDateExpired = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
};

const isDateLessThanDays = (dateString, daysThreshold = 3) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold && diffDays > 0;
};

const getReservationDaysRemaining = (reservation) => {
  if (!reservation?.end_date) return null;
  const today = new Date();
  const endDate = new Date(reservation.end_date);
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
};

const isReservationLate = (reservation) => {
  if (!reservation?.end_date) return false;
  const today = new Date();
  const endDate = new Date(reservation.end_date);
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return today > endDate && reservation.status !== "completed" && reservation.status !== "cancelled";
};

const getDaysSinceAccident = (accidentDate) => {
  if (!accidentDate) return null;
  const today = new Date();
  const accident = new Date(accidentDate);
  today.setHours(0, 0, 0, 0);
  accident.setHours(0, 0, 0, 0);
  return Math.floor((today - accident) / (1000 * 60 * 60 * 24));
};

// --- Payment-specific helpers ---
const getNextPaymentDueSoon = (financing, daysThreshold = 7) => {
  if (!financing?.payments || financing.status === "completed") return null;

  const upcomingPayments = financing.payments.filter((p) => p.status !== "paid");
  if (upcomingPayments.length === 0) return null;

  const nextPayment = upcomingPayments[0];
  const dueDate = new Date(nextPayment.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays <= daysThreshold && diffDays >= 0) {
    return { ...nextPayment, financing, daysRemaining: diffDays };
  }
  return null;
};

const getOverduePayments = (financing) => {
  if (!financing?.payments || financing.status === "completed") return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return financing.payments
    .filter((p) => {
      if (p.status === "paid") return false;
      const dueDate = new Date(p.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    })
    .map((p) => ({ ...p, financing }));
};

// --- Main calculation thunk ---
export const calculateAllNotifications = createAsyncThunk(
  "notifications/calculate",
  async (_, { getState, dispatch }) => {
    // Fetch fresh data – wrap in try/catch to avoid one failure blocking the whole process
    try {
      await Promise.all([
        dispatch(fetchMatricules(true)),
        dispatch(fetchReservations(true)),
        dispatch(fetchAccidents(true)),
        dispatch(fetchFinancings(true)), // <-- now fetches payment data
      ]);
    } catch (error) {
      console.warn("Some notifications data could not be refreshed:", error);
    }

    const state = getState();
    const matricules = state.matricules?.list || [];
    const reservations = state.reservations?.list || [];
    const accidents = state.accidents?.list || [];
    const financings = state.financings?.list || []; // <-- now populated

    const notifications = {
      matricules: { total: 0, critical: 0, warning: 0, items: [] },
      reservations: { total: 0, critical: 0, warning: 0, items: [] },
      accidents: { total: 0, critical: 0, warning: 0, items: [] },
      payments: { total: 0, critical: 0, warning: 0, items: [] },
      totalCount: 0,
      totalCriticalCount: 0,
    };

    // ---------- Matricules ----------
    matricules.forEach((matricule) => {
      const techVisitDate = matricule.visit_tech;
      const insuranceDate = matricule.date_assurance;

      if (techVisitDate) {
        const isExpired = isDateExpired(techVisitDate);
        const isExpiringSoon = isDateExpiringSoon(techVisitDate, 7);
        const isCritical = isDateLessThanDays(techVisitDate, 3) || isExpired;

        if (isExpired || isExpiringSoon) {
          const item = {
            id: `tech_${matricule.id}`,
            type: "technical_visit",
            matriculeId: matricule.id,
            matriculeCode: matricule.matricule_code,
            date: techVisitDate,
            title: "Visite Technique",
            description: `Expire le ${new Date(techVisitDate).toLocaleDateString("fr-FR")}`,
            isExpired,
            daysRemaining: Math.ceil((new Date(techVisitDate) - new Date()) / (1000 * 60 * 60 * 24)),
          };
          notifications.matricules.items.push(item);
          notifications.matricules.total++;
          if (isCritical) {
            notifications.matricules.critical++;
            notifications.totalCriticalCount++;
          } else {
            notifications.matricules.warning++;
          }
        }
      }

      if (insuranceDate) {
        const isExpired = isDateExpired(insuranceDate);
        const isExpiringSoon = isDateExpiringSoon(insuranceDate, 7);
        const isCritical = isDateLessThanDays(insuranceDate, 3) || isExpired;

        if (isExpired || isExpiringSoon) {
          const item = {
            id: `insurance_${matricule.id}`,
            type: "insurance",
            matriculeId: matricule.id,
            matriculeCode: matricule.matricule_code,
            date: insuranceDate,
            title: "Assurance",
            description: `Expire le ${new Date(insuranceDate).toLocaleDateString("fr-FR")}`,
            isExpired,
            daysRemaining: Math.ceil((new Date(insuranceDate) - new Date()) / (1000 * 60 * 60 * 24)),
          };
          notifications.matricules.items.push(item);
          notifications.matricules.total++;
          if (isCritical) {
            notifications.matricules.critical++;
            notifications.totalCriticalCount++;
          } else {
            notifications.matricules.warning++;
          }
        }
      }
    });

    // ---------- Reservations ----------
    reservations.forEach((reservation) => {
      const daysRemaining = getReservationDaysRemaining(reservation);
      const isLate = isReservationLate(reservation);

      if (
        isLate ||
        (daysRemaining !== null &&
          daysRemaining <= 7 &&
          daysRemaining >= 0 &&
          reservation.status !== "completed" &&
          reservation.status !== "cancelled")
      ) {
        const isCritical = isLate || (daysRemaining !== null && daysRemaining <= 3);

        const item = {
          id: `reservation_${reservation.id}`,
          type: "reservation",
          reservationId: reservation.id,
          clientId: reservation.client_id,
          clientName: "Client",
          matriculeId: reservation.matricule_id,
          matriculeCode: reservation.matricule?.matricule_code,
          title: isLate ? "Réservation en retard" : "Réservation bientôt terminée",
          description: isLate
            ? `Retard pour le véhicule ${reservation.matricule?.matricule_code || ""}`
            : `Se termine dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}`,
          endDate: reservation.end_date,
          daysRemaining,
          isLate,
        };

        notifications.reservations.items.push(item);
        notifications.reservations.total++;
        if (isCritical) {
          notifications.reservations.critical++;
          notifications.totalCriticalCount++;
        } else {
          notifications.reservations.warning++;
        }
      }
    });

    // ---------- Accidents ----------
    accidents.forEach((accident) => {
      const daysSince = getDaysSinceAccident(accident.date_accident);

      if (daysSince !== null && daysSince <= 7 && accident.status !== "closed") {
        const isCritical = daysSince <= 3;

        const item = {
          id: `accident_${accident.id}`,
          type: "accident",
          accidentId: accident.id,
          matriculeId: accident.matricule_id,
          matriculeCode: accident.matricule?.matricule_code,
          title: "Accident récent",
          description: `Accident du ${new Date(accident.date_accident).toLocaleDateString("fr-FR")}`,
          date: accident.date_accident,
          daysSince,
          status: accident.status,
        };

        notifications.accidents.items.push(item);
        notifications.accidents.total++;
        if (isCritical) {
          notifications.accidents.critical++;
          notifications.totalCriticalCount++;
        } else {
          notifications.accidents.warning++;
        }
      }
    });

    // ---------- Payments (Traites) ----------
    if (financings && financings.length > 0) {
      financings.forEach((financing) => {
        // Overdue payments
        const overdue = getOverduePayments(financing);
        overdue.forEach((payment) => {
          const item = {
            id: `payment_overdue_${payment.id}`,
            type: "payment_overdue",
            financingId: financing.id,
            dossierNumber: financing.dossier_number,
            matriculeCode: financing.matricule?.matricule_code,
            paymentId: payment.id,
            installmentNumber: payment.installment_number,
            title: "Paiement en retard",
            description: `Traite #${payment.installment_number} - ${financing.dossier_number}`,
            dueDate: payment.due_date,
            amount: payment.total_amount,
            isOverdue: true,
          };

          notifications.payments.items.push(item);
          notifications.payments.total++;
          notifications.payments.critical++;
          notifications.totalCriticalCount++;
        });

        // Upcoming payments (only if no overdue exist for this financing, to avoid duplication)
        if (overdue.length === 0) {
          const upcoming = getNextPaymentDueSoon(financing, 7);
          if (upcoming) {
            const isCritical = upcoming.daysRemaining <= 3;
            const item = {
              id: `payment_upcoming_${upcoming.id}`,
              type: "payment_upcoming",
              financingId: financing.id,
              dossierNumber: financing.dossier_number,
              matriculeCode: financing.matricule?.matricule_code,
              paymentId: upcoming.id,
              installmentNumber: upcoming.installment_number,
              title: "Paiement bientôt dû",
              description: `Traite #${upcoming.installment_number} - ${financing.dossier_number} - dans ${upcoming.daysRemaining} jour${upcoming.daysRemaining > 1 ? "s" : ""}`,
              dueDate: upcoming.due_date,
              amount: upcoming.total_amount,
              daysRemaining: upcoming.daysRemaining,
              isOverdue: false,
            };

            notifications.payments.items.push(item);
            notifications.payments.total++;
            if (isCritical) {
              notifications.payments.critical++;
              notifications.totalCriticalCount++;
            } else {
              notifications.payments.warning++;
            }
          }
        }
      });
    }

    // Total counts
    notifications.totalCount =
      notifications.matricules.total +
      notifications.reservations.total +
      notifications.accidents.total +
      notifications.payments.total;

    return notifications;
  }
);

// ---------- Slice ----------
const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: {
      matricules: { total: 0, critical: 0, warning: 0, items: [] },
      reservations: { total: 0, critical: 0, warning: 0, items: [] },
      accidents: { total: 0, critical: 0, warning: 0, items: [] },
      payments: { total: 0, critical: 0, warning: 0, items: [] },
      totalCount: 0,
      totalCriticalCount: 0,
    },
    lastUpdated: null,
    loading: false,
    error: null,
    isOpen: false,
  },
  reducers: {
    toggleNotificationPanel: (state) => {
      state.isOpen = !state.isOpen;
    },
    closeNotificationPanel: (state) => {
      state.isOpen = false;
    },
    openNotificationPanel: (state) => {
      state.isOpen = true;
    },
    clearNotificationError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(calculateAllNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateAllNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload;
        state.lastUpdated = Date.now();
      })
      .addCase(calculateAllNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const {
  toggleNotificationPanel,
  closeNotificationPanel,
  openNotificationPanel,
  clearNotificationError,
} = notificationSlice.actions;

export default notificationSlice.reducer;