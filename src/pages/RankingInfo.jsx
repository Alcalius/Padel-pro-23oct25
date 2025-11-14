// src/pages/RankingInfo.jsx
import React from "react";
import { DIVISIONS } from "../utils/ranking";

// Imágenes de rangos
import BronceImg from "../assets/rangos/bronce.png";
import PlataImg from "../assets/rangos/plata.png";
import OroImg from "../assets/rangos/oro.png";
import PlatinoImg from "../assets/rangos/platino.png";
import DiamanteImg from "../assets/rangos/diamante.png";
import LeyendaImg from "../assets/rangos/leyenda.png";

const TIERS = [
  {
    key: "bronce",
    name: "Bronce",
    divisions: ["Bronce III", "Bronce II", "Bronce I"],
    image: BronceImg,
    accent: "#f97316", // naranja suave
    description: "El punto de partida. Ideal para jugadores que están empezando a jugar torneos.",
  },
  {
    key: "plata",
    name: "Plata",
    divisions: ["Plata III", "Plata II", "Plata I"],
    image: PlataImg,
    accent: "#e5e7eb", // gris claro
    description: "Jugadores que ya tienen experiencia y buscan consistencia en su nivel.",
  },
  {
    key: "oro",
    name: "Oro",
    divisions: ["Oro III", "Oro II", "Oro I"],
    image: OroImg,
    accent: "#facc15", // dorado
    description: "Nivel alto. Jugadores con buena técnica y resultados sólidos en torneos.",
  },
  {
    key: "platino",
    name: "Platino",
    divisions: ["Platino III", "Platino II", "Platino I"],
    image: PlatinoImg,
    accent: "#22c55e", // verde
    description: "Jugadores muy competitivos, con gran constancia y buen winrate.",
  },
  {
    key: "diamante",
    name: "Diamante",
    divisions: ["Diamante"],
    image: DiamanteImg,
    accent: "#38bdf8", // azul
    description: "Top del club o de la comunidad. Muy pocos llegan hasta aquí.",
  },
  {
    key: "leyenda",
    name: "Leyenda",
    divisions: ["Leyenda"],
    image: LeyendaImg,
    accent: "#a855f7", // púrpura
    description: "Los nombres que siempre ves en los rankings. Referentes de League of Padel.",
  },
];

export default function RankingInfo() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        paddingBottom: "0.75rem",
      }}
    >
      {/* INTRO */}
      <section>
        <h1
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "1rem",
            fontWeight: 700,
          }}
        >
          Sistema de ligas y ranking
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            color: "var(--muted)",
          }}
        >
          League of Padel utiliza un sistema de ligas con divisiones y{" "}
          <strong>puntos de liga (PL)</strong>. Cada partido que juegas puede
          hacerte subir, mantenerte o bajar de rango según el resultado y el
          nivel de tus rivales.
        </p>
      </section>

      {/* LIGAS PRINCIPALES CON IMÁGENES */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.5rem",
            fontSize: "0.95rem",
          }}
        >
          Ligas principales
        </h2>

        <div className="tier-grid">
          {TIERS.map((tier) => (
            <article key={tier.key} className="tier-card">
              <div
                className="tier-image-wrapper"
                style={{
                  boxShadow: "0 12px 22px rgba(15, 23, 42, 0.21)",
                }}
              >
                <img
                  src={tier.image}
                  alt={tier.name}
                  className="tier-image"
                />
              </div>

              <div className="tier-content">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    marginBottom: "0.15rem",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: tier.accent,
                    }}
                  />
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "0.9rem",
                      fontWeight: 700,
                    }}
                  >
                    {tier.name}
                  </h3>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  {tier.description}
                </p>

                <p
                  style={{
                    margin: 0,
                    marginTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                  }}
                >
                  Divisiones:
                  <br />
                  <strong>{tier.divisions.join(" • ")}</strong>
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* CÓMO GANAS Y PIERDES PL */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          ¿Cómo ganas o pierdes PL?
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          Cada partido rankeado suma o resta PL dependiendo de:
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.1rem",
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          <li style={{ marginBottom: "0.2rem" }}>
            Tu resultado: <strong>victoria, derrota o empate</strong>.
          </li>
          <li style={{ marginBottom: "0.2rem" }}>
            La diferencia de rango entre tu equipo y el equipo rival.
          </li>
          <li>
            La liga en la que estás (Bronce gana más PL por victoria que
            Diamante, por ejemplo).
          </li>
        </ul>

        <div
          style={{
            marginTop: "0.6rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.45rem",
            fontSize: "0.78rem",
          }}
        >
          <div className="mini-card">
            <p className="mini-title">Victoria</p>
            <p className="mini-text">
              Ganas PL. En ligas bajas la recompensa es mayor, en ligas altas
              es menor pero más valiosa.
            </p>
          </div>
          <div className="mini-card">
            <p className="mini-title">Derrota</p>
            <p className="mini-text">
              Pierdes PL. A medida que subes de liga, las derrotas castigan un
              poco más.
            </p>
          </div>
          <div className="mini-card">
            <p className="mini-title">Empate (underdog)</p>
            <p className="mini-text">
              Si tu equipo tenía menor rango promedio que el rival, ganas un
              pequeño bonus de PL.
            </p>
          </div>
          <div className="mini-card">
            <p className="mini-title">Empate (favorito)</p>
            <p className="mini-text">
              Si tu equipo era de mayor rango, puedes perder algo de PL por no
              haber ganado el partido.
            </p>
          </div>
        </div>
      </section>

      {/* ASCENSOS Y DESCENSOS */}
      <section className="card">
        <h2
          style={{
            margin: 0,
            marginBottom: "0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Ascensos y descensos
        </h2>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.1rem",
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          <li style={{ marginBottom: "0.2rem" }}>
            Al llegar a <strong>100 PL</strong> subes a la{" "}
            <strong>siguiente división</strong>.
          </li>
          <li style={{ marginBottom: "0.2rem" }}>
            Si tus PL bajan de 0, puedes descender a la{" "}
            <strong>división anterior</strong>.
          </li>
          <li style={{ marginBottom: "0.2rem" }}>
            Al descender, empiezas con un pequeño colchón de PL para no bajar
            en picada.
          </li>
          <li>
            En <strong>Leyenda</strong> ya no subes más división, pero tu PL
            se ve reflejado en tu desempeño reciente.
          </li>
        </ul>
      </section>

      {/* NOTA FINAL */}
      <section
        style={{
          borderRadius: "1rem",
          padding: "0.8rem 0.9rem",
          border: "1px dashed var(--border)",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,64,175,0.75))",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#e5e7eb",
          }}
        >
          Puedes ver tu rango actual y tus PL en la pantalla de{" "}
          <strong>Perfil</strong>. Cada vez que juegues un partido de torneo
          rankeado, tu progreso se actualizará aquí y en tus estadísticas.
        </p>
      </section>

      <style>{`
        .card {
          border-radius: 1rem;
          padding: 0.85rem 0.95rem;
          border: 1px solid var(--border);
          background: var(--bg-elevated);
        }

        .tier-grid {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
        }

        .tier-card {
          display: flex;
          gap: 0.7rem;
          align-items: center;
        }

        .tier-image-wrapper {
          width: 72px;
          height: 72px;
          border-radius: 1.1rem;
          overflow: hidden;
          background: radial-gradient(circle at 30% 20%, rgba(15,23,42,1), rgba(15,23,42,0.4));
          flex-shrink: 0;
        }

        .tier-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .tier-content {
          flex: 1;
          min-width: 0;
        }

        .pill {
          border-radius: 999px;
          padding: 0.25rem 0.55rem;
          border: 1px solid var(--border);
          background: var(--bg);
          font-size: 0.75rem;
          color: var(--fg);
        }

        .mini-card {
          border-radius: 0.8rem;
          padding: 0.45rem 0.5rem;
          background: var(--bg);
        }

        .mini-title {
          margin: 0;
          margin-bottom: 0.15rem;
          font-size: 0.78rem;
          font-weight: 600;
        }

        .mini-text {
          margin: 0;
          font-size: 0.76rem;
          color: var(--muted);
        }

        @media (min-width: 480px) {
          .tier-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.8rem;
          }
          .tier-card {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
