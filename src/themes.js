export const themeStyles = `
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
    min-height: 100vh;
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