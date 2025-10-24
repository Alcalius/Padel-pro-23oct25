import * as serviceWorker from './serviceWorker';
import React, { useState, createContext, useContext, useEffect, useRef } from 'react';import { 
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
    return savedTheme || 'light';
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



// Sistema de Toast Context (agregar esto después de los imports de React)
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
              background: toast.type === 'success' ? 'var(--secondary)' : 
                         toast.type === 'error' ? '#ef4444' : 
                         toast.type === 'warning' ? 'var(--accent)' : 'var(--primary)',
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
              {toast.type === 'success' ? '✅' : 
               toast.type === 'error' ? '❌' : 
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
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

// Estilos con variables CSS para ambos temas + Animaciones Globales
const themeStyles = `
  :root {
    --primary: #6366f1;
    --primary-dark: #4f46e5;
    --secondary: #10b981;
    --accent: #f59e0b;
    --border-radius: 12px;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --transition: all 0.3s ease;
  }

  [data-theme="light"] {
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --text-primary: #1f2937;
    --text-secondary: #2c293aff;
    --text-muted: #9ca3af;
    --border-color: #e5e7eb;
    --card-bg: rgba(255, 255, 255, 0.95);
    --nav-bg: rgba(255, 255, 255, 0.95);
    --glass-bg: rgba(255, 255, 255, 0.85);
    --team1-bg: linear-gradient(135deg, #fee2e2, #fecaca);
    --team1-border: #ef4444;
    --team1-text: #dc2626;
    --team2-bg: linear-gradient(135deg, #dbeafe, #e0f2fe);
    --team2-border: #3b82f6;
    --team2-text: #1d4ed8;
    --waiting-bg: rgba(245, 158, 11, 0.1);
    --waiting-border: #f59e0b;
    --waiting-text: #b45309;
  }

  [data-theme="dark"] {
    --bg-primary: #0f172a;
    --bg-secondary: #1e293b;
    --bg-gradient: linear-gradient(135deg, #0f172a 0%, #334155 100%);
    --text-primary: #f1f5f9;
    --text-secondary: #cbd5e1;
    --text-muted: #94a3b8;
    --border-color: #334155;
    --card-bg: rgba(30, 41, 59, 0.95);
    --nav-bg: rgba(15, 23, 42, 0.95);
    --glass-bg: rgba(30, 41, 59, 0.85);
    --team1-bg: linear-gradient(135deg, #7f1d1d, #991b1b);
    --team1-border: #db6e6eff;
    --team1-text: #e98787ff;
    --team2-bg: linear-gradient(135deg, #1e3a8a, #1e40af);
    --team2-border: #3b82f6;
    --team2-text: #93c5fd;
    --waiting-bg: rgba(245, 158, 11, 0.15);
    --waiting-border: #d97706;
    --waiting-text: #fcd34d;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--bg-gradient);
    min-height: 100vh;
    color: var(--text-primary);
  }

  .app-container {
    min-height: 100vh;
    background: var(--bg-gradient);
  }

  .glass-card {
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
    box-shadow: var(--shadow-lg);
  }

  .btn-primary {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: var(--border-radius);
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition);
    box-shadow: var(--shadow);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -8px var(--primary);
  }

  .stat-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 20px;
    box-shadow: var(--shadow);
    border-left: 4px solid var(--primary);
    color: var(--text-primary);
  }

  .tournament-card {
    background: var(--card-bg);
    border-radius: var(--border-radius);
    padding: 24px;
    box-shadow: var(--shadow);
    transition: var(--transition);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
  }

  .tournament-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .progress-bar {
    background: var(--border-color);
    border-radius: 10px;
    overflow: hidden;
    height: 8px;
  }

  .progress-fill {
    background: linear-gradient(90deg, var(--secondary), var(--accent));
    height: 100%;
    border-radius: 10px;
    transition: width 0.5s ease;
  }

  /* ===== ANIMACIONES GLOBALES ===== */
  
  /* Transiciones suaves para elementos interactivos */
  button, input, select, textarea, .glass-card, .tournament-card {
    transition: all 0.2s ease-in-out;
  }

  /* Animaciones de entrada */
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
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Clases de animación reutilizables */
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

  /* Efectos hover mejorados */
  .hover-lift {
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .hover-lift:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.15);
  }

  .hover-glow:hover {
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
  }

  /* Loading states */
  .skeleton-loading {
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

  /* Pulse animation para elementos importantes */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-pulse {
    animation: pulse 2s infinite;
  }

  /* Shake animation para errores */
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }

  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }

  /* Fade in para contenido escalonado */
  .animate-stagger > * {
    opacity: 0;
    animation: fadeInUp 0.6s ease-out forwards;
  }

  .animate-stagger > *:nth-child(1) { animation-delay: 0.1s; }
  .animate-stagger > *:nth-child(2) { animation-delay: 0.2s; }
  .animate-stagger > *:nth-child(3) { animation-delay: 0.3s; }
  .animate-stagger > *:nth-child(4) { animation-delay: 0.4s; }
  .animate-stagger > *:nth-child(5) { animation-delay: 0.5s; }

  /* Smooth page transitions */
  .page-enter {
    opacity: 0;
    transform: translateY(20px);
  }

  .page-enter-active {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 0.4s, transform 0.4s;
  }

  /* Toast animations */
  .toast-item {
    animation: fadeInUp 0.3s ease-out;
  }

  .toast-item.exiting {
    animation: fadeInUp 0.3s ease-out reverse;
  }
`;

// Componente para transiciones entre páginas
const PageTransition = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Pequeño delay para que la animación funcione correctamente
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={isVisible ? 'page-enter-active' : 'page-enter'}
      style={{
        minHeight: '100vh',
        width: '100%'
      }}
    >
      {children}
    </div>
  );
};

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

// Componente de Login
// Componente de Login - VERSIÓN SIMPLIFICADA CON DATA(SOLO LOGIN Y REGISTRO)

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

  // Efecto para limpiar errores cuando cambia el formulario
  useEffect(() => {
    setFormErrors({});
  }, [isLogin, email, password, registerData]);

  // Función de Login con Firebase
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFormErrors({});

    try {
      // Autenticar con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Obtener datos adicionales del usuario desde Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      // Crear objeto de usuario para el contexto
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

      // Login en el contexto de la app
      actions.login(userContext);
      addToast(`¡Bienvenido de nuevo, ${userContext.name}! 👋`, 'success');

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

      // Animación de error
      const loginForm = e.target;
      loginForm.classList.add('animate-shake');
      setTimeout(() => loginForm.classList.remove('animate-shake'), 500);
      
      setFormErrors({ general: errorMessage });
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Validar formulario de registro
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

  // Función de Registro con Firebase
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
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        registerData.email, 
        registerData.password
      );
      const user = userCredential.user;

      // Actualizar perfil con el nombre
      await updateProfile(user, {
        displayName: registerData.name
      });

      // Crear documento del usuario en Firestore
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

      // Login automático después del registro
      const userContext = {
        id: user.uid,
        ...userData
      };

      actions.login(userContext);
      addToast(`¡Cuenta creada exitosamente, ${registerData.name}! 🎉`, 'success');

      // Limpiar formulario
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

  // Si ya está autenticado, redirigir al dashboard
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
            fontSize: '32px',
            color: 'white',
            boxShadow: 'var(--shadow-lg)',
            animation: 'bounceIn 0.8s ease-out'
          }}>
            🎾
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
            {isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta gratuita'}
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
                padding: '12px',
                border: 'none',
                background: isLogin ? 'var(--primary)' : 'transparent',
                color: isLogin ? 'white' : 'var(--text-secondary)',
                borderRadius: 'var(--border-radius)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'var(--transition)',
                position: 'relative',
                zIndex: 2
              }}
              disabled={isLoading}
            >
              {isLoading && isLogin ? '⏳' : '🔐'} Iniciar Sesión
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
                zIndex: 2
              }}
              disabled={isLoading}
            >
              {isLoading && !isLogin ? '⏳' : '📝'} Registrarse
            </button>
          </div>
        </div>

        {/* Mensaje de error general */}
        {formErrors.general && (
          <div className="animate-shake" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            color: '#ef4444',
            padding: '12px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '20px',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            ❌ {formErrors.general}
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
                  border: `2px solid ${formErrors.general ? '#ef4444' : 'var(--border-color)'}`,
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
                  border: `2px solid ${formErrors.general ? '#ef4444' : 'var(--border-color)'}`,
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
              className="btn-primary hover-glow"
              style={{ 
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span style={{ opacity: 0 }}>🚀 Iniciar Sesión</span>
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
                '🚀 Iniciar Sesión'
              )}
            </button>
          </form>
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
                Nombre Completo
              </label>
              <input 
                type="text" 
                value={registerData.name}
                onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                placeholder="Tu nombre completo"
                required
                disabled={isLoading}
                style={{ 
                  width: '100%', 
                  padding: '14px 16px', 
                  border: `2px solid ${formErrors.name ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.name && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  ❌ {formErrors.name}
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
                  border: `2px solid ${formErrors.email ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  ❌ {formErrors.email}
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
                  border: `2px solid ${formErrors.password ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.password ? (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  ❌ {formErrors.password}
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
                  border: `2px solid ${formErrors.confirmPassword ? '#ef4444' : 'var(--border-color)'}`,
                  borderRadius: 'var(--border-radius)',
                  fontSize: '16px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  transition: 'var(--transition)'
                }}
              />
              {formErrors.confirmPassword && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  ❌ {formErrors.confirmPassword}
                </p>
              )}
            </div>

            <button 
              type="submit"
              className="btn-primary hover-glow"
              style={{ 
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span style={{ opacity: 0 }}>📝 Crear Cuenta</span>
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
                '📝 Crear Cuenta'
              )}
            </button>
          </form>
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

// Componente de Navegación
// Componente de Navegación - VERSIÓN MEJORADA
// Componente de Navegación - VERSIÓN CORREGIDA
// Componente de Navegación - VERSIÓN ALINEADA A LA DERECHA
// Componente de Navegación - VERSIÓN SIMPLIFICADA Y FUNCIONAL
// Componente de Navegación - VERSIÓN CON MENÚ MÓVIL FUNCIONAL
// Componente de Navegación - VERSIÓN MEJORADA CON TRANSICIONES
// Componente de Navegación - BARRA INFERIOR FIJAmport { useLocation, useNavigate } from 'react-router-dom';
// Componente de Navegación - VERSIÓN CORREGIDA
// Componente de Navegación - VERSIÓN CORREGIDA SIN ESPACIOS EXTRA
// Componente de Navegación - VERSIÓN FINAL CON BOTÓN DE TEXTO Y BARRA MÁS GRANDE


function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const { addToast } = useToast();

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: '🏠', desktopIcon: '🏠 Home' },
    { path: '/tournaments', label: 'Torneos', icon: '🏆', desktopIcon: '🏆 Torneos' },
    { path: '/clubs', label: 'Clubes', icon: '🏢', desktopIcon: '🏢 Clubes' },
    { path: '/profile', label: 'Perfil', icon: '👤', desktopIcon: '👤 Perfil' }
  ];

  const handleNavigation = (path, label) => {
    navigate(path);
  };

// ✅ REEMPLAZAR LA FUNCIÓN handleCreateTournament CON ESTA VERSIÓN COMPLETA
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
  return (
    <>
      <style>{`
        /* BARRA DE NAVEGACIÓN INFERIOR - MÁS GRANDE EN MÓVIL */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 12px 0; /* Aumentado padding vertical */
          z-index: 1000;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
          height: 80px; /* Aumentada altura */
        }

        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 12px; /* Aumentado padding */
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.3s ease;
          border-radius: 12px;
          min-width: 70px; /* Aumentado ancho mínimo */
          position: relative;
          flex: 1;
          margin: 0 4px;
        }

        .nav-item.active {
          background: rgba(99, 102, 241, 0.15);
          transform: translateY(-2px);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          top: -10px; /* Ajustado para nueva altura */
          width: 24px;
          height: 3px;
          background: var(--primary);
          border-radius: 2px;
        }

        .nav-icon {
          font-size: 22px; /* Iconos más grandes */
          margin-bottom: 6px; /* Más espacio entre icono y texto */
          transition: all 0.3s ease;
        }

        .nav-item.active .nav-icon {
          transform: scale(1.1);
        }

        .nav-label {
          font-size: 12px; /* Texto más grande */
          font-weight: 600;
          color: var(--text-secondary);
          transition: all 0.3s ease;
        }

        .nav-item.active .nav-label {
          color: var(--primary);
          font-weight: 700;
        }

        .nav-item:hover {
          background: rgba(99, 102, 241, 0.1);
          transform: translateY(-1px);
        }

        /* HEADER SUPERIOR */
        .top-header {
          background: var(--nav-bg);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
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
          font-size: 16px;
          width: 36px;
          height: 36px;
          display: flex;
          alignItems: center;
          justifyContent: center;
        }

        .logo-text {
          font-size: 18px;
          font-weight: 700;
        }

        /* BOTÓN CREAR TORNEO - SIEMPRE CON TEXTO VISIBLE */
        .create-tournament-btn {
          background: linear-gradient(135deg, var(--secondary), #0da371);
          color: white;
          border: none;
          padding: 10px 18px; /* Un poco más grande */
          border-radius: var(--border-radius);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          box-shadow: var(--shadow);
          white-space: nowrap; /* Evita que el texto se rompa */
        }

        .create-tournament-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px -8px var(--secondary);
        }

        .create-tournament-btn:active {
          transform: translateY(0);
        }

        /* RESPONSIVE MEJORADO */
        @media (max-width: 768px) {
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
            font-size: 14px;
          }
          
          /* EN MÓVIL EL BOTÓN MANTIENE EL TEXTO PERO MÁS COMPACTO */
          .create-tournament-btn {
            padding: 8px 12px;
            font-size: 13px;
            gap: 6px;
          }
          
          /* BARRA INFERIOR AÚN MÁS GRANDE EN MÓVIL */
          .bottom-nav {
            height: 85px; /* Más alta en móvil */
            padding: 14px 0; /* Más padding */
          }
          
          .nav-item {
            padding: 12px 10px; /* Más espacio táctil */
            min-width: 65px;
          }
          
          .nav-icon {
            font-size: 24px; /* Iconos más grandes en móvil */
            margin-bottom: 8px;
          }
          
          .nav-label {
            font-size: 13px; /* Texto más legible */
          }
        }

        @media (max-width: 480px) {
          .nav-item {
            min-width: 60px;
            padding: 10px 8px;
          }
          
          .nav-icon {
            font-size: 22px;
          }
          
          .nav-label {
            font-size: 12px;
          }
          
          /* BOTÓN MÁS COMPACTO EN PANTALLAS MUY PEQUEÑAS */
          .create-tournament-btn {
            padding: 7px 10px;
            font-size: 12px;
          }
          
          .create-tournament-btn span:first-child {
            margin-right: 4px;
          }
        }

        @media (max-width: 360px) {
          /* PARA PANTALLAS MUY PEQUEÑAS, TEXTO MÁS COMPACTO PERO VISIBLE */
          .create-tournament-btn {
            padding: 6px 8px;
            font-size: 11px;
          }
          
          .create-tournament-btn span:last-child {
            display: inline; /* SIEMPRE visible */
          }
        }
      `}</style>

      {/* Header Superior */}
      <div className="top-header">
        <div className="header-content">
          <div 
            onClick={() => handleNavigation('/dashboard', 'Dashboard')}
            className="logo-container"
          >
            <div className="logo-icon">🎾</div>
            <span className="logo-text">Padel Pro</span>
          </div>
          
          {/* Botón Crear Torneo - SIEMPRE con texto visible */}
          <button 
            onClick={handleCreateTournament}
            className="create-tournament-btn"
          >
            <span>🏆</span>
            <span>Crear Torneo</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegación Inferior - MÁS GRANDE */}
      <nav className="bottom-nav">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
                          (item.path === '/dashboard' && location.pathname === '/');
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path, item.label)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
// Componente de Dashboard
// Componente de Dashboard - VERSIÓN CORREGIDA Y MEJORADA


function Dashboard() {
  const { state, getters } = useApp();
  const [isLoading, setIsLoading] = useState(true);
  const [contentLoaded, setContentLoaded] = useState(false);
  const { addToast } = useToast();
  const toastShownRef = useRef(false); // Para controlar el toast de bienvenida
  const { navigateWithTransition } = useNavigation();
  const userStats = getters.getUserStats();
  const activeTournaments = getters.getActiveTournaments();
  const recentMatches = getRecentMatches();
  const activeClub = getters.getActiveClub();

  // Simular carga de datos con mejor UX
  useEffect(() => {
    const loadData = async () => {
      try {
        // Simular tiempo de carga variable (más realista)
        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 800));
        
        setIsLoading(false);
        
        // Pequeño delay para mostrar las animaciones de contenido
        setTimeout(() => {
          setContentLoaded(true);
          
          // Mostrar toast de bienvenida solo una vez
          if (activeClub && !toastShownRef.current) {
            
            toastShownRef.current = true;
          }
        }, 100);
      } catch (error) {
        setIsLoading(false);
        addToast('Error cargando el dashboard', 'error');
      }
    };

    loadData();
  }, [activeClub, addToast]);

  // Obtener partidos recientes del usuario
  function getRecentMatches() {
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
  }

  // Obtener torneos activos donde participa el usuario
  const userActiveTournaments = activeTournaments.filter(tournament => 
    tournament.players.includes(state.currentUser?.id) || 
    tournament.guestPlayers.some(guest => guest.includes(state.currentUser?.name))
  );

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
      totalPoints,
      winRate: Math.round(winRate),
      avgPointsPerMatch,
      clubsCount: getters.getUserClubs().length,
      tournamentsCount: userTournaments.length,
      activeTournamentsCount: userActiveTournaments.length
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
  const topRanking = calculateClubRanking();

  // Estado para controlar el formulario de torneo
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [newTournament, setNewTournament] = useState({ 
    name: '', 
    players: [],
    guestPlayers: [] 
  });

  // Componente de Skeleton Loading Mejorado
  const DashboardSkeleton = () => (
    <div style={{ 
      minHeight: 'calc(100vh - 140px)', // Altura ajustada
      background: 'var(--bg-gradient)',
      padding: '20px',
      paddingTop: '10px', // REDUCIDO padding superior
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
          <div className="skeleton-loading skeleton-pulse" style={{
            height: '40px',
            width: '300px',
            marginBottom: '12px',
            borderRadius: 'var(--border-radius)'
          }}></div>
          <div className="skeleton-loading skeleton-pulse" style={{
            height: '20px',
            width: '70%',
            borderRadius: 'var(--border-radius)'
          }}></div>
        </div>

        {/* Skeleton Grid - RESTAURADO */}
        <div className="dashboard-grid" style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card" style={{ padding: '20px' }}>
              <div className="skeleton-loading skeleton-pulse" style={{
                height: '20px',
                width: '140px',
                marginBottom: '20px',
                borderRadius: 'var(--border-radius)'
              }}></div>
              <div className="skeleton-loading skeleton-pulse" style={{
                height: '60px',
                marginBottom: '15px',
                borderRadius: 'var(--border-radius)'
              }}></div>
              <div className="skeleton-loading skeleton-pulse" style={{
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
        {/* Header del Dashboard con Animación */}
        <div className={`animate-fadeInUp ${contentLoaded ? 'animate-fadeInUp' : ''}`} style={{ 
          marginBottom: '30px',
          width: '100%'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: 'var(--text-primary)',
            marginBottom: '8px',
            wordWrap: 'break-word'
          }}>
            🏠 Mi Dashboard
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)',
            fontSize: '16px',
            lineHeight: '1.4',
            wordWrap: 'break-word'
          }}>
            {activeClub 
              ? `Club activo: ${activeClub.name} • ${activeClub.members.length} miembros • ${activeTournaments.length} torneos activos`
              : 'Selecciona un club activo para empezar'
            }
          </p>
        </div>

        {/* Grid Principal con NUEVO ORDEN */}
        <div className={`dashboard-grid animate-stagger ${contentLoaded ? 'animate-stagger' : ''}`}>
          

          {/* 2. MIS ESTADÍSTICAS */}
          {enhancedStats && (
            <div className="glass-card dashboard-card hover-lift" style={{ 
              padding: '20px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.2s'
            }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 Mis Estadísticas
              </h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.3s',
                  borderLeft: '3px solid var(--primary)'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: 'var(--primary)',
                    marginBottom: '4px'
                  }}>
                    {enhancedStats.totalMatches}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Partidos
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(16, 185, 129, 0.1)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.4s',
                  borderLeft: '3px solid var(--secondary)'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: 'var(--secondary)',
                    marginBottom: '4px'
                  }}>
                    {enhancedStats.winRate}%
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Victorias
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(245, 158, 11, 0.1)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.5s',
                  borderLeft: '3px solid var(--accent)'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: 'var(--accent)',
                    marginBottom: '4px'
                  }}>
                    {enhancedStats.avgPointsPerMatch}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Puntos/Partido
                  </div>
                </div>
                
                <div className="animate-scaleIn" style={{ 
                  background: 'rgba(139, 92, 246, 0.1)',
                  padding: '12px',
                  borderRadius: 'var(--border-radius)',
                  textAlign: 'center',
                  animation: 'scaleIn 0.5s ease-out',
                  animationDelay: '0.6s',
                  borderLeft: '3px solid #8b5cf6'
                }}>
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: '700', 
                    color: '#8b5cf6',
                    marginBottom: '4px'
                  }}>
                    {enhancedStats.activeTournamentsCount}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)',
                    fontWeight: '600'
                  }}>
                    Torneos Activos
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. TOP RANKING DEL CLUB */}
          {activeClub && topRanking.length > 0 && (
            <div className="glass-card dashboard-card ranking-card hover-lift" style={{ 
              padding: '20px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.3s'
            }}>
              <h2 style={{ 
                color: 'var(--text-primary)', 
                marginBottom: '16px',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏆 Top Ranking
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                      position: 'relative',
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
                          <span>🎯 {player.avgPointsPerMatch} pts/partido</span>
                          <span>📊 {player.winRate}% victorias</span>
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
                  <Link 
                    to="/tournaments" 
                    className="hover-glow"
                    style={{
                      color: 'var(--primary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '8px 12px',
                      borderRadius: 'var(--border-radius)',
                      transition: 'var(--transition)'
                    }}
                  >
                    Ver ranking completo →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 4. CLUB ACTIVO */}
          {activeClub && (
            <div className="glass-card dashboard-card club-card hover-lift" style={{ 
              padding: '20px',
              width: '100%',
              boxSizing: 'border-box',
              animationDelay: '0.4s'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <h2 style={{ 
                  color: 'var(--text-primary)', 
                  margin: '0',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🏢 Club Activo
                </h2>
                <span style={{ 
                  background: 'var(--primary)', 
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  ✅ Activo
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                gap: '16px'
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
                  🎾
                </div>
                
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ 
                    color: 'var(--text-primary)', 
                    margin: '0 0 8px 0',
                    fontSize: '16px',
                    fontWeight: '700'
                  }}>
                    {activeClub.name}
                  </h3>
                  <p style={{ 
                    color: 'var(--text-secondary)', 
                    margin: '0 0 12px 0',
                    fontSize: '14px',
                    lineHeight: '1.4'
                  }}>
                    {activeClub.description}
                  </p>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    alignItems: 'center'
                  }}>
                    <span>👥 {activeClub.members.length} miembros</span>
                    <span>🏆 {activeTournaments.length} torneos activos</span>
                    <span>📅 Creado {new Date(activeClub.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <Link 
                  to="/clubs" 
                  className="btn-primary hover-glow"
                  style={{ 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    fontSize: '14px'
                  }}
                >
                  ⚙️ Gestionar Club
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Estado sin club activo */}
        {!activeClub && (
          <div className="glass-card animate-fadeInUp" style={{ 
            padding: '30px 20px',
            textAlign: 'center',
            marginTop: '20px',
            width: '100%',
            boxSizing: 'border-box',
            animationDelay: '0.3s'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
            <h2 style={{ 
              color: 'var(--text-primary)', 
              marginBottom: '12px',
              fontSize: '20px'
            }}>
              No tienes un club activo
            </h2>
            <p style={{ 
              color: 'var(--text-secondary)', 
              marginBottom: '20px',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              Selecciona un club activo o únete a uno para empezar a jugar torneos y guardar tus estadísticas
            </p>
            <Link 
              to="/clubs" 
              className="btn-primary hover-glow"
              style={{ 
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 20px',
                fontSize: '14px'
              }}
            >
              🏢 Gestionar Clubes
            </Link>
          </div>
        )}

        {/* Sección de Soporte - Versión Compacta */}
        <div className="glass-card animate-fadeInUp" style={{ 
          padding: '20px',
          marginTop: '25px',
          width: '100%',
          boxSizing: 'border-box',
          animationDelay: '0.5s',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                color: 'white'
              }}>
                ❤️
              </div>
              <div>
                <h4 style={{ 
                  color: 'var(--text-primary)', 
                  margin: '0 0 4px 0',
                  fontSize: '15px',
                  fontWeight: '600'
                }}>
                  Apoya Padel Pro
                </h4>
                <p style={{ 
                  color: 'var(--text-secondary)', 
                  margin: '0',
                  fontSize: '12px'
                }}>
                  Ayuda a mejorar la aplicación
                </p>
              </div>
            </div>
            
            <button
              onClick={() => window.open('https://www.paypal.com/paypalme/alcalius?locale.x=en_US&country.x=MX', '_blank')}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                background: 'linear-gradient(135deg, #0070ba, #1546a0)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}
              className="hover-glow"
            >
              <span>💙</span>
              Donar
            </button>
          </div>
        </div>



      </div>

      {/* Modal para crear torneo desde el dashboard */}
      {showCreateTournament && (
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
          <div className="glass-card animate-scaleIn" style={{ 
            padding: '30px', 
            maxWidth: '500px', 
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
              🏆 Crear Nuevo Torneo
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Serás redirigido a la página de torneos para configurar tu nuevo torneo.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Link 
                to="/tournaments" 
                className="btn-primary"
                onClick={() => setShowCreateTournament(false)}
                style={{ textDecoration: 'none' }}
              >
                Continuar
              </Link>
              <button 
                onClick={() => setShowCreateTournament(false)}
                style={{
                  padding: '12px 24px',
                  border: '2px solid var(--border-color)',
                  borderRadius: 'var(--border-radius)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Gestión de Clubes
// Componente de Gestión de Clubes - VERSIÓN MEJORADA
// Componente de Gestión de Clubes - VERSIÓN COMPLETA Y FUNCIONAL
// Componente de Gestión de Clubes - VERSIÓN CORREGIDA Y SIN DEBUG
// Componente de Gestión de Clubes - VERSIÓN CON ADMINISTRACIÓN
// Componente de Gestión de Clubes - VERSIÓN COMPLETAMENTE RESPONSIVE
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
              wordWrap: 'break-word'
            }}>
              🏢 Gestión de Clubes
            </h1>
            <p style={{ 
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
              className="btn-primary hover-glow"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                flex: '1',
                minWidth: '140px',
                justifyContent: 'center'
              }}
            >
              🏢 Crear Club
            </button>
            <button 
              onClick={() => setShowJoinForm(true)}
              className="btn-primary hover-glow"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                flex: '1', 
                minWidth: '140px',
                justifyContent: 'center'
              }}
            >
              👥 Unirse a Club
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
                  🏢 Crear Nuevo Club
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
                  ✕
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
                    className="btn-primary hover-glow"
                    disabled={isLoading}
                    style={{ width: '100%' }}
                  >
                    {isLoading ? '⏳ Creando...' : '🏢 Crear Club'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isLoading}
                    style={{
                      padding: '12px 24px',
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
                  👑 Gestionar Club: {showManageClub.name}
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
                  ✕
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
                    className="btn-primary"
                    style={{ width: '100%' }}
                  >
                    ✏️ Editar Club
                  </button>
                  <button
                    onClick={() => handleDeleteClub(showManageClub.id, showManageClub.name)}
                    style={{
                      padding: '12px 20px',
                      border: '2px solid #ef4444',
                      borderRadius: 'var(--border-radius)',
                      background: '#ef4444',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    🗑️ Eliminar Club
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
                          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '14px',
                          flexShrink: 0
                        }}>
                          {member.avatar}
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
                                👑 Creador
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
                            border: '1px solid #ef4444',
                            borderRadius: 'var(--border-radius)',
                            background: 'transparent',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            flexShrink: 0
                          }}
                        >
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
            🏢 Mis Clubes ({userClubs.length})
          </h2>

          {userClubs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 20px',
              color: 'var(--text-secondary)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏢</div>
              <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>
                No perteneces a ningún club
              </h3>
              <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                Crea un nuevo club o únete a uno existente para empezar
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                  style={{ padding: '12px 20px', fontSize: '14px' }}
                >
                  🏢 Crear Mi Primer Club
                </button>
                <button 
                  onClick={() => setShowJoinForm(true)}
                  className="btn-primary"
                  style={{ padding: '12px 20px', fontSize: '14px' }}
                >
                  👥 Unirse a Club
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
                              ✅ Activo
                            </span>
                          )}
                          {isAdmin && (
                            <span className="club-badge admin">
                              👑 Admin
                            </span>
                          )}
                        </div>
                        <div className="club-description">
                          {club.description || 'Sin descripción'}
                        </div>
                        <div className="club-meta">
                          <span>👥 {club.members?.length || 0} miembros</span>
                          <span>📅 {new Date(club.createdAt).toLocaleDateString()}</span>
                          <span>👤 {state.users.find(u => u.id === club.createdBy)?.name || 'Usuario'}</span>
                        </div>
                      </div>
                      
                      <div className="club-actions">
                        {!isActiveClub && (
                          <button
                            onClick={() => handleSetActiveClub(club.id)}
                            className="club-action-btn primary"
                          >
                            🎯 Activar
                          </button>
                        )}
                        
                        {isAdmin && (
                          <button
                            onClick={() => handleManageClub(club)}
                            className="club-action-btn accent"
                          >
                            ⚙️ Gestionar
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleLeaveClub(club.id)}
                          className="club-action-btn danger"
                        >
                          🚪 Salir
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
              🔍 Clubes Disponibles ({availableClubs.length})
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
                        <span>👥 {club.members?.length || 0} miembros</span>
                        <span>📅 {new Date(club.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="club-actions">
                      <button
                        onClick={() => {
                          setJoinClub({ clubId: club.id, password: '' });
                          setShowJoinForm(true);
                        }}
                        className="club-action-btn secondary"
                      >
                        👥 Unirse
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// Componente de Torneos - VERSIÓN CON BOTONES DE COMPLETAR Y ELIMINAR
// Componente de Torneos - VERSIÓN CORREGIDA CON BOTONES RESPONSIVE
// Componente de Torneos - VERSIÓN COMPLETA Y CORREGIDA
// Componente de Torneos - VERSIÓN COMPLETA Y CORREGIDA

function Tournaments() {
  // ✅ ESTADOS NECESARIOS - TODOS BIEN DECLARADOS
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

  // Función para generar partidos iniciales
  const generateInitialMatches = (playerIds) => {
    const matches = [];
    const totalPlayers = playerIds.length;
    
    if (totalPlayers < 4) {
      console.log('❌ No hay suficientes jugadores para crear partidos');
      return matches;
    }
    
    // Calcular cuántos partidos crear (mínimo 4, máximo 7)
    const matchesToCreate = Math.min(7, Math.max(4, Math.floor(totalPlayers * 1.5)));
    
    console.log(`🎯 Creando ${matchesToCreate} partidos iniciales para ${totalPlayers} jugadores`);
    
    // Inicializar contadores
    const matchesPlayed = {};
    playerIds.forEach(player => {
      matchesPlayed[player] = 0;
    });
    
    // Algoritmo de distribución equitativa
    for (let matchIndex = 0; matchIndex < matchesToCreate; matchIndex++) {
      // Ordenar jugadores por partidos jugados (menos partidos primero)
      const playersByUsage = [...playerIds].sort((a, b) => {
        return matchesPlayed[a] - matchesPlayed[b];
      });
      
      // Tomar los 4 jugadores con menos partidos
      const basePlayers = playersByUsage.slice(0, 4);
      
      // Mezclar aleatoriamente para los equipos
      const shuffledTeams = [...basePlayers].sort(() => Math.random() - 0.5);
      const team1 = shuffledTeams.slice(0, 2);
      const team2 = shuffledTeams.slice(2, 4);
      
      // Crear el partido
      matches.push({
        id: Date.now() + matchIndex,
        team1,
        team2,
        scoreTeam1: null,
        scoreTeam2: null,
        status: "pending",
        createdAt: new Date().toISOString()
      });
      
      // Actualizar contadores
      [...team1, ...team2].forEach(player => {
        matchesPlayed[player]++;
      });
    }
    
    return matches;
  };

  // ✅ FUNCIÓN CORREGIDA PARA CREAR TORNEO
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setIsSubmitting(true); // ✅ ESTA LÍNEA DEBERÍA FUNCIONAR AHORA
    
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
      setIsSubmitting(false); // ✅ ESTA TAMBIÉN DEBERÍA FUNCIONAR
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
      padding: '20px'
    }}>
      <style>{themeStyles}</style>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header responsive */}
        <div className="animate-fadeInUp" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '30px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ width: '100%' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              🏆 Torneos
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Gestiona y participa en torneos de pádel
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn-primary hover-glow"
            disabled={isSubmitting}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '200px',
              alignSelf: 'flex-end'
            }}
          >
            {isSubmitting ? (
              <>
                <span style={{ opacity: 0 }}>🆕 Crear Torneo</span>
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
                  Creando...
                </div>
              </>
            ) : (
              '🆕 Crear Torneo'
            )}
          </button>
        </div>

        {/* Formulario de Creación de Torneo */}
        {showCreateForm && (
          <div className="glass-card animate-scaleIn" style={{ 
            padding: '20px', 
            marginBottom: '30px',
            border: '2px solid var(--primary)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px' }}>
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
                className="hover-glow"
              >
                ✕
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
                    transition: 'var(--transition)'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
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
                      className={`hover-lift ${isSubmitting ? 'opacity-50' : ''}`}
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
                          {member.avatar}
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
                        color: 'var(--text-primary)'
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
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ➕ Añadir
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
                      <span>👤</span>
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
                        ×
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
                  className="btn-primary hover-glow"
                  disabled={isSubmitting || (newTournament.players.length + newTournament.guestPlayers.length) < 4}
                  style={{
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span style={{ opacity: 0 }}>🏆 Crear Torneo</span>
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
                        Creando...
                      </div>
                    </>
                  ) : (
                    '🏆 Crear Torneo'
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
              className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '16px 12px',
                border: 'none',
                background: activeTab === 'active' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'active' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'var(--transition)',
                fontSize: '14px'
              }}
            >
              🟢 Activos ({activeTournaments.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`tab-button ${activeTab === 'completed' ? 'active' : ''}`}
              style={{
                flex: 1,
                padding: '16px 12px',
                border: 'none',
                background: activeTab === 'completed' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'completed' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'var(--transition)',
                fontSize: '14px'
              }}
            >
              ✅ Completados ({completedTournaments.length})
            </button>
          </div>

          {/* Lista de Torneos */}
          <div style={{ padding: '16px' }}>
            {(activeTab === 'active' ? activeTournaments : completedTournaments).map((tournament, index) => (
              <div 
                key={tournament.id} 
                className="tournament-card animate-fadeInUp hover-lift"
                style={{ 
                  animationDelay: `${index * 0.1}s`,
                  marginBottom: '16px',
                  padding: '16px'
                }}
              >
                {/* Header simplificado */}
                <div className="tournament-header" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  marginBottom: '12px',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '700', 
                      color: 'var(--text-primary)',
                      marginBottom: '6px',
                      wordWrap: 'break-word'
                    }}>
                      {tournament.name}
                    </h3>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        background: tournament.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tournament.status === 'active' ? '🟢 Activo' : '✅ Completado'}
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {tournament.players.length + tournament.guestPlayers.length} jugadores
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {tournament.matches.filter(m => m.status === 'completed').length}/{tournament.matches.length} partidos
                      </span>
                    </div>
                  </div>
                  
                  {/* Botones - Diseño responsive mejorado */}
                  <div className="tournament-actions" style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    alignItems: 'center',
                    flexShrink: 0,
                    flexWrap: 'wrap'
                  }}>
                    {/* Botón Abrir - SIEMPRE visible */}
                    <button
                      onClick={() => navigateWithTransition(`/tournament/${tournament.id}`, {
                        message: `Abriendo ${tournament.name}...`
                      })}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--border-radius)',
                        background: 'var(--primary)',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                      className="hover-glow"
                    >
                      📊 Abrir
                    </button>

                    {/* Botón Completar - solo para torneos ACTIVOS y creador */}
                    {tournament.status === 'active' && isTournamentCreator(tournament) && (
                      <button
                        onClick={() => handleCompleteTournament(tournament)}
                        disabled={actionLoading === tournament.id}
                        style={{
                          padding: '8px 12px',
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
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                        className="hover-glow"
                      >
                        {actionLoading === tournament.id ? (
                          <>
                            <span style={{ opacity: 0 }}>✅ Completar</span>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}>
                              <div style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                            </div>
                          </>
                        ) : (
                          '✅ Completar'
                        )}
                      </button>
                    )}

                    {/* Botón Eliminar - solo para torneos ACTIVOS y creador */}
                    {tournament.status === 'active' && isTournamentCreator(tournament) && (
                      <button
                        onClick={() => handleDeleteTournament(tournament)}
                        disabled={actionLoading === tournament.id}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #ef4444',
                          borderRadius: 'var(--border-radius)',
                          background: '#ef4444',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: actionLoading === tournament.id ? 'not-allowed' : 'pointer',
                          transition: 'var(--transition)',
                          whiteSpace: 'nowrap',
                          opacity: actionLoading === tournament.id ? 0.6 : 1,
                          position: 'relative',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}
                        className="hover-glow"
                      >
                        {actionLoading === tournament.id ? (
                          <>
                            <span style={{ opacity: 0 }}>🗑️ Eliminar</span>
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)'
                            }}>
                              <div style={{
                                width: '14px',
                                height: '14px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                            </div>
                          </>
                        ) : (
                          '🗑️ Eliminar'
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Información mínima */}
                <div style={{ 
                  marginTop: '12px',
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
                    color: 'var(--text-secondary)'
                  }}>
                    <span>📅 {new Date(tournament.createdAt).toLocaleDateString()}</span>
                    <span>👤 Creado por {state.users.find(u => u.id === tournament.createdBy)?.name || 'Usuario'}</span>
                  </div>
                </div>
              </div>
            ))}

            {(activeTab === 'active' ? activeTournaments : completedTournaments).length === 0 && (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: 'var(--text-secondary)',
                animation: 'fadeInUp 0.6s ease-out'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
                <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                  {activeTab === 'active' ? 'No hay torneos activos' : 'No hay torneos completados'}
                </h3>
                <p style={{ marginBottom: '20px', fontSize: '14px' }}>
                  {activeTab === 'active' 
                    ? 'Crea el primer torneo para empezar a competir' 
                    : 'Los torneos completados aparecerán aquí'
                  }
                </p>
                {activeTab === 'active' && (
                  <button 
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary hover-glow"
                    style={{ padding: '12px 24px', fontSize: '14px' }}
                  >
                    🆕 Crear Primer Torneo
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .opacity-50 {
          opacity: 0.5;
        }
        
        @keyframes spin {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        /* MEJORAS RESPONSIVE PARA BOTONES */
        @media (min-width: 769px) {
          .tournament-actions {
            flex-direction: row !important;
            flex-wrap: nowrap !important;
          }
        }
        
        @media (max-width: 768px) {
          .tournament-header {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          
          .tournament-actions {
            width: 100% !important;
            justify-content: flex-start !important;
            gap: 6px !important;
          }
          
          .tournament-actions button {
            flex: 0 1 auto !important;
            min-width: 80px !important;
          }
        }
        
        @media (max-width: 480px) {
          .tournament-actions {
            justify-content: space-between !important;
          }
          
          .tournament-actions button {
            flex: 1 !important;
            min-width: 70px !important;
            font-size: 11px !important;
            padding: 6px 8px !important;
          }
        }
        
        @media (max-width: 360px) {
          .tournament-actions {
            flex-direction: column !important;
            gap: 4px !important;
          }
          
          .tournament-actions button {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

// ✅ ESTA LLAVE CIERRA EL COMPONENTE Tournaments CORRECTAMENTE


function TournamentDetail() {
  const { id } = useParams();
  const { getters, state, actions } = useApp();
  const tournament = getters.getTournamentById(id);
  
  // ✅ ESTADOS NECESARIOS
  const [activeTab, setActiveTab] = useState('play');
  const [editingScores, setEditingScores] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localTournament, setLocalTournament] = useState(null);
  const navigate = useNavigate();

  // Sincronizar el torneo local con el global
  useEffect(() => {
    if (tournament) {
      setLocalTournament(tournament);
    }
  }, [tournament]);

  if (!tournament || !localTournament) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)'
      }}>
        <h1>Torneo no encontrado</h1>
        <Link to="/tournaments" className="btn-primary">
          Volver a Torneos
        </Link>
      </div>
    );
  }

  // Función para completar el torneo
  const handleCompleteTournament = () => {
    const pendingMatches = localTournament.matches.filter(match => match.status === 'pending');
    
    if (pendingMatches.length > 0) {
      const confirmComplete = window.confirm(
        `Hay ${pendingMatches.length} partido(s) pendiente(s). ¿Estás seguro de que quieres completar el torneo? Los partidos pendientes se mantendrán sin resultados.`
      );
      
      if (!confirmComplete) {
        return;
      }
    }

    actions.completeTournament(localTournament.id);
    
    alert('🎉 ¡Torneo completado correctamente! Será movido a la sección de torneos completados.');
    
    // Redirigir a la lista de torneos después de un breve delay
    setTimeout(() => {
      navigate('/tournaments');
    }, 2000);
  };

  // Función para reabrir el torneo
  const handleReopenTournament = () => {
    actions.updateTournament(localTournament.id, { status: 'active' });
    alert('🔄 Torneo reabierto correctamente. Ahora aparece en torneos activos.');
  };

  // Función para obtener nombre del jugador
  const getPlayerName = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      const guestIndex = parseInt(playerId.split('-')[1]);
      return localTournament.guestPlayers[guestIndex] + ' (Invitado)';
    }
    const player = state.users.find(u => u.id === playerId);
    return player ? player.name : 'Jugador no encontrado';
  };

  // Función para obtener avatar/foto del jugador
  const getPlayerAvatar = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      return '👤';
    }
    const player = state.users.find(u => u.id === playerId);
    
    // Si el jugador tiene foto de perfil, usar la foto
    if (player && player.profilePicture) {
      return (
        <div 
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: `url(${player.profilePicture}) center/cover`,
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        />
      );
    }
    
    // Si no tiene foto, usar el emoji
    return player ? player.avatar : '👤';
  };

  // Función específica para clasificación que maneja mejor los jugadores
  const getPlayerInfoForRanking = (playerId) => {
    if (typeof playerId === 'string' && playerId.startsWith('guest-')) {
      const guestIndex = parseInt(playerId.split('-')[1]);
      const guestName = localTournament.guestPlayers[guestIndex];
      return {
        name: guestName + ' (Invitado)',
        avatar: '👤',
        isGuest: true
      };
    }
    
    const player = state.users.find(u => u.id === playerId);
    if (player) {
      return {
        name: player.name,
        avatar: player.avatar,
        profilePicture: player.profilePicture,
        isGuest: false
      };
    }
    
    return {
      name: 'Jugador no encontrado',
      avatar: '👤',
      isGuest: false
    };
  };

  // Función para obtener jugadores que no están en el partido actual
  const getWaitingPlayers = (match) => {
    const allPlayers = [...localTournament.players, ...localTournament.guestPlayers.map((_, idx) => `guest-${idx}`)];
    const playingPlayers = [...(match.team1 || []), ...(match.team2 || [])];
    return allPlayers.filter(player => !playingPlayers.includes(player));
  };

  // Calcular estadísticas para la clasificación
  const calculateRanking = () => {
    const playerStats = {};
    
    // Procesar jugadores regulares
    localTournament.players.forEach(playerId => {
      playerStats[playerId] = { 
        points: 0, 
        matches: 0, 
        wins: 0,
        playerId: playerId,
        isGuest: false
      };
    });
    
    // Procesar jugadores invitados
    localTournament.guestPlayers.forEach((guestName, index) => {
      const guestId = `guest-${index}`;
      playerStats[guestId] = { 
        points: 0, 
        matches: 0, 
        wins: 0,
        playerId: guestId,
        isGuest: true,
        guestName: guestName
      };
    });

    // Calcular estadísticas de partidos
    localTournament.matches.forEach(match => {
      if (match.status === 'completed' && match.scoreTeam1 !== null && match.scoreTeam2 !== null) {
        // Equipo 1
        match.team1.forEach(playerId => {
          if (playerStats[playerId]) {
            playerStats[playerId].points += match.scoreTeam1;
            playerStats[playerId].matches += 1;
            if (match.scoreTeam1 > match.scoreTeam2) playerStats[playerId].wins += 1;
          }
        });
        
        // Equipo 2
        match.team2.forEach(playerId => {
          if (playerStats[playerId]) {
            playerStats[playerId].points += match.scoreTeam2;
            playerStats[playerId].matches += 1;
            if (match.scoreTeam2 > match.scoreTeam1) playerStats[playerId].wins += 1;
          }
        });
      }
    });

    // Convertir a array y ordenar por puntos
    return Object.values(playerStats)
      .map(stats => ({
        ...stats,
        globalScore: stats.matches > 0 ? (stats.points / stats.matches).toFixed(2) : '0.00'
      }))
      .sort((a, b) => b.points - a.points);
  };

  const pendingMatches = localTournament.matches.filter(match => match.status === 'pending');
  const completedMatches = localTournament.matches.filter(match => match.status === 'completed');
  const ranking = calculateRanking();

  // Verificar si el usuario es el creador del torneo
  const isTournamentCreator = localTournament.createdBy === state.currentUser?.id;

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '20px'
    }}>
      
      <style>{themeStyles}</style>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header del Torneo */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
          width: '100%'
        }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <Link to="/tournaments" style={{ 
              color: 'var(--primary)', 
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              ← Volver a Torneos
            </Link>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: 'var(--text-primary)',
              marginBottom: '6px',
              wordWrap: 'break-word'
            }}>
              {localTournament.name}
            </h1>
            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              📅 {new Date(localTournament.createdAt).toLocaleDateString()} • 
              👥 {localTournament.players.length + localTournament.guestPlayers.length} jugadores • 
              🎯 {completedMatches.length}/{localTournament.matches.length} partidos
              {isTournamentCreator && ' • 👑 Eres el organizador'}
            </p>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px', 
            alignItems: 'flex-end',
            flexShrink: 0
          }}>
            {/* Estado y Botón en la misma línea */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {/* Estado del Torneo */}
              <div style={{ 
                background: localTournament.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 'var(--border-radius)',
                fontWeight: '600',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}>
                {localTournament.status === 'active' ? '🟢 Activo' : '✅ Completado'}
              </div>

              {/* Botones de Completar/Reabrir Torneo */}
              {isTournamentCreator && (
                localTournament.status === 'active' ? (
                  <button
                    onClick={handleCompleteTournament}
                    style={{
                      padding: '8px 16px',
                      border: '2px solid var(--accent)',
                      borderRadius: 'var(--border-radius)',
                      background: 'var(--accent)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🏁 Completar
                  </button>
                ) : (
                  <button
                    onClick={handleReopenTournament}
                    style={{
                      padding: '8px 16px',
                      border: '2px solid var(--secondary)',
                      borderRadius: 'var(--border-radius)',
                      background: 'var(--secondary)',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🔄 Reabrir
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Banner de Torneo Completado */}
        {localTournament.status === 'completed' && (
          <div style={{ 
            background: 'linear-gradient(135deg, var(--accent), #d97706)',
            color: 'white',
            padding: '20px',
            borderRadius: 'var(--border-radius)',
            marginBottom: '24px',
            textAlign: 'center',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>Torneo Completado</h3>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
                  Este torneo ha sido finalizado. {isTournamentCreator ? 'Puedes reabrirlo si necesitas hacer cambios.' : 'Consulta los resultados finales.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pestañas de Navegación */}
        <div className="glass-card" style={{ padding: '0', marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            borderBottom: '1px solid var(--border-color)'
          }}>
            {[
              { id: 'play', label: 'Partidos', icon: '🎮' },
              { id: 'ranking', label: 'Ranking', icon: '🏆' },
              { id: 'matches', label: 'Historial', icon: '📋' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '20px 24px',
                  border: 'none',
                  background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'var(--transition)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido de las Pestañas */}
          <div style={{ padding: '30px' }}>
            {/* Pestaña: JUGAR PARTIDO - VERSIÓN SIMPLIFICADA */}
            {activeTab === 'play' && (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px',
                color: 'var(--text-primary)'
              }}>
                <div style={{ 
                  fontSize: '80px', 
                  marginBottom: '24px',
                  animation: 'bounce 2s infinite'
                }}>
                  🎮
                </div>
                
                <h2 style={{ 
                  marginBottom: '16px',
                  fontSize: '28px',
                  fontWeight: '700'
                }}>
                  Gestión de Partidos
                </h2>
                
                <p style={{ 
                  marginBottom: '32px', 
                  color: 'var(--text-secondary)',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  maxWidth: '500px',
                  margin: '0 auto 32px auto'
                }}>
                  Gestiona los partidos pendientes del torneo
                </p>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  alignItems: 'center',
                  maxWidth: '300px',
                  margin: '0 auto'
                }}>
                  <Link 
                    to={`/tournament/${id}/play`}
                    className="btn-primary"
                    style={{ 
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      width: '100%'
                    }}
                  >
                    <span>🎯</span>
                    Ir a Partidos Pendientes
                    {pendingMatches.length > 0 && (
                      <span style={{ 
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {pendingMatches.length}
                      </span>
                    )}
                  </Link>

                  {/* Información rápida */}
                  <div style={{
                    background: 'var(--card-bg)',
                    padding: '16px',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--border-color)',
                    width: '100%',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-around',
                      alignItems: 'center',
                      fontSize: '14px',
                      color: 'var(--text-secondary)'
                    }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--primary)' }}>
                          {pendingMatches.length}
                        </div>
                        <div>Pendientes</div>
                      </div>
                      <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }}></div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--secondary)' }}>
                          {completedMatches.length}
                        </div>
                        <div>Completados</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pequeña animación CSS */}
                <style>
                  {`
                    @keyframes bounce {
                      0%, 20%, 50%, 80%, 100% {
                        transform: translateY(0);
                      }
                      40% {
                        transform: translateY(-10px);
                      }
                      60% {
                        transform: translateY(-5px);
                      }
                    }
                  `}
                </style>
              </div>
            )}
            
            {/* Pestaña: CLASIFICACIÓN */}
            {activeTab === 'ranking' && (
              <div style={{ width: '100%', overflowX: 'hidden' }}>
                <h2 style={{ 
                  color: 'var(--text-primary)', 
                  marginBottom: '20px',
                  fontSize: '22px'
                }}>
                  Clasificación {localTournament.status === 'completed' ? 'Final ' : ''}del Torneo
                </h2>

                {ranking.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>No hay datos de clasificación</h3>
                    <p style={{ fontSize: '14px' }}>Juega algunos partidos para generar la clasificación.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {ranking.map((player, index) => {
                      const playerInfo = getPlayerInfoForRanking(player.playerId);
                      
                      return (
                        <div key={player.playerId} className="glass-card" style={{ 
                          padding: '16px',
                          borderLeft: `4px solid ${
                            index === 0 ? '#f59e0b' : 
                            index === 1 ? '#9ca3af' : 
                            index === 2 ? '#b45309' : 'var(--primary)'
                          }`,
                          width: '100%',
                          boxSizing: 'border-box'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: '12px',
                            width: '100%'
                          }}>
                            {/* Medalla/Número */}
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: index === 0 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                          index === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : 
                                          index === 2 ? 'linear-gradient(135deg, #b45309, #92400e)' : 
                                          'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: '700',
                              fontSize: '14px',
                              flexShrink: 0
                            }}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>

                            {/* Avatar y Nombre */}
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px',
                              flex: 1,
                              minWidth: 0
                            }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: playerInfo.profilePicture ? 
                                  `url(${playerInfo.profilePicture}) center/cover` :
                                  'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: playerInfo.profilePicture ? '0' : '16px',
                                fontWeight: '600',
                                border: '2px solid var(--card-bg)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                flexShrink: 0
                              }}>
                                {!playerInfo.profilePicture && playerInfo.avatar}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h4 style={{ 
                                  color: 'var(--text-primary)',
                                  marginBottom: '2px',
                                  fontSize: '15px',
                                  fontWeight: '600',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {playerInfo.name}
                                </h4>
                                <p style={{ 
                                  color: 'var(--text-muted)', 
                                  fontSize: '11px',
                                  margin: 0
                                }}>
                                  {playerInfo.isGuest && (
                                    <span style={{ 
                                      background: 'var(--accent)', 
                                      color: 'white',
                                      padding: '1px 5px',
                                      borderRadius: '6px',
                                      fontSize: '9px'
                                    }}>
                                      Invitado
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Estadísticas - Versión Compacta para Móvil */}
                            <div style={{ 
                              display: 'flex', 
                              gap: '12px',
                              flexShrink: 0
                            }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  color: 'var(--primary)', 
                                  fontWeight: '700',
                                  fontSize: '14px'
                                }}>
                                  {player.points}
                                </div>
                                <div style={{ 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '10px'
                                }}>
                                  Pts
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  color: 'var(--secondary)', 
                                  fontWeight: '700',
                                  fontSize: '14px'
                                }}>
                                  {player.matches}
                                </div>
                                <div style={{ 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '10px'
                                }}>
                                  Part
                                </div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ 
                                  color: 'var(--accent)', 
                                  fontWeight: '700',
                                  fontSize: '14px'
                                }}>
                                  {player.globalScore}
                                </div>
                                <div style={{ 
                                  color: 'var(--text-secondary)', 
                                  fontSize: '10px'
                                }}>
                                  Avg
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: HISTORIAL */}
            {activeTab === 'matches' && (
              <div style={{ width: '100%', overflowX: 'hidden' }}>
                <h2 style={{ 
                  color: 'var(--text-primary)', 
                  marginBottom: '20px',
                  fontSize: '22px'
                }}>
                  Historial de Partidos ({completedMatches.length})
                </h2>

                {completedMatches.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                    <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>No hay partidos completados</h3>
                    <p style={{ fontSize: '14px' }}>Los partidos completados aparecerán aquí.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    {completedMatches.map(match => (
                      <div key={match.id} className="glass-card" style={{ 
                        padding: '16px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        {/* Header del partido comprimido */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '12px',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}>
                          <div style={{ 
                            color: 'var(--text-secondary)', 
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {new Date(match.createdAt).toLocaleDateString()} • {new Date(match.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <div style={{ 
                            background: 'var(--primary)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            Completado
                          </div>
                        </div>

                        {/* EQUIPOS EN LÍNEA - UNO AL LADO DEL OTRO */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          
                          {/* EQUIPO 1 - IZQUIERDA */}
                          <div style={{ 
                            flex: 1, 
                            minWidth: '120px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '11px',
                              fontWeight: '600',
                              marginBottom: '4px',
                              textAlign: 'center'
                            }}>
                              Equipo 1
                            </div>
                            {match.team1.map(playerId => (
                              <div key={playerId} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                justifyContent: 'flex-start'
                              }}>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  flexShrink: 0
                                }}>
                                  {getPlayerAvatar(playerId)}
                                </div>
                                <span style={{ 
                                  color: 'var(--text-primary)',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: 1
                                }}>
                                  {getPlayerName(playerId)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* RESULTADO CENTRAL */}
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            flexShrink: 0,
                            minWidth: '80px'
                          }}>
                            <div style={{ 
                              background: match.scoreTeam1 > match.scoreTeam2 ? 
                                'linear-gradient(135deg, #ef4444, #dc2626)' : 
                                'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                              color: 'white',
                              padding: '8px 16px',
                              borderRadius: 'var(--border-radius)',
                              fontWeight: '700',
                              fontSize: '16px',
                              textAlign: 'center',
                              minWidth: '70px'
                            }}>
                              {match.scoreTeam1} - {match.scoreTeam2}
                            </div>
                            <div style={{ 
                              fontSize: '10px',
                              color: 'var(--text-muted)',
                              fontWeight: '600',
                              textAlign: 'center'
                            }}>
                              {match.scoreTeam1 > match.scoreTeam2 ? '🏆 Ganó Eq. 1' : '🏆 Ganó Eq. 2'}
                            </div>
                          </div>

                          {/* EQUIPO 2 - DERECHA */}
                          <div style={{ 
                            flex: 1, 
                            minWidth: '120px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '11px',
                              fontWeight: '600',
                              marginBottom: '4px',
                              textAlign: 'center'
                            }}>
                              Equipo 2
                            </div>
                            {match.team2.map(playerId => (
                              <div key={playerId} style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px',
                                justifyContent: 'flex-end'
                              }}>
                                <span style={{ 
                                  color: 'var(--text-primary)',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  flex: 1,
                                  textAlign: 'right'
                                }}>
                                  {getPlayerName(playerId)}
                                </span>
                                <div style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: '#3b82f6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  flexShrink: 0
                                }}>
                                  {getPlayerAvatar(playerId)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Línea separadora */}
                        <div style={{ 
                          height: '1px', 
                          background: 'var(--border-color)', 
                          margin: '12px 0 8px 0'
                        }}></div>

                        {/* Información adicional compacta */}
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '10px',
                          color: 'var(--text-muted)'
                        }}>
                          <span>Partido #{match.id.toString().slice(-4)}</span>
                          <span>Duración: ~12 min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )} 
          </div>
        </div>
      </div>
    </div>
  );
}

// nada aqui pa ver hasta donde ahora TOURNAMENT PLAY aquí mero 
// Componente TournamentPlay - VISTA DEDICADA PARA PARTIDOS PENDIENTES
// Componente TournamentPlay - VISTA DEDICADA PARA PARTIDOS PENDIENTES
// Componente TournamentPlay - VERSIÓN COMPLETA CORREGIDA
function TournamentPlay() {
  const { id } = useParams();
  const { getters, state, actions } = useApp();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  // Obtener el torneo actual
  const tournament = getters.getTournamentById(id);
  const [activeTab, setActiveTab] = useState('play');
  const [editingScores, setEditingScores] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localTournament, setLocalTournament] = useState(null);

  // Sincronizar el torneo local
  useEffect(() => {
    if (tournament) {
      setLocalTournament(tournament);
    }
  }, [tournament]);

  if (!tournament || !localTournament) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'var(--bg-gradient)',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'var(--text-primary)'
      }}>
        <h1>Torneo no encontrado</h1>
        <Link to="/tournaments" className="btn-primary">
          Volver a Torneos
        </Link>
      </div>
    );
  }

  // Funciones existentes
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
    return player ? player.avatar : '👤';
  };

  const getWaitingPlayers = (match) => {
    const allPlayers = [...localTournament.players, ...localTournament.guestPlayers.map((_, idx) => `guest-${idx}`)];
    const playingPlayers = [...(match.team1 || []), ...(match.team2 || [])];
    return allPlayers.filter(player => !playingPlayers.includes(player));
  };

  const handleScoreChange = (matchId, team, value) => {
    if (localTournament.status === 'completed') {
      alert('No puedes editar partidos en un torneo completado.');
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

  // ✅ FUNCIÓN CORREGIDA PARA GUARDAR TODOS LOS PARTIDOS
  const saveAllScores = async () => {
    if (localTournament.status === 'completed') {
      alert('No puedes guardar cambios en un torneo completado.');
      return;
    }

    let hasErrors = false;
    const errors = [];

    // Validar todos los scores
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
      alert('Errores encontrados:\n' + errors.join('\n'));
      return;
    }

    try {
      console.log('💾 Guardando TODAS las puntuaciones...');
      console.log('📝 Partidos a guardar:', Object.keys(editingScores).length);
      
      // ✅ CORRECCIÓN: Actualizar todos los partidos de una vez
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

      // ✅ CORRECCIÓN: Actualizar el torneo completo con todos los partidos
      await actions.updateTournament(localTournament.id, {
        matches: updatedMatches
      });

      // Limpiar estado de edición
      setEditingScores({});
      setHasUnsavedChanges(false);
      
      const updatedCount = Object.keys(editingScores).length;
      addToast(`¡${updatedCount} partido${updatedCount > 1 ? 's' : ''} guardado${updatedCount > 1 ? 's' : ''} correctamente!`, 'success');
      
      // Redirigir al torneo después de un breve delay
      setTimeout(() => {
        navigate(`/tournament/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error('❌ Error guardando puntuaciones:', error);
      addToast('Error al guardar las puntuaciones: ' + error.message, 'error');
    }
  };

  // ✅ NUEVA FUNCIÓN PARA GUARDAR UN SOLO PARTIDO
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

    try {
      // Actualizar el partido individual
      await actions.updateMatchScore(localTournament.id, matchId, {
        scoreTeam1: score1,
        scoreTeam2: score2,
        status: 'completed'
      });

      // Remover del estado de edición
      const newEditingScores = { ...editingScores };
      delete newEditingScores[matchId];
      setEditingScores(newEditingScores);
      
      // Actualizar hasUnsavedChanges
      const hasRemainingChanges = Object.keys(newEditingScores).length > 0;
      setHasUnsavedChanges(hasRemainingChanges);
      
      addToast('¡Partido guardado correctamente! ✅', 'success');
      
    } catch (error) {
      console.error('❌ Error guardando partido:', error);
      addToast('Error al guardar el partido: ' + error.message, 'error');
    }
  };

  const cancelEditing = () => {
    setEditingScores({});
    setHasUnsavedChanges(false);
  };

  const addAdditionalMatch = () => {
    if (localTournament.status === 'completed') {
      alert('No puedes añadir partidos a un torneo completado.');
      return;
    }

    const allPlayers = [...localTournament.players, ...localTournament.guestPlayers.map((_, idx) => `guest-${idx}`)];
    
    if (allPlayers.length < 4) {
      alert('Se necesitan al menos 4 jugadores para crear un partido');
      return;
    }

    const newMatch = generateBalancedMatch(allPlayers, localTournament.matches);
    
    actions.addTournamentMatch(localTournament.id, {
      ...newMatch,
      id: Date.now(),
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    
    addToast('¡Partido adicional añadido!', 'success');
  };

  const handleDeleteMatch = (matchId) => {
    if (localTournament.status === 'completed') {
      alert('No puedes eliminar partidos en un torneo completado.');
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar este partido?')) {
      const updatedMatches = localTournament.matches.filter(match => match.id !== matchId);
      actions.updateTournament(localTournament.id, { matches: updatedMatches });
      addToast('Partido eliminado correctamente', 'info');
    }
  };

  // Función para generar partidos balanceados (necesaria para addAdditionalMatch)
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

    // Algoritmo simple de balanceo
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    return {
      team1: shuffled.slice(0, 2),
      team2: shuffled.slice(2, 4),
      scoreTeam1: null,
      scoreTeam2: null
    };
  };

  const pendingMatches = localTournament.matches.filter(match => match.status === 'pending');

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'var(--bg-gradient)',
      padding: '0',
      overflowX: 'hidden'
    }}>
      <style>{themeStyles}</style>
      
      {/* Header Fijo */}
      <div style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(10px)',
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        zIndex: 1000
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => navigate(`/tournament/${id}`)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                padding: '8px'
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
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ 
              background: localTournament.status === 'active' ? 'var(--secondary)' : 'var(--accent)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              {localTournament.status === 'active' ? '🟢 Activo' : '✅ Completado'}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '20px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Botón Añadir Partido y Controles de Guardado */}
        {localTournament.status === 'active' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <button
              onClick={addAdditionalMatch}
              style={{
                padding: '12px 20px',
                border: '2px solid var(--secondary)',
                borderRadius: 'var(--border-radius)',
                background: 'var(--secondary)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              ➕ Añadir Partido
            </button>

            {hasUnsavedChanges && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ 
                  color: 'var(--text-secondary)', 
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  {Object.keys(editingScores).length} partido(s) con cambios
                </span>
                <button
                  onClick={saveAllScores}
                  className="btn-primary"
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    padding: '10px 16px',
                    fontSize: '14px'
                  }}
                >
                  💾 Guardar Todo
                </button>
                <button
                  onClick={cancelEditing}
                  style={{
                    padding: '10px 16px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Lista de Partidos Pendientes - CON BOTONES INDIVIDUALES */}
        {pendingMatches.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--text-secondary)'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h3 style={{ marginBottom: '12px', fontSize: '20px' }}>
              ¡No hay partidos pendientes!
            </h3>
            <p style={{ marginBottom: '24px', fontSize: '16px' }}>
              Todos los partidos han sido completados.
            </p>
            {localTournament.status === 'active' && (
              <button
                onClick={addAdditionalMatch}
                className="btn-primary"
                style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ➕ Crear Nuevo Partido
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {pendingMatches.map(match => {
              const currentScores = editingScores[match.id] || {};
              const score1 = currentScores.team1 || '';
              const score2 = currentScores.team2 || '';
              const isValidScore = score1 && score2 && (parseInt(score1) + parseInt(score2) === 4);

              return (
                <div key={match.id} style={{
                  background: 'var(--glass-bg)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '12px',
                  padding: '0',
                  border: '1px solid var(--border-color)',
                  width: '100%',
                  overflow: 'hidden'
                }}>
                  {/* CANCHA DE PÁDEL */}
                  <div style={{ 
                    background: 'linear-gradient(135deg, #1564beff, #1564beff)',
                    padding: '20px 15px',
                    position: 'relative',
                    minHeight: '180px',
                    width: '100%'
                  }}>
                    {/* Línea central */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '0',
                      bottom: '0',
                      width: '2px',
                      background: 'rgba(255,255,255,0.4)',
                      transform: 'translateX(-50%)'
                    }}></div>
                    
                    {/* Red */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%',
                      height: '2px',
                      background: 'rgba(255,255,255,0.4)'
                    }}></div>

                    {/* Equipo 1 */}
                    <div style={{
                      position: 'absolute',
                      left: '2%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '46%'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {match.team1.map(playerId => (
                          <div key={playerId} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px'
                          }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#dc2626',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: '2px solid white'
                            }}>
                              {getPlayerAvatar(playerId)}
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

                    {/* VS */}
                    <div style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#1564beff',
                      color: 'rgba(255, 255, 255, 0.9)',
                      width: '45px',
                      height: '45px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: '700',
                      border: '2px solid rgba(255,255,255,0.6)'
                    }}>
                      VS
                    </div>

                    {/* Equipo 2 */}
                    <div style={{
                      position: 'absolute',
                      right: '2%',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '46%'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {match.team2.map(playerId => (
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
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#1d4ed8',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: '600',
                              border: '2px solid white'
                            }}>
                              {getPlayerAvatar(playerId)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Marcador */}
                    <div style={{
                      position: 'absolute',
                      top: '0px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(118, 121, 148, 0.95)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: '140px',
                      justifyContent: 'center'
                    }}>
                      <select
                        value={score1}
                        onChange={(e) => handleScoreChange(match.id, 'team1', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '2px solid #860d0dff',
                          borderRadius: '6px',
                          background: '#cf7e7e96',
                          color: '#741414ff',
                          fontWeight: '700',
                          fontSize: '14px',
                          minWidth: '50px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">-</option>
                        <option value="0">0</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                      </select>

                      <div style={{ color: 'white', fontWeight: '600' }}>-</div>

                      <select
                        value={score2}
                        onChange={(e) => handleScoreChange(match.id, 'team2', e.target.value)}
                        style={{
                          padding: '6px 8px',
                          border: '2px solid #0d1f86ff',
                          borderRadius: '6px',
                          background: '#7f7ecf96',
                          color: '#152f77ff',
                          fontWeight: '700',
                          fontSize: '14px',
                          minWidth: '50px',
                          cursor: 'pointer'
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
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {/* Validación */}
                      {score1 && score2 && (
                        <div style={{
                          background: isValidScore ? 'rgba(18, 99, 72, 0.9)' : 'rgba(239, 68, 68, 0.9)',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>
                          {isValidScore ? '✅ Listo para guardar' : '❌ Suma debe ser 4'}
                        </div>
                      )}
                      
                      {/* Botón Guardar Individual */}
                      {(score1 || score2) && (
                        <button
                          onClick={() => saveSingleMatch(match.id)}
                          disabled={!isValidScore}
                          style={{
                            padding: '6px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isValidScore ? 'var(--secondary)' : '#9ca3af',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: isValidScore ? 'pointer' : 'not-allowed',
                            transition: 'var(--transition)',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          💾 Guardar Este Partido
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Jugadores en Espera */}
                  <div style={{ 
                    padding: '12px 15px',
                    background: 'var(--card-bg)',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '16px' }}>🛋️</span>
                      <span style={{ 
                        color: 'var(--text-primary)', 
                        fontSize: '12px',
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
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'var(--text-secondary)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {getPlayerAvatar(playerId)} {getPlayerName(playerId)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Botón Eliminar */}
                  {localTournament.status === 'active' && (
                    <div style={{ 
                      padding: '12px 15px',
                      background: 'var(--card-bg)',
                      borderTop: '1px solid var(--border-color)',
                      textAlign: 'center'
                    }}>
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        style={{
                          padding: '8px 16px',
                          border: '1px solid #ef4444',
                          borderRadius: 'var(--border-radius)',
                          background: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        🗑️ Eliminar Partido
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Componentes Placeholder
// Componente Profile - VERSIÓN COMPLETA ACTUALIZADA
// Componente Profile - VERSIÓN COMPLETAMENTE REDISEÑADA PARA MÓVIL
// Componente Profile - VERSIÓN ACTUALIZADA CON TODAS LAS MEJORAS
// Componente Profile - VERSIÓN CORREGIDA Y COMPLETA
function Profile() {
  const { state, getters, actions } = useApp();
  const { currentUser } = state;
  const { theme, toggleTheme } = useTheme();
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
        alert('Por favor selecciona una imagen válida (JPEG, PNG, etc.)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen debe ser menor a 5MB');
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

  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!editForm.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (!editForm.email.trim()) {
      alert('El email es requerido');
      return;
    }

    actions.updateUserProfile(currentUser.id, {
      name: editForm.name,
      email: editForm.email,
      profilePicture: previewUrl,
      avatar: '👤'
    });
    
    setIsEditing(false);
    alert('Perfil actualizado correctamente!');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPreviewUrl(currentUser.profilePicture || '');
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    alert('Contraseña cambiada exitosamente (demo)');
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      actions.logout();
    }
  };

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Calcular estadísticas globales del usuario
  const calculateGlobalStats = () => {
    const userStats = getters.getUserStats();
    const userTournaments = getters.getTournamentsByClub().filter(t => 
      t.players.includes(currentUser.id) || 
      t.guestPlayers.some(guest => guest.includes(currentUser.name))
    );

    let totalMatches = 0;
    let totalWins = 0;
    let totalPoints = 0;
    let recentMatches = [];

    userTournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1.includes(currentUser.id) || match.team2.includes(currentUser.id))) {
          totalMatches++;
          
          const userTeam = match.team1.includes(currentUser.id) ? 'team1' : 'team2';
          const userScore = userTeam === 'team1' ? match.scoreTeam1 : match.scoreTeam2;
          const opponentScore = userTeam === 'team1' ? match.scoreTeam2 : match.scoreTeam1;
          
          totalPoints += userScore;
          if (userScore > opponentScore) {
            totalWins++;
          }

          // Para estadísticas detalladas
          recentMatches.push({
            userScore,
            opponentScore,
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

  const globalStats = calculateGlobalStats();

  // Obtener partidos recientes para la pestaña de Partidos
  const getRecentMatches = () => {
    const recentMatches = [];
    const userTournaments = getters.getTournamentsByClub().filter(t => 
      t.players.includes(currentUser.id) || 
      t.guestPlayers.some(guest => guest.includes(currentUser.name))
    );

    userTournaments.forEach(tournament => {
      tournament.matches.forEach(match => {
        if (match.status === 'completed' && 
            (match.team1.includes(currentUser.id) || match.team2.includes(currentUser.id))) {
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

  const recentMatches = getRecentMatches();

  // SISTEMA DE LOGROS MEJORADO - CON PROGRESIÓN
  const achievements = [
    {
      id: 1,
      name: "Primer Partido",
      description: "Completa tu primer partido",
      icon: "🎯",
      unlocked: globalStats.totalMatches >= 1,
      progress: Math.min((globalStats.totalMatches / 1) * 100, 100),
      requirement: "1 partido"
    },
    {
      id: 2,
      name: "Competidor Activo",
      description: "Juega 5 partidos",
      icon: "🎾",
      unlocked: globalStats.totalMatches >= 5,
      progress: Math.min((globalStats.totalMatches / 5) * 100, 100),
      requirement: "5 partidos"
    },
    {
      id: 3,
      name: "Jugador Experimentado",
      description: "Juega 10 partidos",
      icon: "⚡",
      unlocked: globalStats.totalMatches >= 10,
      progress: Math.min((globalStats.totalMatches / 10) * 100, 100),
      requirement: "10 partidos"
    },
    {
      id: 4,
      name: "Primera Victoria",
      description: "Gana tu primer partido",
      icon: "🥇",
      unlocked: globalStats.totalWins >= 1,
      progress: Math.min((globalStats.totalWins / 1) * 100, 100),
      requirement: "1 victoria"
    },
    {
      id: 5,
      name: "Victorioso",
      description: "Gana 3 partidos",
      icon: "💪",
      unlocked: globalStats.totalWins >= 3,
      progress: Math.min((globalStats.totalWins / 3) * 100, 100),
      requirement: "3 victorias"
    },
    {
      id: 6,
      name: "Puntaje Alto",
      description: "Anota 4 puntos en un partido",
      icon: "💎",
      unlocked: globalStats.bestScore >= 4,
      progress: globalStats.bestScore >= 4 ? 100 : Math.min((globalStats.bestScore / 4) * 100, 100),
      requirement: "4 puntos en un partido"
    }
  ];

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

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
          border-color: #ef4444;
          color: #ef4444;
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
                {!currentUser.profilePicture && currentUser.avatar}
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
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      flex: 1,
                      minWidth: '140px'
                    }}
                  >
                    ✏️ Editar Perfil
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
                      transition: 'all 0.3s ease'
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
                    ⚙️ Ajustes
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
                <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>
                  Editar Perfil
                </h3>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '5px'
                  }}
                >
                  ✕
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
                  {!previewUrl && '👤'}
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
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
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
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  💾 Guardar Cambios
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ❌ Cancelar
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Pestañas de Navegación */}
        <div className="profile-tabs-container">
          <div className="profile-tabs">
            {[
              { id: 'overview', label: 'Resumen', icon: '📊' },
              { id: 'stats', label: 'Estadísticas', icon: '📈' },
              { id: 'matches', label: 'Partidos', icon: '🎾' },
              { id: 'achievements', label: 'Logros', icon: '🏅' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button-mobile ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span className="tab-icon">{tab.icon}</span>
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
                          <div style={{ fontSize: '24px' }}>{achievement.icon}</div>
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
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
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
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444', marginBottom: '4px' }}>
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
                        <div style={{ fontSize: '20px' }}>{achievement.icon}</div>
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
                    const userTeam = match.team1.includes(currentUser.id) ? 'team1' : 'team2';
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
                            background: won ? 'var(--secondary)' : '#ef4444',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {won ? '🏆 Ganado' : '💔 Perdido'}
                          </div>
                        </div>
                        
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Tú: {userScore} - {opponentScore} :Oponente
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
                          <span>Partido #{match.id.toString().slice(-4)}</span>
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
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎾</div>
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
                      <div style={{ fontSize: '24px' }}>{achievement.icon}</div>
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
                  <span>🌙 Tema Actual: {theme === 'light' ? 'Claro' : 'Oscuro'}</span>
                  <span>🔄 Cambiar</span>
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
                  <span>🔒 Cambiar Contraseña</span>
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
                  <span>🚪 Cerrar Sesión</span>
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
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>
              🔒 Cambiar Contraseña
            </h3>
            
            <form onSubmit={handlePasswordChange}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
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
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
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
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  🔑 Cambiar Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  style={{
                    padding: '12px 20px',
                    border: '2px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// Componente para proteger rutas
// Componente para proteger rutas CON NUEVA NAVEGACIÓN
// Componente para proteger rutas ACTUALIZADO

// Componente para proteger rutas - VERSIÓN SIN ESPACIOS EXTRA
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
      <Navigation />
      <div style={{ 
        flex: 1,
        paddingTop: '0px', // ELIMINADO padding extra
        paddingBottom: '100px', // Solo espacio para barra inferior
        overflow: 'auto'
      }}>
        {children}
      </div>
    </div>
  );
}


// Componente principal App - 
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
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/tournament/:id/play" element={<ProtectedRoute><TournamentPlay /></ProtectedRoute>} />
              </Routes>
            </div>
          </Router>
        </ToastProvider> 
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;

// Registrar Service Worker para PWA
serviceWorker.register({
  onSuccess: () => console.log('✅ PWA: App disponible offline'),
  onUpdate: (registration) => {
    console.log('🔄 PWA: Nueva versión disponible');
    if (window.confirm('Hay una nueva versión disponible. ¿Quieres actualizar?')) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
});