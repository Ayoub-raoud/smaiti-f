// About.jsx
import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";   // <-- added for scroll to top
import { Award, Users, Car, Globe } from "lucide-react";
import { useI18n } from "../lib/i18n";
import { FadeIn, ParallaxSection } from "../components/site/Motion3D";

export default function About() {
  const { t, lang } = useI18n();

  // --- Scroll to top on page change ---
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  // ------------------------------------

  const stats = [
    { icon: Car, value: "200+", label: lang === "fr" ? "Véhicules" : "سيارة" },
    { icon: Users, value: "12K+", label: lang === "fr" ? "Clients" : "عميل" },
    { icon: Globe, value: "8", label: lang === "fr" ? "Agences" : "وكالة" },
    { icon: Award, value: "16", label: lang === "fr" ? "Années" : "سنة" },
  ];

  return (
    <>
      <style>{`
        /* Container */
        .about-container {
          max-width: 1280px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 768px) {
          .about-container {
            padding-left: 2rem;
            padding-right: 2rem;
          }
        }

        /* Spacing */
        .about-py-16 {
          padding-top: 4rem;
          padding-bottom: 4rem;
        }
        .about-py-24 {
          padding-top: 6rem;
          padding-bottom: 6rem;
        }
        .about-mb-20 {
          margin-bottom: 5rem;
        }
        .about-mb-32 {
          margin-bottom: 8rem;
        }
        .about-mt-8 {
          margin-top: 2rem;
        }
        .about-mb-4 {
          margin-bottom: 1rem;
        }

        /* Typography */
        .about-text-sm {
          font-size: 0.875rem;
          line-height: 1.25rem;
        }
        .about-font-semibold {
          font-weight: 600;
        }
        .about-text-accent {
          color: #eab308;
        }
        .about-uppercase {
          text-transform: uppercase;
        }
        .about-tracking-widest {
          letter-spacing: 0.1em;
        }
        .about-font-display {
          font-family: 'Inter', sans-serif;
        }
        .about-text-5xl {
          font-size: 2.5rem;
          line-height: 1.1;
        }
        .about-font-bold {
          font-weight: 700;
        }
        .about-leading-tight {
          line-height: 1.05;
        }
        .about-text-balance {
          text-wrap: balance;
        }
        .about-text-xl {
          font-size: 1.125rem;
          line-height: 1.6;
        }
        .about-text-muted {
          color: #64748b;
        }
        .about-text-3xl {
          font-size: 1.5rem;
          line-height: 1.3;
        }
        .about-text-center {
          text-align: center;
        }

        @media (min-width: 768px) {
          .about-text-5xl {
            font-size: 3rem;
          }
          .about-text-xl {
            font-size: 1.25rem;
          }
          .about-text-3xl {
            font-size: 1.875rem;
          }
        }

        @media (min-width: 1024px) {
          .about-text-5xl {
            font-size: 4.5rem;
          }
        }

        /* Max widths */
        .about-max-w-3xl {
          max-width: 48rem;
        }
        .about-max-w-5xl {
          max-width: 64rem;
        }
        .about-mx-auto {
          margin-left: auto;
          margin-right: auto;
        }

        /* Stats Grid - Mobile First (2 columns) */
        .about-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }

        @media (min-width: 640px) {
          .about-stats-grid {
            gap: 1.5rem;
          }
        }

        @media (min-width: 768px) {
          .about-stats-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 1.5rem;
          }
        }

        /* Stats Card */
        .about-stat-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: 1.5rem;
          padding: 1.25rem 0.75rem;
          text-align: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }

        .about-stat-card:hover {
          transform: translateY(-2px);
          border-color: #eab308;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
        }

        @media (min-width: 768px) {
          .about-stat-card {
            padding: 2rem;
          }
        }

        .about-stat-icon {
          width: 1.75rem;
          height: 1.75rem;
          margin: 0 auto 0.75rem auto;
          color: #eab308;
        }

        @media (min-width: 768px) {
          .about-stat-icon {
            width: 2rem;
            height: 2rem;
            margin-bottom: 1rem;
          }
        }

        .about-stat-value {
          font-family: 'Inter', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
        }

        @media (min-width: 768px) {
          .about-stat-value {
            font-size: 2.5rem;
          }
        }

        @media (min-width: 1024px) {
          .about-stat-value {
            font-size: 3rem;
          }
        }

        .about-stat-label {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.25rem;
        }

        @media (min-width: 768px) {
          .about-stat-label {
            font-size: 0.875rem;
            margin-top: 0.5rem;
          }
        }

        /* Content Grid */
        .about-content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .about-content-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 4rem;
          }
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .about-stat-card {
            background: #1e293b;
            border-color: #334155;
          }
          .about-text-muted {
            color: #94a3b8;
          }
          .about-stat-label {
            color: #94a3b8;
          }
        }
      `}</style>

      <div className="about-container about-py-16 md:about-py-24">
        {/* Header Section */}
        <FadeIn>
          <div className="about-max-w-3xl about-mb-20">
            <div className="about-text-sm about-font-semibold about-text-accent about-uppercase about-tracking-widest about-mb-4">
              — {lang === "fr" ? "À propos" : "حول"}
            </div>
            <h1 className="about-font-display about-text-5xl about-font-bold about-leading-tight about-text-balance">
              {t("about.title")}
            </h1>
            <p className="about-text-xl about-text-muted about-mt-8 about-text-balance">
              {t("about.lead")}
            </p>
          </div>
        </FadeIn>

        {/* Stats Section - Mobile optimized with 2 columns on mobile, 4 on desktop */}
        <ParallaxSection>
          <div className="about-stats-grid about-mb-32">
            {stats.map((stat, i) => (
              <FadeIn key={i} delay={i * 0.08}>
                <div className="about-stat-card">
                  <stat.icon className="about-stat-icon" />
                  <div className="about-stat-value">{stat.value}</div>
                  <div className="about-stat-label">{stat.label}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </ParallaxSection>

        {/* Story & Mission Section */}
        <div className="about-content-grid about-max-w-5xl about-mx-auto">
          <FadeIn>
            <div>
              <h3 className="about-font-display about-text-3xl about-font-bold about-mb-4">
                {lang === "fr" ? "Notre histoire" : "قصتنا"}
              </h3>
              <p className="about-text-muted">
                {lang === "fr"
                  ? "Fondée en 2008 par deux passionnés d'automobile, Atlas Rent est née d'une conviction : la location ne doit jamais rimer avec compromis. Aujourd'hui, nous opérons une collection premium dans 8 villes."
                  : "تأسست عام 2008 على يد عاشقَين للسيارات، وُلدت أطلس رنت من قناعة بأن التأجير لا يجب أن يعني التنازل. اليوم، نشغّل مجموعة فاخراً في 8 مدن."}
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div>
              <h3 className="about-font-display about-text-3xl about-font-bold about-mb-4">
                {lang === "fr" ? "Notre mission" : "مهمتنا"}
              </h3>
              <p className="about-text-muted">
                {lang === "fr"
                  ? "Rendre l'expérience de conduite premium accessible à tous, sans paperasse ni mauvaises surprises. Une voiture parfaite, prête à partir, à un prix juste."
                  : "جعل تجربة القيادة الفاخرة في متناول الجميع، بدون أوراق ولا مفاجآت. سيارة مثالية جاهزة للانطلاق بسعر عادل."}
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </>
  );
}