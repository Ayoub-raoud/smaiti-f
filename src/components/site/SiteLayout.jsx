import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

export default function SiteLayout() {
  const layoutStyle = `
    .layout-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f8fafc;
    }
    .layout-main {
      flex: 1;
      padding-top: 5rem;
    }
    @media (prefers-color-scheme: dark) {
      .layout-container {
        background-color: #0f172a;
      }
    }
  `;

  return (
    <>
      <style>{layoutStyle}</style>
      <div className="layout-container">
        <SiteHeader />
        <main className="layout-main">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </>
  );
}