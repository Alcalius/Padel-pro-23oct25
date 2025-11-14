// src/pages/Dashboard.jsx
import React from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";

export default function Dashboard() {
  const { user } = useAuth();
  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : "Jugador");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* Header de bienvenida */}
      <section
        style={{
          borderRadius: "1.2rem",
          padding: "1rem 1.1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex",
          gap: "0.8rem",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "1.1rem",
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(56,189,248,0.9))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="home" size={24} color="#ffffff" />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            Bienvenido de nuevo,
          </p>
          <h1
            style={{
              margin: 0,
              marginTop: "0.1rem",
              fontSize: "1.05rem",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </h1>
          <p
            style={{
              margin: 0,
              marginTop: "0.25rem",
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            Revisa tus estadísticas, torneos y actividad reciente.
          </p>
        </div>
      </section>

      {/* Mis estadísticas */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Mis estadísticas
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.6rem",
          }}
        >
          <div className="card-mini">
            <p className="card-mini-label">Partidos jugados</p>
            <p className="card-mini-value">0</p>
          </div>
          <div className="card-mini">
            <p className="card-mini-label">Victorias</p>
            <p className="card-mini-value">0</p>
          </div>
          <div className="card-mini">
            <p className="card-mini-label">Win rate</p>
            <p className="card-mini-value">0%</p>
          </div>
          <div className="card-mini">
            <p className="card-mini-label">Puntos totales</p>
            <p className="card-mini-value">0</p>
          </div>
        </div>
      </section>

      {/* Top ranking */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Top ranking (club activo)
        </h2>

        <div className="card">
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aquí verás a los mejores jugadores de tu club una vez que haya
            suficientes partidos registrados.
          </p>
        </div>
      </section>

      {/* Partidos recientes */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Partidos recientes
        </h2>

        <div className="card">
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Todavía no hay partidos recientes. Cuando registres resultados en
            torneos, aparecerán aquí.
          </p>
        </div>
      </section>

      {/* Torneos activos */}
      <section>
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Torneos activos
        </h2>

        <div className="card">
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Cuando tengas torneos activos en tu club, verás un resumen rápido en
            este apartado.
          </p>
        </div>
      </section>

      {/* Estilos pequeños reutilizados */}
      <style>{`
        .card {
          border-radius: 1rem;
          padding: 0.8rem 0.9rem;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
        }

        .card-mini {
          border-radius: 0.9rem;
          padding: 0.55rem 0.65rem;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
        }

        .card-mini-label {
          margin: 0;
          font-size: 0.75rem;
          color: var(--muted);
        }

        .card-mini-value {
          margin: 0.2rem 0 0;
          font-size: 0.95rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
