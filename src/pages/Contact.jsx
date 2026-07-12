// Contact.jsx
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";   // <-- added for scroll to top
import { useDispatch } from "react-redux";
import { useI18n } from "../lib/i18n";
import { FadeIn, TiltCard } from "../components/site/Motion3D";
import { MapPin, Phone, Mail, Clock, Send } from "lucide-react";
import { createContact } from "../Redux/store";
import { toast } from "sonner";

export default function Contact() {
  const dispatch = useDispatch();
  const { t, lang } = useI18n();

  // --- Scroll to top on page change ---
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  // ------------------------------------

  const [form, setForm] = useState({ 
    fullname: "", 
    email: "", 
    phone: "",
    message: "" 
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await dispatch(
      createContact({
        fullname: form.fullname,
        email: form.email,
        phone: form.phone,
        message: form.message,
      })
    );
    setSubmitting(false);
    if (result.error) {
      toast.error(lang === "fr" ? "Erreur lors de l'envoi" : "خطأ في الإرسال");
    } else {
      toast.success(
        lang === "fr"
          ? "Message envoyé. Nous revenons vers vous !"
          : "تم إرسال الرسالة. سنعود إليك!"
      );
      setForm({ fullname: "", email: "", phone: "", message: "" });
    }
  };

  const items = [
    { icon: MapPin, label: t("contact.address") },
    { icon: Phone, label: t("contact.phone") },
    { icon: Mail, label: t("contact.email") },
    { icon: Clock, label: t("contact.hours") },
  ];

  return (
    <>
      <style>{`
        .contact-container {
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 768px) {
          .contact-container {
            padding-left: 2rem;
            padding-right: 2rem;
          }
        }

        /* Spacing */
        .contact-py-16 {
          padding-top: 4rem;
          padding-bottom: 4rem;
        }
        .contact-py-24 {
          padding-top: 6rem;
          padding-bottom: 6rem;
        }
        .contact-mb-16 {
          margin-bottom: 4rem;
        }
        .contact-mb-4 {
          margin-bottom: 1rem;
        }
        .contact-mt-4 {
          margin-top: 1rem;
        }
        .contact-mb-2 {
          margin-bottom: 0.5rem;
        }
        .contact-gap-12 {
          gap: 3rem;
        }

        /* Typography */
        .contact-text-sm {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        .contact-font-semibold {
          font-weight: 600;
        }
        .contact-text-accent {
          color: #eab308;
        }
        .contact-uppercase {
          text-transform: uppercase;
        }
        .contact-tracking-widest {
          letter-spacing: 0.1em;
        }
        .contact-font-display {
          font-family: 'Inter', sans-serif;
        }
        .contact-text-5xl {
          font-size: 2.5rem;
          line-height: 1.1;
        }
        .contact-font-bold {
          font-weight: 700;
        }
        .contact-text-balance {
          text-wrap: balance;
        }
        .contact-text-lg {
          font-size: 1.125rem;
          line-height: 1.6;
        }
        .contact-text-muted {
          color: #64748b;
        }
        .contact-font-medium {
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .contact-text-5xl {
            font-size: 3rem;
          }
        }

        @media (min-width: 1024px) {
          .contact-text-5xl {
            font-size: 4.5rem;
          }
        }

        /* Max widths */
        .contact-max-w-2xl {
          max-width: 42rem;
        }

        /* Layout */
        .contact-grid-2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 1024px) {
          .contact-grid-2 {
            grid-template-columns: repeat(2, 1fr);
            gap: 3rem;
          }
        }

        /* Contact Info Cards */
        .contact-info-space {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .contact-info-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 1rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }

        .contact-info-card:hover {
          transform: translateY(-2px);
          border-color: #eab308;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }

        .contact-icon-wrapper {
          width: 3rem;
          height: 3rem;
          border-radius: 0.75rem;
          background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .contact-icon-wrapper svg {
          width: 1.25rem;
          height: 1.25rem;
          color: #0f172a;
        }

        /* Form Styles */
        .contact-form {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 1.5rem;
          padding: 1.5rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        @media (min-width: 768px) {
          .contact-form {
            padding: 2rem;
          }
        }

        .contact-form-group {
          display: flex;
          flex-direction: column;
        }

        .contact-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--label-color, #1e293b);
        }

        .contact-input {
          display: flex;
          height: 2.75rem;
          width: 92%;
          border-radius: 0.75rem;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--input-bg, #ffffff);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .contact-input:focus {
          outline: none;
          border-color: #eab308;
          ring: 2px solid #eab308;
        }

        .contact-textarea {
          display: flex;
          min-height: 100px;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border-color, #e2e8f0);
          background: var(--input-bg, #ffffff);
          padding: 0.75rem;
          font-size: 0.875rem;
          resize: vertical;
          transition: all 0.2s;
        }

        .contact-textarea:focus {
          outline: none;
          border-color: #eab308;
        }

        .contact-submit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 9999px;
          background: var(--btn-bg, #0f172a);
          padding: 0 1.5rem;
          height: 3rem;
          width: 100%;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--btn-text, #ffffff);
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .contact-submit-btn:hover:not(:disabled) {
          background: var(--btn-hover, #1e293b);
          transform: translateY(-1px);
        }

        .contact-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .contact-info-card {
            background: #1e293b;
            border-color: #334155;
          }
          .contact-text-muted {
            color: #94a3b8;
          }
          .contact-form {
            background: #1e293b;
            border-color: #334155;
          }
          .contact-label {
            color: #f1f5f9;
          }
          .contact-input {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .contact-textarea {
            background: #0f172a;
            border-color: #334155;
            color: #f1f5f9;
          }
          .contact-submit-btn {
            background: #f59e0b;
            color: #0f172a;
          }
          .contact-submit-btn:hover:not(:disabled) {
            background: #eab308;
          }
          .contact-icon-wrapper svg {
            color: #0f172a;
          }
        }
      `}</style>

      <div className="contact-container contact-py-16 md:contact-py-24">
        {/* Header Section */}
        <FadeIn>
          <div className="contact-max-w-2xl contact-mb-16">
            <div className="contact-text-sm contact-font-semibold contact-text-accent contact-uppercase contact-tracking-widest contact-mb-4">
              — Contact
            </div>
            <h1 className="contact-font-display contact-text-5xl contact-font-bold contact-text-balance">
              {t("contact.title")}
            </h1>
            <p className="contact-text-lg contact-text-muted contact-mt-4">
              {t("contact.subtitle")}
            </p>
          </div>
        </FadeIn>

        {/* Two Column Layout */}
        <div className="contact-grid-2">
          {/* Left Column - Contact Info */}
          <FadeIn>
            <div className="contact-info-space">
              {items.map((item, i) => (
                <TiltCard key={i}>
                  <div className="contact-info-card">
                    <div className="contact-icon-wrapper">
                      <item.icon />
                    </div>
                    <div className="contact-font-medium">{item.label}</div>
                  </div>
                </TiltCard>
              ))}
            </div>
          </FadeIn>

          {/* Right Column - Contact Form (Matches Controller Fields) */}
          <FadeIn delay={0.15}>
            <form onSubmit={submit} className="contact-form">
              <div className="contact-form-group">
                <label className="contact-label">
                  {lang === "fr" ? "Nom complet" : "الاسم الكامل"} *
                </label>
                <input
                  type="text"
                  required
                  value={form.fullname}
                  onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                  className="contact-input"
                  placeholder={lang === "fr" ? "Jean Dupont" : "جان دوبون"}
                />
              </div>

              <div className="contact-form-group">
                <label className="contact-label">
                  {lang === "fr" ? "Email" : "البريد الإلكتروني"} *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="contact-input"
                  placeholder="jean@example.com"
                />
              </div>

              <div className="contact-form-group">
                <label className="contact-label">
                  {lang === "fr" ? "Téléphone" : "رقم الهاتف"} *
                </label>
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="contact-input"
                  placeholder={lang === "fr" ? "+212 6 12 34 56 78" : "+212 6 12 34 56 78"}
                />
              </div>

              <div className="contact-form-group">
                <label className="contact-label">
                  {lang === "fr" ? "Message" : "الرسالة"} *
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="contact-textarea"
                  placeholder={lang === "fr" ? "Votre message..." : "رسالتك..."}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="contact-submit-btn"
              >
                <Send className="contact-submit-icon" style={{ width: '1rem', height: '1rem' }} />
                {submitting 
                  ? (lang === "fr" ? "Envoi..." : "جاري الإرسال...") 
                  : (lang === "fr" ? "Envoyer" : "إرسال")}
              </button>
            </form>
          </FadeIn>
        </div>
      </div>
    </>
  );
}