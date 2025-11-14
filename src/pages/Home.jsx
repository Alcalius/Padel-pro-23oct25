// src/pages/Home.jsx
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

// Imágenes de rangos
import bronceImg from "../assets/rangos/bronce.png";
import plataImg from "../assets/rangos/plata.png";
import oroImg from "../assets/rangos/oro.png";
import platinoImg from "../assets/rangos/platino.png";
import leyendaImg from "../assets/rangos/leyenda.png";

// Mapeo PL → rango / imagen
const RANK_TIERS = [
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

function getRankForPL(plValue) {
  const pl = typeof plValue === "number" ? plValue : 0;
  const tier = RANK_TIERS.find((t) => pl >= t.min && pl <= t.max);
  if (tier) return tier;

  if (pl >= 1200) {
    return {
      label: "Leyenda",
      short: "LEG",
      image: leyendaImg,
    };
  }

  return {
    label: "Sin rango",
    short: "UNR",
    image: bronceImg,
  };
}

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    totalMatches: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    tournamentsPlayed: 0,
  });
  const [userRecentMatches, setUserRecentMatches] = useState([]);

  const [activeClub, setActiveClub] = useState(null);
  const [clubMembers, setClubMembers] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [showRankingModal, setShowRankingModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [memberDetail, setMemberDetail] = useState(null);
  const [memberDetailLoading, setMemberDetailLoading] = useState(false);

  // -----------------------------
  // Cargar usuario + club activo
  // -----------------------------
  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
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

        const statsData = data.stats || {};
        const totalMatches =
          typeof statsData.totalMatches === "number"
            ? statsData.totalMatches
            : data.totalMatches || 0;
        const totalWins =
          typeof statsData.wins === "number" ? statsData.wins : data.wins || 0;
        const totalLosses =
          typeof statsData.losses === "number"
            ? statsData.losses
            : data.losses || 0;
        const tournamentsPlayed =
          typeof statsData.tournamentsPlayed === "number"
            ? statsData.tournamentsPlayed
            : data.tournamentsPlayed || 0;

        const winRate =
          totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

        // Partidos recientes del usuario (para Actividad reciente)
        let recent = [];
        if (Array.isArray(statsData.recentMatches)) {
          recent = statsData.recentMatches;
        } else if (Array.isArray(data.recentMatches)) {
          recent = data.recentMatches;
        }

        setUserData({
          id: user.uid,
          name:
            data.name ||
            data.displayName ||
            (data.email ? data.email.split("@")[0] : "Jugador"),
          email: data.email || user.email || "",
          profilePicture: data.profilePicture || data.photoURL || "",
          leaguePoints:
            typeof data.leaguePoints === "number" ? data.leaguePoints : 0,
          activeClubId: data.activeClubId || null,
        });

        setStats({
          totalMatches,
          totalWins,
          totalLosses,
          tournamentsPlayed,
          winRate,
        });

        setUserRecentMatches(recent || []);

        // Club activo
        if (data.activeClubId) {
          const clubRef = doc(db, "clubs", data.activeClubId);
          const clubSnap = await getDoc(clubRef);
          if (clubSnap.exists()) {
            const cData = clubSnap.data();
            setActiveClub({
              id: clubSnap.id,
              name: cData.name || "Club sin nombre",
              members: Array.isArray(cData.members) ? cData.members : [],
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
  // Cargar miembros del club (ranking)
  // -----------------------------
  useEffect(() => {
    const loadMembers = async () => {
      if (!activeClub?.members || activeClub.members.length === 0) {
        setClubMembers([]);
        setSelectedMember(null);
        return;
      }

      const membersData = [];

      for (const memberId of activeClub.members) {
        try {
          const memberRef = doc(db, "users", memberId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            const data = memberSnap.data();
            const lp =
              typeof data.leaguePoints === "number" ? data.leaguePoints : 0;
            const rank = getRankForPL(lp);

            membersData.push({
              id: memberId,
              name:
                data.name ||
                data.displayName ||
                (data.email ? data.email.split("@")[0] : "Jugador"),
              email: data.email || "",
              profilePicture: data.profilePicture || data.photoURL || "",
              leaguePoints: lp,
              rankLabel: rank.label,
              rankShort: rank.short,
              rankImage: rank.image,
            });
          }
        } catch (err) {
          console.error("Error cargando miembro del club en Home:", err);
        }
      }

      membersData.sort((a, b) => b.leaguePoints - a.leaguePoints);

      setClubMembers(membersData);
      setSelectedMember(membersData[0] || null);
    };

    loadMembers();
  }, [activeClub?.id, activeClub?.members]);

  // -----------------------------
  // Escuchar torneos del club activo
  // -----------------------------
  useEffect(() => {
    if (!userData?.activeClubId) {
      setTournaments([]);
      return;
    }

    const q = query(
      collection(db, "tournaments"),
      where("clubId", "==", userData.activeClubId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  // -----------------------------
  // Abrir detalle de jugador
  // -----------------------------
  const openMemberDetail = async (member) => {
    if (!member) return;
    setMemberDetailLoading(true);

    try {
      const ref = doc(db, "users", member.id);
      const snap = await getDoc(ref);

      let detailStats = null;
      let recentMatches = [];

      if (snap.exists()) {
        const data = snap.data();
        const s = data.stats || {};

        const totalMatches =
          typeof s.totalMatches === "number"
            ? s.totalMatches
            : data.totalMatches || 0;
        const wins =
          typeof s.wins === "number" ? s.wins : data.wins || 0;
        const losses =
          typeof s.losses === "number" ? s.losses : data.losses || 0;
        const tournamentsPlayed =
          typeof s.tournamentsPlayed === "number"
            ? s.tournamentsPlayed
            : data.tournamentsPlayed || 0;
        const winRate =
          totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

        detailStats = {
          totalMatches,
          wins,
          losses,
          tournamentsPlayed,
          winRate,
        };

        if (Array.isArray(s.recentMatches)) {
          recentMatches = s.recentMatches;
        } else if (Array.isArray(data.recentMatches)) {
          recentMatches = data.recentMatches;
        }
      }

      setMemberDetail({
        ...member,
        stats: detailStats,
        recentMatches,
      });
    } catch (err) {
      console.error("Error cargando detalle de jugador:", err);
      setMemberDetail({
        ...member,
        stats: null,
        recentMatches: [],
      });
    } finally {
      setMemberDetailLoading(false);
    }
  };

  // -----------------------------
  // Render: estados base
  // -----------------------------
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
          Cargando tu panel...
        </p>
      </div>
    );
  }

  const pl = userData?.leaguePoints || 0;
  const rankInfo = getRankForPL(pl);

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
        {/* 1. HEADER HERO */}
        <section
          style={{
            borderRadius: "1rem",
            padding: "1rem",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            display: "flex",
            gap: "0.9rem",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 95,
              height: 95,
              borderRadius: "999px",
              overflow: "hidden",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
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
              <span
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                }}
              >
                {(userData?.name || "J")[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Texto + rango */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Hola,
            </p>
            <h2
              style={{
                margin: "0.1rem 0 0.2rem",
                fontSize: "1.1rem",
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
                Aún no tienes un club activo.
              </p>
            )}

            <div
              style={{
                marginTop: "0.6rem",
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <button
                type="button"
                onClick={() => navigate("/rankinginfo")}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <img
                  src={rankInfo.image}
                  alt={rankInfo.label}
                  style={{
                    width: 54,
                    height: 54,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </button>

              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8rem",
                    color: "var(--muted)",
                  }}
                >
                  Rango actual
                </p>
                <p
                  style={{
                    margin: "0.1rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {rankInfo.label} • {pl} PL
                </p>
                <div
                  style={{
                    marginTop: "0.25rem",
                    width: "100%",
                    height: 7,
                    borderRadius: 999,
                    backgroundColor: "var(--bg)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, pl % 100)
                      )}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, rgba(59,130,246,1), rgba(56,189,248,1))",
                    }}
                  />
                </div>
                <p
                  style={{
                    margin: "0.15rem 0 0",
                    fontSize: "0.7rem",
                    color: "var(--muted)",
                  }}
                >
                  Toca el escudo para ver el sistema de ranking.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. MIS ESTADÍSTICAS */}
        <section style={{ marginBottom: "0.4rem" }}>
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
            <StatCard
              label="Partidos jugados"
              value={stats.totalMatches}
            />
            <StatCard label="Victorias" value={stats.totalWins} />
            <StatCard
              label="Winrate"
              value={`${stats.winRate ? stats.winRate.toFixed(0) : 0}%`}
            />
            <StatCard
              label="Torneos jugados"
              value={stats.tournamentsPlayed}
            />
          </div>
        </section>

        {/* 3. TOP RANKING DEL CLUB */}
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "0.4rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.95rem",
                flex: 1,
              }}
            >
              Top ranking del club
            </h3>
            {clubMembers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowRankingModal(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "0.75rem",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                }}
              >
                Ver ranking completo
                <Icon
                  name="chevron-right"
                  size={12}
                  color="var(--accent)"
                />
              </button>
            )}
          </div>

          {(!activeClub || clubMembers.length === 0) && (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Cuando tu club tenga miembros con PL, verás aquí el top 3.
            </p>
          )}

          {activeClub && clubMembers.length > 0 && (
            <div
              style={{
                borderRadius: "1rem",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                padding: "0.8rem 0.9rem",
                display: "flex",
                gap: "0.8rem",
                justifyContent: "space-between",
              }}
            >
              {clubMembers.slice(0, 3).map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMember(m);
                    setShowRankingModal(true);
                  }}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.3rem",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--muted)",
                    }}
                  >
                    #{index + 1}
                  </div>

                  <div
                    style={{
                      width: 75,
                      height: 75,
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {m.profilePicture ? (
                      <img
                        src={m.profilePicture}
                        alt={m.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "1.3rem",
                          fontWeight: 700,
                          color: "var(--fg)",
                        }}
                      >
                        {(m.name || "J")[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  <img
                    src={m.rankImage}
                    alt={m.rankLabel}
                    style={{
                      width: 45,
                      height: 45,
                      objectFit: "contain",
                    }}
                  />

                  <div
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      maxWidth: 90,
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      color: "var(--fg)",
                    }}
                  >
                    {m.name}
                  </div>

                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--muted)",
                    }}
                  >
                    {m.rankLabel}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 4. ACTIVIDAD RECIENTE (últimos 3 partidos del usuario) */}
        <section style={{ marginBottom: "0.4rem" }}>
          <h3
            style={{
              margin: "0 0 0.4rem",
              fontSize: "0.95rem",
            }}
          >
            Actividad reciente
          </h3>

          {userRecentMatches && userRecentMatches.length > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {userRecentMatches.slice(0, 3).map((m, idx) => {
                const plDelta =
                  typeof m.plDelta === "number" ? m.plDelta : null;
                const plText =
                  plDelta != null
                    ? `${plDelta > 0 ? "+" : ""}${plDelta} PL`
                    : null;
                const dateStr =
                  m.date && !Number.isNaN(Date.parse(m.date))
                    ? new Date(m.date).toLocaleDateString("es-MX", {
                        day: "2-digit",
                        month: "short",
                      })
                    : null;
                const title =
                  m.tournamentName ||
                  m.tournament ||
                  "Partido rankeado";
                const score =
                  m.score ||
                  (typeof m.scoreA === "number" &&
                    typeof m.scoreB === "number" &&
                    `${m.scoreA}-${m.scoreB}`) ||
                  null;

                return (
                  <div
                    key={m.id || idx}
                    style={{
                      borderRadius: "0.7rem",
                      border: "1px solid var(--border)",
                      background: "var(--bg-elevated)",
                      padding: "0.45rem 0.55rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        alignSelf: "stretch",
                        borderRadius: 999,
                        background:
                          plDelta != null && plDelta > 0
                            ? "rgba(34,197,94,0.9)"
                            : plDelta != null && plDelta < 0
                            ? "rgba(239,68,68,0.9)"
                            : "var(--border)",
                      }}
                    />
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {title}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.75rem",
                          color: "var(--muted)",
                        }}
                      >
                        {score ? `Marcador: ${score}` : "Marcador no disponible"}
                        {dateStr ? ` · ${dateStr}` : ""}
                      </p>
                    </div>
                    {plText && (
                      <span
                        style={{
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color:
                            plDelta > 0
                              ? "rgba(34,197,94,0.95)"
                              : plDelta < 0
                              ? "rgba(239,68,68,0.95)"
                              : "var(--muted)",
                        }}
                      >
                        {plText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p
              style={{
                margin: 0,
                fontSize: "0.8rem",
                color: "var(--muted)",
              }}
            >
              Cuando juegues partidos con PL, verás aquí tus últimos resultados.
            </p>
          )}
        </section>

        {/* 5. RESUMEN DE TORNEOS */}
        <section style={{ marginBottom: "0.4rem" }}>
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
              No hay torneos registrados en tu club todavía.
            </p>
          ) : (
            <div
              style={{
                borderRadius: "1rem",
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                padding: "0.7rem 0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.6rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "0.6rem",
                }}
              >
                <SummaryPill
                  label="Activos"
                  value={activeTournaments.length}
                />
                <SummaryPill
                  label="Finalizados"
                  value={completedTournaments.length}
                />
              </div>

              {activeTournaments.length > 0 && (
                <div
                  style={{
                    marginTop: "0.3rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
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
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 600,
                          }}
                        >
                          {t.name || "Torneo sin nombre"}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--muted)",
                          }}
                        >
                          Canchas: {t.courtCount || 1}
                        </span>
                      </div>
                      <Icon
                        name="chevron-right"
                        size={14}
                        color="var(--muted)"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* MODAL RANKING COMPLETO */}
      {showRankingModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 999,
          }}
          onClick={() => setShowRankingModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              background: "var(--bg-elevated)",
              borderRadius: "1rem 1rem 0 0",
              padding: "0.8rem 0.9rem",
              border: "1px solid var(--border)",
              borderBottom: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
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
                Ranking completo del club
              </h3>
              <button
                type="button"
                onClick={() => setShowRankingModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Icon name="close" size={16} color="var(--muted)" />
              </button>
            </div>

            {selectedMember && (
              <button
                type="button"
                onClick={() => openMemberDetail(selectedMember)}
                style={{
                  borderRadius: "0.9rem",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  padding: "0.7rem 0.8rem",
                  display: "flex",
                  gap: "0.7rem",
                  alignItems: "center",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "999px",
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    background: "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {selectedMember.profilePicture ? (
                    <img
                      src={selectedMember.profilePicture}
                      alt={selectedMember.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: "1.6rem",
                        fontWeight: 700,
                      }}
                    >
                      {(selectedMember.name || "J")[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    Detalle rápido
                  </p>
                  <p
                    style={{
                      margin: "0.1rem 0 0.2rem",
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      color: "var(--fg)",
                    }}
                  >
                    {selectedMember.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    {selectedMember.rankLabel} •{" "}
                    {selectedMember.leaguePoints} PL
                  </p>
                </div>
                <img
                  src={selectedMember.rankImage}
                  alt={selectedMember.rankLabel}
                  style={{
                    width: 46,
                    height: 46,
                    objectFit: "contain",
                  }}
                />
              </button>
            )}

            <div
              style={{
                marginTop: "0.2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                paddingBottom: "0.3rem",
                overflowY: "auto",
              }}
            >
              {clubMembers.map((m, index) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMember(m)}
                  style={{
                    borderRadius: "0.7rem",
                    border: "1px solid var(--border)",
                    background:
                      selectedMember?.id === m.id
                        ? "var(--bg)"
                        : "transparent",
                    padding: "0.5rem 0.6rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                    }}
                  >
                    #{index + 1}
                  </span>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {m.profilePicture ? (
                      <img
                        src={m.profilePicture}
                        alt={m.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                        }}
                      >
                        {(m.name || "J")[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--fg)",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--muted)",
                      }}
                    >
                      {m.rankLabel}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                    }}
                  >
                    {m.leaguePoints} PL
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE JUGADOR */}
      {memberDetail && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            zIndex: 1000,
          }}
          onClick={() => setMemberDetail(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "85vh",
              background: "var(--bg-elevated)",
              borderRadius: "1rem 1rem 0 0",
              padding: "0.9rem 1rem",
              border: "1px solid var(--border)",
              borderBottom: "none",
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
                Detalle del jugador
              </h3>
              <button
                type="button"
                onClick={() => setMemberDetail(null)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <Icon name="close" size={16} color="var(--muted)" />
              </button>
            </div>

            {memberDetailLoading ? (
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                Cargando información del jugador...
              </p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      width: 88,
                      height: 88,
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {memberDetail.profilePicture ? (
                      <img
                        src={memberDetail.profilePicture}
                        alt={memberDetail.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: "2rem",
                          fontWeight: 700,
                        }}
                      >
                        {(memberDetail.name || "J")[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                      }}
                    >
                      {memberDetail.email || "Jugador del club"}
                    </p>
                    <p
                      style={{
                        margin: "0.1rem 0 0.25rem",
                        fontSize: "1rem",
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "var(--fg)",
                      }}
                    >
                      {memberDetail.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.85rem",
                        color: "var(--muted)",
                      }}
                    >
                      {memberDetail.rankLabel} • {memberDetail.leaguePoints} PL
                    </p>
                  </div>

                  <img
                    src={memberDetail.rankImage}
                    alt={memberDetail.rankLabel}
                    style={{
                      width: 56,
                      height: 56,
                      objectFit: "contain",
                    }}
                  />
                </div>

                {memberDetail.stats && (
                  <div
                    style={{
                      borderRadius: "0.9rem",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      padding: "0.6rem 0.7rem",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "0.4rem",
                    }}
                  >
                    <MiniStat
                      label="Partidos"
                      value={memberDetail.stats.totalMatches}
                    />
                    <MiniStat
                      label="Victorias"
                      value={memberDetail.stats.wins}
                    />
                    <MiniStat
                      label="Derrotas"
                      value={memberDetail.stats.losses}
                    />
                    <MiniStat
                      label="Torneos"
                      value={memberDetail.stats.tournamentsPlayed}
                    />
                    <MiniStat
                      label="Winrate"
                      value={
                        memberDetail.stats.winRate != null
                          ? `${memberDetail.stats.winRate}%`
                          : "-"
                      }
                    />
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.85rem",
                      fontWeight: 600,
                    }}
                  >
                    Últimos partidos
                  </p>

                  {memberDetail.recentMatches &&
                  memberDetail.recentMatches.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem",
                        maxHeight: "26vh",
                        overflowY: "auto",
                      }}
                    >
                      {memberDetail.recentMatches.slice(0, 6).map((m, idx) => {
                        const plDelta =
                          typeof m.plDelta === "number" ? m.plDelta : null;
                        const plText =
                          plDelta != null
                            ? `${plDelta > 0 ? "+" : ""}${plDelta} PL`
                            : null;
                        const dateStr =
                          m.date &&
                          !Number.isNaN(Date.parse(m.date))
                            ? new Date(m.date).toLocaleDateString("es-MX", {
                                day: "2-digit",
                                month: "short",
                              })
                            : null;
                        const title =
                          m.tournamentName ||
                          m.tournament ||
                          "Partido rankeado";
                        const score =
                          m.score ||
                          (typeof m.scoreA === "number" &&
                            typeof m.scoreB === "number" &&
                            `${m.scoreA}-${m.scoreB}`) ||
                          null;

                        return (
                          <div
                            key={m.id || idx}
                            style={{
                              borderRadius: "0.7rem",
                              border: "1px solid var(--border)",
                              background: "var(--bg)",
                              padding: "0.4rem 0.55rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                width: 6,
                                alignSelf: "stretch",
                                borderRadius: 999,
                                background:
                                  plDelta != null && plDelta > 0
                                    ? "rgba(34,197,94,0.9)"
                                    : plDelta != null && plDelta < 0
                                    ? "rgba(239,68,68,0.9)"
                                    : "var(--border)",
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {title}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: "0.75rem",
                                  color: "var(--muted)",
                                }}
                              >
                                {score
                                  ? `Marcador: ${score}`
                                  : "Marcador no disponible"}
                                {dateStr ? ` · ${dateStr}` : ""}
                              </p>
                            </div>
                            {plText && (
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  color:
                                    plDelta > 0
                                      ? "rgba(34,197,94,0.95)"
                                      : plDelta < 0
                                      ? "rgba(239,68,68,0.95)"
                                      : "var(--muted)",
                                }}
                              >
                                {plText}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.78rem",
                        color: "var(--muted)",
                      }}
                    >
                      Este jugador aún no tiene partidos recientes registrados
                      con PL.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value }) {
  return (
    <article
      style={{
        borderRadius: "0.9rem",
        border: "1px solid var(--border)",
        padding: "0.7rem 0.8rem",
        background: "var(--bg-elevated)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.78rem",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "0.15rem 0 0",
          fontSize: "1rem",
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </article>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: "0.9rem",
        padding: "0.5rem 0.6rem",
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.72rem",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "0.15rem 0 0",
          fontSize: "0.95rem",
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          fontSize: "0.7rem",
          color: "var(--muted)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "0.1rem 0 0",
          fontSize: "0.85rem",
          fontWeight: 600,
        }}
      >
        {value}
      </p>
    </div>
  );
}
