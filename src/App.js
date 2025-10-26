import * as serviceWorker from './serviceWorker';
import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link, 
  useLocation, 
  useParams,
  useNavigate 
} from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import './App.css';

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Context para el tema
const ThemeContext = createContext();

// Hook personalizado para navegación con transiciones
const useNavigation = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const navigateWithTransition = (to, options = {}) => {
    const { message, type = 'info', ...navOptions } = options;
    
    // Si hay mensaje, mostrar toast
    if (message) {
      addToast(message, type);
    }
    
    // Navegar después de un pequeño delay para la transición
    setTimeout(() => {
      navigate(to, navOptions);
    }, 150);
  };

  return { navigateWithTransition };
};

// Hook personalizado para usar el tema
const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de ThemeProvider');
  }
  return context;
};

// Proveedor del tema
const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('padel-theme');
    return savedTheme || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('padel-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Sistema de Toast Context
const ToastContext = createContext();

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now();
    const toast = { id, message, type, duration };
    setToasts(prev => [...prev, toast]);
    
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`toast-item ${toast.type}`}
            style={{
              background: toast.type === 'success' ? 'var(--success)' : 
                         toast.type === 'error' ? 'var(--error)' : 
                         toast.type === 'warning' ? 'var(--warning)' : 'var(--info)',
              color: 'white',
              padding: '12px 20px',
              borderRadius: 'var(--border-radius)',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              minWidth: '250px',
              maxWidth: '400px',
              animation: 'fadeInUp 0.3s ease-out'
            }}
          >
            <span style={{ fontSize: '18px' }}>
              {toast.type === 'success' ? '✓' : 
               toast.type === 'error' ? '✕' : 
               toast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span style={{ flex: 1, fontSize: '14px' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                opacity: 0.7,
                padding: '0',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe ser usado dentro de ToastProvider');
  }
  return context;
};

// Iconos SVG como componentes React
const Icon = ({ name, size = 20, color = 'currentColor', className = '' }) => {
  const icons = {
home: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Casa completa con espacio para puerta en la base */}
    <path d="M3 9l9-7 9 7v2M3 9v11M21 9v11M3 20h6M15 20h6" stroke={color} strokeWidth="2" fill="none"/>
    
    {/* Puerta */}
    <path d="M9 12v8M15 12v8M9 12h6" stroke={color} strokeWidth="2" fill="none"/>
  </svg>
),
    tournament: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cancha aún más grande - casi tocando los bordes */}
      <rect x="2" y="4" width="20" height="16" rx="1.5" stroke={color} strokeWidth="2.5"/>
    
      {/* Línea central vertical */}
      <line x1="12" y1="4" x2="12" y2="20" stroke={color} strokeWidth="1" strokeDasharray="1,1"/>
    
      {/* Línea horizontal que no llega a los extremos */}
      <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="1"/>
    
      {/* Marcas de servicio completas */}
      <line x1="5.5" y1="4" x2="5.5" y2="20" stroke={color} strokeWidth="1"/>
      <line x1="18.5" y1="4" x2="18.5" y2="20" stroke={color} strokeWidth="1"/>
      </svg>
    ),
    club: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    profile: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    add: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <path d="M12 8v8M8 12h8" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    stats: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="18" y1="20" x2="18" y2="10" stroke={color} strokeWidth="2"/>
        <line x1="12" y1="20" x2="12" y2="4" stroke={color} strokeWidth="2"/>
        <line x1="6" y1="20" x2="6" y2="14" stroke={color} strokeWidth="2"/>
      </svg>
    ),
trophy: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Copa principal con forma más trofeo */}
    <path d="M8 4H16V11C16 13.2091 14.2091 15 12 15C9.79086 15 8 13.2091 8 11V4Z" 
          stroke={color} strokeWidth="2"/>
    
    {/* Base más prominente */}
    <rect x="6" y="15" width="12" height="2" fill={color}/>
    <rect x="8" y="17" width="8" height="3" fill={color}/>
    
    {/* Asas curvas y elegantes */}
    <path d="M7 7C5 6 4 7 4 9" 
          stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M17 7C19 6 20 7 20 9" 
          stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
  </svg>
),



starCircle: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2"/>
    <path d="M12 6.5l1.4 4.2 4.2.5-3.2 2.8 1 4.2-3.6-2.5-3.6 2.5 1-4.2-3.2-2.8 4.2-.5z" 
          stroke={color} strokeWidth="1.5" fill="none"/>
  </svg>
),



summary: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Cuadrado exterior */}
    <rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="2"/>
    
    {/* Tres líneas horizontales equidistantes */}
    <line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="12" x2="16" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="15" x2="16" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
  </svg>
),

    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke={color} strokeWidth="2"/>
        <polyline points="16 17 21 12 16 7" stroke={color} strokeWidth="2"/>
        <line x1="21" y1="12" x2="9" y2="12" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    edit: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    lock: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2"/>
        <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polygon points="5,3 19,12 5,21" stroke={color} strokeWidth="2" fill={color}/>
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
        <polyline points="12 6 12 12 16 14" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2"/>
        <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    delete: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <polyline points="3,6 5,6 21,6" stroke={color} strokeWidth="2"/>
        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6" stroke={color} strokeWidth="2"/>
        <line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth="2"/>
        <line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth="2"/>
      </svg>
    ),
    target: (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2"/>
    <circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2"/>
    </svg>
    ),    
padel: (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
    <path d="M2 12C2 7 7 2 12 2C17 2 22 7 22 12C22 17 17 22 12 22C7 22 2 17 2 12Z" stroke={color} strokeWidth="1.5"/>
    <path d="M6 4C9 8 9 16 6 20M18 4C15 8 15 16 18 20" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
),



};

  return icons[name] || null;
};

// Nuevo sistema de estilos con la paleta de colores proporcionada
const themeStyles = `
  :root {
    /* Colores principales - Consistentes con Profile */
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --primary-light: #818cf8;
    --secondary: #10b981;
    --secondary-dark: #059669;
    --accent: #f59e0b;
    --accent-dark: #d97706;
    
    /* Escala de grises moderna y neutral */
    --white: #ffffff;
    --gray-50: #fafafa;
    --gray-100: #f4f4f5;
    --gray-200: #e4e4e7;
    --gray-300: #d4d4d8;
    --gray-400: #a1a1aa;
    --gray-500: #71717a;
    --gray-600: #52525b;
    --gray-700: #3f3f46;
    --gray-800: #27272a;
    --gray-900: #18181b;
    --gray-950: #09090b;
    
    /* Colores semánticos */
    --success: #10b981;
    --warning: #f59e0b;
    --error: #ef4444;
    --info: #3b82f6;
    
    /* Variables de diseño */
    --border-radius: 12px;
    --border-radius-lg: 16px;
    --border-radius-xl: 20px;
    --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Tema Claro - Gradientes sutiles en grises */
  [data-theme="light"] {
    --bg-primary: var(--white);
    --bg-secondary: var(--gray-50);
    --bg-tertiary: var(--gray-100);
    --bg-gradient: linear-gradient(135deg, var(--gray-50) 0%, var(--gray-100) 100%);
    --bg-gradient-card: linear-gradient(135deg, var(--white) 0%, var(--gray-50) 100%);
    --bg-glass: rgba(255, 255, 255, 0.92);
    --bg-overlay: rgba(248, 250, 252, 0.8);
    --text-primary: var(--gray-900);
    --text-secondary: var(--gray-700);
    --text-tertiary: var(--gray-600);
    --text-muted: var(--gray-500);
    --border-color: var(--gray-200);
    --border-color-strong: var(--gray-300);
    --card-bg: var(--white);
    --nav-bg: rgba(255, 255, 255, 0.98);
    --nav-border: var(--gray-200);
    --overlay: rgba(0, 0, 0, 0.05);
    
    /* Colores específicos para equipos */
    --team1-bg: linear-gradient(135deg, #fef2f2, #fee2e2);
    --team1-border: #fecaca;
    --team1-text: #dc2626;
    --team2-bg: linear-gradient(135deg, #eff6ff, #dbeafe);
    --team2-border: #bfdbfe;
    --team2-text: #1d4ed8;
    --waiting-bg: linear-gradient(135deg, #fffbeb, #fed7aa);
    --waiting-border: #fdba74;
    --waiting-text: #d97706;
  }

  /* Tema Oscuro - Gradientes en grises oscuros */
  [data-theme="dark"] {
    --bg-primary: var(--gray-900);
    --bg-secondary: var(--gray-800);
    --bg-tertiary: var(--gray-700);
    --bg-gradient: linear-gradient(135deg, var(--gray-900) 0%, var(--gray-800) 100%);
    --bg-gradient-card: linear-gradient(135deg, var(--gray-800) 0%, var(--gray-900) 100%);
    --bg-glass: rgba(39, 39, 42, 0.92);
    --bg-overlay: rgba(24, 24, 27, 0.8);
    --text-primary: var(--gray-50);
    --text-secondary: var(--gray-200);
    --text-tertiary: var(--gray-300);
    --text-muted: var(--gray-400);
    --border-color: var(--gray-700);
    --border-color-strong: var(--gray-600);
    --card-bg: var(--gray-800);
    --nav-bg: rgba(39, 39, 42, 0.98);
    --nav-border: var(--gray-700);
    --overlay: rgba(0, 0, 0, 0.3);
    
    /* Colores específicos para equipos - versión oscura */
    --team1-bg: linear-gradient(135deg, var(--gray-700), var(--gray-600));
    --team1-border: var(--gray-500);
    --team1-text: var(--gray-200);
    --team2-bg: linear-gradient(135deg, var(--gray-700), var(--gray-600));
    --team2-border: var(--gray-500);
    --team2-text: var(--gray-200);
    --waiting-bg: linear-gradient(135deg, var(--gray-700), var(--gray-600));
    --waiting-border: var(--gray-500);
    --waiting-text: var(--gray-200);
  }

  /* Reset y estilos base */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  }

  body {
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg-gradient);
    min-height: 100vh;
    color: var(--text-primary);
    line-height: 1.6;
    font-weight: 400;
  }

  .app-container {
    min-height: '100vh';
    background: var(--bg-gradient);
  }

  /* Componentes de diseño */
  .glass-card {
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
    border-radius: var(--border-radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
  }

  .card {
    background: var(--card-bg);
    border-radius: var(--border-radius-lg);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow);
    transition: var(--transition);
  }

  .card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }

  .btn {
    border: none;
    padding: 12px 24px;
    border-radius: var(--border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: var(--white);
    box-shadow: var(--shadow);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    background: linear-gradient(135deg, var(--primary-light), var(--primary));
  }

  .btn-secondary {
    background: linear-gradient(135deg, var(--secondary), var(--secondary-dark));
    color: var(--white);
    box-shadow: var(--shadow);
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .btn-outline {
    background: transparent;
    color: var(--text-primary);
    border: 2px solid var(--border-color-strong);
  }

  .btn-outline:hover {
    border-color: var(--primary);
    color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
  }

  /* Tipografía mejorada */
  h1, h2, h3, h4, h5, h6 {
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 0.5em;
  }

  h1 { font-size: 2.5rem; }
  h2 { font-size: 2rem; }
  h3 { font-size: 1.75rem; }
  h4 { font-size: 1.5rem; }
  h5 { font-size: 1.25rem; }
  h6 { font-size: 1rem; }

  .text-lg { font-size: 1.125rem; }
  .text-base { font-size: 1rem; }
  .text-sm { font-size: 0.875rem; }
  .text-xs { font-size: 0.75rem; }

  /* Animaciones mejoradas */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.9);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes bounceIn {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.95);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-fadeInUp {
    animation: fadeInUp 0.6s ease-out;
  }

  .animate-slideInLeft {
    animation: slideInLeft 0.5s ease-out;
  }

  .animate-scaleIn {
    animation: scaleIn 0.4s ease-out;
  }

  .animate-bounceIn {
    animation: bounceIn 0.8s ease-out;
  }

  /* Estados de hover mejorados */
  .hover-lift {
    transition: var(--transition);
  }

  .hover-lift:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl);
  }

  .hover-glow:hover {
    box-shadow: 0 0 25px rgba(99, 102, 241, 0.15);
  }

  /* Utilidades de diseño */
  .text-gradient {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .border-gradient {
    border: 2px solid transparent;
    background: linear-gradient(var(--card-bg), var(--card-bg)) padding-box,
                linear-gradient(135deg, var(--primary), var(--secondary)) border-box;
  }

  /* Estados de carga */
  .skeleton {
    background: linear-gradient(90deg, var(--border-color) 25%, var(--bg-secondary) 50%, var(--border-color) 75%);
    background-size: 200% 100%;
    animation: loading 1.5s infinite;
    border-radius: var(--border-radius);
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  const { state } = useApp();
  
  if (!state.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* SOLO BARRA INFERIOR - SIN HEADER SUPERIOR */}
      <Navigation />
      <div style={{ 
        flex: 1,
        paddingBottom: '100px', // Solo espacio para barra inferior
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
}

// Componente de Login - ACTUALIZADO CON NUEVO DISEÑO
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const { actions, state } = useApp();
  const { addToast } = useToast();

  useEffect(() => {
    setFormErrors({});
  }, [isLogin, email, password, registerData]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const userContext = {
        id: user.uid,
        name: user.displayName || userData.name || 'Usuario',
        email: user.email,
        avatar: userData.avatar || '👤',
        profilePicture: userData.profilePicture || null,
        activeClub: userData.activeClub || null,
        stats: userData.stats || {
          totalMatches: 0,
          totalWins: 0,
          winRate: 0,
          avgPointsPerMatch: 0
        }
      };

      actions.login(userContext);
      addToast(`Bienvenido de nuevo, ${userContext.name}`, 'success');

    } catch (error) {
      console.error('Error en login:', error);
      
      let errorMessage = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No existe una cuenta con este email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email no válido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde';
          break;
        default:
          errorMessage = 'Error al iniciar sesión';
      }

      const loginForm = e.target;
      loginForm.classList.add('animate-shake');
      setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
      
      setFormErrors({ general: errorMessage });
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const validateRegisterForm = () => {
    const errors = {};

    if (!registerData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }

    if (!registerData.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(registerData.email)) {
      errors.email = 'Email no válido';
    }

    if (!registerData.password) {
      errors.password = 'La contraseña es requerida';
    } else if (registerData.password.length < 6) {
      errors.password = 'Mínimo 6 caracteres';
    }

    if (!registerData.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (registerData.password !== registerData.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    return errors;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const errors = validateRegisterForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Por favor corrige los errores del formulario', 'warning');
      setIsLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        registerData.email, 
        registerData.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: registerData.name
      });

      const userData = {
        name: registerData.name,
        email: registerData.email,
        avatar: '👤',
        profilePicture: null,
        activeClub: null,
        stats: {
          totalMatches: 0,
          totalWins: 0,
          winRate: 0,
          avgPointsPerMatch: 0
        },
        achievements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      const userContext = {
        id: user.uid,
        ...userData
      };

      actions.login(userContext);
      addToast(`Cuenta creada exitosamente, ${registerData.name}`, 'success');

      setRegisterData({ name: '', email: '', password: '', confirmPassword: '' });
      setFormErrors({});

    } catch (error) {
      console.error('Error en registro:', error);
      
      let errorMessage = 'Error al crear la cuenta';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email no válido';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Operación no permitida';
          break;
        default:
          errorMessage = 'Error al crear la cuenta';
      }

      setFormErrors({ general: errorMessage });
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (state.isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="app-container" style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'var(--bg-gradient)'
    }}>
      <div className="glass-card animate-scaleIn hover-lift" style={{ 
        width: '100%', 
        maxWidth: '440px',
        padding: '40px',
        animation: 'scaleIn 0.6s ease-out',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Efecto de fondo animado */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(45deg, transparent 30%, rgba(99, 102, 241, 0.1) 50%, transparent 70%)',
          animation: 'shimmer 3s infinite linear',
          pointerEvents: 'none'
        }}></div>

        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          }
        `}</style>

        {/* Header */}
        <div className="animate-fadeInUp" style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div className="animate-bounceIn" style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            borderRadius: '20px',
            margin: '0 auto 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-lg)',
            animation: 'bounceIn 0.8s ease-out'
          }}>
            <Icon name="padel" size={55} color="white" />
          </div>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Padel Pro
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '16px' 
          }}>
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}
          </p>
        </div>

{/* Pestañas Login/Registro */}
<div className="animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
  <div style={{ 
    display: 'flex', 
    marginBottom: '30px',
    background: 'var(--bg-secondary)',
    borderRadius: 'var(--border-radius)',
    padding: '4px',
    position: 'relative'
  }} className="hover-lift">
    <button
      onClick={() => setIsLogin(true)}
      style={{
        flex: 1,
        padding: '14px',
        border: 'none',
        background: isLogin ? 'var(--primary)' : 'transparent',
        color: isLogin ? 'white' : 'var(--text-secondary)',
        borderRadius: 'var(--border-radius)',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'var(--transition)',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      disabled={isLoading}
    >
      {isLoading && isLogin ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Cargando...
        </div>
      ) : (
        <>
          <Icon name="lock" size={16} color={isLogin ? 'white' : 'currentColor'} style={{ marginRight: '4px' }} />
          Iniciar Sesión
        </>
      )}
    </button>
    <button
      onClick={() => setIsLogin(false)}
      style={{
        flex: 1,
        padding: '12px',
        border: 'none',
        background: !isLogin ? 'var(--primary)' : 'transparent',
        color: !isLogin ? 'white' : 'var(--text-secondary)',
        borderRadius: 'var(--border-radius)',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'var(--transition)',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px'
      }}
      disabled={isLoading}
    >
      {isLoading && !isLogin ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Cargando...
        </div>
      ) : (
        <>
          <Icon name="add" size={16} color={!isLogin ? 'white' : 'currentColor'} style={{ marginRight: '4px' }} />
          Registrarse
        </>
      )}
    </button>
  </div>
</div>


        {/* Mensaje de error general */}
        {formErrors.general && (
          <div className="animate-shake" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            padding: '12px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <Icon name="close" size={16} color="var(--error)" />
            {formErrors.general}
          </div>
        )}

        {isLogin ? (
          // FORMULARIO DE LOGIN
          <form onSubmit={handleLogin} className="animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Email
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.general ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Contraseña
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.general ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
            </div>

<button 
  type="submit"
  style={{ 
    width: '100%',
    padding: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: 'white',
    borderRadius: 'var(--border-radius)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow)',
    fontSize: '16px'
  }}
  onMouseOver={(e) => {
    e.target.style.transform = 'translateY(-2px)';
    e.target.style.boxShadow = 'var(--shadow-lg)';
  }}
  onMouseOut={(e) => {
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'var(--shadow)';
  }}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <span style={{ opacity: 0 }}>Iniciar Sesión</span>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        Procesando...
      </div>
    </>
  ) : (
    <>
      <Icon name="lock" size={18} color="white" />
      Iniciar Sesión
    </>
  )}
</button>          </form>
        ) : (
          // FORMULARIO DE REGISTRO
          <form onSubmit={handleRegister} className="animate-stagger">
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Nombre
              </label>
              <input 
                type="text" 
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                placeholder="Tu nombre"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.name ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.name && (
                <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="close" size={12} color="var(--error)" />
                  {formErrors.name}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Email
              </label>
              <input 
                type="email" 
                value={registerData.email}
                onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                placeholder="tu@email.com"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.email ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.email && (
                <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="close" size={12} color="var(--error)" />
                  {formErrors.email}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Contraseña
              </label>
              <input 
                type="password" 
                value={registerData.password}
                onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                placeholder="••••••••"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.password ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.password ? (
                <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="close" size={12} color="var(--error)" />
                  {formErrors.password}
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Mínimo 6 caracteres
                </p>
              )}
            </div>

            <div style={{ marginBottom: '30px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                Confirmar Contraseña
              </label>
              <input 
                type="password" 
                value={registerData.confirmPassword}
                onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                placeholder="••••••••"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.confirmPassword ? 'var(--error)' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.confirmPassword && (
                <p style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Icon name="close" size={12} color="var(--error)" />
                  {formErrors.confirmPassword}
                </p>
              )}
            </div>

<button 
  type="submit"
  style={{ 
    width: '100%',
    padding: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: 'white',
    borderRadius: 'var(--border-radius)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow)',
    fontSize: '16px',
    position: 'relative',
    overflow: 'hidden'
  }}
  onMouseOver={(e) => {
    e.target.style.transform = 'translateY(-2px)';
    e.target.style.boxShadow = 'var(--shadow-lg)';
  }}
  onMouseOut={(e) => {
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'var(--shadow)';
  }}
  disabled={isLoading}
>
  {isLoading ? (
    <>
      <span style={{ opacity: 0 }}>Crear Cuenta</span>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        Creando cuenta...
      </div>
    </>
  ) : (
    <>
      <Icon name="add" size={18} color="white" />
      Crear Cuenta
    </>
  )}
</button>          </form>
        )}

        {/* Información adicional */}
        <div className="animate-fadeInUp" style={{ 
          textAlign: 'center', 
          marginTop: '30px', 
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          animationDelay: '0.3s'
        }}>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {isLogin 
              ? '¿No tienes cuenta? ' 
              : '¿Ya tienes cuenta? '
            }
            <button
              onClick={() => setIsLogin(!isLogin)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: '600',
                cursor: 'pointer',
                textDecoration: 'underline',
                transition: 'var(--transition)'
              }}
              onMouseOver={(e) => e.target.style.color = 'var(--primary-dark)'}
              onMouseOut={(e) => e.target.style.color = 'var(--primary)'}
              disabled={isLoading}
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
            </button>
          </p>
        </div>

        {/* Animación de spinner */}
        <style>{`
          @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

// Componente de Navegación - SOLO BARRA INFERIOR
// Componente de Navegación - SOLO BARRA INFERIOR CORREGIDA
function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const { addToast } = useToast();

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: 'home' },
    { path: '/tournaments', label: 'Torneos', icon: 'tournament' },
    { path: '/clubs', label: 'Clubes', icon: 'club' },
    { path: '/profile', label: 'Perfil', icon: 'profile' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  // Función simplificada para crear torneo - redirige a la página de torneos
  const handleCreateTournament = () => {
    navigate('/tournaments');
    addToast('Redirigiendo a creación de torneos', 'info');
  };

  return (
    <>
      <style>{`
        /* BARRA DE NAVEGACIÓN INFERIOR - ÚNICA BARRA VISIBLE */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--nav-border);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 12px 0;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
          height: 80px;
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border: none;
          background: none;
          cursor: pointer;
          transition: var(--transition);
          border-radius: var(--border-radius);
          min-width: 70px;
          position: relative;
          flex: 1;
          margin: 0 4px;
        }

        .nav-item.active {
          background: rgba(99, 101, 241, 0);
          transform: translateY(-2px);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          top: -10px;
          width: 24px;
          height: 3px;
          background: var(--primary);
          border-radius: 2px;
        }

        .nav-icon {
          margin-bottom: 4px;
          transition: var(--transition);
        }

        .nav-item.active .nav-icon {
          transform: scale(1.1);
        }

        .nav-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: var(--transition);
        }

        .nav-item.active .nav-label {
          color: var(--primary);
          font-weight: 700;
        }

        .nav-item:hover {
          background: rgba(99, 102, 241, 0.1);
          transform: translateY(-1px);
        }

        /* HEADER SUPERIOR SOLO PARA TORNEOS */
        .top-header {
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--nav-border);
          padding: 12px 16px;
          position: sticky;
          top: 0;
          z-index: 999;
          height: 60px;
          display: flex;
          align-items: center;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 18px;
          cursor: pointer;
        }

        .logo-icon {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          padding: 8px;
          border-radius: 10px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
        }

        .create-tournament-btn {
          background: linear-gradient(135deg, var(--secondary), var(--secondary-dark));
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: var(--border-radius);
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          box-shadow: var(--shadow);
        }

        .create-tournament-btn:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .bottom-nav {
            height: 85px;
            padding: 14px 0;
          }
          
          .nav-item {
            padding: 12px 10px;
            min-width: 65px;
          }
          
          .nav-label {
            font-size: 13px;
          }

          .top-header {
            padding: 10px 12px;
            height: 56px;
          }
          
          .logo-text {
            display: none;
          }
          
          .logo-icon {
            width: 32px;
            height: 32px;
          }
          
          .create-tournament-btn {
            padding: 8px 12px;
            font-size: 13px;
          }
        }
      `}</style>

      {/* Header Superior SOLO visible en página de torneos */}
      {location.pathname === '/tournaments' && (
        <div className="top-header">
          <div className="header-content">
            <div 
              onClick={() => handleNavigation('/dashboard')}
              className="logo-container"
            >
              <div className="logo-icon">
                <Icon name="padel" size={20} color="white" />
              </div>
              <span className="logo-text">Padel Pro</span>
            </div>
            
            <button 
              onClick={handleCreateTournament}
              className="create-tournament-btn"
            >
              <Icon name="add" size={16} color="white" />
              Crear Torneo
            </button>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior - SIEMPRE visible */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/');
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <Icon 
                  name={item.icon} 
                  size={28} 
                  color={isActive ? 'var(--primary)' : 'var(--text-secondary)'} 
                />
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}


// Componentes placeholder para las demás rutas
// Componente de Dashboard - VERSIÓN COMPLETA Y FUNCIONAL
function Dashboard() {
  const { state, getters } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const { addToast } = useToast();
  const { navigateWithTransition } = useNavigation();
  
  const userStats = getters.getUserStats();
  const activeTournaments = getters.getActiveTournaments();
  const activeClub = getters.getActiveClub();

  // Simular carga de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
        setTimeout(() => setContentLoaded(true), 100);
      } catch (error) {
        setIsLoading(false);
        addToast('Error cargando el dashboard', 'error');
      }
    };

    loadData();
  }, [addToast]);

  // Obtener partidos recientes del usuario
  const getRecentMatches = () => {
    const matches = [];
    const userTournaments = getters.getTournamentsByClub();
    
    userTournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1.includes(state.currentUser?.id) || match.team2.includes(state.currentUser?.id))) {
          matches.push({
            ...match,
            tournamentName: tournament.name,
            date: match.createdAt
          });
        }
      });
    });

    return matches
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  };

  // Calcular estadísticas globales mejoradas
  const calculateEnhancedStats = () => {
    if (!userStats) return null;

    const userTournaments = getters.getTournamentsByClub();
    let totalMatches = 0;
    let totalWins = 0;
    let totalPoints = 0;

    userTournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1.includes(state.currentUser?.id) || match.team2.includes(state.currentUser?.id))) {
          totalMatches++;
          
          const userTeam = match.team1.includes(state.currentUser?.id) ? 'team1' : 'team2';
          const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
          const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
          
          totalPoints += userScore;
          if (userScore > opponentScore) {
            totalWins++;
          }
        }
      });
    });

    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
    const avgPointsPerMatch = totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : 0;

    return {
      totalMatches,
      totalWins,
      totalLosses: totalMatches - totalWins,
      winRate: Math.round(winRate),
      avgPointsPerMatch,
      clubsCount: getters.getUserClubs().length,
      tournamentsCount: userTournaments.length,
      activeTournamentsCount: activeTournaments.filter(t => 
        t.players.includes(state.currentUser?.id) || 
        t.guestPlayers.some(guest => guest.includes(state.currentUser?.name))
      ).length
    };
  };

  // Calcular ranking de miembros del club
  const calculateClubRanking = () => {
    if (!activeClub) return [];
    
    const memberStats = [];
    
    activeClub.members.forEach(memberId => {
      const member = state.users.find(user => user.id === memberId);
      if (!member) return;
      
      let totalMatches = 0;
      let totalPoints = 0;
      let totalWins = 0;
      
      activeTournaments.forEach(tournament => {
        tournament.matches.forEach(match => {
          if (match.status === 'completed' && 
              (match.team1.includes(memberId) || match.team2.includes(memberId))) {
            totalMatches++;
            
            const userTeam = match.team1.includes(memberId) ? 'team1' : 'team2';
            const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
            const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
            
            totalPoints += userScore;
            if (userScore > opponentScore) {
              totalWins++;
            }
          }
        });
      });
      
      const avgPointsPerMatch = totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : 0;
      const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
      
      memberStats.push({
        id: memberId,
        name: member.name,
        avatar: member.avatar,
        profilePicture: member.profilePicture,
        totalMatches,
        totalPoints,
        totalWins,
        avgPointsPerMatch: parseFloat(avgPointsPerMatch),
        winRate: Math.round(winRate),
        isCurrentUser: memberId === state.currentUser?.id
      });
    });
    
    return memberStats
      .sort((a, b) => {
        if (b.avgPointsPerMatch !== a.avgPointsPerMatch) {
          return b.avgPointsPerMatch - a.avgPointsPerMatch;
        }
        return b.winRate - a.winRate;
      })
      .slice(0, 3);
  };

  const enhancedStats = calculateEnhancedStats();
  const recentMatches = getRecentMatches();
  const topRanking = calculateClubRanking();

  // Componente de Skeleton Loading
  const DashboardSkeleton = () => (
    <div style={{ 
      minHeight: 'calc(100vh - 140px)',
      background: 'var(--bg-gradient)',
      padding: '20px',
      paddingTop: '10px',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        .skeleton-pulse {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      
      <div className="dashboard-container">
        {/* Skeleton Header */}
        <div style={{ marginBottom: '30px', width: '100%' }}>
          <div className="skeleton skeleton-pulse" style={{
            height: '40px',
            width: '300px',
            marginBottom: '12px',
            borderRadius: 'var(--border-radius)'
          }}></div>
          <div className="skeleton skeleton-pulse" style={{
            height: '20px',
            width: '70%',
            borderRadius: 'var(--border-radius)'
          }}></div>
        </div>

        {/* Skeleton Grid */}
        <div className="dashboard-grid" style={{ 
          display: 'grid', 
          gap: '24px', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          width: '100%'
        }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card" style={{ padding: '20px', width: '100%' }}>
              <div className="skeleton skeleton-pulse" style={{
                height: '20px',
                width: '140px',
                marginBottom: '20px',
                borderRadius: 'var(--border-radius)'
              }}></div>
              <div className="skeleton skeleton-pulse" style={{
                height: '60px',
                marginBottom: '15px',
                borderRadius: 'var(--border-radius)'
              }}></div>
              <div className="skeleton skeleton-pulse" style={{
                height: '15px',
                width: '80%',
                borderRadius: 'var(--border-radius)'
              }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '20px',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }
        
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          width: 100%;
        }
        
        .dashboard-card {
          width: 100%;
          margin-bottom: 0;
        }
        
        .club-card {
          grid-column: span 2;
        }
        
        .ranking-card {
          grid-column: span 1;
        }
        
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          
          .club-card {
            grid-column: span 1;
          }
        }
      `}</style>
      
      <div className="dashboard-container">
        {/* Header del Dashboard */}
        <div className={`animate-fadeInUp ${contentLoaded ? 'animate-fadeInUp' : ''}`} style={{ 
          marginBottom: '30px',
          width: '100%'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <Icon name="home" size={28} color="var(--primary)" />
            Mi Dashboard
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)',
            fontSize: '16px',
            lineHeight: '1.4'
          }}>
            {activeClub 
              ? `Club activo: ${activeClub.name} • ${activeClub.members?.length || 0} miembros • ${activeTournaments.length} torneos activos`
              : 'Selecciona un club activo para empezar'
            }
          </p>
        </div>

        {/* Grid Principal */}
        <div className={`dashboard-grid animate-stagger ${contentLoaded ? 'animate-stagger' : ''}`}>
          
          {/* 1. MIS ESTADÍSTICAS */}
          {enhancedStats && (
            <div className="glass-card dashboard-card hover-lift" style={{ 
              padding: '24px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.1s'
            }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '20px',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Icon name="stats" size={20} color="var(--primary)" />
                Mis Estadísticas
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '16px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.2s',
                  borderLeft: '4px solid var(--primary)'
                }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: 'var(--primary)',
                    marginBottom: '6px'
                  }}>
                    {enhancedStats.totalMatches}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Partidos Totales
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '16px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.3s',
                  borderLeft: '4px solid var(--secondary)'
                }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: 'var(--secondary)',
                    marginBottom: '6px'
                  }}>
                    {enhancedStats.winRate}%
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Tasa de Victorias
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '16px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.4s',
                  borderLeft: '4px solid var(--accent)'
                }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: 'var(--accent)',
                    marginBottom: '6px'
                  }}>
                    {enhancedStats.avgPointsPerMatch}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Puntos/Partido
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '16px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.5s',
                  borderLeft: '4px solid #8b5cf6'
                }}>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: '700', 
                    color: '#8b5cf6',
                    marginBottom: '6px'
                  }}>
                    {enhancedStats.activeTournamentsCount}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Torneos Activos
                  </div>
                </div>
              </div>

              {/* Acción rápida */}
              <div style={{ 
              }}>
              </div>
            </div>
          )}

          {/* 2. TORNEOS ACTIVOS */}
          <div className="glass-card dashboard-card hover-lift" style={{ 
            padding: '24px',
            width: '100%',
            boxSizing: 'border-box',
            animationDelay: '0.2s'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                margin: 0,
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Icon name="tournament" size={20} color="var(--primary)" />
                Torneos Activos
              </h2>
              <span style={{ 
                background: 'var(--primary)', 
                color: 'white',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600'
              }}>
                {activeTournaments.length}
              </span>
            </div>

            {activeTournaments.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '30px 20px',
                color: 'var(--text-secondary)'
              }}>
                <Icon name="tournament" size={48} color="var(--border-color)" />
                <p style={{ margin: '16px 0 0 0', fontSize: '14px' }}>
                  No hay torneos activos
                </p>
                <button
                  onClick={() => navigateWithTransition('/tournaments')}
                  className="btn-primary"
                  style={{ 
                    marginTop: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Icon name="add" size={16} color="white" />
                  Crear Primer Torneo
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeTournaments.slice(0, 3).map((tournament, index) => (
                  <div key={tournament.id} className="animate-fadeInUp" style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    animationDelay: `${0.3 + index * 0.1}s`,
                    cursor: 'pointer'
                  }}
                  onClick={() => navigateWithTransition(`/tournament/${tournament.id}`)}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <h3 style={{ 
                        color: 'var(--text-primary)', 
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        {tournament.name}
                      </h3>
                      <span style={{ 
                        background: 'var(--secondary)', 
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        Activo
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px',
                      fontSize: '12px',
                      color: 'var(--text-muted)'
                    }}>
                      <span>
                        <Icon name="users" size={12} color="var(--text-muted)" />
                        {' '}{tournament.players.length + tournament.guestPlayers.length} jugadores
                      </span>
                      <span>
                        <Icon name="calendar" size={12} color="var(--text-muted)" />
                        {' '}{new Date(tournament.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                
                {activeTournaments.length > 3 && (
                  <button
                    onClick={() => navigateWithTransition('/tournaments')}
                    className="btn-outline"
                    style={{ 
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '8px'
                    }}
                  >
                    <Icon name="tournament" size={16} color="var(--primary)" />
                    Ver Todos los Torneos ({activeTournaments.length})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. TOP RANKING DEL CLUB */}
          {activeClub && topRanking.length > 0 && (
            <div className="glass-card dashboard-card ranking-card hover-lift" style={{ 
              padding: '24px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.3s'
            }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '20px',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Icon name="trophy" size={20} color="var(--accent)" />
                Top Ranking
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {topRanking.map((player, index) => {
                  const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                  const isCurrentUser = player.isCurrentUser;
                  
                  return (
                    <div key={player.id} className="animate-fadeInUp" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: isCurrentUser ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg)',
                      borderRadius: 'var(--border-radius)',
                      border: isCurrentUser ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                      animationDelay: `${0.4 + index * 0.1}s`
                    }}>
                      {/* Medalla/Número */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: index === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                    index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : 
                                    'linear-gradient(135deg, #b45309, #92400e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '14px',
                        flexShrink: 0
                      }}>
                        {medal}
                      </div>

                      {/* Avatar */}
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: player.profilePicture ? 
                          `url(${player.profilePicture}) center/cover` :
                          'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: player.profilePicture ? '0' : '14px',
                        fontWeight: '600',
                        border: '2px solid var(--card-bg)',
                        flexShrink: 0
                      }}>
                        {!player.profilePicture && player.avatar}
                      </div>

                      {/* Información del Jugador */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          marginBottom: '4px'
                        }}>
                          <span style={{ 
                            color: 'var(--text-primary)', 
                            fontWeight: '600',
                            fontSize: '14px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {player.name}
                          </span>
                          {isCurrentUser && (
                            <span style={{ 
                              background: 'var(--primary)', 
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '8px',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              Tú
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px',
                          fontSize: '11px',
                          color: 'var(--text-muted)',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
  <Icon name="target" size={10} color="var(--text-muted)" />
  {player.avgPointsPerMatch} pts/partido
</span>
<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
  <Icon name="stats" size={10} color="var(--text-muted)" />
  {player.winRate}% victorias
</span>
                        </div>
                      </div>

                      {/* Puntuación destacada */}
                      <div style={{
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}>
                        #{index + 1}
                      </div>
                    </div>
                  );
                })}
                
                {/* Link para ver ranking completo */}
                <div style={{ 
                  textAlign: 'center',
                  marginTop: '8px'
                }}>
                  <button
                    onClick={() => navigateWithTransition('/tournaments')}
                    className="btn-outline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      padding: '8px 16px'
                    }}
                  >
                    <Icon name="stats" size={14} color="var(--primary)" />
                    Ver ranking completo
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. CLUB ACTIVO */}
          {activeClub && (
            <div className="glass-card dashboard-card club-card hover-lift" style={{ 
              padding: '24px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.4s'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <h2 style={{ 
                  color: 'var(--text-primary)', 
                  margin: '0',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <Icon name="club" size={20} color="var(--primary)" />
                  Club Activo
                </h2>
                <span style={{ 
                  background: 'var(--secondary)', 
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  Activo
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '20px'
              }}>
                <div className="animate-bounceIn" style={{
                  width: '60px',
                  height: '60px',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'white',
                  alignSelf: 'center',
                  animation: 'bounceIn 0.6s ease-out'
                }}>
                  <Icon name="club" size={24} color="white" />
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ 
                    color: 'var(--text-primary)', 
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    fontWeight: '700'
                  }}>
                    {activeClub.name}
                  </h3>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {activeClub.description || 'Sin descripción disponible'}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    alignItems: 'center'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="users" size={12} color="var(--text-muted)" />
                      {activeClub.members?.length || 0} miembros
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="tournament" size={12} color="var(--text-muted)" />
                      {activeTournaments.length} torneos activos
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="calendar" size={12} color="var(--text-muted)" />
                      Creado {new Date(activeClub.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
<button
  onClick={() => navigateWithTransition('/clubs')}
  style={{ 
    padding: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: 'white',
    borderRadius: 'var(--border-radius)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow)',
    fontSize: '16px',
    width: '100%',
    textDecoration: 'none'
  }}
  onMouseOver={(e) => {
    e.target.style.transform = 'translateY(-2px)';
    e.target.style.boxShadow = 'var(--shadow-lg)';
  }}
  onMouseOut={(e) => {
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'var(--shadow)';
  }}
>
  <Icon name="settings" size={18} color="white" />
  Gestionar Club
</button>              </div>
            </div>
          )}
        </div>

        {/* Estado sin club activo */}
        {!activeClub && (
          <div className="glass-card animate-fadeInUp" style={{ 
            padding: '40px 20px',
            textAlign: 'center',
            marginTop: '20px',
            width: '100%',
            boxSizing: 'border-box',
            animationDelay: '0.3s'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              <Icon name="club" size={64} color="var(--border-color)" />
            </div>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '12px',
              fontSize: '24px'
            }}>
              No tienes un club activo
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '30px',
              fontSize: '16px',
              lineHeight: '1.4',
              maxWidth: '400px',
              margin: '0 auto 30px auto'
            }}>
              Selecciona un club activo o únete a uno para empezar a jugar torneos y guardar tus estadísticas
            </p>
  <button
  onClick={() => navigateWithTransition('/clubs')}
  style={{ 
    padding: '14px 24px',
    border: 'none',
    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    color: 'white',
    borderRadius: 'var(--border-radius)',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    boxShadow: 'var(--shadow)',
    fontSize: '16px'
  }}
  onMouseOver={(e) => {
    e.target.style.transform = 'translateY(-2px)';
    e.target.style.boxShadow = 'var(--shadow-lg)';
  }}
  onMouseOut={(e) => {
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'var(--shadow)';
  }}
>
  <Icon name="club" size={18} color="white" />
  Gestionar Clubes
  </button>          </div>
        )}

        {/* PARTIDOS RECIENTES */}
        {recentMatches.length > 0 && (
          <div className="glass-card animate-fadeInUp" style={{ 
            padding: '24px',
            marginTop: '30px',
            width: '100%',
            boxSizing: 'border-box',
            animationDelay: '0.5s'
          }}>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '20px',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Icon name="history" size={20} color="var(--primary)" />
              Partidos Recientes
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recentMatches.map((match, index) => {
                const userTeam = match.team1.includes(state.currentUser?.id) ? 'team1' : 'team2';
                const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
                const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
                const won = userScore > opponentScore;

                return (
                  <div key={match.id} className="animate-fadeInUp" style={{
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    animationDelay: `${0.6 + index * 0.1}s`
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                        {match.tournamentName}
                      </div>
                      <div style={{ 
                        background: won ? 'var(--secondary)' : 'var(--error)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {won ? 'Ganado' : 'Perdido'}
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        Tú: {userScore} - {opponentScore} :Oponente
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {new Date(match.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de Torneos - VERSIÓN COMPLETA CON NUEVO DISEÑO
// Componente de Torneos - VERSIÓN MEJORADA
function Tournaments() {
  // ✅ ESTADOS NECESARIOS
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTournament, setNewTournament] = useState({ 
    name: '', 
    players: [],
    guestPlayers: [] 
  });
  const [newGuestPlayer, setNewGuestPlayer] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const { state, getters, actions } = useApp();
  const { currentUser } = state;
  const { addToast } = useToast();
  const { navigateWithTransition } = useNavigation();
  
  const activeClub = getters.getActiveClub();
  const clubMembers = activeClub ? getters.getClubMembers(activeClub.id) : [];
  
  // Obtener torneos correctamente
  const allTournaments = state.tournaments || [];
  const activeTournaments = allTournaments.filter(t => t.status === 'active');
  const completedTournaments = allTournaments.filter(t => t.status === 'completed');

  // ✅ FUNCIÓN CORREGIDA PARA GENERAR PARTIDOS
  const generateInitialMatches = (playerIds) => {
    const matches = [];
    const totalPlayers = playerIds.length;
    
    if (totalPlayers < 4) {
      console.log('❌ No hay suficientes jugadores para crear partidos');
      return matches;
    }
    
    const matchesToCreate = Math.min(7, Math.max(4, Math.floor(totalPlayers * 1.5)));
    
    console.log(`🎯 Creando ${matchesToCreate} partidos iniciales para ${totalPlayers} jugadores`);
    
    const matchesPlayed = {};
    playerIds.forEach(player => {
      matchesPlayed[player] = 0;
    });
    
    for (let matchIndex = 0; matchIndex < matchesToCreate; matchIndex++) {
      const playersByUsage = [...playerIds].sort((a, b) => {
        return matchesPlayed[a] - matchesPlayed[b];
      });
      
      const basePlayers = playersByUsage.slice(0, 4);
      const shuffledTeams = [...basePlayers].sort(() => Math.random() - 0.5);
      const team1 = shuffledTeams.slice(0, 2);
      const team2 = shuffledTeams.slice(2, 4);
      
      const matchId = `match-${Date.now()}-${matchIndex}`;
      
      matches.push({
        id: matchId,
        team1,
        team2,
        scoreTeam1: null,
        scoreTeam2: null,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      
      [...team1, ...team2].forEach(player => {
        matchesPlayed[player]++;
      });
    }
    
    return matches;
  };

  // Función auxiliar para obtener nombres de jugadores
  const getPlayerName = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      const guestIndex = parseInt(playerId.split('-')[1]);
      return newTournament.guestPlayers[guestIndex] + ' (Invitado)';
    }
    const player = clubMembers.find(member => member.id === playerId);
    return player ? player.name : 'Jugador no encontrado';
  };

  // Función para agregar jugador invitado
  const addGuestPlayer = () => {
    if (newGuestPlayer.trim() && !newTournament.guestPlayers.includes(newGuestPlayer.trim())) {
      setNewTournament({
        ...newTournament,
        guestPlayers: [...newTournament.guestPlayers, newGuestPlayer.trim()]
      });
      setNewGuestPlayer('');
      addToast('Jugador invitado agregado', 'success');
    } else if (newTournament.guestPlayers.includes(newGuestPlayer.trim())) {
      addToast('Este jugador ya está en la lista', 'warning');
    }
  };

  // Función para remover jugador invitado
  const removeGuestPlayer = (guestName) => {
    setNewTournament({
      ...newTournament,
      guestPlayers: newTournament.guestPlayers.filter(name => name !== guestName)
    });
    addToast('Jugador invitado removido', 'info');
  };

  // Función para alternar selección de jugador
  const togglePlayer = (playerId) => {
    const isSelected = newTournament.players.includes(playerId);
    setNewTournament({
      ...newTournament,
      players: isSelected
        ? newTournament.players.filter(id => id !== playerId)
        : [...newTournament.players, playerId]
    });
    
    const player = clubMembers.find(m => m.id === playerId);
    if (player) {
      addToast(
        isSelected ? `${player.name} removido` : `${player.name} agregado`,
        isSelected ? 'info' : 'success'
      );
    }
  };

  // ✅ FUNCIÓN CORREGIDA PARA CREAR TORNEO
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (newTournament.players.length + newTournament.guestPlayers.length < 4) {
      addToast('Se necesitan al menos 4 jugadores para crear un torneo', 'warning');
      setIsSubmitting(false);
      return;
    }

    try {
      const activeClub = getters.getActiveClub();
      if (!activeClub) {
        addToast('No tienes un club activo seleccionado', 'error');
        setIsSubmitting(false);
        return;
      }

      console.log('🏆 Creando torneo para club:', activeClub.id, activeClub.name);

      const tournamentData = {
        name: newTournament.name,
        clubId: activeClub.id,
        createdBy: currentUser.id,
        players: newTournament.players,
        guestPlayers: newTournament.guestPlayers,
        matches: generateInitialMatches([...newTournament.players, ...newTournament.guestPlayers.map((_, index) => `guest-${index}`)]),
      };

      const createdTournament = await actions.createTournament(tournamentData);
      
      addToast(`¡Torneo "${createdTournament.name}" creado exitosamente! 🎉`, 'success');
      
      setShowCreateForm(false);
      setNewTournament({ name: '', players: [], guestPlayers: [] });
      
      setTimeout(() => {
        navigateWithTransition(`/tournament/${createdTournament.id}`, {
          message: `Redirigiendo al torneo "${createdTournament.name}"...`
        });
      }, 1000);
      
    } catch (error) {
      addToast('Error al crear el torneo: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Función para completar torneo
  const handleCompleteTournament = async (tournament) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres completar el torneo "${tournament.name}"?\n\nEsta acción no se puede deshacer y moverá el torneo a la sección de completados.`
    );
    
    if (!confirmed) return;

    setActionLoading(tournament.id);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      actions.completeTournament(tournament.id);
      addToast(`¡Torneo "${tournament.name}" completado exitosamente! 🏆`, 'success');
      
    } catch (error) {
      addToast('Error al completar el torneo', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Función para eliminar torneo
  const handleDeleteTournament = async (tournament) => {
    const confirmed = window.confirm(
      `¿Estás seguro de que quieres ELIMINAR el torneo "${tournament.name}"?\n\n⚠️ Esta acción NO se puede deshacer y se perderán todos los datos del torneo.`
    );
    
    if (!confirmed) return;

    setActionLoading(tournament.id);
    
    try {
      await actions.deleteTournament(tournament.id);
      addToast(`¡Torneo "${tournament.name}" eliminado exitosamente! 🗑️`, 'success');
      
    } catch (error) {
      console.error('❌ Error eliminando torneo:', error);
      addToast('Error al eliminar el torneo: ' + error.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Verificar si el usuario es el creador del torneo
  const isTournamentCreator = (tournament) => {
    return tournament.createdBy === currentUser.id;
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '20px',
      paddingBottom: '100px' // Espacio para la barra inferior
    }}>
      <style>{themeStyles}</style>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header - MEJORADO: Botón a la derecha al mismo nivel */}
        <div className="animate-fadeInUp" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Icon name="tournament" size={28} color="var(--primary)" />
              Torneos
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gestiona y participa en torneos de pádel
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white',
              borderRadius: 'var(--border-radius)',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow)',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = 'var(--shadow-lg)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'var(--shadow)';
            }}
            disabled={isSubmitting}
          >
            <Icon name="add" size={16} color="white" />
            Crear Torneo
          </button>
        </div>

        {/* Formulario de Creación de Torneo */}
        {showCreateForm && (
          <div className="glass-card animate-scaleIn" style={{ 
            padding: '24px', 
            marginBottom: '30px',
            border: '2px solid var(--primary)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon name="tournament" size={20} color="var(--primary)" />
                Crear Nuevo Torneo
              </h3>
              <button
                onClick={() => setShowCreateForm(false)}
                disabled={isSubmitting}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '5px',
                  borderRadius: '50%',
                  transition: 'var(--transition)'
                }}
              >
                <Icon name="close" size={20} color="currentColor" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTournament}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Torneo Primavera 2024"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament({...newTournament, name: e.target.value})}
                  disabled={isSubmitting}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    transition: 'var(--transition)',
                    fontSize: '16px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Jugadores del Club ({newTournament.players.length} seleccionados)
                </label>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '8px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  {clubMembers.map(member => (
                    <div
                      key={member.id}
                      onClick={() => !isSubmitting && togglePlayer(member.id)}
                      style={{
                        padding: '10px',
                        border: `2px solid ${newTournament.players.includes(member.id) ? 'var(--primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: newTournament.players.includes(member.id) ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition)',
                        opacity: isSubmitting ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '12px'
                        }}>
                          <Icon name="profile" size={12} color="white" />
                        </div>
                        <span style={{ 
                          color: 'var(--text-primary)',
                          fontWeight: newTournament.players.includes(member.id) ? '600' : '400',
                          fontSize: '13px'
                        }}>
                          {member.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Jugadores Invitados ({newTournament.guestPlayers.length})
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Nombre del jugador invitado"
                      value={newGuestPlayer}
                      onChange={(e) => setNewGuestPlayer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGuestPlayer())}
                      disabled={isSubmitting}
                      style={{ 
                        flex: 1, 
                        padding: '12px', 
                        border: '2px solid var(--border-color)',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={addGuestPlayer}
                      disabled={isSubmitting || !newGuestPlayer.trim()}
                      style={{
                        padding: '12px 16px',
                        border: '2px solid var(--primary)',
                        borderRadius: 'var(--border-radius)',
                        background: 'transparent',
                        color: 'var(--primary)',
                        cursor: isSubmitting || !newGuestPlayer.trim() ? 'not-allowed' : 'pointer',
                        fontWeight: '600',
                        opacity: isSubmitting || !newGuestPlayer.trim() ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="add" size={16} color="currentColor" />
                      Añadir
                    </button>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {newTournament.guestPlayers.map((guest, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '16px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Icon name="profile" size={12} color="white" />
                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {guest}
                      </span>
                      <button
                        type="button"
                        onClick={() => !isSubmitting && removeGuestPlayer(guest)}
                        disabled={isSubmitting}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          padding: '0',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Icon name="close" size={12} color="white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                padding: '14px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 'var(--border-radius)',
                marginBottom: '20px',
                border: '1px solid var(--primary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                    Total de Jugadores:
                  </span>
                  <span style={{ 
                    color: (newTournament.players.length + newTournament.guestPlayers.length) >= 4 ? 'var(--secondary)' : 'var(--accent)',
                    fontWeight: '700',
                    fontSize: '16px'
                  }}>
                    {newTournament.players.length + newTournament.guestPlayers.length} / 4 mínimo
                  </span>
                </div>
                {(newTournament.players.length + newTournament.guestPlayers.length) < 4 && (
                  <p style={{ color: 'var(--accent)', fontSize: '13px', marginTop: '8px', fontWeight: '600' }}>
                    ⚠️ Se necesitan al menos 4 jugadores
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <button 
                  type="submit" 
                  style={{
                    padding: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxShadow: 'var(--shadow)',
                    fontSize: '16px',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  disabled={isSubmitting || (newTournament.players.length + newTournament.guestPlayers.length) < 4}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <Icon name="tournament" size={18} color="white" />
                      Crear Torneo
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pestañas de Torneos */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setActiveTab('active')}
              style={{
                flex: 1,
                padding: '16px 12px',
                border: 'none',
                background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'active' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'var(--transition)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Icon name="tournament" size={16} color={activeTab === 'active' ? 'white' : 'currentColor'} />
              Activos ({activeTournaments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              style={{
                flex: 1,
                padding: '16px 12px',
                border: 'none',
                background: activeTab === 'completed' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'completed' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'var(--transition)',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Icon name="check" size={16} color={activeTab === 'completed' ? 'white' : 'currentColor'} />
              Completados ({completedTournaments.length})
            </button>
          </div>

          {/* Lista de Torneos - MEJORADA: Estructura más legible */}
          <div style={{ padding: '24px' }}>
            {(activeTab === 'active' ? activeTournaments : completedTournaments).map((tournament, index) => (
              <div 
                key={tournament.id} 
                className="glass-card animate-fadeInUp hover-lift"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  marginBottom: '20px',
                  padding: '20px'
                }}
              >
                {/* Header del torneo - MEJORADO: Estructura vertical para mejor legibilidad */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start',
                    marginBottom: '12px',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      margin: '0',
                      wordWrap: 'break-word',
                      flex: 1,
                      minWidth: '200px'
                    }}>
                      {tournament.name}
                    </h3>
                    
                    {/* Botones de acción - MEJORADO: En línea horizontal */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '8px', 
                      alignItems: 'center',
                      flexShrink: 0,
                      flexWrap: 'wrap'
                    }}>
                      {/* Botón Abrir */}
                      <button
                        onClick={() => navigateWithTransition(`/tournament/${tournament.id}`, {
                          message: `Abriendo ${tournament.name}...`
                        })}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid var(--primary)',
                          borderRadius: 'var(--border-radius)',
                          background: 'var(--primary)',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Icon name="play" size={12} color="white" />
                        Abrir
                      </button>

                      {/* Botón Completar - solo para torneos ACTIVOS y creador */}
                      {tournament.status === 'active' && isTournamentCreator(tournament) && (
                        <button
                          onClick={() => handleCompleteTournament(tournament)}
                          disabled={actionLoading === tournament.id}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid var(--accent)',
                            borderRadius: 'var(--border-radius)',
                            background: 'var(--accent)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: actionLoading === tournament.id ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            whiteSpace: 'nowrap',
                            opacity: actionLoading === tournament.id ? 0.6 : 1,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {actionLoading === tournament.id ? (
                            <>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Procesando...
                            </>
                          ) : (
                            <>
                              <Icon name="check" size={12} color="white" />
                              Completar
                            </>
                          )}
                        </button>
                      )}

                      {/* Botón Eliminar - solo para torneos ACTIVOS y creador */}
                      {tournament.status === 'active' && isTournamentCreator(tournament) && (
                        <button
                          onClick={() => handleDeleteTournament(tournament)}
                          disabled={actionLoading === tournament.id}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--border-radius)',
                            background: 'var(--error)',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: actionLoading === tournament.id ? 'not-allowed' : 'pointer',
                            transition: 'var(--transition)',
                            whiteSpace: 'nowrap',
                            opacity: actionLoading === tournament.id ? 0.6 : 1,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {actionLoading === tournament.id ? (
                            <>
                              <div style={{
                                width: '12px',
                                height: '12px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Eliminando...
                            </>
                          ) : (
                            <>
                              <Icon name="delete" size={12} color="white" />
                              Eliminar
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Información del torneo */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ 
                      background: tournament.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Icon name={tournament.status === 'active' ? 'tournament' : 'check'} size={10} color="white" />
                      {tournament.status === 'active' ? 'Activo' : 'Completado'}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="users" size={12} color="var(--text-secondary)" />
                      {tournament.players.length + tournament.guestPlayers.length} jugadores
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Icon name="calendar" size={12} color="var(--text-secondary)" />
                      {new Date(tournament.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Información adicional */}
                <div style={{ 
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--border-radius)',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="history" size={12} color="var(--text-secondary)" />
                      {tournament.matches?.filter(m => m.status === 'completed').length || 0}/{tournament.matches?.length || 0} partidos jugados
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icon name="profile" size={12} color="var(--text-secondary)" />
                      Creado por {state.users.find(u => u.id === tournament.createdBy)?.name || 'Usuario'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Estado vacío - MEJORADO: Botón centrado */}
            {(activeTab === 'active' ? activeTournaments : completedTournaments).length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                color: 'var(--text-secondary)',
                animation: 'fadeInUp 0.6s ease-out'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>
                  <Icon name="tournament" size={64} color="var(--border-color)" />
                </div>
                <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                  {activeTab === 'active' ? 'No hay torneos activos' : 'No hay torneos completados'}
                </h3>
                <p style={{ marginBottom: '30px', fontSize: '14px' }}>
                  {activeTab === 'active' 
                    ? 'Crea el primer torneo para empezar a competir' 
                    : 'Los torneos completados aparecerán aquí'
                  }
                </p>
                {activeTab === 'active' && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button 
                      onClick={() => setShowCreateForm(true)}
                      style={{
                        padding: '12px 24px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: 'white',
                        borderRadius: 'var(--border-radius)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: 'var(--shadow)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = 'var(--shadow-lg)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'var(--shadow)';
                      }}
                    >
                      <Icon name="add" size={16} color="white" />
                      Crear Primer Torneo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}




// Componente de Gestión de Clubes - VERSIÓN COMPLETA Y FUNCIONAL
function ClubManagement() {
  const { state, actions, getters } = useApp();
  const { currentUser } = state;
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showManageClub, setShowManageClub] = useState(null);
  const [showEditClub, setShowEditClub] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [newClub, setNewClub] = useState({ 
    name: '', 
    description: '', 
    password: '' 
  });
  const [joinClub, setJoinClub] = useState({ 
    clubId: '', 
    password: '' 
  });
  const [editClub, setEditClub] = useState({
    name: '',
    description: '',
    password: ''
  });

  // Obtener clubes del usuario
  const userClubs = getters.getUserClubs ? getters.getUserClubs() : [];
  
  // Obtener clubes disponibles para unirse
  const availableClubs = state.clubs ? state.clubs.filter(club => {
    if (!club || !club.members || !currentUser) return false;
    return !club.members.includes(currentUser.id);
  }) : [];

  // Función para crear club
  const handleCreateClub = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (!newClub.name.trim()) {
        addToast('El nombre del club es requerido', 'error');
        return;
      }

      if (!newClub.password.trim()) {
        addToast('La contraseña del club es requerida', 'error');
        return;
      }

      const clubData = {
        name: newClub.name,
        description: newClub.description,
        password: newClub.password,
        createdBy: currentUser.id,
        members: [currentUser.id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await actions.createClub(clubData);
      
      setShowCreateForm(false);
      setNewClub({ name: '', description: '', password: '' });
      addToast(`¡Club "${clubData.name}" creado exitosamente! 🎉`, 'success');
      
    } catch (error) {
      console.error('Error creando club:', error);
      addToast('Error al crear el club: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para unirse a club
  const handleJoinClub = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const club = state.clubs.find(c => c.id === joinClub.clubId);
      
      if (!club) {
        addToast('Club no encontrado', 'error');
        return;
      }
      
      // Verificar si ya es miembro
      const isAlreadyMember = club.members && club.members.includes(currentUser.id);
      if (isAlreadyMember) {
        addToast('Ya eres miembro de este club', 'warning');
        return;
      }
      
      if (club.password !== joinClub.password) {
        addToast('Contraseña incorrecta', 'error');
        return;
      }
      
      await actions.joinClub(joinClub.clubId, currentUser.id);
      setShowJoinForm(false);
      setJoinClub({ clubId: '', password: '' });
      addToast(`¡Te has unido al club "${club.name}" exitosamente! 👥`, 'success');
    } catch (error) {
      addToast('Error uniéndose al club: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para salir de club
  const handleLeaveClub = async (clubId) => {
    if (!window.confirm('¿Estás seguro de que quieres salir de este club?')) {
      return;
    }

    try {
      await actions.leaveClub(clubId, currentUser.id);
      addToast('Has salido del club', 'info');
    } catch (error) {
      addToast('Error al salir del club: ' + error.message, 'error');
    }
  };

  // Función para establecer club activo
  const handleSetActiveClub = async (clubId) => {
    try {
      console.log('🎯 Intentando activar club:', clubId);
      
      await actions.setActiveClub(currentUser.id, clubId);
      
      addToast(`¡Club activado correctamente! Redirigiendo al dashboard... 🎯`, 'success');
      
      // Redirigir al dashboard después de un breve delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error activando club:', error);
      addToast('Error al activar el club: ' + error.message, 'error');
    }
  };

  // Función para abrir gestión de club
  const handleManageClub = (club) => {
    setShowManageClub(club);
  };

  // Función para abrir edición de club
  const handleEditClub = (club) => {
    setShowEditClub(club);
    setEditClub({
      name: club.name,
      description: club.description || '',
      password: ''
    });
  };

  // Función para guardar cambios del club
  const handleSaveClub = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updates = {};
      
      if (editClub.name.trim() && editClub.name !== showEditClub.name) {
        updates.name = editClub.name;
      }
      
      if (editClub.description !== showEditClub.description) {
        updates.description = editClub.description;
      }
      
      if (editClub.password.trim()) {
        updates.password = editClub.password;
      }

      if (Object.keys(updates).length > 0) {
        await actions.updateClub(showEditClub.id, updates);
        addToast('¡Club actualizado correctamente! ✅', 'success');
        setShowEditClub(null);
        setEditClub({ name: '', description: '', password: '' });
      } else {
        addToast('No hay cambios para guardar', 'info');
      }
      
    } catch (error) {
      console.error('Error actualizando club:', error);
      addToast('Error al actualizar el club: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar miembro
  const handleRemoveMember = async (clubId, memberId, memberName) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar a ${memberName} del club?`)) {
      return;
    }

    try {
      await actions.removeMemberFromClub(clubId, memberId);
      addToast(`Miembro ${memberName} eliminado del club`, 'success');
    } catch (error) {
      console.error('Error eliminando miembro:', error);
      addToast('Error al eliminar miembro: ' + error.message, 'error');
    }
  };

  // Función para eliminar club
  const handleDeleteClub = async (clubId, clubName) => {
    if (!window.confirm(`¿Estás seguro de que quieres ELIMINAR el club "${clubName}"? Esta acción no se puede deshacer y se perderán todos los datos del club.`)) {
      return;
    }

    try {
      // Aquí iría la función para eliminar club (necesitarías implementarla en el contexto)
      addToast(`Función de eliminar club en desarrollo para: ${clubName}`, 'info');
      console.log('Eliminar club:', clubId);
    } catch (error) {
      console.error('Error eliminando club:', error);
      addToast('Error al eliminar el club: ' + error.message, 'error');
    }
  };

  // Verificar si el usuario es administrador del club
  const isClubAdmin = (club) => {
    return club.createdBy === currentUser.id;
  };

  // Obtener miembros del club
  const getClubMembers = (clubId) => {
    return getters.getClubMembers(clubId);
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '16px',
      paddingBottom: '100px'
    }}>
      <style>{`
        /* ESTILOS RESPONSIVE PARA CLUB MANAGEMENT */
        .club-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .club-header-buttons {
          display: flex;
          gap: 12px;
          width: 100%;
          justify-content: flex-start;
        }

        .club-card {
          background: var(--card-bg);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
          width: 100%;
          box-sizing: border-box;
        }

        .club-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .club-info {
          flex: 1;
          min-width: 0;
          width: 100%;
        }

        .club-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.3;
        }

        .club-description {
          color: var(--text-secondary);
          margin-bottom: 12px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .club-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--text-muted);
          flex-wrap: wrap;
        }

        .club-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          width: 100%;
          justify-content: flex-start;
        }

        .club-action-btn {
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          min-width: 120px;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .club-action-btn.primary {
          border: 2px solid var(--primary);
          background: var(--primary);
          color: white;
        }

        .club-action-btn.secondary {
          border: 2px solid var(--secondary);
          background: var(--secondary);
          color: white;
        }

        .club-action-btn.accent {
          border: 2px solid var(--accent);
          background: var(--accent);
          color: white;
        }

        .club-action-btn.danger {
          border: 2px solid #ef4444;
          background: transparent;
          color: #ef4444;
        }

        .club-badge {
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          margin-left: 8px;
          display: inline-block;
        }

        .club-badge.active {
          background: var(--secondary);
          color: white;
        }

        .club-badge.admin {
          background: var(--accent);
          color: white;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }

        .modal-content {
          background: var(--card-bg);
          padding: 20px;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
        }

        /* MEDIA QUERIES PARA RESPONSIVE */
        @media (min-width: 768px) {
          .club-header {
            flex-direction: row;
            align-items: center;
          }

          .club-header-buttons {
            width: auto;
            justify-content: flex-end;
          }

          .club-card-header {
            flex-direction: row;
            align-items: flex-start;
          }

          .club-actions {
            width: auto;
            justify-content: flex-end;
          }

          .club-action-btn {
            flex: 0 1 auto;
            min-width: auto;
          }

          .modal-content {
            max-width: 600px;
            padding: 24px;
          }
        }

        @media (min-width: 1024px) {
          .modal-content {
            max-width: 700px;
          }
        }

        @media (max-width: 480px) {
          .club-action-btn {
            min-width: 110px;
            padding: 8px 12px;
            font-size: 11px;
          }

          .club-meta {
            gap: 8px;
            font-size: 11px;
          }

          .club-title {
            font-size: 16px;
          }

          .club-description {
            font-size: 13px;
          }
        }

        @media (max-width: 360px) {
          .club-actions {
            flex-direction: column;
          }

          .club-action-btn {
            width: 100%;
          }
        }
      `}</style>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div className="club-header">
          <div style={{ width: '100%' }}>
<h1 style={{ 
  fontSize: '24px', 
  fontWeight: '700', 
  color: 'var(--text-primary)',
  marginBottom: '8px',
  wordWrap: 'break-word',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}}>
  <Icon name="club" size={24} color="var(--primary)" />
  Gestión de Clubes
</h1>            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: '14px',
              wordWrap: 'break-word'
            }}>
              Crea, únete y gestiona tus clubes de pádel
            </p>
          </div>
          
          <div className="club-header-buttons">
            <button 
              onClick={() => setShowCreateForm(true)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                color: 'white',
                borderRadius: 'var(--border-radius)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                minWidth: '140px',
                justifyContent: 'center',
                boxShadow: 'var(--shadow)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
              disabled={isLoading}
            >
              <Icon name="add" size={16} color="white" />
              Crear Club
            </button>
            <button 
              onClick={() => setShowJoinForm(true)}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                color: 'white',
                borderRadius: 'var(--border-radius)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flex: 1,
                minWidth: '140px',
                justifyContent: 'center',
                boxShadow: 'var(--shadow)'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = 'var(--shadow-lg)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'var(--shadow)';
              }}
              disabled={isLoading}
            >
              <Icon name="users" size={16} color="white" />
              Unirse a Club
            </button>
          </div>
        </div>

        {/* Formulario Crear Club */}
        {showCreateForm && (
          <div className="modal-overlay">
            <div className="modal-content animate-scaleIn" style={{ border: '2px solid var(--primary)' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                  <Icon name="add" size={20} color="var(--primary)" style={{ marginRight: '12px' }} />
                    Crear Nuevo Club
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  <Icon name="close" size={20} color="currentColor" />
                </button>
              </div>
              
              <form onSubmit={handleCreateClub}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Nombre del Club *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Club Pádel Central"
                    value={newClub.name}
                    onChange={(e) => setNewClub({...newClub, name: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Descripción
                  </label>
                  <textarea
                    placeholder="Describe tu club..."
                    value={newClub.description}
                    onChange={(e) => setNewClub({...newClub, description: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      minHeight: '80px',
                      resize: 'vertical',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Contraseña del Club *
                  </label>
                  <input
                    type="password"
                    placeholder="Contraseña para unirse al club"
                    value={newClub.password}
                    onChange={(e) => setNewClub({...newClub, password: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                    required
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                    Los miembros necesitarán esta contraseña para unirse
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button 
                    type="submit" 
                    style={{
                      padding: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: 'var(--shadow)',
                      fontSize: '16px',
                      width: '100%'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <Icon name="add" size={18} color="white" />
                        Crear Club
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isLoading}
                    style={{
                      padding: '12px 20px',
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Formulario Unirse a Club - FALTANTE */}
        {showJoinForm && (
          <div className="modal-overlay">
            <div className="modal-content animate-scaleIn" style={{ border: '2px solid var(--secondary)' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                  <Icon name="users" size={20} color="var(--secondary)" style={{ marginRight: '8px' }} />
                  Unirse a Club
                </h3>
                <button
                  onClick={() => setShowJoinForm(false)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  <Icon name="close" size={20} color="currentColor" />
                </button>
              </div>
              
              <form onSubmit={handleJoinClub}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Seleccionar Club *
                  </label>
                  <select
                    value={joinClub.clubId}
                    onChange={(e) => setJoinClub({...joinClub, clubId: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                    required
                  >
                    <option value="">Selecciona un club</option>
                    {availableClubs.map(club => (
                      <option key={club.id} value={club.id}>
                        {club.name} ({club.members?.length || 0} miembros)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Contraseña del Club *
                  </label>
                  <input
                    type="password"
                    placeholder="Ingresa la contraseña del club"
                    value={joinClub.password}
                    onChange={(e) => setJoinClub({...joinClub, password: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                    required
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                    Necesitas la contraseña proporcionada por el administrador del club
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button 
                    type="submit" 
                    style={{
                      padding: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: 'var(--shadow)',
                      fontSize: '16px',
                      width: '100%'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Uniéndose...
                      </>
                    ) : (
                      <>
                        <Icon name="users" size={18} color="white" />
                        Unirse al Club
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowJoinForm(false)}
                    disabled={isLoading}
                    style={{
                      padding: '12px 20px',
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Club - FALTANTE */}
        {showEditClub && (
          <div className="modal-overlay">
            <div className="modal-content animate-scaleIn" style={{ border: '2px solid var(--accent)' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ 
                  color: 'var(--text-primary)', 
                  margin: 0, 
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Icon name="edit" size={20} color="var(--accent)" style={{ marginRight: '12px' }} />
                  Editar Club: {showEditClub.name}
                </h3>
                <button
                  onClick={() => setShowEditClub(null)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  <Icon name="close" size={20} color="currentColor" />
                </button>
              </div>
              
              <form onSubmit={handleSaveClub}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Nombre del Club *
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre del club"
                    value={editClub.name}
                    onChange={(e) => setEditClub({...editClub, name: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Descripción
                  </label>
                  <textarea
                    placeholder="Describe tu club..."
                    value={editClub.description}
                    onChange={(e) => setEditClub({...editClub, description: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      minHeight: '80px',
                      resize: 'vertical',
                      fontSize: '14px'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}>
                    Nueva Contraseña (opcional)
                  </label>
                  <input
                    type="password"
                    placeholder="Dejar vacío para mantener la actual"
                    value={editClub.password}
                    onChange={(e) => setEditClub({...editClub, password: e.target.value})}
                    disabled={isLoading}
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      fontSize: '14px'
                    }}
                  />
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>
                    Solo ingresa una nueva contraseña si quieres cambiarla
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button 
                    type="submit" 
                    style={{
                      padding: '14px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: 'var(--shadow)',
                      fontSize: '16px',
                      width: '100%'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={18} color="white" />
                        Guardar Cambios
                      </>
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowEditClub(null)}
                    disabled={isLoading}
                    style={{
                      padding: '12px 20px',
                      border: '2px solid var(--border-color)',
                      borderRadius: 'var(--border-radius)',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de Gestión de Club */}
        {showManageClub && (
          <div className="modal-overlay">
            <div className="modal-content animate-scaleIn">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                  <Icon name="settings" size={20} color="var(--primary)" style={{ marginRight: '8px' }} />
                  Gestionar Club: {showManageClub.name}
                </h3>
                <button
                  onClick={() => setShowManageClub(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  <Icon name="close" size={20} color="currentColor" />
                </button>
              </div>

              {/* Información del Club */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                  Información del Club
                </h4>
                <div style={{ 
                  background: 'var(--bg-secondary)', 
                  padding: '16px', 
                  borderRadius: 'var(--border-radius)',
                  marginBottom: '12px'
                }}>
                  <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Nombre:</strong> {showManageClub.name}
                  </p>
                  <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Descripción:</strong> {showManageClub.description || 'Sin descripción'}
                  </p>
                  <p style={{ marginBottom: '8px', fontSize: '14px' }}>
                    <strong>Miembros:</strong> {showManageClub.members?.length || 0}
                  </p>
                  <p style={{ marginBottom: '0', fontSize: '14px' }}>
                    <strong>Creado:</strong> {new Date(showManageClub.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                  <button
                    onClick={() => {
                      setShowEditClub(showManageClub);
                      setShowManageClub(null);
                    }}
                    style={{
                      padding: '12px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      width: '100%'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                  >
                    <Icon name="edit" size={16} color="white" />
                    Editar Club
                  </button>
                  <button
                    onClick={() => handleDeleteClub(showManageClub.id, showManageClub.name)}
                    style={{
                      padding: '12px 20px',
                      border: '2px solid var(--error)',
                      borderRadius: 'var(--border-radius)',
                      background: 'transparent',
                      color: 'var(--error)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    <Icon name="delete" size={16} color="var(--error)" />
                    Eliminar Club
                  </button>
                </div>
              </div>

              {/* Lista de Miembros */}
              <div>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                  Miembros del Club ({getClubMembers(showManageClub.id).length})
                </h4>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)'
                }}>
                  {getClubMembers(showManageClub.id).map((member, index) => (
                    <div key={member.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: index < getClubMembers(showManageClub.id).length - 1 ? '1px solid var(--border-color)' : 'none',
                      background: 'var(--card-bg)',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: member.profilePicture ? 
                            `url(${member.profilePicture}) center/cover` :
                            'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: member.profilePicture ? '0' : '14px',
                          fontWeight: '600',
                          border: '2px solid var(--card-bg)',
                          flexShrink: 0
                        }}>
                          {!member.profilePicture && (
                            <Icon name="profile" size={14} color="white" />
                          )}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ 
                            color: 'var(--text-primary)', 
                            fontWeight: '600',
                            fontSize: '14px',
                            wordWrap: 'break-word'
                          }}>
                            {member.name}
                            {member.id === showManageClub.createdBy && (
                              <span className="club-badge admin">
                                Creador
                              </span>
                            )}
                          </div>
                          <div style={{ 
                            color: 'var(--text-muted)', 
                            fontSize: '12px',
                            wordWrap: 'break-word'
                          }}>
                            {member.email}
                          </div>
                        </div>
                      </div>
                      
                      {member.id !== showManageClub.createdBy && member.id !== currentUser.id && (
                        <button
                          onClick={() => handleRemoveMember(showManageClub.id, member.id, member.name)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--border-radius)',
                            background: 'transparent',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            flexShrink: 0
                          }}
                        >
                          <Icon name="delete" size={12} color="var(--error)" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mis Clubes */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h2 style={{ 
            color: 'var(--text-primary)', 
            marginBottom: '20px',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Icon name="club" size={20} color="var(--primary)" />
            Mis Clubes ({userClubs.length})
          </h2>

          {userClubs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                <Icon name="club" size={48} color="var(--border-color)" />
              </div>
              <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>
                No perteneces a ningún club
              </h3>
              <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                Crea un nuevo club o únete a uno existente para empezar
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'var(--shadow)';
                  }}
                >
                  <Icon name="add" size={16} color="white" />
                  Crear Mi Primer Club
                </button>
                <button 
                  onClick={() => setShowJoinForm(true)}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = 'var(--shadow-lg)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'var(--shadow)';
                  }}
                >
                  <Icon name="users" size={16} color="white" />
                  Unirse a Club
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {userClubs.map(club => {
                const isActiveClub = currentUser.activeClub === club.id;
                const isAdmin = isClubAdmin(club);
                
                return (
                  <div key={club.id} className="club-card" style={{ 
                    border: isActiveClub ? '2px solid var(--secondary)' : '1px solid var(--border-color)',
                    background: isActiveClub ? 'rgba(16, 185, 129, 0.05)' : 'var(--card-bg)'
                  }}>
                    <div className="club-card-header">
                      <div className="club-info">
                        <div className="club-title">
                          {club.name}
                          {isActiveClub && (
                            <span className="club-badge active">
                              Activo
                            </span>
                          )}
                          {isAdmin && (
                            <span className="club-badge admin">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="club-description">
                          {club.description || 'Sin descripción'}
                        </div>
                        <div className="club-meta">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="users" size={12} color="var(--text-muted)" />
                            {club.members?.length || 0} miembros
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="calendar" size={12} color="var(--text-muted)" />
                            {new Date(club.createdAt).toLocaleDateString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Icon name="profile" size={12} color="var(--text-muted)" />
                            {state.users.find(u => u.id === club.createdBy)?.name || 'Usuario'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="club-actions">
                        {!isActiveClub && (
                          <button
                            onClick={() => handleSetActiveClub(club.id)}
                            style={{
                              padding: '10px 14px',
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'var(--transition)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flex: 1,
                              minWidth: '120px',
                              justifyContent: 'center',
                              boxShadow: 'var(--shadow)'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = 'var(--shadow-lg)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'var(--shadow)';
                            }}
                          >
                            <Icon name="target" size={14} color="white" />
                            Activar
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleManageClub(club)}
                            style={{
                              padding: '10px 14px',
                              border: 'none',
                              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
                              color: 'white',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'var(--transition)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flex: 1,
                              minWidth: '120px',
                              justifyContent: 'center',
                              boxShadow: 'var(--shadow)'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = 'var(--shadow-lg)';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'var(--shadow)';
                            }}
                          >
                            <Icon name="settings" size={14} color="white" />
                            Gestionar
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleLeaveClub(club.id)}
                          style={{
                            padding: '10px 14px',
                            border: '2px solid var(--error)',
                            borderRadius: '8px',
                            background: 'transparent',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flex: 1,
                            minWidth: '120px',
                            justifyContent: 'center',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.target.style.background = 'var(--error)';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.color = 'var(--error)';
                          }}
                        >
                          <Icon name="logout" size={14} color="currentColor" />
                          Salir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clubes Disponibles */}
        {availableClubs.length > 0 && (
          <div className="glass-card" style={{ padding: '20px' }}>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '20px',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Icon name="search" size={20} color="var(--primary)" />
              Clubes Disponibles ({availableClubs.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {availableClubs.map(club => (
                <div key={club.id} className="club-card">
                  <div className="club-card-header">
                    <div className="club-info">
                      <div className="club-title">
                        {club.name}
                      </div>
                      <div className="club-description">
                        {club.description || 'Sin descripción'}
                      </div>
                      <div className="club-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icon name="users" size={12} color="var(--text-muted)" />
                          {club.members?.length || 0} miembros
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Icon name="calendar" size={12} color="var(--text-muted)" />
                          {new Date(club.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="club-actions">
                      <button
                        onClick={() => {
                          setJoinClub({ clubId: club.id, password: '' });
                          setShowJoinForm(true);
                        }}
                        style={{
                          padding: '10px 14px',
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                          color: 'white',
                          borderRadius: '8px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flex: 1,
                          minWidth: '120px',
                          justifyContent: 'center',
                          boxShadow: 'var(--shadow)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'var(--shadow)';
                        }}
                      >
                        <Icon name="users" size={14} color="white" />
                        Unirse
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


// Componente Profile - VERSIÓN COMPLETA Y FUNCIONAL
function Profile() {
  const { state, getters, actions } = useApp();
  const { currentUser } = state;
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    profilePicture: null
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Cargar datos del formulario cuando entra en modo edición
  useEffect(() => {
    if (currentUser && isEditing) {
      setEditForm({
        name: currentUser.name,
        email: currentUser.email,
        profilePicture: currentUser.profilePicture || null
      });
      setPreviewUrl(currentUser.profilePicture || '');
    }
  }, [currentUser, isEditing]);

  // Manejar selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        addToast('Por favor selecciona una imagen válida (JPEG, PNG, etc.)', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        addToast('La imagen debe ser menor a 5MB', 'error');
        return;
      }

      setEditForm({
        ...editForm,
        profilePicture: file
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validaciones básicas
      if (!editForm.name.trim()) {
        addToast('El nombre es requerido', 'error');
        return;
      }

      if (!editForm.email.trim()) {
        addToast('El email es requerido', 'error');
        return;
      }

      await actions.updateUserProfile(currentUser.id, {
        name: editForm.name,
        email: editForm.email,
        profilePicture: previewUrl,
        avatar: '👤',
        updatedAt: new Date().toISOString()
      });
      
      setIsEditing(false);
      addToast('¡Perfil actualizado correctamente!', 'success');
      
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      addToast('Error al actualizar el perfil', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPreviewUrl(currentUser.profilePicture || '');
    setEditForm({
      name: currentUser.name,
      email: currentUser.email,
      profilePicture: currentUser.profilePicture
    });
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        addToast('Las contraseñas no coinciden', 'error');
        return;
      }
      
      if (passwordForm.newPassword.length < 6) {
        addToast('La nueva contraseña debe tener al menos 6 caracteres', 'error');
        return;
      }
      
      // Aquí iría la integración con Firebase Auth para cambiar contraseña
      // Por ahora es una simulación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addToast('Contraseña cambiada exitosamente', 'success');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      addToast('Error al cambiar la contraseña', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      actions.logout();
      addToast('Sesión cerrada correctamente', 'info');
    }
  };

  // Calcular estadísticas globales del usuario
  const calculateGlobalStats = () => {
    const userStats = getters.getUserStats();
    const userTournaments = getters.getTournamentsByClub ? getters.getTournamentsByClub().filter(t => 
      t.players?.includes(currentUser?.id) || 
      t.guestPlayers?.some(guest => guest.includes(currentUser?.name))
    ) : [];

    let totalMatches = 0;
    let totalWins = 0;
    let totalPoints = 0;
    let recentMatches = [];

    userTournaments.forEach(tournament => {
      tournament.matches?.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1?.includes(currentUser?.id) || match.team2?.includes(currentUser?.id))) {
          totalMatches++;
          
          const userTeam = match.team1?.includes(currentUser?.id) ? 'team1' : 'team2';
          const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
          const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
          
          totalPoints += userScore || 0;
          if (userScore > opponentScore) {
            totalWins++;
          }

          // Para estadísticas detalladas
          recentMatches.push({
            userScore: userScore || 0,
            opponentScore: opponentScore || 0,
            won: userScore > opponentScore,
            tournamentName: tournament.name,
            date: match.createdAt
          });
        }
      });
    });

    const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
    const avgPointsPerMatch = totalMatches > 0 ? (totalPoints / totalMatches).toFixed(1) : 0;

    // Estadísticas detalladas
    const bestScore = recentMatches.length > 0 ? Math.max(...recentMatches.map(m => m.userScore)) : 0;
    const worstScore = recentMatches.length > 0 ? Math.min(...recentMatches.map(m => m.userScore)) : 0;
    const avgScoreDifference = recentMatches.length > 0 
      ? (recentMatches.reduce((acc, m) => acc + (m.userScore - m.opponentScore), 0) / recentMatches.length).toFixed(1)
      : 0;

    return {
      totalMatches,
      totalWins,
      totalLosses: totalMatches - totalWins,
      totalPoints,
      winRate: Math.round(winRate),
      avgPointsPerMatch,
      tournamentsCount: userTournaments.length,
      bestScore,
      worstScore,
      avgScoreDifference,
      recentMatches: recentMatches.slice(0, 10)
    };
  };

  // Obtener partidos recientes para la pestaña de Partidos
  const getRecentMatches = () => {
    const recentMatches = [];
    const userTournaments = getters.getTournamentsByClub ? getters.getTournamentsByClub().filter(t => 
      t.players?.includes(currentUser?.id) || 
      t.guestPlayers?.some(guest => guest.includes(currentUser?.name))
    ) : [];

    userTournaments.forEach(tournament => {
      tournament.matches?.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1?.includes(currentUser?.id) || match.team2?.includes(currentUser?.id))) {
          recentMatches.push({
            ...match,
            tournamentName: tournament.name,
            date: match.createdAt
          });
        }
      });
    });

    return recentMatches
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  };

  const globalStats = calculateGlobalStats();
  const recentMatches = getRecentMatches();

  // SISTEMA DE LOGROS MEJORADO - CON PROGRESIÓN
  const achievements = [
    {
      id: 1,
      name: "Primer Partido",
      description: "Completa tu primer partido",
      icon: "target",
      unlocked: globalStats.totalMatches >= 1,
      progress: Math.min((globalStats.totalMatches / 1) * 100, 100),
      requirement: "1 partido"
    },
    {
      id: 2,
      name: "Competidor Activo",
      description: "Juega 5 partidos",
      icon: "tournament",
      unlocked: globalStats.totalMatches >= 5,
      progress: Math.min((globalStats.totalMatches / 5) * 100, 100),
      requirement: "5 partidos"
    },
    {
      id: 3,
      name: "Jugador Experimentado",
      description: "Juega 10 partidos",
      icon: "stats",
      unlocked: globalStats.totalMatches >= 10,
      progress: Math.min((globalStats.totalMatches / 10) * 100, 100),
      requirement: "10 partidos"
    },
    {
      id: 4,
      name: "Primera Victoria",
      description: "Gana tu primer partido",
      icon: "trophy",
      unlocked: globalStats.totalWins >= 1,
      progress: Math.min((globalStats.totalWins / 1) * 100, 100),
      requirement: "1 victoria"
    },
    {
      id: 5,
      name: "Victorioso",
      description: "Gana 3 partidos",
      icon: "check",
      unlocked: globalStats.totalWins >= 3,
      progress: Math.min((globalStats.totalWins / 3) * 100, 100),
      requirement: "3 victorias"
    },
    {
      id: 6,
      name: "Puntaje Alto",
      description: "Anota 4 puntos en un partido",
      icon: "target",
      unlocked: globalStats.bestScore >= 4,
      progress: globalStats.bestScore >= 4 ? 100 : Math.min((globalStats.bestScore / 4) * 100, 100),
      requirement: "4 puntos en un partido"
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '16px',
      paddingBottom: '100px',
      overflowX: 'hidden',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .profile-tabs-container {
          width: 100%;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .profile-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 8px 0;
          width: 100%;
        }

        .tab-button-mobile {
          padding: 10px 4px;
          border: none;
          border-radius: 10px;
          background: var(--card-bg);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--border-color);
          min-height: 55px;
          justify-content: center;
        }

        .tab-button-mobile.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .tab-button-mobile .tab-icon {
          font-size: 14px;
        }

        .tab-button-mobile .tab-label {
          font-size: 10px;
          text-align: center;
          line-height: 1.2;
        }

        .stats-grid-mobile {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }

        .stat-card-mobile {
          background: var(--card-bg);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid var(--border-color);
        }

        .match-card-mobile {
          background: var(--card-bg);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color);
        }

        .achievement-card {
          background: var(--card-bg);
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color);
          opacity: 1;
          transition: all 0.3s ease;
        }

        .achievement-card.locked {
          opacity: 0.6;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: var(--border-color);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--secondary), var(--accent));
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .detailed-stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-top: 16px;
        }

        .detailed-stat {
          background: var(--card-bg);
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid var(--border-color);
        }

        .settings-section {
          background: var(--card-bg);
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid var(--border-color);
        }

        .settings-button {
          width: 100%;
          padding: 16px;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: transparent;
          color: var(--text-primary);
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .settings-button:hover {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.05);
        }

        .settings-button.danger {
          border-color: var(--error);
          color: var(--error);
        }

        .settings-button.danger:hover {
          background: rgba(239, 68, 68, 0.05);
        }
      `}</style>
      
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        {/* Header del Perfil */}
        <div className="glass-card" style={{ 
          padding: '20px',
          marginBottom: '20px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {!isEditing ? (
            // Vista normal del perfil
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div 
                style={{
                  width: '80px',
                  height: '80px',
                  background: currentUser.profilePicture ? 
                    `url(${currentUser.profilePicture}) center/cover` :
                    'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: 'white',
                  border: '3px solid var(--card-bg)',
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                {!currentUser.profilePicture && (
                  <Icon name="profile" size={32} color="white" />
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  marginBottom: '4px',
                  wordWrap: 'break-word'
                }}>
                  {currentUser.name}
                </h1>
                
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  marginBottom: '12px',
                  fontSize: '14px',
                  wordWrap: 'break-word'
                }}>
                  {currentUser.email}
                </p>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      padding: '10px 16px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flex: 1,
                      minWidth: '140px',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow)'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                  >
                    <Icon name="edit" size={16} color="white" />
                    Editar Perfil
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    style={{
                      padding: '10px 16px',
                      border: '2px solid var(--accent)',
                      borderRadius: 'var(--border-radius)',
                      background: 'transparent',
                      color: 'var(--accent)',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flex: 1,
                      minWidth: '140px',
                      transition: 'all 0.3s ease',
                      justifyContent: 'center'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'var(--accent)';
                      e.target.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--accent)';
                    }}
                  >
                    <Icon name="settings" size={16} color="currentColor" />
                    Ajustes
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // FORMULARIO DE EDICIÓN COMPLETO
            <form onSubmit={handleSaveProfile}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                  Editar Perfil
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  <Icon name="close" size={20} color="currentColor" />
                </button>
              </div>

              {/* Avatar y Foto de Perfil */}
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div 
                  onClick={handleAvatarClick}
                  style={{
                    width: '100px',
                    height: '100px',
                    background: previewUrl ? 
                      `url(${previewUrl}) center/cover` :
                      'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    borderRadius: '50%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: 'white',
                    border: '3px solid var(--card-bg)',
                    boxShadow: 'var(--shadow-lg)',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {!previewUrl && <Icon name="profile" size={40} color="white" />}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    Cambiar
                  </div>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: '5px 0 0 0' }}>
                  Haz clic en la imagen para cambiar tu foto
                </p>
              </div>

              {/* Campos del Formulario */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} color="white" />
                      Guardar Cambios
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    flex: 1,
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  <Icon name="close" size={16} color="currentColor" />
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Pestañas de Navegación */}
        <div className="profile-tabs-container">
          <div className="profile-tabs">
            {[
              { id: 'overview', label: 'Resumen', icon: 'summary' },
              { id: 'stats', label: 'Estadísticas', icon: 'stats' },
              { id: 'matches', label: 'Partidos', icon: 'tournament' },
              { id: 'achievements', label: 'Logros', icon: 'starCircle' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button-mobile ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="tab-icon">
                  <Icon name={tab.icon} size={16} color="currentColor" />
                </span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Contenido de las Pestañas */}
        <div>
          {/* Pestaña: RESUMEN */}
          {activeTab === 'overview' && (
            <div>
              <h3 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px'
              }}>
                Resumen de Actividad
              </h3>

              <div className="stats-grid-mobile">
                <div className="stat-card-mobile">
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                    {globalStats.totalMatches}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Partidos Totales
                  </div>
                </div>
                
                <div className="stat-card-mobile">
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--secondary)', marginBottom: '4px' }}>
                    {globalStats.winRate}%
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Tasa de Victorias
                  </div>
                </div>
                
                <div className="stat-card-mobile">
                  <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent)', marginBottom: '4px' }}>
                    {globalStats.avgPointsPerMatch}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Puntos/Partido
                  </div>
                </div>
                
                <div className="stat-card-mobile">
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#8b5cf6', marginBottom: '4px' }}>
                    {globalStats.tournamentsCount}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Torneos
                  </div>
                </div>
              </div>

              {/* Logros Destacados */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                  Logros Destacados
                </h4>
                {unlockedAchievements.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {unlockedAchievements.slice(0, 3).map(achievement => (
                      <div key={achievement.id} className="achievement-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '24px' }}>
                            <Icon name={achievement.icon} size={24} color="var(--secondary)" />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                              {achievement.name}
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                              {achievement.description}
                            </div>
                          </div>
                          <div style={{ 
                            background: 'var(--secondary)', 
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            ¡Desbloqueado!
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '30px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                      <Icon name="trophy" size={48} color="var(--border-color)" />
                    </div>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      Juega partidos para desbloquear logros
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pestaña: ESTADÍSTICAS */}
          {activeTab === 'stats' && (
            <div>
              <h3 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px'
              }}>
                Estadísticas Detalladas
              </h3>

              <div className="detailed-stats-grid">
                <div className="detailed-stat">
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>
                    {globalStats.totalWins}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Victorias
                  </div>
                </div>
                
                <div className="detailed-stat">
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--error)', marginBottom: '4px' }}>
                    {globalStats.totalLosses}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Derrotas
                  </div>
                </div>
                
                <div className="detailed-stat">
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent)', marginBottom: '4px' }}>
                    {globalStats.bestScore}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Mejor Puntuación
                  </div>
                </div>
                
                <div className="detailed-stat">
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#8b5cf6', marginBottom: '4px' }}>
                    {globalStats.worstScore}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                    Peor Puntuación
                  </div>
                </div>
              </div>

              {/* Progreso de Logros */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px', fontSize: '16px' }}>
                  Progreso de Logros
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {achievements.slice(0, 4).map(achievement => (
                    <div key={achievement.id} className={`achievement-card ${achievement.unlocked ? '' : 'locked'}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <div style={{ fontSize: '20px' }}>
                          <Icon name={achievement.icon} size={20} color={achievement.unlocked ? 'var(--secondary)' : 'var(--text-muted)'} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '13px' }}>
                            {achievement.name}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            {achievement.description}
                          </div>
                        </div>
                        <div style={{ 
                          background: achievement.unlocked ? 'var(--secondary)' : 'var(--border-color)',
                          color: achievement.unlocked ? 'white' : 'var(--text-muted)',
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {achievement.unlocked ? '✅' : `${achievement.progress}%`}
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${achievement.progress}%` }}
                        ></div>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>
                        {achievement.requirement}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña: PARTIDOS */}
          {activeTab === 'matches' && (
            <div>
              <h3 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px'
              }}>
                Partidos Recientes
              </h3>

              {recentMatches.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentMatches.map((match, index) => {
                    const userTeam = match.team1?.includes(currentUser?.id) ? 'team1' : 'team2';
                    const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
                    const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
                    const won = userScore > opponentScore;

                    return (
                      <div key={match.id} className="match-card-mobile">
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                            {match.tournamentName}
                          </div>
                          <div style={{ 
                            background: won ? 'var(--secondary)' : 'var(--error)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {won ? 'Ganado' : 'Perdido'}
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Tú: {userScore || 0} - {opponentScore || 0} :Oponente
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                            {new Date(match.date).toLocaleDateString()}
                          </div>
                        </div>

                        <div style={{ 
                          display: 'flex', 
                          gap: '8px',
                          fontSize: '11px',
                          color: 'var(--text-muted)'
                        }}>
                          <span>Partido #{match.id?.toString().slice(-4) || 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px 20px',
                  color: 'var(--text-secondary)'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                    <Icon name="tournament" size={48} color="var(--border-color)" />
                  </div>
                  <h4 style={{ marginBottom: '8px', fontSize: '16px' }}>No hay partidos recientes</h4>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Participa en torneos para ver tus partidos aquí
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pestaña: LOGROS */}
          {activeTab === 'achievements' && (
            <div>
              <h3 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px'
              }}>
                Todos los Logros
              </h3>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px',
                padding: '12px',
                background: 'var(--card-bg)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                    Progreso General
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {unlockedAchievements.length} de {achievements.length} logros desbloqueados
                  </div>
                </div>
                <div style={{ 
                  background: 'var(--primary)', 
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700'
                }}>
                  {Math.round((unlockedAchievements.length / achievements.length) * 100)}%
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {achievements.map(achievement => (
                  <div key={achievement.id} className={`achievement-card ${achievement.unlocked ? '' : 'locked'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '24px' }}>
                        <Icon name={achievement.icon} size={24} color={achievement.unlocked ? 'var(--secondary)' : 'var(--text-muted)'} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                          {achievement.name}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                          {achievement.description}
                        </div>
                      </div>
                      <div style={{ 
                        background: achievement.unlocked ? 'var(--secondary)' : 'var(--border-color)',
                        color: achievement.unlocked ? 'white' : 'var(--text-muted)',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '600',
                        minWidth: '60px',
                        textAlign: 'center'
                      }}>
                        {achievement.unlocked ? '✅' : `${achievement.progress}%`}
                      </div>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${achievement.progress}%` }}
                      ></div>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)', 
                      fontSize: '10px', 
                      marginTop: '4px' 
                    }}>
                      <span>{achievement.requirement}</span>
                      <span>{achievement.unlocked ? 'Completado' : 'En progreso'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pestaña: AJUSTES */}
          {activeTab === 'settings' && (
            <div>
              <h3 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '20px',
                fontSize: '18px'
              }}>
                Configuración
              </h3>

              <div className="settings-section">
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
                  Apariencia
                </h4>
                <button
                  onClick={toggleTheme}
                  className="settings-button"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="settings" size={18} color="currentColor" />
                    Tema Actual: {theme === 'light' ? 'Claro' : 'Oscuro'}
                  </span>
                  <span>Cambiar</span>
                </button>
              </div>

              <div className="settings-section">
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
                  Seguridad
                </h4>
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="settings-button"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="lock" size={18} color="currentColor" />
                    Cambiar Contraseña
                  </span>
                  <span>→</span>
                </button>
              </div>

              <div className="settings-section">
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '16px' }}>
                  Cuenta
                </h4>
                <button
                  onClick={handleLogout}
                  className="settings-button danger"
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon name="logout" size={18} color="currentColor" />
                    Cerrar Sesión
                  </span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para cambiar contraseña */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ 
            padding: '24px', 
            maxWidth: '400px', 
            width: '100%'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                <Icon name="lock" size={20} color="var(--primary)" style={{ marginRight: '8px' }} />
                Cambiar Contraseña
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                disabled={isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '5px'
                }}
              >
                <Icon name="close" size={20} color="currentColor" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Cambiando...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} color="white" />
                      Cambiar Contraseña
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={isLoading}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function TournamentDetail() {
  const { id } = useParams();
  const { getters, state, actions } = useApp();
  const { addToast } = useToast();
  const { navigateWithTransition } = useNavigation();
  
  const [activeTab, setActiveTab] = useState('matches');
  const [isLoading, setIsLoading] = useState(false);
  const [tournamentData, setTournamentData] = useState(null);

  const tournament = getters.getTournamentById(id);

  useEffect(() => {
    if (tournament) {
      setTournamentData(tournament);
    }
  }, [tournament]);

  const getPlayerName = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      const guestIndex = parseInt(playerId.split('-')[1]);
      return tournamentData.guestPlayers[guestIndex] + ' (Invitado)';
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? player.name : 'Jugador no encontrado';
  };

  const getPlayerAvatar = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      return '👤';
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? (player.avatar || '👤') : '👤';
  };

  // ✅ NUEVA FUNCIÓN: Obtener imagen de perfil del usuario
  const getPlayerProfilePicture = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      return null; // Invitados no tienen foto de perfil
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? player.profilePicture : null;
  };

  const calculateTournamentStats = () => {
    if (!tournamentData) return null;

    const completedMatches = tournamentData.matches?.filter(m => m.status === 'completed') || [];
    const pendingMatches = tournamentData.matches?.filter(m => m.status === 'pending') || [];
    
    const playerStats = {};
    const allPlayers = [...tournamentData.players, ...tournamentData.guestPlayers.map((_, idx) => `guest-${idx}`)];

    allPlayers.forEach(playerId => {
      playerStats[playerId] = {
        id: playerId,
        name: getPlayerName(playerId),
        matchesPlayed: 0,
        matchesWon: 0,
        totalPoints: 0,
        pointsAgainst: 0,
        profilePicture: getPlayerProfilePicture(playerId) // ✅ Añadir foto de perfil
      };
    });

    completedMatches.forEach(match => {
      match.team1?.forEach(playerId => {
        if (playerStats[playerId]) {
          playerStats[playerId].matchesPlayed++;
          playerStats[playerId].totalPoints += match.scoreTeam1 || 0;
          playerStats[playerId].pointsAgainst += match.scoreTeam2 || 0;
          if (match.scoreTeam1 > match.scoreTeam2) {
            playerStats[playerId].matchesWon++;
          }
        }
      });

      match.team2?.forEach(playerId => {
        if (playerStats[playerId]) {
          playerStats[playerId].matchesPlayed++;
          playerStats[playerId].totalPoints += match.scoreTeam2 || 0;
          playerStats[playerId].pointsAgainst += match.scoreTeam1 || 0;
          if (match.scoreTeam2 > match.scoreTeam1) {
            playerStats[playerId].matchesWon++;
          }
        }
      });
    });

    Object.values(playerStats).forEach(player => {
      player.winRate = player.matchesPlayed > 0 ? (player.matchesWon / player.matchesPlayed) * 100 : 0;
      player.avgPointsPerMatch = player.matchesPlayed > 0 ? (player.totalPoints / player.matchesPlayed).toFixed(1) : 0;
      player.pointDifference = player.totalPoints - player.pointsAgainst;
    });

    const ranking = Object.values(playerStats)
      .sort((a, b) => {
        if (parseFloat(b.avgPointsPerMatch) !== parseFloat(a.avgPointsPerMatch)) {
          return parseFloat(b.avgPointsPerMatch) - parseFloat(a.avgPointsPerMatch);
        }
        return b.winRate - a.winRate;
      });

    return {
      totalMatches: tournamentData.matches?.length || 0,
      completedMatches: completedMatches.length,
      pendingMatches: pendingMatches.length,
      totalPlayers: allPlayers.length,
      ranking,
      completedMatchesList: completedMatches,
      pendingMatchesList: pendingMatches
    };
  };

  const handleCompleteTournament = async () => {
    if (!window.confirm('¿Estás seguro de que quieres marcar este torneo como completado?\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    setIsLoading(true);
    try {
      await actions.completeTournament(tournamentData.id);
      addToast('¡Torneo marcado como completado! 🏆', 'success');
    } catch (error) {
      addToast('Error al completar el torneo: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!window.confirm('¿Estás seguro de que quieres ELIMINAR este torneo?\n\n⚠️ Esta acción NO se puede deshacer y se perderán todos los datos.')) {
      return;
    }

    setIsLoading(true);
    try {
      await actions.deleteTournament(tournamentData.id);
      addToast('¡Torneo eliminado correctamente!', 'success');
      navigateWithTransition('/tournaments', {
        message: 'Redirigiendo a torneos...'
      });
    } catch (error) {
      addToast('Error al eliminar el torneo: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!tournamentData) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)'
      }}>
        <div className="glass-card" style={{ padding: '40px', display: 'inline-block' }}>
          <Icon name="tournament" size={48} color="var(--primary)" />
          <h2 style={{ margin: '20px 0 10px 0' }}>Torneo no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            El torneo que buscas no existe o fue eliminado
          </p>
          <button
            onClick={() => navigateWithTransition('/tournaments')}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="tournament" size={16} color="white" />
            Volver a Torneos
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateTournamentStats();
  const isCreator = tournamentData.createdBy === state.currentUser?.id;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '20px',
      paddingBottom: '100px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header del Torneo - BOTONES CON ESTILO UNIFICADO */}
        <div className="glass-card animate-fadeInUp" style={{ 
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'flex-start',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <h1 style={{ 
                  fontSize: '24px', 
                  fontWeight: '700', 
                  color: 'var(--text-primary)',
                  margin: 0
                }}>
                  {tournamentData.name}
                </h1>
                <span style={{ 
                  background: tournamentData.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {tournamentData.status === 'active' ? 'Activo' : 'Completado'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="users" size={14} color="var(--text-secondary)" />
                  {stats?.totalPlayers || 0} jugadores
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="tournament" size={14} color="var(--text-secondary)" />
                  {stats?.totalMatches || 0} partidos
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icon name="calendar" size={14} color="var(--text-secondary)" />
                  {new Date(tournamentData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* ✅ CORRECCIÓN: Botones con estilo consistente como en ClubManagement */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {tournamentData.status === 'active' && (
                <>
                  <button
                    onClick={() => navigateWithTransition(`/tournament/${id}/play`)}
                    style={{
                      padding: '12px 20px',
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                      color: 'white',
                      borderRadius: 'var(--border-radius)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: 'var(--shadow)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }}
                  >
                    <Icon name="tournament" size={16} color="white" />
                    Jugar
                  </button>
                  
                  {isCreator && (
                    <button
                      onClick={handleCompleteTournament}
                      disabled={isLoading}
                      style={{
                        padding: '12px 20px',
                        border: 'none',
                        background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                        color: 'white',
                        borderRadius: 'var(--border-radius)',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: 'var(--shadow)',
                        whiteSpace: 'nowrap',
                        opacity: isLoading ? 0.7 : 1
                      }}
                      onMouseOver={(e) => {
                        if (!isLoading) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = 'var(--shadow-lg)';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isLoading) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'var(--shadow)';
                        }
                      }}
                    >
                      {isLoading ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid transparent',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Icon name="check" size={16} color="white" />
                          Completar
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
              
              {isCreator && (
                <button
                  onClick={handleDeleteTournament}
                  disabled={isLoading}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--error)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--error)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) {
                      e.target.style.background = 'var(--error)';
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading) {
                      e.target.style.background = 'transparent';
                      e.target.style.color = 'var(--error)';
                    }
                  }}
                >
                  <Icon name="delete" size={16} color="currentColor" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-color)'
          }}>
            {[
              { id: 'matches', label: 'Partidos', icon: 'tournament' },
              { id: 'ranking', label: 'Ranking', icon: 'trophy' },
              { id: 'history', label: 'Historial', icon: 'history' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '16px 12px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'var(--transition)',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Icon name={tab.icon} size={16} color={activeTab === tab.id ? 'white' : 'currentColor'} />
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '24px' }}>
            
            {/* Pestaña: PARTIDOS - VERSIÓN MEJORADA SIN REDUNDANCIA */}
            {activeTab === 'matches' && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                    Resumen de Partidos
                  </h3>
                </div>

                {stats?.completedMatches === 0 && stats?.pendingMatches === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '60px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    {/* ✅ CORRECCIÓN: Icono grande de tournaments */}
                    <div style={{ fontSize: '80px', marginBottom: '20px' }}>
                      <Icon name="tournament" size={80} color="var(--border-color)" />
                    </div>
                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '18px', color: 'var(--text-primary)' }}>
                      No hay partidos
                    </h4>
                    <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                      {tournamentData.status === 'active' 
                        ? 'Comienza a jugar partidos para verlos aquí' 
                        : 'Este torneo no tuvo partidos'
                      }
                    </p>
                    {tournamentData.status === 'active' && (
                      <button
                        onClick={() => navigateWithTransition(`/tournament/${id}/play`)}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          color: 'white',
                          borderRadius: 'var(--border-radius)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: 'var(--shadow)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'var(--shadow)';
                        }}
                      >
                        <Icon name="tournament" size={16} color="white" />
                        Comenzar a Jugar
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--bg-secondary)', 
                    padding: '30px', 
                    borderRadius: 'var(--border-radius)',
                    textAlign: 'center'
                  }}>
                    {/* ✅ CORRECCIÓN: Icono grande centrado */}
                    <div style={{ fontSize: '64px', marginBottom: '20px' }}>
                      <Icon name="tournament" size={64} color="var(--primary)" />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--secondary)', marginBottom: '8px' }}>
                          {stats?.completedMatches || 0}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          Partidos Completados
                        </div>
                      </div>
                      <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--accent)', marginBottom: '8px' }}>
                          {stats?.pendingMatches || 0}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                          Partidos Pendientes
                        </div>
                      </div>
                    </div>
                    
                    {tournamentData.status === 'active' && stats?.pendingMatches > 0 && (
                      <button
                        onClick={() => navigateWithTransition(`/tournament/${id}/play`)}
                        style={{
                          padding: '12px 24px',
                          border: 'none',
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          color: 'white',
                          borderRadius: 'var(--border-radius)',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'var(--transition)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: 'var(--shadow)',
                          margin: '0 auto'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = 'var(--shadow-lg)';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = 'var(--shadow)';
                        }}
                      >
                        <Icon name="tournament" size={16} color="white" />
                        Ir a Jugar Partidos
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: RANKING - CON FOTOS DE PERFIL */}
            {activeTab === 'ranking' && (
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '18px' }}>
                  Ranking del Torneo
                </h3>

                {stats?.ranking && stats.ranking.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {stats.ranking.map((player, index) => (
                      <div key={player.id} className="glass-card animate-fadeInUp" style={{ 
                        padding: '12px',
                        animationDelay: `${index * 0.1}s`,
                        borderLeft: index < 3 ? `4px solid ${
                          index === 0 ? '#f59e0b' : 
                          index === 1 ? '#9ca3af' : 
                          '#b45309'
                        }` : '4px solid transparent'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Posición */}
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: index === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                      index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : 
                                      index === 2 ? 'linear-gradient(135deg, #b45309, #92400e)' : 
                                      'var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '12px',
                            flexShrink: 0
                          }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                          </div>

                          {/* ✅ CORRECCIÓN: Avatar con foto de perfil real */}
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: player.profilePicture ? 
                              `url(${player.profilePicture}) center/cover` :
                              'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: player.profilePicture ? '0' : '14px',
                            fontWeight: '600',
                            border: '2px solid var(--card-bg)',
                            flexShrink: 0
                          }}>
                            {!player.profilePicture && getPlayerAvatar(player.id)}
                          </div>

                          {/* Información del Jugador */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                              color: 'var(--text-primary)', 
                              fontWeight: '600',
                              fontSize: '14px',
                              marginBottom: '2px',
                              wordWrap: 'break-word'
                            }}>
                              {player.name}
                            </div>
                            <div style={{ 
                              display: 'flex', 
                              gap: '8px',
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              flexWrap: 'wrap'
                            }}>
                              <span>Win Rate: {Math.round(player.winRate)}%</span>
                              <span>Victorias: {player.matchesWon}/{player.matchesPlayed}</span>
                            </div>
                          </div>

                          {/* Puntos por Partido */}
                          <div style={{ 
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            flexShrink: 0,
                            textAlign: 'center',
                            minWidth: '60px'
                          }}>
                            <div style={{ fontSize: '10px', opacity: 0.9 }}>Pts/Partido</div>
                            <div>{player.avgPointsPerMatch}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <Icon name="trophy" size={48} color="var(--border-color)" />
                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '16px' }}>No hay datos de ranking</h4>
                    <p style={{ fontSize: '14px' }}>
                      Juega algunos partidos para generar el ranking
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: HISTORIAL - CON FOTOS DE PERFIL */}
            {activeTab === 'history' && (
              <div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px', fontSize: '18px' }}>
                  Historial de Partidos
                </h3>

                {stats?.completedMatchesList && stats.completedMatchesList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {stats.completedMatchesList.map((match, index) => {
                      const userTeam = match.team1?.includes(state.currentUser?.id) ? 'team1' : 'team2';
                      const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
                      const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
                      const won = userScore > opponentScore;

                      return (
                        <div key={match.id} className="glass-card animate-fadeInUp" style={{ 
                          padding: '16px',
                          animationDelay: `${index * 0.1}s`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ 
                                background: won ? 'var(--secondary)' : 'var(--error)',
                                color: 'white',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {won ? 'Victoria' : 'Derrota'}
                              </span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                {new Date(match.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div style={{ 
                              background: 'var(--primary)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '700'
                            }}>
                              {match.scoreTeam1} - {match.scoreTeam2}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px' }}>
                            {/* Equipo 1 */}
                            <div style={{ textAlign: 'right' }}>
                              {match.team1?.map(playerId => (
                                <div key={playerId} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  justifyContent: 'flex-end',
                                  marginBottom: '6px'
                                }}>
                                  <span style={{ 
                                    color: 'var(--text-primary)',
                                    fontWeight: match.scoreTeam1 > match.scoreTeam2 ? '700' : '400',
                                    fontSize: '13px'
                                  }}>
                                    {getPlayerName(playerId)}
                                  </span>
                                  {/* ✅ CORRECCIÓN: Avatar con foto de perfil real */}
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: getPlayerProfilePicture(playerId) ? 
                                      `url(${getPlayerProfilePicture(playerId)}) center/cover` :
                                      'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: getPlayerProfilePicture(playerId) ? '0' : '11px',
                                    fontWeight: '600',
                                    border: '2px solid var(--card-bg)'
                                  }}>
                                    {!getPlayerProfilePicture(playerId) && getPlayerAvatar(playerId)}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* VS */}
                            <div style={{ 
                              background: 'var(--primary)',
                              color: 'white',
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '700'
                            }}>
                              VS
                            </div>

                            {/* Equipo 2 */}
                            <div>
                              {match.team2?.map(playerId => (
                                <div key={playerId} style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  marginBottom: '6px'
                                }}>
                                  {/* ✅ CORRECCIÓN: Avatar con foto de perfil real */}
                                  <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: getPlayerProfilePicture(playerId) ? 
                                      `url(${getPlayerProfilePicture(playerId)}) center/cover` :
                                      'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: getPlayerProfilePicture(playerId) ? '0' : '11px',
                                    fontWeight: '600',
                                    border: '2px solid var(--card-bg)'
                                  }}>
                                    {!getPlayerProfilePicture(playerId) && getPlayerAvatar(playerId)}
                                  </div>
                                  <span style={{ 
                                    color: 'var(--text-primary)',
                                    fontWeight: match.scoreTeam2 > match.scoreTeam1 ? '700' : '400',
                                    fontSize: '13px'
                                  }}>
                                    {getPlayerName(playerId)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <Icon name="history" size={48} color="var(--border-color)" />
                    <h4 style={{ margin: '16px 0 8px 0', fontSize: '16px' }}>No hay historial</h4>
                    <p style={{ fontSize: '14px' }}>
                      Los partidos completados aparecerán aquí
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}


function TournamentPlay() {
  const { id } = useParams();
  const { getters, state, actions } = useApp();
  const { addToast } = useToast();
  const { navigateWithTransition } = useNavigation();
  
  const tournament = getters.getTournamentById(id);
  const [editingScores, setEditingScores] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localTournament, setLocalTournament] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tournament) {
      setLocalTournament(tournament);
    }
  }, [tournament]);

  const getPlayerName = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      const guestIndex = parseInt(playerId.split('-')[1]);
      return localTournament.guestPlayers[guestIndex] + ' (Invitado)';
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? player.name : 'Jugador no encontrado';
  };

  const getPlayerAvatar = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      return '👤';
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? (player.avatar || '👤') : '👤';
  };

  // ✅ NUEVA FUNCIÓN: Obtener imagen de perfil del usuario
  const getPlayerProfilePicture = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      return null;
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? player.profilePicture : null;
  };

  const getWaitingPlayers = (match) => {
    const allPlayers = [...localTournament.players, ...localTournament.guestPlayers.map((_, idx) => `guest-${idx}`)];
    const playingPlayers = [...(match.team1 || []), ...(match.team2 || [])];
    return allPlayers.filter(player => !playingPlayers.includes(player));
  };

  const handleScoreChange = (matchId, team, value) => {
    if (localTournament.status === 'completed') {
      addToast('No puedes editar partidos en un torneo completado', 'warning');
      return;
    }

    const newEditingScores = {
      ...editingScores,
      [matchId]: {
        ...editingScores[matchId],
        [team]: value,
        [team === 'team1' ? 'team2' : 'team1']: value === '' ? '' : (4 - parseInt(value)).toString()
      }
    };
    
    setEditingScores(newEditingScores);
    setHasUnsavedChanges(true);
  };

  const saveAllScores = async () => {
    if (localTournament.status === 'completed') {
      addToast('No puedes guardar cambios en un torneo completado', 'warning');
      return;
    }

    let hasErrors = false;
    const errors = [];

    Object.entries(editingScores).forEach(([matchId, scores]) => {
      if (!scores.team1 || !scores.team2) {
        errors.push(`Partido ${matchId}: Faltan puntuaciones`);
        hasErrors = true;
        return;
      }

      const score1 = parseInt(scores.team1);
      const score2 = parseInt(scores.team2);

      if (isNaN(score1) || isNaN(score2)) {
        errors.push(`Partido ${matchId}: Puntuaciones no válidas`);
        hasErrors = true;
        return;
      }

      if (score1 + score2 !== 4) {
        errors.push(`Partido ${matchId}: La suma debe ser 4 (${score1 + score2})`);
        hasErrors = true;
      }
    });

    if (hasErrors) {
      addToast('Errores encontrados:\n' + errors.join('\n'), 'error');
      return;
    }

    setIsLoading(true);
    try {
      console.log('💾 Guardando TODAS las puntuaciones...');
      
      const updatedMatches = localTournament.matches.map(match => {
        const matchScores = editingScores[match.id];
        if (matchScores && matchScores.team1 && matchScores.team2) {
          console.log(`🔄 Actualizando partido ${match.id}: ${matchScores.team1}-${matchScores.team2}`);
          return {
            ...match,
            scoreTeam1: parseInt(matchScores.team1),
            scoreTeam2: parseInt(matchScores.team2),
            status: 'completed'
          };
        }
        return match;
      });

      await actions.updateTournament(localTournament.id, {
        matches: updatedMatches
      });

      setEditingScores({});
      setHasUnsavedChanges(false);
      
      const updatedCount = Object.keys(editingScores).length;
      addToast(`¡${updatedCount} partido${updatedCount > 1 ? 's' : ''} guardado${updatedCount > 1 ? 's' : ''} correctamente! ✅`, 'success');
      
      setTimeout(() => {
        navigateWithTransition(`/tournament/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error guardando puntuaciones:', error);
      addToast('Error al guardar las puntuaciones: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSingleMatch = async (matchId) => {
    const scores = editingScores[matchId];
    
    if (!scores || !scores.team1 || !scores.team2) {
      addToast('Completa las puntuaciones primero', 'warning');
      return;
    }

    const score1 = parseInt(scores.team1);
    const score2 = parseInt(scores.team2);

    if (isNaN(score1) || isNaN(score2)) {
      addToast('Puntuaciones no válidas', 'error');
      return;
    }

    if (score1 + score2 !== 4) {
      addToast('La suma de las puntuaciones debe ser 4', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await actions.updateMatchScore(localTournament.id, matchId, {
        scoreTeam1: score1,
        scoreTeam2: score2,
        status: 'completed'
      });

      const newEditingScores = { ...editingScores };
      delete newEditingScores[matchId];
      setEditingScores(newEditingScores);
      
      const hasRemainingChanges = Object.keys(newEditingScores).length > 0;
      setHasUnsavedChanges(hasRemainingChanges);
      
      addToast('¡Partido guardado correctamente! ✅', 'success');
      
    } catch (error) {
      console.error('❌ Error guardando partido:', error);
      addToast('Error al guardar el partido: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEditing = () => {
    setEditingScores({});
    setHasUnsavedChanges(false);
    addToast('Cambios cancelados', 'info');
  };

  const addAdditionalMatch = async () => {
    if (localTournament.status === 'completed') {
      addToast('No puedes añadir partidos a un torneo completado', 'warning');
      return;
    }

    const allPlayers = [...localTournament.players, ...localTournament.guestPlayers.map((_, idx) => `guest-${idx}`)];
    
    if (allPlayers.length < 4) {
      addToast('Se necesitan al menos 4 jugadores para crear un partido', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const newMatch = generateBalancedMatch(allPlayers, localTournament.matches);
      
      await actions.addTournamentMatch(localTournament.id, {
        ...newMatch,
        id: `match-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      addToast('¡Partido adicional añadido!', 'success');
    } catch (error) {
      console.error('❌ Error añadiendo partido:', error);
      addToast('Error al añadir partido: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const generateBalancedMatch = (allPlayers, existingMatches) => {
    if (allPlayers.length < 4) {
      const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
      return {
        team1: shuffled.slice(0, 2),
        team2: shuffled.slice(2, 4),
        scoreTeam1: null,
        scoreTeam2: null
      };
    }

    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    return {
      team1: shuffled.slice(0, 2),
      team2: shuffled.slice(2, 4),
      scoreTeam1: null,
      scoreTeam2: null
    };
  };

  const handleDeleteMatch = async (matchId) => {
    if (localTournament.status === 'completed') {
      addToast('No puedes eliminar partidos en un torneo completado', 'warning');
      return;
    }

    if (!window.confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      return;
    }

    setIsLoading(true);
    try {
      const updatedMatches = localTournament.matches.filter(match => match.id !== matchId);
      await actions.updateTournament(localTournament.id, { matches: updatedMatches });
      addToast('Partido eliminado correctamente 🗑️', 'info');
    } catch (error) {
      console.error('❌ Error eliminando partido:', error);
      addToast('Error al eliminar partido: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!localTournament) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)'
      }}>
        <div className="glass-card" style={{ padding: '40px', display: 'inline-block' }}>
          <Icon name="tournament" size={48} color="var(--primary)" />
          <h2 style={{ margin: '20px 0 10px 0' }}>Torneo no encontrado</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            El torneo que buscas no existe o fue eliminado
          </p>
          <button
            onClick={() => navigateWithTransition('/tournaments')}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="tournament" size={16} color="white" />
            Volver a Torneos
          </button>
        </div>
      </div>
    );
  }

  const pendingMatches = localTournament.matches?.filter(match => match.status === 'pending') || [];

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '0',
      paddingBottom: '100px'
    }}>
      
      {/* Header Fijo */}
      <div className="glass-card" style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        borderRadius: '0',
        marginBottom: '0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigateWithTransition(`/tournament/${id}`)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                padding: '8px',
                borderRadius: 'var(--border-radius)',
                transition: 'var(--transition)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'var(--bg-secondary)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'none';
              }}
            >
              ←
            </button>
            <div>
              <h1 style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {localTournament.name}
              </h1>
              <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '12px',
                margin: 0
              }}>
                Partidos Pendientes: {pendingMatches.length}
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ 
              background: localTournament.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {localTournament.status === 'active' ? 'Activo' : 'Completado'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>

        {/* ✅ CORRECCIÓN: Botones con estilo unificado */}
        {localTournament.status === 'active' && (
          <div className="glass-card animate-fadeInUp" style={{ 
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <button
              onClick={addAdditionalMatch}
              disabled={isLoading}
              style={{
                padding: '12px 20px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
                color: 'white',
                borderRadius: 'var(--border-radius)',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'var(--transition)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow)',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = 'var(--shadow-lg)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'var(--shadow)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Añadiendo...
                </>
              ) : (
                <>
                  <Icon name="add" size={16} color="white" />
                  Añadir Partido
                </>
              )}
            </button>

            {hasUnsavedChanges && (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {Object.keys(editingScores).length} partido(s) con cambios
                </span>
                <button
                  onClick={saveAllScores}
                  disabled={isLoading}
                  style={{
                    padding: '12px 20px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                    color: 'white',
                    borderRadius: 'var(--border-radius)',
                    fontWeight: '600',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'var(--transition)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: 'var(--shadow)',
                    opacity: isLoading ? 0.7 : 1
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = 'var(--shadow-lg)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'var(--shadow)';
                    }
                  }}
                >
                  {isLoading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={16} color="white" />
                      Guardar Todo
                    </>
                  )}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={isLoading}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: isLoading ? 0.7 : 1,
                    transition: 'var(--transition)'
                  }}
                  onMouseOver={(e) => {
                    if (!isLoading) {
                      e.target.style.background = 'var(--bg-secondary)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isLoading) {
                      e.target.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon name="close" size={16} color="currentColor" />
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lista de Partidos Pendientes */}
        {pendingMatches.length === 0 ? (
          <div className="glass-card animate-fadeInUp" style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>
              <Icon name="trophy" size={64} color="var(--border-color)" />
            </div>
            <h3 style={{ marginBottom: '12px', fontSize: '20px', color: 'var(--text-primary)' }}>
              ¡No hay partidos pendientes!
            </h3>
            <p style={{ marginBottom: '24px', fontSize: '16px' }}>
              Todos los partidos han sido completados.
            </p>
            {localTournament.status === 'active' && (
              <button
                onClick={addAdditionalMatch}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white',
                  borderRadius: 'var(--border-radius)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow)',
                  margin: '0 auto'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'var(--shadow)';
                }}
              >
                <Icon name="add" size={16} color="white" />
                Crear Nuevo Partido
              </button>
            )}
            <div style={{ marginTop: '20px' }}>
              <button
                onClick={() => navigateWithTransition(`/tournament/${id}`)}
                style={{
                  padding: '10px 20px',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'var(--transition)'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'var(--bg-secondary)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                <Icon name="tournament" size={16} color="var(--primary)" />
                Ver Detalles del Torneo
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
            {pendingMatches.map((match, index) => {
              const currentScores = editingScores[match.id] || {};
              const score1 = currentScores.team1 || '';
              const score2 = currentScores.team2 || '';
              const isValidScore = score1 && score2 && (parseInt(score1) + parseInt(score2) === 4);

              return (
                <div key={match.id} className="glass-card animate-fadeInUp" style={{
                  padding: '0',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                  overflow: 'hidden',
                  animationDelay: `${index * 0.1}s`
                }}>
                  
                  {/* ✅ CORRECCIÓN: CANCHA DE PÁDEL REALISTA */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1e40af, #1e3a8a)',
                    padding: '20px 15px',
                    position: 'relative',
                    minHeight: '200px',
                    width: '100%'
                  }}>
                    {/* Línea central vertical (red) */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: 'rgba(255,255,255,0.6)',
                      transform: 'translateX(-50%)'
                    }}></div>
                    
                    {/* Línea central horizontal (llega hasta las líneas de servicio) */}
                    <div style={{
                      position: 'absolute',
                      left: '25%',
                      right: '25%',
                      top: '50%',
                      height: '2px',
                      background: 'rgba(255,255,255,0.6)',
                      transform: 'translateY(-50%)'
                    }}></div>

                    {/* Líneas de servicio izquierdas */}
                    <div style={{
                      position: 'absolute',
                      left: '25%',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: 'rgba(255,255,255,0.4)'
                    }}></div>

                    {/* Líneas de servicio derechas */}
                    <div style={{
                      position: 'absolute',
                      right: '25%',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: 'rgba(255,255,255,0.4)'
                    }}></div>

                    {/* Equipo 1 (Izquierda) */}
                    <div style={{
                      position: 'absolute',
                      left: '2%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '46%'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {match.team1?.map(playerId => (
                          <div key={playerId} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px'
                          }}>
                            {/* ✅ CORRECCIÓN: Avatar con foto de perfil real */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: getPlayerProfilePicture(playerId) ? 
                                `url(${getPlayerProfilePicture(playerId)}) center/cover` :
                                'linear-gradient(135deg, #ef4444, #dc2626)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: getPlayerProfilePicture(playerId) ? '0' : '16px',
                              fontWeight: '600',
                              border: '2px solid white',
                              boxShadow: 'var(--shadow)'
                            }}>
                              {!getPlayerProfilePicture(playerId) && getPlayerAvatar(playerId)}
                            </div>
                            <span style={{ 
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '14px',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                            }}>
                              {getPlayerName(playerId)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Equipo 2 (Derecha) */}
                    <div style={{
                      position: 'absolute',
                      right: '2%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '46%'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {match.team2?.map(playerId => (
                          <div key={playerId} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            justifyContent: 'flex-end'
                          }}>
                            <span style={{ 
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '14px',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                              textAlign: 'right'
                            }}>
                              {getPlayerName(playerId)}
                            </span>
                            {/* ✅ CORRECCIÓN: Avatar con foto de perfil real */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: getPlayerProfilePicture(playerId) ? 
                                `url(${getPlayerProfilePicture(playerId)}) center/cover` :
                                'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: getPlayerProfilePicture(playerId) ? '0' : '16px',
                              fontWeight: '600',
                              border: '2px solid white',
                              boxShadow: 'var(--shadow)'
                            }}>
                              {!getPlayerProfilePicture(playerId) && getPlayerAvatar(playerId)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Marcador */}
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(255, 255, 255, 0.95)',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      minWidth: '160px',
                      justifyContent: 'center',
                      boxShadow: 'var(--shadow)'
                    }}>
                      <select
                        value={score1}
                        onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          border: '2px solid #dc2626',
                          borderRadius: '8px',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: '700',
                          fontSize: '14px',
                          minWidth: '60px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#fecaca';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#fef2f2';
                        }}
                      >
                        <option value="">-</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>

                      <div style={{ color: '#1e40af', fontWeight: '700', fontSize: '16px' }}>-</div>

                      <select
                        value={score2}
                        onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                        style={{
                          padding: '8px 10px',
                          border: '2px solid #1d4ed8',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#1d4ed8',
                          fontWeight: '700',
                          fontSize: '14px',
                          minWidth: '60px',
                          cursor: 'pointer',
                          transition: 'var(--transition)'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = '#dbeafe';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = '#eff6ff';
                        }}
                      >
                        <option value="">-</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>
                    </div>

                    {/* ✅ BOTÓN INDIVIDUAL DE GUARDADO */}
                    <div style={{
                      position: 'absolute',
                      bottom: '15px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {/* Validación */}
                      {score1 && score2 && (
                        <div style={{
                          background: isValidScore ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                          boxShadow: 'var(--shadow)'
                        }}>
                          {isValidScore ? '✅ Listo para guardar' : '❌ Suma debe ser 4'}
                        </div>
                      )}
                      
                      {/* Botón Guardar Individual */}
                      {(score1 || score2) && (
                        <button
                          onClick={() => saveSingleMatch(match.id)}
                          disabled={!isValidScore || isLoading}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '8px',
                            background: isValidScore ? 'var(--secondary)' : '#9ca3af',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: isValidScore && !isLoading ? 'pointer' : 'not-allowed',
                            transition: 'var(--transition)',
                            whiteSpace: 'nowrap',
                            boxShadow: 'var(--shadow)',
                            opacity: isLoading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          onMouseOver={(e) => {
                            if (isValidScore && !isLoading) {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = 'var(--shadow-lg)';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (isValidScore && !isLoading) {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'var(--shadow)';
                            }
                          }}
                        >
                          {isLoading ? (
                            <>
                              <div style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Icon name="check" size={14} color="white" />
                              Guardar Este Partido
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ✅ CORRECCIÓN: Sección unificada con Jugadores en Espera y Eliminar */}
                  {(getWaitingPlayers(match).length > 0 || localTournament.status === 'active') && (
                    <div style={{ 
                      padding: '16px',
                      background: 'var(--bg-secondary)',
                      borderTop: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      {/* Jugadores en Espera */}
                      {getWaitingPlayers(match).length > 0 && (
                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            marginBottom: '8px'
                          }}>
                            <Icon name="users" size={16} color="var(--text-secondary)" />
                            <span style={{ 
                              color: 'var(--text-primary)', 
                              fontSize: '14px',
                              fontWeight: '600'
                            }}>
                              Jugadores en espera: {getWaitingPlayers(match).length}
                            </span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexWrap: 'wrap', 
                            gap: '6px'
                          }}>
                            {getWaitingPlayers(match).map(playerId => (
                              <span
                                key={playerId}
                                style={{
                                  padding: '4px 8px',
                                  background: 'var(--card-bg)',
                                  color: 'var(--text-secondary)',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: getPlayerProfilePicture(playerId) ? 
                                    `url(${getPlayerProfilePicture(playerId)}) center/cover` :
                                    'var(--primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: getPlayerProfilePicture(playerId) ? '0' : '10px'
                                }}>
                                  {!getPlayerProfilePicture(playerId) && getPlayerAvatar(playerId)}
                                </div>
                                {getPlayerName(playerId)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ✅ CORRECCIÓN: Botón Eliminar compacto a la derecha */}
                      {localTournament.status === 'active' && (
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          disabled={isLoading}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid var(--error)',
                            borderRadius: 'var(--border-radius)',
                            background: 'transparent',
                            color: 'var(--error)',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            transition: 'var(--transition)',
                            opacity: isLoading ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                          onMouseOver={(e) => {
                            if (!isLoading) {
                              e.target.style.background = 'var(--error)';
                              e.target.style.color = 'white';
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!isLoading) {
                              e.target.style.background = 'transparent';
                              e.target.style.color = 'var(--error)';
                            }
                          }}
                        >
                          <Icon name="delete" size={14} color="currentColor" />
                          Eliminar
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Componente principal App
function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <ToastProvider> 
          <Router>
            <div className="app-container">
              <style>{themeStyles}</style>
              <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/clubs" element={<ProtectedRoute><ClubManagement /></ProtectedRoute>} />
                <Route path="/tournaments" element={<ProtectedRoute><Tournaments /></ProtectedRoute>} />
                <Route path="/tournament/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/tournament/:id/play" element={<ProtectedRoute><TournamentPlay /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </Router>
        </ToastProvider> 
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;

// Registrar Service Worker
serviceWorker.register();