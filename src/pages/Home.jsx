// Home.jsx – Full CSS with normal class names
import React, { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { 
  ArrowRight, Sparkles, Zap, Headphones, Calendar, MapPin, Shield, Star,
  Mail, Phone, User, Check, X, Car
} from "lucide-react";
import { useLocation } from 'react-router-dom';
import { useI18n } from "../lib/i18n";
import { ParallaxSection, FadeIn, TiltCard } from "../components/site/Motion3D";
import {
  fetchCars,
  fetchReservations,
  selectCars,
  selectReservations,
  selectCarsLoading,
  createReservation,
  selectReservationsLoading,
  createClient,
  fetchClients,
  selectClients,
} from "../Redux/store";
import { toast } from "sonner";
import { differenceInCalendarDays, format } from "date-fns";
import heroCar from "../assets/hero-car.jpg";

export default function Home() {
  const dispatch = useDispatch();
  const { t, lang } = useI18n();
  const cars = useSelector(selectCars);
  const reservations = useSelector(selectReservations);
  const loading = useSelector(selectCarsLoading);
  const clients = useSelector(selectClients);
  const reservationsLoading = useSelector(selectReservationsLoading);

  // Carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [carouselCars, setCarouselCars] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [heroStartingPrice, setHeroStartingPrice] = useState(0);

  // Modal state
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
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

  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Fetch data
  useEffect(() => {
    dispatch(fetchCars());
    dispatch(fetchReservations());
    dispatch(fetchClients());
  }, [dispatch]);

  // Image helper
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
          return `https://smaiti-b-production.up.railway.app${imageUrl}`;
        }
        if (!imageUrl.startsWith('/')) {
          return `https://smaiti-b-production.up.railway.app/storage/${imageUrl}`;
        }
        return `https://smaiti-b-production.up.railway.app${imageUrl}`;
      }
    }
    return null;
  };

  // Most reserved cars for carousel
  useEffect(() => {
    if (cars.length > 0 && reservations.length > 0) {
      const reservationCount = {};
      reservations.forEach(reservation => {
        const carId = reservation.car_id;
        if (carId) {
          reservationCount[carId] = (reservationCount[carId] || 0) + 1;
        }
      });
      const carsWithReservationCount = cars.map(car => ({
        ...car,
        reservationCount: reservationCount[car.id] || 0
      }));
      carsWithReservationCount.sort((a, b) => b.reservationCount - a.reservationCount);
      const topCars = carsWithReservationCount.slice(0, 12);
      if (topCars.length > 0) {
        setCarouselCars(topCars);
        if (topCars[currentImageIndex]) {
          setHeroStartingPrice(topCars[currentImageIndex].price_per_day || topCars[currentImageIndex].daily_price || 0);
        }
      } else if (cars.length > 0) {
        setCarouselCars(cars.slice(0, 12));
        if (cars[currentImageIndex]) {
          setHeroStartingPrice(cars[currentImageIndex].price_per_day || cars[currentImageIndex].daily_price || 0);
        }
      }
    } else if (cars.length > 0) {
      setCarouselCars(cars.slice(0, 12));
      if (cars[currentImageIndex]) {
        setHeroStartingPrice(cars[currentImageIndex].price_per_day || cars[currentImageIndex].daily_price || 0);
      }
    }
  }, [cars, reservations, currentImageIndex]);

  // Auto-rotate carousel
  useEffect(() => {
    if (carouselCars.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselCars.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [carouselCars.length]);

  const displayedCars = cars.slice(0, 3);

  const handleImageError = (carId) => {
    setImageErrors(prev => ({ ...prev, [carId]: true }));
  };

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

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return;

    setSearchingClient(true);

    try {
      let clientId = null;

      const existingClient = clients.find(client => client.email === form.email);
      if (existingClient) {
        clientId = existingClient.id;
      } else {
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
        await dispatch(fetchClients());
      }

      const rentalDays = days;
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

  const features = [
    { 
      icon: Sparkles, 
      title: lang === "fr" ? "Véhicules premium" : "مركبات فاخرة", 
      desc: lang === "fr" 
        ? "Une collection exclusive entretenue avec soin." 
        : "مجموعة حصرية يتم صيانته بعناية." 
    },
    { 
      icon: Zap, 
      title: lang === "fr" ? "Réservation rapide" : "حجز سريع", 
      desc: lang === "fr" 
        ? "Formulaire simple en moins de 60 secondes." 
        : "نموذج بسيط في أقل من 60 ثانية." 
    },
    { 
      icon: Headphones, 
      title: lang === "fr" ? "Support 24/7" : "دعم على مدار الساعة", 
      desc: lang === "fr" 
        ? "Une équipe dédiée à votre service." 
        : "فريق مخصص لخدمتك." 
    }
  ];

  return (
    <>
      <style>{`
        /* -------------------- RESET & BASE -------------------- */
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .home-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
        }
        @media (max-width: 768px) {
          .home-container { padding: 0 1rem; }
        }

        /* -------------------- HERO -------------------- */
        .hero-section {
          position: relative;
          min-height: 92vh;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          overflow: hidden;
        }
        .hero-bg-blur {
          position: absolute;
          top: 25%;
          right: -5rem;
          width: 24rem;
          height: 24rem;
          border-radius: 9999px;
          background: rgba(234,179,8,0.2);
          filter: blur(3rem);
          animation: float 6s ease-in-out infinite;
        }
        .hero-bg-blur-2 {
          position: absolute;
          bottom: 25%;
          left: -5rem;
          width: 20rem;
          height: 20rem;
          border-radius: 9999px;
          background: rgba(15,23,42,0.1);
          filter: blur(3rem);
          animation: float 6s ease-in-out infinite;
          animation-delay: 2s;
        }
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0); }
        }
        .hero-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(15,23,42,0.05) 100%);
          pointer-events: none;
        }
        .hero-content {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3rem;
          align-items: center;
          padding: 5rem 0;
        }
        @media (max-width: 1024px) {
          .hero-content {
            grid-template-columns: 1fr;
            gap: 2rem;
            text-align: center;
          }
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          border-radius: 9999px;
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }
        .hero-badge-icon { width: 0.875rem; height: 0.875rem; color: #eab308; }
        .hero-badge-text { color: #64748b; }

        .hero-title {
          font-family: 'Inter', sans-serif;
          font-size: 3.75rem;
          font-weight: 700;
          line-height: 0.95;
          letter-spacing: -0.025em;
          text-wrap: balance;
        }
        .hero-title-block { display: block; }
        .hero-title-accent { display: block; font-style: italic; color: #eab308; }
        @media (min-width: 640px) { .hero-title { font-size: 4.5rem; } }
        @media (min-width: 1024px) { .hero-title { font-size: 6rem; } }

        .hero-subtitle {
          margin-top: 1.5rem;
          font-size: 1.125rem;
          color: #64748b;
          max-width: 32rem;
          text-wrap: balance;
        }
        @media (max-width: 1024px) { .hero-subtitle { margin: 1.5rem auto 0; } }

        .hero-buttons {
          margin-top: 2.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        @media (max-width: 1024px) { .hero-buttons { justify-content: center; } }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          background: #0f172a;
          padding: 0 2rem;
          height: 3.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #fff;
          text-decoration: none;
          transition: background 0.2s;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .btn-primary:hover { background: #1e293b; }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          border: 2px solid #e2e8f0;
          background: #fff;
          padding: 0 2rem;
          height: 3.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #0f172a;
          text-decoration: none;
          transition: all 0.2s;
        }
        .btn-secondary:hover { background: #eab308; color: #0f172a; }
        @media (prefers-color-scheme: dark) {
          .btn-secondary { background: #0f172a; border-color: #334155; color: #f1f5f9; }
        }

        .hero-rating {
          margin-top: 3rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          font-size: 0.875rem;
          color: #64748b;
        }
        @media (max-width: 1024px) { .hero-rating { justify-content: center; } }

        .rating-stars {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .star-icon {
          width: 1rem;
          height: 1rem;
          fill: #eab308;
          color: #eab308;
        }
        .rating-value {
          margin-left: 0.5rem;
          font-weight: 600;
          color: #0f172a;
        }
        @media (prefers-color-scheme: dark) { .rating-value { color: #f1f5f9; } }

        .hero-image-wrapper {
          position: relative;
          perspective: 1000px;
        }
        .hero-image-glow {
          position: absolute;
          inset: -2.5rem;
          background: linear-gradient(135deg, #eab308, #f59e0b);
          opacity: 0.2;
          filter: blur(3rem);
          border-radius: 9999px;
        }

        .carousel-container {
          position: relative;
          width: 100%;
          border-radius: 1.5rem;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .carousel-image-wrapper {
          position: relative;
          aspect-ratio: 4/3;
          width: 100%;
        }
        .carousel-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .carousel-caption {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
          padding: 1.5rem;
          color: #fff;
        }
        .carousel-brand {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #eab308;
          font-weight: 600;
        }
        .carousel-model {
          font-family: 'Inter', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 0.25rem;
        }
        .carousel-dots {
          position: absolute;
          bottom: 1rem;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          z-index: 10;
        }
        .carousel-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 9999px;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .carousel-dot.active { width: 1.5rem; background: #eab308; }

        .hero-card {
          position: absolute;
          bottom: -1.5rem;
          left: -1.5rem;
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(10px);
          border-radius: 1rem;
          padding: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          max-width: 200px;
        }
        .hero-card-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .hero-card-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 9999px;
          background: #eab308;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hero-card-icon svg { width: 1.25rem; height: 1.25rem; color: #0f172a; }
        .hero-card-label { font-size: 0.75rem; color: #64748b; }
        .hero-card-price {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 1.125rem;
        }
        @media (prefers-color-scheme: dark) {
          .hero-card { background: rgba(30,41,59,0.9); }
          .hero-card-label { color: #94a3b8; }
        }

        /* -------------------- SECTIONS -------------------- */
        .features-section,
        .howitworks-section,
        .cta-section { padding: 8rem 0; }

        .section-header {
          text-align: center;
          max-width: 48rem;
          margin: 0 auto 5rem;
        }
        .section-badge {
          font-size: 0.875rem;
          font-weight: 600;
          color: #eab308;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }
        .section-title {
          font-family: 'Inter', sans-serif;
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          text-wrap: balance;
        }
        @media (min-width: 768px) { .section-title { font-size: 3.75rem; } }
        .section-subtitle { font-size: 1.125rem; color: #64748b; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 768px) { .features-grid { grid-template-columns: 1fr; } }

        .feature-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          padding: 2rem;
          height: 100%;
          transition: box-shadow 0.2s;
        }
        .feature-card:hover { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        @media (prefers-color-scheme: dark) {
          .feature-card { background: #1e293b; border-color: #334155; }
        }
        .feature-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          background: linear-gradient(135deg, #eab308, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(234,179,8,0.2);
        }
        .feature-icon svg { width: 1.5rem; height: 1.5rem; color: #0f172a; }
        .feature-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }
        .feature-desc { color: #64748b; }
        @media (prefers-color-scheme: dark) { .feature-desc { color: #94a3b8; } }

        .cars-section {
          padding: 8rem 0;
          background: rgba(241,245,249,0.3);
        }
        @media (prefers-color-scheme: dark) { .cars-section { background: rgba(51,65,85,0.3); } }

        .cars-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin-bottom: 4rem;
        }
        .cars-header-title { max-width: 36rem; }

        .view-all-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 0.5rem 1rem;
          height: 2.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.2s;
        }
        .view-all-link:hover { background: #eab308; color: #0f172a; }
        @media (prefers-color-scheme: dark) {
          .view-all-link { background: #0f172a; border-color: #334155; color: #f1f5f9; }
        }

        .cars-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 768px) { .cars-grid { grid-template-columns: 1fr; } }

        /* ===== CAR CARD ===== */
        .car-card {
          background: #fff;
          border-radius: 1rem;
          overflow: hidden;
          transition: all 0.3s ease;
          border: 1px solid #e2e8f0;
          display: block;
          cursor: pointer;
          text-decoration: none;
          position: relative;
        }
        .car-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
          border-color: #eab308;
        }
        @media (prefers-color-scheme: dark) {
          .car-card { background: #1e293b; border-color: #334155; }
        }
        .car-card-image {
          width: 100%;
          height: 220px;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          position: relative;
          overflow: hidden;
        }
        .car-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }
        .car-card:hover .car-card-image img { transform: scale(1.05); }
        .car-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a, #1e293b);
          position: relative;
        }
        .car-fallback-letter {
          font-family: 'Inter', sans-serif;
          font-size: 5rem;
          font-weight: 900;
          color: rgba(255,255,255,0.1);
        }
        .car-card-info-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 1rem;
          text-align: center;
        }
        .car-card-brand-overlay {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #eab308;
          font-weight: 600;
        }
        .car-card-model-overlay {
          font-family: 'Inter', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          margin-top: 0.25rem;
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

        .car-details { padding: 1rem; }
        .car-specs {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-size: 0.7rem;
          color: #64748b;
        }
        .car-spec-value {
          font-weight: 600;
          color: #0f172a;
          font-size: 0.8rem;
        }
        @media (prefers-color-scheme: dark) { .car-spec-value { color: #f1f5f9; } }

        .car-price-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.75rem;
          border-top: 1px solid #e2e8f0;
        }
        @media (prefers-color-scheme: dark) { .car-price-row { border-top-color: #334155; } }
        .car-price {
          font-family: 'Inter', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
        }
        .car-price-label { font-size: 0.7rem; color: #64748b; }
        .book-link {
          color: #eab308;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .book-link svg { width: 0.9rem; height: 0.9rem; }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          position: relative;
        }
        @media (max-width: 768px) { .steps-grid { grid-template-columns: 1fr; } }

        .step-item {
          position: relative;
          text-align: center;
        }
        .step-number {
          position: absolute;
          top: -2rem;
          left: 50%;
          transform: translateX(-50%);
          font-family: 'Inter', sans-serif;
          font-size: 8rem;
          font-weight: 900;
          color: rgba(234,179,8,0.1);
          user-select: none;
        }
        .step-icon {
          width: 5rem;
          height: 5rem;
          margin: 0 auto 1.5rem;
          border-radius: 1.5rem;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        .step-icon svg { width: 2rem; height: 2rem; color: #fff; }
        @media (prefers-color-scheme: dark) {
          .step-icon { background: #f59e0b; }
          .step-icon svg { color: #0f172a; }
        }
        .step-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }
        .step-desc {
          color: #64748b;
          max-width: 20rem;
          margin: 0 auto;
        }
        @media (prefers-color-scheme: dark) { .step-desc { color: #94a3b8; } }

        .testimonials-section {
          padding: 8rem 0;
          background: rgba(241,245,249,0.3);
        }
        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 768px) { .testimonials-grid { grid-template-columns: 1fr; } }

        .testimonial-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 1.5rem;
          padding: 2rem;
          height: 100%;
        }
        @media (prefers-color-scheme: dark) {
          .testimonial-card { background: #1e293b; border-color: #334155; }
        }
        .testimonial-stars {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1rem;
        }
        .testimonial-text {
          font-size: 1.125rem;
          margin-bottom: 1.5rem;
          text-wrap: balance;
        }
        .testimonial-name { font-weight: 600; }
        .testimonial-city { font-size: 0.875rem; color: #64748b; }

        .cta-card {
          position: relative;
          background: linear-gradient(135deg, #1e293b, #0f172a);
          border-radius: 2.5rem;
          padding: 3rem;
          text-align: center;
          color: #fff;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        }
        @media (min-width: 768px) { .cta-card { padding: 5rem; } }
        .cta-blur {
          position: absolute;
          top: -5rem;
          right: -5rem;
          width: 20rem;
          height: 20rem;
          background: rgba(234,179,8,0.3);
          border-radius: 9999px;
          filter: blur(3rem);
        }
        .cta-content { position: relative; }
        .cta-title {
          font-family: 'Inter', sans-serif;
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          text-wrap: balance;
        }
        @media (min-width: 768px) { .cta-title { font-size: 3.75rem; } }
        .cta-subtitle {
          font-size: 1.25rem;
          color: rgba(255,255,255,0.7);
          margin-bottom: 2.5rem;
          max-width: 36rem;
          margin-left: auto;
          margin-right: auto;
          text-wrap: balance;
        }
        .cta-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          background: #eab308;
          padding: 0 2.5rem;
          height: 3.5rem;
          font-size: 1rem;
          font-weight: 500;
          color: #0f172a;
          text-decoration: none;
          transition: background 0.2s;
          box-shadow: 0 10px 15px -3px rgba(234,179,8,0.2);
        }
        .cta-button:hover { background: #f59e0b; }

        .loading-state {
          text-align: center;
          padding: 3rem;
          color: #64748b;
        }
        .text-accent { color: #eab308; }
        .capitalize { text-transform: capitalize; }

        /* -------------------- MODAL (exactly as Cars.jsx) -------------------- */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7);
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
          background: rgba(0,0,0,0.05);
          transform: rotate(90deg);
        }
        @media (prefers-color-scheme: dark) {
          .modal-close-btn:hover { background: rgba(255,255,255,0.1); }
        }

        /* Modal form elements */
        input, textarea, select {
          transition: all 0.2s;
        }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #eab308;
          box-shadow: 0 0 0 2px rgba(234,179,8,0.2);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .form-grid-2 { grid-template-columns: 1fr 1fr; }
        }

        /* Scrollbar */
        .modal-container::-webkit-scrollbar { width: 6px; }
        .modal-container::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
        .modal-container::-webkit-scrollbar-thumb { background: #eab308; border-radius: 3px; }
        @media (prefers-color-scheme: dark) {
          .modal-container::-webkit-scrollbar-track { background: #1e293b; }
        }

        /* Utility classes (copied from Cars.jsx) */
        .bg-card { background: #fff; }
        .border-border { border-color: #e2e8f0; }
        .rounded-3xl { border-radius: 1.5rem; }
        .shadow-elevated { box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .shadow-soft { box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }
        .text-muted-foreground { color: #64748b; }
        .text-foreground { color: #0f172a; }
        .bg-secondary { background: #f1f5f9; }
        .bg-background { background: #fff; }
        .border-input { border-color: #e2e8f0; }
        .gradient-gold { background: linear-gradient(135deg, #eab308, #f59e0b); }
        .shadow-gold { box-shadow: 0 10px 15px -3px rgba(234,179,8,0.2); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .font-display { font-family: 'Inter', sans-serif; }
        .bg-primary { background: #0f172a; }
        .text-primary-foreground { color: #fff; }
        .h-11 { height: 2.75rem; }
        .min-h-\\[80px\\] { min-height: 80px; }

        @media (prefers-color-scheme: dark) {
          .bg-card { background: #1e293b; }
          .border-border { border-color: #334155; }
          .text-muted-foreground { color: #94a3b8; }
          .text-foreground { color: #f1f5f9; }
          .bg-background { background: #0f172a; }
          .border-input { border-color: #334155; }
          .bg-secondary { background: #334155; }
          .bg-primary { background: #f59e0b; }
          .text-primary-foreground { color: #0f172a; }
        }

        /* Custom spacing helpers */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-row { flex-direction: row; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .gap-1 { gap: 0.25rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .gap-6 { gap: 1.5rem; }
        .gap-8 { gap: 2rem; }
        .space-y-4 > * + * { margin-top: 1rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-4 { margin-top: 1rem; }
        .mt-6 { margin-top: 1.5rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-8 { margin-bottom: 2rem; }
        .p-4 { padding: 1rem; }
        .p-6 { padding: 1.5rem; }
        .p-8 { padding: 2rem; }
        .px-3 { padding: 0 0.75rem; }
        .px-8 { padding: 0 2rem; }
        .py-2 { padding: 0.5rem 0; }
        .py-3 { padding: 0.75rem 0; }
        .pt-0 { padding-top: 0; }
        .pt-2 { padding-top: 0.5rem; }
        .pt-3 { padding-top: 0.75rem; }
        .pt-4 { padding-top: 1rem; }
        .pb-3 { padding-bottom: 0.75rem; }
        .pb-4 { padding-bottom: 1rem; }
        .w-full { width: 100%; }
        .h-full { height: 100%; }
        .h-16 { height: 4rem; }
        .w-16 { width: 4rem; }
        .h-20 { height: 5rem; }
        .w-20 { width: 5rem; }
        .h-10 { height: 2.5rem; }
        .w-10 { width: 2.5rem; }
        .h-56 { height: 14rem; }
        .md\\:h-64 { height: 16rem; }
        .object-cover { object-fit: cover; }
        .overflow-hidden { overflow: hidden; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .top-4 { top: 1rem; }
        .right-4 { right: 1rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .text-lg { font-size: 1.125rem; }
        .text-xl { font-size: 1.25rem; }
        .text-2xl { font-size: 1.5rem; }
        .text-3xl { font-size: 1.875rem; }
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .uppercase { text-transform: uppercase; }
        .tracking-widest { letter-spacing: 0.1em; }
        .rounded-full { border-radius: 9999px; }
        .rounded-xl { border-radius: 0.75rem; }
        .rounded-2xl { border-radius: 1rem; }
        .border { border-width: 1px; }
        .border-2 { border-width: 2px; }
        .border-t { border-top-width: 1px; }
        .border-t-2 { border-top-width: 2px; }
        .border-b { border-bottom-width: 1px; }
        .cursor-pointer { cursor: pointer; }
        .transition-all { transition: all 0.2s; }
        .hover\\:bg-primary\\/90:hover { background: rgba(15,23,42,0.9); }
        .hover\\:bg-secondary:hover { background: #f1f5f9; }
        .hover\\:bg-black\\/70:hover { background: rgba(0,0,0,0.7); }
        .disabled\\:opacity-50:disabled { opacity: 0.5; }
        .disabled\\:cursor-not-allowed:disabled { cursor: not-allowed; }
        .from-gray-900 { --gradient-from: #111827; }
        .to-gray-800 { --gradient-to: #1f2937; }
        .bg-gradient-to-br { background-image: linear-gradient(to bottom right, var(--gradient-from), var(--gradient-to)); }
        .bg-gradient-to-t { background-image: linear-gradient(to top, var(--tw-gradient-stops)); }
        .from-black\\/60 { --tw-gradient-from: rgba(0,0,0,0.6); }
        .via-transparent { --tw-gradient-via: transparent; }
        .to-transparent { --tw-gradient-to: transparent; }
        .bg-black\\/50 { background: rgba(0,0,0,0.5); }
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
      `}</style>

      <div className="overflow-hidden">
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-bg-blur" />
          <div className="hero-bg-blur-2" />
          <div className="hero-gradient" />

          <div className="home-container">
            <div className="hero-content">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="hero-badge"
                >
                  <Sparkles className="hero-badge-icon" />
                  <span className="hero-badge-text">{t("hero.tagline")}</span>
                </motion.div>

                <h1 className="hero-title">
                  <motion.span
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="hero-title-block"
                  >
                    {t("hero.title1")}
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.25 }}
                    className="hero-title-accent"
                  >
                    {t("hero.title2")}.
                  </motion.span>
                </h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                  className="hero-subtitle"
                >
                  {t("hero.subtitle")}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.65 }}
                  className="hero-buttons"
                >
                  <Link to="/our-cars" className="btn-primary">
                    {t("hero.cta.book")} <ArrowRight className="ms-1" style={{ width: '1.25rem', height: '1.25rem' }} />
                  </Link>
                  <Link to="/our-cars" className="btn-secondary">
                    {t("hero.cta.fleet")}
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.9 }}
                  className="hero-rating"
                >
                  <div className="rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="star-icon" />
                    ))}
                    <span className="rating-value">4.9</span>
                  </div>
                  <div>+12 000 clients satisfaits</div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.3 }}
                className="hero-image-wrapper"
              >
                <div className="hero-image-glow" />
                <div className="carousel-container">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentImageIndex}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.5 }}
                      className="carousel-image-wrapper"
                    >
                      {carouselCars[currentImageIndex] && (
                        <>
                          <img
                            src={getCarImageUrl(carouselCars[currentImageIndex]) || heroCar}
                            alt={`${carouselCars[currentImageIndex].brand} ${carouselCars[currentImageIndex].model}`}
                            className="carousel-image"
                            onError={(e) => { e.target.src = heroCar; }}
                          />
                          <div className="carousel-caption">
                            <div className="carousel-brand">{carouselCars[currentImageIndex].brand}</div>
                            <div className="carousel-model">{carouselCars[currentImageIndex].model}</div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {carouselCars.length > 1 && (
                    <div className="carousel-dots">
                      {carouselCars.map((_, index) => (
                        <button
                          key={index}
                          className={`carousel-dot ${currentImageIndex === index ? 'active' : ''}`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2, duration: 0.6 }}
                  className="hero-card"
                >
                  <div className="hero-card-content">
                    <div className="hero-card-icon"><Zap /></div>
                    <div>
                      <div className="hero-card-label">À partir de</div>
                      <div className="hero-card-price">{heroStartingPrice}MAD/jour</div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="features-section">
          <div className="home-container">
            <FadeIn>
              <div className="section-header">
                <div className="section-badge">— {lang === "fr" ? "Notre promesse" : "وعدنا"}</div>
                <h2 className="section-title">{t("features.title")}</h2>
                <p className="section-subtitle">{t("features.subtitle")}</p>
              </div>
            </FadeIn>

            <div className="features-grid">
              {features.map((feature, i) => (
                <FadeIn key={i} delay={i * 0.12}>
                  <TiltCard>
                    <div className="feature-card">
                      <div className="feature-icon"><feature.icon /></div>
                      <h3 className="feature-title">{feature.title}</h3>
                      <p className="feature-desc">{feature.desc}</p>
                    </div>
                  </TiltCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURED CARS */}
        <section className="cars-section">
          <div className="home-container">
            <FadeIn>
              <div className="cars-header">
                <div className="cars-header-title">
                  <div className="section-badge">— {lang === "fr" ? "Sélection" : "اختيار"}</div>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>{t("cars.title")}</h2>
                </div>
                <Link to="/our-cars" className="view-all-link">
                  {lang === "fr" ? "Voir tout" : "عرض الكل"} <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} />
                </Link>
              </div>
            </FadeIn>

            <ParallaxSection>
              {loading ? (
                <div className="loading-state">Chargement...</div>
              ) : (
                <div className="cars-grid">
                  {displayedCars.map((car, i) => {
                    const carImage = getCarImageUrl(car);
                    const hasError = imageErrors[car.id];
                    const isDisponible = car.status === 'disponible';

                    return (
                      <FadeIn key={car.id} delay={i * 0.1}>
                        <TiltCard className="h-full">
                          <button
                            onClick={() => openModal(car)}
                            className="car-card w-full text-left"
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
                            <div className="car-details">
                              <div className="car-specs">
                                <div>
                                  <div className="car-spec-value">{car.year}</div>
                                  {t("cars.year")}
                                </div>
                                <div>
                                  <div className="car-spec-value capitalize">{car.color}</div>
                                  {t("cars.color")}
                                </div>
                                <div>
                                  <div className="car-spec-value capitalize">
                                    {car.type === "automatic" ? t("cars.automatic") : t("cars.manual")}
                                  </div>
                                  {t("cars.type")}
                                </div>
                              </div>
                              <div className="car-price-row">
                                <div>
                                  <div className="car-price">{car.price_per_day}MAD</div>
                                  <div className="car-price-label">{t("cars.perDay")}</div>
                                </div>
                                <span className={`book-link ${!isDisponible ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  {isDisponible ? t("cars.book") : 'Indisponible'}
                                  {isDisponible && <ArrowRight />}
                                </span>
                              </div>
                            </div>
                          </button>
                        </TiltCard>
                      </FadeIn>
                    );
                  })}
                </div>
              )}
            </ParallaxSection>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="howitworks-section">
          <div className="home-container">
            <FadeIn>
              <div className="section-header">
                <div className="section-badge">— Process</div>
                <h2 className="section-title">{lang === "fr" ? "Trois étapes vers la route" : "ثلاث خطوات نحو الطريق"}</h2>
              </div>
            </FadeIn>

            <div className="steps-grid">
              {[
                { n: "01", icon: MapPin, title: lang === "fr" ? "Choisissez" : "اختر", desc: lang === "fr" ? "Parcourez notre collection et sélectionnez votre véhicule." : "تصفّح مجموعتنا واختر سيارتك." },
                { n: "02", icon: Calendar, title: lang === "fr" ? "Réservez" : "احجز", desc: lang === "fr" ? "Remplissez le formulaire en moins de 60 secondes." : "املأ النموذج في أقل من 60 ثانية." },
                { n: "03", icon: Shield, title: lang === "fr" ? "Conduisez" : "قُد", desc: lang === "fr" ? "Récupérez les clés et profitez du voyage." : "استلم المفاتيح واستمتع بالرحلة." }
              ].map((step, i) => (
                <FadeIn key={i} delay={i * 0.15}>
                  <div className="step-item">
                    <div className="step-number">{step.n}</div>
                    <div className="step-icon"><step.icon /></div>
                    <h3 className="step-title">{step.title}</h3>
                    <p className="step-desc">{step.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="testimonials-section">
          <div className="home-container">
            <FadeIn>
              <div className="section-header" style={{ marginBottom: '4rem' }}>
                <div className="section-badge">— {lang === "fr" ? "Témoignages" : "شهادات"}</div>
                <h2 className="section-title">{lang === "fr" ? "Ils nous ont fait confiance" : "وثقوا بنا"}</h2>
              </div>
            </FadeIn>

            <div className="testimonials-grid">
              {[
                { name: "Sophie L.", city: "Paris", quote: lang === "fr" ? "Service impeccable. Voiture parfaite, équipe à l'écoute. Je recommande." : "خدمة لا تشوبها شائبة. سيارة مثالية وفريق مستمع. أوصي بهم." },
                { name: "Karim B.", city: "Lyon", quote: lang === "fr" ? "Réservation en 2 minutes, prise en charge ultra rapide. Mon nouveau réflexe." : "حجز في دقيقتين، استلام سريع جداً. عادتي الجديدة." },
                { name: "Emma R.", city: "Marseille", quote: lang === "fr" ? "Une collection de rêve à des prix justes. Difficile de revenir en arrière." : "مجموعة حلم بأسعار عادلة. من الصعب العودة." }
              ].map((testimonial, i) => (
                <FadeIn key={i} delay={i * 0.1}>
                  <div className="testimonial-card">
                    <div className="testimonial-stars">
                      {[...Array(5)].map((_, j) => <Star key={j} className="star-icon" />)}
                    </div>
                    <p className="testimonial-text">"{testimonial.quote}"</p>
                    <div>
                      <div className="testimonial-name">{testimonial.name}</div>
                      <div className="testimonial-city">{testimonial.city}</div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="cta-section">
          <div className="home-container">
            <FadeIn>
              <div className="cta-card">
                <div className="cta-blur" />
                <div className="cta-content">
                  <h2 className="cta-title">{lang === "fr" ? "Prêt à prendre la route ?" : "هل أنت جاهز للانطلاق؟"}</h2>
                  <p className="cta-subtitle">
                    {lang === "fr" ? "Votre prochaine voiture vous attend. Réservez en moins d'une minute." : "سيارتك التالية بانتظارك. احجز في أقل من دقيقة."}
                  </p>
                  <Link to="/our-cars" className="cta-button">
                    {t("hero.cta.book")} <ArrowRight style={{ width: '1.25rem', height: '1.25rem', marginLeft: '0.5rem' }} />
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
      </div>

      {/* RESERVATION MODAL – EXACT COPY FROM Cars.jsx with normal CSS */}
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
                  {/* Modal Header with Car Image */}
                  <div className="relative">
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

                  <form onSubmit={submit} className="p-4 md:p-6 pt-0 space-y-4">
                    <input type="hidden" name="start_time" value={form.start_time} />
                    <input type="hidden" name="end_time" value={form.end_time} />

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
    </>
  );
}