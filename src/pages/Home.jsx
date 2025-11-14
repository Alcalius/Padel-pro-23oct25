import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/common/Icon";

// Imágenes de rangos (ajusta rutas si las tienes en otra carpeta)
import bronceImg from "../assets/rangos/bronce.png";
import plataImg from "../assets/rangos/plata.png";
import oroImg from "../assets/rangos/oro.png";
import platinoImg from "../assets/rangos/platino.png";
import leyendaImg from "../assets/rangos/leyenda.png";

// Helper sencillo para mapear PL -> rango + imagen
function getRankInfo(leaguePointsRaw) {
  const pl = typeof leaguePointsRaw === "number" ? leaguePointsRaw : 0;

  // 100 PL por división, 3 divisiones por rango
  // Bronce 3,2,1 – Plata 3,2,1 – Oro 3,2,1 – Platino 3,2,1 – Leyenda
  const tiers = [
    { min: 0, max: 99, label: "Bronce III", short: "B3", image: bronceImg },
    { min: 100, max: 199, label: "Bronce II", short: "B2", image: bronceImg },
    { min: 200, max: 299, label: "Bronce I", short: "B1", image: bronceImg },

    { min: 300, max: 399, label: "Plata III", short: "S3", image: plataImg },
    { min: 400, max: 499, label: "Plata II", short: "S2", image: plataImg },
    { min: 500, max: 599, label: "Plata I", short: "S1", image: plataImg },

    { min: 600, max: 699, label: "Oro III", short: "G3", image: oroImg },
    { min: 700, max: 799, label: "Oro II", short: "G2", image: oroImg },
    { min: 800, max: 899, label: "Oro I", short: "G1", image: oroImg },

    { min: 900, max: 999, label: "Platino III", short: "P3", image: platinoImg },
    { min: 1000, max: 1099, label: "Platino II", short: "P2", image: platinoImg },
    { min: 1100, max: 1199, label: "Platino I", short: "P1", image: platinoImg },
  ];

  if (pl >= 1200) {
    return {
      label: "Leyenda",
      short: "LEG",
      image: leyendaImg,
    };
  }

  const tier = tiers.find((t) => pl >= t.min && pl <= t.max);
  if (!tier) {
    return {
      label: "Sin rango",
      short: "UNR",
      image: bronceImg,
    };
  }

  return tier;
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [activeClub, setActiveClub] = useState(null);
  const [tournaments, setTournaments] = useState([]);

  // -----------------------------
  // Cargar datos del usuario (PL, stats, club activo)
  // -----------------------------
  useEffect(() => {
    const loadUser = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data();
        setUserData({
          id: user.uid,
          name:
            data.name ||
            data.displayName ||
            (data.email ? data.email.split("@")[0] : "Jugador"),
          email: data.email || user.email || "",
          profilePicture: data.profilePicture || data.photoURL || "",
          leaguePoints: data.leaguePoints || 0,
          stats: data.stats || {
            totalMatches: 0,
            totalWins: 0,
            winRate: 0,
            avgPointsPerMatch: 0,
          },
          activeClubId: data.activeClubId || null,
        });

        // Si tiene club activo, cargar info del club
        if (data.activeClubId) {
          const clubRef = doc(db, "clubs", data.activeClubId);
          const clubSnap = await getDoc(clubRef);
          if (clubSnap.exists()) {
            const cData = clubSnap.data();
            setActiveClub({
              id: clubSnap.id,
              name: cData.name || "Club sin nombre",
            });
          } else {
            setActiveClub(null);
          }
        } else {
          setActiveClub(null);
        }
      } catch (err) {
        console.error("Error cargando usuario en Home:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [user]);

  // -----------------------------
  // Escuchar torneos del club activo
  // -----------------------------
  useEffect(() => {
    if (!userData?.activeClubId) return;

    const q = query(
      collection(db, "tournaments"),
      where("clubId", "==", userData.activeClubId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        // Ordenar por fecha de creación (más recientes primero)
        data.sort((a, b) => {
          const da = a.createdAt || "";
          const dbb = b.createdAt || "";
          return dbb.localeCompare(da);
        });
        setTournaments(data);
      },
      (err) => {
        console.error("Error escuchando torneos en Home:", err);
      }
    );

    return () => unsub();
  }, [userData?.activeClubId]);

  const activeTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "active"),
    [tournaments]
  );

  const completedTournaments = useMemo(
    () => tournaments.filter((t) => t.status === "completed"),
    [tournaments]
  );

  if (!user) {
    return (
      <div
        style={{
          padding: "1rem",
          paddingBottom: "4rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Inicia sesión para ver tu panel.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: "1.5rem",
          paddingBottom: "4rem",
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          Cargando tu resumen...
        </p>
      </div>
    );
  }

  const stats = userData?.stats || {
    totalMatches: 0,
    totalWins: 0,
    winRate: 0,
    avgPointsPerMatch: 0,
  };

  const rankInfo = getRankInfo(userData?.leaguePoints || 0);

  return (
    <div
      style={{
        padding: "1rem 1rem 4.5rem",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      {/* HEADER HERO: saludo + rango + PL */}
      <section
        style={{
          borderRadius: "1rem",
          padding: "1rem",
          marginBottom: "1rem",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          display: "flex",
          alignItems: "center",
          gap: "0.9rem",
        }}
      >
        {/* Avatar usuario */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "999px",
            overflow: "hidden",
            border: "2px solid var(--border)",
            flexShrink: 0,
            background: "var(--bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {userData?.profilePicture ? (
            <img
              src={userData.profilePicture}
              alt="Avatar"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Icon name="user" size={32} color="var(--muted)" />
          )}
        </div>

        {/* Texto saludo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Bienvenido a League of Padel
          </p>
          <h2
            style={{
              margin: "0.1rem 0 0.2rem",
              fontSize: "1.25rem",
              lineHeight: 1.2,
            }}
          >
            {userData?.name || "Jugador"}
          </h2>
          {activeClub ? (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Club activo:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {activeClub.name}
              </strong>
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Aún no tienes un club activo
            </p>
          )}
        </div>

        {/* Rango / PL */}
        <button
          onClick={() => navigate("/rankinginfo")}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              borderRadius: "0.8rem",
              overflow: "hidden",
              marginBottom: "0.15rem",
            }}
          >
            <img
              src={rankInfo.image}
              alt={rankInfo.label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
          <span
            style={{
              display: "block",
              fontSize: "0.7rem",
              color: "var(--muted)",
              lineHeight: 1.1,
            }}
          >
            {rankInfo.label}
          </span>
          <span
            style={{
              display: "block",
              fontSize: "0.7rem",
              marginTop: 2,
            }}
          >
            {userData?.leaguePoints || 0} PL
          </span>
        </button>
      </section>

      {/* MIS ESTADÍSTICAS */}
      <section style={{ marginBottom: "1.2rem" }}>
        <h3
          style={{
            margin: "0 0 0.6rem",
            fontSize: "0.95rem",
          }}
        >
          Mis estadísticas
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "0.6rem",
          }}
        >
          {/* Partidos jugados */}
          <article
            style={{
              borderRadius: "0.9rem",
              border: "1px solid var(--border)",
              padding: "0.7rem 0.8rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Partidos
            </p>
            <p
              style={{
                margin: "0.1rem 0 0",
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {stats.totalMatches || 0}
            </p>
          </article>

          {/* Victorias */}
          <article
            style={{
              borderRadius: "0.9rem",
              border: "1px solid var(--border)",
              padding: "0.7rem 0.8rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Victorias
            </p>
            <p
              style={{
                margin: "0.1rem 0 0",
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {stats.totalWins || 0}
            </p>
            <p
              style={{
                margin: "0.1rem 0 0",
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              {stats.winRate ? stats.winRate.toFixed(0) : 0}% winrate
            </p>
          </article>

          {/* Puntos por partido */}
          <article
            style={{
              borderRadius: "0.9rem",
              border: "1px solid var(--border)",
              padding: "0.7rem 0.8rem",
              background: "var(--bg)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Puntos / partido
            </p>
            <p
              style={{
                margin: "0.1rem 0 0",
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {stats.avgPointsPerMatch || 0}
            </p>
          </article>

          {/* Torneos activos */}
          <article
            style={{
              borderRadius: "0.9rem",
              border: "1px solid var(--border)",
              padding: "0.7rem 0.8rem",
              background: "var(--bg)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                color: "var(--muted)",
              }}
            >
              Torneos activos
            </p>
            <p
              style={{
                margin: "0.1rem 0 0",
                fontSize: "1.2rem",
                fontWeight: 600,
              }}
            >
              {activeTournaments.length}
            </p>
            <button
              type="button"
              onClick={() => navigate("/torneos")}
              style={{
                marginTop: "0.35rem",
                fontSize: "0.75rem",
                border: "none",
                background: "transparent",
                color: "var(--accent)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                padding: 0,
              }}
            >
              Ver torneos
              <Icon name="chevron-right" size={12} color="var(--accent)" />
            </button>
          </article>
        </div>
      </section>

      {/* RESUMEN DE TORNEOS */}
      <section style={{ marginBottom: "1.2rem" }}>
        <h3
          style={{
            margin: "0 0 0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Resumen de torneos
        </h3>

        {tournaments.length === 0 ? (
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            Aquí verás los torneos de tu club cuando se creen.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
            }}
          >
            {/* Activos */}
            {activeTournaments.length > 0 && (
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.7rem 0.8rem",
                  background: "var(--bg)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.4rem",
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Activos
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {activeTournaments.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/torneos/${t.id}/jugar`)}
                      style={{
                        borderRadius: "0.6rem",
                        border: "1px solid var(--border)",
                        padding: "0.45rem 0.5rem",
                        background: "var(--bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "0.8rem",
                            background:
                              "linear-gradient(135deg, rgba(59,130,246,0.95), rgba(37,99,235,0.9))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="play" size={16} color="#ffffff" />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            textAlign: "left",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: "var(--text-primary)",
                            }}
                          >
                            {t.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              marginTop: "0.1rem",
                              fontSize: "0.75rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            {t.matchCount || 0} partidos •{" "}
                            {t.courtCount || 1} cancha(s)
                          </p>
                        </div>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color="var(--muted)"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Completados */}
            {completedTournaments.length > 0 && (
              <div
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  padding: "0.7rem 0.8rem",
                  background: "var(--bg)",
                }}
              >
                <p
                  style={{
                    margin: "0 0 0.4rem",
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Completados
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  {completedTournaments.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => navigate(`/torneos/${t.id}`)}
                      style={{
                        borderRadius: "0.6rem",
                        border: "1px solid var(--border)",
                        padding: "0.45rem 0.5rem",
                        background: "var(--bg)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "0.8rem",
                            background:
                              "linear-gradient(135deg, rgba(16,185,129,0.95), rgba(22,163,74,0.9))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="trophy" size={16} color="#ffffff" />
                        </div>
                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                            textAlign: "left",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.85rem",
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t.name}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              marginTop: "0.1rem",
                              fontSize: "0.75rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            Finalizado • {t.matchCount || 0} partidos
                          </p>
                        </div>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={16}
                        color="var(--muted)"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Placeholder para "Actividad reciente" */}
      <section style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            margin: "0 0 0.4rem",
            fontSize: "0.95rem",
          }}
        >
          Actividad reciente
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "var(--muted)",
          }}
        >
          Muy pronto verás aquí tus últimos partidos y cambios de PL.
        </p>
      </section>
    </div>
  );
}
