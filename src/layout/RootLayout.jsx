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
              V 0.5.0
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

      {/* BOTTOM NAV fija */}
      {!hideBottomNav && user && (
        <nav
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: 0,
            width: "100%",
            maxWidth: 480,
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            // ⬇️ Un poco más de espacio abajo para no chocar con la barra del iPhone
            padding: "0.3rem 0.4rem calc(0.6rem + env(safe-area-inset-bottom))",
            zIndex: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "space-between",
              gap: "0.25rem",
            }}
          >
            {navItems.map((item) => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    padding: "0.2rem 0.2rem 0.4rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.1rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      // ⬇️ Iconos un poco más grandes
                      width: 32,
                      height: 38,
                      borderRadius: "0.8rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active ? "var(--accent-soft)" : "transparent",
                    }}
                  >
                    <Icon
                      name={item.icon}
                      size={20}
                      color={active ? "var(--accent)" : "var(--muted)"}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      marginTop: "0.05rem",
                      color: active ? "var(--accent)" : "var(--muted)",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
