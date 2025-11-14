// src/pages/RankingInfo.jsx
import React, { useState } from "react";
import Icon from "../components/common/Icon";

// Imágenes de rangos (ajusta la ruta si tu carpeta se llama distinto)
import bronceImg from "../assets/rangos/bronce.png";
import plataImg from "../assets/rangos/plata.png";
import oroImg from "../assets/rangos/oro.png";
import platinoImg from "../assets/rangos/platino.png";
import diamanteImg from "../assets/rangos/diamante.png";
import leyendaImg from "../assets/rangos/leyenda.png";

// -------------------------------------------------------------------
// Tabla de rangos: ahora incluye DIAMANTE
// Cada división usa bloques de 100 PL y Leyenda va por encima.
// -------------------------------------------------------------------
const RANKS = [
  // BRONCE
  {
    id: "bronce3",
    name: "Bronce III",
    short: "B3",
    plMin: 0,
    plMax: 99,
    image: bronceImg,
    colorTag: "Bronce",
  },
  {
    id: "bronce2",
    name: "Bronce II",
    short: "B2",
    plMin: 100,
    plMax: 199,
    image: bronceImg,
    colorTag: "Bronce",
  },
  {
    id: "bronce1",
    name: "Bronce I",
    short: "B1",
    plMin: 200,
    plMax: 299,
    image: bronceImg,
    colorTag: "Bronce",
  },

  // PLATA
  {
    id: "plata3",
    name: "Plata III",
    short: "S3",
    plMin: 300,
    plMax: 399,
    image: plataImg,
    colorTag: "Plata",
  },
  {
    id: "plata2",
    name: "Plata II",
    short: "S2",
    plMin: 400,
    plMax: 499,
    image: plataImg,
    colorTag: "Plata",
  },
  {
    id: "plata1",
    name: "Plata I",
    short: "S1",
    plMin: 500,
    plMax: 599,
    image: plataImg,
    colorTag: "Plata",
  },

  // ORO
  {
    id: "oro3",
    name: "Oro III",
    short: "G3",
    plMin: 600,
    plMax: 699,
    image: oroImg,
    colorTag: "Oro",
  },
  {
    id: "oro2",
    name: "Oro II",
    short: "G2",
    plMin: 700,
    plMax: 799,
    image: oroImg,
    colorTag: "Oro",
  },
  {
    id: "oro1",
    name: "Oro I",
    short: "G1",
    plMin: 800,
    plMax: 899,
    image: oroImg,
    colorTag: "Oro",
  },

  // PLATINO
  {
    id: "platino3",
    name: "Platino III",
    short: "P3",
    plMin: 900,
    plMax: 999,
    image: platinoImg,
    colorTag: "Platino",
  },
  {
    id: "platino2",
    name: "Platino II",
    short: "P2",
    plMin: 1000,
    plMax: 1099,
    image: platinoImg,
    colorTag: "Platino",
  },
  {
    id: "platino1",
    name: "Platino I",
    short: "P1",
    plMin: 1100,
    plMax: 1199,
    image: platinoImg,
    colorTag: "Platino",
  },

  // DIAMANTE (nuevo bloque)
  {
    id: "diamante3",
    name: "Diamante III",
    short: "D3",
    plMin: 1200,
    plMax: 1299,
    image: diamanteImg,
    colorTag: "Diamante",
  },
  {
    id: "diamante2",
    name: "Diamante II",
    short: "D2",
    plMin: 1300,
    plMax: 1399,
    image: diamanteImg,
    colorTag: "Diamante",
  },
  {
    id: "diamante1",
    name: "Diamante I",
    short: "D1",
    plMin: 1400,
    plMax: 1499,
    image: diamanteImg,
    colorTag: "Diamante",
  },

  // LEYENDA
  {
    id: "leyenda",
    name: "Leyenda",
    short: "LEG",
    plMin: 1500,
    plMax: null,
    image: leyendaImg,
    colorTag: "Leyenda",
  },
];

export default function RankingInfo() {
  const [selectedRank, setSelectedRank] = useState(null);

  const handleOpenRank = (rank) => {
    setSelectedRank(rank);
  };

  const handleCloseRank = () => {
    setSelectedRank(null);
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          paddingBottom: "0.75rem",
        }}
      >
        {/* HEADER / INTRO */}
        <section>
          <h2
            style={{
              margin: 0,
              marginBottom: "0.4rem",
              fontSize: "1.05rem",
            }}
          >
            Sistema de ligas
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            En League of Padel subes de rango acumulando{" "}
            <strong>PL (Puntos de Liga)</strong> en tus partidos rankeados.
            Cada división necesita <strong>100 PL</strong>. Mientras más alto tu
            rango, menos PL ganas por victoria y más pierdes por derrota.
          </p>
        </section>

        {/* CARD DE EXPLICACIÓN GENERAL (sin iconos raros) */}
        <section
          style={{
            borderRadius: "1rem",
            border: "1px solid var(--border)",
            padding: "0.8rem 0.9rem",
            background: "var(--bg-elevated)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "999px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Este sí sabemos que existe (lo usas en la barra) */}
              <Icon name="padel" size={16} color="var(--accent)" />
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                ¿Cómo funciona?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.78rem",
                  color: "var(--muted)",
                }}
              >
                Cada división se divide en III, II y I. Al llegar a{" "}
                <strong>100 PL</strong> subes de división, al bajar de 0 PL
                retrocedes.
              </p>
            </div>
          </div>

          {/* Reglitas simples, sin icono dentro para evitar nombres que no existen */}
          <div
            style={{
              marginTop: "0.4rem",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "0.4rem",
              fontSize: "0.75rem",
            }}
          >
            <RuleCard
              title="Victoria"
              text="+PL según tu rango. En rangos bajos ganas más PL por cada victoria."
            />
            <RuleCard
              title="Derrota"
              text="Pierdes PL. En rangos altos se castiga más la derrota."
            />
            <RuleCard
              title="Empate"
              text="El equipo de menor rango gana un poco de PL y el de mayor rango pierde un poco."
            />
            <RuleCard
              title="Torneos"
              text="Los partidos de torneos afectan tu PL y tus estadísticas globales."
            />
          </div>
        </section>

        {/* RANGOS */}
        <section>
          <h3
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Divisiones y rangos
          </h3>

          <p
            style={{
              margin: "0 0 0.6rem",
              fontSize: "0.78rem",
              color: "var(--muted)",
            }}
          >
            Cada bloque de 100 PL corresponde a una división (III, II, I). De{" "}
            <strong>Bronce</strong> hasta <strong>Diamante</strong>, y al llegar
            a PL muy altos entras a <strong>Leyenda</strong>.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {["Bronce", "Plata", "Oro", "Platino", "Diamante", "Leyenda"].map(
              (groupName) => {
                const groupRanks = RANKS.filter(
                  (r) => r.colorTag === groupName
                );
                if (groupRanks.length === 0) return null;

                return (
                  <div key={groupName}>
                    <p
                      style={{
                        margin: "0 0 0.3rem",
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                      }}
                    >
                      {groupName}
                    </p>
                    <div
                      style={{
                        borderRadius: "1rem",
                        border: "1px solid var(--border)",
                        padding: "0.6rem 0.7rem",
                        background: "var(--bg-elevated)",
                        display: "grid",
                        gridTemplateColumns:
                          groupRanks.length === 1
                            ? "repeat(1, minmax(0, 1fr))"
                            : "repeat(3, minmax(0, 1fr))",
                        gap: "0.5rem",
                        justifyItems:
                          groupRanks.length === 1 ? "center" : "stretch",
                      }}
                    >
                      {groupRanks.map((rank) => (
                        <button
                          key={rank.id}
                          type="button"
                          onClick={() => handleOpenRank(rank)}
                          style={{
                            border: "none",
                            background: "transparent",
                            padding: "0.25rem 0.1rem",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.3rem",
                            cursor: "pointer",
                          }}
                        >
                          {/* IMPORTANTE: sin marco, imagen más grande */}
                          <img
                            src={rank.image}
                            alt={rank.name}
                            style={{
                              width: 72, // antes 52
                              height: 72,
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {rank.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--muted)",
                              textAlign: "center",
                            }}
                          >
                            {rank.plMax == null
                              ? `${rank.plMin}+ PL`
                              : `${rank.plMin}–${rank.plMax} PL`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        {/* CONSEJOS RÁPIDOS */}
        <section style={{ marginBottom: "0.5rem" }}>
          <h3
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Consejos para subir de liga
          </h3>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              fontSize: "0.78rem",
              color: "var(--muted)",
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
            }}
          >
            <li>
              Juega torneos completos: más partidos = más oportunidades de
              ganar PL.
            </li>
            <li>
              Intenta mantener marcadores cerrados contra rivales de mayor
              rango; los empates también te pueden beneficiar.
            </li>
            <li>
              Experimenta con diferentes parejas; la variedad te ayuda a
              equilibrar tus resultados y tu progreso de PL.
            </li>
          </ul>
        </section>
      </div>

      {/* MODAL: RANGO EN GRANDE */}
      {selectedRank && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 999,
          }}
          onClick={handleCloseRank}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "85vh",
              background: "var(--bg-elevated)",
              borderRadius: "1rem 1rem 0 0",
              border: "1px solid var(--border)",
              borderBottom: "none",
              padding: "0.9rem 1rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.7rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 4,
                borderRadius: 999,
                background: "var(--border)",
                alignSelf: "center",
                marginBottom: "0.2rem",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "0.95rem",
                  flex: 1,
                }}
              >
                {selectedRank.name}
              </h3>
              {/* Botón cerrar sin icono externo, para evitar problemas */}
              <button
                type="button"
                onClick={handleCloseRank}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "0.1rem 0.3rem",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  color: "var(--muted)",
                }}
              >
                ×
              </button>
            </div>

            {/* IMAGEN GRANDE SIN MARCO, MÁS GRANDE AÚN */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "0.2rem",
                marginBottom: "0.4rem",
              }}
            >
              <img
                src={selectedRank.image}
                alt={selectedRank.name}
                style={{
                  width: 240, // antes 210
                  height: 240,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            <div
              style={{
                borderRadius: "0.9rem",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                padding: "0.6rem 0.7rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                Rango
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
              >
                {selectedRank.name}{" "}
                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--muted)",
                  }}
                >
                  ({selectedRank.short})
                </span>
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "var(--muted)",
                }}
              >
                Rango de PL:{" "}
                <strong>
                  {selectedRank.plMax == null
                    ? `${selectedRank.plMin}+ PL`
                    : `${selectedRank.plMin}–${selectedRank.plMax} PL`}
                </strong>
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "0.5rem",
                fontSize: "0.78rem",
              }}
            >
              <SmallHint
                title="Subir a la siguiente"
                text="Cuando llegues a 100 PL en este rango, avanzas al siguiente nivel."
              />
              <SmallHint
                title="Retroceder"
                text="Si bajas de 0 PL, retrocedes a la división anterior."
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// -------------------------------------------------------------------
// Componentes auxiliares sencillos (sin Icon raros)
// -------------------------------------------------------------------
function RuleCard({ title, text }) {
  return (
    <div
      style={{
        borderRadius: "0.8rem",
        border: "1px solid var(--border)",
        padding: "0.45rem 0.5rem",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "0.73rem",
          color: "var(--muted)",
        }}
      >
        {text}
      </p>
    </div>
  );
}

function SmallHint({ title, text }) {
  return (
    <div
      style={{
        borderRadius: "0.8rem",
        border: "1px solid var(--border)",
        padding: "0.45rem 0.5rem",
        background: "var(--bg)",
        display: "flex",
        flexDirection: "column",
        gap: "0.2rem",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          fontWeight: 600,
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "0.73rem",
          color: "var(--muted)",
        }}
      >
        {text}
      </p>
    </div>
  );
}
