// navlink.jsx
import React, { forwardRef } from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';

const navLinkStyles = `
  .nav-link-active {
    font-weight: 600;
    color: #0f172a;
  }
  @media (prefers-color-scheme: dark) {
    .nav-link-active {
      color: #f59e0b;
    }
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = navLinkStyles;
  document.head.appendChild(style);
}

export const NavLink = forwardRef(({ className, activeClassName = 'nav-link-active', pendingClassName = '', to, ...props }, ref) => {
  return (
    <RouterNavLink
      ref={ref}
      to={to}
      className={({ isActive, isPending }) => {
        let base = typeof className === 'function' ? className({ isActive, isPending }) : className;
        if (isActive && activeClassName) base += ` ${activeClassName}`;
        if (isPending && pendingClassName) base += ` ${pendingClassName}`;
        return base;
      }}
      {...props}
    />
  );
});

NavLink.displayName = 'NavLink';