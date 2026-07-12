import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

import logo from '../../assets/logo1.png';

export default function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      setScrolled(currentScrollY > 20);
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/our-cars', label: t('nav.cars') },
    { to: '/about', label: t('nav.about') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const headerStyles = `
    .header-glass {
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(12px);
    }
    .shadow-soft {
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.02);
    }
    .container {
      max-width: 1280px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 2rem;
      padding-right: 2rem;
    }
    .nav-link {
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      border-radius: 9999px;
      transition: color 0.2s;
      position: relative;
      color: #64748b;
      text-decoration: none;
    }
    .nav-link-active {
      color: #0f172a;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      border-radius: 9999px;
      background-color: #0f172a;
      color: white;
      transition: background-color 0.2s;
      text-decoration: none;
      /* no fixed padding/font-size here – will be overridden by inline styles */
    }
    .btn-primary:hover {
      background-color: rgba(15,23,42,0.9);
    }
    @media (max-width: 767px) {
      .desktop-nav {
        display: none;
      }
      .desktop-lang {
        display: none;
      }
      .desktop-book {
        display: none;
      }
    }
    @media (min-width: 768px) {
      .mobile-menu-btn {
        display: none;
      }
      .desktop-nav {
        display: flex;
      }
      .desktop-lang {
        display: flex;
      }
      .desktop-book {
        display: inline-flex;
      }
    }
  `;

  return (
    <>
      <style>{headerStyles}</style>
      <header
        className={scrolled ? 'header-glass shadow-soft' : ''}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          transition: 'transform 0.3s ease, background 0.3s ease, padding 0.3s ease',
          padding: scrolled ? '0.75rem 0' : '1.5rem 0',
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img
              src={logo}
              alt="SmitiCar"
              style={{
                height: '56px',
                width: 'auto',
                maxHeight: '56px',
                objectFit: 'contain',
                borderRadius: '12px',
              }}
            />
          </Link>

          <nav className="desktop-nav" style={{ alignItems: 'center', gap: '0.25rem' }}>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          zIndex: -1,
                          borderRadius: '9999px',
                          background: '#f1f5f9',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
              className="desktop-lang"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Globe size={16} />
              <span style={{ textTransform: 'uppercase' }}>{lang}</span>
            </button>

            {/* 🔽 Fixed with inline styles – always small */}
            <Link
              to="/our-cars"
              className="btn-primary desktop-book"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                height: 'auto',
                boxShadow: 'none',
              }}
            >
              {t('nav.book')}
            </Link>

            <button
              className="mobile-menu-btn"
              style={{
                padding: '0.5rem',
                borderRadius: '9999px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="header-glass"
              style={{
                borderTop: '1px solid #e2e8f0',
                marginTop: '0.75rem',
              }}
            >
              <div className="container" style={{ paddingTop: '1rem', paddingBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    style={({ isActive }) => ({
                      padding: '0.75rem 1rem',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: 500,
                      background: isActive ? '#f1f5f9' : 'transparent',
                      color: isActive ? '#0f172a' : '#64748b',
                      textDecoration: 'none',
                    })}
                  >
                    {link.label}
                  </NavLink>
                ))}
                <button
                  onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 500,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Globe size={16} /> {lang === 'fr' ? 'العربية' : 'Français'}
                </button>
                <Link to="/our-cars" className="btn-primary" style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                  {t('nav.book')}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}