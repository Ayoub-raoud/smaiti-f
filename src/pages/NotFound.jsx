// not-found.jsx
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const notFoundStyles = `
  .not-found-container {
    display: flex;
    min-height: 100vh;
    align-items: center;
    justify-content: center;
    background-color: #f1f5f9;
  }
  .not-found-content {
    text-align: center;
  }
  .not-found-title {
    margin-bottom: 1rem;
    font-size: 3rem;
    line-height: 1;
    font-weight: 700;
  }
  .not-found-message {
    margin-bottom: 1rem;
    font-size: 1.25rem;
    line-height: 1.75rem;
    color: #64748b;
  }
  .not-found-link {
    color: #0f172a;
    text-decoration: underline;
    transition: color 0.2s;
  }
  .not-found-link:hover {
    color: #eab308;
  }
  @media (prefers-color-scheme: dark) {
    .not-found-container {
      background-color: #0f172a;
    }
    .not-found-message {
      color: #94a3b8;
    }
    .not-found-link {
      color: #f1f5f9;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = notFoundStyles;
  document.head.appendChild(style);
}

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <p className="not-found-message">Oops! Page not found</p>
        <a href="/" className="not-found-link">Return to Home</a>
      </div>
    </div>
  );
};

export default NotFound;