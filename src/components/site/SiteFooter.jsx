import React from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { Mail, Phone, MapPin } from 'lucide-react';

export default function SiteFooter() {
  const { t } = useI18n();

  const styles = `
    .footer-gradient {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    }
    .container {
      max-width: 1280px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 2rem;
      padding-right: 2rem;
    }
    @media (min-width: 768px) {
      .footer-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 3rem;
      }
      .md-col-span-2 {
        grid-column: span 2;
      }
    }
    .footer-heading {
      font-family: 'Inter', sans-serif;
      font-size: 1.125rem;
      margin-bottom: 1rem;
      color: #eab308;
    }
    .footer-link {
      color: rgba(255,255,255,0.7);
      transition: color 0.2s ease;
      text-decoration: none;
    }
    .footer-link:hover {
      color: #eab308;
    }
    .footer-text {
      color: rgba(255,255,255,0.7);
      font-size: 0.875rem;
    }
    .footer-icon {
      color: rgba(255,255,255,0.7);
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <footer className="footer-gradient" style={{ marginTop: '8rem' }}>
        <div className="container" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="footer-grid" style={{ display: 'grid', gap: '3rem' }}>
            <div className="md-col-span-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{
                  height: '40px',
                  width: '40px',
                  borderRadius: '9999px',
                  background: '#eab308',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  color: '#0f172a',
                }}>S</div>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  Smiti<span style={{ color: '#eab308' }}>Car</span>
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '24rem' }}>{t('footer.tagline')}</p>
            </div>

            <div>
              <h4 className="footer-heading">Navigation</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <li style={{ marginBottom: '0.5rem' }}><Link to="/" className="footer-link">{t('nav.home')}</Link></li>
                <li style={{ marginBottom: '0.5rem' }}><Link to="/our-cars" className="footer-link">{t('nav.cars')}</Link></li>
                <li style={{ marginBottom: '0.5rem' }}><Link to="/about" className="footer-link">{t('nav.about')}</Link></li>
                <li style={{ marginBottom: '0.5rem' }}><Link to="/contact" className="footer-link">{t('nav.contact')}</Link></li>
                <li><Link to="/admin" className="footer-link" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', textDecoration: 'none' }}>{t('nav.admin')}</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="footer-heading">Contact</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <MapPin size={16} style={{ marginTop: '0.125rem', flexShrink: 0 }} className="footer-icon" />
                  <span className="footer-text">{t('contact.address')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Phone size={16} className="footer-icon" />
                  <span className="footer-text">{t('contact.phone')}</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Mail size={16} className="footer-icon" />
                  <span className="footer-text">{t('contact.email')}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            © {new Date().getFullYear()} Atlas Rent. {t('footer.rights')}
          </div>
        </div>
      </footer>
    </>
  );
}