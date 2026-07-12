// Cars.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Mail, Phone, User, ArrowRight, Check, X, Car } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { useLocation } from 'react-router-dom';
import { FadeIn, TiltCard } from "../components/site/Motion3D";
import {
  fetchCars,
  selectCars,
  selectCarsLoading,
  createReservation,
  selectReservationsLoading,
  createClient,
  fetchClients,
  selectClients,
} from "../Redux/store";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";

export default function Cars() {
  const dispatch = useDispatch();
  const { t, lang } = useI18n();
  const [params] = useSearchParams();
  const cars = useSelector(selectCars);
  const carsLoading = useSelector(selectCarsLoading);
  const reservationsLoading = useSelector(selectReservationsLoading);
  const clients = useSelector(selectClients);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [searchingClient, setSearchingClient] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const currentTime = format(new Date(), "HH:00");

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    start_date: today,
    end_date: today,
    start_time: currentTime,
    end_time: currentTime,
    notes: "",
  });

  // Function to get car image URL
  const getCarImageUrl = (car) => {
    if (!car) return null;

    const possibleImageFields = ['image_url', 'image', 'img_url', 'photo', 'picture', 'car_image'];

    for (const field of possibleImageFields) {
      if (car[field] && typeof car[field] === 'string' && car[field].trim() !== '') {
        let imageUrl = car[field];
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          return imageUrl;
        }
        if (imageUrl.startsWith('/storage/')) {
          return `http://localhost:8000${imageUrl}`;
        }
        if (!imageUrl.startsWith('/')) {
          return `http://localhost:8000/storage/${imageUrl}`;
        }
        return `http://localhost:8000${imageUrl}`;
      }
    }
    return null;
  };

  const handleImageError = (carId) => {
    setImageErrors(prev => ({ ...prev, [carId]: true }));
  };

  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    dispatch(fetchCars());
    dispatch(fetchClients());
  }, [dispatch]);

  useEffect(() => {
    const id = params.get("id");
    if (id && cars.length > 0) {
      const car = cars.find((x) => x.id === parseInt(id));
      if (car) {
        setSelected(car);
        setIsModalOpen(true);
      }
    }
  }, [params, cars]);

  const days = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    return Math.max(
      1,
      differenceInCalendarDays(new Date(form.end_date), new Date(form.start_date)) + 1
    );
  }, [form.start_date, form.end_date]);

  const total = useMemo(
    () => (selected ? days * Number(selected.price_per_day || selected.daily_price || 0) : 0),
    [days, selected]
  );

  // --------------------------------------------------------------
  // MODIFIED: openModal only if car is disponible
  // --------------------------------------------------------------
  const openModal = (car) => {
    if (car.status !== 'disponible') {
      toast.warning(lang === "fr" ? "Ce véhicule n'est pas disponible pour le moment." : "هذه السيارة غير متاحة حالياً.");
      return;
    }
    setSelected(car);
    setSubmitted(false);
    setForm({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      start_date: today,
      end_date: today,
      start_time: currentTime,
      end_time: currentTime,
      notes: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelected(null);
    setSubmitted(false);
    setForm({
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      start_date: today,
      end_date: today,
      start_time: currentTime,
      end_time: currentTime,
      notes: "",
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return;

    setSearchingClient(true);

    try {
      let clientId = null;

      // First check if client exists by email
      const existingClient = clients.find(client => client.email === form.email);

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        const clientResult = await dispatch(
          createClient({
            nom: form.nom,
            prenom: form.prenom,
            email: form.email,
            telephone: form.telephone,
          })
        ).unwrap();

        clientId = clientResult.client?.id || clientResult.data?.id || clientResult.id;

        if (!clientId) {
          throw new Error("Failed to create or find client");
        }

        // Refresh clients list
        await dispatch(fetchClients());
      }

      // Calculate rental days
      const rentalDays = days;

      // Create reservation with the correct fields expected by the backend
      const reservationData = {
        car_id: selected.id,
        client_id: clientId,
        start_date: form.start_date,
        end_date: form.end_date,
        start_time: form.start_time,
        end_time: form.end_time,
        rental_days: rentalDays,
        total_price: total,
        amount_paid: 0,
        remaining_amount: total,
        status: "contacted",
        notes: form.notes,
        has_second_driver: false,
        payment_history: [],
      };

      const result = await dispatch(createReservation(reservationData)).unwrap();

      if (result.error) {
        throw new Error(result.error);
      }

      setSubmitted(true);
      toast.success(lang === "fr" ? "Réservation confirmée !" : "تم تأكيد الحجز!");

      // Refresh reservations and cars after successful booking
      setTimeout(() => {
        dispatch(fetchCars(true));
      }, 500);

    } catch (error) {
      console.error("Reservation error:", error);
      let errorMessage = lang === "fr" ? "Erreur lors de la réservation" : "خطأ في الحجز";

      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      toast.error(errorMessage);
    } finally {
      setSearchingClient(false);
    }
  };

  if (carsLoading) {
    return (
      <div className="container py-16 md:py-24">
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* ===== RESET & BASE ===== */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .container {
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }
        @media (min-width: 640px) {
          .container {
            padding-left: 1.5rem;
            padding-right: 1.5rem;
          }
        }
        @media (min-width: 1024px) {
          .container {
            padding-left: 2rem;
            padding-right: 2rem;
          }
        }

        .py-16 { padding-top: 4rem; padding-bottom: 4rem; }
        .py-24 { padding-top: 6rem; padding-bottom: 6rem; }
        .max-w-2xl { max-width: 42rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-16 { margin-bottom: 4rem; }
        .text-sm { font-size: 0.875rem; }
        .font-semibold { font-weight: 600; }
        .text-accent { color: #eab308; }
        .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; }
        .mb-4 { margin-bottom: 1rem; }
        .font-display { font-family: 'Inter', sans-serif; }
        .text-4xl { font-size: 2.25rem; }
        .font-bold { font-weight: 700; }
        .text-balance { text-wrap: balance; }
        .text-lg { font-size: 1.125rem; }
        .text-muted-foreground { color: #64748b; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }

        /* ===== CARS GRID ===== */
        .cars-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .cars-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1.25rem;
          }
        }
        @media (min-width: 1024px) {
          .cars-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 1.5rem;
          }
        }

        /* ===== CAR CARD ===== */
        .w-full { width: 100%; }
        .bg-card { background-color: #fff; }
        .border-2 { border-width: 2px; }
        .rounded-2xl { border-radius: 1rem; }
        .rounded-3xl { border-radius: 1.5rem; }
        .overflow-hidden { overflow: hidden; }
        .shadow-soft { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .hover\\:shadow-elevated:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.02); }
        .transition-all { transition: all 0.15s ease; }
        .border-accent { border-color: #eab308; }
        .border-border { border-color: #e2e8f0; }
        .relative { position: relative; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-4 { gap: 1rem; }
        .absolute { position: absolute; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .text-xs { font-size: 0.75rem; }
        .text-xl { font-size: 1.25rem; }
        .text-2xl { font-size: 1.5rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .px-8 { padding-left: 2rem; padding-right: 2rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .pt-3 { padding-top: 0.75rem; }
        .pt-4 { padding-top: 1rem; }
        .pb-3 { padding-bottom: 0.75rem; }
        .border-t { border-top-width: 1px; }
        .text-foreground { color: #0f172a; }
        .capitalize { text-transform: capitalize; }
        .bg-secondary { background-color: #f1f5f9; }
        .shadow-elevated { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .space-y-4 > * + * { margin-top: 1rem; }
        .h-11 { height: 2.75rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .border { border-width: 1px; }
        .border-input { border-color: #e2e8f0; }
        .bg-background { background-color: #fff; }
        .disabled\\:opacity-50:disabled { opacity: 0.5; }
        .min-h-\\[80px\\] { min-height: 80px; }
        .rounded-full { border-radius: 9999px; }
        .bg-primary { background-color: #0f172a; }
        .text-primary-foreground { color: #fff; }
        .hover\\:bg-primary\\/90:hover { background-color: rgba(15,23,42,0.9); }
        .gradient-gold { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); }
        .h-16 { height: 4rem; }
        .w-16 { width: 4rem; }
        .h-20 { height: 5rem; }
        .w-20 { width: 5rem; }
        .shadow-gold { box-shadow: 0 10px 15px -3px rgba(234,179,8,0.2); }
        .h-10 { height: 2.5rem; }
        .w-10 { width: 2.5rem; }
        .cursor-pointer { cursor: pointer; }
        .object-cover { object-fit: cover; }

        /* ===== CAR IMAGE ===== */
        .car-card-image {
          width: 100%;
          height: 200px;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .car-card-image { height: 220px; }
        }
        .car-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        button:hover .car-card-image img { transform: scale(1.05); }
        .car-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          position: relative;
        }
        .car-fallback-letter {
          font-family: 'Inter', sans-serif;
          font-size: 4rem;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.1);
        }
        @media (min-width: 768px) {
          .car-fallback-letter { font-size: 5rem; }
        }
        .car-card-info-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 0.75rem;
          text-align: center;
        }
        @media (min-width: 768px) {
          .car-card-info-overlay { padding: 1rem; }
        }
        .car-card-brand-overlay {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #eab308;
          font-weight: 600;
        }
        @media (min-width: 768px) {
          .car-card-brand-overlay { font-size: 0.7rem; }
        }
        .car-card-model-overlay {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          color: white;
          margin-top: 0.2rem;
        }
        @media (min-width: 768px) {
          .car-card-model-overlay { font-size: 1.1rem; }
        }

        /* ---------- NEW: STATUS BADGE ---------- */
        .status-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          z-index: 10;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          backdrop-filter: blur(4px);
          background: rgba(0,0,0,0.7);
          color: white;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .status-badge.disponible {
          background: rgba(22, 163, 74, 0.9);
          color: white;
          border-color: rgba(22, 163, 74, 0.3);
        }
        .status-badge.non-disponible {
          background: rgba(220, 38, 38, 0.9);
          color: white;
          border-color: rgba(220, 38, 38, 0.3);
        }

        /* ===== SPECS GRID ===== */
        .specs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        @media (min-width: 768px) {
          .specs-grid { gap: 0.75rem; margin-bottom: 1.25rem; }
        }

        /* ===== MODAL ===== */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-container {
          max-width: 42rem;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          border-radius: 1.5rem;
        }
        .modal-close-btn {
          padding: 0.5rem;
          border-radius: 9999px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-close-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: rotate(90deg);
        }

        /* ===== FORM ===== */
        input, textarea, select {
          transition: all 0.2s;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .form-grid-2 { grid-template-columns: 1fr 1fr; }
        }

        /* ===== UTILITY OVERRIDES FOR DARK MODE ===== */
        @media (prefers-color-scheme: dark) {
          .bg-card { background-color: #1e293b; }
          .border-border { border-color: #334155; }
          .text-muted-foreground { color: #94a3b8; }
          .text-foreground { color: #f1f5f9; }
          .bg-background { background-color: #0f172a; }
          .border-input { border-color: #334155; }
          .bg-secondary { background-color: #334155; }
          .bg-primary { background-color: #f59e0b; }
          .text-primary-foreground { color: #0f172a; }
          .modal-close-btn:hover { background-color: rgba(255, 255, 255, 0.1); }
        }

        /* ===== SCROLLBAR ===== */
        .modal-container::-webkit-scrollbar { width: 6px; }
        .modal-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
        .modal-container::-webkit-scrollbar-thumb { background: #eab308; border-radius: 3px; }
        @media (prefers-color-scheme: dark) {
          .modal-container::-webkit-scrollbar-track { background: #1e293b; }
        }

        /* ===== ANIMATIONS ===== */
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* ===== ADDITIONAL UTILITIES (copied from Home.jsx) ===== */
        .flex-col { flex-direction: column; }
        .flex-row { flex-direction: row; }
        .items-start { align-items: flex-start; }
        .gap-3 { gap: 0.75rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-8 { gap: 2rem; }
        .mt-6 { margin-top: 1.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .p-8 { padding: 2rem; }
        .pt-0 { padding-top: 0; }
        .pt-2 { padding-top: 0.5rem; }
        .pb-4 { padding-bottom: 1rem; }
        .h-full { height: 100%; }
        .h-56 { height: 14rem; }
        .md\\:h-64 { height: 16rem; }
        .top-4 { top: 1rem; }
        .right-4 { right: 1rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-3xl { font-size: 1.875rem; }
        .font-medium { font-weight: 500; }
        .rounded-2xl { border-radius: 1rem; }
        .border-2 { border-width: 2px; }
        .border-t-2 { border-top-width: 2px; }
        .border-b { border-bottom-width: 1px; }
        .hover\\:bg-secondary:hover { background-color: #f1f5f9; }
        .hover\\:bg-black\\/70:hover { background-color: rgba(0,0,0,0.7); }
        .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
        .from-gray-900 { --gradient-from: #111827; }
        .to-gray-800 { --gradient-to: #1f2937; }
        .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to)); }
        .bg-gradient-to-t { background-image: linear-gradient(to top, var(--tw-gradient-stops)); }
        .from-black\\/60 { --tw-gradient-from: rgba(0,0,0,0.6); }
        .via-transparent { --tw-gradient-via: transparent; }
        .to-transparent { --tw-gradient-to: transparent; }
        .bg-black\\/50 { background-color: rgba(0,0,0,0.5); }
        .text-white { color: #fff; }
        .text-white\\/20 { color: rgba(255,255,255,0.2); }
        .sm\\:flex-row { flex-direction: row; }
        .sm\\:items-start { align-items: flex-start; }
        .sm\\:justify-between { justify-content: space-between; }
        .sm\\:text-right { text-align: right; }
        .md\\:p-6 { padding: 1.5rem; }
        .md\\:p-8 { padding: 2rem; }
        .md\\:pb-4 { padding-bottom: 1rem; }
        .md\\:text-2xl { font-size: 1.5rem; }
        .md\\:text-3xl { font-size: 1.875rem; }
        .md\\:h-64 { height: 16rem; }
        .flex-1 { flex: 1; }
        .inline-flex { display: inline-flex; }
        .me-1 { margin-right: 0.25rem; }
        .ms-1 { margin-left: 0.25rem; }
        .border-current { border-color: currentColor; }
        .border-t-transparent { border-top-color: transparent; }
        .h-4 { height: 1rem; }
        .w-4 { width: 1rem; }
        .h-5 { height: 1.25rem; }
        .w-5 { width: 1.25rem; }
        .h-3\\.5 { height: 0.875rem; }
        .w-3\\.5 { width: 0.875rem; }
        .md\\:text-5xl { font-size: 3rem; }
        .md\\:text-7xl { font-size: 4.5rem; }
        .md\\:text-base { font-size: 1rem; }
        .md\\:gap-6 { gap: 1.5rem; }
        .md\\:rounded-3xl { border-radius: 1.5rem; }
        .md\\:pt-4 { padding-top: 1rem; }
        .md\\:pb-4 { padding-bottom: 1rem; }
        .md\\:h-4 { height: 1rem; }
        .md\\:w-4 { width: 1rem; }
        .lg\\:text-7xl { font-size: 4.5rem; }
        .hidden-time-inputs { display: none; }
      `}</style>

      <div className="container py-16 md:py-24">
        <FadeIn>
          <div className="max-w-2xl mb-8 md:mb-16">
            <div className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
              — {lang === "fr" ? "Catalogue" : "الكتالوج"}
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-7xl font-bold text-balance">
              {t("cars.title")}
            </h1>
            <p className="text-lg text-muted-foreground mt-4">{t("cars.subtitle")}</p>
          </div>
        </FadeIn>

        <div className="cars-grid">
          {cars.map((car, i) => {
            const carImage = getCarImageUrl(car);
            const hasError = imageErrors[car.id];
            const price = car.price_per_day || car.daily_price || 0;
            const isDisponible = car.status === 'disponible';

            return (
              <FadeIn key={car.id} delay={i * 0.06}>
                <TiltCard>
                  <button
                    onClick={() => openModal(car)}
                    className={`w-full text-left bg-card border-2 rounded-2xl md:rounded-3xl overflow-hidden shadow-soft hover:shadow-elevated transition-all cursor-pointer ${
                      selected?.id === car.id ? "border-accent" : "border-border"
                    }`}
                    disabled={!isDisponible}
                  >
                    <div className="car-card-image relative">
                      {carImage && !hasError ? (
                        <img
                          src={carImage}
                          alt={`${car.brand} ${car.model}`}
                          onError={() => handleImageError(car.id)}
                        />
                      ) : null}
                      {(!carImage || hasError) && (
                        <div className="car-image-fallback">
                          <div className="car-fallback-letter">
                            {car.brand?.[0] || car.model?.[0] || "C"}
                          </div>
                          <div className="car-card-info-overlay">
                            <div className="car-card-brand-overlay">{car.brand}</div>
                            <div className="car-card-model-overlay">{car.model}</div>
                          </div>
                        </div>
                      )}
                      {/* ---------- STATUS BADGE ---------- */}
                      <div className={`status-badge ${isDisponible ? 'disponible' : 'non-disponible'}`}>
                        {isDisponible ? 'Disponible' : 'Non disponible'}
                      </div>
                    </div>

                    <div className="p-4 md:p-6">
                      <div className="specs-grid">
                        <div>
                          <div className="font-semibold text-foreground text-sm md:text-base">{car.year}</div>
                          <div className="text-xs">{t("cars.year")}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground capitalize text-sm md:text-base">{car.color}</div>
                          <div className="text-xs">{t("cars.color")}</div>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground capitalize text-sm md:text-base">
                            {car.transmission === "automatic" || car.type === "automatic"
                              ? t("cars.automatic")
                              : t("cars.manual")}
                          </div>
                          <div className="text-xs">{t("cars.type")}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-border">
                        <div>
                          <div className="font-display text-xl md:text-2xl font-bold">{price}MAD</div>
                          <div className="text-xs text-muted-foreground">{t("cars.perDay")}</div>
                        </div>
                        <span className={`text-accent text-sm font-semibold flex items-center gap-1 ${!isDisponible ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {isDisponible ? t("cars.book") : 'Indisponible'}
                          {isDisponible && <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />}
                        </span>
                      </div>
                    </div>
                  </button>
                </TiltCard>
              </FadeIn>
            );
          })}
        </div>

        {/* ===== RESERVATION MODAL ===== */}
        <AnimatePresence>
          {isModalOpen && selected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-overlay"
              onClick={closeModal}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3 }}
                className="modal-container"
                onClick={(e) => e.stopPropagation()}
              >
                {!submitted ? (
                  <div className="bg-card border border-border rounded-3xl shadow-elevated overflow-hidden">
                    {/* Modal Header with Car Info */}
                    <div className="relative">
                      {/* Fixed height image container */}
                      <div className="relative h-56 md:h-64 overflow-hidden">
                        {getCarImageUrl(selected) ? (
                          <img
                            src={getCarImageUrl(selected)}
                            alt={`${selected.brand} ${selected.model}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                            <Car className="h-16 w-16 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        <button
                          onClick={closeModal}
                          className="absolute top-4 right-4 modal-close-btn bg-black/50 text-white hover:bg-black/70"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="p-4 md:p-6 pb-3 md:pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-accent uppercase tracking-widest mb-1">
                              — {t("book.car")}
                            </div>
                            <h2 className="font-display text-xl md:text-2xl font-bold">
                              {selected.brand} {selected.model}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">{selected.year}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground capitalize">{selected.color}</span>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {selected.transmission === "automatic" || selected.type === "automatic"
                                  ? t("cars.automatic")
                                  : t("cars.manual")}
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="font-display text-2xl md:text-3xl font-bold text-accent">
                              {selected.price_per_day || selected.daily_price || 0}MAD
                            </div>
                            <div className="text-xs text-muted-foreground">{t("cars.perDay")}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Reservation Form */}
                    <form onSubmit={submit} className="p-4 md:p-6 pt-0 space-y-4">
                      {/* Hidden time inputs - values are set but not displayed */}
                      <input type="hidden" name="start_time" value={form.start_time} />
                      <input type="hidden" name="end_time" value={form.end_time} />

                      {/* Name fields - 2 columns on desktop */}
                      <div className="form-grid-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <User className="inline h-3.5 w-3.5 me-1" />
                            {lang === "fr" ? "Prénom" : "الاسم الأول"} <span className="text-accent">*</span>
                          </label>
                          <input
                            required
                            value={form.prenom}
                            onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            placeholder={lang === "fr" ? "Nom" : "اسم"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <User className="inline h-3.5 w-3.5 me-1" />
                            {lang === "fr" ? "Nom" : "الاسم العائلي"} <span className="text-accent">*</span>
                          </label>
                          <input
                            required
                            value={form.nom}
                            onChange={(e) => setForm({ ...form, nom: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            placeholder={lang === "fr" ? "prenom" : "لقب"}
                          />
                        </div>
                      </div>

                      {/* Email and Phone */}
                      <div className="form-grid-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Mail className="inline h-3.5 w-3.5 me-1" />
                            {t("book.email")} <span className="text-accent">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            placeholder="jean@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Phone className="inline h-3.5 w-3.5 me-1" />
                            {t("book.phone")} <span className="text-accent">*</span>
                          </label>
                          <input
                            required
                            value={form.telephone}
                            onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                            placeholder="+212 6 12 34 56 78"
                          />
                        </div>
                      </div>

                      {/* Date fields */}
                      <div className="form-grid-2">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Calendar className="inline h-3.5 w-3.5 me-1" />
                            {t("book.start")} <span className="text-accent">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            min={today}
                            value={form.start_date}
                            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            <Calendar className="inline h-3.5 w-3.5 me-1" />
                            {t("book.end")} <span className="text-accent">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            min={form.start_date}
                            value={form.end_date}
                            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                            className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">{t("book.notes")}</label>
                        <textarea
                          rows={3}
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2 text-sm"
                          placeholder={lang === "fr" ? "Informations supplémentaires..." : "معلومات إضافية..."}
                        />
                      </div>

                      {/* Price Summary */}
                      <div className="bg-secondary rounded-2xl p-4 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-muted-foreground">
                            {days} {days === 1 ? (lang === "fr" ? "jour" : "day") : (lang === "fr" ? "jours" : "days")}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selected.price_per_day || selected.daily_price || 0}MAD × {days}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="font-display text-lg font-bold">{t("book.total")}</div>
                          <div className="font-display text-2xl font-bold text-accent">{total}MAD</div>
                        </div>
                      </div>

                      {/* Submit & Cancel Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-2">
                        <button
                          type="submit"
                          disabled={reservationsLoading || searchingClient}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reservationsLoading || searchingClient ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></span>
                              {lang === "fr" ? "Traitement..." : "جاري المعالجة..."}
                            </span>
                          ) : (
                            <>
                              {t("book.submit")}
                              <ArrowRight className="h-4 w-4" />
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={closeModal}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-input bg-background px-8 py-3 text-sm font-medium text-foreground transition-all hover:bg-secondary"
                        >
                          {lang === "fr" ? "Annuler" : "إلغاء"}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-3xl shadow-elevated p-6 md:p-8 text-center">
                    <div className="h-20 w-20 mx-auto rounded-full gradient-gold flex items-center justify-center mb-6 shadow-gold">
                      <Check className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="font-display text-2xl font-bold mb-3">
                      {lang === "fr" ? "Réservation confirmée !" : "تم تأكيد الحجز!"}
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {lang === "fr"
                        ? `Votre réservation pour ${selected.brand} ${selected.model} a bien été enregistrée.`
                        : `تم تسجيل حجزك لسيارة ${selected.brand} ${selected.model} بنجاح.`}
                    </p>
                    <p className="text-sm text-muted-foreground mb-6">
                      {lang === "fr"
                        ? "Vous recevrez un email de confirmation dans quelques instants."
                        : "ستتلقى بريدًا إلكترونيًا للتأكيد في غضون لحظات."}
                    </p>
                    <button
                      onClick={closeModal}
                      className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      {lang === "fr" ? "Fermer" : "إغلاق"}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}