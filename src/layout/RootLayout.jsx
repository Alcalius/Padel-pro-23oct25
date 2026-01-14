// src/layout/RootLayout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";
import { db } from "../firebase/firebase";
import { addDoc, collection } from "firebase/firestore";
import AppIcon from "../assets/logo/AppIcon.png";

export default function RootLayout() {
  const auth = useAuth() || {};
  const { user } = auth;

  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setTheme] = useState("dark");

  // ─────────────────────────────
  // Cargar tema inicial
  // ─────────────────────────────
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("lop-theme");
      const initial =
        stored === "light" || stored === "dark" ? stored : "dark";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    } catch {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Aplicar tema cuando cambia
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      window.localStorage.setItem("lop-theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  // ─────────────────────────────
  // Reporte de bugs / notas
  // ─────────────────────────────
  const handleBugReport = async () => {
    const message = window.prompt(
      "Describe tu reporte, nota u observación para el desarrollador:"
    );
    if (!message || !message.trim()) return;

    try {
      await addDoc(collection(db, "feedback"), {
        type: "bug",
        message: message.trim(),
        path: location.pathname,
        userId: user?.uid || null,
        email: user?.email || null,
        createdAt: new Date().toISOString(),
      });
      alert("✅ Gracias, tu reporte se ha guardado.");
    } catch (err) {
      console.error("Error guardando feedback:", err);
      alert("⚠️ No se pudo guardar el reporte. Intenta más tarde.");
    }
  };

  // ─────────────────────────────
  // Proteger rutas: si no hay user y no estamos en /login
  // ─────────────────────────────
  useEffect(() => {
    if (!user && location.pathname !== "/login") {
      navigate("/login", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  const hideBottomNav = location.pathname === "/login";

  const navItems = [
    { key: "home", label: "Home", icon: "home", path: "/" },
    { key: "torneos", label: "Torneos", icon: "tournament", path: "/torneos" },
    { key: "clubes", label: "Clubes", icon: "club", path: "/clubes" },
    { key: "perfil", label: "Perfil", icon: "profile", path: "/perfil" },
  ];

  const currentPath = location.pathname;

  const isActive = (itemPath) => {
    if (itemPath === "/") return currentPath === "/";
    return currentPath.startsWith(itemPath);
  };

  const handleNavClick = (path) => {
    if (currentPath === path) return;
    navigate(path);
  };

  const BottomItem = ({ icon, active, onClick, ariaLabel }) => {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`bottom-item ${active ? "active" : ""}`}
        aria-label={ariaLabel || icon}
        title={ariaLabel || icon}
      >
        <div className="bottom-item-iconWrap">
        <Icon name={icon} size={28} color="currentColor" />
        </div>
      </button>
    );
  };


  return (
    <div
      style={{
        minHeight: "100dvh",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      {/* TOP BAR */}
      <header
        style={{
          padding: "0.6rem 0.9rem",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 480,
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            justifyContent: "space-between",
          }}
        >
          {/* Logo / título */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {/* ⬇️ Antes había un fondo azul; lo quitamos y hacemos el icono un poco más grande */}
            <img
              src={AppIcon}
              alt="League of Padel"
              style={{
                width: 32,
                height: 32,
                objectFit: "contain",
                borderRadius: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "1.0rem",
                  fontWeight: 700,
                  lineHeight: 1.1,
                }}
              >
                League of Padel
              </div>
            </div>
          </div>

          {/* Botones lado derecho: bug + V #.#.# + tema */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {/* Bug */}
            <button
              type="button"
              onClick={handleBugReport}
              title="Enviar reporte / feedback"
              style={{
                border: "none",
                outline: "none",
                borderRadius: "999px",
                padding: "0.25rem 0.35rem",
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <Icon name="bug" size={18} color="var(--fg)" />
            </button>

            {/* Versión movida aquí */}
            <span
              style={{
                fontSize: "0.7rem",
                color: "var(--muted)",
                whiteSpace: "nowrap",
              }}
            >
              V 0.7.1
            </span>

            {/* Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                border: "none",
                outline: "none",
                borderRadius: "999px",
                padding: "0.25rem 0.4rem",
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <Icon
                name={theme === "dark" ? "sun" : "moon"}
                size={18}
                color="var(--fg)"
              />
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--muted)",
                }}
              >
                {theme === "dark" ? "Claro" : "Oscuro"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main
        style={{
          flex: 1,
          padding:
            "4.1rem 0.9rem calc(5.6rem + env(safe-area-inset-bottom))",
          overflowY: "auto",
        }}
      >
        <Outlet />
      </main>

      {/* BOTTOM NAV iOS-like con botón central */}
      {!hideBottomNav && user && (
        <nav
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: "100%",
            maxWidth: 480,
            padding: "0.55rem 0.9rem calc(1.2rem + env(safe-area-inset-bottom))",
            zIndex: 40,
            pointerEvents: "none", // importante: para que solo los botones reciban click
          }}
        >
            <div
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.9rem",
                padding: "0.55rem 0.6rem",
                borderRadius: 999,
                background: "var(--bg-elevated)",
                border: "1px solid var(--hairline)",
                backdropFilter: "blur(var(--blur))",
                WebkitBackdropFilter: "blur(var(--blur))",
              }}
            >
            {/* HOME */}
            <BottomItem
              icon="home"
              ariaLabel="Home"
              active={isActive("/")}
              onClick={() => handleNavClick("/")}
            />

            {/* TORNEOS */}
            <BottomItem
              icon="tournament"
              ariaLabel="Torneos"
              active={isActive("/torneos")}
              onClick={() => handleNavClick("/torneos")}
            />

            {/* ESPACIO extra antes del botón central */}
            <div style={{ width: 1 }} />

            {/* BOTÓN CENTRAL */}
            <button
              type="button"
              onClick={() => navigate("/torneos?create=1&fast=1")}
              title="Crear torneo"
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                border: "none",
                background: "var(--accent)",
                boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: "translateY(-1px)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Icon name="add" size={28} color="#fff" />
            </button>

            {/* ESPACIO extra después del botón central */}
            <div style={{ width: 1 }} />

            {/* CLUBES */}
            <BottomItem
              icon="club"
              ariaLabel="Clubes"
              active={isActive("/clubes")}
              onClick={() => handleNavClick("/clubes")}
            />

            {/* PERFIL */}
            <BottomItem
              icon="profile"
              ariaLabel="Perfil"
              active={isActive("/perfil")}
              onClick={() => handleNavClick("/perfil")}
            />
          </div>

          {/* Componente inline para cada tab */}
            <style>{`
              .bottom-item {
                flex: 0 0 64px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0.15rem;
                border: none;
                background: transparent;
                cursor: pointer;
                border-radius: 999px;

                /* Color base para currentColor */
                color: var(--muted);
              }

              /* Activo: solo cambia el color (stroke) */
              .bottom-item.active {
                color: var(--accent);
              }

              .bottom-item-iconWrap {
                width: 44px;
                height: 44px;
                border-radius: 999px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                transition: transform 0.12s ease;
              }

              /* Forzar “solo stroke”: nada de relleno */
              .bottom-item svg,
              .bottom-item svg * {
                fill: none !important;
                stroke: currentColor !important;
              }

              /* Pop animation al activarse */
              .bottom-item.active .bottom-item-iconWrap {
                animation: navPop 160ms ease-out;
              }

              @keyframes navPop {
                0%   { transform: scale(0.92); }
                60%  { transform: scale(1.08); }
                100% { transform: scale(1.00); }
              }

              /* Feedback al presionar */
              .bottom-item:active .bottom-item-iconWrap {
                transform: scale(0.97);
              }
            `}</style>
        </nav>
      )}
    </div>
  );
}
