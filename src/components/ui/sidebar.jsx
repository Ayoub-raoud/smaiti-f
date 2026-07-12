// sidebar.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PanelLeft, X } from 'lucide-react';

// ==================== Styles ====================
const sidebarStyles = `
  :root {
    --background: 40 30% 98%;
    --foreground: 220 25% 10%;
    --card: 0 0% 100%;
    --card-foreground: 220 25% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 220 25% 10%;
    --primary: 220 30% 12%;
    --primary-foreground: 40 30% 98%;
    --primary-glow: 220 25% 22%;
    --accent: 38 70% 52%;
    --accent-foreground: 220 30% 12%;
    --accent-soft: 38 80% 92%;
    --secondary: 220 15% 95%;
    --secondary-foreground: 220 30% 12%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 10% 42%;
    --destructive: 0 75% 55%;
    --destructive-foreground: 0 0% 100%;
    --success: 145 55% 42%;
    --warning: 35 90% 55%;
    --border: 220 15% 90%;
    --input: 220 15% 90%;
    --ring: 220 30% 12%;
    --radius: 1rem;
    --gradient-hero: linear-gradient(135deg, hsl(40 30% 98%) 0%, hsl(38 60% 94%) 100%);
    --gradient-ink: linear-gradient(135deg, hsl(220 30% 12%) 0%, hsl(220 25% 22%) 100%);
    --gradient-gold: linear-gradient(135deg, hsl(38 70% 52%) 0%, hsl(38 85% 65%) 100%);
    --gradient-soft: radial-gradient(circle at 30% 20%, hsl(38 70% 52% / 0.12), transparent 60%);
    --shadow-soft: 0 2px 20px -8px hsl(220 30% 12% / 0.08);
    --shadow-elevated: 0 30px 60px -30px hsl(220 30% 12% / 0.25);
    --shadow-gold: 0 20px 50px -20px hsl(38 70% 52% / 0.45);
    --ease-smooth: cubic-bezier(0.22, 1, 0.36, 1);
    --transition-base: all 0.4s var(--ease-smooth);
    --sidebar-background: 220 30% 12%;
    --sidebar-foreground: 40 30% 96%;
    --sidebar-primary: 38 70% 52%;
    --sidebar-primary-foreground: 220 30% 12%;
    --sidebar-accent: 220 25% 18%;
    --sidebar-accent-foreground: 40 30% 96%;
    --sidebar-border: 220 25% 18%;
    --sidebar-ring: 38 70% 52%;
    --sidebar-width: 14rem;
  --sidebar-width-icon: 4rem;
  }

  /* Provider */
  .sidebar-provider {
    display: flex;
    min-height: 100vh;
    width: 100%;
  }

  /* Trigger Button */
  .sidebar-trigger-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 500;
    transition: var(--transition-base);
    height: 1.75rem;
    width: 1.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--sidebar-foreground));
  }
  .sidebar-trigger-btn:hover {
    background-color: hsl(var(--sidebar-accent));
  }

  /* Desktop Sidebar */
  .sidebar-desktop {
    position: fixed;
    top: 1rem;
    bottom: 1rem;
    z-index: 10;
    display: none;
    height: calc(100vh - 2rem);
    width: var(--sidebar-width);
    transition: left 0.2s var(--ease-smooth), right 0.2s var(--ease-smooth), width 0.2s var(--ease-smooth);
    background: hsl(var(--sidebar-background));
    background: linear-gradient(135deg, hsl(var(--sidebar-background)) 0%, hsl(220 25% 15%) 100%);
    backdrop-filter: blur(12px);
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 1.5rem;
    box-shadow: var(--shadow-elevated), var(--shadow-gold);
    overflow: hidden;
  }
  @media (min-width: 768px) {
    .sidebar-desktop {
      display: flex;
    }
  }
  .sidebar-desktop.collapsed {
    width: var(--sidebar-width-icon);
  }
  .sidebar-desktop.left {
    left: 1rem;
  }
  .sidebar-desktop.right {
    right: 1rem;
    border-right: none;
    border-left: 1px solid hsl(var(--sidebar-border));
  }
  .sidebar-desktop.left.collapsed {
    left: 1rem;
  }
  .sidebar-desktop.right.collapsed {
    right: 1rem;
  }

  /* Sidebar Content */
  .sidebar-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    position: relative;
  }
  
  /* Add gradient overlay at top and bottom */
  .sidebar-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2rem;
    background: linear-gradient(to bottom, hsl(var(--sidebar-background)), transparent);
    pointer-events: none;
    z-index: 1;
  }
  
  .sidebar-content::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2rem;
    background: linear-gradient(to top, hsl(var(--sidebar-background)), transparent);
    pointer-events: none;
    z-index: 1;
  }

  /* Mobile Drawer */
  .sidebar-mobile-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0,0,0,0.5);
    z-index: 40;
    backdrop-filter: blur(4px);
  }
  .sidebar-mobile-drawer {
    position: fixed;
    top: 1rem;
    bottom: 1rem;
    left: 0rem;
    right: 1rem;
    width: auto;
    background: hsl(var(--sidebar-background));
    background: linear-gradient(135deg, hsl(var(--sidebar-background)) 0%, hsl(220 25% 15%) 100%);
    backdrop-filter: blur(12px);
    border: 1px solid hsl(var(--sidebar-border));
    border-radius: 1.5rem;
    z-index: 50;
    display: flex;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform 0.3s var(--ease-smooth);
    box-shadow: var(--shadow-elevated), var(--shadow-gold);
    overflow: hidden;
  }
  .sidebar-mobile-drawer.open {
    transform: translateX(0);
  }
  .sidebar-mobile-header {
    display: flex;
    justify-content: flex-end;
    padding: 1rem;
    background: linear-gradient(to bottom, hsl(var(--sidebar-background)), transparent);
  }
  .sidebar-mobile-close {
    background: hsl(var(--sidebar-accent));
    border: none;
    cursor: pointer;
    color: hsl(var(--sidebar-foreground));
    padding: 0.5rem;
    border-radius: 0.75rem;
    transition: var(--transition-base);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sidebar-mobile-close:hover {
    background: hsl(var(--sidebar-primary));
    transform: scale(1.05);
  }

  /* Sidebar Inner Components */
  .sidebar-header,
  .sidebar-footer {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    position: relative;
    z-index: 2;
  }
  .sidebar-content-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
    position: relative;
    margin-right:4.2rem;
    z-index: 2;
  }
  .sidebar-group {
    position: relative;
    display: flex;
    width: 100%;
    flex-direction: column;
    padding: 0.5rem;
  }
  .sidebar-group-label {
    display: flex;
    height: 2rem;
    align-items: center;
    border-radius: 0.75rem;
    padding: 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(var(--sidebar-foreground));
    opacity: 0.7;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .collapsed .sidebar-group-label {
    margin-top: -2rem;
    opacity: 0;
  }
  .sidebar-menu {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .sidebar-menu-item {
    position: relative;
  }
  .sidebar-menu-button {
    position: relative;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    overflow: hidden;
    border-radius: 0.75rem;
    padding: 0.625rem 0.2rem;
    text-align: left;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--sidebar-foreground) / 0.7);
    transition: var(--transition-base);
  }
  .sidebar-menu-button:hover {
    background: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-foreground));
    transform: translateX(0.25rem);
  }
  .sidebar-menu-button.active {
    background: hsl(var(--sidebar-primary) / 0.15);
    color: hsl(var(--sidebar-primary));
    font-weight: 600;
    position: relative;
  }
  .sidebar-menu-button.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 1.5rem;
    background: hsl(var(--sidebar-primary));
    border-radius: 0 2px 2px 0;
  }
  .collapsed .sidebar-menu-button {
    justify-content: center;
    padding: 0.625rem;
  }
  .collapsed .sidebar-menu-button span:not(.icon-only) {
    display: none;
  }
  .sidebar-menu-icon {
    width: 1rem;
    height: 1rem;
    flex-shrink: 0;
    transition: var(--transition-base);
  }
  .sidebar-menu-button:hover .sidebar-menu-icon {
    transform: scale(1.1);
    color: hsl(var(--sidebar-primary));
  }
  .sidebar-menu-sub {
    margin-left: 0.875rem;
    padding-left: 0.625rem;
    border-left: 2px solid hsl(var(--sidebar-border));
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .collapsed .sidebar-menu-sub {
    display: none;
  }
  .sidebar-menu-sub-button {
    position: relative;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 0.75rem;
    overflow: hidden;
    border-radius: 0.75rem;
    padding: 0.5rem 1rem;
    text-align: left;
    font-size: 0.813rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: hsl(var(--sidebar-foreground) / 0.7);
    transition: var(--transition-base);
  }
  .sidebar-menu-sub-button:hover {
    background: hsl(var(--sidebar-accent));
    color: hsl(var(--sidebar-foreground));
    transform: translateX(0.25rem);
  }
  .sidebar-menu-sub-button.active {
    background: hsl(var(--sidebar-primary) / 0.15);
    color: hsl(var(--sidebar-primary));
    font-weight: 600;
  }
  .sidebar-separator {
    margin: 0.75rem 0;
    border: none;
    border-top: 1px solid hsl(var(--sidebar-border));
  }
  .sidebar-input {
    width: 100%;
    height: 2rem;
    padding: 0 0.75rem;
    border-radius: 0.75rem;
    border: 1px solid hsl(var(--sidebar-border));
    background: hsl(var(--sidebar-background) / 0.5);
    color: hsl(var(--sidebar-foreground));
    font-size: 0.875rem;
    transition: var(--transition-base);
  }
  .sidebar-input:focus {
    outline: none;
    border-color: hsl(var(--sidebar-ring));
    box-shadow: 0 0 0 2px hsl(var(--sidebar-ring) / 0.2);
  }
  .sidebar-input::placeholder {
    color: hsl(var(--sidebar-foreground) / 0.5);
  }
  .sidebar-skeleton {
    display: flex;
    height: 2rem;
    align-items: center;
    gap: 0.75rem;
    border-radius: 0.75rem;
    padding: 0 0.75rem;
  }
  .sidebar-skeleton-icon {
    width: 1rem;
    height: 1rem;
    border-radius: 0.375rem;
    background: hsl(var(--sidebar-accent));
    animation: pulse 1.5s ease-in-out infinite;
  }
  .sidebar-skeleton-text {
    height: 1rem;
    flex: 1;
    border-radius: 0.25rem;
    background: hsl(var(--sidebar-accent));
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Main Content Inset */
  .sidebar-main {
    flex: 1;
    transition: margin 0.2s var(--ease-smooth);
    background: hsl(var(--background));
  }
  @media (min-width: 768px) {
    .sidebar-main.left {
      margin-left: calc(var(--sidebar-width) + 1rem);
    }
    .sidebar-main.left.collapsed {
      margin-left: calc(var(--sidebar-width-icon) + 1rem);
    }
    .sidebar-main.right {
      margin-right: calc(var(--sidebar-width) + 1rem);
    }
    .sidebar-main.right.collapsed {
      margin-right: calc(var(--sidebar-width-icon) + 1rem);
    }
  }

  /* Rail */
  .sidebar-rail {
    position: absolute;
    inset-y: 0;
    z-index: 20;
    display: none;
    width: 1rem;
    transform: translateX(-50%);
    cursor: ew-resize;
    background: transparent;
    border: none;
  }
  @media (min-width: 768px) {
    .sidebar-rail {
      display: flex;
    }
  }
  .sidebar-rail.left {
    right: -0.5rem;
  }
  .sidebar-rail.right {
    left: -0.5rem;
  }
  .sidebar-rail::after {
    content: '';
    position: absolute;
    inset-y: 0;
    left: 50%;
    width: 2px;
    background: transparent;
    transition: background 0.2s;
    border-radius: 2px;
  }
  .sidebar-rail:hover::after {
    background: hsl(var(--sidebar-primary));
  }

  /* Scrollbar Styling */
  .sidebar-content-scroll::-webkit-scrollbar {
    width: 4px;
  }
  .sidebar-content-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-content-scroll::-webkit-scrollbar-thumb {
    background: hsl(var(--sidebar-border));
    border-radius: 4px;
  }
  .sidebar-content-scroll::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--sidebar-primary));
  }

  /* Custom badge/indicator */
  .sidebar-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.125rem 0.5rem;
    font-size: 0.625rem;
    font-weight: 600;
    border-radius: 9999px;
    background: hsl(var(--sidebar-primary));
    color: hsl(var(--sidebar-primary-foreground));
    margin-left: auto;
  }

  /* Utility Classes */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  .relative {
    position: relative;
  }
  .absolute {
    position: absolute;
  }
  .fixed {
    position: fixed;
  }
  .inset-0 {
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }
  .inset-y-0 {
    top: 0;
    bottom: 0;
  }
  .hidden {
    display: none;
  }
  .flex {
    display: flex;
  }
  .inline-flex {
    display: inline-flex;
  }
  .w-full {
    width: 100%;
  }
  .h-full {
    height: 100%;
  }
  .min-h-svh {
    min-height: 100vh;
  }
  .flex-col {
    flex-direction: column;
  }
  .items-center {
    align-items: center;
  }
  .justify-center {
    justify-content: center;
  }
  .justify-end {
    justify-content: flex-end;
  }
  .gap-1 {
    gap: 0.25rem;
  }
  .gap-2 {
    gap: 0.5rem;
  }
  .overflow-hidden {
    overflow: hidden;
  }
  .overflow-auto {
    overflow: auto;
  }
  .rounded-md {
    border-radius: 0.375rem;
  }
  .rounded-full {
    border-radius: 9999px;
  }
  .p-0 {
    padding: 0;
  }
  .p-2 {
    padding: 0.5rem;
  }
  .px-2 {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
  }
  .py-0\\.5 {
    padding-top: 0.125rem;
    padding-bottom: 0.125rem;
  }
  .text-left {
    text-align: left;
  }
  .text-xs {
    font-size: 0.75rem;
  }
  .text-sm {
    font-size: 0.875rem;
  }
  .font-medium {
    font-weight: 500;
  }
  .font-semibold {
    font-weight: 600;
  }
  .capitalize {
    text-transform: capitalize;
  }
  .transition-all {
    transition: all 0.2s;
  }
  .cursor-pointer {
    cursor: pointer;
  }
  .select-none {
    user-select: none;
  }
  .pointer-events-none {
    pointer-events: none;
  }
  .z-10 {
    z-index: 10;
  }
  .z-20 {
    z-index: 20;
  }
  .z-40 {
    z-index: 40;
  }
  .z-50 {
    z-index: 50;
  }
    .sidebar-menu-button,
.sidebar-menu-sub-button {
  text-decoration: none;
}
  /* ==================== Sidebar Header ==================== */
.sidebar-header {
  position: relative;
  padding: 1.25rem;
  background: linear-gradient(
    180deg,
    hsl(var(--sidebar-background) / 0.95) 0%,
    hsl(220 25% 16% / 0.92) 100%
  );
  border-bottom: 1px solid hsl(var(--sidebar-border));
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.sidebar-header::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 120px;
  height: 120px;
  background: radial-gradient(
    circle,
    hsl(var(--sidebar-primary) / 0.18) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.sidebar-header::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    transparent,
    hsl(255 255% 255% / 0.03),
    transparent
  );
  pointer-events: none;
}

/* ==================== Sidebar Footer ==================== */
.sidebar-footer {
  position: relative;
  padding: 1rem 1.25rem 1.25rem;
  background: linear-gradient(
    0deg,
    hsl(var(--sidebar-background)) 0%,
    hsl(220 25% 15% / 0.92) 100%
  );
  border-top: 1px solid hsl(var(--sidebar-border));
  backdrop-filter: blur(18px);
  overflow: hidden;
}

.sidebar-footer::before {
  content: '';
  position: absolute;
  bottom: -50px;
  left: -50px;
  width: 140px;
  height: 140px;
  background: radial-gradient(
    circle,
    hsl(var(--sidebar-primary) / 0.14) 0%,
    transparent 72%
  );
  pointer-events: none;
}

.sidebar-footer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 1rem;
  right: 1rem;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    hsl(var(--sidebar-primary) / 0.35),
    transparent
  );
}
`;

// Inject styles once
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = sidebarStyles;
  document.head.appendChild(style);
}

// ==================== Context ====================
const SidebarContext = createContext(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a SidebarProvider');
  return context;
}

// ==================== Helper ====================
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return isMobile;
}

// ==================== Provider ====================
export function SidebarProvider({ children, defaultOpen = true, open: controlledOpen, onOpenChange }) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = useCallback((value) => {
    const newOpen = typeof value === 'function' ? value(open) : value;
    if (onOpenChange) onOpenChange(newOpen);
    else setInternalOpen(newOpen);
    document.cookie = `sidebar:state=${newOpen}; path=/; max-age=604800`;
  }, [open, onOpenChange]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) setOpenMobile(prev => !prev);
    else setOpen(prev => !prev);
  }, [isMobile, setOpen]);

  // Keyboard shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';
  const value = useMemo(() => ({
    state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar
  }), [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]);

  return (
    <SidebarContext.Provider value={value}>
      <div className="sidebar-provider">
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

// ==================== Sidebar Component ====================
export function Sidebar({ side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className = '', children, ...props }) {
  const { isMobile, open, openMobile, setOpenMobile, state } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div className={`sidebar-desktop ${side}`} style={{ width: 'var(--sidebar-width)' }} {...props}>
        <div className="sidebar-content">{children}</div>
      </div>
    );
  }

  // Mobile drawer
  if (isMobile) {
    return (
      <>
        {openMobile && <div className="sidebar-mobile-overlay" onClick={() => setOpenMobile(false)} />}
        <div className={`sidebar-mobile-drawer ${openMobile ? 'open' : ''}`}>
          <div className="sidebar-mobile-header">
            <button className="sidebar-mobile-close" onClick={() => setOpenMobile(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="sidebar-content-scroll">{children}</div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  const isCollapsed = state === 'collapsed';
  return (
    <div className={`sidebar-desktop ${side} ${isCollapsed ? 'collapsed' : ''} ${className}`} {...props}>
      <div className="sidebar-content">{children}</div>
    </div>
  );
}

// ==================== SidebarTrigger ====================
export function SidebarTrigger({ className = '', onClick, ...props }) {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      className={`sidebar-trigger-btn ${className}`}
      onClick={(e) => { onClick?.(e); toggleSidebar(); }}
      {...props}
    >
      <PanelLeft size={16} />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

// ==================== SidebarInset ====================
export function SidebarInset({ className = '', children, ...props }) {
  const context = useContext(SidebarContext);
  if (!context) {
    return <main className={`sidebar-main ${className}`} {...props}>{children}</main>;
  }
  const { side = 'left', state = 'expanded' } = context;
  const collapsedClass = state === 'collapsed' ? 'collapsed' : '';
  return (
    <main className={`sidebar-main ${side} ${collapsedClass} ${className}`} {...props}>
      {children}
    </main>
  );
}

// ==================== SidebarRail ====================
export function SidebarRail({ className = '', ...props }) {
  const { toggleSidebar, side = 'left' } = useSidebar();
  return (
    <button
      className={`sidebar-rail ${side} ${className}`}
      onClick={toggleSidebar}
      {...props}
    />
  );
}

// ==================== Other Sidebar subcomponents ====================
export function SidebarHeader({ className = '', ...props }) {
  return <div className={`sidebar-header ${className}`} {...props} />;
}

export function SidebarFooter({ className = '', ...props }) {
  return <div className={`sidebar-footer ${className}`} {...props} />;
}

export function SidebarContent({ className = '', ...props }) {
  return <div className={`sidebar-content-scroll ${className}`} {...props} />;
}

export function SidebarGroup({ className = '', ...props }) {
  return <div className={`sidebar-group ${className}`} {...props} />;
}

export function SidebarGroupLabel({ className = '', ...props }) {
  return <div className={`sidebar-group-label ${className}`} {...props} />;
}

export function SidebarGroupContent({ className = '', ...props }) {
  return <div className={className} {...props} />;
}

export function SidebarMenu({ className = '', ...props }) {
  return <ul className={`sidebar-menu ${className}`} {...props} />;
}

export function SidebarMenuItem({ className = '', ...props }) {
  return <li className={`sidebar-menu-item ${className}`} {...props} />;
}

export function SidebarMenuButton({ isActive = false, className = '', children, ...props }) {
  return (
    <button className={`sidebar-menu-button ${isActive ? 'active' : ''} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function SidebarMenuSub({ className = '', ...props }) {
  return <ul className={`sidebar-menu-sub ${className}`} {...props} />;
}

export function SidebarMenuSubItem({ className = '', ...props }) {
  return <li className={className} {...props} />;
}

export function SidebarMenuSubButton({ isActive = false, className = '', ...props }) {
  return <button className={`sidebar-menu-sub-button ${isActive ? 'active' : ''} ${className}`} {...props} />;
}

export function SidebarSeparator({ className = '', ...props }) {
  return <hr className={`sidebar-separator ${className}`} {...props} />;
}

export function SidebarInput({ className = '', ...props }) {
  return <input className={`sidebar-input ${className}`} {...props} />;
}

export function SidebarMenuSkeleton({ showIcon = false, className = '', ...props }) {
  return (
    <div className={`sidebar-skeleton ${className}`} {...props}>
      {showIcon && <div className="sidebar-skeleton-icon" />}
      <div className="sidebar-skeleton-text" />
    </div>
  );
}

// Placeholders for other exports
export const SidebarMenuAction = (props) => <button {...props} />;
export const SidebarMenuBadge = (props) => <span {...props} />;
export const SidebarGroupAction = (props) => <button {...props} />;